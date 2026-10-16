import {highlightColors} from './videoWorkflow.js';
import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
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
  "c",
  "cpp",
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
function coloredMark(state,silent){
 const match=/^==(yellow|mint|blue|pink|orange)\|([^\n]+?)==/.exec(state.src.slice(state.pos));
 if(!match)return false;
 if(!silent){const open=state.push('mark_open','mark',1);open.attrSet('style',`background:${highlightColors[match[1]]};color:#17231f`);open.attrSet('data-highlight',match[1]);const children=[];state.md.inline.parse(match[2],state.md,state.env,children);state.tokens.push(...children);state.push('mark_close','mark',-1);}
 state.pos+=match[0].length;return true;
}
markdown.inline.ruler.before('emphasis','colored_mark',coloredMark);
const cache = new Map();
export function renderNotebook(value) {
  const normalized = normalizeNotes(value);
  if (cache.has(normalized)) return cache.get(normalized);
  const html = markdown.render(normalized);
  cache.set(normalized, html);
  if (cache.size > 12) cache.delete(cache.keys().next().value);
  return html;
}

const conductorMarkdown=new MarkdownIt({...markdown.options});
conductorMarkdown.inline.ruler.before('emphasis','colored_mark',coloredMark);
conductorMarkdown.renderer.rules.link_open=markdown.renderer.rules.link_open;
conductorMarkdown.renderer.rules.image=(tokens,index,options,env)=>{
 const token=tokens[index],id=(token.attrGet('src')||'').replace(/^frame-image:/,'');
 const picture=env.images?.find(image=>image.id===id);if(!picture)return '';
 const esc=conductorMarkdown.utils.escapeHtml,width=Math.max(10,Math.min(100,Number(picture.width)||50));
 const align=['left','right'].includes(picture.align)?`float:${picture.align};margin:12px 20px 12px 0;`:'display:block;margin:18px auto;';
 return `<img data-frame-image="${esc(id)}" src="${esc(picture.src)}" alt="${esc(picture.alt||'')}" loading="lazy" decoding="async" draggable="true" style="width:${width}%;max-width:100%;height:auto;${align}">`;
};
export function renderConductor(value,images=[]){return conductorMarkdown.render(String(value||''),{images});}
