import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveMovie} from '../src/liveMovie.js';
import {normalizeClip} from '../src/overlayAnimation.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('MOV is the clip default and WebM always requires a removable background',()=>{
 assert.equal(normalizeClip().format,'mov');
 assert.equal(normalizeClip().background,'transparent');
 assert.equal(normalizeClip({format:'webm',background:'transparent'}).background,'chroma');
 assert.equal(normalizeClip({format:'mov',background:'chroma'}).background,'chroma');
});
test('live MOV preserves elapsed time, serializes captures and finalizes once',async()=>{
 let time=0,next,captures=0,cancelled=0;
 const canvas={width:2,height:2,toBlob(fn){captures++;fn(new Blob([new Uint8Array([1,2,3])]));}};
 const recording=createLiveMovie(canvas,{now:()=>time,schedule:fn=>{next=fn;return 1;},cancel:()=>cancelled++});
 await flush();time=200;next();await flush();time=300;
 const promise=recording.stop();assert.equal(recording.stop(),promise);
 const blob=await promise;assert.equal(blob.type,'video/quicktime');
 const data=new Uint8Array(await blob.arrayBuffer());const text=new TextDecoder('latin1').decode(data);const index=text.indexOf('stsz');const view=new DataView(data.buffer);assert.equal(view.getUint32(index+12),9);
 assert.equal(captures,2);assert.equal(cancelled,1);
});
test('live MOV handles capture failure and stops at the memory budget',async()=>{
 let limited=0,error;
 const c={width:2,height:2,toBlob:fn=>fn(new Blob(['123']))};
 const r=createLiveMovie(c,{maxBytes:2,onLimit:()=>limited++});await flush();assert.equal(limited,1);await assert.rejects(r.stop(),/Aucune image/);
 const broken=createLiveMovie({...c,toBlob:fn=>fn(null)},{onError:e=>error=e});await flush();assert.match(error.message,/Capture/);await assert.rejects(broken.stop(),/Aucune image/);
});
test('stopping during an asynchronous PNG capture waits for that sample',async()=>{
 let complete,time=0;
 const r=createLiveMovie({width:2,height:2,toBlob:fn=>{complete=fn;}},{now:()=>time});
 time=100;const result=r.stop();complete(new Blob(['png']));
 const blob=await result;assert.equal(blob.type,'video/quicktime');assert.ok(blob.size>3);
});
