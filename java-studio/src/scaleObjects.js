const clone=v=>JSON.parse(JSON.stringify(v));
// Uniform scale around a fixed anchor. Content scale preserves all internal metrics,
// including code padding, list markers, table tracks and strokes without rounding.
export function scaleObjects(positions,bounds,factor,anchor=null){
 if(!bounds||!Number.isFinite(factor)||factor<=0)return null;
 anchor||={x:bounds.x,y:bounds.y};
 let min=.01,max=100;
 for(const p of Object.values(positions)){const content=p.contentScale||1;min=Math.max(min,.01/content,.5/(p.size||38));max=Math.min(max,100/content,2600/(p.size||38),10000/p.w,10000/(p.h||1));}
 const ratio=Math.max(min,Math.min(max,factor));
 return {factor:ratio,positions:Object.fromEntries(Object.entries(positions).map(([key,source])=>{const p=clone(source);return [key,{...p,x:anchor.x+(p.x-anchor.x)*ratio,y:anchor.y+(p.y-anchor.y)*ratio,w:p.w*ratio,...(Number.isFinite(p.h)?{h:p.h*ratio}:{}),size:p.size*ratio,...(p.wrapWidth?{wrapWidth:p.wrapWidth*ratio}:{}),contentScale:(p.contentScale||1)*ratio}];}))};
}
export function scaleFromHandle(bounds,handle,dx,dy){const west=handle.includes('w'),north=handle.includes('n'),vx=(west?-1:1)*bounds.w,vy=(north?-1:1)*bounds.h;return {factor:Math.max(.01,1+(dx*vx+dy*vy)/(vx*vx+vy*vy)),anchor:{x:bounds.x+(west?bounds.w:0),y:bounds.y+(north?bounds.h:0)}};}
