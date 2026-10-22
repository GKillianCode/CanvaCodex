import { fonts, normalizeFont } from "./fonts.js";
import { fontWeights } from "./textStyles.js";
import { normalizeShape, shapePath, shapes, cornerPixels } from "./shapes.js";
import { normalizePathNodes } from "./freeform.js";
import { validSvgSource } from "./svg.js";
export const designKinds = ["vector", "layout"];
export const designFormats = {
  vector: [
    ["Dessin paysage", 1024, 768],
    ["Carré", 1080, 1080],
    ["Icône", 256, 256],
    ["Full HD", 1920, 1080],
  ],
  layout: [
    ["A4 portrait", (210 * 96) / 25.4, (297 * 96) / 25.4],
    ["A4 paysage", (297 * 96) / 25.4, (210 * 96) / 25.4],
    ["A5 portrait", (148 * 96) / 25.4, (210 * 96) / 25.4],
    ["Lettre US", 816, 1056],
  ],
};
export const paragraphStyles = {
  title: { size: 40, weight: 700, leading: 1.15, font: "inter" },
  heading: { size: 26, weight: 700, leading: 1.25, font: "inter" },
  body: { size: 17, weight: 400, leading: 1.55, font: "inter" },
  caption: { size: 12, weight: 400, leading: 1.4, font: "inter" },
  code: { size: 15, weight: 400, leading: 1.5, font: "monospace" },
};
const number = (v, f, min, max) =>
  Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : f;
