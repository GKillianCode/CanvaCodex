import { fontCss, fonts } from "./fonts.js";
import { designPageSize } from "./designModel.js";
import { freeformBounds, mapNodes } from "./freeform.js";
import Prism from "prismjs";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-bash.js";
import {
  designPath,
  normalizeDesign,
  normalizeDesignElement,
  wrapDesignText,
} from "./designModel.js";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch],
  );
export const designFonts = Object.fromEntries(fonts.map((f) => [f.id, f.css]));
let measurement;
export function measureDesignText(
  value,
  size,
  weight = 400,
  code = false,
  font = "inter",
) {
  if (typeof document === "undefined") return value.length * size * 0.53;
  measurement ||= document.createElement("canvas").getContext("2d");
  measurement.font = `${weight} ${size}px ${designFonts[font] || designFonts.inter}`;
  return measurement.measureText(value).width;
}
export function designTextLines(e) {
  return wrapDesignText(
    e.text,
    e.w,
    e.size,
    (value, size) =>
      measureDesignText(value, size, e.weight, e.code, e.font) +
      Math.max(0, [...value].length - 1) * size * e.letterSpacing,
  );
}
export function artworkMarkup(
  page,
  { prefix = "art", selection = false } = {},
) {
  const safePrefix = String(prefix).replace(/[^a-z\d_-]/gi, "");
  const cutters = new Set(
    page.elements.filter((e) => !e.hidden).flatMap((e) => e.cutouts || []),
  );
  return page.elements
    .filter((raw) => !raw.hidden && !cutters.has(raw.id))
    .map((raw) => {
      const e = normalizeDesignElement(raw),
        id = safePrefix + "-" + e.id.replace(/[^a-z\d_-]/gi, ""),
        rotation = `rotate(${e.rotation} ${e.x + e.w / 2} ${e.y + e.h / 2})`,
        stroke = e.outlined ? escape(e.stroke) : "none",
        fill = e.filled ? escape(e.fill) : "none";
      let content = "";
      if (e.type === "shape") {
        const path = escape(designPath(e));
        content = `<defs><linearGradient id="${id}-gradient" x2="1" y2="1"><stop stop-color="${escape(e.fill)}"/><stop offset="1" stop-color="${escape(e.fill2)}"/></linearGradient></defs><path d="${path}" transform="translate(${e.x} ${e.y}) scale(${e.w / 100} ${e.h / 100})" fill="${e.gradient && e.filled ? `url(#${id}-gradient)` : fill}" stroke="${stroke}" stroke-width="${e.strokeWidth}" vector-effect="non-scaling-stroke" ${e.dashed ? 'stroke-dasharray="8 6"' : ""} stroke-linejoin="round"/>`;
        if (e.imageSrc) {
          content += `<defs><clipPath id="${id}-image"><path d="${path}" transform="translate(${e.x} ${e.y}) scale(${e.w / 100} ${e.h / 100})"/></clipPath></defs><image href="${escape(e.imageSrc)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid ${e.imageFit === "cover" ? "slice" : "meet"}" clip-path="url(#${id}-image)"/>${e.outlined ? `<path d="${path}" transform="translate(${e.x} ${e.y}) scale(${e.w / 100} ${e.h / 100})" fill="none" stroke="${stroke}" stroke-width="${e.strokeWidth}" vector-effect="non-scaling-stroke" ${e.dashed ? 'stroke-dasharray="8 6"' : ""}/>` : ""}`;
        }
      } else if (e.type === "image") {
        content = e.src
          ? `<image href="${escape(e.src)}" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid ${e.fit === "cover" ? "slice" : "meet"}"/>`
          : `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="#dbe4df"/>`;
      } else if (e.type === "table") {
        const cells = e.text.split("\n").map((row) => row.split("\t")),
          cw = e.w / e.columns,
          ch = e.h / e.rows;
        content = `<defs><clipPath id="${id}-table"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"/></clipPath></defs><g clip-path="url(#${id}-table)">`;
        for (let row = 0; row < e.rows; row++)
          for (let col = 0; col < e.columns; col++) {
            const x = e.x + col * cw,
              y = e.y + row * ch,
              cellId = `${id}-${row}-${col}`;
            content += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${e.filled ? escape(e.fill) : "none"}" stroke="${e.outlined ? escape(e.stroke) : "none"}" stroke-width="${e.strokeWidth}"/><defs><clipPath id="${cellId}"><rect x="${x + 6}" y="${y}" width="${Math.max(1, cw - 12)}" height="${ch}"/></clipPath></defs><text clip-path="url(#${cellId})" x="${x + 8}" y="${y + ch / 2}" dominant-baseline="middle" font-family="${escape(designFonts[e.font])}" font-size="${e.size}" font-weight="${e.weight}" fill="${e.cellColor}">${escape(cells[row]?.[col] || "")}</text>`;
          }
        content += "</g>";
      } else if (e.code) {
        const grammar = Prism.languages[e.language],
          tokens = grammar ? Prism.tokenize(e.text, grammar) : [e.text],
          lines = [[]];
        const rgb = [1, 3, 5].map((i) =>
          parseInt(e.codeBackground.slice(i, i + 2), 16),
        );
        const dark = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 < 130;
        const colors = dark
          ? {
              keyword: "#cda6ee",
              string: "#91cf9b",
              comment: "#9cadb3",
              number: "#efbc8c",
              function: "#9acbe9",
              operator: "#e6bb9e",
              boolean: "#cda6ee",
              "class-name": "#9acbe9",
            }
          : {
              keyword: "#7940a0",
              string: "#217440",
              comment: "#657780",
              number: "#a34d16",
              function: "#1d6399",
              operator: "#844c29",
              boolean: "#7940a0",
              "class-name": "#1d6399",
            };
        const visit = (parts, color = dark ? "#e5eee9" : "#263d35") => {
          for (const token of Array.isArray(parts) ? parts : [parts])
            if (typeof token === "string") {
              token.split("\n").forEach((part, i) => {
                if (i) lines.push([]);
                lines
                  .at(-1)
                  .push(`<tspan fill="${color}">${escape(part)}</tspan>`);
              });
            } else visit(token.content, colors[token.type] || color);
        };
        visit(tokens);
        content = `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="8" fill="${escape(e.codeBackground)}"/><defs><clipPath id="${id}-code"><rect x="${e.x + 12}" y="${e.y + 8}" width="${Math.max(1, e.w - 24)}" height="${Math.max(1, e.h - 16)}"/></clipPath></defs><text xml:space="preserve" clip-path="url(#${id}-code)" font-family="${escape(designFonts[e.font] || designFonts.monospace)}" font-weight="${e.weight}" font-size="${e.size}">${lines.map((line, i) => `<tspan x="${e.x + 16}" y="${e.y + 16 + e.size + i * e.size * e.leading}">${line.join("")}</tspan>`).join("")}</text>`;
      } else {
        const lines = designTextLines(e),
          anchor =
            e.align === "center"
              ? "middle"
              : e.align === "right"
                ? "end"
                : "start",
          x =
            e.x +
            (e.align === "center" ? e.w / 2 : e.align === "right" ? e.w : 0);
        content = `<defs><clipPath id="${id}-text"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"/></clipPath></defs><text clip-path="url(#${id}-text)" xml:space="preserve" fill="${escape(e.fill)}" font-family="${escape(designFonts[e.font] || designFonts.inter)}" font-size="${e.size}" letter-spacing="${e.letterSpacing}em" font-weight="${e.weight}" text-anchor="${anchor}">${lines.map((line, i) => `<tspan x="${x}" y="${e.y + e.size + i * e.size * e.leading}" ${e.align === "justify" && i < lines.length - 1 && line.includes(" ") ? `textLength="${e.w}" lengthAdjust="spacing"` : ""}>${escape(line)}</tspan>`).join("")}</text>`;
      }
      let mask = "";
      if (e.cutouts.length) {
        const selected = page.elements
          .filter(
            (item) => e.cutouts.includes(item.id) && item.type === "shape",
          )
          .map((item) => ({
            ...item,
            hidden: false,
            imageSrc: "",
            cutouts: [],
            fill: e.booleanMode === "intersect" ? "#ffffff" : "#000000",
            opacity: 100,
            gradient: false,
            filled: true,
            outlined: false,
          }));
        mask = `<defs><mask id="${id}-boolean" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect x="0" y="0" width="100%" height="100%" fill="${e.booleanMode === "intersect" ? "black" : "white"}"/>${artworkMarkup({ elements: selected }, { prefix: id + "-cut" })}</mask></defs>`;
      }
      return `${mask}<g ${e.cutouts.length ? `mask="url(#${id}-boolean)"` : ""}><g data-design-id="${escape(e.id)}" transform="${rotation}" opacity="${e.opacity / 100}" ${selection ? 'style="pointer-events:none"' : ""}>${content}</g></g>`;
    })
    .join("");
}
export function furnitureMarkup(d, index) {
  d = { ...d, ...designPageSize(d, index) };
  if (d.kind !== "layout") return "";
  const m = Math.max(18, d.margin),
    color = "#65746c";
  return `<g fill="${color}" font-family="Inter, Arial, sans-serif" font-size="11"><text x="${m}" y="${Math.max(18, m * 0.6)}">${escape(d.header)}</text><text x="${m}" y="${d.height - Math.max(15, m * 0.4)}">${escape(d.footer)}</text>${d.pageNumbers ? `<text text-anchor="end" x="${d.width - m}" y="${d.height - Math.max(15, m * 0.4)}">${index + 1} / ${d.pages.length}</text>` : ""}</g>`;
}
export function exportDesignSvg(raw, index = 0) {
  const source = normalizeDesign(raw),
    d = { ...source, ...designPageSize(source, index) },
    page = d.pages[index];
  if (!page) throw Error("Page introuvable.");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" role="img"><title>${escape(d.name + " · " + page.name)}</title>${!d.transparent ? `<rect width="100%" height="100%" fill="${escape(page.background)}"/>` : ""}${artworkMarkup(page, { prefix: "export" })}${furnitureMarkup(d, index)}</svg>`;
}
export function designExportArea(
  raw,
  index = 0,
  { scope = "page", selection = [], padding = 0 } = {},
) {
  const source = normalizeDesign(raw),
    d = { ...source, ...designPageSize(source, index) },
    page = d.pages[index];
  if (!page) throw Error("Page introuvable.");
  if (scope === "page")
    return { x: 0, y: 0, w: d.width, h: d.height, elements: page.elements };
  const cutters = new Set(
    page.elements.filter((e) => !e.hidden).flatMap((e) => e.cutouts || []),
  );
  const roots = page.elements.filter(
    (e) =>
      !e.hidden &&
      !cutters.has(e.id) &&
      (scope !== "selection" || selection.includes(e.id)),
  );
  if (!roots.length)
    throw Error(
      scope === "selection"
        ? "Sélectionne au moins un objet visible."
        : "Ce plan ne contient aucun objet visible.",
    );
  const ids = new Set(roots.map((e) => e.id));
  let size = 0;
  while (size !== ids.size) {
    size = ids.size;
    for (const e of page.elements)
      if (ids.has(e.id)) for (const id of e.cutouts || []) ids.add(id);
  }
  const points = roots.flatMap((e) => {
    const a = (e.rotation * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      cx = e.x + e.w / 2,
      cy = e.y + e.h / 2,
      p = e.outlined ? e.strokeWidth / 2 : 0;
    if (e.type === "shape" && e.shape === "freeform" && e.nodes.length) {
      const nodes = mapNodes(e.nodes, (x, y) => {
        const dx = (x * e.w) / 100 - e.w / 2,
          dy = (y * e.h) / 100 - e.h / 2;
        return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
      });
      const b = freeformBounds(nodes, e.closed);
      return [
        { x: b.x - p, y: b.y - p },
        { x: b.x + b.w + p, y: b.y + b.h + p },
      ];
    }
    return [
      [-e.w / 2 - p, -e.h / 2 - p],
      [e.w / 2 + p, -e.h / 2 - p],
      [e.w / 2 + p, e.h / 2 + p],
      [-e.w / 2 - p, e.h / 2 + p],
    ].map(([x, y]) => ({ x: cx + x * c - y * s, y: cy + x * s + y * c }));
  });
  const pad = Math.max(0, Math.min(500, Number(padding) || 0)),
    x = Math.floor(Math.min(...points.map((p) => p.x)) - pad),
    y = Math.floor(Math.min(...points.map((p) => p.y)) - pad);
  return {
    x,
    y,
    w: Math.max(1, Math.ceil(Math.max(...points.map((p) => p.x)) + pad) - x),
    h: Math.max(1, Math.ceil(Math.max(...points.map((p) => p.y)) + pad) - y),
    elements: page.elements.filter((e) => ids.has(e.id)),
  };
}
export function exportDesignRegion(raw, index = 0, options = {}) {
  const source = normalizeDesign(raw),
    d = { ...source, ...designPageSize(source, index) },
    area = designExportArea(d, index, options),
    page = d.pages[index];
  const transparent = options.transparent ?? d.transparent;
  return {
    ...area,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${area.w}" height="${area.h}" viewBox="${area.x} ${area.y} ${area.w} ${area.h}"><title>${escape(d.name)}</title>${transparent ? "" : `<rect x="${area.x}" y="${area.y}" width="${area.w}" height="${area.h}" fill="${escape(page.background)}"/>`}${artworkMarkup({ elements: area.elements }, { prefix: "region" })}${options.scope === "page" ? furnitureMarkup(d, index) : ""}</svg>`,
  };
}
export function designPrintHtml(raw) {
  const d = normalizeDesign(raw),
    mm = (v) => Number(((v * 25.4) / 96).toFixed(4));
  const rules = d.pages
    .map((_, i) => {
      const s = designPageSize(d, i);
      return `@page sheet${i}{size:${mm(s.width)}mm ${mm(s.height)}mm;margin:0}.sheet${i}{page:sheet${i};width:${mm(s.width)}mm;height:${mm(s.height)}mm}`;
    })
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><title>${escape(d.name)}</title><style>${rules}*{box-sizing:border-box}html,body{margin:0;background:white}section{break-after:page;overflow:hidden}section:last-child{break-after:auto}svg{display:block;width:100%;height:100%}@media screen{body{background:#eee}section{margin:16px auto}}</style></head><body>${d.pages.map((_, i) => `<section class="sheet${i}">${exportDesignSvg({ ...d, transparent: false }, i)}</section>`).join("")}</body></html>`;
}
export function downloadDesign(content, name, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function loadDesignFonts(elements, documentRef = document) {
  const specifications = [
    ...new Set(
      elements
        .filter((e) => ["text", "table"].includes(e.type) && !e.hidden)
        .map((e) => `${e.weight || 400} ${e.size || 17}px ${fontCss(e.font)}`),
    ),
  ];
  await Promise.all(
    specifications.map((value) => documentRef.fonts.load(value)),
  );
  await documentRef.fonts.ready;
}
// The print frame and SVG rasterizer must use the same bundled faces as the editor.
function designFontFaces(elements) {
  const used = elements
      .filter((e) => ["text", "table"].includes(e.type) && !e.hidden)
      .map((e) => ({
        family: fontCss(e.font)
          .split(",")[0]
          .replace(/["']/g, "")
          .trim()
          .toLowerCase(),
        weight: Number(e.weight) || 400,
      })),
    faces = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type !== 5) continue;
        const family = rule.style
            .getPropertyValue("font-family")
            .replace(/["']/g, "")
            .trim()
            .toLowerCase(),
          style = rule.style.getPropertyValue("font-style"),
          weights = rule.style
            .getPropertyValue("font-weight")
            .split(/\s+/)
            .map(Number);
        if (
          (style && style !== "normal") ||
          !used.some(
            (e) =>
              e.family === family &&
              (weights.length === 2
                ? e.weight >= weights[0] && e.weight <= weights[1]
                : e.weight === (weights[0] || 400)),
          )
        )
          continue;
        const css = rule.cssText.replace(/url\(([^)]+)\)/g, (_, src) => {
          const value = src.trim().replace(/^['"]|['"]$/g, "");
          const url = new URL(value, sheet.href || location.href);
          if (url.origin !== location.origin)
            throw Error("Police externe non embarquée");
          return 'url("' + url.href + '")';
        });
        if (!faces.includes(css)) faces.push(css);
      }
    } catch {}
  }
  return faces;
}
const designFontData = new Map(),
  designFontLicenses = new Map();
async function fontData(url) {
  if (!designFontData.has(url)) {
    const promise = fetch(url)
      .then(async (response) => {
        if (!response.ok)
          throw Error("Impossible de préparer les polices de l’export.");
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(Error("Police illisible"));
          reader.readAsDataURL(blob);
        });
      })
      .catch((error) => {
        designFontData.delete(url);
        throw error;
      });
    if (designFontData.size >= 32)
      designFontData.delete(designFontData.keys().next().value);
    designFontData.set(url, promise);
  }
  return designFontData.get(url);
}
export async function embedDesignFonts(svg, elements) {
  const faces = await Promise.all(
    designFontFaces(elements).map(async (face) => {
      const urls = [...face.matchAll(/url\("([^" ]+)"\)/g)];
      let css = face;
      for (const match of urls)
        css = css.replace(
          match[0],
          'url("' + (await fontData(match[1])) + '")',
        );
      return css;
    }),
  );
  if (!faces.length) return svg;
  const ids = [
    ...new Set(
      elements
        .filter((e) => ["text", "table"].includes(e.type) && !e.hidden)
        .map((e) => e.font),
    ),
  ].filter((id) => fonts.some((font) => font.id === id && !font.local));
  const licenses = await Promise.all(
    ids.map(async (id) => {
      if (!designFontLicenses.has(id))
        designFontLicenses.set(
          id,
          fetch("/fonts/licenses/" + id + ".txt")
            .then((response) => {
              if (!response.ok) throw Error("Licence de police indisponible");
              return response.text();
            })
            .catch((error) => {
              designFontLicenses.delete(id);
              throw error;
            }),
        );
      return await designFontLicenses.get(id);
    }),
  );
  return svg.replace(
    /(<svg\b[^>]*>)/,
    "$1<metadata>" +
      escape(licenses.join("\n\n")) +
      "</metadata><defs><style>" +
      escape(faces.join("\n")) +
      "</style></defs>",
  );
}
export async function rasterizeDesignSvg(svg, width, height) {
  const w = Math.ceil(width),
    h = Math.ceil(height);
  if (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w < 1 ||
    h < 1 ||
    w * h > 40000000 ||
    w > 16384 ||
    h > 16384
  )
    throw Error("Dimensions trop grandes : réduis l’échelle PNG.");
  const image = new Image();
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(image, 0, 0, w, h);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve));
  if (!blob) throw Error("Le PNG ne peut pas être créé.");
  return blob;
}
export async function printDesign(d) {
  await loadDesignFonts(d.pages.flatMap((p) => p.elements));
  const frame = document.createElement("iframe");
  frame.title = "Document prêt à imprimer";
  frame.style.cssText =
    "position:fixed;width:1px;height:1px;bottom:0;left:0;border:0;opacity:0;pointer-events:none";
  frame.srcdoc = designPrintHtml(d);
  document.body.appendChild(frame);
  const cleanup = () => frame.remove();
  await new Promise((resolve) =>
    frame.addEventListener("load", resolve, { once: true }),
  );
  const style = frame.contentDocument.createElement("style");
  style.textContent = designFontFaces(d.pages.flatMap((p) => p.elements)).join(
    "\n",
  );
  frame.contentDocument.head.appendChild(style);
  await loadDesignFonts(
    d.pages.flatMap((p) => p.elements),
    frame.contentDocument,
  );
  await Promise.all(
    Array.from(frame.contentDocument.images).map((img) =>
      img.decode().catch(() => {}),
    ),
  );
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  return cleanup;
}
