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
export function layoutNoteGraph(graph) {
  const nodes = graph.nodes.map((node, i) => {
    const angle = i * 2.39996323,
      r = 36 * Math.sqrt(i);
    return { ...node, x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  // Bounded relaxation with spatial buckets, avoiding all-pairs repulsion.
  for (let step = 0; step < 90; step++) {
    const buckets = new Map(),
      forces = new Map(
        nodes.map((node) => [
          node.id,
          { x: -node.x * 0.001, y: -node.y * 0.001 },
        ]),
      );
    for (const node of nodes) {
      const key = Math.floor(node.x / 160) + "," + Math.floor(node.y / 160);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(node);
    }
    for (const node of nodes) {
      const bx = Math.floor(node.x / 160),
        by = Math.floor(node.y / 160),
        f = forces.get(node.id);
      for (let x = bx - 1; x <= bx + 1; x++)
        for (let y = by - 1; y <= by + 1; y++)
          for (const other of buckets.get(x + "," + y) || []) {
            if (node === other) continue;
            let dx = node.x - other.x,
              dy = node.y - other.y,
              d = Math.max(1, Math.hypot(dx, dy));
            const strength = 1500 / (d * d);
            f.x += (dx / d) * strength;
            f.y += (dy / d) * strength;
          }
    }
    for (const edge of graph.edges) {
      const a = byId.get(edge.source),
        b = byId.get(edge.target),
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.max(1, Math.hypot(dx, dy)),
        f = (d - 140) * 0.018;
      forces.get(a.id).x += (dx / d) * f;
      forces.get(a.id).y += (dy / d) * f;
      forces.get(b.id).x -= (dx / d) * f;
      forces.get(b.id).y -= (dy / d) * f;
    }
    for (const node of nodes) {
      const f = forces.get(node.id);
      node.x += Math.max(-12, Math.min(12, f.x));
      node.y += Math.max(-12, Math.min(12, f.y));
    }
  }
  return nodes;
}
