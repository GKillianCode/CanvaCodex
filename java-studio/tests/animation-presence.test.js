import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePresence,
  presenceState,
  presenceTiming,
  applyPresenceMotion,
} from "../src/animationPresence.js";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
const scene = {
  id: "presence-test",
  blockKeys: ["title"],
  positions: {
    title: { x: 100, y: 200, w: 300, h: 100, size: 40, opacity: 80 },
  },
  elements: {},
  fragments: { title: { order: 0, animation: "none" } },
};
test("presence starts inclusively and ends exclusively, independently of clip duration", () => {
  const config = normalizeAnimation({
    duration: 10,
    presences: { title: { start: 5, end: 7 } },
    clips: [
      {
        id: "move",
        keys: ["title"],
        start: 0,
        duration: 10,
        frames: [
          { field: "x", time: 0, value: 100 },
          { field: "x", time: 10, value: 500 },
        ],
      },
    ],
  });
  for (const [time, visible] of [
    [0, false],
    [4.99, false],
    [5, true],
    [6, true],
    [6.99, true],
    [7, false],
    [10, false],
  ]) {
    const state = animationScene(scene, config, time);
    assert.equal(state.presence.title.visible, visible);
    assert.equal(state.scene.hiddenKeys?.includes("title") || false, !visible);
  }
  assert.equal(animationScene(scene, config, 5).typingElapsed.title, 0);
  assert.equal(animationScene(scene, config, 6).typingElapsed.title, 1000);
  assert.equal(config.clips[0].duration, 10);
  assert.equal(config.presences.title.end, 7);
  assert.equal(scene.positions.title.x, 100);
});
test("entrance and exit reuse shared motion primitives without altering editable poses or opacity keys", () => {
  const raw = {
    start: 5,
    end: 7,
    entrance: "fade",
    exit: "up",
    enterDuration: 0.4,
    exitDuration: 0.4,
  };
  const a = presenceState(raw, 5.1, 10, scene, "title"),
    b = presenceState(raw, 6.8, 10, scene, "title");
  assert(a.alpha > 0 && a.alpha < 1);
  assert(b.alpha > 0 && b.alpha < 1);
  assert(b.y > 0);
  const copy = { positions: { ...scene.positions } };
  applyPresenceMotion(copy, { title: b });
  assert(copy.positions.title.opacity < 80);
  assert.equal(scene.positions.title.opacity, 80);
  assert.equal(scene.positions.title.y, 200);
  assert.equal(
    presenceState({ ...raw, entrance: "auto" }, 5, 10, scene, "title").alpha,
    0,
  );
});
test("legacy objects remain visible and open-ended presence follows scene duration without growing clips", () => {
  assert.deepEqual(normalizeAnimation({ duration: 10 }).presences, {});
  assert.equal(
    animationScene(scene, { duration: 10 }, 0).scene.hiddenKeys,
    undefined,
  );
  const raw = { start: 5 };
  assert.equal(normalizePresence(raw).end, null);
  assert.equal(presenceState(raw, 10, 10, scene, "title").visible, true);
  assert.equal(presenceState(raw, 12, 15, scene, "title").visible, true);
  assert.equal(normalizePresence({ start: -4, end: 300 }).end, 120);
});
test("presence survives normalization and JSON roundtrip, overlaps stay bounded and seeks are deterministic", () => {
  const config = normalizeAnimation({
    duration: 10,
    presences: {
      title: {
        start: 5,
        end: 5.2,
        entrance: "zoom",
        exit: "fade",
        enterDuration: 5,
        exitDuration: 5,
      },
    },
  });
  const restored = normalizeAnimation(JSON.parse(JSON.stringify(config)));
  assert.deepEqual(restored.presences, config.presences);
  const first = animationScene(scene, config, 5.15);
  animationScene(scene, config, 8);
  assert.deepEqual(animationScene(scene, config, 5.15), first);
  assert(Number.isFinite(first.presence.title.alpha));
  assert(first.presence.title.alpha >= 0 && first.presence.title.alpha <= 1);
});

test('final holds default to zero and fit inside presence before the shared exit',()=>{
  assert.equal(normalizePresence({}).holdDuration,0);
  const range={start:5,end:15,exit:'fade',exitDuration:1,holdDuration:2};
  assert.deepEqual(presenceTiming(range,20),{start:5,end:15,exitDuration:1,exitStart:14,holdDuration:2,holdStart:12});
  assert.equal(presenceState(range,13,20,scene,'title').alpha,1);
  assert.equal(presenceState(range,14,20,scene,'title').alpha,1);
  assert(presenceState(range,14.5,20,scene,'title').alpha>0);
  assert(presenceState(range,14.5,20,scene,'title').alpha<1);
  assert.equal(presenceState(range,15,20,scene,'title').visible,false);
  const short=presenceTiming({...range,end:6,holdDuration:20},20);
  assert.equal(short.exitDuration,.5);assert.equal(short.holdDuration,.5);assert.equal(short.holdStart,5);
  assert.equal(presenceTiming({...range,exit:'none'},20).holdStart,13);
  const config=normalizeAnimation({presences:{title:range}});
  assert.deepEqual(normalizeAnimation(JSON.parse(JSON.stringify(config))).presences,config.presences);
});
