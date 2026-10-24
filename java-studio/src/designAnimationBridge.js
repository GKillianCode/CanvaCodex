import { makeSlide, normalizeSlides } from "./model.js";
import { normalizeShape } from "./shapes.js";
import { normalizeAnimation } from "./animationModel.js";
import { normalizeDesign, designPageSize } from "./designModel.js";
import { normalizeTable } from "./tables.js";
import { applicationFile } from "./applicationDocuments.js";
export function designAnimationScene(raw, pageIndex = 0) {
  const doc = normalizeDesign(raw, "vector"),
    page = doc.pages[pageIndex];
  if (!page) throw Error("Plan de travail introuvable.");
  if (page.elements.length > 100)
    throw Error("Ce plan dépasse la limite de 100 objets par scène.");
  const size = designPageSize(doc, pageIndex),
    scale = Math.min(1920 / size.width, 1080 / size.height),
    ox = (1920 - size.width * scale) / 2,
    oy = (1080 - size.height * scale) / 2;
  const scene = makeSlide("title");
  Object.assign(scene, {
    title: page.name || doc.name,
    label: "",
    body: "",
    code: "",
    blockKeys: [],
    elements: {},
    positions: {},
    fragments: {},
    groups: [],
    hiddenKeys: [],
    animation: normalizeAnimation(),
  });
  const groups = new Map(),
    keyMap = new Map(
      page.elements.map((e) => [
        e.id,
        (e.type === "text" && e.code ? "code" : e.type) + e.id,
      ]),
    );
  for (const e of page.elements) {
    const key = keyMap.get(e.id),
      p = {
        x: ox + e.x * scale,
        y: oy + e.y * scale,
        w: e.w * scale,
        h: e.h * scale,
        size: e.size * scale,
        font: e.font,
        rotation: e.rotation,
        opacity: e.opacity,
        locked: e.locked,
        textStyle: {
          weight: e.weight,
          color: e.fill,
          align: e.align,
          verticalAlign: "top",
          lineHeight: e.leading,
          letterSpacing: e.letterSpacing,
        },
      },
      element = { name: e.name, custom: true };
    if (e.type === "shape")
      Object.assign(
        element,
        normalizeShape({
          ...e,
          pathNodes: e.nodes,
          strokeWidth: e.strokeWidth * scale,
        }),
        { type: "shape" },
      );
    else if (e.type === "image")
      Object.assign(element, {
        type: "image",
        src: e.src,
        fit: e.fit,
        background: false,
      });
    else if (e.type === "table")
      Object.assign(
        element,
        normalizeTable({
          rows: e.rows,
          columns: e.columns,
          cells: e.text.split("\n").map((r) => r.split("\t")),
          fill: e.fill,
          fillRole: null,
          headerFill: e.fill,
          headerFillRole: null,
          headerText: e.cellColor,
          headerTextRole: null,
          textColor: e.cellColor,
          textColorRole: null,
          font: e.font,
          fontSize: e.size * scale,
          headerFontSize: e.size * scale,
          headerPosition: "none",
          padding: 8 * scale,
          striped: false,
          bodyFilled: e.filled,
          border: e.stroke,
          borderRole: null,
          borderWidth: e.strokeWidth * scale,
          borderMode: e.outlined ? "all" : "none",
        }),
        { type: "table" },
      );
    else
      Object.assign(element, {
        type: e.code ? "code" : "text",
        text: e.text,
        caption: e.code ? e.language : "",
        weight: e.weight,
      });
    scene.blockKeys.push(key);
    scene.elements[key] = element;
    scene.positions[key] = p;
    scene.fragments[key] = { order: 0 };
    if (e.hidden) scene.hiddenKeys.push(key);
    if (e.group) {
      if (!groups.has(e.group)) groups.set(e.group, []);
      groups.get(e.group).push(key);
    }
    for (const target of e.cutouts || [])
      scene.animation.effects.push({
        id: crypto.randomUUID(),
        kind: e.booleanMode === "intersect" ? "intersect" : "subtract",
        key,
        target: keyMap.get(target),
      });
  }
  scene.groups = [...groups]
    .filter(([, keys]) => keys.length > 1)
    .map(([id, keys]) => ({ id, keys }));
  scene.animation = normalizeAnimation(scene.animation);
  return normalizeSlides([scene])[0];
}
export function designAnimationFile(doc, pageIndex = 0) {
  return applicationFile(
    {
      project: doc.name + " · Animation",
      themeId: doc.themeId,
      slides: [designAnimationScene(doc, pageIndex)],
      frame: { header: false, footer: false },
      resolution: { width: 1920, height: 1080 },
    },
    "animation",
  );
}
