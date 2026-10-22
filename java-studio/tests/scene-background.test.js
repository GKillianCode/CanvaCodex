import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBackground} from '../src/sceneBackground.js';
import {makeSlide,normalizeSlide} from '../src/model.js';
import {addPedagogicalStep,sceneAt} from '../src/pedagogicalSteps.js';
test('old documents inherit their existing background; malformed settings remain bounded',()=>{
 assert.equal(normalizeSlide(makeSlide()).background.mode,'inherit');
 assert.equal(normalizeBackground(null).mode,'inherit');
 const b=normalizeBackground({mode:'script',spacing:-1,size:Infinity,rotation:400,opacity:999,color:'url(evil)',baseRole:'<script>'});
 assert.equal(b.mode,'inherit');assert.equal(b.spacing,8);assert.equal(b.size,3);assert.equal(b.rotation,180);assert.equal(b.opacity,100);assert.equal(b.color,'#ffffff');assert.equal(b.baseRole,null);
});
test('pattern survives document serialization and remains independent between pedagogical steps',()=>{
 const s=makeSlide();s.background=normalizeBackground({mode:'dots',base:'#ffffff',color:'#000000',rotation:25,stagger:true,opacity:13,spacing:42});
 addPedagogicalStep(s);s.pedagogicalSteps[0].scene.background.rotation=60;
 const restored=normalizeSlide(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.background.rotation,25);assert.equal(sceneAt(restored,1).background.rotation,60);assert.equal(sceneAt(restored,1).background.spacing,42);assert.equal(sceneAt(restored,1).background.stagger,true);
});
test('shared background is an opt-in project setting and survives normalization',async()=>{
 const {normalizeFrame}=await import('../src/model.js');
 assert.equal(normalizeFrame({}).fixedBackground,false);
 const restored=normalizeFrame(JSON.parse(JSON.stringify({fixedBackground:true,background:{mode:'grid',rotation:31,opacity:12}})));
 assert.equal(restored.fixedBackground,true);assert.equal(restored.background.mode,'grid');assert.equal(restored.background.rotation,31);
});
