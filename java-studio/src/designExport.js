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
export const designFonts = {
  inter: "Inter, Arial, sans-serif",
  montserrat: "Montserrat, Arial, sans-serif",
  lora: "Lora, Georgia, serif",
  monospace: "monospace",
};
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
  return wrapDesignText(e.text, e.w, e.size, (value, size) =>
    measureDesignText(value, size, e.weight, e.style === "code", e.font),
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
        content = `<defs><clipPath id="${id}-text"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"/></clipPath></defs><text clip-path="url(#${id}-text)" xml:space="preserve" fill="${escape(e.fill)}" font-family="${designFonts[e.font] || designFonts.inter}" font-size="${e.size}" font-weight="${e.weight}" text-anchor="${anchor}">${lines.map((line, i) => `<tspan x="${x}" y="${e.y + e.size + i * e.size * e.leading}" ${e.align === "justify" && i < lines.length - 1 && line.includes(" ") ? `textLength="${e.w}" lengthAdjust="spacing"` : ""}>${escape(line)}</tspan>`).join("")}</text>`;
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
  if (d.kind !== "layout") return "";
  const m = Math.max(18, d.margin),
    color = "#65746c";
  return `<g fill="${color}" font-family="Inter, Arial, sans-serif" font-size="11"><text x="${m}" y="${Math.max(18, m * 0.6)}">${escape(d.header)}</text><text x="${m}" y="${d.height - Math.max(15, m * 0.4)}">${escape(d.footer)}</text>${d.pageNumbers ? `<text text-anchor="end" x="${d.width - m}" y="${d.height - Math.max(15, m * 0.4)}">${index + 1} / ${d.pages.length}</text>` : ""}</g>`;
}
export function exportDesignSvg(raw, index = 0) {
  const d = normalizeDesign(raw),
    page = d.pages[index];
  if (!page) throw Error("Page introuvable.");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" role="img"><title>${escape(d.name + " · " + page.name)}</title>${!d.transparent ? `<rect width="100%" height="100%" fill="${escape(page.background)}"/>` : ""}${artworkMarkup(page, { prefix: "export" })}${furnitureMarkup(d, index)}</svg>`;
}
export function designPrintHtml(raw) {
  const d = normalizeDesign(raw),
    w = Number(((d.width * 25.4) / 96).toFixed(4)),
    h = Number(((d.height * 25.4) / 96).toFixed(4));
  return `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><title>${escape(d.name)}</title><style>@page{size:${w}mm ${h}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:white}section{width:${w}mm;height:${h}mm;break-after:page;overflow:hidden}section:last-child{break-after:auto}svg{display:block;width:100%;height:100%}@media screen{body{background:#eee}section{margin:16px auto}}</style></head><body>${d.pages.map((_, i) => `<section>${exportDesignSvg({ ...d, transparent: false }, i)}</section>`).join("")}</body></html>`;
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
export async function printDesign(d) {
  await document.fonts.ready;
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
  // Copy only the bundled font faces already loaded by Frame, no external URLs.
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules)
        if (rule.type === 5) {
          const style = frame.contentDocument.createElement("style");
          style.textContent = rule.cssText.replace(
            /url\(([^)]+)\)/g,
            (_, src) => {
              const value = src.trim().replace(/^['"]|['"]$/g, "");
              return `url("${new URL(value, sheet.href || location.href).href}")`;
            },
          );
          frame.contentDocument.head.appendChild(style);
        }
    } catch {}
  }
  await frame.contentDocument.fonts.ready;
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
