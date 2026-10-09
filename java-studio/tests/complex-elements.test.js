import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presets,makeSlide,normalizeSlide,visibleBlocks,applyLayout } from '../src/model.js';
import { normalizeTable,resizeTable,drawTable } from '../src/tables.js';
import { normalizeShape } from '../src/shapes.js';
import { normalizeThemes } from '../src/themes.js';
import { boundColor } from '../src/colors.js';
import { copyObjects,pasteObjects } from '../src/objectSelection.js';
import { duplicateElement,rotatePoint } from '../src/editor.js';
import { restoreTemplateLayout } from '../src/editableTemplates.js';
import { interiorMargins } from '../src/interiorMargins.js';
test('30 compositions persist editable objects, removed decorations and their layer order',()=>{
 assert.equal(presets.length,30);
 for(const p of presets){let s=makeSlide(p.id);const order=visibleBlocks(s);assert.ok(order.length);s=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.deepEqual(visibleBlocks(s),order,p.id);const key=Object.keys(s.elements).find(k=>s.elements[k].template);if(key){delete s.elements[key];s.blockKeys=s.blockKeys.filter(k=>k!==key);s=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.ok(!visibleBlocks(s).includes(key));}}
});
test('old decorative compositions migrate once without moving their text or custom objects',()=>{
 const s=makeSlide('three');s.designVersion=2;for(const [k,e] of Object.entries(s.elements))if(e.template){delete s.elements[k];s.blockKeys=s.blockKeys.filter(key=>key!==k);}s.positions.body.x=240;s.fragments.body.order=5;s.label='CONCEPT';const old=structuredClone(s.positions.body),m=normalizeSlide(s);assert.equal(m.designVersion,3);assert.equal(m.positions.body.x,old.x);assert.equal(m.label,'');assert.ok(Object.values(m.elements).some(e=>e.text==='CONCEPT'));const panel=Object.keys(m.elements).find(k=>m.elements[k].name==='Fond de carte');assert.equal(m.positions[panel].x,208);assert.equal(m.fragments[panel].order,5);assert.deepEqual(visibleBlocks(normalizeSlide(JSON.parse(JSON.stringify(m)))),visibleBlocks(m));
 const copy=duplicateElement(m,panel);applyLayout(m,'split');assert.ok(m.elements[copy]);assert.equal(m.elements[copy].template,false);
});
test('table resize, JSON, clipboard and component data preserve cells and independence',()=>{
 const table=normalizeTable({rows:2,columns:2,cells:[['A','B'],['1','2']]});resizeTable(table,4,3);assert.equal(table.cells[1][1],'2');assert.equal(table.cells[3][2],'');assert.equal(normalizeTable({rows:999,columns:-9}).rows,20);resizeTable(table,2,2);
 const s=makeSlide('table-compare'),key=Object.keys(s.elements).find(k=>s.elements[k].type==='table');s.elements[key]=table;const target=makeSlide('title'),keys=pasteObjects(target,copyObjects(s,[key]),0);target.elements[keys[0]].cells[0][0]='Copie';assert.equal(s.elements[key].cells[0][0],'A');const restored=normalizeSlide(JSON.parse(JSON.stringify(target)));assert.equal(restored.elements[keys[0]].cells[0][0],'Copie');applyLayout(restored,'split');assert.ok(restored.elements[keys[0]]);
});
test('palette roles follow the theme while custom colors stay fixed',()=>{
 const [a,b]=normalizeThemes();const e=normalizeShape({fillRole:'accent',strokeRole:'secondary',fill:'#112233'});assert.equal(boundColor(e,'fill',a),a.accent);assert.equal(boundColor(e,'fill',b),b.accent);e.fillRole=null;assert.equal(boundColor(e,'fill',b),'#112233');assert.equal(normalizeTable().headerFillRole,'accent');
});
test('interior margins measure four edges, reject outside objects and account for rotations',()=>{
 const outer={x:100,y:100,w:400,h:300},inner={x:130,y:150,w:220,h:100};const m=interiorMargins(inner,outer);assert.deepEqual([m.left,m.right,m.top,m.bottom],[30,150,50,150]);assert.equal(interiorMargins({...inner,x:80},outer),null);const o={...outer,rotation:90},center=rotatePoint({x:inner.x+inner.w/2,y:inner.y+inner.h/2},o),i={...inner,x:center.x-inner.w/2,y:center.y-inner.h/2,rotation:90};const r=interiorMargins(i,o);assert.ok(Math.abs(r.left-30)<1e-7&&Math.abs(r.top-50)<1e-7);
});
test('table renderer uses bounded clipping and header colors in the shared Canvas output',()=>{
 const fills=[],texts=[],ctx={save(){},restore(){},fillRect(){fills.push(this.fillStyle);},strokeRect(){},beginPath(){},rect(){},roundRect(){},moveTo(){},lineTo(){},setLineDash(){},stroke(){},clip(){},measureText(t){return {width:t.length*15};},fillText(t){texts.push(t);}};drawTable(ctx,normalizeTable({rows:2,columns:2,cells:[['A','B'],['1','2']]}),{x:0,y:0,w:1000,h:400},normalizeThemes()[0],(_ctx,t)=>[t]);assert.deepEqual(texts,['A','B','1','2']);assert.equal(fills[0],normalizeThemes()[0].accent);
});


test('recomposition preserves written titles and restores decorations/fragments without dropping added objects',()=>{
 const s=makeSlide('three');s.title='Mon contenu';s.fragments.body.order=7;const old=structuredClone(s);applyLayout(s,'table-compare');assert.equal(s.title,'Mon contenu');s.elements.textAdded={type:'text',custom:true,text:'Après recomposition'};s.positions.textAdded={x:30,y:40,w:200,h:80,size:30};s.fragments.textAdded={order:4,animation:'up'};
 restoreTemplateLayout(s,old);assert.equal(s.layout,'three');assert.equal(s.fragments.body.order,7);for(const key of old.blockKeys)assert.deepEqual(s.fragments[key],old.fragments[key]);assert.equal(s.elements.textAdded.text,'Après recomposition');assert.equal(s.fragments.textAdded.order,4);assert.ok(visibleBlocks(s).includes('textAdded'));assert.deepEqual(visibleBlocks(normalizeSlide(JSON.parse(JSON.stringify(s)))),visibleBlocks(s));
});
