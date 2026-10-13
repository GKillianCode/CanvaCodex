import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-yaml.js";
import { normalizeNotes } from "./notesContent.js";
const aliases = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  html: "markup",
  xml: "markup",
};
const supported = new Set([
  "java",
  "javascript",
  "typescript",
  "python",
  "bash",
  "json",
  "sql",
  "yaml",
  "markup",
  "css",
]);
const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false,
  highlight(code, language) {
    const lang = aliases[language.toLowerCase()] || language.toLowerCase();
    return supported.has(lang) && Prism.languages[lang]
      ? Prism.highlight(code, Prism.languages[lang], lang)
      : "";
  },
}).disable("image");
const linkOpen =
  markdown.renderer.rules.link_open ||
  ((tokens, index, options, env, self) =>
    self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, env, self) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return linkOpen(tokens, index, options, env, self);
};
const cache = new Map();
export function renderNotebook(value) {
  const normalized = normalizeNotes(value);
  if (cache.has(normalized)) return cache.get(normalized);
  const html = markdown.render(normalized);
  cache.set(normalized, html);
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  return html;
}
