export { formatTimecode as audioTimeLabel } from "./timecode.js";
// Scene settings contain only a stable media reference and a source-time offset.
export const validAudioReference = (value) =>
  typeof value === "string" && /^frame-audio:[a-f0-9-]{36}$/.test(value);
export function normalizeSceneAudio(raw) {
  return {
    src: validAudioReference(raw?.src) ? raw.src : "",
    start: Number.isFinite(Number(raw?.start))
      ? Math.max(0, Math.min(86400, Number(raw.start)))
      : 0,
  };
}
export function audioSourceTime(settings, time, sceneDuration) {
  return (
    normalizeSceneAudio(settings).start +
    Math.max(0, Math.min(sceneDuration, Number(time) || 0))
  );
}
export function audioPeaks(buffer, rate = 100) {
  const count = Math.ceil(buffer.duration * rate),
    peaks = new Array(count * 2).fill(0);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const samples = buffer.getChannelData(ch);
    for (let i = 0; i < count; i++) {
      let min = peaks[i * 2],
        max = peaks[i * 2 + 1];
      const end = Math.min(
        samples.length,
        Math.ceil(((i + 1) * buffer.sampleRate) / rate),
      );
      for (let j = Math.floor((i * buffer.sampleRate) / rate); j < end; j++) {
        min = Math.min(min, samples[j]);
        max = Math.max(max, samples[j]);
      }
      peaks[i * 2] = Math.round(min * 10000) / 10000;
      peaks[i * 2 + 1] = Math.round(max * 10000) / 10000;
    }
  }
  return peaks;
}
// A bounded SVG envelope of the selected scene excerpt, including silence beyond the source.
export function audioWavePath(asset, start, duration, span, bins = 1000) {
  if (!asset?.peaks?.length || !(span > 0)) return "";
  const top = [],
    bottom = [];
  for (let x = 0; x <= bins; x++) {
    const t = (x / bins) * span;
    let lo = 0,
      hi = 0;
    if (t < duration) {
      const from = Math.floor((start + t) * asset.peakRate);
      const to = Math.min(
        asset.peaks.length / 2,
        Math.ceil(
          (start + Math.min(duration, t + span / bins)) * asset.peakRate,
        ),
      );
      for (let i = from; i < to; i++) {
        lo = Math.min(lo, asset.peaks[i * 2] || 0);
        hi = Math.max(hi, asset.peaks[i * 2 + 1] || 0);
      }
    }
    top.push(`${x},${(32 - hi * 27).toFixed(2)}`);
    bottom.push(`${x},${(32 - lo * 27).toFixed(2)}`);
  }
  return "M" + top.join(" L") + " L" + bottom.reverse().join(" L") + " Z";
}
