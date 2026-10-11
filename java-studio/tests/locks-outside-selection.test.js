import test from 'node:test';
import assert from 'node:assert/strict';
import {lockedSelection,setElementLocks} from '../src/elementLocks.js';
import {marqueeRect,marqueeKeys} from '../src/marquee.js';
import {makeThumbnail} from '../src/thumbnails.js';
import {normalizeSlide} from '../src/model.js';
test('locks persist, unlock and protect whole groups',()=>{const scene=makeThumbnail(),a='textPlaylistLabel',b='shapePlaylistLabel';scene.groups=[{id:'g',keys:[a,b]}];setElementLocks(scene,[a],true);assert.equal(lockedSelection(scene,[b]),true);const restored=normalizeSlide(JSON.parse(JSON.stringify(scene)),0);assert.equal(restored.positions[a].locked,true);setElementLocks(restored,[a],false);assert.equal(lockedSelection(restored,[b]),false);assert.equal(restored.elements[a].text,'Java');});
test('selection starts outside and includes only fully contained objects on canvas',()=>{const bounds={inside:{x:30,y:40,w:50,h:50},partial:{x:180,y:40,w:100,h:50},offscreen:{x:-20,y:40,w:50,h:50}};const rect=marqueeRect({x:-80,y:-90},{x:200,y:180});assert.deepEqual(rect,{x:0,y:0,w:200,h:180});assert.deepEqual(marqueeKeys(bounds,[],rect),['inside']);assert.deepEqual(marqueeKeys(bounds,[],marqueeRect({x:200,y:180},{x:-80,y:-90})),['inside']);assert.deepEqual(marqueeKeys(bounds,[],marqueeRect({x:-80,y:-90},{x:-20,y:-30})),[]);});

test('a transform becomes invalid when its object or group is locked mid-drag',async()=>{const {lockedTransform}=await import('../src/elementLocks.js');const scene={positions:{text:{locked:false},background:{locked:false}},groups:[]};const drag={key:'text',origins:{text:{x:10,y:20}},positions:{text:{x:40,y:60}}};assert.equal(lockedTransform(scene,drag),false);setElementLocks(scene,['text'],true);assert.equal(lockedTransform(scene,drag),true);assert.equal(lockedTransform(scene,{key:'background',position:{x:0}}),false);scene.groups=[{keys:['text','background']}];assert.equal(lockedTransform(scene,{key:'background',position:{x:0}}),true);});
