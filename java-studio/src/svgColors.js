import {validSvgSource,safeSvg} from './svg.js';
import {boundColor,validColorRole} from './colors.js';
const hex=value=>/^#[\da-f]{6}$/i.test(value||'');
const paint=value=>{const v=value.trim().toLowerCase();return /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+/-]+\)|[a-z]+)$/i.test(v)&&!['none','inherit','initial','unset','revert','transparent','context-fill','context-stroke'].includes(v)?v:null;};
const cache=new Map(),rendered=new WeakMap();
const tags=/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
function usesDefaultFill(markup){const stack=[true];let used=false;for(const tag of markup.match(tags)||[]){if(/^<\//.test(tag)){if(stack.length>1)stack.pop();continue;}if(/^<[!?]/.test(tag))continue;const style=/\sstyle\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]||'',inline=[...style.matchAll(/(?:^|;)\s*fill\s*:\s*([^;]+)/gi)].at(-1)?.[1],fill=(inline??/\sfill\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2])?.trim().toLowerCase(),inherited=!fill||['inherit','unset'].includes(fill),isDefault=inherited?stack.at(-1):false;if(/^<(?:path|rect|circle|ellipse|polygon|polyline|text|use)\b/i.test(tag)&&isDefault)used=true;if(!/\/\s*>$/.test(tag))stack.push(isDefault);}return used;}
function decode(src){return decodeURIComponent(escape(atob(src.split(',')[1])));}
function encode(text){return 'data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(text)));}
function mapStyle(style,visit){return style.replace(/(^|[;{])(\s*(?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*:\s*)([^;}]+)/gi,(all,sep,name,value)=>{const important=/\s*!important\s*$/i.test(value),raw=value.replace(/\s*!important\s*$/i,'').trim(),key=paint(raw);return key?sep+name+visit(key,raw)+(important?' !important':''):all;});}
function mapPaints(text,visit){
 const blocks=text.replace(/<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi,(all,attrs,css)=>'<style'+(attrs||'')+'>'+mapStyle(css,visit)+'</style>');
 return blocks.replace(tags,tag=>{
 if(tag.startsWith('<!'))return tag;
 return tag.replace(/(\s(?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*)(["'])(.*?)\2/gi,(all,before,q,value)=>{const key=paint(value);return key?before+q+visit(key,value)+q:all;}).replace(/(\sstyle\s*=\s*)(["'])(.*?)\2/gi,(all,before,q,style)=>before+q+mapStyle(style,visit)+q);
 });}
function sourceInfo(src){if(cache.has(src))return cache.get(src);if(!validSvgSource(src))return null;
 let markup=decode(src);const keys=new Set();mapPaints(markup,key=>{keys.add(key);return key;});
 // A vector without a declared paint uses SVG's default black fill.
 if(usesDefaultFill(markup)){markup=markup.replace(/<svg\b(?:[^>"']|"[^"]*"|'[^']*')*>/i,root=>{let next=root.replace(/(\sfill\s*=\s*)(["'])(?:inherit|unset)\2/i,'$1$2#000000$2').replace(/(fill\s*:\s*)(?:inherit|unset)(?=\s*(?:;|["']))/gi,'$1#000000');if(!/\sfill\s*=/.test(next))next=next.replace(/<svg\b/i,'<svg fill="#000000"');return next;});keys.add('#000000');}
 const info={markup,colors:[...keys].slice(0,128)};cache.set(src,info);if(cache.size>8)cache.delete(cache.keys().next().value);return info;
}
export function svgColors(src){return sourceInfo(src)?.colors||[];}
export function normalizeSvgColors(raw,src){const keys=new Set(svgColors(src));return Object.fromEntries(Object.entries(raw&&typeof raw==='object'?raw:{}).filter(([key,value])=>keys.has(key)&&value&&hex(value.color)).map(([key,value])=>[key,{color:value.color.toLowerCase(),colorRole:validColorRole(value.colorRole)}]));}
function preserveAlpha(original,color){const long=/^#([\da-f]{8})$/i.exec(original),short=/^#([\da-f]{4})$/i.exec(original);if(long)return color+long[1].slice(6);if(short)return color+short[1][3].repeat(2);const rgba=/^(?:rgb|hsl)a?\((.*)\)$/i.exec(original);if(rgba){const parts=rgba[1].split(/[\s,/]+/).filter(Boolean);if(parts.length===4&&/^(?:\d*\.?\d+%?)$/.test(parts[3]))return `rgb(${parseInt(color.slice(1,3),16)} ${parseInt(color.slice(3,5),16)} ${parseInt(color.slice(5,7),16)} / ${parts[3]})`; }return color;}
export function svgImageSource(element,theme={}){if(!element.svgColors||!Object.keys(element.svgColors).length)return element.src;
 const info=sourceInfo(element.src);if(!info)return element.src;const replacements=normalizeSvgColors(element.svgColors,element.src);
 const signature=JSON.stringify(Object.entries(replacements).map(([key,value])=>[key,boundColor(value,'color',theme)]));const prior=rendered.get(element);if(prior?.source===element.src&&prior.signature===signature)return prior.result;
 const markup=mapPaints(info.markup,(key,original)=>{const binding=replacements[key],color=binding&&boundColor(binding,'color',theme);return hex(color)?preserveAlpha(original,color):original;});
 const result=safeSvg(markup)?encode(markup):element.src;rendered.set(element,{source:element.src,signature,result});return result;
}
