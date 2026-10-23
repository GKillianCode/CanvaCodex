import {normalizeSceneAudio} from './animationAudioModel.js';
import {parseEffectField} from "./animationEffectCatalog.js";
import {scaleObjects} from "./scaleObjects.js";
const contactHistory=new WeakMap();
import {normalizeAttachments,applyAttachments,normalizeEvents,eventSchedule,applyEvents,normalizeCamera,cameraFields} from "./animationWorkflow.js";
import { splinePoint, splineAngle, splineParameter } from "./splines.js";
export { splinePoint, splineAngle, splineParameter } from "./splines.js";
import {
  applyEffects,
  normalizeEffect,
  simulateBody,
  simulateDrivenBody,
} from "./animationEffects.js";
import { normalizeShape } from "./shapes.js";
import { validColorRole } from "./colors.js";
// Animation data is independent of pedagogical steps. All times are seconds.
export const engineAnimationFields = {
  engineGravity: "gravity",
  particleForce: "force",
  particleSpeed: "speed",
  particleSize: "size",
  particleCount: "count",
  particleLife: "life",
};
export const shapeAnimationFields = {
  fillEnabled: "filled",
  strokeEnabled: "outlined",
  dashed: "dashed",
  strokeWidth: "strokeWidth",
  radius: "radius",
  points: "points",
  innerRatio: "innerRatio",
  strokeColor: "stroke",
};
export const discreteAnimationFields = [
  "fillEnabled",
  "strokeEnabled",
  "dashed",
];
export const backgroundAnimationFields = [
  "backgroundColor",
  "backgroundColor2",
  "backgroundAngle",
];
export const colorAnimationFields = [
  "color",
  "strokeColor",
  "backgroundColor",
  "backgroundColor2",
];
export const animationFields = [
  ...cameraFields,
  ...backgroundAnimationFields,
  ...Object.keys(shapeAnimationFields),
  ...Object.keys(engineAnimationFields),
  "x",
  "y",
  "w",
  "h",
  "rotation",
  "skewX",
  "skewY",
  "opacity",
  "size",
  "contentScale",
  "scale",
  "progress",
  "color",
];
export const animationEasings = [
  "linear",
  "smooth",
  "easeIn",
  "easeOut",
  "hold",
  "bezier",
];
const number = (v, d, min = -10000, max = 10000) =>
  Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : d;
