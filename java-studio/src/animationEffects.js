// Deterministic 2D effects. Fixed steps make scrubbing independent of playback FPS.
const n = (v, d, min = -10000, max = 10000) =>
  Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : d;
export const effectKinds = [
  "oscillate",
  "stretch",
  "skew",
  "array",
  "subtract",
  "intersect",
  "gravity",
  "wind",
  "turbulence",
  "collider",
];
export function normalizeEffect(r = {}, i = 0) {
  return {
    id: String(r.id || "effect" + i).slice(0, 100),
    kind: effectKinds.includes(r.kind) ? r.kind : "oscillate",
    enabled: r.enabled !== false,
    key: String(r.key || "").slice(0, 100),
    target: String(r.target || "").slice(0, 100),
    amount: n(r.amount, 40),
    frequency: n(r.frequency, 1, 0, 20),
    count: Math.round(n(r.count, 4, 1, 30)),
    dx: n(r.dx, 100),
    dy: n(r.dy, 0),
    gravity: n(r.gravity, 600, -2000, 2000),
    wind: n(r.wind, 0, -2000, 2000),
    drag: n(r.drag, 0.1, 0, 10),
    bounce: n(r.bounce, 0.5, 0, 1),
    friction: n(r.friction, 0.15, 0, 1),
  };
}
export function simulateBody(
  base,
  time,
  { gravity = 600, gravityAt, wind = 0, drag = 0.1, bounce = 0.5, friction = 0.15 } = {},
  floors = [],
) {
  if (!floors.length && drag === 0 && !gravityAt)
    return {
      ...base,
      x: base.x + 0.5 * wind * time * time,
      y: base.y + 0.5 * gravity * time * time,
    };
  let x = base.x,
    y = base.y,
    vx = 0,
    vy = 0;
  const w = base.w || 0,
    h = base.h || 0,
    end = Math.max(0, Math.min(120, time));
  for (let i = 0; i < Math.ceil(end * 120); i++) {
    const dt = Math.min(1 / 120, end - i / 120),
      oldX = x,
      oldY = y;
    vx = (vx + wind * dt) * Math.exp(-drag * dt);
    vy = (vy + (gravityAt ? gravityAt(i/120) : gravity) * dt) * Math.exp(-drag * dt);
    x += vx * dt;
    y += vy * dt;
    for (const f of floors) {
      if (x + w > f.x && x < f.x + f.w) {
        if (oldY + h <= f.y + 0.001 && y + h >= f.y && vy >= 0) {
          y = f.y - h;
          vy = -vy * bounce;
          vx *= 1 - friction;
          if (Math.abs(vy) < 2) vy = 0;
          continue;
        }
        if (oldY >= f.y + f.h - 0.001 && y <= f.y + f.h && vy < 0) {
          y = f.y + f.h;
          vy = -vy * bounce;
          continue;
        }
      }
      if (x + w <= f.x || x >= f.x + f.w || y + h <= f.y || y >= f.y + f.h)
        continue;
      if (oldY + h <= f.y + 0.001 && vy >= 0) {
        y = f.y - h;
        vy = -vy * bounce;
        vx *= 1 - friction;
        if (Math.abs(vy) < 2) vy = 0;
      } else if (oldY >= f.y + f.h - 0.001 && vy < 0) {
        y = f.y + f.h;
        vy = -vy * bounce;
      } else if (oldX + w <= f.x + 0.001 && vx >= 0) {
        x = f.x - w;
        vx = -vx * bounce;
      } else if (oldX >= f.x + f.w - 0.001 && vx < 0) {
        x = f.x + f.w;
        vx = -vx * bounce;
      }
    }
  }
  return { ...base, x, y };
}
export function applyEffects(scene, effects, time) {
  const active = effects.filter((e) => e.enabled && scene.positions[e.key]);
  const floors = active
    .filter((e) => e.kind === "collider")
    .map((e) => scene.positions[e.key]);
  for (const e of active) {
    const p = scene.positions[e.key],
      q = { ...p },
      phase = time * e.frequency * Math.PI * 2;
    if (e.kind === "oscillate") q.y += Math.sin(phase) * e.amount;
    if (e.kind === "turbulence") {
      q.x += Math.sin(phase) * e.amount;
      q.y += Math.sin(phase * 0.71) * e.amount * 0.5;
    }
    if (e.kind === "stretch") {
      const factor =
        1 + Math.sin(phase) * Math.min(0.9, Math.abs(e.amount) / 100);
      q.w = p.w * factor;
      q.h = p.h / factor;
      q.x -= (q.w - p.w) / 2;
      q.y -= (q.h - p.h) / 2;
    }
    if (e.kind === "skew")
      q.skewX = (p.skewX || 0) + Math.sin(phase) * Math.min(75, e.amount);
    if (e.kind === "gravity" || e.kind === "wind")
      Object.assign(
        q,
        simulateBody(
          p,
          time,
          {
            ...e,
            gravity: e.kind === "wind" ? 0 : e.gravity,
            wind: e.kind === "wind" ? e.amount : e.wind,
          },
          floors.filter((f) => f !== p),
        ),
      );
    scene.positions[e.key] = q;
    if (e.kind === "array") {
      for (let i = 1; i < e.count && scene.blockKeys.length < 1000; i++) {
        const key = e.key + "__" + e.id + "_" + i;
        scene.blockKeys.push(key);
        scene.elements[key] = scene.elements[e.key];
        scene.positions[key] = { ...q, x: q.x + e.dx * i, y: q.y + e.dy * i };
        scene.fragments[key] = { ...(scene.fragments[e.key] || { order: 0 }) };
      }
    }
  }
  return scene;
}

