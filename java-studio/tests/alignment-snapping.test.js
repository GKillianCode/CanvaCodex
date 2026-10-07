import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapTranslation } from '../src/alignmentSnapping.js';
import { enclosingBounds } from '../src/selection.js';
test('aligns edges and centers with slide and objects, independently per axis',()=>{
 const p={a:{x:100,y:100,w:100,h:80}},b=p.a;
 const result=snapTranslation(p,b,[{x:300,y:250,w:120,h:80}],197,148,6);
 assert.equal(result.positions.a.x,300);assert.equal(result.positions.a.y,250);
 assert.deepEqual(result.guides,[{axis:'x',value:300},{axis:'y',value:250}]);
 const center=snapTranslation(p,b,[],808,398,6);
 assert.equal(center.positions.a.x,910);assert.equal(center.positions.a.y,500);
 assert.deepEqual(center.guides,[{axis:'x',value:960},{axis:'y',value:540}]);
});
test('moves groups rigidly, preserves styles, and chooses closest alignment',()=>{
 const p={a:{x:100,y:100,w:50,h:60,rotation:25},b:{x:180,y:140,w:70,h:40,font:'Inter'}};
 const box={x:100,y:100,w:150,h:80};
 const result=snapTranslation(p,box,[{x:400,y:400,w:100,h:100},{x:405,y:500,w:100,h:100}],303,0,6);
 assert.equal(result.positions.a.x,405);assert.equal(result.positions.b.x,485);
 assert.equal(result.positions.b.y-result.positions.a.y,40);
 assert.equal(result.positions.a.rotation,25);assert.equal(result.positions.b.font,'Inter');
 assert.equal(p.a.x,100);
});
test('does not snap outside tolerance and screen-scaled tolerance works across zoom levels',()=>{
 const p={a:{x:100,y:100,w:100,h:80}},target={x:400,y:300,w:100,h:80};
 const raw=snapTranslation(p,p.a,[target],289,180,6);
 assert.equal(raw.positions.a.x,389);assert.equal(raw.guides.length,0);
 assert.equal(snapTranslation(p,p.a,[target],289,180,12).positions.a.x,400);
 assert.equal(snapTranslation(p,p.a,[target],294,180,3).positions.a.x,394);
});
test('clamps bounds, retains rotated visible geometry, and excludes impossible snaps',()=>{
 const p={a:{x:100,y:100,w:200,h:100,rotation:90}},box=enclosingBounds([p.a]);
 const result=snapTranslation(p,box,[], -1000,-1000,6);
 const moved=enclosingBounds([result.positions.a]);assert.ok(Math.abs(moved.x)<1e-8);assert.ok(Math.abs(moved.y)<1e-8);
 const outside=snapTranslation({a:{x:100,y:100,w:100,h:100}},{x:100,y:100,w:100,h:100},[{x:-3,y:500,w:100,h:100}],-100,0,6);
 assert.equal(outside.positions.a.x,0);
 assert.deepEqual(snapTranslation({},box,[],0,0),{positions:{},guides:[]});
});
