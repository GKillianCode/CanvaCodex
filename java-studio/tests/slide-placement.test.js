import assert from 'node:assert/strict';
import { placeOnSlide,slideAnchors } from '../src/slidePlacement.js';
import { enclosingBounds } from '../src/selection.js';
const p={a:{x:100,y:200,w:300,h:100,rotation:0,size:20},b:{x:500,y:300,w:100,h:100,rotation:0,size:30}};
for(const [x,y] of slideAnchors){const next=placeOnSlide(p,p,[],['a'],x,y);const b=next.a;
 assert.equal(b.x,({left:0,center:810,right:1620})[x]);assert.equal(b.y,({top:0,center:490,bottom:980})[y]);assert.equal(b.w,300);assert.equal(b.size,20);}
const group=[{keys:['a','b']}];const next=placeOnSlide(p,p,group,['a'],'center','center');assert.equal(next.b.x-next.a.x,400);assert.equal(next.b.y-next.a.y,100);assert.equal(next.a.x,710);assert.equal(next.a.y,440);
const edge=placeOnSlide(p,p,[],['a'],'right','bottom',24);assert.equal(edge.a.x,1596);assert.equal(edge.a.y,956);
const rotated={a:{x:100,y:100,w:200,h:100,rotation:45}};const r=placeOnSlide(rotated,rotated,[],['a'],'left','top');const bb=enclosingBounds([r.a]);assert.ok(Math.abs(bb.x)<1e-9&&Math.abs(bb.y)<1e-9);assert.equal(r.a.rotation,45);
assert.deepEqual(placeOnSlide(p,p,[],[],'center','center'),{});assert.deepEqual(placeOnSlide(p,p,[],['a'],'wrong','top'),{});
for(const width of [640,1920,2560,3840]){const offset=24*1920/width;const b=placeOnSlide(p,p,[],['a'],'left','top',offset).a;assert.equal(b.x*width/1920,24);}
