import assert from 'node:assert/strict';
import { MAX_ELEMENTS } from '../src/limits.js';
import { makeSlide, normalizeSlide } from '../src/model.js';
import { duplicateElement } from '../src/editor.js';
import { insertDroppedImages } from '../src/imageDrop.js';
import { captureComponent,normalizeComponents,insertComponent } from '../src/componentsLibrary.js';
import { normalizeGroups } from '../src/selection.js';
const s=makeSlide('title');
for(let n=0;n<MAX_ELEMENTS-1;n++){const k='text'+n;s.elements[k]={type:'text',custom:true,text:'Texte '+n};s.positions[k]={x:10,y:10,w:100,h:100,size:20};s.fragments[k]={order:0,animation:'fade'};}
assert.ok(duplicateElement(s,'text0'));assert.equal(Object.keys(s.elements).length,100);
assert.equal(duplicateElement(s,'text0'),null);
const keys=Object.keys(s.elements),c=captureComponent(s,keys,{x:0,y:0},'Cent éléments');
assert.equal(normalizeComponents([c])[0].items.length,100);
const target=makeSlide('title');assert.equal(insertComponent(target,c).length,100);assert.deepEqual(insertComponent(target,c),[]);
assert.equal(Object.keys(normalizeSlide(JSON.parse(JSON.stringify(target))).elements).length,100);
const bad={...c,items:[...c.items,c.items[0]]};assert.deepEqual(normalizeComponents([bad]),[]);
target.elements.textOverflow={type:'text',custom:true,text:'101'};assert.equal(Object.keys(normalizeSlide(target).elements).length,100);
const drop=makeSlide('title');Object.assign(drop.elements,Object.fromEntries(Object.entries(s.elements).slice(0,99)));const result=await insertDroppedImages(drop,[{},{}],{x:400,y:400},async()=> 'data:image/png;base64,YQ==');assert.equal(result.keys.length,1);assert.equal(Object.keys(drop.elements).length,100);
const groups=Array.from({length:50},(_,i)=>({id:'g'+i,keys:['k'+(i*2),'k'+(i*2+1)]}));assert.equal(normalizeGroups(groups,Array.from({length:100},(_,i)=>'k'+i)).length,50);
