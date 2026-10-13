import { selectionUnits } from './selection.js';
export function marqueeRect(start,end,width=1920,height=1080){
 const clamp=(n,max)=>Math.max(0,Math.min(max,n));
 const x1=clamp(start.x,width),y1=clamp(start.y,height),x2=clamp(end.x,width),y2=clamp(end.y,height);
 return {x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1)};
}
export function marqueeKeys(bounds,groups,rect,base=[]){
 const inside=b=>b.x>=rect.x-1e-6&&b.y>=rect.y-1e-6&&b.x+b.w<=rect.x+rect.w+1e-6&&b.y+b.h<=rect.y+rect.h+1e-6;
 const found=selectionUnits(groups,Object.keys(bounds),bounds).filter(unit=>inside(unit.bounds)).flatMap(unit=>unit.keys);
 return Object.keys(bounds).filter(k=>base.includes(k)||found.includes(k));
}
