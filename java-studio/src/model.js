export const WIDTH = 1920;
export const HEIGHT = 1080;
export const blocks = ['title', 'body', 'code'];
export const directions = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, down: { x: 0, y: 1 }, up: { x: 0, y: -1 } };
export const themes = [
  { id: 'mint', name: 'Terminal', accent: '#a5f3cf', bg: '#101d22', panel: '#16292f', ink: '#f2f7f6' },
  { id: 'violet', name: 'Midnight', accent: '#c4b5fd', bg: '#19172c', panel: '#25233d', ink: '#f6f3ff' },
  { id: 'amber', name: 'Carbon', accent: '#f5c878', bg: '#201d18', panel: '#302b23', ink: '#fff8eb' },
  { id: 'paper', name: 'Paper', accent: '#2563eb', bg: '#f3f5f9', panel: '#e4e9f1', ink: '#142034' },
];
export const presets = [
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
export function positionsFor(layout) {
  const p = {
    title: { x: 112, y: 210, w: 680, size: 76 },
    body: { x: 112, y: 440, w: 650, size: 31 },
    code: { x: 880, y: 260, w: 925, size: 29 },
  };
  if (layout === 'title') { p.title = { x: 150, y: 300, w: 1600, size: 100 }; p.body = { x: 150, y: 620, w: 1500, size: 36 }; }
  if (layout === 'code') { p.title = { x: 112, y: 120, w: 1690, size: 66 }; p.code = { x: 112, y: 280, w: 1690, size: 29 }; }
  if (layout === 'compare') { p.title = { x: 112, y: 160, w: 1600, size: 66 }; p.body = { x: 112, y: 370, w: 700, size: 34 }; p.code.y = 340; }
  if (layout === 'metric') { p.title = { x: 210, y: 280, w: 1500, size: 210 }; p.body = { x: 220, y: 635, w: 1490, size: 46 }; }
  if (layout === 'text') { p.title = { x: 150, y: 150, w: 1600, size: 80 }; p.body = { x: 150, y: 400, w: 1560, size: 42 }; }
  return p;
}
const pos = (x,y,w,size=38,h=360) => ({x,y,w,size,h});
export const layouts = {
  three: { title:pos(120,120,1650,76), body:pos(120,430,480), text1:pos(720,430,480), text2:pos(1320,430,480) },
  steps: { title:pos(120,110,1650,74), body:pos(200,330,1500), text1:pos(200,540,1500), text2:pos(200,750,1500) },
  'image-right': { title:pos(120,170,700,74), body:pos(120,430,700), image1:pos(950,180,820,38,680) },
  'image-left': { title:pos(1050,180,740,72), body:pos(1050,430,740), image1:pos(120,180,820,38,680) },
  'image-wide': { title:pos(120,80,1660,64), image1:pos(120,230,1680,38,600), body:pos(120,900,1650,30) },
  'image-focus': { title:pos(230,90,1450,64), image1:pos(330,250,1260,38,650) },
  'two-images': { title:pos(120,90,1680,64), image1:pos(120,250,790,38,460), image2:pos(1010,250,790,38,460), body:pos(120,770,790,32), text1:pos(1010,770,790,32) },
  'image-code': { title:pos(120,90,1680,64), image1:pos(120,280,740,38,570), code:pos(960,280,830,27) },
  quote: { title:pos(200,280,1500,100), body:pos(200,700,1400,36) },
  question: { title:pos(150,230,1600,92), body:pos(150,580,1450,44) },
  'before-after': { title:pos(120,100,1650,74), body:pos(120,380,730,44), text1:pos(1050,380,730,44) },
  timeline: { title:pos(120,120,1650,76), body:pos(120,500,480), text1:pos(720,500,480), text2:pos(1320,500,480) },
  definition: { title:pos(150,180,1600,120), body:pos(150,470,1540,44), text1:pos(150,750,1540,32) },
  summary: { title:pos(150,120,1600,84), body:pos(180,340,1500,42), text1:pos(180,550,1500,42), text2:pos(180,760,1500,42) },
};
export function blockType(s,key) { return s.elements?.[key]?.type || (key === 'code' ? 'code' : 'text'); }
export function blockText(s,key) { return s.elements?.[key]?.text ?? s[key] ?? ''; }
export function setBlockText(s,key,value) { if (s.elements?.[key]) s.elements[key].text = value; else s[key] = value; }
export function blockLabel(s,key) { return ({title:'Titre',body:'Texte 1',code:'Code Java'})[key] || s.elements?.[key]?.name || key; }
export function applyLayout(s,layout) {
  s.layout = layout;
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
  return s;
}
export function reorderSlides(slides,from,to) {
  if (from===to || from<0 || to<0 || from>=slides.length || to>=slides.length) return slides.slice();
  const result=slides.slice(), [item]=result.splice(from,1); result.splice(to,0,item); return result;
}
export function makeSlide(layout = 'split', grid = { x: 0, y: 0 }) {
  const s = { id: crypto.randomUUID(), exitDirection:'auto', elements:{}, title: layout === 'metric' ? '1 Go' : 'Une nouvelle idée.', body: layout === 'metric' ? '1 Go = 1 000 Mo\nUnités décimales · division par 1 000' : 'Double-clique pour écrire ton explication.', code: 'public class Example {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}', label: '', layout, grid: { ...grid }, positions: positionsFor(layout), fragments: Object.fromEntries(blocks.map(k => [k, { order: 0, animation: 'fade' }])) };
  applyLayout(s,layout);
  if (['three','steps','timeline','summary'].includes(layout)) { s.title = ({three:'Trois idées à comprendre.',steps:'Étape par étape.',timeline:'Du source à la JVM.',summary:'Ce qu’il faut retenir.'})[layout]; s.body='Première idée.'; ['body','text1','text2'].forEach((k,n)=>s.fragments[k]={order:n+1,animation:'up'}); }
  if (layout==='quote') s.title='« Comprendre avant d’automatiser. »';
  if (layout==='question') {s.title='Que se passe-t-il sous le capot ?';s.fragments.body.order=1;}
  return s;
}
const finite = (v, fallback, min, max) => Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export function normalizeSlide(raw, n = 0) {
  if (!raw || typeof raw !== 'object' || !blocks.every(k => typeof raw[k] === 'string') || !presets.some(p => p.id === raw.layout)) throw Error('Diapo invalide');
  const s = makeSlide(raw.layout, { x: n, y: 0 });
  s.id = typeof raw.id === 'string' ? raw.id : s.id;
  for (const k of [...blocks, 'label']) s[k] = typeof raw[k] === 'string' ? raw[k].slice(0, 100000) : '';
  s.exitDirection = ['auto',...Object.keys(directions)].includes(raw.exitDirection) ? raw.exitDirection : 'auto';
  if (raw.elements && typeof raw.elements === 'object') {
    s.elements = {};
    for (const [key,e] of Object.entries(raw.elements).slice(0,40)) {
      if (!/^(text|image)[a-zA-Z0-9_-]+$/.test(key) || !e || !['text','image'].includes(e.type)) continue;
      s.elements[key] = e.type === 'text' ? {type:'text',custom:e.custom===true||!['text1','text2','image1','image2'].includes(key),name:String(e.name || 'Texte').slice(0,100),text:String(e.text || '').slice(0,100000)} : {type:'image',custom:e.custom===true||!['text1','text2','image1','image2'].includes(key),name:String(e.name || 'Image').slice(0,100),src:validImageSource(e.src)?e.src:'',fit:e.fit==='cover'?'cover':'contain'};
    }
  }
  if (Array.isArray(raw.blockKeys)) s.blockKeys = [...new Set(raw.blockKeys.filter(k=>blocks.includes(k)||s.elements[k]))];
  for (const k of [...new Set([...blocks,...visibleBlocks(s)])]) {
    s.positions[k] ||= pos(150,500,1200);
    const p = raw.positions?.[k];
    if (p) for (const key of ['x', 'y', 'w', 'size', 'h']) s.positions[k][key] = finite(p[key], s.positions[k][key] ?? 360, key === 'size' ? 10 : key === 'w' ? 80 : 0, key === 'size' ? 260 : key === 'y' || key === 'h' ? HEIGHT : WIDTH);
    const f = raw.fragments?.[k];
    s.fragments[k] = { order: Math.round(finite(f?.order, 0, 0, 20)), animation: ['fade', 'up', 'zoom', 'none'].includes(f?.animation) ? f.animation : 'fade' };
  }
  if (raw.grid && Number.isInteger(raw.grid.x) && Number.isInteger(raw.grid.y)) s.grid = { x: finite(raw.grid.x, n, -10000, 10000), y: finite(raw.grid.y, 0, -10000, 10000) };
  return s;
}
export function validImageSource(src) { return typeof src === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src) && src.length < 3000000; }
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
    return s;
  });
}
