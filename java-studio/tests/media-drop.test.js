import test from "node:test";
import assert from "node:assert/strict";
import { videoFileType } from "../src/videoMedia.js";
import { insertDroppedImages } from "../src/imageDrop.js";
import { makeSlide } from "../src/model.js";
test("video import recognizes supported MIME and extension fallback without accepting arbitrary files", () => {
  for (const [name, type, want] of [
    ["a.mp4", "video/mp4", "video/mp4"],
    ["A.MP4", "", "video/mp4"],
    ["a.mov", "application/octet-stream", "video/quicktime"],
    ["a.webm", "", "video/webm"],
    ["a.mp4", "text/plain", ""],
    ["a.txt", "", ""],
  ])
    assert.equal(videoFileType({ name, type }), want);
});
test("shared media drop preserves video metadata, keeps mixed order and skips failed imports", async () => {
  const scene = makeSlide("title");
  const result = await insertDroppedImages(
    scene,
    [{ name: "one.mp4" }, { name: "bad.mp4" }, { name: "two.png" }],
    { x: 700, y: 500 },
    async (f) => {
      if (f.name === "bad.mp4") throw Error("bad");
      return f.name === "one.mp4"
        ? {
            src: "frame-video:example",
            mediaKind: "video",
            autoplay: true,
            videoLoop: false,
            videoStart: 0,
          }
        : "data:image/png;base64,YQ==";
    },
  );
  assert.equal(result.failed, 1);
  assert.equal(result.keys.length, 2);
  assert.equal(scene.elements[result.keys[0]].mediaKind, "video");
  assert.equal(scene.elements[result.keys[0]].autoplay, true);
  assert.equal(scene.elements[result.keys[1]].name, "two.png");
  assert.equal(scene.positions[result.keys[0]].x, 400);
  assert.equal(scene.fragments[result.keys[0]].order, 0);
});
