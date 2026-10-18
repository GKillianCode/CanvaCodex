const limit = (n) =>
  Number.isFinite(Number(n)) ? Math.max(-10000, Math.min(10000, Number(n))) : 0;
export function normalizePathNodes(raw) {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 128)
    .filter(
      (p) => p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)),
    )
    .map((p) => ({
      x: limit(p.x),
      y: limit(p.y),
      inX: limit(p.inX ?? p.x),
      inY: limit(p.inY ?? p.y),
      outX: limit(p.outX ?? p.x),
      outY: limit(p.outY ?? p.y),
    }));
}
export function freeformPath(nodes, closed = false) {
  if (!nodes.length) return "";
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length + (closed ? 1 : 0); i++) {
    const a = nodes[(i - 1) % nodes.length],
      b = nodes[i % nodes.length];
    d += ` C ${a.outX} ${a.outY} ${b.inX} ${b.inY} ${b.x} ${b.y}`;
  }
  return d + (closed ? " Z" : "");
}
function extrema(a, b, c, d) {
  const A = -a + 3 * b - 3 * c + d,
    B = 2 * (a - 2 * b + c),
    C = b - a;
  const roots =
    Math.abs(A) < 1e-10
      ? Math.abs(B) < 1e-10
        ? []
        : [-C / B]
      : B * B - 4 * A * C < 0
        ? []
        : [
            (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A),
            (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A),
          ];
  return [
    a,
    d,
    ...roots
      .filter((t) => t > 0 && t < 1)
      .map(
        (t) =>
          (1 - t) ** 3 * a +
          3 * (1 - t) ** 2 * t * b +
          3 * (1 - t) * t * t * c +
          t ** 3 * d,
      ),
  ];
}
export function freeformBounds(nodes, closed = false) {
  const xs = [],
    ys = [];
  for (let i = 0; i < nodes.length - (closed ? 0 : 1); i++) {
    const a = nodes[i],
      b = nodes[(i + 1) % nodes.length];
    xs.push(...extrema(a.x, a.outX, b.inX, b.x));
    ys.push(...extrema(a.y, a.outY, b.inY, b.y));
  }
  if (!xs.length) {
    xs.push(nodes[0]?.x || 0);
    ys.push(nodes[0]?.y || 0);
  }
  const x = Math.min(...xs),
    y = Math.min(...ys);
  return {
    x,
    y,
    w: Math.max(4, Math.max(...xs) - x),
    h: Math.max(4, Math.max(...ys) - y),
  };
}
export function mapNodes(nodes, fn) {
  return nodes.map((p) => {
    const a = fn(p.x, p.y),
      i = fn(p.inX, p.inY),
      o = fn(p.outX, p.outY);
    return { x: a.x, y: a.y, inX: i.x, inY: i.y, outX: o.x, outY: o.y };
  });
}
export function frameFreeform(nodes, closed = false) {
  const p = freeformBounds(nodes, closed);
  return {
    position: { ...p, size: 32, rotation: 0 },
    nodes: mapNodes(nodes, (x, y) => ({
      x: ((x - p.x) / p.w) * 100,
      y: ((y - p.y) / p.h) * 100,
    })),
  };
}
function shear(p) {
  return {
    x: Math.tan((Math.max(-75, Math.min(75, p.skewX || 0)) * Math.PI) / 180),
    y: Math.tan((Math.max(-75, Math.min(75, p.skewY || 0)) * Math.PI) / 180),
  };
}
function transformVector(x, y, p) {
  const a = ((p.rotation || 0) * Math.PI) / 180,
    k = shear(p),
    rx = x * Math.cos(a) - y * Math.sin(a),
    ry = x * Math.sin(a) + y * Math.cos(a);
  return { x: rx + k.x * ry, y: k.y * rx + ry };
}
export function worldNodes(nodes, p) {
  return mapNodes(nodes, (x, y) => {
    const v = transformVector((x / 100 - 0.5) * p.w, (y / 100 - 0.5) * p.h, p);
    return { x: p.x + p.w / 2 + v.x, y: p.y + p.h / 2 + v.y };
  });
}
export function localPoint(point, p) {
  const k = shear(p),
    det = 1 - k.x * k.y;
  if (Math.abs(det) < 1e-6) return null;
  const dx = point.x - p.x - p.w / 2,
    dy = point.y - p.y - p.h / 2,
    x = (dx - k.x * dy) / det,
    y = (dy - k.y * dx) / det,
    a = (-(p.rotation || 0) * Math.PI) / 180;
  return {
    x: ((x * Math.cos(a) - y * Math.sin(a)) / p.w + 0.5) * 100,
    y: ((x * Math.sin(a) + y * Math.cos(a)) / p.h + 0.5) * 100,
  };
}
export function reframeFreeform(nodes, closed, p) {
  const b = freeformBounds(nodes, closed),
    offset = transformVector(
      p.w * ((b.x + b.w / 2) / 100 - 0.5),
      p.h * ((b.y + b.h / 2) / 100 - 0.5),
      p,
    ),
    w = (p.w * b.w) / 100,
    h = (p.h * b.h) / 100;
  return {
    nodes: mapNodes(nodes, (x, y) => ({
      x: ((x - b.x) / b.w) * 100,
      y: ((y - b.y) / b.h) * 100,
    })),
    position: {
      ...p,
      w,
      h,
      x: p.x + p.w / 2 + offset.x - w / 2,
      y: p.y + p.h / 2 + offset.y - h / 2,
    },
  };
}
export function splitFreeform(nodes, index, closed) {
  if (nodes.length >= 128 || (!closed && index >= nodes.length - 1))
    return nodes;
  const out = JSON.parse(JSON.stringify(nodes)),
    a = out[index],
    b = out[(index + 1) % out.length],
    mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }),
    p = { x: a.outX, y: a.outY },
    q = { x: b.inX, y: b.inY },
    u = mid(a, p),
    v = mid(p, q),
    w = mid(q, b),
    l = mid(u, v),
    r = mid(v, w),
    m = mid(l, r);
  a.outX = u.x;
  a.outY = u.y;
  b.inX = w.x;
  b.inY = w.y;
  out.splice(index + 1, 0, { ...m, inX: l.x, inY: l.y, outX: r.x, outY: r.y });
  return out;
}
