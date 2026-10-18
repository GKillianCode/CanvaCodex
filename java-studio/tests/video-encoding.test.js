import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {deflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {pngMovie} from '../src/pngMovie.js';
import {normalizeClip} from '../src/overlayAnimation.js';
import {normalizeOverlay,makeOverlay} from '../src/overlays.js';
import {encoderCapabilities,encodeVideoFile} from '../scripts/video-encoder.mjs';
import {videoEncoderPlugin} from '../scripts/video-encoder-plugin.mjs';
import {ensureVideoEncoder,encodeVideo} from '../src/videoEncoding.js';
const crc=bytes=>{let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^(c&1?0xedb88320:0);}return (c^0xffffffff)>>>0;};
const chunk=(name,data)=>{const n=Buffer.from(name),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([n,data])));return Buffer.concat([length,n,data,sum]);};
function sample(frame){const pixels=Buffer.alloc(16*16*4);for(let i=0;i<256;i++){pixels[i*4]=frame*5;pixels[i*4+1]=80;pixels[i*4+2]=190;pixels[i*4+3]=[0,64,128,255][i%4];}const rows=Buffer.concat(Array.from({length:16},(_,n)=>Buffer.concat([Buffer.from([0]),pixels.subarray(n*64,n*64+64)]))),header=Buffer.alloc(13);header.writeUInt32BE(16);header.writeUInt32BE(16,4);header[8]=8;header[9]=6;return {pixels,png:Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))])};}
const frames=Array.from({length:30},(_,n)=>sample(n));
const capture=()=>pngMovie(frames.map(s=>s.png),{width:16,height:16,fps:30});
test('MKV preserves transparent/chroma modes and timing through document reload',()=>{
 const clip=normalizeClip({format:'mkv',background:'transparent',duration:4});assert.equal(clip.format,'mkv');assert.equal(clip.background,'transparent');
 assert.equal(normalizeClip({format:'mkv',background:'chroma'}).background,'chroma');
 assert.equal(normalizeOverlay({type:'subscribe',slide:makeOverlay('subscribe'),clip}).clip.format,'mkv');
});
test('client reports unavailable encoders, preserves request format and passes cancellation',async()=>{
 const unavailable=async()=>new Response(JSON.stringify({formats:{mov:false},error:'FFmpeg absent'}));await assert.rejects(ensureVideoEncoder('mov',{fetcher:unavailable}),/FFmpeg absent/);
 await assert.rejects(ensureVideoEncoder('mkv',{fetcher:async()=>new Response('<html>')}),/Encodage local indisponible/);
 assert.equal(await ensureVideoEncoder('webm',{fetcher:()=>{throw Error('must not call');}}),null);
 const input=capture(),requests=[],signal=new AbortController().signal;
 const result=await encodeVideo(input,'mkv',{signal,fetcher:async(url,options)=>{requests.push([url,options]);return url.endsWith('capabilities')?Response.json({formats:{mkv:true},token:'local'}):new Response('encoded',{headers:{'content-type':'video/x-matroska'}});}});
 assert.equal(result.type,'video/x-matroska');assert.equal(requests[1][0],'/__frame_video__/encode?format=mkv');assert.equal(requests[1][1].body,input);assert.equal(requests[1][1].signal,signal);
 assert.equal(requests[1][1].headers['X-Frame-Video-Token'],'local');
});
test('real MOV QTRLE and MKV FFV1 decode losslessly with exact alpha, timing and dimensions',async t=>{
 const caps=await encoderCapabilities();if(!caps.formats.mov||!caps.formats.mkv){t.skip(caps.error);return;}
 const dir=await mkdtemp(join(tmpdir(),'frame-encode-test-'));try{
 const input=join(dir,'source.mov');await writeFile(input,new Uint8Array(await capture().arrayBuffer()));
 for(const [format,codec,pixel] of [['mov','qtrle','argb'],['mkv','ffv1','bgra']]){
  const output=join(dir,'result.'+format);await encodeVideoFile(input,output,format);
  const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));const s=metadata.streams[0];
  assert.equal(s.codec_name,codec);assert.equal(s.pix_fmt,pixel);assert.equal(s.width,16);assert.equal(s.height,16);assert.equal(Number(s.nb_read_frames),30);assert.ok(Math.abs(Number(metadata.format.duration)-1)<.04);
  const decoded=execFileSync('ffmpeg',['-v','error','-i',output,'-pix_fmt','rgba','-f','rawvideo','pipe:1']);assert.deepEqual(decoded,Buffer.concat(frames.map(s=>s.pixels)));
 }
 const aborted=new AbortController();aborted.abort();await assert.rejects(encodeVideoFile(input,join(dir,'cancel.mov'),'mov',{signal:aborted.signal}),{name:'AbortError'});
 const running=new AbortController(),job=encodeVideoFile(input,join(dir,'running.mov'),'mov',{signal:running.signal});running.abort();await assert.rejects(job,{name:'AbortError'});
 await assert.rejects(encodeVideoFile(input,join(dir,'small.mov'),'mov',{maxBytes:1}),/512 Mo/);
 assert.equal((await encoderCapabilities('/nonexistent/frame-ffmpeg')).formats.mov,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('local HTTP encoder rejects foreign origins and unauthenticated input and returns both codecs',async t=>{
 const caps=await encoderCapabilities();if(!caps.formats.mov||!caps.formats.mkv){t.skip(caps.error);return;}
 const {createServer}=await import('vite'),dir=await mkdtemp(join(tmpdir(),'frame-encode-http-'));let server;
 try{server=await createServer({root:dir,cacheDir:join(dir,'cache'),configFile:false,plugins:[videoEncoderPlugin()],server:{host:'127.0.0.1',port:0}});await server.listen();const url='http://127.0.0.1:'+server.httpServer.address().port+'/__frame_video__';
 const session=await (await fetch(url+'/capabilities')).json();assert.ok(session.formats.mov&&session.formats.mkv);
 assert.equal((await fetch(url+'/encode?format=mov',{method:'POST',body:capture(),headers:{'Content-Type':'video/quicktime'}})).status,403);
 assert.equal((await fetch(url+'/capabilities',{headers:{Origin:'https://other.invalid'}})).status,403);
 const headers={'Content-Type':'video/quicktime','X-Frame-Video-Token':session.token};
 assert.equal((await fetch(url+'/encode?format=bad',{method:'POST',headers,body:capture()})).status,400);
 assert.equal((await fetch(url+'/encode?format=mov',{method:'POST',headers,body:'invalid'})).status,400);
 for(const format of ['mov','mkv']){const response=await fetch(url+'/encode?format='+format,{method:'POST',headers,body:capture()});assert.equal(response.status,200);const file=join(dir,'http.'+format);await writeFile(file,Buffer.from(await response.arrayBuffer()));const codec=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name','-of','csv=p=0',file],{encoding:'utf8'}).trim();assert.equal(codec,format==='mov'?'qtrle':'ffv1');}
 }finally{await server?.close();await rm(dir,{recursive:true,force:true});}
});

test('MP4 export uses H.264, opaque pixels and exact frame timing',async t=>{
 if(!(await encoderCapabilities()).formats.mp4){t.skip('libx264 absent');return;}
 const dir=await mkdtemp(join(tmpdir(),'frame-mp4-test-'));
 try{const input=join(dir,'source.mov'),output=join(dir,'video.mp4');await writeFile(input,new Uint8Array(await capture().arrayBuffer()));await encodeVideoFile(input,output,'mp4',{quality:'balanced'});const metadata=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',output],{encoding:'utf8'}));assert.equal(metadata.streams[0].codec_name,'h264');assert.equal(metadata.streams[0].pix_fmt,'yuv420p');assert.equal(Number(metadata.streams[0].nb_read_frames),30);assert.ok(Math.abs(Number(metadata.format.duration)-1)<.04);}finally{await rm(dir,{recursive:true,force:true});}
});