const color = (v, f) => (/^#[\da-f]{6}$/i.test(v || "") ? v : f);
export const copyDesign = (value) => JSON.parse(JSON.stringify(value));
export const designId = () => crypto.randomUUID();
export function validDesignImage(src) {
  return (
    typeof src === "string" &&
    src.length < 3000000 &&
    (/^data:image\/(png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(src) ||
      validSvgSource(src))
  );
}
export function designElement(type = "shape", options = {}) {
  const style = paragraphStyles[options.style] || paragraphStyles.body;
  return normalizeDesignElement({
    id: designId(),
    type,
    name: type === "text" ? "Texte" : type === "image" ? "Image" : "Forme",
    x: 90,
    y: 90,
    w: type === "text" ? 440 : 200,
    h: type === "text" ? 140 : 160,
    shape: "rounded",
    fill: type === "text" ? "#172b25" : "#70bba2",
    stroke: "#244e42",
    strokeWidth: 2,
    filled: true,
    outlined: false,
    text: "Un texte à développer.",
    font: style.font,
    size: style.size,
    weight: style.weight,
    leading: style.leading,
    ...options,
  });
}
export function normalizeDesignElement(raw = {}) {
  const type = ["shape", "text", "image", "table"].includes(raw.type)
    ? raw.type
    : "shape";
  return {
    ...(type === "shape"
      ? normalizeShape({ ...raw, pathNodes: raw.nodes })
      : {}),
    code: raw.code === true || raw.style === "code",
    language: [
      "java",
      "javascript",
      "typescript",
      "python",
      "cpp",
      "json",
      "sql",
      "bash",
      "plaintext",
    ].includes(raw.language)
      ? raw.language
      : "java",
    cellColor: color(raw.cellColor, "#253b33"),
    codeBackground: color(raw.codeBackground, "#f1f4f3"),
    rows: Math.round(number(raw.rows, 3, 1, 30)),
    columns: Math.round(number(raw.columns, 3, 1, 12)),
    imageSrc: validDesignImage(raw.imageSrc) ? raw.imageSrc : "",
    imageFit: raw.imageFit === "contain" ? "contain" : "cover",
    cutouts: Array.isArray(raw.cutouts)
      ? raw.cutouts.filter((id) => typeof id === "string").slice(0, 100)
      : [],
    booleanMode: raw.booleanMode === "intersect" ? "intersect" : "subtract",
    id: typeof raw.id === "string" ? raw.id.slice(0, 100) : designId(),
    type,
    font: normalizeFont(raw.font, raw.code ? "code" : "text"),
    name: String(raw.name || "Objet").slice(0, 100),
    x: number(raw.x, 90, -20000, 20000),
    y: number(raw.y, 90, -20000, 20000),
    w: number(raw.w, 200, 4, 12000),
    h: number(raw.h, 160, 4, 12000),
    rotation: number(raw.rotation, 0, -3600, 3600),
    opacity: number(raw.opacity, 100, 0, 100),
    locked: raw.locked === true,
    hidden: raw.hidden === true,
    group: typeof raw.group === "string" ? raw.group.slice(0, 100) : "",
    shape:
      raw.shape === "freeform" || shapes.some((s) => s.id === raw.shape)
        ? raw.shape
        : "rect",
    nodes: normalizePathNodes(raw.nodes),
    closed: raw.closed !== false,
    radius: number(raw.radius, 12, 0, 50),
    fill: color(raw.fill, type === "text" ? "#172b25" : "#70bba2"),
    fill2: color(raw.fill2, "#c8e9dd"),
    gradient: raw.gradient === true,
    filled: raw.filled !== false,
    stroke: color(raw.stroke, "#244e42"),
    outlined: raw.outlined === true,
    strokeWidth: number(raw.strokeWidth, 2, 0.1, 50),
    dashed: raw.dashed === true,
    text: String(raw.text || "").slice(0, 50000),
    style:
      !["__proto__", "constructor", "prototype"].includes(raw.style) &&
      /^[a-zA-Z0-9_-]{1,100}$/.test(raw.style || "")
        ? raw.style
        : "body",
    size: number(raw.size, 17, 6, 300),
    weight: fontWeights(raw.font).includes(Number(raw.weight))
      ? Number(raw.weight)
      : 400,
    leading: number(raw.leading, 1.55, 0.8, 3),
    letterSpacing: number(raw.letterSpacing, 0, -0.1, 1),
    align: ["left", "center", "right", "justify"].includes(raw.align)
      ? raw.align
      : "left",
    src: validDesignImage(raw.src) ? raw.src : "",
    fit: raw.fit === "cover" ? "cover" : "contain",
  };
}
export function designPage(name = "Page 1") {
  return { id: designId(), name, background: "#ffffff", elements: [] };
}
export function createDesign(kind = "vector", name = "", format = 0) {
  kind = designKinds.includes(kind) ? kind : "vector";
  const spec = designFormats[kind][format] || designFormats[kind][0];
  return {
    format: "frame-design",
    version: 1,
    id: designId(),
    kind,
    name:
      name.trim().slice(0, 100) ||
      (kind === "vector" ? "Dessin sans titre" : "Document sans titre"),
    width: spec[1],
    height: spec[2],
    margin: kind === "layout" ? 54 : 0,
    columns: 1,
    columnWeights: [1],
    rows: 1,
    rowWeights: [1],
    rowGutter: 24,
    gutter: 24,
    transparent: kind === "vector",
    pageNumbers: kind === "layout",
    header: "",
    footer: "",
    styles: copyDesign(paragraphStyles),
    pages: [designPage(kind === "vector" ? "Plan de travail 1" : "Page 1")],
  };
}
export function normalizeDesign(raw, kind = raw?.kind) {
  if (
    !raw ||
    raw.format !== "frame-design" ||
    raw.version !== 1 ||
    !designKinds.includes(kind) ||
    raw.kind !== kind ||
    !Array.isArray(raw.pages) ||
    !raw.pages.length ||
    raw.pages.length > 100
  )
    throw Error(
      "Ce fichier ne correspond pas à cet atelier ou son format est invalide.",
    );
  const d = createDesign(kind, String(raw.name || ""));
  d.themeId =
    typeof raw.themeId === "string" && /^[\w-]{1,100}$/.test(raw.themeId)
      ? raw.themeId
      : "";
  d.id = typeof raw.id === "string" ? raw.id.slice(0, 100) : d.id;
  d.width = number(raw.width, d.width, 128, 4096);
  d.height = number(raw.height, d.height, 128, 8192);
  d.margin = number(raw.margin, 54, 0, Math.min(d.width, d.height) / 3);
  d.columns = Math.round(number(raw.columns, 1, 1, 8));
  d.columnWeights = Array.from({ length: d.columns }, (_, i) =>
    number(raw.columnWeights?.[i], 1, 0.01, 100),
  );
  d.gutter = number(raw.gutter, 24, 0, 120);
  d.rows = Math.round(number(raw.rows, 1, 1, 8));
  d.rowWeights = Array.from({ length: d.rows }, (_, i) =>
    number(raw.rowWeights?.[i], 1, 0.01, 100),
  );
  d.rowGutter = number(raw.rowGutter, 24, 0, 120);
  d.transparent = kind === "vector" && raw.transparent === true;
  d.pageNumbers = raw.pageNumbers === true;
  d.header = String(raw.header || "").slice(0, 200);
  d.footer = String(raw.footer || "").slice(0, 200);
  for (const [key, incoming] of Object.entries(raw.styles || {}).slice(0, 50)) {
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(key) ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      continue;
    const style = d.styles[key] || d.styles.body;
    d.styles[key] = {
      name: String(
        incoming.name ||
          style.name ||
          {
            title: "Titre",
            heading: "Sous-titre",
            body: "Paragraphe",
            caption: "Légende",
            code: "Code",
          }[key] ||
          "Style",
      ).slice(0, 80),
      font: normalizeFont(incoming.font || style.font),
      size: number(incoming.size, style.size, 6, 300),
      weight: fontWeights(incoming.font || style.font).includes(
        Number(incoming.weight),
      )
        ? Number(incoming.weight)
        : style.weight,
      leading: number(incoming.leading, style.leading, 0.8, 3),
    };
  }
  const pageIds = new Set(),
    elementIds = new Set();
  d.pages = raw.pages.map((p, i) => {
    if (!Array.isArray(p?.elements) || p.elements.length > 300)
      throw Error("Une page doit contenir au maximum 300 objets.");
    const id =
      typeof p.id === "string" && !pageIds.has(p.id) ? p.id : designId();
    pageIds.add(id);
    return {
      id,
      width: number(p.width, d.width, 128, 4096),
      height: number(p.height, d.height, 128, 8192),
      name: String(p.name || `Page ${i + 1}`).slice(0, 100),
      background: color(p.background, "#ffffff"),
      elements: p.elements.map((value) => {
        const e = normalizeDesignElement(value);
        if (elementIds.has(e.id)) e.id = designId();
        elementIds.add(e.id);
        return e;
      }),
    };
  });
  return d;
}
export function designPath(e) {
  if (
    e.shape === "rounded" ||
    (["rect", "square"].includes(e.shape) &&
      (e.individualCorners || e.roundedCorners))
  ) {
    let radii = cornerPixels(e, e.w, e.h);
    if (!Array.isArray(radii)) radii = Array(4).fill(radii);
    const [a, b, c, d] = radii.map((v) => ({
      x: (v / e.w) * 100,
      y: (v / e.h) * 100,
    }));
    return `M ${a.x} 0 H ${100 - b.x} Q 100 0 100 ${b.y} V ${100 - c.y} Q 100 100 ${100 - c.x} 100 H ${d.x} Q 0 100 0 ${100 - d.y} V ${a.y} Q 0 0 ${a.x} 0 Z`;
  }
  return shapePath(normalizeShape({ ...e, pathNodes: e.nodes }));
}
export function designBounds(elements) {
  if (!elements.length) return null;
  const x = Math.min(...elements.map((e) => e.x)),
    y = Math.min(...elements.map((e) => e.y));
  return {
    x,
    y,
    w: Math.max(...elements.map((e) => e.x + e.w)) - x,
    h: Math.max(...elements.map((e) => e.y + e.h)) - y,
  };
}
export function duplicateDesignElements(elements, offset = 24) {
  const groups = new Map(),
    ids = new Map(elements.map((e) => [e.id, designId()]));
  return elements.map((e) => {
    if (e.group && !groups.has(e.group)) groups.set(e.group, designId());
    return {
      ...copyDesign(e),
      id: ids.get(e.id),
      cutouts: (e.cutouts || []).map((id) => ids.get(id) || id),
      x: e.x + offset,
      y: e.y + offset,
      group: groups.get(e.group) || "",
    };
  });
}

export function wrapDesignText(text, width, size, measure) {
  const result = [];
  for (const paragraph of String(text).split("\n")) {
    if (!paragraph) {
      result.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, size) > width) {
        result.push(line);
        line = "";
      }
      if (measure(word, size) > width) {
        for (const ch of word) {
          if (line && measure(line + ch, size) > width) {
            result.push(line);
            line = "";
          }
          line += ch;
        }
      } else line = line ? line + " " + word : word;
    }
    result.push(line);
  }
  return result;
}
export function designPageSize(d, index = 0) {
  const p = d.pages[index];
  return { width: p?.width || d.width, height: p?.height || d.height };
}
function designTracks(d, index, vertical) {
  const size = designPageSize(d, index)[vertical ? "height" : "width"],
    count = d[vertical ? "rows" : "columns"] || 1,
    margin = Math.min(d.margin, size / 3),
    gutter = Math.min(
      d[vertical ? "rowGutter" : "gutter"] ?? 24,
      Math.max(0, (size - 2 * margin - count * 12) / Math.max(1, count - 1)),
    ),
    usable = size - 2 * margin - gutter * (count - 1),
    weights = Array.from({ length: count }, (_, i) =>
      Math.max(
        0.01,
        Number(d[vertical ? "rowWeights" : "columnWeights"]?.[i]) || 1,
      ),
    ),
    sum = weights.reduce((a, b) => a + b, 0);
  let position = margin;
  return weights.map((weight) => {
    const length = (usable * weight) / sum,
      result = vertical
        ? { y: position, h: length }
        : { x: position, w: length };
    position += length + gutter;
    return result;
  });
}
export function designColumns(d, index = 0) {
  return designTracks(d, index, false);
}
export function designRows(d, index = 0) {
  return designTracks(d, index, true);
}
export function moveSegmentBoundary(weights, index, percent) {
  const sum = weights.reduce((a, b) => a + b, 0),
    values = weights.map((v) => (v / sum) * 100);
  if (index < 0 || index >= values.length - 1) return values;
  const before = values.slice(0, index).reduce((a, b) => a + b, 0),
    pair = values[index] + values[index + 1],
    minimum = Math.min(1, pair / 2),
    left = Math.max(
      minimum,
      Math.min(pair - minimum, Number(percent) - before),
    );
  values[index] = left;
  values[index + 1] = pair - left;
  return values;
}
export function rebalanceColumns(weights, index, percent) {
  const count = weights.length;
  if (count === 1) return [1];
  const sum = weights.reduce((a, b) => a + b, 0),
    target = Math.max(1, Math.min(100 - count + 1, Number(percent) || 1)),
    rest = sum - weights[index];
  return weights.map((v, i) =>
    i === index
      ? target
      : (100 - target) * (rest > 0 ? v / rest : 1 / (count - 1)),
  );
}
export function paginateDesignText(
  document,
  text,
  style = "body",
  measure = (value, size) => value.length * size * 0.53,
) {
  const d = copyDesign(document),
    format = d.styles[style] || d.styles.body,
    leading = format.size * format.leading,
    columns = designColumns(d),
    perColumn = Math.floor((d.height - 2 * d.margin) / leading);
  if (perColumn < 1 || columns.some((c) => c.w < 20))
    throw Error("Réduis les marges ou les colonnes.");
  const pages = [];
  let remaining = String(text);
  while (remaining.length) {
    if (d.pages.length + pages.length >= 100)
      throw Error("Le document dépasserait 100 pages.");
    const p = {
      ...designPage(`Page ${d.pages.length + pages.length + 1}`),
      width: d.width,
      height: d.height,
    };
    for (const col of columns) {
      if (!remaining.length) break;
      const lines = wrapDesignText(remaining, col.w, format.size, measure),
        content = lines.slice(0, perColumn);
      let cursor = 0;
      for (const line of content) {
        for (const ch of line) {
          if (/\s/.test(ch)) {
            while (cursor < remaining.length && /\s/.test(remaining[cursor]))
              cursor++;
          } else {
            while (
              cursor < remaining.length &&
              remaining[cursor] !== ch &&
              /\s/.test(remaining[cursor])
            )
              cursor++;
            if (remaining[cursor] === ch) cursor++;
          }
        }
        if (remaining[cursor] === "\n") cursor++;
      }
      if (!cursor)
        cursor = Math.min(remaining.length, content.join("\n").length || 1);
      remaining = remaining.slice(cursor).replace(/^ +/, "");
      p.elements.push(
        designElement("text", {
          x: col.x,
          y: d.margin,
          w: col.w,
          h: content.length * leading,
          text: content.join("\n"),
          style,
          ...format,
        }),
      );
    }
    pages.push(p);
  }
  return pages;
}
export function sampleDesign(kind) {
  const d = createDesign(
    kind,
    kind === "vector" ? "Mémoire et références" : "Fiche de cours · Java",
  );
  const add = (type, o) => d.pages[0].elements.push(designElement(type, o));
  if (kind === "vector") {
    add("text", {
      name: "Titre",
      x: 70,
      y: 60,
      w: 850,
      h: 65,
      text: "Une référence, un objet",
      style: "title",
      size: 40,
      weight: 700,
    });
    add("shape", {
      name: "Variable",
      x: 85,
      y: 245,
      w: 230,
      h: 170,
      fill: "#d8eae2",
      outlined: true,
    });
    add("text", {
      x: 110,
      y: 292,
      w: 185,
      h: 80,
      text: "variable\nmaReference",
      align: "center",
      size: 22,
    });
    add("shape", {
      shape: "arrow",
      name: "Référence",
      x: 375,
      y: 285,
      w: 200,
      h: 75,
      fill: "#518a75",
    });
    add("shape", {
      shape: "rounded",
      name: "Objet",
      x: 635,
      y: 225,
      w: 280,
      h: 210,
      fill: "#efe5d7",
      stroke: "#9b815c",
      outlined: true,
    });
    add("text", {
      x: 665,
      y: 285,
      w: 220,
      h: 80,
      text: "Objet en mémoire",
      size: 25,
      align: "center",
      weight: 700,
    });
    add("text", {
      x: 85,
      y: 540,
      w: 830,
      h: 110,
      text: "Déplace les formes, modifie leurs contours ou dessine ton propre tracé avec la plume.",
      size: 22,
      fill: "#52685d",
    });
  } else {
    d.header = "FRAME / FICHE DE COURS";
    d.footer = "Java · Notes et pratique";
    add("text", {
      x: 54,
      y: 90,
      w: 680,
      h: 110,
      text: "Comprendre les références",
      style: "title",
      size: 40,
      weight: 700,
    });
    add("shape", { x: 54, y: 225, w: 686, h: 120, fill: "#e4efe9", radius: 8 });
    add("text", {
      x: 76,
      y: 246,
      w: 640,
      h: 80,
      text: "À retenir\nUne variable de référence permet de désigner un objet.",
      size: 20,
      weight: 700,
    });
    add("text", {
      x: 54,
      y: 390,
      w: 680,
      h: 60,
      text: "Un schéma, puis un exemple",
      style: "heading",
      size: 26,
      weight: 700,
    });
    add("text", {
      x: 54,
      y: 465,
      w: 680,
      h: 145,
      text: "Construis ta fiche avec des blocs de texte, des images et des formes. Les styles partagés permettent de modifier tous les titres ou paragraphes du document en une seule action.",
      size: 18,
    });
    add("shape", { x: 54, y: 650, w: 686, h: 130, fill: "#f1f3f1", radius: 6 });
    add("text", {
      x: 78,
      y: 675,
      w: 638,
      h: 90,
      text: "Object premier = new Object();\nObject second = premier;",
      style: "code",
      size: 18,
    });
    const second = designPage("Exercice");
    second.elements.push(
      designElement("text", {
        x: 54,
        y: 95,
        w: 686,
        h: 80,
        text: "À toi de jouer",
        style: "title",
        size: 40,
        weight: 700,
      }),
      designElement("text", {
        x: 54,
        y: 215,
        w: 686,
        h: 200,
        text: "1. Dessine deux variables qui désignent le même objet.\n\n2. Explique ce qui se passe lorsqu’une référence change.\n\n3. Ajoute tes réponses et exporte ton document en PDF.",
        size: 18,
      }),
    );
    d.pages.push(second);
  }
  return d;
}
