import { rotatePoint } from './editor.js';
// Express the selected object's corners in the containing rectangle's local axes.
export function interiorMargins(inner,outer){
 const points=[[inner.x,inner.y],[inner.x+inner.w,inner.y],[inner.x+inner.w,inner.y+inner.h],[inner.x,inner.y+inner.h]].map(([x,y])=>rotatePoint(rotatePoint({x,y},inner),outer,-(outer.rotation||0)));
 const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
 const margins={left:x-outer.x,right:outer.x+outer.w-right,top:y-outer.y,bottom:outer.y+outer.h-bottom};
 if(Object.values(margins).some(n=>n < -1e-6))return null;
 return {inner:{x,y,w:right-x,h:bottom-y},...Object.fromEntries(Object.entries(margins).map(([key,value])=>[key,Math.max(0,value)]))};
}
