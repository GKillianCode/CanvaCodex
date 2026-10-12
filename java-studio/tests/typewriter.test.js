import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeTypewriter,typewriterState,typewriterDuration,graphemes} from '../src/typewriter.js';
import {makeSlide,normalizeSlide} from '../src/model.js';
import {text} from '../src/render.js';
import {clipMotion,normalizeClip} from '../src/overlayAnimation.js';
test('typewriter uses elapsed time, delay, words and intact Unicode graphemes',()=>{
 const c={enabled:true,speed:2,delay:1,cursor:'bar'};
 assert.equal(typewriterState('A👨‍👩‍👧‍👦é',c,999).count,0);
 assert.equal(typewriterState('A👨‍👩‍👧‍👦é',c,2000).count,2);
 assert.equal(graphemes('A👨‍👩‍👧‍👦é').length,3);
 assert.equal(typewriterDuration('A👨‍👩‍👧‍👦é',c),2500);
 assert.equal(typewriterState('bonjour monde',{enabled:true,mode:'word',speed:1},1000).count,8);
 assert.equal(typewriterState('abc',c,3000).cursor,'');
 assert.equal(typewriterState('abc',c,undefined).count,Infinity);
 assert.equal(normalizeTypewriter({speed:-10,delay:80}).speed,1);
});
test('saved text settings survive normalization; old projects stay static',()=>{
 const s=makeSlide('title');s.positions.title.typewriter={enabled:true,mode:'word',speed:4,delay:.5,cursor:'block'};
 assert.deepEqual(normalizeSlide(JSON.parse(JSON.stringify(s)),0).positions.title.typewriter,s.positions.title.typewriter);
 assert.equal(normalizeSlide(makeSlide('title'),0).positions.title.typewriter.enabled,false);
});
test('partial text retains full wrapping and center coordinates',()=>{
 const calls=[],ctx={measureText:v=>({width:v.length*10}),fillText:(...args)=>calls.push(args),save(){},restore(){},fillRect(){}};
 text(ctx,'bonjour monde',10,20,200,20,'#fff',400,'Arial',1.35,{align:'center'},100,{count:3,done:false,cursor:''});
 assert.equal(calls[0][0],'bon');const x=calls[0][1];calls.length=0;
 text(ctx,'bonjour monde',10,20,200,20,'#fff',400,'Arial',1.35,{align:'center'},100);
 assert.equal(calls[0][1],x);assert.equal(calls[0][0],'bonjour monde');
});
test('overlay writing starts at each track entrance and keeps elapsed time through exit',()=>{
 const s=makeSlide('title'),clip=normalizeClip({duration:6,tracks:{title:{start:1,end:5,entry:.5,exit:.5}}},['title']);
 const rows=[{keys:['title']}];assert.equal(clipMotion(s,clip,.5,rows).title.visible,false);
 assert.equal(clipMotion(s,clip,2,rows).title.typingElapsed,1000);
 assert.equal(clipMotion(s,clip,4.8,rows).title.typingElapsed,3800);
});
test('word reveal preserves source offsets across wrapped lines and newlines',()=>{
 const calls=[],ctx={measureText:v=>({width:v.length*10}),fillText:(...args)=>calls.push(args),save(){},restore(){},fillRect(){}};
 const value='un\ndeux trois';const typing=typewriterState(value,{enabled:true,mode:'word',speed:1},2000);
 text(ctx,value,0,0,55,20,'#fff',400,'Arial',1.35,{},null,typing);
 assert.equal(calls.map(c=>c[0]).join(''),'undeux');
});
test('shared overlay renderer writes a partial frame and then the complete text',async()=>{
 const {renderOverlayFrame}=await import('../src/overlayVideo.js');
 const calls=[],ctx=new Proxy({globalAlpha:1,measureText:v=>({width:v.length*10}),fillText:(v)=>calls.push(v),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:()=>{}});
 const s=makeSlide('title');s.blockKeys=['title'];s.label='';s.title='Bonjour';s.positions.title.typewriter={enabled:true,speed:2};
 const theme={bg:'#000000',ink:'#ffffff',accent:'#35ff91',secondary:'#38baff',panel:'#222222'};
 renderOverlayFrame(ctx,s,theme,{duration:6,animation:'none',stagger:0},1);assert.ok(calls.includes('Bo'));assert.ok(!calls.includes('Bonjour'));calls.length=0;
 renderOverlayFrame(ctx,s,theme,{duration:6,animation:'none',stagger:0},4);assert.ok(calls.includes('Bonjour'));
});
test('code finishes with all tab-expanded text and preserves syntax token colors',async()=>{
 const {renderSlide}=await import('../src/render.js');const calls=[],ctx=new Proxy({globalAlpha:1,measureText:v=>({width:v.length*10}),fillText(v){calls.push([v,this.fillStyle]);},createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:()=>{}});
 const s=makeSlide('title');s.blockKeys=['code'];s.code='\tint x = 1;';s.positions.code.typewriter={enabled:true,speed:2};
 renderSlide(ctx,s,{bg:'#000000',ink:'#ffffff',accent:'#35ff91',secondary:'#38baff',panel:'#222222'},{transparent:true,typingElapsed:{code:10000}});
 assert.ok(calls.some(([v,color])=>v==='int'&&color==='#c5a9ff'));assert.ok(calls.some(([v])=>v===';'));
});
