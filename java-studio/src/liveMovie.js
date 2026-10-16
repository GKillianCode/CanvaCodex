import {pngMovie} from './pngMovie.js';
// PNG samples preserve alpha. Captures are serialized; skipped slots repeat the
// previous frame so a slow encoder never shortens a live presentation.
export function createLiveMovie(canvas,{fps=30,maxBytes=256*1024*1024,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,onLimit=()=>{},onError=()=>{}}={}){
 const frames=[];let bytes=0,handle,pending,stopped=false,started=now(),last,stopPromise;
 const append=frame=>{if(bytes+frame.size>maxBytes)return false;frames.push(frame);bytes+=frame.size;return true;};
 const capture=()=>{
  const slot=Math.floor((now()-started)*fps/1000);
  pending=new Promise((resolve,reject)=>{try{canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Capture vidéo impossible.')),'image/png');}catch(e){reject(e);}}).then(frame=>{
   while(frames.length<slot&&last){if(!append(last)){stopped=true;onLimit();return;}}
   if(!append(frame)){stopped=true;onLimit();return;}last=frame;
  }).catch(error=>{stopped=true;onError(error);}).finally(()=>{if(!stopped)handle=schedule(capture,1000/fps);});
 };
 capture();
 return {stop(){if(stopPromise)return stopPromise;stopped=true;cancel(handle);const target=Math.max(1,Math.ceil((now()-started)*fps/1000));stopPromise=(async()=>{await pending;while(frames.length<target&&last){if(!append(last))break;}if(!frames.length)throw Error('Aucune image enregistrée.');return pngMovie(frames,{width:canvas.width,height:canvas.height,fps});})();return stopPromise;}};
}
