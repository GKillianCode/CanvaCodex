import { textRole } from './textRoles.js';
import { extraPresets, materializeTemplate, clearTemplateDecorations, buildExtraTemplate, separateLabels } from './editableTemplates.js';
import { normalizeTable } from './tables.js';
import { MAX_ELEMENTS } from './limits.js';
import { normalizeGroups } from './selection.js';
import { validSvgSource } from './svg.js';
import { normalizeTextStyle } from './textStyles.js';
import { normalizeFont } from './fonts.js';
import { normalizeShape } from './shapes.js';
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const blocks = ['title', 'body', 'code'];
export const directions = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, down: { x: 0, y: 1 }, up: { x: 0, y: -1 } };
export const DEFAULT_RESOLUTION = { width: 2560, height: 1440 };
export const resolutions = [
  {width:1280,height:720,name:'HD'}, {width:1920,height:1080,name:'Full HD'},
  {width:2560,height:1440,name:'QHD'}, {width:3840,height:2160,name:'4K'},
];
export function normalizeResolution(raw) {
  if (!raw || !Number.isInteger(raw.width) || !Number.isInteger(raw.height) || raw.width < 640 || raw.width > 3840 || raw.width % 16 !== 0 || raw.height !== raw.width * 9 / 16) return {...DEFAULT_RESOLUTION};
  return {width:raw.width,height:raw.height};
}
export const themes = [
  {id:'mint',name:'Terminal',desc:'Vert néon, noir profond.',accent:'#35ff91',secondary:'#38baff',bg:'#080d14',panel:'#121e2b',ink:'#f5f9ff'},
  {id:'violet',name:'Midnight',desc:'Violet électrique et rose lumineux.',accent:'#bb83ff',secondary:'#ff54cb',bg:'#100b21',panel:'#221735',ink:'#faf6ff'},
  {id:'amber',name:'Carbon',desc:'Ambre intense, précision et chaleur.',accent:'#ffbc25',secondary:'#ff7146',bg:'#120e09',panel:'#2b2217',ink:'#fff9ee'},
  {id:'paper',name:'Studio',desc:'Blanc doux, bleu franc, lignes nettes.',accent:'#2459ed',secondary:'#b33824',bg:'#f6f5f1',panel:'#ffffff',ink:'#171923',light:true},
  {id:'cobalt',name:'Cobalt',desc:'Bleu nuit et cyan éclatant.',accent:'#50baff',secondary:'#53f2d2',bg:'#07142e',panel:'#142644',ink:'#f1f8ff'},
  {id:'coral',name:'Corail',desc:'Orange corail, énergie sur fond sombre.',accent:'#ff784a',secondary:'#ffca67',bg:'#1a1015',panel:'#301d24',ink:'#fff6f2'},
  {id:'electric',name:'Volt',desc:'Jaune acide et vert électrique.',accent:'#dfff35',secondary:'#44eec5',bg:'#0e130d',panel:'#20291b',ink:'#f9ffe9'},
  {id:'magenta',name:'Pulse',desc:'Magenta vibrant, contraste assumé.',accent:'#ff61b7',secondary:'#bda0ff',bg:'#190d22',panel:'#311b3c',ink:'#fff4fc'},
  {id:'glacier',name:'Glacier',desc:'Un fond clair, du bleu et du relief.',accent:'#0068cd',secondary:'#006f73',bg:'#edf7ff',panel:'#ffffff',ink:'#10223d',light:true},
  {id:'sunset',name:'Sunset',desc:'Orange solaire et rose sur fond prune.',accent:'#ff9b53',secondary:'#ff68bb',bg:'#25122d',panel:'#3b2444',ink:'#fff6ef'},
];
export const presets = [
  ...extraPresets,
  { id: 'split', name: 'Explication + code', desc: 'Le concept à gauche, l’exemple à droite.' },
  { id: 'title', name: 'Ouverture', desc: 'Un titre et une idée forte.' },
  { id: 'code', name: 'Code en grand', desc: 'Toute la place pour lire le Java.' },
  { id: 'compare', name: 'Deux colonnes', desc: 'Explication et exemple côte à côte.' },
  { id: 'metric', name: 'Chiffre ou unité', desc: 'Une unité en grand, sa conversion dessous.' },
  { id: 'text', name: 'Texte en grand', desc: 'Développer une explication sans code.' },
  ...[
    ['three','Trois idées','Trois textes indépendants, trois clics.'],
    ['steps','Étapes verticales','Un raisonnement en trois étapes.'],
    ['image-right','Texte + image','Une illustration à droite du concept.'],
    ['image-left','Image + texte','L’illustration ouvre la lecture.'],
    ['image-wide','Image panoramique','Une image large et sa légende.'],
    ['image-focus','Image centrale','Toute l’attention sur une illustration.'],
    ['two-images','Duo d’images','Deux captures et leurs explications.'],
    ['image-code','Capture + code','Une capture confrontée au Java.'],
    ['quote','Citation','Une phrase forte et son attribution.'],
    ['question','Question / réponse','Poser une question, révéler la réponse.'],
    ['before-after','Avant / après','Deux états, deux textes indépendants.'],
    ['timeline','Chronologie','Trois moments alignés horizontalement.'],
    ['definition','Définition','Un terme et deux précisions.'],
    ['summary','À retenir','Trois points pour conclure.'],
  ].map(([id,name,desc]) => ({id,name,desc})),
];
export function visibleBlocks(s) {
  if (s.blockKeys) return [...s.blockKeys, ...Object.keys(s.elements || {}).filter(k => s.elements[k].custom && !s.blockKeys.includes(k))];
  if (s.layout === 'code') return ['title', 'code'];
  if (['title', 'metric', 'text'].includes(s.layout)) return ['title', 'body'];
  return blocks;
}
const pos = (x,y,w,size=38,h=360) => ({x,y,w,size,h});
// All templates share a 128 px margin and an 8 px spacing rhythm.
export const layouts = {
  split:{title:pos(128,208,688,86,248),body:pos(128,544,688,34,344),code:pos(928,208,864,29,680)},
  title:{title:pos(128,312,1664,124,304),body:pos(128,720,1280,36,152)},
  code:{title:pos(128,128,1664,76,120),code:pos(128,320,1664,32,624)},
  compare:{title:pos(128,128,1664,80,152),body:pos(128,400,720,38,456),code:pos(1008,376,784,29,544)},
  metric:{title:pos(128,240,1664,220,280),body:pos(128,672,1568,46,224)},
  text:{title:pos(128,160,1664,90,176),body:pos(128,440,1472,44,440)},
  three:{title:pos(128,128,1664,84,152),body:pos(160,480,440,44,320),text1:pos(752,480,440,44,320),text2:pos(1344,480,416,44,320)},
  steps:{title:pos(128,96,1664,84,152),body:pos(256,336,1408,42,144),text1:pos(256,568,1408,42,144),text2:pos(256,800,1408,42,144)},
  'image-right':{title:pos(128,208,688,86,232),body:pos(128,544,688,36,280),image1:pos(960,160,832,38,760)},
  'image-left':{title:pos(1056,208,736,82,232),body:pos(1056,544,736,36,280),image1:pos(128,160,800,38,760)},
  'image-wide':{title:pos(128,96,1664,72,112),image1:pos(128,280,1664,38,528),body:pos(128,880,1472,30,96)},
  'image-focus':{title:pos(128,96,1664,72,112),image1:pos(128,296,1664,38,640)},
  'two-images':{title:pos(128,96,1664,72,112),image1:pos(128,280,784,38,420),image2:pos(1008,280,784,38,420),body:pos(128,784,784,32,152),text1:pos(1008,784,784,32,152)},
  'image-code':{title:pos(128,96,1664,72,112),image1:pos(128,320,744,38,592),code:pos(976,296,816,29,640)},
  quote:{title:pos(224,320,1472,104,304),body:pos(224,768,1280,32,104)},
  question:{title:pos(128,256,1472,104,256),body:pos(192,720,1472,42,144)},
  'before-after':{title:pos(128,128,1664,84,152),body:pos(168,488,688,46,288),text1:pos(1064,488,688,46,288)},
  timeline:{title:pos(128,128,1664,84,152),body:pos(160,536,432,42,264),text1:pos(752,536,432,42,264),text2:pos(1344,536,416,42,264)},
  definition:{title:pos(128,224,1664,142,184),body:pos(128,560,1472,44,160),text1:pos(128,824,1472,30,104)},
  summary:{title:pos(128,128,1664,84,152),body:pos(240,344,1440,40,120),text1:pos(240,576,1440,40,120),text2:pos(240,808,1440,40,120)},
};
export function positionsFor(layout) {
  const base={title:pos(128,208,688,86,248),body:pos(128,544,688,34,344),code:pos(928,208,864,29,680)};
  return {...base,...structuredClone(layouts[layout]||{})};
}
export function blockType(s,key) { return s.elements?.[key]?.type || (key === 'code' ? 'code' : 'text'); }
export function blockText(s,key) { return s.elements?.[key]?.text ?? s[key] ?? ''; }
export function setBlockText(s,key,value) { if (s.elements?.[key]) s.elements[key].text = value; else s[key] = value; }
export function blockLabel(s,key) { return (s.blockNames?.[key]||s.elements?.[key]?.name||'').trim()||({title:'Titre',body:'Texte 1',code:'Code Java'})[key]||key; }
export function setBlockName(s,key,value){if(!visibleBlocks(s).includes(key))return;const name=String(value||'').slice(0,100);if(s.elements?.[key])s.elements[key].name=name;else {s.blockNames||={};if(name.trim())s.blockNames[key]=name;else delete s.blockNames[key];}}

