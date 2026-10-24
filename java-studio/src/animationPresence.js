import {
  normalizeAnimation,
  resolvedAnimation,
  motionState,
} from "./motion.js";
import { scaleObjects } from "./scaleObjects.js";
const number = (v, fallback, min, max) =>
  Number.isFinite(Number(v))
    ? Math.max(min, Math.min(max, Number(v)))
    : fallback;
export function normalizePresence(raw = {}) {
  const start = number(raw.start, 0, 0, 120);
  return {
    start,
    end: raw.end == null ? null : number(raw.end, start, start, 120),
    entrance: normalizeAnimation(raw.entrance, "none"),
    exit: normalizeAnimation(raw.exit, "none"),
    enterDuration: number(raw.enterDuration, 0.3, 0, 5),
    exitDuration: number(raw.exitDuration, 0.3, 0, 5),
    holdDuration: number(raw.holdDuration, 0, 0, 120),
  };
}
export function normalizePresences(raw) {
  return Object.fromEntries(
    Object.entries(
      raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {},
    )
      .slice(0, 200)
      .filter(
        ([key, value]) =>
          key.length <= 100 && value && typeof value === "object",
      )
      .map(([key, value]) => [key, normalizePresence(value)]),
  );
}
// Presence phases share one clock: active content, final hold, then exit.
export function presenceTiming(raw, duration) {
  const p = normalizePresence(raw), start = Math.min(duration,p.start),
    end = Math.min(p.end ?? duration,duration), span = Math.max(0,end-start),
    exitDuration = p.exit === 'none' ? 0 : Math.min(p.exitDuration,span/2),
    exitStart = end-exitDuration,
    holdDuration = Math.min(p.holdDuration,Math.max(0,exitStart-start));
  return {start,end,exitDuration,exitStart,holdDuration,holdStart:exitStart-holdDuration};
}
export function presenceState(raw, time, duration, scene, key) {
  const p = normalizePresence(raw),
    end = p.end == null ? duration : Math.min(p.end, duration),
    visible = time >= p.start && (p.end == null ? time <= end : time < end);
  const span = Math.max(0, end - p.start),
    enter = Math.min(p.enterDuration, span / 2),
    timing = presenceTiming(p,duration),
    exit = timing.exitDuration;
  const a = motionState(
      resolvedAnimation(p.entrance, { id: scene.id + key }, 0),
      enter ? (time - p.start) / enter : 1,
    ),
    b = motionState(
      resolvedAnimation(p.exit, { id: scene.id + key }, 0),
      exit ? (time - timing.exitStart) / exit : 0,
      true,
    );
  return {
    visible,
    alpha: visible ? a.alpha * b.alpha : 0,
    x: a.x + b.x,
    y: a.y + b.y,
    scale: a.scale * b.scale,
    elapsed: Math.max(0, time - p.start) * 1000,
  };
}
// Apply the shared motion primitives only to the evaluated render copy, never to
// the object's editable pose or the values used when recording property keys.
export function applyPresenceMotion(scene, states) {
  for (const [key, state] of Object.entries(states)) {
    if (!state.visible || !scene.positions[key]) continue;
    let p = { ...scene.positions[key] };
    if (state.scale !== 1 && p.w && p.h)
      p =
        scaleObjects(
          { [key]: p },
          { x: p.x, y: p.y, w: p.w, h: p.h },
          state.scale,
          { x: p.x + p.w / 2, y: p.y + p.h / 2 },
        )?.positions[key] || p;
    p.x += state.x;
    p.y += state.y;
    p.opacity = (p.opacity ?? 100) * state.alpha;
    scene.positions[key] = p;
  }
}

// Move a presence and its animation together; resizing a boundary never retimes keys.
export function movePresenceAnimation(config, snapshot, key, start){
  const original=normalizePresence(snapshot.presences?.[key]),delta=start-original.start;
  const members=snapshot.members||[key];
  for(const member of members){const range=normalizePresence(snapshot.presences?.[member]);config.presences[member]=normalizePresence({...range,start:range.start+delta,end:(range.end??config.duration)+delta});}
  for(const clip of config.clips){const source=snapshot.clips.find(c=>c.id===clip.id);if(source?.keys.some(k=>members.includes(k)))clip.start=source.start+delta;}
  for(const effect of config.effects){const source=snapshot.effects.find(e=>e.id===effect.id);if(source&&members.includes(source.key))effect.start=source.start+delta;}
}
