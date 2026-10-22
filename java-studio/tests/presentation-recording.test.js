import test from "node:test";
import assert from "node:assert/strict";
import { createPresentationRecording } from "../src/presentationRecording.js";
const tick = () => new Promise((resolve) => setImmediate(resolve));
class Recorder {
  static instance;
  static isTypeSupported() {
    return true;
  }
  constructor() {
    Recorder.instance = this;
    this.state = "inactive";
  }
  start() {
    this.state = "recording";
  }
  emit(data) {
    this.ondataavailable({ data });
  }
  stop() {
    this.state = "inactive";
    this.emit(new Blob(["last"]));
    this.onstop();
  }
}
function fixture() {
  const calls = [],
    errors = [];
  let tracks = 0;
  const canvas = {
    width: 1920,
    captureStream() {
      return {
        getTracks: () => [
          {
            stop() {
              tracks++;
            },
          },
        ],
      };
    },
  };
  const fetcher = async (url, options) => {
    calls.push([url, options]);
    return url.endsWith("capabilities")
      ? Response.json({ formats: { mp4: true, mov: true, mkv: true }, token: "local" })
      : url.includes("?format=")
        ? Response.json({ id: "a".repeat(48) })
        : url.endsWith("/finish")
          ? Response.json({ size: 100, name: "frame-presentation.mov" })
          : Response.json({ next: 1 });
  };
  return {
    calls,
    errors,
    canvas,
    fetcher,
    onError: (e) => errors.push(e),
    get tracks() {
      return tracks;
    },
  };
}
test("presentation chunks are sent progressively and only explicit stop finalizes once", async () => {
  const f = fixture(),
    session = await createPresentationRecording(f.canvas, { ...f, Recorder });
  // Each chunk can cross the former accumulation budget independently: none are retained as a whole movie.
  for (let i = 0; i < 40; i++)
    Recorder.instance.emit(new Blob(["fragment-" + i]));
  await tick();
  assert.equal(Recorder.instance.state, "recording");
  assert.equal(f.calls.filter(([u]) => u.endsWith("/finish")).length, 0);
  const first = session.stop();
  assert.equal(session.stop(), first);
  const output = await first;
  assert.equal(f.calls.filter(([u]) => u.endsWith("/finish")).length, 1);
  assert.equal(f.calls.filter(([u]) => u.includes("/chunk?")).length, 41);
  assert.match(output.url, /download$/);
  assert.equal(f.errors.length, 0);
  assert.equal(f.tracks, 1);
});
test("unexpected browser stop reports an error without automatic encoding or download", async () => {
  const f = fixture();
  await createPresentationRecording(f.canvas, { ...f, Recorder });
  Recorder.instance.stop();
  await tick();
  assert.equal(f.errors.length, 1);
  assert.equal(f.calls.filter(([u]) => u.endsWith("/finish")).length, 0);
  assert.ok(f.calls.some(([, o]) => o.method === "DELETE"));
});
test("failed upload cancels the local session instead of finalizing a truncated movie", async () => {
  const f = fixture(),
    base = f.fetcher;
  f.fetcher = (url, options) =>
    url.includes("/chunk?")
      ? Promise.resolve(
          Response.json({ error: "Disque indisponible" }, { status: 500 }),
        )
      : base(url, options);
  const session = await createPresentationRecording(f.canvas, {
    ...f,
    Recorder,
  });
  Recorder.instance.emit(new Blob(["frame"]));
  await tick();
  assert.match(f.errors[0].message, /Disque/);
  await assert.rejects(session.stop(), /Disque/);
  assert.equal(f.calls.filter(([u]) => u.endsWith("/finish")).length, 0);
});
test("a logical capture exceeding the old 256 MiB budget is uploaded in fragments without stopping", async () => {
  const f = fixture(),
    session = await createPresentationRecording(f.canvas, { ...f, Recorder });
  // Model a large browser Blob without allocating hundreds of megabytes in a test.
  Recorder.instance.emit({
    size: 300 * 1024 * 1024,
    slice() {
      return new Blob(["fragment"]);
    },
  });
  await tick();
  assert.equal(Recorder.instance.state, "recording");
  assert.equal(f.calls.filter(([u]) => u.endsWith("/finish")).length, 0);
  await session.stop();
  assert.equal(f.calls.filter(([u]) => u.includes("/chunk?")).length, 39);
  assert.equal(f.errors.length, 0);
});
