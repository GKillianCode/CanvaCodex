import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnimation,
  animationScene,
  animationParticles,
} from "../src/animationModel.js";
import { normalizeEffect, simulateBody } from "../src/animationEffects.js";
import {
  storyboardAt,
  storyboardDuration,
} from "../src/animationStoryboard.js";
import { makeAnimationExample } from "../src/animationExamples.js";
import { addSceneEngine } from "../src/animationEngines.js";
import { loadThemeLibrary, savePersonalTheme } from "../src/themeLibrary.js";
import { normalizeThemes, themeDraft } from "../src/themes.js";
const storage = () => {
  const v = {};
  return { getItem: (k) => v[k] ?? null, setItem: (k, s) => (v[k] = s) };
};
test("themes recover from legacy application libraries while preserving document overrides", () => {
  const s = storage(),
    theme = { ...normalizeThemes()[0], id: "personal", name: "Personnel" };
  s.setItem("banners:frame-themes", JSON.stringify([theme]));
  const imported = { ...theme, accent: "#123456" };
  assert.equal(
    loadThemeLibrary(s, [imported]).find((t) => t.id === "personal").accent,
    "#123456",
  );
  assert.ok(
    loadThemeLibrary(s, normalizeThemes()).some((t) => t.id === "personal"),
  );
});
test("shared personal themes keep deletions and explicit undo across apps", () => {
  const s = storage(),
    theme = { ...normalizeThemes()[0], id: "personal" };
  savePersonalTheme(s, theme);
  assert.ok(
    loadThemeLibrary(s, normalizeThemes()).some((t) => t.id === theme.id),
  );
  savePersonalTheme(s, theme, true);
  assert.ok(
    !loadThemeLibrary(s, normalizeThemes()).some((t) => t.id === theme.id),
  );
  assert.ok(loadThemeLibrary(s, [theme]).some((t) => t.id === theme.id));
  savePersonalTheme(s, theme);
  assert.ok(loadThemeLibrary(s).some((t) => t.id === theme.id));
});
test("physics is deterministic when seeking backwards and respects a rectangular floor", () => {
  const base = { x: 30, y: 0, w: 40, h: 40 },
    floor = { x: 0, y: 200, w: 500, h: 30 },
    options = { gravity: 600, bounce: 0.65, drag: 0.1 };
  const a = simulateBody(base, 2, options, [floor]);
  simulateBody(base, 3, options, [floor]);
  assert.deepEqual(simulateBody(base, 2, options, [floor]), a);
  assert.ok(a.y + 40 <= 200.001);
  assert.equal(base.y, 0);
  const b = simulateBody(base, 2, { ...options, bounce: 0 }, [floor]);
  assert.ok(Math.abs(b.y - 160) < 0.01);
});
test("force, drag and wind have independent measurable effects", () => {
  const base = { x: 0, y: 0, w: 20, h: 20 };
  assert.equal(simulateBody(base, 2, { gravity: 100, drag: 0 }).y, 200);
  assert.ok(simulateBody(base, 2, { gravity: 100, drag: 1 }).y < 200);
  assert.ok(simulateBody(base, 2, { gravity: 0, wind: 100, drag: 0 }).x > 0);
  assert.equal(simulateBody(base, 0).y, 0);
});
test("addable effects compose and repeat without mutating stored source", () => {
  const s = makeAnimationExample();
  s.animation.clips = [];
  s.animation.effects = [
    normalizeEffect({ key: "shapeObject", kind: "array", count: 3, dx: 150 }),
    normalizeEffect({ key: "shapeObject", kind: "oscillate", amount: 20 }),
  ];
  const input = JSON.stringify(s),
    r = animationScene(s, s.animation, 0.25).scene;
  assert.equal(r.blockKeys.length, s.blockKeys.length + 2);
  assert.equal(JSON.stringify(s), input);
  assert.equal(r.positions.shapeObject.y, s.positions.shapeObject.y + 20);
  assert.deepEqual(animationScene(s, s.animation, 0.25).scene, r);
});
test("disabled tracks and effects leave the source pose, hidden tracks still animate", () => {
  const s = makeAnimationExample(),
    base = s.positions.shapeObject.x;
  s.animation.clips[0].hidden = true;
  assert.notEqual(
    animationScene(s, s.animation, 3).scene.positions.shapeObject.x,
    base,
  );
  s.animation.clips[0].enabled = false;
  assert.equal(
    animationScene(s, s.animation, 3).scene.positions.shapeObject.x,
    base,
  );
  s.animation.effects = [
    normalizeEffect({ key: "shapeObject", kind: "gravity", enabled: false }),
  ];
  assert.equal(
    animationScene(s, s.animation, 3).scene.positions.shapeObject.y,
    s.positions.shapeObject.y,
  );
});
test("attachment preserves offsets while following an animated parent", () => {
  const s = makeAnimationExample(),
    engine = addSceneEngine(s, "particles");
  engine.parent = "shapeObject";
  engine.offsetX = 25;
  engine.offsetY = -40;
  const r = animationScene(s, s.animation, 3).scene,
    p = r.positions.shapeObject,
    e = r.positions[engine.key];
  assert.equal(e.x + e.w / 2, p.x + p.w / 2 + 25);
  assert.equal(e.y + e.h / 2, p.y + p.h / 2 - 40);
});
test("particle shapes, force and customization survive serialization", () => {
  const config = normalizeAnimation({
    engines: [
      {
        particles: {
          force: 2,
          aspect: 3,
          rotation: 40,
          shape: {
            shape: "rounded",
            radius: 25,
            outlined: true,
            strokeWidth: 2,
          },
        },
      },
    ],
  });
  const p = normalizeAnimation(JSON.parse(JSON.stringify(config))).engines[0]
    .particles;
  assert.equal(p.shape.shape, "rounded");
  assert.equal(p.shape.radius, 25);
  assert.equal(p.force, 2);
  assert.equal(p.aspect, 3);
  assert.equal(p.rotation, 40);
  const c = {
    start: 0,
    duration: 3,
    gravity: 0,
    particles: {
      ...p,
      enabled: true,
      direction: "axes",
      xMin: 1,
      xMax: 1,
      yMin: 0,
      yMax: 0,
    },
  };
  assert.equal(animationParticles(c, 0.5, { x: 0, y: 0 })[0].x, p.speed);
});
test("storyboard cuts are exact, ordered and clamped at both ends", () => {
  const scenes = [
    { id: "one", animation: { duration: 2 } },
    { id: "two", animation: { duration: 3 } },
  ];
  assert.equal(storyboardDuration(scenes), 5);
  assert.equal(storyboardAt(scenes, 1).scene.id, "one");
  assert.equal(storyboardAt(scenes, 2).scene.id, "two");
  assert.equal(storyboardAt(scenes, 2.5).time, 0.5);
  assert.equal(storyboardAt(scenes, 100).time, 3);
  assert.equal(storyboardAt(scenes, -1).time, 0);
  assert.equal(storyboardAt([], 0), null);
});
test("track visibility, interpolation and modifiers survive round trip", () => {
  const r = normalizeAnimation({
    effects: [{ id: "x", kind: "subtract", key: "a", target: "b" }],
    clips: [
      {
        hidden: true,
        collapsed: true,
        easing: "linear",
        frames: [{ field: "x", time: 0, value: 12 }],
      },
    ],
  });
  const c = normalizeAnimation(JSON.parse(JSON.stringify(r)));
  assert.deepEqual(c, r);
  assert.equal(c.clips[0].hidden, true);
  assert.equal(c.effects[0].target, "b");
});

test("animated emission parameters remain bounded even in imported keyframes", () => {
  const scene = makeAnimationExample(),
    engine = addSceneEngine(scene, "particles");
  scene.animation.clips = [
    {
      keys: [engine.key],
      duration: 8,
      frames: [
        { field: "particleCount", time: 0, value: 10000 },
        { field: "particleLife", time: 0, value: -100 },
        { field: "particleForce", time: 0, value: 10000 },
      ],
    },
  ];
  const result = animationScene(scene, scene.animation, 1).config.engines[0]
    .particles;
  assert.equal(result.count, 200);
  assert.equal(result.life, 0.1);
  assert.equal(result.force, 10);
});
test("fast falling bodies cannot tunnel through a thin horizontal floor", () => {
  const result = simulateBody(
    { x: 30, y: 0, w: 1, h: 1 },
    5,
    { gravity: 2000, drag: 0, bounce: 0 },
    [{ x: 0, y: 10000, w: 100, h: 1 }],
  );
  assert.ok(result.y + 1 <= 10000.001);
});
