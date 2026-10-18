const clone = (v) => JSON.parse(JSON.stringify(v));
export function componentStates(c) {
  return c.states?.length
    ? c.states
    : [{ id: "default", name: "Défaut", items: c.items }];
}
export function componentState(c, id) {
  const states = componentStates(c);
  return (
    states.find((s) => s.id === id) ||
    states.find((s) => s.id === c.defaultState) ||
    states[0]
  );
}
export function componentStamp(state) {
  const text = JSON.stringify(state.items);
  let a = 2166136261,
    b = 2246822519;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b ^ text.charCodeAt(i), 3266489917);
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
export function itemBounds(items) {
  const ps = items.map((i) => i.position);
  if (!ps.length) return { x: 0, y: 0, w: 1, h: 1 };
  const x = Math.min(...ps.map((p) => p.x || 0)),
    y = Math.min(...ps.map((p) => p.y || 0));
  return {
    x,
    y,
    w: Math.max(1, Math.max(...ps.map((p) => (p.x || 0) + (p.w || 1))) - x),
    h: Math.max(1, Math.max(...ps.map((p) => (p.y || 0) + (p.h || 1))) - y),
  };
}
export function normalizeInstances(raw, keys) {
  const used = new Set();
  return (Array.isArray(raw) ? raw : []).slice(0, 100).flatMap((v) => {
    if (!v || typeof v.componentId !== "string" || typeof v.id !== "string")
      return [];
    if (
      !Number.isFinite(v.sourceBounds?.w) ||
      !Number.isFinite(v.sourceBounds?.h) ||
      v.sourceBounds.w <= 0 ||
      v.sourceBounds.h <= 0
    )
      return [];
    const itemKeys = Object.fromEntries(
      Object.entries(v.itemKeys || {}).filter(
        ([id, key]) =>
          typeof key === "string" &&
          id.length < 200 &&
          !["__proto__", "constructor", "prototype"].includes(id) &&
          keys.includes(key) &&
          !used.has(key),
      ),
    );
    if (!Object.keys(itemKeys).length) return [];
    Object.values(itemKeys).forEach((k) => used.add(k));
    const bounds = v.sourceBounds || {};
    return [
      {
        id: v.id.slice(0, 100),
        componentId: v.componentId.slice(0, 200),
        stateId: String(v.stateId || "default").slice(0, 100),
        stamp: String(v.stamp || "").slice(0, 100),
        itemKeys,
        sourceBounds: Object.fromEntries(
          ["x", "y", "w", "h"].map((k) => [
            k,
            Number.isFinite(bounds[k])
              ? bounds[k]
              : k === "w" || k === "h"
                ? 1
                : 0,
          ]),
        ),
      },
    ];
  });
}
export function applyLinkedComponents(scene, library, forceId) {
  let changed = false;
  scene.componentInstances = (scene.componentInstances || []).filter(
    (instance) =>
      Object.values(instance.itemKeys).some((key) => scene.positions[key]),
  );
  for (const instance of scene.componentInstances || []) {
    const component = library.find((c) => c.id === instance.componentId);
    if (!component) continue;
    const state = componentState(component, instance.stateId),
      stamp = componentStamp(state);
    if (instance.stamp === stamp && forceId !== instance.id) continue;
    const oldKeys = Object.values(instance.itemKeys).filter(
        (k) => scene.positions[k],
      ),
      current = itemBounds(
        oldKeys.map((k) => ({ position: scene.positions[k] })),
      ),
      base = instance.sourceBounds,
      sx = current.w / Math.max(1, base.w),
      sy = current.h / Math.max(1, base.h),
      source = itemBounds(state.items),
      old = new Set(oldKeys);
    if (
      Object.keys(scene.elements).length - old.size + state.items.length >
      100
    )
      continue;
    const itemKeys = {};
    for (const [i, item] of state.items.entries()) {
      const id = item.id || "item" + i,
        key =
          instance.itemKeys[id] ||
          "textComponent" + crypto.randomUUID().replaceAll("-", "");
      itemKeys[id] = key;
      const p = item.position;
      scene.elements[key] = clone(item.element);
      scene.positions[key] = {
        ...clone(p),
        x: current.x + (p.x - source.x) * sx,
        y: current.y + (p.y - source.y) * sy,
        w: p.w * sx,
        h: (p.h || 1) * sy,
        ...(p.size ? { size: p.size * Math.sqrt(sx * sy) } : {}),
      };
      scene.fragments[key] = clone(
        item.fragment || { order: 0, animation: "none" },
      );
      if (!scene.blockKeys.includes(key)) scene.blockKeys.push(key);
      old.delete(key);
    }
    for (const key of old) {
      delete scene.elements[key];
      delete scene.positions[key];
      delete scene.fragments[key];
      scene.blockKeys = scene.blockKeys.filter((k) => k !== key);
    }
    const keys = Object.values(itemKeys);
    const group = scene.groups?.find((g) =>
      g.keys.some((k) => oldKeys.includes(k)),
    );
    if (group) group.keys = keys;
    else if (keys.length > 1)
      (scene.groups ||= []).push({ id: instance.id, keys });
    instance.itemKeys = itemKeys;
    instance.stateId = state.id;
    instance.sourceBounds = source;
    instance.stamp = stamp;
    changed = true;
  }
  return changed;
}
export function detachInstance(scene, id) {
  scene.componentInstances = (scene.componentInstances || []).filter(
    (v) => v.id !== id,
  );
}
