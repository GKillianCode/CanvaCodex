import test from "node:test";
import assert from "node:assert/strict";
import { cameraFrame, projectCameraPose } from "../src/animationWorkflow.js";
import { normalizeAnimation, animationScene } from "../src/animationModel.js";
test("camera can begin zoomed at 150 percent and ease back to 100", () => {
  const scene = { positions: {}, elements: {}, blockKeys: [], fragments: {} };
  const cfg = normalizeAnimation({
    duration: 4,
    clips: [
      {
        keys: [],
        duration: 4,
        frames: [
          { field: "cameraZoom", time: 0, value: 150, ease: "smooth" },
          { field: "cameraZoom", time: 4, value: 100 },
        ],
      },
    ],
  });
  assert.equal(animationScene(scene, cfg, 0).config.camera.zoom, 150);
  assert.equal(animationScene(scene, cfg, 2).config.camera.zoom, 125);
  assert.equal(animationScene(scene, cfg, 4).config.camera.zoom, 100);
  assert.equal(cfg.camera.zoom, 100);
});
test("construction camera corners project exactly to the captured screen, including pan and rotation", () => {
  for (const camera of [
    { x: 960, y: 540, zoom: 150, rotation: 0 },
    { x: 700, y: 400, zoom: 180, rotation: 35 },
  ]) {
    const f = cameraFrame(camera);
    assert.ok(Math.abs(f.w - 192000 / camera.zoom) < 1e-8);
    f.corners.forEach((corner, i) => {
      const p = projectCameraPose({ ...corner, w: 0, h: 0 }, camera),
        expected = [
          [0, 0],
          [1920, 0],
          [1920, 1080],
          [0, 1080],
        ][i];
      assert.ok(Math.abs(p.x - expected[0]) < 1e-8);
      assert.ok(Math.abs(p.y - expected[1]) < 1e-8);
    });
  }
});
