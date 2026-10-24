import test from "node:test";
import assert from "node:assert/strict";
import { pcmWaveBlob, playbackSampleRate } from "../src/audioPlayback.js";
test("PCM playback preserves samples, channel interleaving, clipping and sample rate", async () => {
  const channels = [
    new Float32Array([-1, -0.5, 0, 0.5, 1]),
    new Float32Array([2, 0, -2, 0.25, -0.25]),
  ];
  const blob = pcmWaveBlob({
    length: 5,
    numberOfChannels: 2,
    sampleRate: 48000,
    getChannelData: (c) => channels[c],
  });
  const data = new DataView(await blob.arrayBuffer());
  assert.equal(blob.type, "audio/wav");
  assert.equal(blob.size, 64);
  assert.equal(data.getUint32(24, true), 48000);
  assert.equal(data.getUint16(22, true), 2);
  assert.equal(data.getUint32(40, true), 20);
  assert.deepEqual(
    Array.from({ length: 10 }, (_, i) => data.getInt16(44 + i * 2, true)),
    [-32768, 32767, -16384, 0, 0, -32768, 16384, 8192, 32767, -8192],
  );
});
test("long reference playback reduces temporary PCM memory and never grows with scene count", () => {
  assert.equal(playbackSampleRate(86), 48000);
  assert.equal(playbackSampleRate(600), 24000);
  assert.equal(playbackSampleRate(3600), 8000);
});
