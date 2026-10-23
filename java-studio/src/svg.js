// SVG stays vector-based. Only self-contained drawing markup is accepted.
export function safeSvg(value) {
  if (
    typeof value !== "string" ||
    value.length >= 2000000 ||
    !/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(value)
  )
    return false;
  const markup = value.replace(/xmlns(?::[\w-]+)?\s*=\s*(["'])[^"']*\1/gi, "");
  if (
    /@|expression\s*\(|behavior\s*:|-moz-binding|<\s*(?:script|foreignObject|iframe|object|embed|image|audio|video|animate\w*|set)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=|@import|javascript:|data:|https?:|file:|&#|\\/i.test(
      markup,
    )
  )
    return false;
  for (const m of markup.matchAll(/(?:href|src)\s*=\s*(["'])(.*?)\1/gi))
    if (!m[2].trim().startsWith("#")) return false;
  for (const m of markup.matchAll(/url\((.*?)\)/gi))
    if (
      !m[1]
        .trim()
        .replace(/^["']|["']$/g, "")
        .trim()
        .startsWith("#")
    )
      return false;
  return true;
}
// Illustrator's legacy SVG header declares namespace aliases in a DTD.
// Remove the DTD before parsing, expand only known namespace URI aliases.
export function normalizeSvgHeader(value) {
  if (typeof value !== "string" || value.length >= 2000000)
    throw Error("SVG trop volumineux ou invalide");
  let text = value.replace(/^\uFEFF/, "").replace(/<!--[\s\S]*?-->/g, "");
  const aliases = new Map();
  let start = text.search(/<!DOCTYPE\b/i);
  if (start >= 0) {
    let depth = 0,
      quote = "",
      end = -1;
    for (let i = start + 9; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (ch === ">" && depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) throw Error("En-tête SVG invalide");
    const dtd = text.slice(start, end),
      decl = /<!ENTITY\s+([\w.-]+)\s+(["'])([^"']*)\2\s*>/gi;
    const remaining = dtd.replace(decl, (all, name, q, uri) => {
      if (
        ![
          "http://www.w3.org/2000/svg",
          "http://www.w3.org/1999/xlink",
        ].includes(uri) ||
        aliases.has(name)
      )
        throw Error("Entité SVG non acceptée");
      aliases.set(name, uri);
      return "";
    });
    if (/<!ENTITY|<!\[|\%/i.test(remaining))
      throw Error("Entité SVG non acceptée");
    text = text.slice(0, start) + text.slice(end);
  }
  text = text.replace(
    /(\bxmlns(?::[\w.-]+)?\s*=\s*)(["'])&([\w.-]+);\2/g,
    (all, before, q, name) => {
      if (!aliases.has(name)) throw Error("Espace de noms SVG inconnu");
      return before + q + aliases.get(name) + q;
    },
  );
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error("En-tête SVG non accepté");
  return text;
}
export function svgSource(value) {
  const prepared = normalizeSvgHeader(value);
  if (/<\s*script\b/i.test(prepared)) throw Error("SVG non autonome");
  const doc = new DOMParser().parseFromString(prepared, "image/svg+xml");
  for (const node of doc.querySelectorAll("metadata")) node.remove();
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("SVG invalide");
  if (!doc.documentElement.getAttribute("xmlns"))
    doc.documentElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const clean = new XMLSerializer().serializeToString(doc.documentElement);
  if (!safeSvg(clean)) throw Error("SVG non autonome");
  return (
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(clean)))
  );
}
export function validSvgSource(src) {
  try {
    return (
      /^data:image\/svg\+xml;base64,[a-zA-Z0-9+/=]+$/.test(src) &&
      safeSvg(decodeURIComponent(escape(atob(src.split(",")[1]))))
    );
  } catch {
    return false;
  }
}
