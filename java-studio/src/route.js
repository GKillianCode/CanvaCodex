// A single ordered deck is shared by the canvas, presentation and exports.
export function spatialRoute(slides,startId=null) {
 if(!slides.length)return [];
 const ranks=new Map(slides.map((s,n)=>[s.id,n]));
 const remaining=[...slides];
 const first=remaining.find(s=>s.id===startId)||[...remaining].sort((a,b)=>a.grid.y-b.grid.y||a.grid.x-b.grid.x||ranks.get(a.id)-ranks.get(b.id))[0];
 const route=[first];remaining.splice(remaining.indexOf(first),1);
 while(remaining.length){const origin=route.at(-1).grid;
  const score=s=>{const dx=s.grid.x-origin.x,dy=s.grid.y-origin.y;return [Math.abs(dx)+Math.abs(dy),dx===0||dy===0?0:1,dx>0&&dy===0?0:dy>0&&dx===0?1:dx<0&&dy===0?2:3,ranks.get(s.id)];};
  remaining.sort((a,b)=>{const x=score(a),y=score(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]-y[i];return 0;});route.push(remaining.shift());
 }return route;
}
export function tracedRoute(slides,ids) {
 const byId=new Map(slides.map(s=>[s.id,s])),seen=new Set(),route=[];
 for(const id of ids){if(byId.has(id)&&!seen.has(id)){route.push(byId.get(id));seen.add(id);}}
 return [...route,...slides.filter(s=>!seen.has(s.id))];
}
export function connectRoute(slides,fromId,toId) {
 if(fromId===toId||!slides.some(s=>s.id===fromId)||!slides.some(s=>s.id===toId))return [...slides];
 const target=slides.find(s=>s.id===toId),route=slides.filter(s=>s.id!==toId);
 route.splice(route.findIndex(s=>s.id===fromId)+1,0,target);return route;
}
// Connect the facing edges, leaving the thumbnails unobscured.
export function routePath(from,to,direction=null) {
 const dx=to.x-from.x,dy=to.y-from.y;
 if(direction?direction.y!==0:Math.abs(dy)>Math.abs(dx)){const sign=direction?Math.sign(direction.y):Math.sign(dy),x1=from.x+120,y1=from.y+(sign>0?192:0),x2=to.x+120,y2=to.y+(sign>0?0:192),mid=(y1+y2)/2;return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;}
 const sign=(direction?Math.sign(direction.x):Math.sign(dx))||1,x1=from.x+(sign>0?240:0),y1=from.y+85,x2=to.x+(sign>0?0:240),y2=to.y+85,mid=(x1+x2)/2;return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}
