import { drawShape } from './shapes.js';
import { WIDTH, HEIGHT, visibleBlocks, blockType, blockText } from './model.js';
import { javaLines, codeColor } from './code.js';
const backgrounds = new Map();
const images = new Map();
function imageAsset(src) {
  if (!images.has(src)) {
    const image = new Image();
    const entry = {image,ready:false,promise:null};
    entry.promise = new Promise(resolve=> { image.onload = ()=>{entry.ready=true;window.dispatchEvent(new Event('frame-images-ready'));resolve();}; image.onerror=()=>resolve(); });
    image.src=src; images.set(src,entry);
    if (images.size>100) images.delete(images.keys().next().value);
  }
  return images.get(src);
}
export async function prepareImages(slides) { await Promise.all(slides.flatMap(s=>Object.values(s.elements||{}).filter(e=>e.type==='image'&&e.src).map(e=>imageAsset(e.src).promise))); }
function drawImageBlock(ctx,s,key,theme) {
  const p=s.positions[key], e=s.elements[key], h=p.h||360;
  round(ctx,p.x,p.y,p.w,h,18,theme.panel);
  const asset=e.src?imageAsset(e.src):null;
  if (!asset?.ready) {
    const glow=ctx.createRadialGradient(p.x+p.w/2,p.y+h/2,0,p.x+p.w/2,p.y+h/2,p.w/2);glow.addColorStop(0,theme.accent+'28');glow.addColorStop(1,theme.panel);ctx.fillStyle=glow;ctx.fillRect(p.x+16,p.y+16,p.w-32,h-32);
    const cx=p.x+p.w/2, cy=p.y+h/2;
    ctx.strokeStyle=theme.accent;ctx.beginPath();ctx.moveTo(cx-45,cy+10);ctx.lineTo(cx-15,cy-25);ctx.lineTo(cx+8,cy);ctx.lineTo(cx+28,cy-15);ctx.lineTo(cx+50,cy+10);ctx.stroke();
    ctx.save();ctx.fillStyle=theme.ink;ctx.font='400 26px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('Importer une image',cx,cy+42);ctx.restore();
    return;
  }
  const img=asset.image, scale=e.fit==='cover'?Math.max(p.w/img.width,h/img.height):Math.min(p.w/img.width,h/img.height);
  ctx.save();ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,h,18);ctx.clip();ctx.drawImage(img,p.x+(p.w-img.width*scale)/2,p.y+(h-img.height*scale)/2,img.width*scale,img.height*scale);ctx.restore();
}
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
export function text(ctx, value, x, y, width, size, color, weight = 400, font = 'Arial', leading=1.35) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${font}`; ctx.textBaseline = 'top';
  const lines = wrapLines(ctx, value, width);
  lines.forEach((line, n) => ctx.fillText(line, x, y + n * size * leading));
  return lines.length * size * leading;
}
export function blockBounds(ctx, s, key) {
  const p = s.positions[key];
  if (['image','shape'].includes(blockType(s,key))) return {...p,h:p.h||360};
  if(blockType(s,key)==='code'){const value=blockText(s,key);const h=p.h||Math.max(260,value.split('\n').length*p.size*1.6+115);const size=Math.max(12,Math.min(p.size,(h-128)/(Math.max(1,blockText(s,key).split('\n').length)*1.6),(p.w-110)/(Math.max(1,...blockText(s,key).split('\n').map(l=>l.length))*0.61)));return {...p,h,size};}
  const leading=key==='title'||s.elements[key]?.weight===700?1.12:1.4, size=fitText(ctx,blockText(s,key),p,key==='title'||s.elements[key]?.weight===700?700:400,leading);ctx.font=`${key==='title'||s.elements[key]?.weight===700?700:400} ${size}px Arial`;return {...p,size,h:wrapLines(ctx,blockText(s,key),p.w).length*size*leading};
}
function background(ctx, theme) {
  const key=JSON.stringify([theme.bg,theme.accent,theme.secondary]);
  if (!backgrounds.has(key)) {
    const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT;
    const g = c.getContext('2d'); g.fillStyle = theme.bg; g.fillRect(0, 0, WIDTH, HEIGHT);
    const glow=g.createRadialGradient(1650,180,0,1650,180,1050);glow.addColorStop(0,theme.accent+'16');glow.addColorStop(1,theme.accent+'00');g.fillStyle=glow;g.fillRect(0,0,WIDTH,HEIGHT);
    const second=g.createRadialGradient(120,1000,0,120,1000,800);second.addColorStop(0,theme.secondary+'10');second.addColorStop(1,theme.secondary+'00');g.fillStyle=second;g.fillRect(0,0,WIDTH,HEIGHT);
    if(backgrounds.size>=30)backgrounds.clear();backgrounds.set(key, c);
  }
  ctx.drawImage(backgrounds.get(key), 0, 0);
}
function drawCode(ctx, s, theme, key) {
  const p = s.positions[key], b = blockBounds(ctx, s, key);
  const lines=javaLines(blockText(s,key));const size=Math.max(12,Math.min(p.size,(b.h-128)/(Math.max(1,lines.length)*1.6),(p.w-110)/(Math.max(1,...blockText(s,key).split('\n').map(l=>l.length))*0.61)));ctx.save();ctx.shadowColor=theme.bg+'80';ctx.shadowBlur=36;ctx.shadowOffsetY=16;
  round(ctx, p.x, p.y, p.w, b.h, 24, theme.panel);ctx.restore();
  let caption=key==='code'?(s.codeTitle||''):(s.elements[key]?.caption||'');ctx.font='400 21px monospace';if(ctx.measureText(caption).width>p.w-60){while(caption.length&&ctx.measureText(caption+'…').width>p.w-60)caption=caption.slice(0,-1);caption+='…';}text(ctx,caption.replaceAll('\n',' '),p.x+30,p.y+24,p.w-60,21,`${theme.ink}80`,400,'monospace');
  ctx.strokeStyle = `${theme.ink}15`; ctx.beginPath(); ctx.moveTo(p.x + 24, p.y + 72); ctx.lineTo(p.x + p.w - 24, p.y + 72); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(p.x + 12, p.y + 90, p.w - 24, b.h - 100); ctx.clip();
  javaLines(blockText(s,key)).forEach((segments, n) => {
    const y = p.y + 103 + n * size * 1.6;
    text(ctx, String(n + 1).padStart(2, ' '), p.x + 28, y + 4, 50, size * .75, `${theme.ink}45`, 400, 'monospace');
    let x = p.x + 80;
    ctx.font = `400 ${size}px monospace`; ctx.textBaseline = 'top';
    for (const token of segments) { ctx.fillStyle = codeColor(token.type, theme); ctx.fillText(token.text, x, y); x += ctx.measureText(token.text).width; }
  });
  ctx.restore();
}
export function fitText(ctx,value,p,weight,leading) {
  let size=p.size;if(!p.h)return size;
  while(size>16){ctx.font=`${weight} ${size}px Arial`;if(wrapLines(ctx,value,p.w).length*size*leading<=p.h)break;size-=1;}return size;
}
function decoration(ctx,s,key,t) {
  const p=s.positions[key],n=['body','text1','text2'].indexOf(key);if(n<0)return;
  if(['three','before-after','question'].includes(s.layout)) {
    round(ctx,p.x-32,p.y-104,p.w+64,(p.h||240)+144,24,t.panel);
    text(ctx,s.layout==='before-after'?(n===0?'AVANT':'APRÈS'):s.layout==='question'?'EXPLICATION':String(n+1).padStart(2,'0'),p.x,p.y-65,p.w,24,n===1?t.secondary:t.accent,700);
  }
  if(['steps','summary'].includes(s.layout)) {round(ctx,p.x-112,p.y,64,64,20,t.accent);text(ctx,String(n+1),p.x-92,p.y+13,40,28,t.bg,700);ctx.fillStyle=t.ink+'15';ctx.fillRect(p.x,p.y+(p.h||120)+24,p.w,2);}
  if(s.layout==='timeline') {ctx.fillStyle=t.accent;ctx.beginPath();ctx.arc(p.x+12,p.y-96,12,0,Math.PI*2);ctx.fill();ctx.fillStyle=t.accent+'40';ctx.fillRect(p.x+28,p.y-98,p.w-8,4);text(ctx,String(n+1).padStart(2,'0'),p.x,p.y-65,p.w,24,t.accent,700);}
  if(s.layout==='definition'&&key==='body'){ctx.fillStyle=t.accent;ctx.fillRect(p.x,p.y-56,120,6);}
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
    if(p.rotation){ctx.translate(p.x+p.w/2,p.y+(p.h||b.h)/2);ctx.rotate(p.rotation*Math.PI/180);ctx.translate(-p.x-p.w/2,-p.y-(p.h||b.h)/2);}
    if (f.animation !== 'none') ctx.globalAlpha *= ease;
    if (f.animation === 'up') ctx.translate(0, 35 * (1 - ease));
    if (f.animation === 'zoom') { const scale = .9 + ease * .1; ctx.translate(p.x + p.w / 2, p.y + b.h / 2); ctx.scale(scale, scale); ctx.translate(-p.x - p.w / 2, -p.y - b.h / 2); }
    if(s.designVersion===2 && key!=='title' && blockType(s,key)==='text') decoration(ctx,s,key,theme);
    if (key === 'title'||s.elements[key]?.weight===700) {
      const label=key==='title'?s.label:s.elements[key]?.label;if (label) text(ctx, label, p.x, Math.max(10, p.y - 58), p.w, 23, theme.accent, 700);
      const font=fitText(ctx,blockText(s,key),p,700,1.12);const color=['title','metric','definition'].includes(s.layout)?(()=>{const g=ctx.createLinearGradient(p.x,p.y,p.x+p.w,p.y+(p.h||b.h));g.addColorStop(0,theme.accent);g.addColorStop(1,theme.secondary);return g;})():theme.ink;text(ctx,blockText(s,key),p.x,p.y,p.w,font,color,700,'Arial',1.12);
    } else if (blockType(s,key)==='shape') drawShape(ctx,s.elements[key],p);
    else if (blockType(s,key)==='image') drawImageBlock(ctx,s,key,theme);
    else if (blockType(s,key)==='code') drawCode(ctx,s,theme,key);
    else text(ctx,blockText(s,key),p.x,p.y,p.w,fitText(ctx,blockText(s,key),p,400,1.4),`${theme.ink}df`,400,'Arial',1.4);
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
