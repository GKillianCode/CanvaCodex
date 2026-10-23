import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSceneAudio,
  audioSourceTime,
  audioTimeLabel,
  audioPeaks,
  audioWavePath,
} from "../src/animationAudioModel.js";
import { normalizeAnimation } from "../src/animationModel.js";
const src = "frame-audio:12345678-1234-1234-1234-123456789abc";
test("scene audio is a portable reference, never a temporary URL or embedded file", () => {
  assert.deepEqual(normalizeSceneAudio({ src, start: 20.5 }), {
    src,
    start: 20.5,
  });
  assert.equal(
    normalizeSceneAudio({ src: "blob:temporary", start: -5 }).src,
    "",
  );
  assert.equal(normalizeSceneAudio({ start: -5 }).start, 0);
  assert.equal(normalizeSceneAudio({ start: Infinity }).start, 0);
  assert.deepEqual(normalizeAnimation().audio, { src: "", start: 0 });
  assert.deepEqual(
    normalizeAnimation(
      JSON.parse(
        JSON.stringify(normalizeAnimation({ audio: { src, start: 23 } })),
      ),
    ).audio,
    { src, start: 23 },
  );
});
test("source position follows scene offset and duration, with correct time-label rollover", () => {
  assert.equal(audioSourceTime({ src, start: 20 }, 2.5, 11), 22.5);
  assert.equal(audioSourceTime({ src, start: 20 }, 100, 11), 31);
  assert.equal(audioSourceTime({ src, start: 20 }, -4, 11), 20);
  assert.equal(audioTimeLabel(59.999), "01:00.00");
  assert.equal(audioTimeLabel(620.25), "10:20.25");
});
test("waveform retains transients from every channel without keeping the decoded buffer", () => {
  const buffer = {
    duration: 1,
    sampleRate: 4,
    numberOfChannels: 2,
    getChannelData: (ch) =>
      Float32Array.from(ch ? [0, -0.75, 0, 1] : [0.5, 0, -1, 0]),
  };
  assert.deepEqual(audioPeaks(buffer, 2), [-0.75, 0.5, -1, 1]);
});
test("waveform crops to the selected excerpt and renders silence after its end", () => {
  const asset = { peaks: [-1, 1, -0.8, 0.8, -0.2, 0.2, 0, 0], peakRate: 1 };
  const path = audioWavePath(asset, 2, 1, 2, 2);
  assert.match(path, /M0,26\.60 L1,32\.00 L2,32\.00/);
  assert(!path.includes("5.00")); // The loud samples before the selected excerpt are excluded.
  assert.equal(audioWavePath(null, 0, 2, 2), "");
  assert.match(
    audioWavePath(asset, 100, 2, 2, 2),
    /M0,32\.00 L1,32\.00 L2,32\.00/,
  );
});
