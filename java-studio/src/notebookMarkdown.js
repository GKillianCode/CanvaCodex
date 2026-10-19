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
// Repair the empty wrapper emitted by older rich-editor list serialization.
// Only a list-only item following a real sibling is merged into that sibling.
function repairNestedListItems(state){
 const tokens=state.tokens;
 const listOpen=t=>['bullet_list_open','ordered_list_open'].includes(t?.type);
 for(let i=1;i<tokens.length-1;i++){
  if(tokens[i].type!=='list_item_open'||tokens[i-1].type!=='list_item_close'||tokens[i-1].level!==tokens[i].level||!listOpen(tokens[i+1]))continue;
  let depth=0,end=i+1;
  for(;end<tokens.length;end++){
   if(listOpen(tokens[end]))depth++;
   if(['bullet_list_close','ordered_list_close'].includes(tokens[end].type)&&--depth===0)break;
  }
  if(tokens[end+1]?.type!=='list_item_close')continue;
  tokens.splice(i-1,2);i=Math.max(0,i-2);
 }
}
markdown.core.ruler.after('block','repair_nested_list_items',repairNestedListItems);
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
conductorMarkdown.core.ruler.after('block','repair_nested_list_items',repairNestedListItems);
conductorMarkdown.renderer.rules.link_open=markdown.renderer.rules.link_open;
conductorMarkdown.renderer.rules.image=(tokens,index,options,env)=>{
 const token=tokens[index],id=(token.attrGet('src')||'').replace(/^frame-image:/,'');
 const picture=env.images?.find(image=>image.id===id);if(!picture)return '';
 const esc=conductorMarkdown.utils.escapeHtml,width=Math.max(10,Math.min(100,Number(picture.width)||50));
 const align=['left','right'].includes(picture.align)?`float:${picture.align};margin:12px 20px 12px 0;`:'display:block;margin:18px auto;';
 return `<img data-frame-image="${esc(id)}" src="${esc(picture.src)}" alt="${esc(picture.alt||'')}" loading="lazy" decoding="async" draggable="true" style="width:${width}%;max-width:100%;height:auto;${align}">`;
};
// Private notes are parsed as their own Markdown block, never stripped with a
// regexp: fenced code remains literal, and an unfinished note stays private.
conductorMarkdown.block.ruler.before('fence','private_comment',(state,start,end,silent)=>{
 const line=n=>state.src.slice(state.bMarks[n]+state.tShift[n],state.eMarks[n]);
 const open=/^(:{3,})comment\s*$/.exec(line(start));if(!open)return false;
 if(silent)return true;
 let close=start+1;
 for(;close<end;close++){const match=/^(:{3,})\s*$/.exec(line(close));if(match&&match[1].length>=open[1].length)break;}
 const token=state.push('private_comment','aside',0);token.block=true;token.map=[start,Math.min(close+1,end)];
 token.content=state.getLines(start+1,close,state.blkIndent,false);
 state.line=Math.min(close+1,end);return true;
});
conductorMarkdown.renderer.rules.private_comment=(tokens,index,options,env)=>env.includePrivate
 ? '<aside data-private-note="true" class="conductor-private-note">'+conductorMarkdown.render(tokens[index].content,env)+'</aside>\n'
 : '';
export function renderConductor(value,images=[],{includePrivate=false}={}){return conductorMarkdown.render(String(value||''),{images,includePrivate});}
