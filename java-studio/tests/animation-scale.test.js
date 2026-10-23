import test from "node:test";
import assert from "node:assert/strict";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
const scene = {
  blockKeys: ["a", "b"],
  elements: { a: { type: "shape", shape: "rect" }, b: { type: "text" } },
  positions: {
    a: { x: 100, y: 100, w: 100, h: 100, size: 20 },
    b: { x: 300, y: 100, w: 100, h: 100, size: 20 },
  },
  fragments: {},
};
test("uniform scale animates dimensions, spacing and content without changing the base objects", () => {
  const before = structuredClone(scene),
    cfg = normalizeAnimation({
      clips: [
        {
          keys: ["a", "b"],
          duration: 2,
          frames: [
            { field: "scale", time: 0, value: 100, ease: "linear" },
            { field: "scale", time: 2, value: 200 },
          ],
        },
      ],
    });
  const mid = animationScene(scene, cfg, 1).scene.positions,
    end = animationScene(scene, cfg, 2).scene.positions;
  assert.equal(mid.a.w, 150);
  assert.equal(mid.b.x - mid.a.x, 300);
  assert.equal(end.a.w, 200);
  assert.equal(end.b.size, 40);
  assert.equal(end.b.contentScale, 2);
  assert.deepEqual(scene, before);
});
test("one object grows about its pivot and camera properties remain independent", () => {
  const cfg = normalizeAnimation({
    camera: { zoom: 150 },
    clips: [
      {
        keys: ["a"],
        duration: 2,
        frames: [{ field: "scale", time: 0, value: 200 }],
      },
    ],
  });
  const result = animationScene(scene, cfg, 0);
  assert.equal(result.scene.positions.a.x, 50);
  assert.equal(result.scene.positions.a.y, 50);
  assert.equal(result.config.camera.zoom, 150);
});
