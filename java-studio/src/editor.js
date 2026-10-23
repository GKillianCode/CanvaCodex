import { MAX_ELEMENTS } from './limits.js';
import { WIDTH, HEIGHT, blockLabel, blockText, blockType, visibleBlocks } from './model.js';
export function nudgePosition(p, dx, dy, outputWidth) { const unit=WIDTH/outputWidth;return {...p,x:Math.max(-10000,Math.min(10000,p.x+dx*unit)),y:Math.max(-10000,Math.min(10000,p.y+dy*unit))}; }
export function resizePosition(origin,handle,dx,dy,type) {
 const minW=type==='code'?240:type==='shape'?8:80,minH=type==='code'?180:type==='shape'?8:40;
 const west=handle.includes('w'),east=handle.includes('e'),north=handle.includes('n'),south=handle.includes('s');
 const x=west?Math.max(origin.x+origin.w-10000,Math.min(origin.x+origin.w-minW,origin.x+dx)):origin.x;
 const y=north?Math.max(origin.y+origin.h-10000,Math.min(origin.y+origin.h-minH,origin.y+dy)):origin.y;
 const w=west?origin.x+origin.w-x:east?Math.max(minW,Math.min(10000,origin.w+dx)):origin.w;
 const h=north?origin.y+origin.h-y:south?Math.max(minH,Math.min(10000,origin.h+dy)):origin.h;
 // Side handles change one dimension without shrinking type on the untouched axis.
 const ratio=(west||east)&&(north||south)?Math.min(w/origin.w,h/origin.h):1;
 return {...origin,x,y,w,h,size:['image','shape','table','bits'].includes(type)?origin.size:Math.max(10,Math.min(260,origin.size*ratio))};
}
export function duplicateElement(s,key) {
 if(!visibleBlocks(s).includes(key)||Object.keys(s.elements).length>=MAX_ELEMENTS)return null;
 const type=blockType(s,key),copyKey=type+crypto.randomUUID().replaceAll('-','').slice(0,8),source=s.elements[key];
 s.elements[copyKey]=source?JSON.parse(JSON.stringify(source)):{type,text:blockText(s,key),weight:key==='title'?700:400,label:key==='title'?s.label:'',caption:key==='code'?s.codeTitle:''};
 s.elements[copyKey].custom=true;s.elements[copyKey].template=false;s.elements[copyKey].name=(blockLabel(s,key)+' · copie').slice(0,100);
 const p=s.positions[key];s.positions[copyKey]={...JSON.parse(JSON.stringify(p)),x:Math.min(10000,p.x+24),y:Math.min(10000,p.y+24)};s.fragments[copyKey]={...s.fragments[key]};return copyKey;
}

export function normalizeAngle(value){return Number.isFinite(Number(value))?((Number(value)%360)+360)%360:0;}
export function rotatePoint(point,b,degrees=b.rotation||0){const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=b.x+b.w/2,cy=b.y+b.h/2,dx=point.x-cx,dy=point.y-cy;return {x:cx+dx*c-dy*s,y:cy+dx*s+dy*c};}
export function rotationFromPointer(b,start,point,snap=false,snapStep=90){const cx=b.x+b.w/2,cy=b.y+b.h/2;let angle=(b.rotation||0)+(Math.atan2(point.y-cy,point.x-cx)-Math.atan2(start.y-cy,start.x-cx))*180/Math.PI;if(snap)angle=Math.round(angle/snapStep)*snapStep;return normalizeAngle(angle);}
export function resizeRotated(origin,handle,dx,dy,type,uniform=false){const a=(origin.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),b=(uniform?resizeProportional:resizePosition)(origin,handle,dx*c+dy*s,-dx*s+dy*c,type),ox=origin.x+origin.w/2,oy=origin.y+origin.h/2,cx=b.x+b.w/2,cy=b.y+b.h/2;return {...b,x:b.x+(cx-ox)*c-(cy-oy)*s-(cx-ox),y:b.y+(cx-ox)*s+(cy-oy)*c-(cy-oy)};}

export function resizeProportional(origin,handle,dx,dy,type){
 const west=handle.includes('w'),east=handle.includes('e'),north=handle.includes('n'),south=handle.includes('s'),horizontal=west||east,vertical=north||south;
 const vx=(west?-1:1)*origin.w,vy=(north?-1:1)*origin.h;
 let factor=horizontal&&vertical?1+(dx*vx+dy*vy)/(vx*vx+vy*vy):horizontal?1+dx/vx:1+dy/vy;
 factor=Math.max(Math.max(1/origin.w,1/origin.h),Math.min(10000/origin.w,10000/origin.h,factor));
 const w=origin.w*factor,h=origin.h*factor;
 return {...origin,w,h,x:west?origin.x+origin.w-w:east?origin.x:origin.x+(origin.w-w)/2,y:north?origin.y+origin.h-h:south?origin.y:origin.y+(origin.h-h)/2,...(Number.isFinite(origin.size)?{size:origin.size*factor}:{}),contentScale:(origin.contentScale||1)*factor};
}
export function rotateObjects(positions,bounds,delta){
 const angle=delta*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=bounds.x+bounds.w/2,cy=bounds.y+bounds.h/2;
 return Object.fromEntries(Object.entries(positions).map(([key,p])=>{const x=p.x+p.w/2-cx,y=p.y+p.h/2-cy;return[key,{...p,x:cx+x*c-y*s-p.w/2,y:cy+x*s+y*c-p.h/2,rotation:normalizeAngle((p.rotation||0)+delta)}]}));
}
