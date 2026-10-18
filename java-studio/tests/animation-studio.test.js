import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnimation,
  animationScene,
  frameValue,
  splinePoint,
  splineAngle,
  animationParticles,
  addAnimationKey,
  easeAnimation,
} from "../src/animationModel.js";
import { makeAnimationExample } from "../src/animationExamples.js";
import { normalizeSlides } from "../src/model.js";
import {
  applicationStorage,
  applicationFile,
  readApplicationFile,
} from "../src/applicationDocuments.js";
import {
  applicationFromHash,
  applicationHash,
} from "../src/applicationRoutes.js";
import {
  makeVideoProject,
  makeCreation,
  documentFromStorage,
  videoRoute,
  videoHash,
  attachCreation,
  videoBundle,
  importVideoBundle,
} from "../src/videoProjects.js";
const scene = () => ({
  blockKeys: ["shapeA", "textB"],
  positions: {
    shapeA: { x: 100, y: 100, w: 100, h: 100 },
    textB: { x: 300, y: 100, w: 100, h: 100, size: 30 },
  },
  elements: {
    shapeA: { type: "shape", fill: "#000000" },
    textB: { type: "text", text: "Java" },
  },
  fragments: { shapeA: { order: 0 }, textB: { order: 0 } },
});
const clip = (extra = {}) => ({
  id: "one",
  keys: ["shapeA"],
  start: 0,
  duration: 4,
  frames: [
    { field: "x", time: 0, value: 100, ease: "linear" },
    { field: "x", time: 4, value: 500 },
  ],
  ...extra,
});
test("keyframe evaluation handles easing, boundaries, hold, colors and replacement", () => {
  const c = clip();
  assert.equal(frameValue(c.frames, "x", 2, 0), 300);
  assert.equal(frameValue(c.frames, "x", -1, 0), 100);
  assert.equal(frameValue(c.frames, "x", 9, 0), 500);
  addAnimationKey(c, "x", 4, 700);
  assert.equal(c.frames.length, 2);
  assert.equal(frameValue(c.frames, "x", 4, 0), 700);
  assert.equal(
    frameValue(
      [
        { field: "color", time: 0, value: "#000000", ease: "linear" },
        { field: "color", time: 2, value: "#ffffff" },
      ],
      "color",
      1,
      "",
    ),
    "#808080",
  );
  assert.equal(easeAnimation(0.9, "hold"), 0);
  assert.equal(easeAnimation(1, "hold"), 1);
  assert.ok(
    Math.abs(easeAnimation(0.5, "bezier", [0, 0, 1, 1]) - 0.5) < 0.00001,
  );
});
test("seeking is immutable, deterministic and holds the end of a sequence", () => {
  const s = scene(),
    original = structuredClone(s),
    config = normalizeAnimation({ clips: [clip()] });
  assert.equal(animationScene(s, config, 2).scene.positions.shapeA.x, 300);
  assert.equal(animationScene(s, config, 8).scene.positions.shapeA.x, 500);
  assert.deepEqual(animationScene(s, config, 2), animationScene(s, config, 2));
  assert.deepEqual(s, original);
});
test("group translation and resizing preserve spacing instead of collapsing objects", () => {
  const s = scene(),
    config = normalizeAnimation({
      clips: [clip({ keys: ["shapeA", "textB"] })],
    });
  const p = animationScene(s, config, 2).scene.positions;
  assert.equal(p.textB.x - p.shapeA.x, 200);
  const scaled = normalizeAnimation({
    clips: [
      clip({
        keys: ["shapeA", "textB"],
        frames: [{ field: "w", time: 0, value: 200 }],
      }),
    ],
  });
  const q = animationScene(s, scaled, 0).scene.positions;
  assert.equal(q.textB.x - q.shapeA.x, 400);
  assert.equal(q.shapeA.w, 200);
  assert.ok(q.textB.size > 30);
});
test("spline endpoints, tangent and object attachment support off-frame coordinates", () => {
  const points = [
    { x: -300, y: 0 },
    { x: 0, y: 0 },
    { x: 800, y: 0 },
    { x: 2000, y: 0 },
  ];
  assert.deepEqual(splinePoint(points, 0), points[0]);
  assert.deepEqual(splinePoint(points, 1), points[3]);
  assert.equal(splineAngle(points, 0.5), 0);
  const config = normalizeAnimation({
    paths: [{ id: "path", points }],
    clips: [clip({ pathId: "path", frames: [] })],
  });
  assert.equal(
    animationScene(scene(), config, 4).scene.positions.shapeA.x,
    1950,
  );
});
test("disabled and future clips leave objects unchanged; separate clips compose by property", () => {
  const s = scene();
  const conf = normalizeAnimation({
    clips: [clip({ enabled: false }), clip({ id: "next", start: 2 })],
  });
  assert.deepEqual(animationScene(s, conf, 1).scene.positions, s.positions);
  const both = normalizeAnimation({
    clips: [
      clip(),
      clip({ id: "vertical", frames: [{ field: "y", time: 0, value: 900 }] }),
    ],
  });
  const p = animationScene(s, both, 2).scene.positions.shapeA;
  assert.equal(p.x, 300);
  assert.equal(p.y, 900);
});
test("typewriter time starts at the owning sequence and original parameters survive", () => {
  const s = scene();
  s.positions.textB.typewriter = {
    enabled: true,
    speed: 15,
    delay: 1,
    cursor: "bar",
    mode: "word",
  };
  const conf = normalizeAnimation({
    clips: [clip({ keys: ["textB"], start: 2 })],
  });
  const state = animationScene(s, conf, 3);
  assert.equal(state.typingElapsed.textB, 1000);
  assert.equal(animationScene(s, conf, 1).typingElapsed.textB, -1000);
  assert.deepEqual(
    state.scene.positions.textB.typewriter,
    s.positions.textB.typewriter,
  );
});
test("gravity, stretch and particles use reproducible local time", () => {
  const c = normalizeAnimation({
    clips: [
      clip({
        modifier: "gravity",
        gravity: 20,
        frames: [],
        particles: { enabled: true, count: 20, seed: 9 },
      }),
    ],
  }).clips[0];
  const p = animationScene(scene(), { clips: [c] }, 2).scene.positions.shapeA;
  assert.equal(p.y, 140);
  const a = animationParticles(c, 1, { x: 0, y: 0 });
  assert.ok(a.length > 0 && a.length <= 20);
  assert.deepEqual(a, animationParticles(c, 1, { x: 0, y: 0 }));
  assert.notDeepEqual(
    a,
    animationParticles({ ...c, particles: { ...c.particles, seed: 10 } }, 1, {
      x: 0,
      y: 0,
    }),
  );
  assert.deepEqual(animationParticles(c, -1, { x: 0, y: 0 }), []);
});
test("normalization bounds workload and rejects malformed key values", () => {
  const a = normalizeAnimation({
    duration: 9999,
    fps: 999,
    paths: Array(80).fill(null),
    clips: [
      clip({
        frames: [
          { field: "x", time: 0, value: Infinity },
          { field: "bogus", time: 1, value: 4 },
        ],
        particles: { enabled: true, count: 1e8 },
      }),
    ],
  });
  assert.equal(a.duration, 120);
  assert.equal(a.fps, 30);
  assert.equal(a.paths.length, 50);
  assert.equal(a.clips[0].frames.length, 0);
  assert.equal(a.clips[0].particles.count, 200);
});
test("animation files round-trip through normalization without touching other app storage", () => {
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k) || null,
      setItem: (k, v) => values.set(k, v),
      removeItem: (k) => values.delete(k),
    };
  const anim = applicationStorage(storage, "animation"),
    slides = applicationStorage(storage, "slides");
  slides.setItem("frame-slides-project", "untouched");
  const sample = makeAnimationExample("pool"),
    file = applicationFile({ slides: [sample], project: "Demo" }, "animation");
  assert.equal(file.kind, "animation");
  const read = readApplicationFile(file, "animation");
  assert.deepEqual(
    read.slides.slides[0].animation,
    normalizeAnimation(sample.animation),
  );
  anim.setItem("frame-slides-project", JSON.stringify(read.slides));
  assert.equal(slides.getItem("frame-slides-project"), "untouched");
  assert.throws(() => readApplicationFile(file, "slides"));
  assert.throws(() =>
    readApplicationFile({ ...file, kind: "slides" }, "animation"),
  );
  assert.ok(normalizeSlides([sample])[0].animation.paths.length);
});
test("video creation, routes and bundles include independent animation documents", () => {
  assert.equal(applicationFromHash(applicationHash("animation")), "animation");
  const project = makeVideoProject("Java"),
    creation = makeCreation(project, "animation", "GC");
  const doc = documentFromStorage(creation.storage, "animation");
  assert.equal(doc.kind, "animation");
  attachCreation(project, creation);
  assert.equal(
    videoRoute(videoHash(project.id, "animation", creation.id)).app,
    "animation",
  );
  const bundle = videoBundle(project, [creation]);
  assert.equal(importVideoBundle(bundle).creations[0].app, "animation");
});

