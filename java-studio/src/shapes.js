import { validColorRole, boundColor } from './colors.js';
export const shapes = [
 ['line','Trait',true,520,24],['curve','Courbe',true,420,200],['rect','Rectangle',false,440,260],['square','Carré',false,300,300],['rounded','Rectangle arrondi',false,440,260],['circle','Cercle',false,300,300],['ellipse','Ellipse',false,440,240],['triangle','Triangle',false,340,300],['right-triangle','Triangle rectangle',false,340,300],['diamond','Losange',false,300,360],['pentagon','Pentagone',false,320,300],['hexagon','Hexagone',false,360,300],['star','Étoile',false,340,340],['arrow','Flèche',false,440,200],['double-arrow','Double flèche',false,440,200],['trapezoid','Trapèze',false,400,260],['parallelogram','Parallélogramme',false,400,260],['chevron','Chevron',false,320,300],['cross','Croix',false,300,300],['heart','Cœur',false,340,300],
].map(([id,name,open,w,h])=>({id,name,open,w,h}));
const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
const color=(value,fallback)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
export function normalizeShape(raw={}) {
 const spec=shapes.find(s=>s.id===raw.shape)||shapes.find(s=>s.id==='rect');
 return {type:'shape',custom:raw.custom!==false,template:raw.template===true,fillRole:validColorRole(raw.fillRole),strokeRole:validColorRole(raw.strokeRole),name:String(raw.name||spec.name).slice(0,100),shape:spec.id,fill:color(raw.fill,'#35ff91'),stroke:color(raw.stroke,'#35ff91'),filled:raw.filled!==false,outlined:raw.outlined===true||spec.open,strokeWidth:clamp(raw.strokeWidth,1,60,6),opacity:clamp(raw.opacity,0,100,100),radius:clamp(raw.radius,0,45,12),points:Math.round(clamp(raw.points,3,12,5)),innerRatio:clamp(raw.innerRatio,.15,.8,.45),direction:['horizontal','vertical','down','up'].includes(raw.direction)?raw.direction:'horizontal',dashed:raw.dashed===true,roundedEnds:raw.roundedEnds!==false};
}
const polygon=points=>'M '+points.map(p=>p.map(v=>Number(v.toFixed(3))).join(' ')).join(' L ')+' Z';
function regular(n,inner=1){return polygon(Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=i%2?inner:1;return [50+50*r*Math.cos(a),50+50*r*Math.sin(a)];}));}
export function shapePath(shape) {
 const e=normalizeShape(shape);
 switch(e.shape){
  case 'line':return ({horizontal:'M 0 50 L 100 50',vertical:'M 50 0 L 50 100',down:'M 0 0 L 100 100',up:'M 0 100 L 100 0'})[e.direction];
  case 'curve':return 'M 0 100 Q 50 0 100 100';
  case 'rect':case 'square':return 'M 0 0 H 100 V 100 H 0 Z';
  case 'rounded':{const r=e.radius;return `M ${r} 0 H ${100-r} Q 100 0 100 ${r} V ${100-r} Q 100 100 ${100-r} 100 H ${r} Q 0 100 0 ${100-r} V ${r} Q 0 0 ${r} 0 Z`;}
  case 'circle':case 'ellipse':return 'M 100 50 A 50 50 0 1 1 0 50 A 50 50 0 1 1 100 50 Z';
  case 'triangle':return polygon([[50,0],[100,100],[0,100]]);
  case 'right-triangle':return polygon([[0,0],[100,100],[0,100]]);
  case 'diamond':return polygon([[50,0],[100,50],[50,100],[0,50]]);
  case 'pentagon':return regular(5);
  case 'hexagon':return regular(6);
  case 'star':return regular(e.points*2,e.innerRatio);
  case 'arrow':return polygon([[0,30],[60,30],[60,0],[100,50],[60,100],[60,70],[0,70]]);
  case 'double-arrow':return polygon([[0,50],[30,0],[30,30],[70,30],[70,0],[100,50],[70,100],[70,70],[30,70],[30,100]]);
  case 'trapezoid':return polygon([[20,0],[80,0],[100,100],[0,100]]);
  case 'parallelogram':return polygon([[25,0],[100,0],[75,100],[0,100]]);
  case 'chevron':return polygon([[0,0],[55,0],[100,50],[55,100],[0,100],[45,50]]);
  case 'cross':return polygon([[35,0],[65,0],[65,35],[100,35],[100,65],[65,65],[65,100],[35,100],[35,65],[0,65],[0,35],[35,35]]);
  case 'heart':return 'M 50 100 C 35 85 0 60 0 28 C 0 -4 35 -8 50 20 C 65 -8 100 -4 100 28 C 100 60 65 85 50 100 Z';
 }
}
// Tight path bounds: Bézier control points are not the visible extrema.
function cubicValues(a,b,c,d){const A=-a+3*b-3*c+d,B=2*(a-2*b+c),C=b-a,roots=Math.abs(A)<1e-12?(Math.abs(B)<1e-12?[]:[-C/B]):B*B-4*A*C<0?[]:[(-B+Math.sqrt(B*B-4*A*C))/(2*A),(-B-Math.sqrt(B*B-4*A*C))/(2*A)];return [a,d,...roots.filter(t=>t>0&&t<1).map(t=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d)];}
export function shapePathBounds(shape){
 const e=normalizeShape(shape);let points;
 if(['pentagon','hexagon','star'].includes(e.shape)){const n=e.shape==='star'?e.points*2:e.shape==='pentagon'?5:6;points=Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,r=e.shape==='star'&&i%2?e.innerRatio:1;return [50+50*r*Math.cos(a),50+50*r*Math.sin(a)];});const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
 if(e.shape==='curve')return {x:0,y:50,w:100,h:50};
 if(e.shape==='heart'){const ys=[...cubicValues(100,85,60,28),...cubicValues(28,-4,-8,20),...cubicValues(20,-8,-4,28),...cubicValues(28,60,85,100)];return {x:0,y:Math.min(...ys),w:100,h:100-Math.min(...ys)};}
 return {x:0,y:0,w:100,h:100};
}
export function shapeBounds(e,p){
 if(e.shape!=='line'||!['horizontal','vertical'].includes(e.direction))return {...p,h:p.h||300};
 const horizontal=e.direction==='horizontal',weight=Math.min(e.strokeWidth,horizontal?p.w:p.h||300);return horizontal?{...p,y:p.y+((p.h||300)-weight)/2,h:weight}:{...p,x:p.x+(p.w-weight)/2,w:weight,h:p.h||300};
}
export function drawShape(ctx,e,p,theme) {
 p=shapeBounds(e,p);const spec=shapes.find(s=>s.id===e.shape),w=p.w,h=p.h||300;
 const stroke=e.outlined||spec?.open,weight=e.shape==='line'&&['horizontal','vertical'].includes(e.direction)?Math.min(e.strokeWidth,e.direction==='horizontal'?w:h):Math.min(e.strokeWidth,Math.min(w,h)/2),inset=stroke?weight/2:0;
 const bounds=shapePathBounds(e),ix=e.shape==='line'&&e.direction==='horizontal'&&e.roundedEnds===false?0:inset,iy=e.shape==='line'&&e.direction==='vertical'&&e.roundedEnds===false?0:inset,sx=(w-2*ix)/bounds.w,sy=(h-2*iy)/bounds.h;
 const path=new Path2D();if(e.shape==='rounded'){const rw=w-2*inset,rh=h-2*inset;path.roundRect(p.x+inset,p.y+inset,rw,rh,Math.min(rw,rh)*e.radius/100);}else path.addPath(new Path2D(shapePath(e)),new DOMMatrix([sx,0,0,sy,p.x+ix-bounds.x*sx,p.y+iy-bounds.y*sy]));
 ctx.save();ctx.globalAlpha*=e.opacity/100;ctx.lineJoin='round';ctx.lineCap=e.roundedEnds===false?'butt':'round';if(!spec?.open&&e.filled){ctx.fillStyle=boundColor(e,'fill',theme);ctx.fill(path);}if(stroke){ctx.strokeStyle=boundColor(e,'stroke',theme);ctx.lineWidth=weight;ctx.setLineDash(e.dashed?[weight*3,weight*2]:[]);ctx.stroke(path);}ctx.restore();
}
