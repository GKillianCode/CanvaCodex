import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { deflateSync } from "node:zlib";
import { exportAnimationFrames } from "../src/animationVideoExport.js";
import { videoFrameJobs } from "../scripts/video-frame-jobs.mjs";
import { encoderCapabilities } from "../scripts/video-encoder.mjs";
function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    n = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  n.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([n, t, data, crc]);
}
function png() {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(16);
  h.writeUInt32BE(16, 4);
  h[8] = 8;
  h[9] = 6;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", h),
    chunk("IDAT", deflateSync(Buffer.alloc(16 * 65))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
test("animation client sends bounded ordered batches, keeps settings and deletes its job", async () => {
  const requests = [],
    draws = [];
  let uploaded = 0;
  const result = await exportAnimationFrames({
    canvas: { width: 16, height: 16, toBlob: (cb) => cb(new Blob([png()])) },
    draw: (t) => draws.push(t),
    duration: 1,
    fps: 30,
    format: "mov",
    fetcher: async (url, options) => {
      requests.push([url, options]);
      if (url.endsWith("capabilities"))
        return Response.json({ formats: { mov: true }, token: "secret" });
      if (url.endsWith("/__frame_video_frames__/"))
        return Response.json({ id: "job" });
      if (url.includes("/batch")) {
        const data = Buffer.from(options.body);
        let offset = 0,
          n = 0;
        while (offset < data.length) {
          const size = data.readUInt32BE(offset);
          offset += 4 + size;
          n++;
        }
        assert.ok(n <= 12);
        assert.equal(
          Number(new URL(url, "http://localhost").searchParams.get("start")),
          uploaded,
        );
        uploaded += n;
        return Response.json({ next: uploaded });
      }
      return new Response("encoded");
    },
  });
  assert.equal(uploaded, 30);
  assert.equal(draws.at(-1), 29 / 30);
  assert.equal(await result.text(), "encoded");
  assert.equal(requests.at(-1)[1].method, "DELETE");
});
test("failed animation uploads retain the error and clean up the reserved job", async () => {
  const methods = [];
  await assert.rejects(
    exportAnimationFrames({
      canvas: { width: 16, height: 16, toBlob: (cb) => cb(new Blob([png()])) },
      draw: () => {},
      duration: 1,
      fps: 1,
      format: "mkv",
      fetcher: async (url, options) => {
        methods.push(options?.method);
        if (url.endsWith("capabilities"))
          return Response.json({ formats: { mkv: true }, token: "secret" });
        if (url.endsWith("/__frame_video_frames__/"))
          return Response.json({ id: "job" });
        if (options.method === "DELETE") return Response.json({});
        return Response.json({ error: "disque plein" }, { status: 500 });
      },
    }),
    /disque plein/,
  );
  assert.equal(methods.at(-1), "DELETE");
});
test("local frame jobs enforce authentication, frame order, completeness and produce real alpha MOV/MKV", async (t) => {
  const caps = await encoderCapabilities();
  if (!caps.formats.mov || !caps.formats.mkv) {
    t.skip(caps.error);
    return;
  }
  const jobs = videoFrameJobs({ token: "test", binary: "ffmpeg" }),
    server = http.createServer(jobs.handle);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port,
    headers = { "X-Frame-Video-Token": "test" };
  const create = async (format = "mov") => {
    const res = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        width: 16,
        height: 16,
        fps: 30,
        count: 2,
        format,
      }),
    });
    assert.equal(res.status, 201);
    return (await res.json()).id;
  };
  const batch = () => {
    const p = png(),
      n = Buffer.alloc(4);
    n.writeUInt32BE(p.length);
    return Buffer.concat([n, p, n, p]);
  };
  try {
    assert.equal(
      (await fetch(base, { method: "POST", body: "{}" })).status,
      403,
    );
    let id = await create();
    assert.equal(
      (await fetch(base + "/" + id + "/finish", { method: "POST", headers }))
        .status,
      500,
    );
    assert.equal(jobs.active, false);
    id = await create();
    assert.equal(
      (
        await fetch(base + "/" + id + "/batch?start=1", {
          method: "POST",
          headers,
          body: batch(),
        })
      ).status,
      500,
    );
    assert.equal(jobs.active, false);
    for (const format of ["mov", "mkv", ...(caps.formats.mp4 ? ["mp4"] : [])]) {
      id = await create(format);
      assert.equal(
        (
          await fetch(base + "/" + id + "/batch?start=0", {
            method: "POST",
            headers,
            body: batch(),
          })
        ).status,
        200,
      );
      const response = await fetch(base + "/" + id + "/finish", {
        method: "POST",
        headers,
      });
      assert.equal(response.status, 200);
      const output = Buffer.from(await response.arrayBuffer());
      assert.ok(output.length > 100);
      assert.equal(
        response.headers.get("content-type"),
        format === "mov" ? "video/quicktime" : format === "mp4" ? "video/mp4" : "video/x-matroska",
      );
      // Match the client: await release before starting another export.
      assert.equal((await fetch(base + "/" + id, {method:"DELETE",headers})).status,200);
      assert.equal(jobs.active,false);
    }
  } finally {
    await jobs.close();
    await new Promise((r) => server.close(r));
  }
});

test('automatic animation format compresses opaque scenes and preserves transparency when needed', async () => {
  const {resolveAnimationFormat}=await import('../src/animationExportSettings.js');
  assert.equal(resolveAnimationFormat('auto',[{animation:{background:'solid'}},{animation:{background:'gradient'}}]),'mp4');
  assert.equal(resolveAnimationFormat('auto',[{animation:{background:'solid'}},{animation:{background:'transparent'}}]),'mkv');
  assert.equal(resolveAnimationFormat('auto',[{}]),'mkv');
  assert.equal(resolveAnimationFormat('mov',[{animation:{background:'solid'}}]),'mov');
});
