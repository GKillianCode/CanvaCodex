import { normalizeEffect } from "./animationEffects.js";
import { parseEffectField, effectField } from "./animationEffectCatalog.js";
import {
  normalizeAnimation,
  backgroundAnimationFields,
  engineAnimationFields,
} from "./animationModel.js";
import { cameraFields } from "./animationWorkflow.js";
export function normalizeMotionPresets(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 100)
    .filter(
      (r) =>
        r &&
        /^[\w-]{1,100}$/.test(r.id) &&
        typeof r.name === "string" &&
        r.clip,
    )
    .map((r) => ({
      id: r.id,
      name: r.name.trim().slice(0, 80) || "Mouvement",
      reference: {
        x: Number(r.reference?.x) || 0,
        y: Number(r.reference?.y) || 0,
        w: Math.max(1, Number(r.reference?.w) || 100),
        h: Math.max(1, Number(r.reference?.h) || 100),
        rotation: Number(r.reference?.rotation) || 0,
      },
      clip: normalizeAnimation({ clips: [r.clip] }).clips[0],
      effects: (Array.isArray(r.effects) ? r.effects : [])
        .slice(0, 20)
        .map(normalizeEffect),
      path: r.path ? normalizeAnimation({ paths: [r.path] }).paths[0] : null,
    }));
}
export function captureMotion(clip, position, path, name, effects = []) {
  if (!clip || clip.keys.length !== 1 || !position)
    throw Error("Sélectionne une séquence d’un seul objet.");
  const frames = clip.frames.filter(
    (f) =>
      ![
        ...backgroundAnimationFields,
        ...cameraFields,
        ...Object.keys(engineAnimationFields),
      ].includes(f.field),
  );
  if (!frames.length && !path)
    throw Error("Cette séquence ne contient pas de mouvement réutilisable.");
  return normalizeMotionPresets([
    {
      id: crypto.randomUUID(),
      name,
      reference: position,
      clip: { ...clip, keys: [], frames, particles: { enabled: false } },
      path,
      effects: effects
        .filter((e) => e.key === clip.keys[0])
        .map((e) => ({ ...e, start: Math.max(0, e.start - clip.start) })),
    },
  ])[0];
}
export function captureEffect(
  effect,
  position,
  clips = [],
  name = effect.name,
) {
  const keys = clips.flatMap((c) =>
    c.frames
      .filter((f) => parseEffectField(f.field)?.id === effect.id)
      .map((f) => ({
        ...f,
        time: Math.max(0, c.start + f.time - effect.start),
      })),
  );
  const frames = [
    ...new Map(keys.map((f) => [f.field + ":" + f.time, f])).values(),
  ];
  const duration = Math.max(effect.duration, ...frames.map((f) => f.time));
  return normalizeMotionPresets([
    {
      id: crypto.randomUUID(),
      name: name || "Mon effet",
      reference: position,
      clip: { duration, keys: [], frames },
      effects: [{ ...effect, start: 0, key: "", target: "", pathId: "" }],
    },
  ])[0];
}
export function applyMotion(preset, position, key, start, duration) {
  if (start < 0 || duration < 0.1 || start + duration > 120)
    throw Error("Le mouvement doit tenir dans les 120 secondes de la scène.");
  const source = preset.reference,
    sx = position.w / source.w,
    sy = (position.h || source.h) / source.h,
    ratio = duration / preset.clip.duration;
  const clip = JSON.parse(JSON.stringify(preset.clip));
  clip.id = crypto.randomUUID();
  clip.name = preset.name;
  clip.keys = [key];
  clip.start = start;
  clip.duration = duration;
  clip.enabled = true;
  clip.amplitude *= sy;
  clip.frequency /= ratio;
  clip.gravity *= sy / (ratio * ratio);
  clip.frames = clip.frames.map((f) => ({
    ...f,
    time: f.time * ratio,
    value:
      f.field === "x"
        ? position.x + (f.value - source.x) * sx
        : f.field === "y"
          ? position.y + (f.value - source.y) * sy
          : f.field === "w"
            ? f.value * sx
            : f.field === "h"
              ? f.value * sy
              : f.field === "rotation"
                ? f.value + (position.rotation || 0) - source.rotation
                : f.value,
  }));
  clip.markers = (clip.markers || []).map((t) => t * ratio);
  const path = preset.path ? JSON.parse(JSON.stringify(preset.path)) : null;
  if (path) {
    path.id = crypto.randomUUID();
    path.points = path.points.map((p) => ({
      x: position.x + (p.x - source.x) * sx,
      y: position.y + (p.y - source.y) * sy,
    }));
    clip.pathId = path.id;
  } else clip.pathId = "";
  const idMap = new Map();
  const effects = (preset.effects || []).map((e) => {
    const id = crypto.randomUUID();
    idMap.set(e.id, id);
    return normalizeEffect({
      ...e,
      id,
      key,
      target: "",
      pathId: path && e.pathId === preset.path?.id ? path.id : "",
      start: start + e.start * ratio,
      duration: e.duration * ratio,
    });
  });
  clip.frames = clip.frames.map((f) => {
    const p = parseEffectField(f.field);
    return p && idMap.has(p.id)
      ? { ...f, field: effectField(idMap.get(p.id), p.property) }
      : f;
  });
  return { clip, path, effects };
}
export const builtinMotions = normalizeMotionPresets([
  {
    id: "builtin-fade",
    name: "Apparition douce",
    reference: { w: 100, h: 100 },
    clip: {
      duration: 1,
      frames: [
        { field: "opacity", time: 0, value: 0, ease: "smooth" },
        { field: "opacity", time: 1, value: 100 },
      ],
    },
  },
  {
    id: "builtin-pulse",
    name: "Pulsation",
    reference: { w: 100, h: 100 },
    clip: {
      duration: 1,
      frames: [
        ...["w", "h"].flatMap((field) => [
          { field, time: 0, value: 100, ease: "smooth" },
          { field, time: 0.5, value: 120, ease: "smooth" },
          { field, time: 1, value: 100 },
        ]),
        ...["x", "y"].flatMap((field) => [
          { field, time: 0, value: 0, ease: "smooth" },
          { field, time: 0.5, value: -10, ease: "smooth" },
          { field, time: 1, value: 0 },
        ]),
      ],
    },
  },
  {
    id: "builtin-bounce",
    name: "Petit rebond",
    reference: { w: 100, h: 100 },
    clip: {
      duration: 1,
      frames: [
        { field: "y", time: 0, value: 0, ease: "easeOut" },
        { field: "y", time: 0.45, value: -80, ease: "easeIn" },
        { field: "y", time: 1, value: 0 },
      ],
    },
  },
]);
