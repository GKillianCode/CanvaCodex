import test from "node:test";
import assert from "node:assert/strict";
import { makeSlimeDemo } from "../src/animationSlimeDemo.js";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
import { storyboardTransition } from "../src/animationStoryboardRender.js";
import { simulateDrivenBody } from "../src/animationEffects.js";
import { readApplicationFile } from "../src/applicationDocuments.js";
test("gradient colors and angle interpolate on a scene track without an object", () => {
  const scene = { blockKeys: [], elements: {}, positions: {}, fragments: {} };
  const cfg = normalizeAnimation({
    background: "gradient",
    color: "#000000",
    color2: "#ff0000",
    clips: [
      {
        keys: [],
        duration: 2,
        frames: [
          {
            field: "backgroundColor",
            time: 0,
            value: "#000000",
            ease: "linear",
          },
          { field: "backgroundColor", time: 2, value: "#ffffff" },
          {
            field: "backgroundColor2",
            time: 0,
            value: "#ff0000",
            ease: "linear",
          },
          { field: "backgroundColor2", time: 2, value: "#0000ff" },
          { field: "backgroundAngle", time: 0, value: 0, ease: "linear" },
          { field: "backgroundAngle", time: 2, value: 180 },
        ],
      },
    ],
  });
  const mid = animationScene(scene, cfg, 1);
  assert.equal(mid.config.color, "#808080");
  assert.equal(mid.config.color2, "#800080");
  assert.equal(mid.config.gradientAngle, 90);
  assert.equal(cfg.color, "#000000");
});
test("four worlds share one actor identity and matching boundary poses", () => {
  const scenes = makeSlimeDemo().slides;
  assert.deepEqual(
    scenes.map((s) => s.grid),
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ],
  );
  for (let i = 0; i < 3; i++) {
    const p = animationScene(scenes[i], scenes[i].animation, 10).scene.positions
        .shapeSlime,
      q = animationScene(scenes[i + 1], scenes[i + 1].animation, 0).scene
        .positions.shapeSlime;
    assert.equal(scenes[i].animation.actorId, scenes[i + 1].animation.actorId);
    const offset = i === 2 ? { x: 0, y: 1080 } : { x: 1920, y: 0 };
    assert.ok(Math.abs(p.x - q.x - offset.x) < 0.001);
    assert.ok(Math.abs(p.y - q.y - offset.y) < 0.001);
  }
  const night = animationScene(scenes[2], scenes[2].animation, 10).scene
    .positions.shapeSlime;
  assert.ok(night.y > 1080);
  const transition = storyboardTransition(scenes, 29.65);
  assert.equal(transition.next.id, scenes[3].id);
  assert.deepEqual(transition.offset, { x: 0, y: 1080 });
  assert.ok(transition.progress > 0.49 && transition.progress < 0.51);
});
test("touches flip gravity, transform both actors and blocks once, and replay deterministically", () => {
  const scene = makeSlimeDemo().slides[3],
    before = structuredClone(scene),
    at = (t) => animationScene(scene, scene.animation, t).scene;
  assert.equal(at(0).elements.shapeSlime.shape, "circle");
  assert.equal(at(4).positions.shapeSlime.y, 130);
  assert.equal(at(4).elements.shapeSlime.shape, "square");
  assert.equal(at(7).positions.shapeSlime.y, 796);
  assert.equal(at(7).elements.shapeSlime.shape, "diamond");
  assert.equal(at(10).positions.shapeSlime.y, 130);
  assert.equal(at(10).elements.shapeSlime.shape, "cross");
  const end = at(14);
  assert.equal(end.elements.shapeSlime.shape, "star");
  assert.equal(end.positions.shapeSlime.contacts.length, 4);
  for (let i = 0; i < 4; i++)
    assert.equal(end.elements["shapeLucky" + i].shape, "circle");
  assert.deepEqual(end, at(14));
  assert.deepEqual(scene, before);
  const reloaded = readApplicationFile(makeSlimeDemo(), "animation").slides
    .slides[3];
  assert.equal(reloaded.animation.triggers.length, 4);
  assert.equal(
    animationScene(reloaded, reloaded.animation, 14).scene.elements.shapeSlime
      .shape,
    "star",
  );
});
test("changing or disabling a contact changes the simulated outcome rather than a baked time cue", () => {
  const scene = makeSlimeDemo().slides[3];
  scene.animation.triggers.forEach((r) => (r.enabled = false));
  const p = animationScene(scene, scene.animation, 10).scene.positions
    .shapeSlime;
  assert.equal(p.y, 796);
  assert.deepEqual(p.contacts, []);
  scene.animation.triggers[0].enabled = true;
  scene.positions.shapeLucky0.x = 1900;
  assert.deepEqual(
    animationScene(scene, scene.animation, 10).scene.positions.shapeSlime
      .contacts,
    [],
  );
});
test("negative gravity collides with ceilings and holds the top edge during resize", () => {
  const sample = (t) => ({ x: 400, y: 400, w: 100, h: t > 1 ? 140 : 100 });
  const p = simulateDrivenBody(sample, 3, { gravity: -900, bounce: 0 }, [
    { x: 0, y: 50, w: 1920, h: 80 },
  ]);
  assert.equal(p.y, 130);
});
