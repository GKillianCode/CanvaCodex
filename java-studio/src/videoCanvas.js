export const CANVAS_LIMIT = 1000000;
export const CANVAS_WIDTH = 12000;
export const CANVAS_HEIGHT = 8000;
const coordinate = (value) =>
  Math.max(
    -CANVAS_LIMIT,
    Math.min(CANVAS_LIMIT, Number.isFinite(Number(value)) ? Number(value) : 0),
  );
export function normalizeVideoCanvas(raw = {}) {
  const nodes = [],
    ids = new Set();
  for (const row of (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 500)) {
    if (
      !row ||
      typeof row.id !== "string" ||
      !row.id ||
      ids.has(row.id.slice(0, 200))
    )
      continue;
    const type =
      row.type === "video" && typeof row.videoId === "string"
        ? "video"
        : row.type === "project" ? "project" : "note";
    ids.add(row.id.slice(0, 200));
    nodes.push({
      id: row.id.slice(0, 200),
      type,
      videoId: type === "video" ? row.videoId.slice(0, 200) : "",
      title: String(
        row.title || (type === "project" ? "Projet fil rouge" : type === "note" ? "Étape du parcours" : "Vidéo"),
      ).slice(0, 200),
      text: String(row.text || "").slice(0, 4000),
      x: coordinate(row.x),
      y: coordinate(row.y),
    });
  }
  const edges = [],
    pairs = new Set();
  for (const row of (Array.isArray(raw.edges) ? raw.edges : []).slice(
    0,
    2000,
  )) {
    if (!row || !ids.has(row.from) || !ids.has(row.to) || row.from === row.to)
      continue;
    const key = JSON.stringify([row.from, row.to]);
    if (pairs.has(key)) continue;
    pairs.add(key);
    edges.push({ from: row.from, to: row.to });
  }
  const groups = [],
    grouped = new Set();
  for (const row of (Array.isArray(raw.groups) ? raw.groups : []).slice(
    0,
    500,
  )) {
    if (
      !row ||
      typeof row.id !== "string" ||
      groups.some((g) => g.id === row.id)
    )
      continue;
    const members = [
      ...new Set(Array.isArray(row.members) ? row.members : []),
    ].filter((id) => ids.has(id) && !grouped.has(id));
    if (!members.length && !row.bounds) continue;
    members.forEach((id) => grouped.add(id));
    groups.push({
      id: row.id,
      title: String(row.title || "Groupe").slice(0, 200),
      members,
      ...(row.bounds &&
      Number.isFinite(Number(row.bounds.width)) &&
      Number.isFinite(Number(row.bounds.height))
        ? {
            bounds: {
              x: coordinate(row.bounds.x),
              y: coordinate(row.bounds.y),
              width: Math.max(
                328,
                Math.min(CANVAS_LIMIT, Number(row.bounds.width)),
              ),
              height: Math.max(
                320,
                Math.min(CANVAS_LIMIT, Number(row.bounds.height)),
              ),
            },
          }
        : {}),
    });
  }
  return { version: 1, nodes, edges, groups, snap: raw.snap !== false };
}
export function connectVideoCanvas(canvas, from, to) {
  if (
    from === to ||
    !canvas.nodes.some((n) => n.id === from) ||
    !canvas.nodes.some((n) => n.id === to)
  )
    throw Error("Choisis deux cartes différentes.");
  if (canvas.edges.some((e) => e.from === from && e.to === to)) return canvas;
  if (canvas.edges.length >= 2000)
    throw Error("Limite de 2 000 liens atteinte.");
  return { ...canvas, edges: [...canvas.edges, { from, to }] };
}
export function removeCanvasNode(canvas, id) {
  return {
    ...canvas,
    nodes: canvas.nodes.filter((n) => n.id !== id),
    edges: canvas.edges.filter((e) => e.from !== id && e.to !== id),
    groups: (canvas.groups || [])
      .map((g) => ({
        ...g,
        members: g.members.filter((member) => member !== id),
      }))
      .filter((g) => g.members.length),
  };
}
export function canvasEdgePath(from, to) {
  const x1 = from.x + 280,
    y1 = from.y + 120,
    x2 = to.x,
    y2 = to.y + 120;
  const bend = Math.max(80, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}
export function freeCanvasPosition(nodes, x, y) {
  for (let i = 0; i < 1500; i++) {
    const candidate = {
      x: Math.min(CANVAS_LIMIT, x + (i % 3) * 340),
      y: Math.min(CANVAS_LIMIT, y + Math.floor(i / 3) * 280),
    };
    if (
      !nodes.some(
        (n) =>
          Math.abs(n.x - candidate.x) < 300 &&
          Math.abs(n.y - candidate.y) < 260,
      )
    )
      return candidate;
  }
  return { x: 0, y: 0 };
}

export function snapCanvasPosition(value, maximum = CANVAS_LIMIT, snap = true) {
  return Math.max(
    -maximum,
    Math.min(maximum, snap ? Math.round(value / 24) * 24 : value),
  );
}
export function groupCanvasNodes(canvas, members, id) {
  const valid = [...new Set(members)].filter((member) =>
    canvas.nodes.some((n) => n.id === member),
  );
  if (valid.length < 2)
    throw Error("Sélectionne au moins deux cartes avec Maj + clic.");
  return {
    ...canvas,
    groups: [
      ...(canvas.groups || [])
        .map((g) => ({
          ...g,
          members: g.members.filter((member) => !valid.includes(member)),
        }))
        .filter((g) => g.members.length),
      { id, title: "Nouveau groupe", members: valid },
    ],
  };
}
export function canvasGroupBounds(canvas, group) {
  if (group.bounds) return { ...group.bounds };
  const nodes = canvas.nodes.filter((n) => group.members.includes(n.id));
  if (!nodes.length) return null;
  const x = Math.min(...nodes.map((n) => n.x)) - 24,
    y = Math.min(...nodes.map((n) => n.y)) - 56;
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.x)) + 304 - x,
    height: Math.max(...nodes.map((n) => n.y)) + 264 - y,
  };
}

