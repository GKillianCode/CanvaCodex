import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeSlimeDemo } from "../src/animationSlimeDemo.js";
import { slimeEffectCues } from "../src/animationSlimeEffects.js";
import {
  effectCatalog,
  parseEffectField,
} from "../src/animationEffectCatalog.js";
import { effectWorkingBounds } from "../src/animationEffectBounds.js";
import { animationScene } from "../src/animationModel.js";
import { readApplicationFile } from "../src/applicationDocuments.js";
test("Slime uses all 31 effects with valid references in five bounded, editable scenes", () => {
  const doc = makeSlimeDemo(),
    rows = slimeEffectCues(doc.slides);
  assert.deepEqual(
    [...new Set(rows.map((r) => r.kind))].sort(),
    effectCatalog.map((e) => e.id).sort(),
  );
  for (const s of doc.slides) {
    assert.ok(s.blockKeys.length <= 100);
    assert.equal(new Set(s.blockKeys).size, s.blockKeys.length);
    assert.equal(s.animation.actorId, "slime-player");
    assert.ok(s.notes.includes("Même personnage"));
    for (const e of s.animation.effects) {
      assert.ok(s.positions[e.key]);
      if (e.target) assert.ok(s.positions[e.target]);
      if (e.pathId) assert.ok(s.animation.paths.some((p) => p.id === e.pathId));
      assert.ok(e.start + e.duration <= s.animation.duration + 0.0001);
    }
    for (const c of s.animation.clips)
      for (const f of c.frames) {
        const ref = parseEffectField(f.field);
        if (ref) assert.ok(s.animation.effects.some((e) => e.id === ref.id));
      }
  }
});
test("root Slime file matches generator and restores SVG images, native grass, notes and keys", async () => {
  const file = JSON.parse(
    await readFile(
      new URL("../../animation-slime-cinq-scenes.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(file, makeSlimeDemo());
  const restored = readApplicationFile(file, "animation").slides.slides;
  assert.equal(restored[0].elements.shapeGrass0.shape, "freeform");
  assert.ok(restored[0].groups.some((g) => g.keys.includes("shapeGrass0")));
  assert.ok(
    restored[4].elements.imageMemoryDay.src.startsWith(
      "data:image/svg+xml;base64,",
    ),
  );
  for (const [i, s] of restored.entries())
    assert.equal(s.blockKeys.length, file.slides[i].blockKeys.length);
});
test("decorative effects do not alter the Slime physics and all effect keyframes scrub deterministically", () => {
  for (const s of makeSlimeDemo().slides) {
    const at = (t) => animationScene(s, s.animation, t);
    for (const t of [0, s.animation.duration * 0.42, s.animation.duration]) {
      const a = at(t);
      at(0.17);
      assert.deepEqual(at(t), a);
      const without = {
        ...s.animation,
        effects: s.animation.effects.filter(
          (e) => !e.id.startsWith("slime-fx-"),
        ),
      };
      assert.deepEqual(
        animationScene(s, without, t).scene.positions.shapeSlime,
        a.scene.positions.shapeSlime,
      );
    }
    assert.deepEqual(at(4.5).warnings, []);
  }
});
test("effect working bounds stay rectangular and include rotated frames and past trail poses", () => {
  const p = { x: 200, y: 100, w: 1400, h: 70 },
    b = effectWorkingBounds(p, [
      { kind: "neon", amount: 5, duration: 10, gravity: 0, wind: 0 },
    ]);
  assert.ok(b.w * b.h < 300000);
  assert.ok(b.h < 150);
  const rotated = effectWorkingBounds(
    { ...p, w: 100, h: 100, rotation: 45 },
    [],
  );
  assert.ok(rotated.w > 200);
  const trail = effectWorkingBounds(
    { x: 500, y: 800, w: 100, h: 100 },
    [{ kind: "trail", amount: 20 }],
    [],
    [{ x: 300, y: 300, w: 100, h: 100 }],
  );
  assert.ok(trail.x < 300 && trail.y < 300 && trail.y + trail.h > 900);
});

test("show and hide events compose chronologically without future events overriding visibility", () => {
  const source = makeSlimeDemo().slides[0];
  for (const [t, expected] of [
    [0, false],
    [1.2, true],
    [4.5, true],
    [4.9, false],
    [2, true],
  ])
    assert.equal(
      animationScene(source, source.animation, t).config.links[0].visible,
      expected,
    );
  const s = structuredClone(source);
  s.animation.events = [
    {
      id: "later",
      trigger: "time",
      time: 3,
      action: "show",
      target: "shapeRelay",
    },
    {
      id: "first",
      trigger: "time",
      time: 1,
      action: "hide",
      target: "shapeRelay",
    },
  ];
  assert.equal(
    animationScene(s, s.animation, 0).scene.positions.shapeRelay.opacity,
    100,
  );
  assert.equal(
    animationScene(s, s.animation, 2).scene.positions.shapeRelay.opacity,
    0,
  );
  assert.equal(
    animationScene(s, s.animation, 4).scene.positions.shapeRelay.opacity,
    100,
  );
});

test("scene titles remain inside the camera safe area while zooming", async () => {
  const { projectCameraPose } = await import("../src/animationWorkflow.js");
  for (const s of makeSlimeDemo().slides) {
    const key = s.positions.textScene ? "textScene" : "textGravityTitle";
    for (const t of [
      0,
      s.animation.duration * 0.45,
      s.animation.duration * 0.6,
      s.animation.duration,
    ]) {
      const state = animationScene(s, s.animation, t),
        p = projectCameraPose(state.scene.positions[key], state.config.camera);
      assert.ok(p.x >= 20 && p.y >= 20, s.title + " " + t);
      assert.ok(p.x + p.w <= 1920, s.title + " right edge");
    }
  }
});