test("attached spline takes precedence over absolute position keys", () => {
  const s = scene(),
    points = [
      { x: 400, y: 100 },
      { x: 500, y: 400 },
      { x: 700, y: 500 },
      { x: 900, y: 300 },
    ];
  const config = normalizeAnimation({
    paths: [{ id: "route", points }],
    clips: [
      clip({
        pathId: "route",
        constantSpeed: false,
        frames: [
          { field: "x", time: 0, value: -900 },
          { field: "x", time: 4, value: 9000 },
          { field: "y", time: 0, value: 7000 },
        ],
      }),
    ],
  });
  for (const t of [0, 1, 2, 4]) {
    const p = animationScene(s, config, t).scene.positions.shapeA,
      target = splinePoint(points, t / 4);
    assert.ok(Math.abs(p.x + p.w / 2 - target.x) < 1e-8);
    assert.ok(Math.abs(p.y + p.h / 2 - target.y) < 1e-8);
  }
});
test("independent engines persist as invisible editing markers and target gravity explicitly", async () => {
  const { addSceneEngine } = await import("../src/animationEngines.js");
  const { renderSlide } = await import("../src/render.js");
  const s = makeAnimationExample("gc"),
    base = s.positions.shapeObject.y,
    e = addSceneEngine(s, "particles", { x: 123, y: 456 });
  assert.deepEqual(
    { x: s.positions[e.key].x + 24, y: s.positions[e.key].y + 24 },
    { x: 123, y: 456 },
  );
  assert.equal(e.kind, "particles");
  assert.deepEqual(e.targets, []);
  const normalized = normalizeSlides([s])[0];
  assert.equal(normalized.elements[e.key].engineKind, "particles");
  assert.equal(normalized.animation.engines[0].key, e.key);
  assert.doesNotThrow(() =>
    renderSlide(
      {},
      {
        ...normalized,
        elements: { [e.key]: normalized.elements[e.key] },
        blockKeys: [e.key],
      },
      {},
      { transparent: true },
    ),
  );
  const gravity = addSceneEngine(s, "gravity", { x: 960, y: 540 }, [
    "shapeObject",
  ]);
  gravity.gravity = 20;
  assert.equal(
    animationScene(s, s.animation, 2).scene.positions.shapeObject.y,
    base + 40,
  );
  assert.equal(animationScene(s, s.animation, 2).scene.positions[e.key].y, 432);
});
test("particle axis ranges constrain direction without random changes after seeking", () => {
  const c = normalizeAnimation({
    clips: [
      clip({
        gravity: 0,
        particles: {
          enabled: true,
          direction: "axes",
          xMin: 0,
          xMax: 1,
          yMin: 0,
          yMax: 0,
          count: 30,
          speed: 200,
        },
      }),
    ],
  }).clips[0];
  const particles = animationParticles(c, 1, { x: 0, y: 0 });
  assert.ok(particles.length > 0);
  assert.ok(particles.every((p) => p.x >= 0 && p.y === 0));
  const left = { ...c, particles: { ...c.particles, xMin: -1, xMax: 0 } };
  assert.ok(
    animationParticles(left, 1, { x: 0, y: 0 }).every(
      (p) => p.x <= 0 && p.y === 0,
    ),
  );
  assert.deepEqual(animationParticles(c, 1, { x: 0, y: 0 }), particles);
});
test("scene and particle theme bindings survive files and resolve dynamically", async () => {
  const { boundColor } = await import("../src/colors.js");
  const { addSceneEngine } = await import("../src/animationEngines.js");
  const s = makeAnimationExample();
  s.animation.colorRole = "panel";
  const e = addSceneEngine(s, "particles");
  e.particles.colorRole = "accent";
  const file = applicationFile({ slides: [s] }, "animation"),
    restored = readApplicationFile(file, "animation").slides.slides[0]
      .animation;
  assert.equal(boundColor(restored, "color", { panel: "#123456" }), "#123456");
  assert.equal(
    boundColor(restored.engines[0].particles, "color", { accent: "#abcdef" }),
    "#abcdef",
  );
  assert.equal(
    boundColor(restored.engines[0].particles, "color", { accent: "#987654" }),
    "#987654",
  );
});
test("timeline zoom adjusts its visible time range and pointer conversion together", async () => {
  const { timelineView, timelineTime } =
    await import("../src/animationTimelineView.js");
  assert.equal(timelineView(8, 50).span, 16);
  assert.equal(timelineView(8, 200).widthPercent, 200);
  assert.equal(timelineView(8, 99999).zoom, 1600);
  assert.equal(timelineTime(300, 100, 400, 8, 1), 3);
  assert.equal(timelineTime(50, 100, 400, 8), 0);
});
