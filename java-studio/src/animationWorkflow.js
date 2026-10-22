import { normalizeShape } from "./shapes.js";
const num = (v, d, min = -10000, max = 10000) =>
  Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : d;
const id = (v) => String(v || "").slice(0, 100);
export function normalizeAttachments(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((r) => r && typeof r === "object")
    .slice(0, 100)
    .map((r, i) => ({
      id: id(r.id) || "attachment" + i,
      child: id(r.child),
      parent: id(r.parent),
      enabled: r.enabled !== false,
      parentX: num(r.parentX, 0.5, 0, 1),
      parentY: num(r.parentY, 0.5, 0, 1),
      childX: num(r.childX, 0.5, 0, 1),
      childY: num(r.childY, 0.5, 0, 1),
      offsetX: num(r.offsetX, 0),
      offsetY: num(r.offsetY, 0),
      rotate: r.rotate === true,
    }));
}
export function attachmentCycle(attachments, child, parent) {
  const seen = new Set([child]);
  let key = parent;
  while (key) {
    if (seen.has(key)) return true;
    seen.add(key);
    key = attachments.find((r) => r.enabled && r.child === key)?.parent;
  }
  return false;
}
export function applyAttachments(scene, attachments) {
  const resolved = new Set(),
    warnings = [];
  function visit(key, stack = []) {
    if (resolved.has(key)) return;
    const r = attachments.find((r) => r.enabled && r.child === key);
    if (!r) return;
    if (stack.includes(key)) {
      warnings.push("Cycle d’attaches ignoré.");
      return;
    }
    if (attachmentCycle(attachments, key, r.parent)) {
      warnings.push("Cycle d’attaches ignoré.");
      return;
    }
    visit(r.parent, [...stack, key]);
    const p = scene.positions[r.parent],
      c = scene.positions[key];
    if (!p || !c) return;
    const a = ((p.rotation || 0) * Math.PI) / 180,
      ox = p.w * (r.parentX - 0.5) + r.offsetX,
      oy = (p.h || 0) * (r.parentY - 0.5) + r.offsetY;
    const rotation = (c.rotation || 0) + (r.rotate ? p.rotation || 0 : 0),
      angle = (rotation * Math.PI) / 180,
      cx = c.w * (r.childX - 0.5),
      cy = (c.h || 0) * (r.childY - 0.5);
    scene.positions[key] = {
      ...c,
      rotation,
      x:
        p.x +
        p.w / 2 +
        ox * Math.cos(a) -
        oy * Math.sin(a) -
        cx * Math.cos(angle) +
        cy * Math.sin(angle) -
        c.w / 2,
      y:
        p.y +
        (p.h || 0) / 2 +
        ox * Math.sin(a) +
        oy * Math.cos(a) -
        cx * Math.sin(angle) -
        cy * Math.cos(angle) -
        (c.h || 0) / 2,
    };
    resolved.add(key);
  }
  for (const r of attachments) visit(r.child);
  return [...new Set(warnings)];
}
export function normalizeEvents(raw) {
  return (Array.isArray(raw) ? raw : [])
    .filter((r) => r && typeof r === "object")
    .slice(0, 50)
    .map((r, i) => ({
      id: id(r.id) || "event" + i,
      name: String(r.name || "Événement").slice(0, 100),
      enabled: r.enabled !== false,
      trigger: ["time", "clipEnd", "contact"].includes(r.trigger)
        ? r.trigger
        : "time",
      time: num(r.time, 0, 0, 120),
      source: id(r.source),
      action: ["show", "color", "shape", "startClip"].includes(r.action)
        ? r.action
        : "show",
      target: id(r.target),
      value: String(r.value || "").slice(0, 100),
    }));
}
export function eventSchedule(config, contactTimes = {}) {
  const times = {},
    starts = {},
    warnings = [];
  function start(clip, stack) {
    if (starts[clip.id] !== undefined) return starts[clip.id];
    const event = config.events.find(
      (e) => e.enabled && e.action === "startClip" && e.target === clip.id,
    );
    return (starts[clip.id] = event ? at(event, stack) : clip.start);
  }
  function at(e, stack = []) {
    if (times[e.id] !== undefined) return times[e.id];
    if (stack.includes(e.id)) {
      warnings.push("Boucle d’événements : séquence désactivée.");
      return Infinity;
    }
    const next = [...stack, e.id];
    let t = Infinity;
    if (e.trigger === "time") t = e.time;
    else if (e.trigger === "contact") t = contactTimes[e.source] ?? Infinity;
    else {
      const c = config.clips.find((c) => c.id === e.source);
      if (c) t = start(c, next) + c.duration;
    }
    return (times[e.id] = t);
  }
  for (const e of config.events.filter((e) => e.enabled)) at(e);
  for (const c of config.clips) {
    const e = config.events.find(
      (e) => e.enabled && e.action === "startClip" && e.target === c.id,
    );
    if (e) {
      const t = start(c, []);
      if (Number.isFinite(t)) c.start = t;
      else c.enabled = false;
    }
  }
  return { times, warnings: [...new Set(warnings)] };
}
export function applyEvents(scene, config, time, times) {
  const fired = [];
  for (const e of config.events.filter((e) => e.enabled)) {
    const t = times[e.id] ?? Infinity,
      p = scene.positions[e.target],
      element = scene.elements[e.target],
      link = config.links.find((r) => r.id === e.target);
    if (e.action === "show" && link) link.visible = time >= t;
    if (e.action === "show" && p)
      scene.positions[e.target] = {
        ...p,
        opacity: time >= t ? (p.opacity ?? 100) : 0,
      };
    if (time < t) continue;
    fired.push(e.id);
    if (e.action === "color" && element && /^#[a-f0-9]{6}$/i.test(e.value)) {
      scene.elements[e.target] = {
        ...element,
        ...(element.type === "shape" ? { fill: e.value, fillRole: null } : {}),
      };
      if (p)
        scene.positions[e.target] = {
          ...scene.positions[e.target],
          textStyle: { ...p.textStyle, color: e.value, colorRole: null },
        };
    }
    if (e.action === "shape" && element?.type === "shape")
      scene.elements[e.target] = {
        ...element,
        shape: normalizeShape({ shape: e.value }).shape,
      };
  }
  return fired;
}
export const cameraFields = [
  "cameraX",
  "cameraY",
  "cameraZoom",
  "cameraRotation",
];
export function normalizeCamera(raw = {}) {
  raw = raw || {};
  return {
    x: num(raw.x, 960),
    y: num(raw.y, 540),
    zoom: num(raw.zoom, 100, 10, 800),
    rotation: num(raw.rotation, 0, -360, 360),
  };
}
export function cameraFrame(raw) {
  const c = normalizeCamera(raw),
    w = 192000 / c.zoom,
    h = 108000 / c.zoom,
    a = (c.rotation * Math.PI) / 180;
  return {
    w,
    h,
    corners: [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ].map(([x, y]) => ({
      x: c.x + x * Math.cos(a) - y * Math.sin(a),
      y: c.y + x * Math.sin(a) + y * Math.cos(a),
    })),
  };
}
export function applyCamera(ctx, camera) {
  ctx.translate(960, 540);
  ctx.rotate((-camera.rotation * Math.PI) / 180);
  ctx.scale(camera.zoom / 100, camera.zoom / 100);
  ctx.translate(-camera.x, -camera.y);
}
export function projectCameraPose(p, camera) {
  if (!p) return p;
  const a = (-camera.rotation * Math.PI) / 180,
    s = camera.zoom / 100,
    x = p.x + p.w / 2 - camera.x,
    y = p.y + p.h / 2 - camera.y,
    w = p.w * s,
    h = p.h * s;
  return {
    ...p,
    x: 960 + (x * Math.cos(a) - y * Math.sin(a)) * s - w / 2,
    y: 540 + (x * Math.sin(a) + y * Math.cos(a)) * s - h / 2,
    w,
    h,
    ...(Number.isFinite(p.size) ? { size: p.size * s } : {}),
    rotation: (p.rotation || 0) - camera.rotation,
    contentScale: (p.contentScale || 1) * s,
  };
}

export function anchorPoint(p, x = 0.5, y = 0.5) {
  const a = ((p.rotation || 0) * Math.PI) / 180,
    dx = p.w * (x - 0.5),
    dy = (p.h || 0) * (y - 0.5);
  return {
    x: p.x + p.w / 2 + dx * Math.cos(a) - dy * Math.sin(a),
    y: p.y + (p.h || 0) / 2 + dx * Math.sin(a) + dy * Math.cos(a),
  };
}