export function canvasWorldBounds(
  nodes,
  extent = { x: -6000, y: -4000, right: 6000, bottom: 4000 },
) {
  const x =
    Math.floor(Math.min(extent.x, ...nodes.map((n) => n.x - 2000)) / 24) * 24;
  const y =
    Math.floor(Math.min(extent.y, ...nodes.map((n) => n.y - 2000)) / 24) * 24;
  const right =
    Math.ceil(
      Math.max(extent.right, ...nodes.map((n) => n.x + 280 + 2000)) / 24,
    ) * 24;
  const bottom =
    Math.ceil(
      Math.max(extent.bottom, ...nodes.map((n) => n.y + 240 + 2000)) / 24,
    ) * 24;
  return { x, y, width: right - x, height: bottom - y };
}
export function nodesInCanvasRect(nodes, rect) {
  const x = Math.min(rect.x1, rect.x2),
    y = Math.min(rect.y1, rect.y2),
    right = Math.max(rect.x1, rect.x2),
    bottom = Math.max(rect.y1, rect.y2);
  return nodes
    .filter(
      (n) => n.x >= x && n.y >= y && n.x + 280 <= right && n.y + 240 <= bottom,
    )
    .map((n) => n.id);
}
export function panCanvasScroll(start, delta, zoom, origin) {
  return {
    left: (start.x - origin.x) * zoom + delta.x,
    top: (start.y - origin.y) * zoom + delta.y,
  };
}

export function assignCanvasGroups(canvas, ids) {
  const assignments = new Map();
  for (const node of canvas.nodes.filter((n) => ids.includes(n.id))) {
    const target = canvas.groups
      .filter((g) => {
        const b = canvasGroupBounds(canvas, g);
        return (
          b &&
          node.x >= b.x + 12 &&
          node.y >= b.y + 48 &&
          node.x + 280 <= b.x + b.width - 12 &&
          node.y + 240 <= b.y + b.height - 12
        );
      })
      .sort((a, b) => {
        const x = canvasGroupBounds(canvas, a),
          y = canvasGroupBounds(canvas, b);
        return x.width * x.height - y.width * y.height;
      })[0];
    assignments.set(node.id, target?.id);
  }
  return {
    ...canvas,
    groups: canvas.groups
      .map((g) => ({
        ...g,
        members: [
          ...g.members.filter((id) => !assignments.has(id)),
          ...ids.filter((id) => assignments.get(id) === g.id),
        ],
      }))
      .filter((g) => g.members.length || g.bounds),
  };
}

export function availableCanvasVideos(canvas, videos) {
  const present = new Set(
    canvas.nodes.filter((n) => n.type === "video").map((n) => n.videoId),
  );
  return videos.filter((v) => !v.archived && !present.has(v.id));
}
export function canvasDocument(canvas) {
  return {
    format: "frame-learning-canvas",
    version: 1,
    canvas: normalizeVideoCanvas(canvas),
  };
}
export function readCanvasDocument(raw) {
  if (
    raw?.format !== "frame-learning-canvas" ||
    raw.version !== 1 ||
    !Array.isArray(raw.canvas?.nodes)
  )
    throw Error("Ce fichier n’est pas un parcours Frame.");
  return normalizeVideoCanvas(raw.canvas);
}
