import {boundColor,validColorRole} from './colors.js';
export const backgroundModes=[['inherit','Fond actuel'],['transparent','Transparent'],['solid','Couleur unie'],['gradient','Dégradé'],['dots','Points'],['grid','Grille'],['lines','Lignes'],['squares','Carrés'],['crosses','Croix'],['hexagons','Hexagones']];
// Shared channel metadata: the inspector, evaluator and timeline use the same names.
export const patternChannels = {
 patternMode:['mode','Fond · type'],patternBase:['base','Fond · couleur'],
 patternColor:['color','Motif · couleur'],patternColor2:['color2','Fond · deuxième couleur'],
 patternOpacity:['opacity','Motif · opacité'],patternSize:['size','Motif · taille'],
 patternSpacing:['spacing','Motif · espacement'],patternThickness:['thickness','Motif · épaisseur'],
 patternRotation:['rotation','Fond · rotation'],patternOffsetX:['offsetX','Motif · décalage horizontal'],
 patternOffsetY:['offsetY','Motif · décalage vertical'],patternStagger:['stagger','Motif · quinconce'],
};
export const patternLabels=Object.fromEntries(Object.entries(patternChannels).map(([key,[,label]])=>[key,label]));
export const patternField=property=>Object.keys(patternChannels).find(key=>patternChannels[key][0]===property);
const number=(value,fallback,min,max)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const color=(value,fallback)=>/^#[a-f\d]{6}$/i.test(value||'')?value:fallback;
export function normalizeBackground(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 return {mode:backgroundModes.some(([id])=>id===raw.mode)?raw.mode:'inherit',base:color(raw.base,'#101820'),baseRole:validColorRole(raw.baseRole),color:color(raw.color,'#ffffff'),colorRole:validColorRole(raw.colorRole),color2:color(raw.color2,'#284658'),color2Role:validColorRole(raw.color2Role),opacity:number(raw.opacity,18,0,100),size:number(raw.size,3,1,100),spacing:number(raw.spacing,32,8,240),rotation:number(raw.rotation,0,-180,180),thickness:number(raw.thickness,1,0.5,12),offsetX:number(raw.offsetX,0,-240,240),offsetY:number(raw.offsetY,0,-240,240),stagger:raw.stagger===true};
}
const cache=new Map();
// Canvas-native and resolution independent: one implementation for editor, PNG and video.
export function drawSceneBackground(ctx,raw,theme){
 const b=normalizeBackground(raw);if(['inherit','transparent'].includes(b.mode))return;
 const key=JSON.stringify([b,...['base','color','color2'].map(field=>boundColor(b,field,theme))]);
 let canvas=cache.get(key);
 if(!canvas){canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1920,1080):document.createElement('canvas');canvas.width=1920;canvas.height=1080;paintBackground(canvas.getContext('2d'),b,theme);if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(key,canvas);}
 ctx.drawImage(canvas,0,0);
}
function paintBackground(ctx,raw,theme){
 const b=normalizeBackground(raw);if(['inherit','transparent'].includes(b.mode))return;
 ctx.save();ctx.beginPath();ctx.rect(0,0,1920,1080);ctx.clip();ctx.fillStyle=boundColor(b,'base',theme);ctx.fillRect(0,0,1920,1080);
 const angle=b.rotation*Math.PI/180;
 if(b.mode==='gradient'){
 const dx=Math.cos(angle),dy=Math.sin(angle),extent=(Math.abs(dx)*1920+Math.abs(dy)*1080)/2;
 const g=ctx.createLinearGradient(960-dx*extent,540-dy*extent,960+dx*extent,540+dy*extent);g.addColorStop(0,boundColor(b,'base',theme));g.addColorStop(1,boundColor(b,'color2',theme));ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);
 }else if(b.mode!=='solid'){
 ctx.globalAlpha*=b.opacity/100;ctx.fillStyle=ctx.strokeStyle=boundColor(b,'color',theme);ctx.lineWidth=b.thickness;ctx.translate(960+b.offsetX,540+b.offsetY);ctx.rotate(angle);
 const radius=1600,step=b.spacing,size=b.size;
 ctx.beginPath();
 if(b.mode==='grid'||b.mode==='lines'){
 for(let x=-radius;x<=radius;x+=step){ctx.moveTo(x,-radius);ctx.lineTo(x,radius);if(b.mode==='grid'){ctx.moveTo(-radius,x);ctx.lineTo(radius,x);}}ctx.stroke();
 }else{
 let row=0;for(let y=-radius;y<=radius;y+=step,row++)for(let x=-radius;x<=radius;x+=step){const px=x+(b.stagger&&row%2?step/2:0);
 if(b.mode==='dots'){ctx.moveTo(px+size/2,y);ctx.arc(px,y,size/2,0,Math.PI*2);}
 else if(b.mode==='squares')ctx.rect(px-size/2,y-size/2,size,size);
 else if(b.mode==='crosses'){ctx.moveTo(px-size/2,y);ctx.lineTo(px+size/2,y);ctx.moveTo(px,y-size/2);ctx.lineTo(px,y+size/2);}
 else{for(let i=0;i<=6;i++){const a=i*Math.PI/3,cx=px+Math.cos(a)*size/2,cy=y+Math.sin(a)*size/2;i?ctx.lineTo(cx,cy):ctx.moveTo(cx,cy);}ctx.closePath();}
 }if(['dots','squares'].includes(b.mode))ctx.fill();else ctx.stroke();
 }
 }ctx.restore();
}
