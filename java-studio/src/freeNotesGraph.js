// The graph uses metadata only: opening it never loads note bodies or images.
export function noteGraph(tree, includeParents = false) {
  const nodes = tree
    .filter((row) => row.kind === "note")
    .map((row) => ({
      id: row.id,
      title: row.title || "Sans titre",
      degree: 0,
    }));
  const byId = new Map(nodes.map((node) => [node.id, node])),
    edges = [],
    seen = new Set();
  const add = (source, target, kind) => {
    if (source === target || !byId.has(source) || !byId.has(target)) return;
    const key = kind + ":" + JSON.stringify([source, target].sort());
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target, kind, key });
    byId.get(source).degree++;
    byId.get(target).degree++;
  };
  for (const row of tree) {
    for (const target of row.links || []) add(row.id, target, "link");
    if (includeParents && row.parent) add(row.parent, row.id, "parent");
  }
  return { nodes, edges };
}
// Arrange connected components independently. Label-sized cells prevent overlap,
// then shelf packing keeps disconnected groups apart rather than piling at the center.
export function layoutNoteGraph(graph) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map(graph.nodes.map((node) => [node.id, new Set()]));
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  const visited = new Set(),
    components = [];
  const roots = [...graph.nodes].sort(
    (a, b) => b.degree - a.degree || a.id.localeCompare(b.id),
  );
  for (const root of roots) {
    if (visited.has(root.id)) continue;
    const queue = [{ id: root.id, depth: 0 }],
      layers = [];
    visited.add(root.id);
    for (let i = 0; i < queue.length; i++) {
      const { id, depth } = queue[i];
      (layers[depth] ||= []).push(byId.get(id));
      for (const neighbor of adjacency.get(id))
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, depth: depth + 1 });
        }
    }
    const ordered = layers.flat();
    const cols = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
    const rows = Math.ceil(ordered.length / cols);
    components.push({
      width: cols * 240,
      height: rows * 100 + 60,
      ordered,
      cols,
      rows,
    });
  }
  const targetWidth = Math.max(
    720,
    Math.sqrt(components.reduce((sum, c) => sum + c.width * c.height, 0)) * 1.4,
  );
  let x = 0,
    y = 0,
    shelfHeight = 0;
  const result = [];
  for (const component of components) {
    if (x && x + component.width > targetWidth) {
      x = 0;
      y += shelfHeight + 100;
      shelfHeight = 0;
    }
    component.ordered.forEach((node, index) => {
      const row = Math.floor(index / component.cols),
        col = index % component.cols;
      result.push({
        ...node,
        x: x + (row % 2 ? component.cols - 1 - col : col) * 240 + 120,
        y: y + row * 100 + 30,
      });
    });
    x += component.width + 100;
    shelfHeight = Math.max(shelfHeight, component.height);
  }
  return result;
}
export function graphNoteLabel(title, zoom = 1) {
  const chars = Array.from(title),
    screenSize = Math.max(10, (chars.length > 22 ? 10 : 12) * zoom);
  const capacity = Math.max(
    4,
    Math.min(28, Math.floor((200 * zoom) / (screenSize * 0.7))),
  );
  return {
    text:
      chars.length > capacity
        ? chars.slice(0, capacity - 1).join("") + "…"
        : title,
    size: screenSize / zoom,
  };
}

export function noteGraphLevel(tree, focus = "") {
  const notes = tree.filter((row) => row.kind === "note"),
    ids = new Set(notes.map((row) => row.id));
  if (focus && !ids.has(focus)) focus = "";
  return notes.filter((row) =>
    focus
      ? row.id === focus || row.parent === focus
      : !row.parent || !ids.has(row.parent),
  );
}

// A relaxed constellation: label-sized collision cells keep the organic layout readable.
export function layoutFocusedNotes(graph, focus = "") {
  const ordered = [...graph.nodes].sort(
    (a, b) =>
      (b.id === focus) - (a.id === focus) ||
      b.degree - a.degree ||
      a.id.localeCompare(b.id),
  );
  const result = [],
    buckets = new Map();
  const near = (x, y) => {
    const bx = Math.floor(x / 240),
      by = Math.floor(y / 100);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const node of buckets.get(bx + dx + "," + (by + dy)) || [])
          if (Math.abs(node.x - x) < 235 && Math.abs(node.y - y) < 94)
            return true;
    return false;
  };
  ordered.forEach((node, index) => {
    let angle = index * 2.39996323,
      radius =
        node.id === focus ? 0 : (focus ? 150 : 0) + 65 * Math.sqrt(index);
    let x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius * 0.75;
    while (near(x, y)) {
      angle += 0.17;
      radius += 18;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius * 0.75;
    }
    const placed = { ...node, x, y };
    result.push(placed);
    const key = Math.floor(x / 240) + "," + Math.floor(y / 100);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(placed);
  });
  return result;
}

// Only one additional generation is previewed, never the whole descendant tree.
export function previewNoteLevel(tree, primary, positions = new Map()) {
  const ids = new Set(primary.map((node) => node.id)),
    byParent = new Map();
  for (const row of tree)
    if (row.kind === "note" && !ids.has(row.id) && ids.has(row.parent)) {
      if (!byParent.has(row.parent)) byParent.set(row.parent, []);
      byParent.get(row.parent).push(row);
    }
  const points = [],
    occupied = [...primary];
  for (const parent of primary) {
    const children = byParent.get(parent.id) || [],
      outward = Math.atan2(parent.y, parent.x);
    children.forEach((row, index) => {
      const angle = outward + (index - (children.length - 1) / 2) * 0.55;
      const saved = positions.get(row.id);
      let radius = 180 + Math.floor(index / 7) * 30,
        x = parent.x + Math.cos(angle) * radius,
        y = parent.y + Math.sin(angle) * radius;
      while (
        !saved &&
        occupied.some(
          (other) => Math.abs(other.x - x) < 235 && Math.abs(other.y - y) < 94,
        )
      ) {
        radius += 24;
        x = parent.x + Math.cos(angle) * radius;
        y = parent.y + Math.sin(angle) * radius;
      }
      const point = {
        id: row.id,
        title: row.title,
        parent: parent.id,
        x: saved?.x ?? x,
        y: saved?.y ?? y,
      };
      points.push(point);
      occupied.push(point);
    });
  }
  return points;
}

export function centerNoteCamera(camera, point, width, height) {
  return {
    ...camera,
    x: width / 2 - point.x * camera.z,
    y: height / 2 - point.y * camera.z,
  };
}

export function initialNoteGraphLevel(tree) {
  const roots = noteGraphLevel(tree);
  return roots.length === 1 ? roots[0].id : "";
}
