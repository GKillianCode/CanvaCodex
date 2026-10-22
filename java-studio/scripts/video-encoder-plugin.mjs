import {presentationRecordings} from './presentation-recordings.mjs';
import {videoFrameJobs} from './video-frame-jobs.mjs';
import {randomBytes} from 'node:crypto';
import {mkdtemp,open,rm} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encoderCapabilities,encodeVideoFile,encodingFormats} from './video-encoder.mjs';
export function videoEncoderPlugin({binary='ffmpeg'}={}){
 const token=randomBytes(32).toString('hex');let busy=false;const jobs=videoFrameJobs({token,binary,available:()=>!busy&&!recordings.active});const recordings=presentationRecordings({token,binary,available:()=>!busy&&!jobs.active});
 function install(server){server.middlewares.use('/__frame_presentation__',recordings.handle);server.middlewares.use('/__frame_video_frames__',jobs.handle);server.httpServer?.once('close',()=>{void Promise.allSettled([jobs.close(),recordings.close()]);});server.middlewares.use('/__frame_video__',async(req,res)=>{
  const json=(status,value)=>{if(res.destroyed)return;res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  let folder,owned=false;const controller=new AbortController();const abort=()=>{if(!res.writableEnded)controller.abort();};
  try{
   const host=req.headers.host||'',hostname=new URL('http://'+host).hostname;
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!['localhost','127.0.0.1','[::1]'].includes(hostname))return json(403,{error:'L’encodage est réservé à cet ordinateur.'});
   if(req.headers['sec-fetch-site']==='cross-site'||req.headers.origin&&!['http://'+host,'https://'+host].includes(req.headers.origin))return json(403,{error:'Origine refusée.'});
   const route=new URL(req.url,'http://'+host);
   if(req.method==='GET'&&route.pathname==='/capabilities')return json(200,{...(await encoderCapabilities(binary)),token,frameJobs:true,presentationRecording:true});
   if(req.method!=='POST'||route.pathname!=='/encode')return json(404,{error:'Route inconnue.'});
   if(req.headers['x-frame-video-token']!==token)return json(403,{error:'Session d’encodage expirée. Réessaie.'});
   const format=route.searchParams.get('format');if(!Object.hasOwn(encodingFormats,format))return json(400,{error:'Format inconnu.'});
   if(req.headers['content-type']!=='video/quicktime')return json(415,{error:'Capture MOV attendue.'});
   if(busy||jobs.active||recordings.active)return json(409,{error:'Un autre encodage est en cours sur cet ordinateur. Réessaie dans un instant.'});
   busy=true;owned=true;req.once('aborted',abort);res.once('close',abort);
   folder=await mkdtemp(join(tmpdir(),'frame-video-'));const input=join(folder,'capture.mov'),output=join(folder,'export.'+format),handle=await open(input,'wx',0o600);let bytes=0;
   try{for await(const chunk of req){bytes+=chunk.length;if(bytes>256*1024*1024)throw Error('La capture dépasse 256 Mo.');await handle.writeFile(chunk);}}finally{await handle.close();}
   if(controller.signal.aborted)throw new DOMException('Export annulé.','AbortError');
   const head=await open(input,'r');const prefix=Buffer.alloc(12);try{await head.read(prefix,0,12,0);}finally{await head.close();}
   if(bytes<12||prefix.toString('ascii',4,8)!=='ftyp')return json(400,{error:'Capture MOV invalide.'});
   const encoded=await encodeVideoFile(input,output,format,{binary,signal:controller.signal});
   res.setHeader('Content-Type',encoded.mime);res.setHeader('Content-Length',encoded.size);res.setHeader('Content-Disposition','attachment; filename="frame-video.'+format+'"');
   await pipeline(createReadStream(output),res);
  }catch(error){if(!res.headersSent)json(error.name==='AbortError'?499:500,{error:error.message||'Encodage impossible.'});else res.destroy();}
  finally{req.off('aborted',abort);res.off('close',abort);if(owned)busy=false;if(folder)await rm(folder,{recursive:true,force:true}).catch(()=>{});}
 });}
 return {name:'frame-local-video-encoder',configureServer:install,configurePreviewServer:install};
}
