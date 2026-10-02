import { WIDTH, HEIGHT, visibleBlocks } from './model.js';
import { javaLines, codeColor } from './code.js';
const backgrounds = new Map();
export function round(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
export function wrapLines(ctx, value, width) {
  const lines = [];
  for (const line of String(value).split('\n')) {
    let pending = '';
    for (const word of line.split(' ')) {
      const candidate = pending ? `${pending} ${word}` : word;
      if (ctx.measureText(candidate).width > width && pending) { lines.push(pending); pending = word; }
      else pending = candidate;
    }
    lines.push(pending);
  }
  return lines;
}
export function text(ctx, value, x, y, width, size, color, weight = 400, font = 'Arial') {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, value, width);
  lines.forEach((line, n) => ctx.fillText(line, x, y + n * size * 1.35));
  return lines.length * size * 1.35;
}
export function blockBounds(ctx, s, key) {
  const p = s.positions[key];
  if (key === 'code') return { ...p, h: Math.max(260, s.code.split('\n').length * p.size * 1.6 + 115) };
  ctx.font = `${key === 'title' ? 700 : 400} ${p.size}px Arial`;
  return { ...p, h: wrapLines(ctx, s[key], p.w).length * p.size * 1.35 };
}
function background(ctx, theme) {
  if (!backgrounds.has(theme.id)) {
    const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT;
    const g = c.getContext('2d'); g.fillStyle = theme.bg; g.fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle = `${theme.accent}09`;
    for (let x = 0; x < WIDTH; x += 40) for (let y = 0; y < HEIGHT; y += 40) g.fillRect(x, y, 1.5, 1.5);
    backgrounds.set(theme.id, c);
  }
  ctx.drawImage(backgrounds.get(theme.id), 0, 0);
}
function drawCode(ctx, s, theme) {
  const p = s.positions.code, b = blockBounds(ctx, s, 'code');
  round(ctx, p.x, p.y, p.w, b.h, 18, theme.panel);
  text(ctx, 'Java', p.x + 30, p.y + 24, p.w - 60, 21, `${theme.ink}80`, 400, 'monospace');
  ctx.strokeStyle = `${theme.ink}15`; ctx.beginPath(); ctx.moveTo(p.x + 24, p.y + 72); ctx.lineTo(p.x + p.w - 24, p.y + 72); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(p.x + 12, p.y + 90, p.w - 24, b.h - 100); ctx.clip();
  javaLines(s.code).forEach((segments, n) => {
    const y = p.y + 103 + n * p.size * 1.6;
    text(ctx, String(n + 1).padStart(2, ' '), p.x + 28, y + 4, 50, p.size * .75, `${theme.ink}45`, 400, 'monospace');
    let x = p.x + 80;
    ctx.font = `400 ${p.size}px monospace`; ctx.textBaseline = 'top';
    for (const token of segments) { ctx.fillStyle = codeColor(token.type, theme); ctx.fillText(token.text, x, y); x += ctx.measureText(token.text).width; }
  });
  ctx.restore();
}
export function renderSlide(ctx, s, theme, options = {}) {
  background(ctx, theme);
  const { header = false, footer = false, project = '', n = 0, total = 1, order = Infinity, motion = null, omit = null, now = performance.now() } = options;
  if (header) {
    text(ctx, 'JAVA / SOUS LE CAPOT', 112, 60, 1300, 22, theme.accent, 700);
    text(ctx, `${String(n + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, 1650, 60, 210, 22, theme.ink, 400, 'monospace');
  }
  for (const key of visibleBlocks(s)) {
    if (omit === key) continue;
    const f = s.fragments[key];
    if (f.order > order) continue;
    const p = s.positions[key], b = blockBounds(ctx, s, key);
    const progress = motion && f.order > 0 && f.order === motion.order ? Math.min(1, Math.max(0, (now - motion.started) / 360)) : 1;
    const ease = 1 - (1 - progress) ** 3;
    ctx.save();
    if (f.animation !== 'none') ctx.globalAlpha *= ease;
    if (f.animation === 'up') ctx.translate(0, 35 * (1 - ease));
    if (f.animation === 'zoom') { const scale = .9 + ease * .1; ctx.translate(p.x + p.w / 2, p.y + b.h / 2); ctx.scale(scale, scale); ctx.translate(-p.x - p.w / 2, -p.y - b.h / 2); }
    if (key === 'title') {
      if (s.label) text(ctx, s.label, p.x, Math.max(10, p.y - 58), p.w, 23, theme.accent, 700);
      text(ctx, s.title, p.x, p.y, p.w, p.size, theme.ink, 700);
    } else if (key === 'body') text(ctx, s.body, p.x, p.y, p.w, p.size, `${theme.ink}c8`);
    else drawCode(ctx, s, theme);
    ctx.restore();
  }
  if (footer) {
    ctx.strokeStyle = `${theme.ink}18`; ctx.beginPath(); ctx.moveTo(112, 972); ctx.lineTo(1808, 972); ctx.stroke();
    text(ctx, project, 112, 1005, 1450, 20, `${theme.ink}70`);
    text(ctx, 'FRAME', 1710, 1005, 120, 20, theme.accent, 700);
  }
}
export function renderBanner(ctx, b, t) {
  if (b.type === 'lower') {
    round(ctx, 110, 800, 1660, 190, 16, t.bg); round(ctx, 110, 800, 9, 190, 4, t.accent);
    text(ctx, b.subtitle, 155, 835, 1570, 25, t.accent, 700); text(ctx, b.title, 155, 883, 1570, 48, t.ink, 700);
  } else if (b.type === 'chapter') {
    round(ctx, 200, 385, 1520, 300, 20, t.bg);
    text(ctx, b.subtitle, 265, 435, 1370, 27, t.accent, 700); text(ctx, b.title, 265, 495, 1370, 64, t.ink, 700);
  } else {
    round(ctx, 1080, 80, 730, 240, 16, t.bg);
    text(ctx, 'À RETENIR', 1120, 112, 640, 24, t.accent, 700); text(ctx, b.title, 1120, 163, 640, 42, t.ink, 700);
  }
}
