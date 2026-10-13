import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlide,visibleBlocks} from '../src/model.js';
import {makeOverlay} from '../src/overlays.js';
import {normalizeShape} from '../src/shapes.js';
import {normalizeTable} from '../src/tables.js';
import {captureComponent} from '../src/componentsLibrary.js';
import {copyObjects,pasteObjects} from '../src/objectSelection.js';
import {groupSelection} from '../src/selection.js';
import {serializeObjects,parseObjects,serializeLibrary,parseLibrary,mergeLibraries,appendComponents,TRANSFER_PREFIX} from '../src/frameTransfer.js';
import {ComponentLibraryFile} from '../src/componentLibraryFile.js';
const component=(id='a',name='Carte')=>({...captureComponent(makeSlide(),['title'],{x:0,y:0},name),id});
const clone=v=>JSON.parse(JSON.stringify(v));
function disk(text=serializeLibrary([])){let content=text,aborted=0;const handle={name:'shared.json',getFile:async()=>({text:async()=>content}),queryPermission:async()=> 'granted',createWritable:async()=>{let draft;return {write:async v=>draft=v,close:async()=>content=draft,abort:async()=>aborted++};}};return {handle,get text(){return content;},set text(v){content=v;},get aborted(){return aborted;}};}
test('portable clipboard transfers groups, images, tables, text and corners into another instance independently',()=>{
 const source=makeOverlay('video-thumbnail');source.elements.imageMiniature.src='data:image/png;base64,YQ==';source.elements.shapeCarte.individualCorners=true;source.elements.shapeCarte.cornerRadii.tr=35;
 source.elements.tableTest=normalizeTable({cells:[['A','B'],['C','D']],headerPosition:'left'});source.positions.tableTest={x:100,y:100,w:600,h:300,size:32};source.fragments.tableTest={order:2,animation:'up'};source.blockKeys.push('tableTest');groupSelection(source,['imageMiniature','textTitre']);
 const keys=visibleBlocks(source),portable=serializeObjects({...copyObjects(source,keys),slideId:source.id});assert.ok(portable.startsWith(TRANSFER_PREFIX));const incoming=parseObjects(portable),dest=makeSlide();const inserted=pasteObjects(dest,incoming,0);assert.equal(inserted.length,keys.length);assert.equal(dest.groups.at(-1).keys.length,2);const byName=n=>inserted.find(k=>dest.elements[k].name===n);assert.equal(dest.elements[byName('Miniature')].src,source.elements.imageMiniature.src);assert.equal(dest.elements[byName('Carte')].cornerRadii.tr,35);const table=inserted.find(k=>dest.elements[k].type==='table');assert.equal(dest.elements[table].cells[1][1],'D');assert.equal(dest.elements[table].headerPosition,'left');dest.elements[byName('Carte')].cornerRadii.tr=10;assert.equal(source.elements.shapeCarte.cornerRadii.tr,35);
 const payload=parseObjects(serializeObjects({component:component(),groups:[]},'component'));assert.equal(payload.kind,'component');
});
test('external clipboard ignores ordinary text and rejects unsupported, malformed, overlapping or partial payloads',()=>{
 assert.equal(parseObjects('Hello world'),null);assert.throws(()=>parseObjects(TRANSFER_PREFIX+'bad'));const valid=JSON.parse(serializeObjects({component:component(),groups:[]}).slice(TRANSFER_PREFIX.length));for(const patch of [{version:2},{groups:[[0,0]]},{groups:[[0,9]]},{kind:'script'}])assert.throws(()=>parseObjects(TRANSFER_PREFIX+JSON.stringify({...valid,...patch})));
 const c=component();c.items.push({...c.items[0],element:{type:'script'}});assert.throws(()=>parseObjects(serializeObjects({component:c,groups:[]})));assert.throws(()=>parseLibrary('{"format":"other","version":1,"components":[]}'));assert.throws(()=>parseLibrary(serializeLibrary([]).replace('"version": 1','"version": 2')));
});
test('library merge preserves independent edits and additions, detects edit/delete conflicts and respects capacity',()=>{
 const a=component('a'),b=component('b'),base=[a,b],local=[{...clone(a),name:'Local'},clone(b)],remote=[clone(a),{...clone(b),name:'Remote'},component('c')];const result=mergeLibraries(base,local,remote);assert.deepEqual(result.conflicts,[]);assert.equal(result.components.find(c=>c.id==='a').name,'Local');assert.equal(result.components.find(c=>c.id==='b').name,'Remote');assert.equal(result.components.length,3);result.components[0].name='Changed';assert.equal(remote[0].name,a.name);
 assert.deepEqual(mergeLibraries([a],[],[{...a,name:'Changed elsewhere'}]).conflicts,['Changed elsewhere']);assert.equal(mergeLibraries([a],[],[a]).components.length,0);assert.equal(mergeLibraries([a],[{...a,name:'X'}],[{...a,name:'Y'}]).conflicts.length,1);assert.equal(mergeLibraries([a],[{...a,name:'X'}],[{...a,name:'X'}]).conflicts.length,0);
 assert.throws(()=>appendComponents(Array.from({length:100},(_,i)=>component(String(i))),[component('extra')]));
});
test('portable library deconflicts IDs without replacing existing components and never aliases imports',()=>{
 const a=component(),incoming=parseLibrary(serializeLibrary([a]));assert.equal(appendComponents([a],incoming).length,1);incoming[0].name='Different';const added=appendComponents([a],incoming);assert.equal(added.length,2);assert.notEqual(added[1].id,a.id);added[1].items[0].position.x=1;assert.notEqual(incoming[0].items[0].position.x,1);const dup=parseLibrary(serializeLibrary([a,a]));assert.notEqual(dup[0].id,dup[1].id);assert.throws(()=>parseLibrary(JSON.stringify({format:'frame-component-library',version:1,components:[a,a]})));assert.throws(()=>parseLibrary(JSON.stringify({format:'frame-component-library',version:1,components:[{...a,id:null}]})));
});
test('two file-linked browser sessions merge independent updates and never overwrite conflicting edits',async()=>{
 const a=component('a'),b=component('b'),d=disk(serializeLibrary([a,b]));const api={showOpenFilePicker:async()=>[d.handle],showSaveFilePicker:async()=>d.handle},memory=async()=>null;const first=new ComponentLibraryFile(api,memory),second=new ComponentLibraryFile(api,memory);let left=await first.open(),right=await second.open();left[0].name='First browser';await first.save(left);right[1].name='Second browser';right=await second.save(right);assert.equal(right[0].name,'First browser');assert.equal(right[1].name,'Second browser');left=await first.reload(left);assert.equal(left[1].name,'Second browser');
 left[0].name='Pending local';right[0].name='Conflict remote';await second.save(right);const before=d.text;await assert.rejects(first.save(left),e=>e.message==='conflict');assert.equal(d.text,before);assert.equal(left[0].name,'Pending local');await assert.rejects(first.reload(left),e=>e.message==='conflict');assert.equal(d.text,before);
});
test('library writes abort if another writer changes the file after the check and permission denial preserves disk',async()=>{
 const d=disk(serializeLibrary([component()])),initial=d.text;const api={showOpenFilePicker:async()=>[d.handle],showSaveFilePicker:async()=>d.handle};const file=new ComponentLibraryFile(api,async()=>null);const items=await file.open();const create=d.handle.createWritable;d.handle.createWritable=async()=>{const writer=await create();d.text=serializeLibrary([component('other')]);return writer;};await assert.rejects(file.save(items),e=>e.message==='changed');assert.equal(d.aborted,1);assert.notEqual(d.text,initial);d.handle.queryPermission=async()=> 'denied';d.handle.requestPermission=async()=> 'denied';const before=d.text;await assert.rejects(file.save(items),e=>e.message==='permission');assert.equal(d.text,before);
});

test('opening a file keeps existing local components and a first save preserves an existing library',async()=>{
 const existing=component('disk'),local=component('local'),d=disk(serializeLibrary([existing]));const api={showOpenFilePicker:async()=>[d.handle],showSaveFilePicker:async()=>d.handle};const file=new ComponentLibraryFile(api,async()=>null);const combined=await file.open([local]);assert.equal(combined.length,2);assert.equal(parseLibrary(file.baseline).length,1);const fresh=new ComponentLibraryFile(api,async()=>null);const saved=await fresh.save([local]);assert.equal(saved.length,2);assert.ok(saved.some(c=>c.id==='disk'));assert.ok(saved.some(c=>c.id==='local'));
});
