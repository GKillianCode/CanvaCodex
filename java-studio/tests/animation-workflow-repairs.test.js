import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnimation,
  animationScene,
  addAnimationKey,
} from "../src/animationModel.js";
import { movePresenceAnimation } from "../src/animationPresence.js";
import { svgColorField, parseSvgColorField } from "../src/svgColors.js";
test("moving presence retimes its clips and effects exactly once, leaving local keys and others intact", () => {
  const config = normalizeAnimation({
    duration: 20,
    presences: { image: { start: 2, end: 8 } },
    clips: [
      {
        id: "a",
        keys: ["image"],
        start: 2,
        duration: 6,
        frames: [{ field: "x", time: 1, value: 80 }],
      },
      { id: "b", keys: ["other"], start: 1, duration: 3 },
    ],
    effects: [{ id: "e", kind: "glow", key: "image", start: 3, duration: 2 }],
  });
  const original = structuredClone(config);
  movePresenceAnimation(config, original, "image", 5);
  assert.equal(config.clips[0].start, 5);
  assert.equal(config.clips[0].frames[0].time, 1);
  assert.equal(config.effects[0].start, 6);
  assert.equal(config.presences.image.end, 11);
  assert.equal(config.clips[1].start, 1);
  movePresenceAnimation(config, original, "image", 4);
  assert.equal(config.clips[0].start, 4);
  assert.equal(config.effects[0].start, 5);
  assert.equal(config.presences.image.end, 10);
  assert.equal(original.clips[0].start, 2);
});
test("SVG channels survive JSON, interpolate separately and do not mutate source colours", () => {
  const red = svgColorField("#ff0000"),
    blue = svgColorField("rgb(0, 0, 255)");
  assert.equal(parseSvgColorField(blue), "rgb(0, 0, 255)");
  assert.equal(parseSvgColorField("svgColor:%xx"), null);
  const clip = {
    id: "svg",
    keys: ["image"],
    start: 0,
    duration: 2,
    frames: [],
  };
  for (const [field, a, b] of [
    [red, "#ff0000", "#00ff00"],
    [blue, "#0000ff", "#ffffff"],
  ]) {
    addAnimationKey(clip, field, 0, a, "linear");
    addAnimationKey(clip, field, 2, b, "linear");
  }
  const cfg = normalizeAnimation(
    JSON.parse(JSON.stringify({ duration: 2, clips: [clip] })),
  );
  assert.equal(cfg.clips[0].frames.length, 4);
  const raw = {
    positions: { image: { x: 0, y: 0, w: 100, h: 100 } },
    elements: {
      image: {
        type: "image",
        src: "svg",
        svgColors: { "#ff0000": { color: "#ff0000" } },
      },
    },
    fragments: { image: {} },
    blockKeys: ["image"],
  };
  const state = animationScene(raw, cfg, 1).scene;
  assert.equal(state.elements.image.svgColors["#ff0000"].color, "#808000");
  assert.equal(
    state.elements.image.svgColors["rgb(0, 0, 255)"].color,
    "#8080ff",
  );
  assert.equal(raw.elements.image.svgColors["#ff0000"].color, "#ff0000");
});

test("moving earlier retains pre-roll keys and effect phase before the scene boundary", () => {
  const config = normalizeAnimation({
    duration: 10,
    presences: { a: { start: 3, end: 7 } },
    clips: [
      {
        id: "c",
        keys: ["a"],
        start: 0,
        duration: 8,
        frames: [
          { field: "x", time: 3, value: 100, ease: "linear" },
          { field: "x", time: 5, value: 300, ease: "linear" },
        ],
      },
    ],
    effects: [{ id: "e", kind: "glow", key: "a", start: 0, duration: 8 }],
  });
  const initial = structuredClone(config);
  movePresenceAnimation(config, initial, "a", 1);
  const saved = normalizeAnimation(JSON.parse(JSON.stringify(config)));
  assert.equal(saved.clips[0].start, -2);
  assert.equal(saved.effects[0].start, -2);
  assert.equal(saved.clips[0].frames[0].time + saved.clips[0].start, 1);
});
