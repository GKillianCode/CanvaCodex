import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePage,pageGeometry,pageMarkdown,pageHeight,pagePoint} from '../src/conductorPage.js';
import {normalizeWorkflow,remapWorkflow,updateWorkflowSection} from '../src/videoWorkflow.js';
const text={id:'text',kind:'text',name:'Accroche',content:'## Une règle\n\n==yellow|À retenir==',imageId:'',x:40,y:40,width:500,height:200};
const image={id:'image',kind:'image',name:'Illustration',content:'',imageId:'asset',x:600,y:40,width:300,height:200};
test('page placement remains bounded, finite and snapped without changing block content',()=>{
 assert.equal(pageGeometry(text,{x:67,y:107},true).x,60);
 assert.equal(pageGeometry(text,{x:67,y:107},true).y,100);
 const moved=pageGeometry(text,{x:2000,y:-20});assert.equal(moved.x,500);assert.equal(moved.y,0);assert.equal(moved.content,text.content);
 const invalid=normalizePage([{...text,width:NaN,height:Infinity},text,null,{id:'<bad>'}]);assert.equal(invalid.length,1);assert.equal(invalid[0].width,600);assert.equal(invalid[0].height,240);
 assert.equal(pageHeight([{...text,y:1600}]),1840);assert.equal(normalizePage(null),null);assert.deepEqual(normalizePage([]),[]);
});
test('layout roundtrips across workflow saves and video duplication, with readable Markdown fallback',()=>{
 const layout=[image,text],source=pageMarkdown(layout,[{id:'asset'}]);assert.equal(source,text.content+'\n\n![](frame-image:asset)');assert.equal(pageMarkdown([image],[]),'');
 const project={workflow:{conductor:{sequences:[{id:'part',script:source,scriptLayout:layout,cuesLayout:[],images:[]}]}}};
 const normalized=normalizeWorkflow(JSON.parse(JSON.stringify(project.workflow)));assert.deepEqual(normalized.conductor.sequences[0].scriptLayout,layout);assert.deepEqual(normalized.conductor.sequences[0].cuesLayout,[]);
 const saved=updateWorkflowSection(project,'conductor',normalized.conductor,0);assert.deepEqual(saved.workflow.conductor.sequences[0].scriptLayout,layout);
 assert.deepEqual(remapWorkflow(saved.workflow,new Map()).conductor.sequences[0].scriptLayout,layout);
 assert.equal(normalizeWorkflow({conductor:{sequences:[{id:'old',script:'Ancien texte'}]}}).conductor.sequences[0].scriptLayout,undefined);
 assert.equal(normalizePage([{...text,content:'x'.repeat(100)},{...text,id:'second',content:'y'.repeat(100)}],120)[1].content.length,20);
});

test('context insertion uses the sheet coordinates after scroll and zoom',()=>{
 assert.deepEqual(pagePoint(310,240,{left:110,top:-160},.5),{x:400,y:800});
 assert.deepEqual(pagePoint(-20,-10,{left:10,top:20},1),{x:0,y:0});
 assert.deepEqual(pagePoint(5000,1e6,{left:0,top:0},1),{x:1000,y:50000});
});
