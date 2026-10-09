import {drawBits} from './bits.js';
import {applyLetterSpacing,textLeading} from './textSpacing.js';
import { objectOpacity } from './objectOpacity.js';
import { resolvedAnimation,motionState } from './motion.js';
import { enclosingBounds } from './selection.js';
import { normalizeOverlay } from './overlays.js';
import { layoutText } from './textLists.js';
import { textRole } from './textRoles.js';
import { drawTable } from './tables.js';
import { textColor, getTextStyle, normalizeTextStyle, styleFont } from './textStyles.js';
import { fontCss } from './fonts.js';
import { drawShape,shapeBounds } from './shapes.js';
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
export function imageDrawingRect(p,img,fit='contain') {
  const h=p.h||360, scale=fit==='cover'?Math.max(p.w/img.width,h/img.height):Math.min(p.w/img.width,h/img.height);
  const w=img.width*scale, height=img.height*scale;
  return {x:p.x+(p.w-w)/2,y:p.y+(h-height)/2,w,h:height};
}
export function drawImageBlock(ctx,s,key,theme) {
  const p=s.positions[key], e=s.elements[key], h=p.h||360;
  if(!e.src||e.background)round(ctx,p.x,p.y,p.w,h,18,theme.panel);
  const asset=e.src?imageAsset(e.src):null;
  if (!asset?.ready) {
    const glow=ctx.createRadialGradient(p.x+p.w/2,p.y+h/2,0,p.x+p.w/2,p.y+h/2,p.w/2);glow.addColorStop(0,theme.accent+'28');glow.addColorStop(1,theme.panel);ctx.fillStyle=glow;ctx.fillRect(p.x+16,p.y+16,p.w-32,h-32);
    const cx=p.x+p.w/2, cy=p.y+h/2;
    ctx.strokeStyle=theme.accent;ctx.beginPath();ctx.moveTo(cx-45,cy+10);ctx.lineTo(cx-15,cy-25);ctx.lineTo(cx+8,cy);ctx.lineTo(cx+28,cy-15);ctx.lineTo(cx+50,cy+10);ctx.stroke();
    ctx.save();ctx.fillStyle=theme.ink;ctx.font='400 26px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('Importer une image',cx,cy+42);ctx.restore();
    return;
  }
  const img=asset.image, r=imageDrawingRect(p,img,e.fit);
  const clip=e.fit==='cover'?{x:p.x,y:p.y,w:p.w,h}:r;
  const radius=e.roundedCorners?Math.min(clip.w,clip.h)*Math.max(0,Math.min(50,e.cornerRadius??10))/100:0;
  ctx.save();ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.w,clip.h,radius);ctx.clip();ctx.drawImage(img,r.x,r.y,r.w,r.h);ctx.restore();
}
export function round(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
export function wrapLines(ctx,value,width){
 const lines=[];for(const row of String(value).split('\n')){let line='';for(const part of row.match(/\S+\s*|\s+/g)||['']){if(line&&ctx.measureText(line+part).width>width){lines.push(line.trimEnd());line='';}for(const char of part){if(line&&ctx.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}line+=char;}}lines.push(line.trimEnd());}return lines;
}
export function autoTextBounds(ctx,s,key){
 const scale=s.positions[key].contentScale||1;if(scale!==1){const b=autoTextBounds(ctx,unscaledObject(s,key),key);return {...b,w:b.w*scale,h:b.h*scale,size:b.size*scale,inkOffset:b.inkOffset*scale};}
 const p=s.positions[key],leading=textRole(s,key).leading,style=getTextStyle(s,key);ctx.font=styleFont(p.size,fontCss(p.font),style);ctx.textBaseline='top';
 const layout=layoutText(ctx,blockText(s,key),p.wrapWidth||1200,p.size,leading,style,wrapLines),lines=layout.rows.map(row=>row.text),metrics=lines.map(line=>ctx.measureText(line||'M'));
 const top=Math.min(...metrics.map(m=>Number.isFinite(m.actualBoundingBoxAscent)?-m.actualBoundingBoxAscent:0));
 const bottom=Math.max(...metrics.map((m,i)=>layout.rows[i].y+(Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:p.size)));
 return {w:style.align!=='left'?(p.wrapWidth||1200):Math.max(8,...lines.map((line,i)=>Math.max(layout.rows[i].x+ctx.measureText(line).width,layout.rows[i].x+(metrics[i].actualBoundingBoxRight||0)+(metrics[i].actualBoundingBoxLeft||0))))+2,h:Math.max(12,bottom-top+2),size:p.size,inkOffset:top,lines};
}
export function paintTextMark(ctx,line,x,y,size,color,style,background=false){
 if(!line)return;const metrics=ctx.measureText(line),width=metrics.width,top=y-(Number.isFinite(metrics.actualBoundingBoxAscent)?metrics.actualBoundingBoxAscent:0),bottom=y+(Number.isFinite(metrics.actualBoundingBoxDescent)?metrics.actualBoundingBoxDescent:size),thickness=Math.max(1,size*.045);ctx.save();
 if(background&&style.highlight){ctx.globalAlpha*=style.highlightOpacity/100;ctx.fillStyle=style.highlightColor;ctx.fillRect(x-size*.04,top-size*.04,width+size*.08,Math.max(size*.5,bottom-top)+size*.08);}
 if(!background){ctx.fillStyle=color;if(style.underline)ctx.fillRect(x,bottom+size*.06,width,thickness);if(style.strike)ctx.fillRect(x,top+(bottom-top)*.55,width,thickness);}
 ctx.restore();
}
export function text(ctx, value, x, y, width, size, color, weight = 400, font = 'Arial', leading=1.35,style=null) {
 ctx.fillStyle=color;ctx.font=styleFont(size,font,style||{weight,italic:false});ctx.textBaseline='top';const layout=layoutText(ctx,value,width,size,leading,style,wrapLines);
 ctx.textAlign='left';layout.rows.forEach(({text:line,x:offset,y:dy,marker,markerX,words,wordGap})=>{const row=y+dy;if(marker){ctx.fillStyle=style?.markerColor||color;ctx.fillText(marker,x+markerX,row);}ctx.fillStyle=color;if(style&&!words)paintTextMark(ctx,line,x+offset,row,size,color,style,true);if(words){let at=x+offset;for(const word of words){if(style)paintTextMark(ctx,word,at,row,size,color,style,true);ctx.fillText(word,at,row);if(style)paintTextMark(ctx,word,at,row,size,color,style);at+=ctx.measureText(word).width+wordGap;}}else {ctx.fillText(line,x+offset,row);if(style)paintTextMark(ctx,line,x+offset,row,size,color,style);}});return layout.height;
}
function codeWidthSize(ctx,value,p){applyLetterSpacing(ctx,p.textStyle,p.size);ctx.font=styleFont(p.size,fontCss(p.font,'code'),normalizeTextStyle(p.textStyle,p.font,'code'));return (p.w-110)*p.size/Math.max(1,...value.split('\n').map(line=>ctx.measureText(line.replaceAll('\t','    ')).width));}
function unscaledObject(s,key){const p=s.positions[key],scale=p.contentScale||1;return {...s,positions:{...s.positions,[key]:{...p,x:0,y:0,w:p.w/scale,...(p.h?{h:p.h/scale}:{}),size:p.size/scale,wrapWidth:p.wrapWidth/scale,contentScale:1}}};}
export function blockBounds(ctx, s, key) {
  const scale=s.positions[key].contentScale||1;if(scale!==1){const b=blockBounds(ctx,unscaledObject(s,key),key),p=s.positions[key];return {...p,x:p.x+b.x*scale,y:p.y+b.y*scale,w:b.w*scale,h:b.h*scale,size:b.size*scale,inkOffset:(b.inkOffset||0)*scale};}
  const p = s.positions[key];
  if(blockType(s,key)==='shape')return shapeBounds(s.elements[key],p);
  if(['image','table','bits'].includes(blockType(s,key)))return {...p,h:p.h||360};
  if(blockType(s,key)==='code'){const value=blockText(s,key);const h=p.h||Math.max(260,value.split('\n').length*p.size*textLeading(p.textStyle,1.6)+115);const size=Math.max(12,Math.min(p.size,(h-128)/(Math.max(1,blockText(s,key).split('\n').length)*textLeading(p.textStyle,1.6)),codeWidthSize(ctx,blockText(s,key),p)));return {...p,h,size};}
  if(p.autoSize)return {...p,...autoTextBounds(ctx,s,key)};
  const style=getTextStyle(s,key),leading=textRole(s,key).leading, size=fitText(ctx,blockText(s,key),p,key==='title'||s.elements[key]?.weight===700?700:400,leading);ctx.font=styleFont(size,fontCss(p.font),style);return {...p,size,h:layoutText(ctx,blockText(s,key),p.w,size,leading,style,wrapLines).height};
}
export function background(ctx, theme, gradient=true) {
  if(!gradient){ctx.fillStyle=theme.bg;ctx.fillRect(0,0,WIDTH,HEIGHT);return;}
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
  const p = s.positions[key], b = blockBounds(ctx, s, key), family=fontCss(p.font,'code'),style=getTextStyle(s,key);
  const lines=javaLines(blockText(s,key));const size=Math.max(12,Math.min(p.size,(b.h-128)/(Math.max(1,lines.length)*textLeading(style,1.6)),codeWidthSize(ctx,blockText(s,key),p)));ctx.save();ctx.shadowColor=theme.bg+'80';ctx.shadowBlur=36;ctx.shadowOffsetY=16;
  round(ctx, p.x, p.y, p.w, b.h, 24, theme.panel);ctx.restore();
  applyLetterSpacing(ctx,style,21);let caption=key==='code'?(s.codeTitle||''):(s.elements[key]?.caption||'');ctx.font=styleFont(21,family,style);if(ctx.measureText(caption).width>p.w-60){while(caption.length&&ctx.measureText(caption+'…').width>p.w-60)caption=caption.slice(0,-1);caption+='…';}text(ctx,caption.replaceAll('\n',' '),p.x+30,p.y+24,p.w-60,21,`${theme.ink}80`,style.weight,family,1.35,style);
  ctx.strokeStyle = `${theme.ink}15`; ctx.beginPath(); ctx.moveTo(p.x + 24, p.y + 72); ctx.lineTo(p.x + p.w - 24, p.y + 72); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(p.x + 12, p.y + 90, p.w - 24, b.h - 100); ctx.clip();
  javaLines(blockText(s,key)).forEach((segments, n) => {
    const y = p.y + 103 + n * size * textLeading(style,1.6);
    text(ctx, String(n + 1).padStart(2, ' '), p.x + 28, y + 4, 50, size * .75, `${theme.ink}45`, 400, family);
    const line=segments.map(token=>token.text).join('');
    applyLetterSpacing(ctx,style,size);ctx.font=styleFont(size,family,style);ctx.textBaseline='top';paintTextMark(ctx,line,p.x+80,y,size,theme.ink,style,true);
    let x = p.x + 80;
    ctx.font = styleFont(size,family,style); ctx.textBaseline = 'top';
    for (const token of segments) { ctx.fillStyle = textColor(style,theme,codeColor(token.type, theme)); ctx.fillText(token.text, x, y); x += ctx.measureText(token.text).width; }
    paintTextMark(ctx,line,p.x+80,y,size,theme.ink,style);
  });
  ctx.restore();
}
export function fitText(ctx,value,p,weight,leading) {
  let size=p.size;if(!p.h)return size;
  while(size>16){ctx.font=styleFont(size,fontCss(p.font),normalizeTextStyle(p.textStyle,p.font,'text',weight===700));if(layoutText(ctx,value,p.w,size,leading,p.textStyle,wrapLines).height<=p.h)break;size-=1;}return size;
}
export function renderSlide(ctx, s, theme, options = {}) {
  if(!options.transparent)background(ctx, theme, options.gradient!==false);
  const { header = false, footer = false, project = '', n = 0, total = 1, order = Infinity, motion = null, omit = null, now = performance.now() } = options;
  if (header) {
    text(ctx, 'JAVA / SOUS LE CAPOT', 112, 60, 1300, 22, theme.accent, 700);
    text(ctx, `${String(n + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, 1650, 60, 210, 22, theme.ink, 400, 'monospace');
  }
  const motionBounds=new Map();
  for (const key of visibleBlocks(s)) {
    if (omit === key || s.hiddenKeys?.includes(key)&&!options.showHidden) continue;
    const f = s.fragments[key];
    if (f.order > order) continue;
    let p = s.positions[key], b = blockBounds(ctx, s, key);const style=getTextStyle(s,key);style.markerColor=textColor(style.list,theme,textColor(style,theme));
    const exiting=motion?.exit&&f.order===motion.order;
    const progress = motion && f.order > 0 && f.order === motion.order ? Math.min(1, Math.max(0, (now - motion.started) / 420)) : 1;
    const animation=resolvedAnimation(exiting?f.exitAnimation||'none':f.animation,s,f.order),state=motionState(animation,progress,exiting);
    const group=s.groups?.find(g=>g.keys.includes(key)),groupId=group?.id||key;
    if(state.scale!==1&&!motionBounds.has(groupId))motionBounds.set(groupId,enclosingBounds((group?.keys||[key]).filter(k=>s.positions[k]).map(k=>{const measured=blockBounds(ctx,s,k);return {...measured,h:s.positions[k].h||measured.h};})));
    const groupBounds=motionBounds.get(groupId);
    ctx.save();ctx.globalAlpha*=state.alpha*objectOpacity(s,key)/100;ctx.translate(state.x,state.y);
    if(state.scale!==1){const cx=groupBounds.x+groupBounds.w/2,cy=groupBounds.y+groupBounds.h/2;ctx.translate(cx,cy);ctx.scale(state.scale,state.scale);ctx.translate(-cx,-cy);}
    if(p.rotation){ctx.translate(p.x+p.w/2,p.y+(p.h||b.h)/2);ctx.rotate(p.rotation*Math.PI/180);ctx.translate(-p.x-p.w/2,-p.y-(p.h||b.h)/2);}
    const contentScale=p.contentScale||1,original=s;
    if(contentScale!==1){ctx.translate(p.x,p.y);ctx.scale(contentScale,contentScale);s=unscaledObject(s,key);p=s.positions[key];b=blockBounds(ctx,s,key);}
    if (key === 'title'||s.elements[key]?.weight===700) {
      const label=key==='title'?s.label:s.elements[key]?.label;if (label) text(ctx, label, p.x, Math.max(contentScale!==1?(10-original.positions[key].y)/contentScale:10, p.y - 58), p.w, 23, theme.accent, style.weight,fontCss(p.font),1.35,style);
      const font=p.autoSize?p.size:fitText(ctx,blockText(s,key),p,700,textRole(s,key).leading);const color=style.color||style.colorRole?textColor(style,theme):['title','metric','definition'].includes(s.layout)?(()=>{const g=ctx.createLinearGradient(p.x,p.y,p.x+p.w,p.y+(p.h||b.h));g.addColorStop(0,theme.accent);g.addColorStop(1,theme.secondary);return g;})():theme.ink;text(ctx,blockText(s,key),p.x,p.y-(b.inkOffset||0),p.autoSize?p.wrapWidth:p.w,font,color,style.weight,fontCss(p.font),textRole(s,key).leading,style);
    } else if (blockType(s,key)==='shape') drawShape(ctx,{...s.elements[key],opacity:100},p,theme);
    else if (blockType(s,key)==='bits') drawBits(ctx,s.elements[key],p,theme);
    else if (blockType(s,key)==='table') drawTable(ctx,{...s.elements[key],opacity:100},p,theme,wrapLines);
    else if (blockType(s,key)==='image') drawImageBlock(ctx,s,key,theme);
    else if (blockType(s,key)==='code') drawCode(ctx,s,theme,key);
    else text(ctx,blockText(s,key),p.x,p.y-(b.inkOffset||0),p.autoSize?p.wrapWidth:p.w,p.autoSize?p.size:fitText(ctx,blockText(s,key),p,400,textRole(s,key).leading),textColor(style,theme,`${theme.ink}df`),style.weight,fontCss(p.font),textRole(s,key).leading,style);
    s=original;ctx.restore();
    if(s.emphasisKeys?.includes(key)){ctx.save();ctx.globalAlpha*=state.alpha*objectOpacity(s,key)/100;const p=s.positions[key],b=blockBounds(ctx,s,key);if(p.rotation){ctx.translate(b.x+b.w/2,b.y+(p.h||b.h)/2);ctx.rotate(p.rotation*Math.PI/180);ctx.translate(-b.x-b.w/2,-b.y-(p.h||b.h)/2);}ctx.strokeStyle=theme.accent;ctx.lineWidth=4;ctx.shadowColor=theme.accent;ctx.shadowBlur=12;ctx.strokeRect(b.x-10,b.y-10,b.w+20,(p.h||b.h)+20);ctx.restore();}
  }
  if (footer) {
    ctx.strokeStyle = `${theme.ink}18`; ctx.beginPath(); ctx.moveTo(112, 972); ctx.lineTo(1808, 972); ctx.stroke();
    text(ctx, project, 112, 1005, 1450, 20, `${theme.ink}70`);
    text(ctx, 'FRAME', 1710, 1005, 120, 20, theme.accent, 700);
  }
}
export function renderBanner(ctx,b,theme){renderSlide(ctx,normalizeOverlay(b).slide,theme,{transparent:true});}
