import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderer,h} from 'vue';
import {useVideoEncoding} from '../src/useVideoEncoding.js';
const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},parentNode:()=>null,nextSibling:()=>null,patchProp(){}});
test('failed encoding keeps the exact capture for retry, while success releases recovery',async()=>{
 let state,fail=true,calls=0;const downloads=[],source=new Blob(['capture'],{type:'video/quicktime'});
 const app=renderer.createApp({setup(){state=useVideoEncoding((...args)=>downloads.push(args),()=>{},{encoder:async(blob,format)=>{calls++;assert.equal(blob,source);assert.equal(format,'mkv');if(fail)throw Error('Encodeur temporairement indisponible');return new Blob(['encoded'],{type:'video/x-matroska'});}});return ()=>h('div');}});app.mount({});
 try{await assert.rejects(state.save(source,'mkv','frame-presentation-alpha.mkv'),/temporairement/);assert.equal(state.recovery.value.blob,source);assert.equal(state.recovery.value.sourceName,'frame-presentation-alpha-source-png.mov');assert.equal(downloads.length,0);assert.equal(state.busy.value,false);
 fail=false;await state.retry();assert.equal(calls,2);assert.equal(downloads[0][1],'frame-presentation-alpha.mkv');assert.equal(state.recovery.value,null);
 }finally{app.unmount();}
});
test('explicit cancellation does not create a failed-export recovery',async()=>{
 let state;const app=renderer.createApp({setup(){state=useVideoEncoding(()=>{},()=>{},{encoder:async()=>{throw new DOMException('Annulé','AbortError');}});return ()=>h('div');}});app.mount({});
 try{await assert.rejects(state.save(new Blob(['capture']),'mov','frame.mov'),{name:'AbortError'});assert.equal(state.recovery.value,null);assert.equal(state.busy.value,false);}finally{app.unmount();}
});
