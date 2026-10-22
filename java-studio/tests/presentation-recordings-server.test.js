import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { presentationRecordings } from "../scripts/presentation-recordings.mjs";
import { encodeVideoFile } from "../scripts/video-encoder.mjs";
test("local presentation spool encodes only at finish and produces opaque compatible MP4/MOV/MKV", async () => {
  const dir = await mkdtemp(join(tmpdir(), "frame-record-test-")),
    options = [],
    token = "test-token";
  const jobs = presentationRecordings({
      token,
      binary: "ffmpeg",
      encoder: (...args) => {
        options.push(args[3]);
        return encodeVideoFile(...args);
      },
    }),
    server = createServer((req, res) => jobs.handle(req, res));
  try {
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=64x64:r=10",
      "-t",
      "1.4",
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuv420p",
      join(dir, "source.webm"),
    ]);
    const input = await readFile(join(dir, "source.webm"));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + server.address().port;
    const request = (path, method = "POST", body) =>
      fetch(url + path, {
        method,
        headers: { "X-Frame-Video-Token": token },
        body,
      });
    assert.equal(
      (await fetch(url + "/?format=mov", { method: "POST" })).status,
      403,
    );
    for (const format of ["mp4", "mov", "mkv"]) {
      const started = await request("/?format=" + format),
        { id } = await started.json();
      assert.equal(started.status, 201);
      assert.equal(jobs.active, true);
      assert.equal((await request("/?format=" + format)).status, 409);
      const startCalls = options.length;
      let index = 0;
      for (let offset = 0; offset < input.length; offset += 100) {
        const part = await request(
          "/" + id + "/chunk?index=" + index++,
          "POST",
          input.subarray(offset, offset + 100),
        );
        assert.equal(part.status, 200);
      }
      assert.equal(options.length, startCalls, "No encoding during capture");
      const finished = await request("/" + id + "/finish");
      assert.equal(finished.status, 200, await finished.clone().text());
      assert.equal(jobs.active, false);
      assert.equal(options.at(-1).maxBytes, Infinity);
      assert.equal(options.at(-1).timeout, null);
      const download = await request("/" + id + "/download", "GET");
      assert.equal(download.status, 200);
      const output = join(dir, "result." + format);
      await writeFile(output, new Uint8Array(await download.arrayBuffer()));
      const info = JSON.parse(
        execFileSync("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "stream=codec_name",
          "-show_entries",
          "format=duration",
          "-of",
          "json",
          output,
        ]),
      );
      assert.equal(
        info.streams[0].codec_name,
        format === "mp4" ? "h264" : format === "mov" ? "qtrle" : "ffv1",
      );
      assert.ok(Math.abs(Number(info.format.duration) - 1.4) < 0.2);
      const pixels = execFileSync("ffmpeg", [
        "-v",
        "error",
        "-i",
        output,
        "-frames:v",
        "1",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "pipe:1",
      ]);
      for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
    }
    const { id } = await (await request("/?format=mov")).json();
    assert.equal((await request("/" + id, "DELETE")).status, 200);
    assert.equal(jobs.active, false);
  } finally {
    await jobs.close();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
