import test from "node:test";
import assert from "node:assert/strict";
import { counterText, normalizeCounter } from "../src/animationCounter.js";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
const scene = {
  id: "counter-test",
  blockKeys: ["textCount"],
  positions: {
    textCount: {
      x: 100,
      y: 100,
      w: 500,
      h: 120,
      size: 96,
      font: "jetbrains-mono",
    },
  },
  elements: { textCount: { type: "text", custom: true, text: "000" } },
  fragments: { textCount: { order: 0, animation: "none" } },
};
test("numeric counters retain character count, automatic leading zeros, decimals and custom separators", () => {
  assert.equal(counterText({ from: 0, to: 100 }, 0), "000");
  assert.equal(counterText({ from: 0, to: 100 }, 9), "009");
  assert.equal(counterText({ from: 0, to: 1000000 }, 0), "0000000");
  assert.equal(counterText({ from: 0, to: 1000 }, 1000), "1000");
  assert.equal(counterText({ from: 0, to: 1000, pad: false }, 2), "2");
  assert.equal(
    counterText(
      {
        from: 0,
        to: 1000,
        grouping: true,
        separator: " ",
        prefix: "Total : ",
        suffix: " pts",
      },
      12,
    ),
    "Total : 0 012 pts",
  );
  assert.equal(
    counterText(
      { from: 0, to: 100, decimals: 2, decimalSeparator: "," },
      9.256,
    ),
    "009,26",
  );
});
test("clock counters carry at sixty seconds/minutes and format custom separators", () => {
  const config = { mode: "time", from: 0, to: 4000 };
  assert.equal(counterText(config, 59), "00:00:59");
  assert.equal(counterText(config, 60), "00:01:00");
  assert.equal(counterText(config, 3599), "00:59:59");
  assert.equal(counterText(config, 3600), "01:00:00");
  assert.equal(counterText({ ...config, separator: "." }, 3661), "01.01.01");
  assert.equal(
    counterText({ ...config, separator: ",", format: "ms" }, 61),
    "01,01",
  );
});
test("counter interpolation shares the clip evaluator but is independent of clips and begins with presence", () => {
  const cfg = normalizeAnimation({
    duration: 20,
    presences: { textCount: { start: 5, end: 18 } },
    counters: { textCount: { from: 0, to: 100, duration: 10 } },
  });
  for (const [time, text] of [
    [0, "000"],
    [5, "000"],
    [10, "050"],
    [15, "100"],
    [17, "100"],
  ])
    assert.equal(
      animationScene(scene, cfg, time).scene.elements.textCount.text,
      text,
    );
  assert.equal(scene.elements.textCount.text, "000");
  assert.equal(cfg.clips.length, 0);
  assert.equal(
    animationScene(scene, cfg, 18).presence.textCount.visible,
    false,
  );
  const restored = normalizeAnimation(JSON.parse(JSON.stringify(cfg)));
  assert.deepEqual(restored.counters, cfg.counters);
  assert.equal(
    animationScene(scene, restored, 10).scene.elements.textCount.text,
    "050",
  );
});
test("countdown and progressive rates are deterministic under seeking", () => {
  const cfg = normalizeAnimation({
    duration: 10,
    counters: { textCount: { from: 100, to: 0, duration: 10 } },
  });
  assert.equal(
    animationScene(scene, cfg, 0).scene.elements.textCount.text,
    "100",
  );
  assert.equal(
    animationScene(scene, cfg, 5).scene.elements.textCount.text,
    "050",
  );
  assert.equal(
    animationScene(scene, cfg, 10).scene.elements.textCount.text,
    "000",
  );
  cfg.counters.textCount.easing = "easeIn";
  assert(
    Number(animationScene(scene, cfg, 5).scene.elements.textCount.text) > 50,
  );
  const first = animationScene(scene, cfg, 3);
  animationScene(scene, cfg, 8);
  assert.deepEqual(animationScene(scene, cfg, 3), first);
  assert.equal(normalizeCounter({ duration: 0 }).duration, 0.001);
});