// A spline supplies horizontal intent; vertical motion is integrated from a jump
// impulse. Resize keeps the feet in place, so landing squash cannot sink in floors.
export function simulateDrivenBody(sample, time, options = {}, floors = []) {
  let gravity = options.gravity ?? 600, contactGravity=null;
  const drag = options.drag ?? 0,
    contacts = new Set();
  let p = { ...sample(0) },
    vy = options.velocityY || 0;
  const end = Math.max(0, Math.min(120, time));
  for (let i = 0; i < Math.ceil(end * 120); i++) {
    const dt = Math.min(1 / 120, end - i / 120),
      next = sample(i / 120 + dt);
    const bottom = p.y + p.h,
      top = p.y;
    gravity=contactGravity ?? (options.gravityAt ? options.gravityAt(i/120) : options.gravity ?? 600);
    vy = (vy + gravity * dt) * Math.exp(-drag * dt);
    p = { ...next, y: (gravity < 0 ? top : bottom - next.h) + vy * dt };
    for (const r of options.triggers || []) {
      const b = r.bounds;
      if (!b || contacts.has(r.id)) continue;
      if (
        p.x + p.w >= b.x &&
        p.x <= b.x + b.w &&
        p.y + p.h >= b.y &&
        p.y <= b.y + b.h
      ) {
        contacts.add(r.id);
        if (r.gravity != null) { gravity = r.gravity;contactGravity=r.gravity; }
        if (r.impulse != null) vy = r.impulse;
      }
    }
    for (const floor of floors) {
      if (
        p.x + p.w > floor.x &&
        p.x < floor.x + floor.w &&
        vy < 0 &&
        top >= floor.y + floor.h - 0.001 &&
        p.y <= floor.y + floor.h
      ) {
        p.y = floor.y + floor.h;
        vy = -vy * (options.bounce ?? 0);
        if (Math.abs(vy) < 2) vy = 0;
      }
      if (
        p.x + p.w > floor.x &&
        p.x < floor.x + floor.w &&
        vy >= 0 &&
        bottom <= floor.y + 0.001 &&
        p.y + p.h >= floor.y
      ) {
        p.y = floor.y - p.h;
        vy = -vy * (options.bounce ?? 0);
        if (Math.abs(vy) < 2) vy = 0;
      }
    }
  }
  return { ...p, contacts: [...contacts] };
}
