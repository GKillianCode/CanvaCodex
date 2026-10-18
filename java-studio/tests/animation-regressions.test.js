import test from "node:test";
import assert from "node:assert/strict";
import {
  animationScene,
  normalizeAnimation,
  animationParticles,
} from "../src/animationModel.js";
import { editableClip } from "../src/animationEditing.js";
test("animated gravity changes acceleration without rewriting previous motion", () => {
  const scene = {
    blockKeys: ["shapeHero", "shapeGravity"],
    elements: {
      shapeHero: { type: "shape" },
      shapeGravity: { type: "shape", engineKind: "gravity" },
    },
    positions: {
      shapeHero: { x: 100, y: 400, w: 100, h: 100 },
      shapeGravity: { x: 0, y: 0, w: 48, h: 48 },
    },
    fragments: {},
  };
  const cfg = normalizeAnimation({
    duration: 2,
    paths: [
      {
        id: "p",
        points: Array.from({ length: 4 }, () => ({ x: 150, y: 500 })),
      },
    ],
    clips: [
      { keys: ["shapeHero"], pathId: "p", pivotY: 1, duration: 2 },
      {
        keys: ["shapeGravity"],
        duration: 2,
        frames: [
          { field: "engineGravity", time: 0, value: 900, ease: "hold" },
          { field: "engineGravity", time: 1, value: -900 },
        ],
      },
    ],
    engines: [
      {
        id: "g",
        key: "shapeGravity",
        kind: "gravity",
        followPath: true,
        targets: ["shapeHero"],
        duration: 2,
        gravity: 900,
      },
    ],
  });
  const at = (t) => animationScene(scene, cfg, t).scene.positions.shapeHero.y;
  assert.ok(Math.abs(at(1) - at(0.99)) < 20);
  assert.ok(at(1.1) > at(1));
  assert.deepEqual(at(2), at(2));
});
test("drag targets selected sequence instead of first sequence of the object", () => {
  const clips = [
    { id: "a", keys: ["x"], start: 0, duration: 3 },
    { id: "b", keys: ["x"], start: 3, duration: 3 },
  ];
  assert.equal(editableClip(clips, "b", "x", 4).id, "b");
  assert.equal(editableClip(clips, "", "x", 4).id, "b");
});
test("particles retain birth origin when emitter moves", () => {
  const c = normalizeAnimation({
    clips: [
      {
        duration: 5,
        particles: { enabled: true, count: 1, life: 2, speed: 0, gravity: 0 },
      },
    ],
  }).clips[0];
  const p = animationParticles(c, 1, (t) => ({ x: t * 100, y: 0 }))[0];
  assert.equal(p.x, 0);
  const next = animationParticles(c, 2.5, (t) => ({ x: t * 100, y: 0 }))[0];
  assert.equal(next.x, 200);
});
