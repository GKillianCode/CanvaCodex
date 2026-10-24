import { rotatePoint } from "./editor.js";
// Work only on the occupied rectangle, not its enclosing square. All coordinates
// remain in the shared design space; the renderer still caps its pixel surfaces.
export function effectWorkingBounds(
  position,
  effects,
  paths = [],
  trailPositions = [],
) {
  const p = { ...position, h: position.h || 1 },
    points = [];
  for (const q of [p, ...trailPositions])
    for (const pt of [
      { x: q.x, y: q.y },
      { x: q.x + q.w, y: q.y },
      { x: q.x + q.w, y: q.y + (q.h || 1) },
      { x: q.x, y: q.y + (q.h || 1) },
    ])
      points.push(rotatePoint(pt, { ...q, h: q.h || 1 }));
  for (const e of effects.filter((e) => e.kind === "pathDeform")) {
    const path = paths.find((p) => p.id === e.pathId);
    if (path) points.push(...path.points);
  }
  const pad = Math.min(
    1800,
    Math.max(
      32,
      ...effects.map((e) => {
        const fragments = [
            "shatter",
            "scatter",
            "collapse",
            "rebuild",
          ].includes(e.kind),
          physical = fragments
            ? ((Math.abs(e.gravity) + Math.abs(e.wind)) *
                Math.min(e.duration, 3) ** 2) /
              2
            : 0;
        const pivot =
          e.kind === "sway"
            ? Math.hypot(p.w, p.h) *
              Math.abs(Math.sin((e.amount * Math.PI) / 180))
            : e.kind === "pulse"
              ? (Math.hypot(p.w, p.h) * Math.abs(e.amount)) / 100
              : 0;
        return Math.abs(e.amount) * 2 + physical + pivot;
      }),
    ),
  );
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y),
    left = Math.floor(Math.min(...xs) - pad),
    top = Math.floor(Math.min(...ys) - pad);
  return {
    x: left,
    y: top,
    w: Math.ceil(Math.max(...xs) + pad) - left,
    h: Math.ceil(Math.max(...ys) + pad) - top,
  };
}
