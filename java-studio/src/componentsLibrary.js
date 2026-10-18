import {
  componentState,
  componentStamp,
  itemBounds,
} from "./componentInstances.js";
import { MAX_ELEMENTS } from "./limits.js";
import { blockLabel, blockText, blockType, normalizeSlides } from "./model.js";
export function captureComponent(slide, keys, bounds, name) {
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 60),
    items: keys.map((key, i) => ({
      id: "item" + i,
      element: {
        ...(slide.elements[key] || {}),
        name: blockLabel(slide, key),
        type: blockType(slide, key),
        text: blockText(slide, key),
        custom: true,
        template: false,
        ...(key === "title" ? { weight: 700, label: slide.label } : {}),
        ...(key === "code" ? { caption: slide.codeTitle } : {}),
      },
      position: {
        ...slide.positions[key],
        x: slide.positions[key].x - bounds.x,
        y: slide.positions[key].y - bounds.y,
      },
      fragment: slide.fragments[key],
    })),
  };
}
function normalizeItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > MAX_ELEMENTS)
    return null;
  const keys = items.map((_, i) => "textItem" + i),
    s = normalizeSlides([
      {
        id: "component",
        layout: "title",
        title: "",
        body: "",
        code: "",
        blockKeys: keys,
        elements: Object.fromEntries(keys.map((k, i) => [k, items[i].element])),
        positions: Object.fromEntries(
          keys.map((k, i) => [k, items[i].position]),
        ),
        fragments: Object.fromEntries(
          keys.map((k, i) => [k, items[i].fragment]),
        ),
      },
    ])[0];
  const ids = new Set();
  return keys
    .filter((k) => s.elements[k])
    .map((k, i) => {
      let id =
        typeof items[i].id === "string" &&
        /^[\w-]{1,180}$/.test(items[i].id) &&
        !["__proto__", "constructor", "prototype"].includes(items[i].id)
          ? items[i].id
          : "item" + i;
      if (ids.has(id)) id += "-" + i;
      ids.add(id);
      return {
        id,
        element: s.elements[k],
        position: s.positions[k],
        fragment: s.fragments[k],
      };
    });
}
export function normalizeComponents(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, 100).flatMap((c) => {
    if (!c || typeof c.name !== "string" || !c.name.trim()) return [];
    try {
      const items = normalizeItems(c.items);
      if (!items?.length) return [];
      const seen = new Set(),
        states = (Array.isArray(c.states) ? c.states : [])
          .slice(0, 20)
          .flatMap((state, i) => {
            const id = String(state.id || "state" + i).slice(0, 100),
              items = normalizeItems(state.items);
            if (!items?.length || seen.has(id)) return [];
            seen.add(id);
            return [
              {
                id,
                name: String(state.name || "État " + (i + 1)).slice(0, 100),
                items,
              },
            ];
          });
      return [
        {
          id:
            typeof c.id === "string" &&
            /^[\w-]{1,200}$/.test(c.id) &&
            !["__proto__", "constructor", "prototype"].includes(c.id)
              ? c.id
              : crypto.randomUUID(),
          name: c.name.slice(0, 60),
          items,
          ...(states.length
            ? {
                states,
                defaultState: states.some((v) => v.id === c.defaultState)
                  ? c.defaultState
                  : states[0].id,
              }
            : {}),
        },
      ];
    } catch {
      return [];
    }
  });
}
export function insertComponent(slide, component, options = {}) {
  const state = componentState(component, options.stateId);
  component = { ...component, items: state.items };
  if (
    Object.keys(slide.elements).length + component.items.length >
    MAX_ELEMENTS
  )
    return [];
  const keys = [];
  for (const item of component.items) {
    const key = "textComponent" + crypto.randomUUID().replaceAll("-", "");
    keys.push(key);
    const copy = JSON.parse(JSON.stringify(item));
    slide.elements[key] = { ...copy.element, custom: true, template: false };
    slide.positions[key] = {
      ...copy.position,
      x: copy.position.x + 128,
      y: copy.position.y + 128,
    };
    slide.fragments[key] = copy.fragment || { order: 0, animation: "fade" };
  }
  if (options.linked !== false) {
    const instance = {
      id: crypto.randomUUID(),
      componentId: component.id,
      stateId: state.id,
      stamp: componentStamp(state),
      sourceBounds: itemBounds(state.items),
      itemKeys: Object.fromEntries(
        state.items.map((item, i) => [item.id || "item" + i, keys[i]]),
      ),
    };
    (slide.componentInstances ||= []).push(instance);
  }
  return keys;
}
