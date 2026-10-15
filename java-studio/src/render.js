import { layoutRichText } from './richTextLayout.js';
import { textSegments } from './richText.js';
import {graphemes,typewriterState} from './typewriter.js';
import {interpolatePosition,interpolationProgress} from './stepInterpolation.js';
import {verticalTextOffset} from './textVerticalAlignment.js';
import {imageFilter} from './imageEffects.js';
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
const richTextStyle=(s,key)=>({...getTextStyle(s,key),runs:s.positions[key]?.textRuns||[]});
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
  ctx.save();ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.w,clip.h,radius);ctx.clip();ctx.filter=imageFilter(e.effects);ctx.drawImage(img,r.x,r.y,r.w,r.h);ctx.restore();
}
export function round(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
export function wrapLines(ctx,value,width){
 const lines=[];for(const row of String(value).split('\n')){let line='';for(const part of row.match(/\S+\s*|\s+/g)||['']){if(line&&ctx.measureText(line+part).width>width){lines.push(line.trimEnd());line='';}for(const char of part){if(line&&ctx.measureText(line+char).width>width){lines.push(line.trimEnd());line='';}line+=char;}}lines.push(line.trimEnd());}return lines;
}
export function autoTextBounds(ctx,s,key){
 const scale=s.positions[key].contentScale||1;if(scale!==1){const b=autoTextBounds(ctx,unscaledObject(s,key),key);return {...b,w:b.w*scale,h:b.h*scale,size:b.size*scale,inkOffset:b.inkOffset*scale};}
 const p=s.positions[key],leading=textRole(s,key).leading,style=richTextStyle(s,key);ctx.font=styleFont(p.size,fontCss(p.font),style);ctx.textBaseline='top';
 const layout=layoutStyledText(ctx,blockText(s,key),p.wrapWidth||1200,p.size,leading,style,wrapLines),lines=layout.rows.map(row=>row.text),metrics=layout.rows.map(row=>row.metrics||ctx.measureText(row.text||'M'));
 const top=Math.min(...metrics.map(m=>Number.isFinite(m.actualBoundingBoxAscent)?-m.actualBoundingBoxAscent:0));
 const bottom=Math.max(...metrics.map((m,i)=>layout.rows[i].y+(Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:p.size)));
 return {w:style.align!=='left'?(p.wrapWidth||1200):Math.max(8,...lines.map((line,i)=>Math.max(layout.rows[i].x+metrics[i].width,layout.rows[i].x+(metrics[i].actualBoundingBoxRight||0)+(metrics[i].actualBoundingBoxLeft||0))))+2,h:Math.max(12,bottom-top+2),size:p.size,inkOffset:top,lines};
}
export function paintTextMark(ctx,line,x,y,size,color,style,background=false){
 if(!line)return;const metrics=ctx.measureText(line),width=metrics.width,top=y-(Number.isFinite(metrics.actualBoundingBoxAscent)?metrics.actualBoundingBoxAscent:0),bottom=y+(Number.isFinite(metrics.actualBoundingBoxDescent)?metrics.actualBoundingBoxDescent:size),thickness=Math.max(1,size*.045);ctx.save();
 if(background&&style.highlight){ctx.globalAlpha*=style.highlightOpacity/100;ctx.fillStyle=style.highlightColor;ctx.fillRect(x-size*.04,top-size*.04,width+size*.08,Math.max(size*.5,bottom-top)+size*.08);}
 if(!background){ctx.fillStyle=color;if(style.underline)ctx.fillRect(x,bottom+size*.06,width,thickness);if(style.strike)ctx.fillRect(x,top+(bottom-top)*.55,width,thickness);}
 ctx.restore();
}
function layoutStyledText(ctx,value,width,size,leading,style,wrap,font=null){
 if(!style?.runs?.length)return layoutText(ctx,value,width,size,leading,style,wrap);
 const family=font||ctx.font.slice(ctx.font.indexOf('px ')+3);
 return layoutRichText(ctx,String(value),width,size,leading,style,family,style.runs);
}
function paintRich(ctx,value,start,end,x,y,size,font,base,color){
 for(const part of textSegments(String(value),base.runs,start,end)){
  const style={...base,...part.style},ink=style.colorRole?textColor(style,base.richTheme||{ink:color},color):style.color||color;
  ctx.font=styleFont(size,font,style);ctx.fillStyle=ink;applyLetterSpacing(ctx,base,size);
  paintTextMark(ctx,part.text,x,y,size,ink,style,true);ctx.fillText(part.text,x,y);paintTextMark(ctx,part.text,x,y,size,ink,style);x+=ctx.measureText(part.text).width;
 }
 ctx.font=styleFont(size,font,base);ctx.fillStyle=color;return x;
}
export function text(ctx, value, x, y, width, size, color, weight = 400, font = 'Arial', leading=1.35,style=null,frameHeight=null,typing=null) {
 ctx.fillStyle=color;ctx.font=styleFont(size,font,style||{weight,italic:false});ctx.textBaseline='top';const layout=layoutStyledText(ctx,value,width,size,leading,style,wrapLines,font);
 y+=verticalTextOffset(ctx,layout.rows,size,frameHeight,style?.verticalAlign);
 ctx.textAlign='left';let sourceOffset=0,cursorDrawn=false;
 layout.rows.forEach(({text:full,x:offset,y:dy,marker,markerX,words,richWords,wordGap,start:richStart})=>{
 const source=String(value),atSource=richStart??Math.max(sourceOffset,source.indexOf(full,sourceOffset)),before=typing&&Number.isFinite(typing.count)?graphemes(source.slice(0,atSource)).length:0;sourceOffset=atSource+full.length;
 const chars=graphemes(full),take=Math.max(0,Math.min(chars.length,(typing?.count??Infinity)-before)),line=chars.slice(0,take).join(''),row=y+dy;
 const cursor=!cursorDrawn&&typing?.cursor&&take<chars.length&&(typing?.count??Infinity)>=before?typing.cursor:'';if(cursor)cursorDrawn=true;
 if(marker&&(line||!typing)){ctx.fillStyle=style?.markerColor||color;ctx.fillText(marker,x+markerX,row);}ctx.fillStyle=color;
 let at=x+offset;
 if(style?.runs?.length){
  const visibleEnd=atSource+line.length;
  if(richWords){for(const word of richWords){if(word.start>=visibleEnd)break;at=paintRich(ctx,value,word.start,Math.min(word.end,visibleEnd),at,row,size,font,style,color);if(visibleEnd<word.end)break;at+=wordGap;}}
  else at=paintRich(ctx,value,atSource,visibleEnd,at,row,size,font,style,color);
  if(cursor)ctx.fillText(cursor,at,row);
 }
 else if(words){let budget=take;for(const word of words){const letters=graphemes(word),part=letters.slice(0,Math.max(0,budget)).join('');if(part){if(style)paintTextMark(ctx,part,at,row,size,color,style,true);ctx.fillText(part,at,row);if(style)paintTextMark(ctx,part,at,row,size,color,style);}if(budget<letters.length){if(cursor)ctx.fillText(cursor,at+ctx.measureText(part).width,row);break;}budget-=letters.length+1;at+=ctx.measureText(word).width+wordGap;}}
 else {if(style)paintTextMark(ctx,line,at,row,size,color,style,true);ctx.fillText(line,at,row);if(style)paintTextMark(ctx,line,at,row,size,color,style);if(cursor)ctx.fillText(cursor,at+ctx.measureText(line).width,row);}
 });return layout.height;
}
function codeWidthSize(ctx,value,p){applyLetterSpacing(ctx,p.textStyle,p.size);ctx.font=styleFont(p.size,fontCss(p.font,'code'),normalizeTextStyle(p.textStyle,p.font,'code'));return (p.w-110)*p.size/Math.max(1,...value.split('\n').map(line=>ctx.measureText(line.replaceAll('\t','    ')).width));}
function unscaledObject(s,key){const p=s.positions[key],scale=p.contentScale||1;return {...s,positions:{...s.positions,[key]:{...p,x:0,y:0,w:p.w/scale,...(p.h?{h:p.h/scale}:{}),size:p.size/scale,wrapWidth:p.wrapWidth/scale,contentScale:1}}};}
export function blockBounds(ctx, s, key) {
  const scale=s.positions[key].contentScale||1;if(scale!==1){const b=blockBounds(ctx,unscaledObject(s,key),key),p=s.positions[key];return {...p,x:p.x+b.x*scale,y:p.y+b.y*scale,w:b.w*scale,h:b.h*scale,size:b.size*scale,inkOffset:(b.inkOffset||0)*scale};}
  const p = s.positions[key];
  if(blockType(s,key)==='shape')return shapeBounds(s.elements[key],p);
  if(['image','table','bits'].includes(blockType(s,key)))return {...p,h:p.h||360};
  if(blockType(s,key)==='code'){const value=blockText(s,key);const h=p.h||Math.max(260,value.split('\n').length*p.size*textLeading(p.textStyle,1.6)+115);const size=p.fitFont===true?Math.max(12,Math.min(p.size,(h-128)/(Math.max(1,blockText(s,key).split('\n').length)*textLeading(p.textStyle,1.6)),codeWidthSize(ctx,blockText(s,key),p))):p.size;return {...p,h,size};}
  if(p.autoSize)return {...p,...autoTextBounds(ctx,s,key)};
  const style=richTextStyle(s,key),leading=textRole(s,key).leading, size=fitText(ctx,blockText(s,key),p,key==='title'||s.elements[key]?.weight===700?700:400,leading);ctx.font=styleFont(size,fontCss(p.font),style);return {...p,size,h:layoutStyledText(ctx,blockText(s,key),p.w,size,leading,style,wrapLines).height};
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
function drawCode(ctx, s, theme, key,typing=null) {
  const p = s.positions[key], b = blockBounds(ctx, s, key), family=fontCss(p.font,'code'),style=richTextStyle(s,key);
  const lines=javaLines(blockText(s,key));const size=p.fitFont===true?Math.max(12,Math.min(p.size,(b.h-128)/(Math.max(1,lines.length)*textLeading(style,1.6)),codeWidthSize(ctx,blockText(s,key),p))):p.size;ctx.save();ctx.shadowColor=theme.bg+'80';ctx.shadowBlur=36;ctx.shadowOffsetY=16;
  round(ctx, p.x, p.y, p.w, b.h, 24, theme.panel);ctx.restore();
  applyLetterSpacing(ctx,style,21);let caption=key==='code'?(s.codeTitle||''):(s.elements[key]?.caption||'');ctx.font=styleFont(21,family,style);if(ctx.measureText(caption).width>p.w-60){while(caption.length&&ctx.measureText(caption+'…').width>p.w-60)caption=caption.slice(0,-1);caption+='…';}text(ctx,caption.replaceAll('\n',' '),p.x+30,p.y+24,p.w-60,21,`${theme.ink}80`,style.weight,family,1.35,style);
  ctx.strokeStyle = `${theme.ink}15`; ctx.beginPath(); ctx.moveTo(p.x + 24, p.y + 72); ctx.lineTo(p.x + p.w - 24, p.y + 72); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(p.x + 12, p.y + 90, p.w - 24, b.h - 100); ctx.clip();
  ctx.font=styleFont(size,family,style);ctx.textBaseline='top';const codeOffset=verticalTextOffset(ctx,lines.map((segments,n)=>({text:segments.map(t=>t.text).join(''),y:n*size*textLeading(style,1.6)})),size,Math.max(0,b.h-119),style.verticalAlign);
  let written=0,cursorDrawn=false;
  javaLines(blockText(s,key)).forEach((segments, n) => {
    const y = p.y + 103 + codeOffset + n * size * textLeading(style,1.6);
    text(ctx, String(n + 1).padStart(2, ' '), p.x + 28, y + 4, 50, size * .75, `${theme.ink}45`, 400, family);
    const full=segments.map(token=>token.text).join(''),letters=graphemes(full),budget=Math.max(0,Math.min(letters.length,(typing?.count??Infinity)-written)),line=letters.slice(0,budget).join('');written+=letters.length+1;
    applyLetterSpacing(ctx,style,size);ctx.font=styleFont(size,family,style);ctx.textBaseline='top';paintTextMark(ctx,line,p.x+80,y,size,theme.ink,style,true);
    let x = p.x + 80;
    ctx.font = styleFont(size,family,style); ctx.textBaseline = 'top';
    let remaining=budget;for (const token of segments) {const letters=graphemes(token.text),part=letters.slice(0,remaining).join('');ctx.fillStyle = textColor(style,theme,codeColor(token.type, theme));ctx.fillText(part,x,y);x+=ctx.measureText(part).width;remaining=Math.max(0,remaining-letters.length);}
    if(!cursorDrawn&&typing?.cursor&&budget<letters.length&&typing.count>=written-letters.length-1){ctx.fillStyle=textColor(style,theme);ctx.fillText(typing.cursor,x,y);cursorDrawn=true;}
    paintTextMark(ctx,line,p.x+80,y,size,theme.ink,style);
  });
  ctx.restore();
}
export function fitText(ctx,value,p,weight,leading) {
  let size=p.size;if(!p.h||p.fitFont!==true)return size;
  while(size>16){ctx.font=styleFont(size,fontCss(p.font),normalizeTextStyle(p.textStyle,p.font,'text',weight===700));if(layoutStyledText(ctx,value,p.w,size,leading,{...p.textStyle,runs:p.textRuns||[]},wrapLines).height<=p.h)break;size-=1;}return size;
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
    if (options.objectMotion?.[key]?.visible===false || omit === key || s.hiddenKeys?.includes(key)&&!options.showHidden) continue;
    const f = s.fragments[key];
    if (f.order > order) continue;
    let p = s.positions[key], b = blockBounds(ctx, s, key);const style=richTextStyle(s,key);style.richTheme=theme;style.markerColor=textColor(style.list,theme,textColor(style,theme));
    const exiting=motion?.exit&&f.order===motion.order;
    const progress = motion && f.order > 0 && f.order === motion.order ? Math.min(1, Math.max(0, (now - motion.started) / 420)) : 1;
    const animation=resolvedAnimation(exiting?f.exitAnimation||'none':f.animation,s,f.order),state=options.objectMotion?.[key]||motionState(animation,progress,exiting);
    const group=s.groups?.find(g=>g.keys.includes(key)),groupId=group?.id||key;
    if(state.scale!==1&&!motionBounds.has(groupId))motionBounds.set(groupId,enclosingBounds((group?.keys||[key]).filter(k=>s.positions[k]).map(k=>{const measured=blockBounds(ctx,s,k);return {...measured,h:s.positions[k].h||measured.h};})));
    const groupBounds=motionBounds.get(groupId);
    ctx.save();ctx.globalAlpha*=state.alpha*objectOpacity(s,key)/100;ctx.translate(state.x,state.y);
    if(state.scale!==1){const cx=groupBounds.x+groupBounds.w/2,cy=groupBounds.y+groupBounds.h/2;ctx.translate(cx,cy);ctx.scale(state.scale,state.scale);ctx.translate(-cx,-cy);}
    if(p.rotation){ctx.translate(p.x+p.w/2,p.y+(p.h||b.h)/2);ctx.rotate(p.rotation*Math.PI/180);ctx.translate(-p.x-p.w/2,-p.y-(p.h||b.h)/2);}
    const typingElapsed=options.objectMotion?.[key]?.typingElapsed??options.typingElapsed?.[key];
    const typing=['text','code'].includes(blockType(s,key))?typewriterState(blockType(s,key)==='code'?blockText(s,key).replaceAll('\t','    '):blockText(s,key),p.typewriter,typingElapsed):null;
    const contentScale=p.contentScale||1,original=s;
    if(contentScale!==1){ctx.translate(p.x,p.y);ctx.scale(contentScale,contentScale);s=unscaledObject(s,key);p=s.positions[key];b=blockBounds(ctx,s,key);}
    if (key === 'title'||s.elements[key]?.weight===700) {
      const label=key==='title'?s.label:s.elements[key]?.label;if (label) text(ctx, label, p.x, Math.max(contentScale!==1?(10-original.positions[key].y)/contentScale:10, p.y - 58), p.w, 23, theme.accent, style.weight,fontCss(p.font),1.35,style);
      const font=p.autoSize?p.size:fitText(ctx,blockText(s,key),p,700,textRole(s,key).leading);const color=style.color||style.colorRole?textColor(style,theme):['title','metric','definition'].includes(s.layout)?(()=>{const g=ctx.createLinearGradient(p.x,p.y,p.x+p.w,p.y+(p.h||b.h));g.addColorStop(0,theme.accent);g.addColorStop(1,theme.secondary);return g;})():theme.ink;text(ctx,blockText(s,key),p.x,p.y-(b.inkOffset||0),p.autoSize?p.wrapWidth:p.w,font,color,style.weight,fontCss(p.font),textRole(s,key).leading,style,p.autoSize?null:p.h,typing);
    } else if (blockType(s,key)==='shape') drawShape(ctx,{...s.elements[key],opacity:100},p,theme);
    else if (blockType(s,key)==='bits') drawBits(ctx,s.elements[key],p,theme);
    else if (blockType(s,key)==='table') drawTable(ctx,{...s.elements[key],opacity:100},p,theme,wrapLines);
    else if (blockType(s,key)==='image') drawImageBlock(ctx,s,key,theme);
    else if (blockType(s,key)==='code') drawCode(ctx,s,theme,key,typing);
    else text(ctx,blockText(s,key),p.x,p.y-(b.inkOffset||0),p.autoSize?p.wrapWidth:p.w,p.autoSize?p.size:fitText(ctx,blockText(s,key),p,400,textRole(s,key).leading),textColor(style,theme,`${theme.ink}df`),style.weight,fontCss(p.font),textRole(s,key).leading,style,p.autoSize?null:p.h,typing);
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

// Same computed frames feed the audience window and Canvas video recording.
export function renderStepTransition(ctx,from,to,theme,progress,options={}){
 if(progress>=1){renderSlide(ctx,to,theme,options);return;}
 const ease=interpolationProgress(progress),fromOrder=options.fromOrder??Infinity,toOrder=options.order??Infinity;
 const targetKeys=visibleBlocks(to),sourceKeys=visibleBlocks(from),positions={...to.positions},interpolated=new Set();
 for(const key of targetKeys){if(!sourceKeys.includes(key)||blockType(from,key)!==blockType(to,key)||!(from.positions[key]?.interpolate||to.positions[key]?.interpolate)||from.hiddenKeys?.includes(key)||to.hiddenKeys?.includes(key)||from.fragments[key].order>fromOrder||to.fragments[key].order>toOrder)continue;
  const a=from.positions[key],b=to.positions[key];positions[key]=interpolatePosition({...a,h:a.h||blockBounds(ctx,from,key).h},{...b,h:b.h||blockBounds(ctx,to,key).h},progress);if(blockType(to,key)==='text')positions[key].autoSize=false;interpolated.add(key);
 }
 if(!options.transparent)background(ctx,theme,options.gradient!==false);
 const state=(alpha,visible=true)=>({alpha,visible,x:0,y:0,scale:1});
 renderSlide(ctx,from,theme,{...options,transparent:true,order:fromOrder,objectMotion:Object.fromEntries(sourceKeys.map(k=>[k,state(1-ease,!interpolated.has(k))]))});
 renderSlide(ctx,{...to,positions},theme,{...options,transparent:true,objectMotion:Object.fromEntries(targetKeys.map(k=>[k,state(interpolated.has(k)?1:ease)]))});
}
