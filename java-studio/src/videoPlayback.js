import { frameValue } from "./animationModel.js";
import { normalizeVideoProperties } from "./videoProperties.js";
import { presenceState } from "./animationPresence.js";
const cache = new WeakMap();
const step = 1 / 240;
// Integrate speed, rather than multiplying the current rate by elapsed time:
// changing speed must never make the source jump backwards or forwards.
export function videoTimeline(scene, key) {
  const e = scene.elements[key],
    cfg = scene.animation || {},
    base = normalizeVideoProperties(e),
    duration = Math.max(0.1, Number(cfg.duration) || 120);
  const clips = (cfg.clips || []).filter(
    (c) =>
      c.enabled !== false &&
      c.keys.includes(key) &&
      c.frames.some((f) => ["videoRate", "videoVolume"].includes(f.field)),
  );
  const presence = cfg.presences?.[key],
    origin = Math.max(0, presence?.start || 0),
    end = presence?.end ?? duration;
  const signature = JSON.stringify([
    base,
    duration,
    scene.blockKeys,
    e.custom,
    e.videoStart,
    e.autoplay,
    origin,
    end,
    presence,
    scene.hiddenKeys?.includes(key),
    clips,
  ]);
  let records = cache.get(scene);
  if (!records) cache.set(scene, (records = new Map()));
  if (records.get(key)?.signature === signature) return records.get(key);
  const value = (field, time) => {
    let v = base[field];
    for (const c of clips)
      if (time >= c.start)
        v = frameValue(
          c.frames,
          field,
          Math.min(c.duration, time - c.start),
          v,
        );
    return normalizeVideoProperties({ [field]: v })[field];
  };
  const count = Math.ceil(duration / step) + 1,
    clock = new Float64Array(count),
    rates = new Float32Array(count),
    volumes = new Float32Array(count);
  clock[0] = Math.max(0, e.videoStart || 0);
  for (let i = 0; i < count; i++) {
    const t = Math.min(duration, i * step);
    rates[i] = value("videoRate", t);
    const p = presenceState(presence, t, duration, scene, key);
    volumes[i] =
      scene.hiddenKeys?.includes(key) ||
      (scene.blockKeys && !scene.blockKeys.includes(key) && !e.custom) ||
      e.autoplay === false
        ? 0
        : (value("videoVolume", t) / 100) * p.alpha;
    if (i) {
      const from = Math.max((i - 1) * step, origin),
        to = Math.min(t, end);
      clock[i] =
        clock[i - 1] +
        (e.autoplay === false || to <= from
          ? 0
          : (to - from) * value("videoRate", (from + to) / 2));
    }
  }
  const result = { signature, clock, rates, volumes, duration, step };
  records.set(key, result);
  return result;
}
export function sampleVideoTimeline(table, time) {
  const at = Math.max(0, Math.min(table.duration, time)),
    n = at / table.step,
    i = Math.min(table.clock.length - 1, Math.floor(n)),
    j = Math.min(table.clock.length - 1, i + 1),
    f =
      j === i
        ? 0
        : (at - i * table.step) /
          (Math.min(table.duration, j * table.step) - i * table.step);
  const mix = (values) => values[i] + (values[j] - values[i]) * f;
  return {
    time: mix(table.clock),
    volume: mix(table.volumes),
    rate: mix(table.rates),
  };
}
export function videoPlaybackState(scene, key, time) {
  return sampleVideoTimeline(videoTimeline(scene, key), time);
}
