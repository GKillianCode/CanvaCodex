import { selectionUnits } from "./selection.js";
const clamp = (v, max) => Math.max(0, Math.min(max, v));
export const canvasPoint = (p) => ({
  x: clamp(p.x, 1920),
  y: clamp(p.y, 1080),
});
export function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j],
      cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    if (
      Math.abs(cross) < 1e-7 &&
      p.x >= Math.min(a.x, b.x) - 1e-7 &&
      p.x <= Math.max(a.x, b.x) + 1e-7 &&
      p.y >= Math.min(a.y, b.y) - 1e-7 &&
      p.y <= Math.max(a.y, b.y) + 1e-7
    )
      return true;
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function crosses(a, b, c, d) {
  const side = (a, b, p) =>
    (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  return (
    side(a, b, c) * side(a, b, d) < -1e-8 &&
    side(c, d, a) * side(c, d, b) < -1e-8
  );
}
export function selectRegion(
  bounds,
  groups,
  region,
  base = [],
  mode = "replace",
) {
  const { type, points } = region;
  if (points.length < 2) return base.slice();
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    x = Math.min(...xs),
    y = Math.min(...ys),
    w = Math.max(...xs) - x,
    h = Math.max(...ys) - y;
  const contained = (b) => {
    if (b.x < 0 || b.y < 0 || b.x + b.w > 1920 || b.y + b.h > 1080)
      return false;
    const corners = [
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
    ];
    if (type === "rect")
      return corners.every(
        (p) => p.x >= x && p.y >= y && p.x <= x + w && p.y <= y + h,
      );
    if (type === "ellipse")
      return (
        w > 0 &&
        h > 0 &&
        corners.every(
          (p) =>
            ((p.x - x - w / 2) / (w / 2)) ** 2 +
              ((p.y - y - h / 2) / (h / 2)) ** 2 <=
            1 + 1e-8,
        )
      );
    return (
      points.length >= 3 &&
      corners.every((p) => pointInPolygon(p, points)) &&
      !corners.some((p, i) =>
        points.some((q, j) =>
          crosses(p, corners[(i + 1) % 4], q, points[(j + 1) % points.length]),
        ),
      )
    );
  };
  const found = selectionUnits(groups, Object.keys(bounds), bounds)
      .filter((u) => contained(u.bounds))
      .flatMap((u) => u.keys),
    all = Object.keys(bounds);
  return all.filter((k) =>
    mode === "add"
      ? base.includes(k) || found.includes(k)
      : mode === "subtract"
        ? base.includes(k) && !found.includes(k)
        : mode === "intersect"
          ? base.includes(k) && found.includes(k)
          : found.includes(k),
  );
}
