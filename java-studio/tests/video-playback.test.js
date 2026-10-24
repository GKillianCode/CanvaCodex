import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlide, makeSlide } from "../src/model.js";
import { normalizeAnimation, animationScene } from "../src/animationModel.js";
import { videoPlaybackState } from "../src/videoPlayback.js";
import { normalizeVideoProperties } from "../src/videoProperties.js";
function scene() {
  const s = makeSlide("title");
  s.elements.imageVideo = {
    type: "image",
    custom: true,
    mediaKind: "video",
    videoStart: 0,
    autoplay: true,
    videoVolume: 100,
    videoRate: 1,
  };
  s.positions.imageVideo = { x: 0, y: 0, w: 200, h: 100 };
  s.animation = normalizeAnimation({
    duration: 8,
    clips: [
      {
        id: "media",
        keys: ["imageVideo"],
        enabled: true,
        start: 0,
        duration: 8,
        frames: [
          { field: "videoRate", time: 0, value: 1, ease: "linear" },
          { field: "videoRate", time: 4, value: 2 },
          { field: "videoVolume", time: 0, value: 100, ease: "linear" },
          { field: "videoVolume", time: 4, value: 0 },
        ],
      },
    ],
  });
  return s;
}
test("video source time integrates animated rate without jumps; random seeks are deterministic", () => {
  const s = scene();
  assert(Math.abs(videoPlaybackState(s, "imageVideo", 4).time - 6) < 1e-6);
  assert(Math.abs(videoPlaybackState(s, "imageVideo", 2).time - 2.5) < 1e-6);
  assert.equal(videoPlaybackState(s, "imageVideo", 2).rate, 1.5);
  assert.equal(videoPlaybackState(s, "imageVideo", 2).volume, 0.5);
  assert(Math.abs(videoPlaybackState(s, "imageVideo", 6).time - 10) < 1e-6);
});
test("presence, mute, looping clock and autoplay keep video/audio on the same source", () => {
  const s = scene();
  s.animation.clips = [];
  s.animation.presences.imageVideo = { start: 2, end: 6 };
  s.elements.imageVideo.videoStart = 3;
  s.elements.imageVideo.videoRate = 2;
  assert.equal(videoPlaybackState(s, "imageVideo", 1).volume, 0);
  assert.equal(videoPlaybackState(s, "imageVideo", 2).time, 3);
  assert.equal(videoPlaybackState(s, "imageVideo", 4).time, 7);
  assert.equal(videoPlaybackState(s, "imageVideo", 7).volume, 0);
  s.elements.imageVideo.autoplay = false;
  assert.equal(videoPlaybackState(s, "imageVideo", 4).time, 3);
  assert.equal(videoPlaybackState(s, "imageVideo", 4).volume, 0);
});
test("media channels share frame evaluation, clamps, JSON normalization and source independence", () => {
  const s = scene();
  const result = animationScene(s, s.animation, 2).scene.elements.imageVideo;
  assert.equal(result.videoRate, 1.5);
  assert.equal(result.videoVolume, 50);
  assert.equal(s.elements.imageVideo.videoVolume, 100);
  assert.equal(
    normalizeSlide(JSON.parse(JSON.stringify(s))).elements.imageVideo.videoRate,
    1,
  );
  assert.deepEqual(
    normalizeVideoProperties({ videoVolume: 999, videoRate: -2 }),
    { videoVolume: 100, videoRate: 0.1 },
  );
  assert.deepEqual(normalizeVideoProperties({}), {
    videoVolume: 100,
    videoRate: 1,
  });
});

test("changing duration or re-editing a speed key invalidates the playback lookup", () => {
  const s = scene();
  videoPlaybackState(s, "imageVideo", 4);
  s.animation.duration = 10;
  assert(Math.abs(videoPlaybackState(s, "imageVideo", 10).time - 18) < 1e-6);
  s.animation.clips[0].frames.find(
    (f) => f.field === "videoRate" && f.time === 4,
  ).value = 3;
  assert(Math.abs(videoPlaybackState(s, "imageVideo", 4).time - 8) < 1e-6);
});

test("fractional scene durations preserve source time through the final partial integration interval", () => {
  const s = scene();
  s.animation.clips = [];
  s.animation.duration = 1.234;
  for (const t of [1.2335, 1.234, 2])
    assert(
      Math.abs(
        videoPlaybackState(s, "imageVideo", t).time - Math.min(t, 1.234),
      ) < 1e-8,
    );
});
