import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
import { simulateDrivenBody } from "../src/animationEffects.js";
import { makeSlimeDemo } from "../src/animationSlimeDemo.js";
import { readApplicationFile } from "../src/applicationDocuments.js";
test("X/Y and size keys describe the exact single-object pose without shifting the pivot", () => {
  const scene = {
    blockKeys: ["shapeCross"],
    elements: { shapeCross: { type: "shape", shape: "cross" } },
    positions: { shapeCross: { x: 40, y: 600, w: 80, h: 80 } },
    fragments: {},
  };
  const target = { x: 1500, y: 100, w: 260, h: 190 },
    original = structuredClone(scene);
  const config = normalizeAnimation({
    clips: [
      {
        keys: ["shapeCross"],
        duration: 2,
        frames: Object.entries(target).flatMap(([field, value]) => [
          {
            field,
            time: 0,
            value: scene.positions.shapeCross[field],
            ease: "linear",
          },
          { field, time: 2, value },
        ]),
      },
    ],
  });
  const end = animationScene(scene, config, 2).scene.positions.shapeCross;
  for (const [field, value] of Object.entries(target))
    assert.equal(end[field], value);
  const mid = animationScene(scene, config, 1).scene.positions.shapeCross;
  assert.equal(mid.x, 770);
  assert.equal(mid.y, 350);
  assert.equal(mid.w, 170);
  assert.equal(mid.h, 135);
  assert.deepEqual(scene, original);
});
test("driven jump lands on actual floors, falls without floors and preserves feet when resized", () => {
  const sample = (t) => ({
      x: 100 + t * 160,
      y: 700,
      w: 100,
      h: t > 2 ? 65 : 100,
    }),
    options = { gravity: 900, velocityY: -1050, bounce: 0 };
  const floors = [
    { x: 0, y: 800, w: 200, h: 200 },
    { x: 400, y: 800, w: 1200, h: 200 },
  ];
  assert.ok(simulateDrivenBody(sample, 1, options, floors).y < 400);
  const land = simulateDrivenBody(sample, 3, options, floors);
  assert.equal(land.y + land.h, 800);
  assert.ok(simulateDrivenBody(sample, 3, options, []).y > 800);
  assert.deepEqual(land, simulateDrivenBody(sample, 3, options, floors));
});
test("root JSON imports four scenes with real jumps, deformation, emitters and changing scenery", async () => {
  const file = JSON.parse(
    await readFile(
      new URL("../../animation-slime-quatre-scenes.json", import.meta.url),
      "utf8",
    ),
  );
  const imported = readApplicationFile(file, "animation").slides;
  assert.equal(imported.slides.length, 4);
  assert.equal(file.kind, "animation");
  for (const scene of imported.slides.slice(0, 2)) {
    assert.ok(scene.blockKeys.length <= 100);
    assert.ok(scene.animation.paths[0].points.length > 4);
    assert.ok(
      scene.animation.engines.some(
        (e) => e.kind === "gravity" && e.followPath && e.velocityY < 0,
      ),
    );
    assert.ok(
      scene.animation.engines.filter((e) => e.kind === "particles").length >= 2,
    );
    const at = (t) => animationScene(scene, scene.animation, t).scene;
    const start = at(0).positions.shapeSlime,
      air = at(4.5).positions.shapeSlime,
      land = at(5.73).positions.shapeSlime,
      end = at(9).positions.shapeSlime;
    assert.equal(start.y + start.h, 820);
    assert.ok(air.x > 700 && air.x < 1080);
    assert.ok(air.y + air.h < 300);
    assert.ok(Math.abs(land.y + land.h - 820) < 0.001);
    assert.ok(land.w > land.h * 2);
    assert.equal(end.y + end.h, 820);
    assert.ok(end.x > 1400);
    assert.notEqual(
      animationScene(scene, scene.animation, 0).config.color,
      animationScene(scene, scene.animation, 10).config.color,
    );
    assert.deepEqual(at(4.5), at(4.5));
  }
  assert.equal(makeSlimeDemo().slides.length, 4);
});
test("a removed spline does not crash the driven gravity engine", () => {
  const s = makeSlimeDemo().slides[0];
  s.animation.paths = [];
  assert.doesNotThrow(() => animationScene(s, s.animation, 5));
});
