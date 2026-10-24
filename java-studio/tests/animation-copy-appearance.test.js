import test from 'node:test';
import assert from 'node:assert/strict';
import {animationScene,normalizeAnimation} from '../src/animationModel.js';
import {duplicateElement} from '../src/editor.js';
import {copyObjects,pasteObjects} from '../src/objectSelection.js';
import {serializeObjects,parseObjects} from '../src/frameTransfer.js';
const scene=()=>({id:'copy-appearance',blockKeys:['text'],positions:{text:{x:100,y:150,w:400,h:140,size:28,textStyle:{font:'JetBrains Mono',weight:600,italic:true,underline:true,color:'#111111'}}},elements:{text:{type:'text',text:'Un texte stylisé',name:'Titre'}},fragments:{text:{order:0,animation:'none'}},groups:[],animation:normalizeAnimation({duration:8,clips:[{id:'text-motion',keys:['text'],duration:8,frames:[{field:'x',time:0,value:100,ease:'linear'},{field:'x',time:5,value:650},{field:'size',time:0,value:28,ease:'linear'},{field:'size',time:5,value:72},{field:'color',time:0,value:'#111111',ease:'linear'},{field:'color',time:5,value:'#ff8800'},{field:'rotation',time:0,value:0,ease:'linear'},{field:'rotation',time:5,value:25}]}]})});
test('duplication can use an evaluated appearance without mutating the source or copying its tracks',()=>{
 const s=scene(),original=JSON.stringify(s),snapshot=animationScene(s,s.animation,5).scene;
 const key=duplicateElement(s,'text',snapshot),p=s.positions[key];
 assert.equal(p.x,674);assert.equal(p.y,174);assert.equal(p.size,72);assert.equal(p.rotation,25);
 assert.equal(p.textStyle.color,'#ff8800');assert.equal(p.textStyle.font,'JetBrains Mono');assert.equal(p.textStyle.underline,true);
 assert(!s.animation.clips.some(c=>c.keys.includes(key)));
 assert.equal(s.positions.text.x,100);assert.equal(s.positions.text.size,28);
 assert.equal(s.elements[key].text,'Un texte stylisé');assert.equal(s.animation.clips[0].frames.length,8);
 p.textStyle.color='#000000';assert.equal(snapshot.positions.text.textStyle.color,'#ff8800');
 const base=JSON.parse(original),plain=duplicateElement(base,'text');assert.equal(base.positions[plain].size,28,'Other editors retain their default source behaviour');
});
test('clipboard transfer freezes appearance at copy time, independently of the later playhead',()=>{
 const s=scene(),snapshot=animationScene(s,s.animation,5).scene;
 const clipboard=parseObjects(serializeObjects(copyObjects(snapshot,['text'])));
 const [key]=pasteObjects(s,clipboard,24);
 assert.equal(s.positions[key].x,674);assert.equal(s.positions[key].size,72);assert.equal(s.positions[key].textStyle.color,'#ff8800');
 for(const time of [0,3,5,8]){
  const evaluated=animationScene(s,s.animation,time).scene;
  assert.equal(evaluated.positions[key].size,72);assert.equal(evaluated.positions[key].textStyle.color,'#ff8800');
 }
 assert(!s.animation.clips.some(c=>c.keys.includes(key)));
});