const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
export function normalizeParticles(raw = {}) {
  return {
    enabled: raw?.enabled === true,
    force: number(raw?.force, 1, 0, 10),
    aspect: number(raw?.aspect, 1, 0.1, 10),
    rotation: number(raw?.rotation, 0, -360, 360),
    shape: normalizeShape(raw?.shape || { shape: "circle" }),
    count: Math.round(number(raw?.count, 40, 1, 200)),
    seed: Math.round(number(raw?.seed, 1, 0, 100000)),
    life: number(raw?.life, 2, 0.1, 10),
    speed: number(raw?.speed, 150, 0, 1000),
    size: number(raw?.size, 8, 1, 100),
    color: /^#[a-f0-9]{6}$/i.test(raw?.color) ? raw.color : "#89baa9",
    colorRole: validColorRole(raw?.colorRole),
    direction: raw?.direction === "axes" ? "axes" : "radial",
    xMin: number(raw?.xMin, -1, -1, 1),
    xMax: number(raw?.xMax, 1, -1, 1),
    yMin: number(raw?.yMin, -1, -1, 1),
    yMax: number(raw?.yMax, 1, -1, 1),
  };
}
export function normalizeEngine(raw = {}, i = 0) {
  return {
    id: String(raw?.id || "engine" + i).slice(0, 100),
    key: String(raw?.key || "").slice(0, 100),
    kind: raw?.kind === "gravity" ? "gravity" : "particles",
    parent: String(raw?.parent || "").slice(0, 100),
    offsetX: number(raw?.offsetX, 0),
    offsetY: number(raw?.offsetY, 0),
    followPath: raw?.followPath === true,
    velocityY: number(raw?.velocityY, 0, -3000, 3000),
    drag: number(raw?.drag, 0, 0, 10),
    bounce: number(raw?.bounce, 0.5, 0, 1),
    friction: number(raw?.friction, 0.15, 0, 1),
    wind: number(raw?.wind, 0, -2000, 2000),
    enabled: raw?.enabled !== false,
    start: number(raw?.start, 0, 0, 120),
    duration: number(raw?.duration, 8, 0.1, 120),
    gravity: number(raw?.gravity, 200, -2000, 2000),
    targets: list(raw?.targets, 100).filter(
      (k) => typeof k === "string" && k.length < 100,
    ),
    particles: normalizeParticles(raw?.particles),
  };
}
export function normalizeAnimation(raw = {}) {
  return {
    version: 5,
    attachments:normalizeAttachments(raw?.attachments),events:normalizeEvents(raw?.events),camera:normalizeCamera(raw?.camera),
    actorKey: String(raw?.actorKey || "").slice(0, 100),
    actorId: String(raw?.actorId || "").slice(0, 100),
    transition: number(raw?.transition, 0, 0, 2),
    triggers: list(raw?.triggers, 100).map((r, i) => ({
      id: String(r?.id || "contact" + i).slice(0, 100),
      enabled: r?.enabled !== false,
      actor: String(r?.actor || "").slice(0, 100),
      target: String(r?.target || "").slice(0, 100),
      shape: r?.shape ? normalizeShape({ shape: r.shape }).shape : "",
      targetShape: r?.targetShape
        ? normalizeShape({ shape: r.targetShape }).shape
        : "",
      color: /^#[a-f0-9]{6}$/i.test(r?.color) ? r.color : "",
      targetColor: /^#[a-f0-9]{6}$/i.test(r?.targetColor) ? r.targetColor : "",
      gravity: r?.gravity == null ? null : number(r.gravity, 900, -2000, 2000),
      impulse: r?.impulse == null ? null : number(r.impulse, 0, -3000, 3000),
    })),
    effects: list(raw?.effects, 100).map(normalizeEffect),
    colorRole: validColorRole(raw?.colorRole),
    engines: list(raw?.engines, 50).map(normalizeEngine),
    audio: normalizeSceneAudio(raw?.audio),
    duration: number(raw?.duration, 8, 0.1, 120),
    fps: [24, 30, 60].includes(raw?.fps) ? raw.fps : 30,
    background: ["solid", "gradient"].includes(raw?.background)
      ? raw.background
      : "transparent",
    color2: /^#[a-f0-9]{6}$/i.test(raw?.color2) ? raw.color2 : "#223c57",
    gradientAngle: number(raw?.gradientAngle, 90, -360, 360),
    color: /^#[a-f0-9]{6}$/i.test(raw?.color) ? raw.color : "#00ff00",
    links: list(raw?.links, 100)
      .filter((l) => typeof l?.from === "string" && typeof l?.to === "string")
      .map((l, i) => ({
        id: String(l.id || "link" + i).slice(0, 100),visible:l.visible!==false,
        from: l.from.slice(0, 100),
        to: l.to.slice(0, 100),
        color: /^#[a-f0-9]{6}$/i.test(l.color) ? l.color : "#8ab9ab",
        width: number(l.width, 4, 1, 30),
      })),
    paths: list(raw?.paths, 50).map((p, i) => ({
      id: String(p?.id || "path" + i).slice(0, 100),
      name: String(p?.name || "Trajectoire").slice(0, 100),
      visible: p?.visible === true,
      closed: p?.closed === true,
      points: Array.from(
        {
          length:
            Array.isArray(p?.points) && p.points.length >= 4
              ? Math.min(97, 1 + 3 * Math.floor((p.points.length - 1) / 3))
              : 4,
        },
        (_, j) => ({
          x: number(p?.points?.[j]?.x, 300 + j * 400),
          y: number(p?.points?.[j]?.y, j === 1 ? 150 : 600),
        }),
      ),
    })),
    clips: list(raw?.clips, 100).map((c, i) => ({
      id: String(c?.id || "clip" + i).slice(0, 100),
      name: String(c?.name || "Séquence").slice(0, 100),
      enabled: c?.enabled !== false,
      collapsed: c?.collapsed === true,
      hidden: c?.hidden === true,
      easing: animationEasings.includes(c?.easing) ? c.easing : "smooth",
      start: number(c?.start, 0, 0, 120),
      duration: number(c?.duration, 8, 0.1, 120),
      markers: [
        ...new Set(
          list(c?.markers, 1000)
            .filter((v) => Number.isFinite(Number(v)))
            .map((v) => number(v, 0, 0, 120)),
        ),
      ].sort((a, b) => a - b),
      keys: list(c?.keys, 100).filter(
        (k) => typeof k === "string" && k.length < 100,
      ),
      pathId: typeof c?.pathId === "string" ? c.pathId.slice(0, 100) : "",
      orient: c?.orient === true,
      constantSpeed: c?.constantSpeed !== false,
      particles: normalizeParticles(c?.particles),
      modifier: ["oscillate", "gravity", "stretch"].includes(c?.modifier)
        ? c.modifier
        : "none",
      amplitude: number(c?.amplitude, 40, 0, 1000),
      frequency: number(c?.frequency, 1, 0, 20),
      gravity: number(c?.gravity, 200, -2000, 2000),
      pivotX: number(c?.pivotX, 0.5, 0, 1),
      pivotY: number(c?.pivotY, 0.5, 0, 1),
      frames: list(c?.frames, 1000)
        .filter(
          (f) =>
            (animationFields.includes(f?.field)||parseEffectField(f?.field)) &&
            Number.isFinite(Number(f?.time)) &&
            (colorAnimationFields.includes(f.field)
              ? /^#[a-f0-9]{6}$/i.test(f.value)
              : Number.isFinite(Number(f.value))),
        )
        .map((f) => ({
          field: f.field,
          time: number(f.time, 0, 0, 120),
          value: colorAnimationFields.includes(f.field)
            ? f.value
            : number(f.value, 0, -10000, 10000),
          ease: discreteAnimationFields.includes(f.field)
            ? "hold"
            : animationEasings.includes(f.ease)
              ? f.ease
              : "smooth",
          curve: Array.from({ length: 4 }, (_, i) =>
            number(
              f.curve?.[i],
              [0.25, 0.1, 0.25, 1][i],
              i % 2 ? -2 : 0,
              i % 2 ? 3 : 1,
            ),
          ),
        }))
        .sort((a, b) => a.time - b.time),
    })),
  };
}
export function easeAnimation(t, mode, curve = [0.25, 0.1, 0.25, 1]) {
  t = Math.max(0, Math.min(1, t));
  if (mode === "bezier") {
    const [x1, y1, x2, y2] = curve;
    const at = (u, a, b) =>
      3 * (1 - u) ** 2 * u * a + 3 * (1 - u) * u * u * b + u ** 3;
    let low = 0,
      high = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (at(mid, x1, x2) < t) low = mid;
      else high = mid;
    }
    return t === 0 ? 0 : t === 1 ? 1 : at((low + high) / 2, y1, y2);
  }
  return mode === "hold"
    ? t === 1
      ? 1
      : 0
    : mode === "smooth"
      ? t * t * (3 - 2 * t)
      : mode === "easeIn"
        ? t * t
        : mode === "easeOut"
          ? 1 - (1 - t) ** 2
          : t;
}
function mix(a, b, t) {
  if (typeof a === "string") {
    const v = [1, 3, 5].map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) +
          (parseInt(b.slice(i, i + 2), 16) - parseInt(a.slice(i, i + 2), 16)) *
            t,
      ),
    );
    return "#" + v.map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return a + (b - a) * t;
}
export function frameValue(frames, field, time, fallback) {
  const keys = frames.filter((f) => f.field === field);
  if (!keys.length) return fallback;
  if (time <= keys[0].time) return keys[0].value;
  for (let i = 1; i < keys.length; i++)
    if (time <= keys[i].time) {
      const a = keys[i - 1],
        b = keys[i];
      return mix(
        a.value,
        b.value,
        easeAnimation(
          (time - a.time) / (b.time - a.time || 1),
          a.ease,
          a.curve,
        ),
      );
    }
  return keys.at(-1).value;
}
export function animationScene(scene, raw, time, options={}) {
  const config = normalizeAnimation(raw),
    result = {
      ...scene,
      positions: { ...scene.positions },
      elements: { ...scene.elements },
      fragments: { ...scene.fragments },
      blockKeys: [...(scene.blockKeys || [])],
    },
    typingElapsed = {};
  let contactTimes={};
  if(!options.skipEvents&&config.events.some(e=>e.enabled&&e.trigger==='contact')){
    const signature=JSON.stringify([scene.positions,scene.elements,config]);const cached=contactHistory.get(scene);
    if(cached?.signature===signature)contactTimes=cached.times;
    else{const past=animationScene(scene,{...config,events:[]},config.duration,{skipEvents:true}).scene;for(const p of Object.values(past.positions))Object.assign(contactTimes,p.contactTimes||{});contactHistory.set(scene,{signature,times:contactTimes});}
  }
  const schedule=eventSchedule(config,contactTimes);
  for (const key of scene.blockKeys || []) {
    const starts = config.clips
      .filter((c) => c.enabled && c.keys.includes(key))
      .map((c) => c.start);
    typingElapsed[key] =
      (time - (starts.length ? Math.min(...starts) : 0)) * 1000;
  }
  for (const clip of config.clips) {
    if (!clip.enabled || time < clip.start) continue;
    for(const f of clip.frames){const ef=parseEffectField(f.field);if(!ef)continue;const e=config.effects.find(e=>e.id===ef.id);if(e)e[ef.property]=frameValue(clip.frames,f.field,Math.min(clip.duration,time-clip.start),e[ef.property]);}
    const local = Math.min(clip.duration, time - clip.start),
      progress = frameValue(
        clip.frames,
        "progress",
        local,
        local / clip.duration,
      ),
      path = config.paths.find((p) => p.id === clip.pathId),
      parameter =
        path && clip.constantSpeed
          ? splineParameter(path.points, progress, path.closed)
          : progress,
      point = path ? splinePoint(path.points, parameter, path.closed) : null;
    for (const [field, prop] of [
      ["backgroundColor", "color"],
      ["backgroundColor2", "color2"],
      ["backgroundAngle", "gradientAngle"],
    ]) {
      if (clip.frames.some((f) => f.field === field)) {
        config[prop] = frameValue(clip.frames, field, local, config[prop]);
        if (prop === "color") config.colorRole = null;
      }
    }
    for(const field of cameraFields)if(clip.frames.some(f=>f.field===field)){const prop=field.slice(6);const key=prop[0].toLowerCase()+prop.slice(1);config.camera[key]=frameValue(clip.frames,field,local,config.camera[key]);}
    const keys = clip.keys.filter((k) => result.positions[k]),
      anchor = result.positions[keys[0]];
    if (!anchor) continue;
    const left = Math.min(...keys.map((k) => result.positions[k].x)),
      top = Math.min(...keys.map((k) => result.positions[k].y)),
      right = Math.max(
        ...keys.map(
          (k) => result.positions[k].x + (result.positions[k].w || 0),
        ),
      ),
      bottom = Math.max(
        ...keys.map(
          (k) => result.positions[k].y + (result.positions[k].h || 0),
        ),
      );
    const px = left + (right - left) * clip.pivotX,
      py = top + (bottom - top) * clip.pivotY;
    let sx = anchor.w
        ? frameValue(clip.frames, "w", local, anchor.w) / anchor.w
        : 1,
      sy = anchor.h
        ? frameValue(clip.frames, "h", local, anchor.h) / anchor.h
        : 1;
    sx = Math.max(0.001, sx);
    sy = Math.max(0.001, sy);
    if (clip.modifier === "stretch") {
      const factor =
        1 +
        Math.sin(local * clip.frequency * Math.PI * 2) *
          Math.min(0.9, clip.amplitude / 100);
      sx *= factor;
      sy /= factor;
    }
    const angle =
        frameValue(clip.frames, "rotation", local, anchor.rotation || 0) -
        (anchor.rotation || 0) +
        (clip.orient && path
          ? splineAngle(path.points, parameter, path.closed)
          : 0),
      rad = (angle * Math.PI) / 180;
    let dx = point
        ? point.x - px
        : frameValue(clip.frames, "x", local, anchor.x) - anchor.x,
      dy = point
        ? point.y - py
        : frameValue(clip.frames, "y", local, anchor.y) - anchor.y;
    if (clip.modifier === "oscillate")
      dy += Math.sin(local * clip.frequency * Math.PI * 2) * clip.amplitude;
    if (clip.modifier === "gravity") dy += 0.5 * clip.gravity * local * local;
    for (const key of keys) {
      const base = result.positions[key],
        p = { ...base },
        w = (base.w || 0) * sx,
        h = (base.h || 0) * sy,
        cx = (base.x + (base.w || 0) / 2 - px) * sx,
        cy = (base.y + (base.h || 0) / 2 - py) * sy;
      p.x = px + cx * Math.cos(rad) - cy * Math.sin(rad) - w / 2 + dx;
      p.y = py + cx * Math.sin(rad) + cy * Math.cos(rad) - h / 2 + dy;
      // One object's X/Y denote its top-left, independently of its size keys.
      // Paths instead anchor its pivot, including squash/stretch at landings.
      if (keys.length === 1) {
        p.x = point
          ? point.x - w * clip.pivotX
          : frameValue(clip.frames, "x", local, base.x);
        p.y = point
          ? point.y - h * clip.pivotY
          : frameValue(clip.frames, "y", local, base.y);
        if (clip.modifier === "oscillate")
          p.y +=
            Math.sin(local * clip.frequency * Math.PI * 2) * clip.amplitude;
        if (clip.modifier === "gravity")
          p.y += 0.5 * clip.gravity * local * local;
      }
      if (base.w !== undefined) p.w = w;
      if (base.h !== undefined) p.h = h;
      p.rotation = (base.rotation || 0) + angle;
      for (const f of ["opacity", "size", "contentScale", "skewX", "skewY"])
        if (clip.frames.some((k) => k.field === f))
          p[f] = frameValue(
            clip.frames,
            f,
            local,
            base[f] ?? (f === "opacity" ? 100 : 1),
          );
      if (base.size && !clip.frames.some((k) => k.field === "size"))
        p.size = base.size * Math.sqrt(sx * sy);
      const color = frameValue(clip.frames, "color", local, null);
      if (color) {
        p.textStyle = { ...p.textStyle, color, colorRole: "" };
        if (result.elements[key]?.type === "shape")
          result.elements[key] = {
            ...result.elements[key],
            fill: color,
            fillRole: "",
          };
      }
      if (
        result.elements[key]?.type === "shape" &&
        !result.elements[key]?.engineKind
      ) {
        const shape = { ...result.elements[key] };
        for (const [field, prop] of Object.entries(shapeAnimationFields)) {
          const frames = clip.frames.filter((f) => f.field === field);
          if (!frames.length) continue;
          if (discreteAnimationFields.includes(field)) {
            const f = frames.filter((f) => f.time <= local).at(-1) || frames[0];
            shape[prop] = Number(f.value) >= 0.5;
          } else shape[prop] = frameValue(frames, field, local, shape[prop]);
          if (field === "strokeColor") shape.strokeRole = null;
        }
        result.elements[key] = normalizeShape(shape);
      }
      result.positions[key] = p;
      typingElapsed[key] = local * 1000;
    }
    if(clip.frames.some(f=>f.field==='scale')){
      const poses=Object.fromEntries(keys.map(key=>[key,result.positions[key]]));
      // Scale the evaluated pose, preserving all internal metrics with the shared transform.
      const values=Object.values(poses),x=Math.min(...values.map(p=>p.x)),y=Math.min(...values.map(p=>p.y)),w=Math.max(...values.map(p=>p.x+p.w))-x,h=Math.max(...values.map(p=>p.y+(p.h||0)))-y;
      const scaled=scaleObjects(poses,{x,y,w,h},Math.max(1,Math.min(1000,frameValue(clip.frames,'scale',local,100)))/100,{x:x+w*clip.pivotX,y:y+h*clip.pivotY});
      if(scaled)Object.assign(result.positions,scaled.positions);
    }
  }
  const restGravity=new Map(config.engines.map(e=>[e.id,e.gravity]));
  for (const engine of config.engines) {
    for (const c of config.clips.filter(
      (c) => c.enabled && c.keys.includes(engine.key) && time >= c.start,
    )) {
      const t = Math.min(c.duration, time - c.start);
      for (const [field, prop] of Object.entries(engineAnimationFields)) {
        const target = field === "engineGravity" ? engine : engine.particles;
        target[prop] = frameValue(c.frames, field, t, target[prop]);
      }
      engine.particles.color = frameValue(
        c.frames,
        "color",
        t,
        engine.particles.color,
      );
      if (c.frames.some((f) => colorAnimationFields.includes(f.field)))
        engine.particles.colorRole = null;
    }
    engine.particles = normalizeParticles(engine.particles);
    engine.gravity = number(engine.gravity, 200, -2000, 2000);
  }
  for (const engine of config.engines) {
    if (!engine.enabled || engine.kind !== "gravity" || time < engine.start)
      continue;
    const t = Math.min(engine.duration, time - engine.start);
    const gravityAt=config.clips.some(c=>c.enabled&&c.keys.includes(engine.key)&&c.frames.some(f=>f.field==='engineGravity'))?elapsed=>{
      const global=engine.start+elapsed;let value=restGravity.get(engine.id);
      for(const c of config.clips.filter(c=>c.enabled&&c.keys.includes(engine.key)&&global>=c.start)) value=frameValue(c.frames,'engineGravity',Math.min(c.duration,global-c.start),value);
      return value;
    }:undefined;
    for (const key of engine.targets) {
      const p = result.positions[key];
      if (!p || result.elements[key]?.engineKind) continue;
      const driven =
        engine.followPath &&
        config.clips.find(
          (c) =>
            c.enabled && c.keys.length === 1 && c.keys[0] === key && c.pathId,
        );
      if (driven) {
        const path = config.paths.find((p) => p.id === driven.pathId),
          base = scene.positions[key];
        const sample = (elapsed) => {
          const local = Math.max(
            0,
            Math.min(driven.duration, engine.start + elapsed - driven.start),
          );
          const progress = frameValue(
            driven.frames,
            "progress",
            local,
            local / driven.duration,
          );
          const point = splinePoint(
            path.points,
            driven.constantSpeed
              ? splineParameter(path.points, progress, path.closed)
              : progress,
            path.closed,
          );
          const w = frameValue(driven.frames, "w", local, base.w),
            h = frameValue(driven.frames, "h", local, base.h);
          return {
            ...p,
            x: point.x - w * driven.pivotX,
            y: point.y - h * driven.pivotY,
            w,
            h,
          };
        };
        const floors = config.effects
          .filter((e) => e.enabled && e.kind === "collider" && e.key !== key)
          .map((e) => result.positions[e.key])
          .filter(Boolean);
        if (path)
          result.positions[key] = simulateDrivenBody(
            sample,
            t,
            {
              ...engine,gravityAt,
              triggers: config.triggers
                .filter((r) => r.enabled && r.actor === key)
                .map((r) => ({ ...r, bounds: result.positions[r.target] })),
            },
            floors,
          );
        if(result.positions[key]?.contactTimes)result.positions[key].contactStart=engine.start;
      } else {
        if (p && !result.elements[key]?.engineKind)
          result.positions[key] = simulateBody(
            p,
            t,
            {...engine,gravityAt},
            config.effects
              .filter(
                (e) => e.enabled && e.kind === "collider" && e.key !== key,
              )
              .map((e) => result.positions[e.key])
              .filter(Boolean),
          );
      }
    }
  }
  for(const [key,p]of Object.entries(result.positions))if(p.contactTimes)result.positions[key]={...p,contactTimes:Object.fromEntries(Object.entries(p.contactTimes).map(([id,t])=>[id,t+(p.contactStart||0)]))};
  for (const [key, p] of Object.entries(result.positions))
    for (const id of p.contacts || []) {
      const r = config.triggers.find((r) => r.id === id);
      if (!r) continue;
      if (r.shape || r.color)
        result.elements[key] = normalizeShape({
          ...result.elements[key],
          ...(r.shape ? { shape: r.shape } : {}),
          ...(r.color ? { fill: r.color, fillRole: null } : {}),
        });
      if (result.elements[r.target] && (r.targetShape || r.targetColor))
        result.elements[r.target] = normalizeShape({
          ...result.elements[r.target],
          ...(r.targetShape ? { shape: r.targetShape } : {}),
          ...(r.targetColor ? { fill: r.targetColor, fillRole: null } : {}),
        });
    }
  applyEffects(result, config.effects, time);
  const attachmentWarnings=applyAttachments(result,config.attachments);
  const firedEvents=applyEvents(result,config,time,schedule.times);
  config.camera=normalizeCamera(config.camera);
  for (const engine of config.engines) {
    const parent = result.positions[engine.parent],
      p = result.positions[engine.key];
    if (parent && p)
      result.positions[engine.key] = {
        ...p,
        x: parent.x + parent.w / 2 + engine.offsetX - p.w / 2,
        y: parent.y + (parent.h || 0) / 2 + engine.offsetY - p.h / 2,
      };
  }
  return { scene: result, typingElapsed, config, firedEvents,eventTimes:schedule.times,warnings:[...schedule.warnings,...attachmentWarnings] };
}
// Closed-form, seeded particles: seeking and exporting do not depend on preview FPS.
export function animationParticles(clip, time, origin) {
  if (
    !clip.particles?.enabled ||
    time < clip.start ||
    time > clip.start + clip.duration
  )
    return [];
  const p = clip.particles,
    random = (n) => {
      const x = Math.sin((n + 1) * 127.1 + p.seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    },
    out = [];
  for (let i = 0; i < p.count; i++) {
    const birth = (i / p.count) * p.life,
      t = time - clip.start - birth;
    if (t < 0) continue;
    const age = t % p.life,
      cycle = Math.floor(t / p.life),
      a = random(i + cycle * p.count) * Math.PI * 2,
      v = p.speed * (0.4 + 0.6 * random(i + 109));
    const vx =
      p.direction === "axes"
        ? (Math.min(p.xMin, p.xMax) +
            random(i + cycle * p.count + 251) * Math.abs(p.xMax - p.xMin)) *
          p.speed *
          p.force
        : Math.cos(a) * v * p.force;
    const vy =
      p.direction === "axes"
        ? (Math.min(p.yMin, p.yMax) +
            random(i + cycle * p.count + 503) * Math.abs(p.yMax - p.yMin)) *
          p.speed *
          p.force
        : Math.sin(a) * v * p.force;
    const spawn=typeof origin==='function'?origin(time-age):origin;
    out.push({
      x: spawn.x + vx * age,
      y: spawn.y + vy * age + 0.5 * clip.gravity * age * age,
      size: p.size * (1 - age / p.life),
      alpha: 1 - age / p.life,
      color: p.color,
    });
  }
  return out;
}
export function addAnimationKey(clip, field, time, value, ease = "smooth") {
  clip.frames = clip.frames.filter(
    (f) => !(f.field === field && Math.abs(f.time - time) < 0.0001),
  );
  clip.frames.push({ field, time, value, ease, curve: [0.25, 0.1, 0.25, 1] });
  clip.frames.sort((a, b) => a.time - b.time);
}
