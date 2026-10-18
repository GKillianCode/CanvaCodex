// A path contains 3n+1 cubic control points. The four-point format stays valid.
export function splineSegments(points, closed = false) {
  const result = [];
  for (let i = 0; i + 3 < points.length; i += 3)
    result.push(points.slice(i, i + 4));
  if (
    closed &&
    points.length >= 4 &&
    (points[0].x !== points.at(-1).x || points[0].y !== points.at(-1).y)
  ) {
    const first = points[0],
      last = points.at(-1);
    result.push([
      last,
      { x: 2 * last.x - points.at(-2).x, y: 2 * last.y - points.at(-2).y },
      { x: 2 * first.x - points[1].x, y: 2 * first.y - points[1].y },
      first,
    ]);
  }
  return result;
}
function cubic([a, b, c, d], t) {
  const u = 1 - t;
  return {
    x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y,
  };
}
function section(points, t, closed) {
  const segments = splineSegments(points, closed),
    v = Math.max(0, Math.min(1, t)) * segments.length,
    index = Math.min(segments.length - 1, Math.floor(v));
  return { points: segments[index], t: v - index };
}
export function splinePoint(points, t, closed = false) {
  const s = section(points, t, closed);
  return s.points ? cubic(s.points, s.t) : { x: 0, y: 0 };
}
export function splineAngle(points, t, closed = false) {
  const s = section(points, t, closed);
  if (!s.points) return 0;
  const [a, b, c, d] = s.points,
    u = 1 - s.t,
    v = s.t;
  return (
    (Math.atan2(
      3 * u * u * (b.y - a.y) +
        6 * u * v * (c.y - b.y) +
        3 * v * v * (d.y - c.y),
      3 * u * u * (b.x - a.x) +
        6 * u * v * (c.x - b.x) +
        3 * v * v * (d.x - c.x),
    ) *
      180) /
    Math.PI
  );
}
export function splineParameter(points, progress, closed = false) {
  const target = Math.max(0, Math.min(1, progress)),
    count = Math.min(
      2048,
      Math.max(96, splineSegments(points, closed).length * 32),
    ),
    distances = [0];
  let last = points[0],
    total = 0;
  for (let i = 1; i <= count; i++) {
    const p = splinePoint(points, i / count, closed);
    total += Math.hypot(p.x - last.x, p.y - last.y);
    distances.push(total);
    last = p;
  }
  if (!total) return target;
  for (let i = 1; i <= count; i++)
    if (distances[i] >= target * total)
      return (
        (i -
          1 +
          (target * total - distances[i - 1]) /
            (distances[i] - distances[i - 1] || 1)) /
        count
      );
  return 1;
}
export function splinePathData(path) {
  const segments = splineSegments(path.points, path.closed);
  if (!segments.length) return "";
  return (
    "M " +
    segments[0][0].x +
    " " +
    segments[0][0].y +
    segments
      .map(
        ([, b, c, d]) =>
          " C " +
          b.x +
          " " +
          b.y +
          " " +
          c.x +
          " " +
          c.y +
          " " +
          d.x +
          " " +
          d.y,
      )
      .join("") +
    (path.closed ? " Z" : "")
  );
}
export function splitSpline(path, index = 0, t = 0.5) {
  if (path.points.length >= 97) return false;
  let segments = splineSegments(path.points, path.closed);
  index = Math.max(0, Math.min(segments.length - 1, index));
  const seg = segments[index];
  if (!seg) return false;
  t = Math.max(0.01, Math.min(0.99, t));
  const lerp = (a, b) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    }),
    [a, b, c, d] = seg,
    e = lerp(a, b),
    f = lerp(b, c),
    g = lerp(c, d),
    h = lerp(e, f),
    i = lerp(f, g),
    j = lerp(h, i);
  if (index * 3 >= path.points.length - 1) {
    if (path.points.length + 6 > 97) return false;
    path.points.push(e, h, j, i, g, { ...d });
  } else path.points.splice(index * 3, 4, a, e, h, j, i, g, d);
  return index * 3 + 3;
}
export function removeSplinePoint(path, index) {
  if (path.points.length <= 4) return false;
  index = Math.round(index / 3) * 3;
  if (index <= 0) path.points.splice(0, 3);
  else if (index >= path.points.length - 1) path.points.splice(-3);
  else path.points.splice(index - 1, 3);
  return true;
}
export function moveSplinePoint(path, index, x, y) {
  const p = path.points[index];
  if (!p) return;
  const dx = x - p.x,
    dy = y - p.y,
    joined =
      path.closed &&
      path.points[0].x === path.points.at(-1).x &&
      path.points[0].y === path.points.at(-1).y;
  p.x = x;
  p.y = y;
  if (joined && (index === 0 || index === path.points.length - 1)) {
    const other = index === 0 ? path.points.length - 1 : 0;
    path.points[other].x = x;
    path.points[other].y = y;
    const handle = other === 0 ? 1 : other - 1;
    path.points[handle].x += dx;
    path.points[handle].y += dy;
  }
  if (index % 3 === 0)
    for (const n of [index - 1, index + 1])
      if (path.points[n]) {
        path.points[n].x += dx;
        path.points[n].y += dy;
      }
}
