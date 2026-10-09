import {WIDTH,HEIGHT,visibleBlocks} from './model.js';
import {appearanceRows} from './appearances.js';
import {renderSlide} from './render.js';
import {normalizeClip,clipMotion} from './overlayAnimation.js';
import {pngMovie} from './pngMovie.js';
export function renderOverlayFrame(ctx,slide,theme,raw,time,width=WIDTH,height=HEIGHT){
 const clip=normalizeClip(raw,visibleBlocks(slide));ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);if(clip.background==='chroma'){ctx.fillStyle=clip.chroma;ctx.fillRect(0,0,width,height);}ctx.scale(width/WIDTH,height/HEIGHT);
 renderSlide(ctx,slide,theme,{transparent:true,header:false,footer:false,objectMotion:clipMotion(slide,clip,time,appearanceRows(slide).filter(row=>row.keys.some(k=>!slide.hiddenKeys?.includes(k))))});ctx.restore();
}
const aborted=()=>new DOMException('Export annulé.','AbortError');
const check=signal=>{if(signal?.aborted)throw aborted();};
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Impossible de créer une image vidéo.')),'image/png'));
export async function exportTransparentMovie({canvas,slide,theme,clip,signal,onProgress=()=>{}}){
 const fps=30,count=Math.round(clip.duration*fps),frames=[];let bytes=0;const ctx=canvas.getContext('2d');
 for(let i=0;i<count;i++){check(signal);renderOverlayFrame(ctx,slide,theme,{...clip,background:'transparent'},i*clip.duration/(count-1),canvas.width,canvas.height);const frame=await png(canvas);check(signal);bytes+=frame.size;if(bytes>256*1024*1024)throw Error('La vidéo dépasse 256 Mo. Réduis sa durée ou sa résolution.');frames.push(frame);onProgress((i+1)/count);if(i%6===0)await new Promise(resolve=>setTimeout(resolve,0));}
 check(signal);return pngMovie(frames,{width:canvas.width,height:canvas.height,fps});
}
export function exportChromaMovie({canvas,slide,theme,clip,signal,onProgress=()=>{}}){
 return new Promise((resolve,reject)=>{
  if(!canvas.captureStream||!globalThis.MediaRecorder){reject(Error('Export WebM indisponible. Utilise le MOV transparent.'));return;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){reject(Error('Export WebM indisponible. Utilise le MOV transparent.'));return;}
  let stream,recorder,timer,watchdog,started,finished=false;const chunks=[],ctx=canvas.getContext('2d');
  const cleanup=()=>{clearTimeout(timer);clearTimeout(watchdog);signal?.removeEventListener('abort',cancel);document.removeEventListener('visibilitychange',visibility);stream?.getTracks().forEach(t=>t.stop());};
  const fail=error=>{if(finished)return;finished=true;cleanup();if(recorder?.state==='recording')recorder.stop();reject(error);};
  const cancel=()=>fail(aborted());
  const visibility=()=>{if(document.hidden)fail(Error('L’onglet a été masqué. Relance le WebM en restant sur cette fenêtre, ou utilise le MOV.'));};
  try{
   check(signal);renderOverlayFrame(ctx,slide,theme,{...clip,background:'chroma'},0,canvas.width,canvas.height);stream=canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.round(8000000*canvas.width/1920)});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>fail(Error('L’enregistrement WebM a échoué.'));
   recorder.onstop=()=>{if(finished)return;finished=true;cleanup();if(!chunks.length){reject(Error('Le navigateur n’a produit aucune vidéo.'));return;}onProgress(1);resolve(new Blob(chunks,{type:mime}));};
   signal?.addEventListener('abort',cancel,{once:true});document.addEventListener('visibilitychange',visibility);recorder.start(500);started=performance.now();
   const tick=()=>{if(finished)return;const time=Math.min(clip.duration,(performance.now()-started)/1000);renderOverlayFrame(ctx,slide,theme,{...clip,background:'chroma'},time,canvas.width,canvas.height);onProgress(time/clip.duration);if(time>=clip.duration){timer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},40);}else timer=setTimeout(tick,1000/30);};tick();
   watchdog=setTimeout(()=>fail(Error('Le navigateur n’a pas finalisé la vidéo. Réessaie en MOV.')),(clip.duration+15)*1000);
  }catch(error){fail(error);}
 });
}
