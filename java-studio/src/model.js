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
];
export function visibleBlocks(s) {
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
export function makeSlide(layout = 'split', grid = { x: 0, y: 0 }) {
  return { id: crypto.randomUUID(), title: layout === 'metric' ? '1 Go' : 'Une nouvelle idée.', body: layout === 'metric' ? '1 Go = 1 000 Mo\nUnités décimales · division par 1 000' : 'Double-clique pour écrire ton explication.', code: 'public class Example {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}', label: '', layout, grid: { ...grid }, positions: positionsFor(layout), fragments: Object.fromEntries(blocks.map(k => [k, { order: 0, animation: 'fade' }])) };
}
const finite = (v, fallback, min, max) => Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export function normalizeSlide(raw, n = 0) {
  if (!raw || typeof raw !== 'object' || !blocks.every(k => typeof raw[k] === 'string') || !presets.some(p => p.id === raw.layout)) throw Error('Diapo invalide');
  const s = makeSlide(raw.layout, { x: n, y: 0 });
  s.id = typeof raw.id === 'string' ? raw.id : s.id;
  for (const k of [...blocks, 'label']) s[k] = typeof raw[k] === 'string' ? raw[k].slice(0, 100000) : '';
  for (const k of blocks) {
    const p = raw.positions?.[k];
    if (p) for (const key of ['x', 'y', 'w', 'size']) s.positions[k][key] = finite(p[key], s.positions[k][key], key === 'size' ? 10 : key === 'w' ? 80 : 0, key === 'size' ? 260 : key === 'y' ? HEIGHT : WIDTH);
    const f = raw.fragments?.[k];
    s.fragments[k] = { order: Math.round(finite(f?.order, 0, 0, 20)), animation: ['fade', 'up', 'zoom', 'none'].includes(f?.animation) ? f.animation : 'fade' };
  }
  if (raw.grid && Number.isInteger(raw.grid.x) && Number.isInteger(raw.grid.y)) s.grid = { x: finite(raw.grid.x, n, -100, 100), y: finite(raw.grid.y, 0, -100, 100) };
  return s;
}
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
