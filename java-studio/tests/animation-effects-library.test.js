import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnimation,
  animationScene,
  addAnimationKey,
} from "../src/animationModel.js";
import { normalizeEffect } from "../src/animationEffects.js";
import {
  effectProgress,
  effectRandom,
  fragmentPose,
  effectField,
  parseEffectField,
} from "../src/animationEffectCatalog.js";
import {
  effectSample,
  makeEffectsDemo,
} from "../src/animationEffectExamples.js";
import {
  normalizeMotionPresets,
  applyMotion,
} from "../src/animationPresets.js";
import { designElement, createDesign } from "../src/designModel.js";
import {
  designAnimationScene,
  designAnimationFile,
} from "../src/designAnimationBridge.js";
import { readApplicationFile } from "../src/applicationDocuments.js";
test("effect randomness and fragments are reproducible regardless of seek order", () => {
  const e = normalizeEffect({ kind: "shatter", seed: 871, amount: 150 });
  const expected = fragmentPose(e, 5, 0.6);
  fragmentPose(e, 5, 0.1);
  fragmentPose(e, 5, 0.9);
  assert.deepEqual(fragmentPose(e, 5, 0.6), expected);
  assert.notEqual(effectRandom(871, 5), effectRandom(872, 5));
  assert.equal(fragmentPose(e, 5, 1).alpha, 0);
  assert.equal(fragmentPose(e, 5, 0).x, 0);
});
test("timed effects clamp, reverse and repeat without frame rate dependence", () => {
  const e = normalizeEffect({ kind: "dissolve", start: 2, duration: 2 });
  assert.equal(effectProgress(e, 1), 0);
  assert.equal(effectProgress(e, 3), 0.5);
  assert.equal(effectProgress(e, 5), 1);
  assert.equal(effectProgress({ ...e, reverse: true }, 2), 1);
  assert.equal(effectProgress({ ...e, loop: true }, 4.5), 0.25);
});
test("effect keyframes use existing easing and survive normalization without mutating source", () => {
  const scene = effectSample("glow"),
    field = effectField("demo-effect", "amount");
  scene.animation.clips = [
    normalizeAnimation({
      clips: [
        {
          keys: ["sample"],
          duration: 2,
          frames: [
            { field, time: 0, value: 5, ease: "linear" },
            { field, time: 2, value: 25 },
          ],
        },
      ],
    }).clips[0],
  ];
  const original = JSON.stringify(scene);
  assert.equal(
    animationScene(scene, scene.animation, 1).config.effects[0].amount,
    15,
  );
  assert.equal(JSON.stringify(scene), original);
  assert.ok(parseEffectField(field));
  assert.equal(parseEffectField("effect:abc:constructor"), null);
});
test("effect presets remap identity, timing and keys through the motion preset engine", () => {
  const field = effectField("fx", "amount"),
    preset = normalizeMotionPresets([
      {
        id: "test-fx",
        name: "Lueur",
        reference: { w: 100, h: 100 },
        clip: {
          duration: 2,
          frames: [
            { field, time: 0, value: 5 },
            { field, time: 2, value: 25 },
          ],
        },
        effects: [
          { id: "fx", key: "old", kind: "glow", start: 0.5, duration: 1 },
        ],
      },
    ])[0];
  const r = applyMotion(preset, { x: 10, y: 20, w: 200, h: 200 }, "new", 3, 4);
  assert.equal(r.effects[0].key, "new");
  assert.equal(r.effects[0].start, 4);
  assert.equal(r.effects[0].duration, 2);
  assert.equal(r.clip.frames[0].field, effectField(r.effects[0].id, "amount"));
  assert.notEqual(r.effects[0].id, "fx");
});
test("vector bridge preserves editable shapes, groups, hidden elements, gradients and page aspect ratio", () => {
  const d = createDesign("vector", "Arbre", 0);
  d.pages[0].elements = [
    designElement("shape", {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      group: "g",
      gradient: true,
      fill: "#123456",
      fill2: "#abcdef",
    }),
    designElement("text", { text: "Java", group: "g", hidden: true }),
    designElement("shape", {
      shape: "freeform",
      nodes: [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 100 },
      ],
    }),
  ];
  const before = JSON.stringify(d),
    s = designAnimationScene(d);
  assert.equal(s.blockKeys.length, 3);
  assert.equal(s.groups[0].keys.length, 2);
  assert.equal(s.hiddenKeys.length, 1);
  assert.equal(s.elements[s.blockKeys[0]].fill2, "#abcdef");
  assert.ok(s.elements[s.blockKeys[0]].gradient);
  assert.equal(s.elements[s.blockKeys[2]].pathNodes.length, 3);
  assert.equal(s.positions[s.blockKeys[0]].x, 240);
  assert.equal(JSON.stringify(d), before);
  const restored = readApplicationFile(designAnimationFile(d), "animation");
  assert.equal(restored.slides.slides[0].blockKeys.length, 3);
});
test("effect demo contains four editable scenes with bounded object counts and valid targets", () => {
  const scenes = makeEffectsDemo();
  assert.equal(scenes.length, 4);
  for (const s of scenes) {
    assert.ok(s.blockKeys.length <= 100);
    for (const e of s.animation.effects) {
      assert.ok(s.positions[e.key]);
      assert.ok(s.positions[e.target]);
    }
  }
});
test("effect normalization bounds costly fragment counts and untrusted fields", () => {
  const e = normalizeEffect({
    kind: "shatter",
    cells: 1e9,
    duration: -5,
    seed: NaN,
    progress: 99,
    amount: Infinity,
  });
  assert.equal(e.cells, 40);
  assert.equal(e.duration, 0.05);
  assert.equal(e.seed, 1);
  assert.equal(e.progress, 1);
  assert.ok(Number.isFinite(e.amount));
});

test("saving an effect carries its keyed values into the shared preset library", async () => {
  const { captureEffect } = await import("../src/animationPresets.js"),
    e = normalizeEffect({
      id: "saved",
      kind: "glow",
      key: "shapeA",
      start: 2,
      duration: 2,
    }),
    field = effectField("saved", "amount");
  const p = captureEffect(e, { x: 0, y: 0, w: 200, h: 200 }, [
    {
      start: 1,
      frames: [
        { field, time: 1, value: 5, ease: "linear" },
        { field, time: 3, value: 50, ease: "smooth" },
      ],
    },
  ]);
  assert.deepEqual(
    p.clip.frames.map((f) => f.time),
    [0, 2],
  );
  assert.equal(p.effects.length, 1);
  const applied = applyMotion(
    p,
    { x: 0, y: 0, w: 200, h: 200 },
    "shapeB",
    4,
    2,
  );
  assert.equal(
    applied.clip.frames[1].field,
    effectField(applied.effects[0].id, "amount"),
  );
});