export function applyLayout(s,layout) {
  const typography=Object.fromEntries(Object.entries(s.positions||{}).map(([key,p])=>[key,{...(p.font?{font:p.font}:{}),...(p.textRole?{textRole:p.textRole}:{}),...(p.textStyle?{textStyle:JSON.parse(JSON.stringify(p.textStyle))}:{})}]));
  s.layout = layout;
  clearTemplateDecorations(s);
  s.designVersion = 3;
  s.positions = {...s.positions, ...positionsFor(layout)};
  const spec = layouts[layout];
  s.blockKeys = spec ? [...new Set(['title',...Object.keys(spec)])] : layout === 'code' ? ['title','code'] : ['title','metric','text'].includes(layout) ? ['title','body'] : blocks.slice();
  s.elements ||= {};
  // Preserve custom blocks and imported images when switching compositions.
  for (const [key,p] of Object.entries(spec || {})) {
    s.positions[key] = {...p};
    if (!blocks.includes(key) && !s.elements[key]) s.elements[key] = key.startsWith('image') ? {type:'image',name:'Image '+key.slice(5),src:'',fit:'contain'} : {type:'text',name:'Texte '+(Number(key.slice(4))+1),text:key==='text1'?'Deuxième idée.':'Troisième idée.'};
  }
  for (const key of visibleBlocks(s)) {
    s.positions[key] ||= pos(150,500,1200);
    s.fragments[key] ||= {order:0,animation:'fade'};
  }
  for(const [key,style] of Object.entries(typography))if(s.positions[key])Object.assign(s.positions[key],style);
  materializeTemplate(s);buildExtraTemplate(s);
  for(const key of visibleBlocks(s))if(blockType(s,key)==='text'){const role=textRole(s,key);s.positions[key].textRole||=role.id;s.positions[key].font||=role.font;}else if(blockType(s,key)==='code')s.positions[key].font||='monospace';
  return s;
}
export function reorderSlides(slides,from,to) {
  if (from===to || from<0 || to<0 || from>=slides.length || to>=slides.length) return slides.slice();
  const result=slides.slice(), [item]=result.splice(from,1); result.splice(to,0,item); return result;
}
export function makeSlide(layout = 'split', grid = { x: 0, y: 0 }) {
  const s = { id: crypto.randomUUID(), exitDirection:'auto', elements:{}, title: layout === 'metric' ? '1 Go' : extraPresets.find(p=>p.id===layout)?.name || 'Une nouvelle idée.', body: layout === 'metric' ? '1 Go = 1 000 Mo\nUnités décimales · division par 1 000' : 'Double-clique pour écrire ton explication.', code: 'public class Example {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}', label: '', codeTitle:'', layout, grid: { ...grid }, positions: positionsFor(layout), fragments: Object.fromEntries(blocks.map(k => [k, { order: 0, animation: 'fade' }])) };
  applyLayout(s,layout);
  if (['three','steps','timeline','summary'].includes(layout)) { s.title = ({three:'Trois idées à comprendre.',steps:'Étape par étape.',timeline:'Du source à la JVM.',summary:'Ce qu’il faut retenir.'})[layout]; s.body='Première idée.'; ['body','text1','text2'].forEach((k,n)=>s.fragments[k]={order:n+1,animation:'up'}); }
  if (['three','steps','timeline','summary'].includes(layout)) {s.body='Écrire.\nUn fichier source .java.';s.elements.text1.text='Compiler.\nLe bytecode prend forme.';s.elements.text2.text='Exécuter.\nLa JVM prend le relais.';}
  if (layout==='before-after') {s.body='Du code source lisible.\nHello.java';s.elements.text1.text='Des instructions portables.\nHello.class';}
  if (layout==='definition') {s.title='Bytecode.';s.body='Le langage intermédiaire que la JVM exécute.';s.elements.text1.text='Portable par conception. Optimisé à l’exécution.';}
  if (layout==='quote') s.title='« Comprendre avant d’automatiser. »';
  if (layout==='question') {s.title='Que se passe-t-il sous le capot ?';s.fragments.body.order=1;}
  for(const [k,e] of Object.entries(s.elements))if(e.template){const owner=k.includes('Extra')?null:s.blockKeys.slice(s.blockKeys.indexOf(k)+1).find(key=>!s.elements[key]?.template);if(owner)s.fragments[k]={...s.fragments[owner]};}
  for(const key of visibleBlocks(s))if(blockType(s,key)==='text'){const role=textRole(s,key);s.positions[key].textRole=role.id;s.positions[key].font||=role.font;}else if(blockType(s,key)==='code')s.positions[key].font||='monospace';
  return s;
}
const finite = (v, fallback, min, max) => Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export function normalizeSlide(raw, n = 0) {
  if (!raw || typeof raw !== 'object' || !blocks.every(k => typeof raw[k] === 'string') || !presets.some(p => p.id === raw.layout)) throw Error('Diapo invalide');
  const s = makeSlide(raw.layout, { x: n, y: 0 });
  clearTemplateDecorations(s);s.blockKeys=s.blockKeys.filter(k=>blocks.includes(k)||s.elements[k]);
  s.designVersion = [2,3].includes(raw.designVersion) ? raw.designVersion : 1;
  s.id = typeof raw.id === 'string' ? raw.id : s.id;
  for (const k of [...blocks, 'label', 'codeTitle']) s[k] = typeof raw[k] === 'string' ? raw[k].slice(0, 100000) : '';
  s.codeTitle=s.codeTitle.slice(0,200);
  s.exitDirection = ['auto',...Object.keys(directions)].includes(raw.exitDirection) ? raw.exitDirection : 'auto';
  if (raw.elements && typeof raw.elements === 'object') {
    s.elements = {};
    for (const [key,e] of Object.entries(raw.elements).slice(0,MAX_ELEMENTS)) {
      if (!/^(text|image|code|shape|table)[a-zA-Z0-9_-]+$/.test(key) || !e || !['text','image','code','shape','table'].includes(e.type)) continue;
      if(e.type==='table'){s.elements[key]=normalizeTable(e);continue;}
      if(e.type==='shape'){s.elements[key]=normalizeShape(e);continue;}
      s.elements[key] = e.type !== 'image' ? {type:e.type,weight:e.weight===700?700:400,label:String(e.label||'').slice(0,100),caption:String(e.caption||'').slice(0,200),template:e.template===true,custom:e.custom===true||e.custom!==false&&!['text1','text2','image1','image2'].includes(key),name:String(e.name || 'Texte').slice(0,100),text:String(e.text || '').slice(0,100000)} : {type:'image',template:e.template===true,custom:e.custom===true||e.custom!==false&&!['text1','text2','image1','image2'].includes(key),name:String(e.name || 'Image').slice(0,100),src:validImageSource(e.src)?e.src:'',fit:e.fit==='cover'?'cover':'contain',background:e.background===true,roundedCorners:e.roundedCorners===true,cornerRadius:finite(e.cornerRadius,10,0,50)};
    }
  }
  if (Array.isArray(raw.blockKeys)) s.blockKeys = [...new Set(raw.blockKeys.filter(k=>blocks.includes(k)||s.elements[k]))];
  for (const k of [...new Set([...blocks,...visibleBlocks(s)])]) {
    s.positions[k] ||= pos(150,500,1200);
    const p = raw.positions?.[k];
    // Restoring is not an edit: keep valid geometry, including rotated/off-stage anchors
    // and thin line frames. UI minimums must not move saved objects on reload.
    if (p) for (const key of ['x', 'y', 'w', 'size', 'h']) {
      if (key === 'h' && !Number.isFinite(p.h)) { delete s.positions[k].h; continue; }
      s.positions[k][key] = finite(p[key], s.positions[k][key] ?? 360,
        key === 'size' ? 10 : key === 'x' || key === 'y' ? -10000 : 1,
        key === 'size' ? 260 : 10000);
    }
    if (s.designVersion === 1 && p && !Number.isFinite(p.h) && !['image','shape'].includes(blockType(s,k))) delete s.positions[k].h;
    s.positions[k].autoSize=p?.autoSize===true&&blockType(s,k)==='text';
    if(s.positions[k].autoSize)s.positions[k].wrapWidth=finite(p?.wrapWidth,1200,80,WIDTH);
    s.positions[k].textRole=['title','subtitle','body'].includes(p?.textRole)?p.textRole:textRole(s,k).id;
    s.positions[k].font=normalizeFont(p?.font||(blockType(s,k)==='text'?textRole(s,k).font:undefined),blockType(s,k));
    if(p?.textStyle&&typeof p.textStyle==='object'&&!['shape','image'].includes(blockType(s,k)))s.positions[k].textStyle=normalizeTextStyle(p.textStyle,s.positions[k].font,blockType(s,k),k==='title'||s.elements[k]?.weight===700);
    s.positions[k].rotation=Number.isFinite(Number(p?.rotation))?((Number(p.rotation)%360)+360)%360:0;
    const f = raw.fragments?.[k];
    s.fragments[k] = { order: Math.round(finite(f?.order, 0, 0, 20)), animation: ['fade', 'up', 'zoom', 'none'].includes(f?.animation) ? f.animation : 'fade' };
  }
  if (raw.grid && Number.isInteger(raw.grid.x) && Number.isInteger(raw.grid.y)) s.grid = { x: finite(raw.grid.x, n, -10000, 10000), y: finite(raw.grid.y, 0, -10000, 10000) };
  s.blockNames=Object.fromEntries(blocks.filter(k=>typeof raw.blockNames?.[k]==='string'&&raw.blockNames[k].trim()).map(k=>[k,raw.blockNames[k].trim().slice(0,100)]));
  if(s.designVersion===2)materializeTemplate(s);
  separateLabels(s);
  s.groups=normalizeGroups(raw.groups,visibleBlocks(s));
  return s;
}
export function validImageSource(src) { return typeof src === 'string' && src.length < 3000000 && (/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src)||validSvgSource(src)); }
export function normalizeSlides(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) throw Error('Projet invalide');
  const used = new Set(), ids = new Set();
  return raw.map((r, n) => { const s = normalizeSlide(r, n); if (ids.has(s.id)) s.id = crypto.randomUUID(); ids.add(s.id); while (used.has(`${s.grid.x},${s.grid.y}`)) s.grid.x++; used.add(`${s.grid.x},${s.grid.y}`); return s; });
}
export function fragmentOrders(s) { return [...new Set(visibleBlocks(s).map(k => s.fragments[k].order).filter(n => n > 0))].sort((a, b) => a - b); }
export function neighbor(slides, index, direction) {
  const d = directions[direction], origin = slides[index]?.grid;
  if (!d || !origin) return -1;
  let result = -1, distance = Infinity;
  slides.forEach((s, n) => { const dx = s.grid.x - origin.x, dy = s.grid.y - origin.y; const along = dx * d.x + dy * d.y; const across = dx * d.y - dy * d.x; if (along > 0 && across === 0 && along < distance) { distance = along; result = n; } });
  return result;
}
export function nextFreeGrid(slides, origin, direction) {
  const d = directions[direction] || directions.right;
  const p = { x: origin.x + d.x, y: origin.y + d.y };
  while (slides.some(s => s.grid.x === p.x && s.grid.y === p.y)) { p.x += d.x; p.y += d.y; }
  return p;
}
export function transitionDirection(from, to) {
  if (from.exitDirection && from.exitDirection !== 'auto' && directions[from.exitDirection]) { const d=directions[from.exitDirection]; return {x:-d.x,y:-d.y}; }
  const dx = to.grid.x - from.grid.x, dy = to.grid.y - from.grid.y;
  return Math.abs(dy) > Math.abs(dx) ? { x: 0, y: Math.sign(dy) } : { x: Math.sign(dx) || 1, y: 0 };
}
export function memorySlides(grid) {
  return ['Go', 'Mo', 'Ko', 'octet'].map((unit, n) => {
    const s = makeSlide('metric', { x: grid.x, y: grid.y + n });
    s.title = `1 ${unit}`;
    s.label = 'LA MÉMOIRE, ÉTAPE PAR ÉTAPE';
    s.body = n < 3 ? `1 ${unit} ÷ 1 000 = 1 ${['Mo', 'Ko', 'octet'][n]}\nMême quantité : 1 ${unit} = 1 000 ${['Mo', 'Ko', 'octets'][n]}` : '1 octet = 8 bits\nGo, Mo et Ko : unités décimales.\nGiB, MiB et KiB : puissances de 1 024.';
    s.fragments.body = { order: 1, animation: 'up' };
    s.positions.body.size = n === 3 ? 38 : 50;
    materializeTemplate(s);
    return s;
  });
}

export function normalizeFrame(raw={}){return {header:raw?.header===true,footer:raw?.footer===true,gradient:raw?.gradient!==false};}
