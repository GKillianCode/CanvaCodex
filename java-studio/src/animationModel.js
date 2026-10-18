// Animation data is independent of pedagogical steps. All times are seconds.
export const animationFields = [
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
export function normalizeAnimation(raw = {}) {
  return {
    version: 1,
    duration: number(raw?.duration, 8, 0.1, 120),
    fps: [24, 30, 60].includes(raw?.fps) ? raw.fps : 30,
    background: raw?.background === "solid" ? "solid" : "transparent",
    color: /^#[a-f0-9]{6}$/i.test(raw?.color) ? raw.color : "#00ff00",
    links: list(raw?.links, 100)
      .filter((l) => typeof l?.from === "string" && typeof l?.to === "string")
      .map((l, i) => ({
        id: String(l.id || "link" + i).slice(0, 100),
        from: l.from.slice(0, 100),
        to: l.to.slice(0, 100),
        color: /^#[a-f0-9]{6}$/i.test(l.color) ? l.color : "#8ab9ab",
        width: number(l.width, 4, 1, 30),
      })),
    paths: list(raw?.paths, 50).map((p, i) => ({
      id: String(p?.id || "path" + i).slice(0, 100),
      name: String(p?.name || "Trajectoire").slice(0, 100),
      visible: p?.visible === true,
      points: Array.from({ length: 4 }, (_, j) => ({
        x: number(p?.points?.[j]?.x, 300 + j * 400),
        y: number(p?.points?.[j]?.y, j === 1 ? 150 : 600),
      })),
    })),
    clips: list(raw?.clips, 100).map((c, i) => ({
      id: String(c?.id || "clip" + i).slice(0, 100),
      name: String(c?.name || "Séquence").slice(0, 100),
      enabled: c?.enabled !== false,
      start: number(c?.start, 0, 0, 120),
      duration: number(c?.duration, 8, 0.1, 120),
      keys: list(c?.keys, 100).filter(
        (k) => typeof k === "string" && k.length < 100,
      ),
      pathId: typeof c?.pathId === "string" ? c.pathId.slice(0, 100) : "",
      orient: c?.orient === true,
      constantSpeed: c?.constantSpeed !== false,
      particles: {
        enabled: c?.particles?.enabled === true,
        count: Math.round(number(c?.particles?.count, 40, 1, 200)),
        seed: Math.round(number(c?.particles?.seed, 1, 0, 100000)),
        life: number(c?.particles?.life, 2, 0.1, 10),
        speed: number(c?.particles?.speed, 150, 0, 1000),
        size: number(c?.particles?.size, 8, 1, 100),
        color: /^#[a-f0-9]{6}$/i.test(c?.particles?.color)
          ? c.particles.color
          : "#89baa9",
      },
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
            animationFields.includes(f?.field) &&
            Number.isFinite(Number(f?.time)) &&
            (f.field === "color"
              ? /^#[a-f0-9]{6}$/i.test(f.value)
              : Number.isFinite(Number(f.value))),
        )
        .map((f) => ({
          field: f.field,
          time: number(f.time, 0, 0, 120),
          value:
            f.field === "color" ? f.value : number(f.value, 0, -10000, 10000),
          ease: animationEasings.includes(f.ease) ? f.ease : "smooth",
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
export function splinePoint(points, t) {
  t = Math.max(0, Math.min(1, t));
  const u = 1 - t,
    [a, b, c, d] = points;
  return {
    x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y,
  };
}
export function splineAngle(points, t) {
  const [a, b, c, d] = points,
    u = 1 - t;
  return (
    (Math.atan2(
      3 * u * u * (b.y - a.y) +
        6 * u * t * (c.y - b.y) +
        3 * t * t * (d.y - c.y),
      3 * u * u * (b.x - a.x) +
        6 * u * t * (c.x - b.x) +
        3 * t * t * (d.x - c.x),
    ) *
      180) /
    Math.PI
  );
}
export function splineParameter(points, progress) {
  const target = Math.max(0, Math.min(1, progress));
  let last = points[0],
    total = 0;
  const distances = [0];
  for (let i = 1; i <= 96; i++) {
    const point = splinePoint(points, i / 96);
    total += Math.hypot(point.x - last.x, point.y - last.y);
    distances.push(total);
    last = point;
  }
  if (!total) return target;
  for (let i = 1; i < distances.length; i++)
    if (distances[i] >= target * total)
      return (
        (i -
          1 +
          (target * total - distances[i - 1]) /
            (distances[i] - distances[i - 1] || 1)) /
        96
      );
  return 1;
}
export function animationScene(scene, raw, time) {
  const config = normalizeAnimation(raw),
    result = {
      ...scene,
      positions: { ...scene.positions },
      elements: { ...scene.elements },
    },
    typingElapsed = {};
  for (const key of scene.blockKeys || []) {
    const starts = config.clips
      .filter((c) => c.enabled && c.keys.includes(key))
      .map((c) => c.start);
    typingElapsed[key] =
      (time - (starts.length ? Math.min(...starts) : 0)) * 1000;
  }
  for (const clip of config.clips) {
    if (!clip.enabled || time < clip.start) continue;
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
          ? splineParameter(path.points, progress)
          : progress,
      point = path ? splinePoint(path.points, parameter) : null;
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
        (clip.orient && path ? splineAngle(path.points, parameter) : 0),
      rad = (angle * Math.PI) / 180;
    let dx =
        frameValue(clip.frames, "x", local, anchor.x) -
        anchor.x +
        (point ? point.x - px : 0),
      dy =
        frameValue(clip.frames, "y", local, anchor.y) -
        anchor.y +
        (point ? point.y - py : 0);
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
      result.positions[key] = p;
      typingElapsed[key] = local * 1000;
    }
  }
  return { scene: result, typingElapsed, config };
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
    out.push({
      x: origin.x + Math.cos(a) * v * age,
      y: origin.y + Math.sin(a) * v * age + 0.5 * clip.gravity * age * age,
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
