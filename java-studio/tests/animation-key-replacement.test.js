import test from 'node:test';
import assert from 'node:assert/strict';
import {addAnimationKey} from '../src/animationModel.js';
import {editableClip,moveKeySelection,sameKeyTime} from '../src/animationEditing.js';

test('revisiting the same scene frame replaces a value and preserves its curve and identity at every supported rate',()=>{
 for(const fps of [24,30,60]){
  const c={start:.123,duration:8,keys:['image'],frames:[]};
  const f=addAnimationKey(c,'x',5-c.start,200,'bezier',fps);
  f.curve=[.4,0,.7,1.2];
  const same=addAnimationKey(c,'x',5-c.start+.2/fps,900,'smooth',fps);
  assert.equal(same,f);assert.equal(c.frames.length,1);assert.equal(f.value,900);
  assert.equal(f.ease,'bezier');assert.deepEqual(f.curve,[.4,0,.7,1.2]);
  assert(Math.abs(c.start+f.time-5)<1e-9);
  addAnimationKey(c,'y',5-c.start,300,'smooth',fps);
  addAnimationKey(c,'x',5-c.start+1/fps,1000,'smooth',fps);
  assert.equal(c.frames.length,3,'Another property or an adjacent frame is independent');
 }
});
test('an edited channel repairs pre-existing overlapping keys on that frame only',()=>{
 const first={field:'x',time:3,value:100},last={field:'x',time:3.002,value:200,ease:'linear',curve:[0,0,1,1]};
 const c={start:2,duration:8,frames:[first,last,{field:'y',time:3,value:40},{field:'x',time:4,value:400}]};
 assert.equal(addAnimationKey(c,'x',3,777,'smooth',30),last);
 assert.equal(c.frames.length,3);assert.equal(last.value,777);assert.equal(last.time,3);
 assert.equal(c.frames.filter(f=>f.field==='x'&&sameKeyTime(c.start+f.time,5,30)).length,1);
});
test('an existing property key wins over a different selected track for the same object',()=>{
 const clips=[{id:'position',keys:['image'],start:1,duration:8,frames:[{field:'x',time:4,value:200}]},
 {id:'colour',keys:['image'],start:0,duration:8,frames:[{field:'color',time:5,value:'#ffffff'}]},
 {id:'other-image',keys:['other'],start:0,duration:8,frames:[{field:'x',time:5,value:900}]}];
 assert.equal(editableClip(clips,'colour','image',5.002,'x',30).id,'position');
 assert.equal(editableClip(clips,'position','image',5,'color',30).id,'colour');
 assert.equal(editableClip(clips,'colour','image',6,'x',30).id,'colour','Explicit selection still applies when no key exists at the cursor');
});
test('key drags reject same-frame collisions even when authored timestamps differ',()=>{
 const moving={field:'x',time:4,value:0},occupied={field:'x',time:5.002,value:10};
 const clip={start:0,duration:8,frames:[moving,occupied]};
 assert.equal(moveKeySelection([{clip,key:moving}],1,[4],30),false);
 assert.equal(moving.time,4);
 occupied.field='y';assert.equal(moveKeySelection([{clip,key:moving}],1,[4],30),true);
});
