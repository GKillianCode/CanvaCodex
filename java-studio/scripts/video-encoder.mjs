import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {stat} from 'node:fs/promises';
const exec=promisify(execFile);
export const encodingFormats={mov:{codec:'qtrle',pixel:'argb',muxer:'mov',mime:'video/quicktime'},mkv:{codec:'ffv1',pixel:'bgra',muxer:'matroska',mime:'video/x-matroska'},mp4:{codec:'libx264',pixel:'yuv420p',muxer:'mp4',mime:'video/mp4'}};
export async function encoderCapabilities(binary='ffmpeg'){
 try{const {stdout}=await exec(binary,['-hide_banner','-encoders'],{timeout:5000,maxBuffer:1024*1024,windowsHide:true});const formats=Object.fromEntries(Object.entries(encodingFormats).map(([name,spec])=>[name,new RegExp('\\b'+spec.codec+'\\b').test(stdout)]));return {formats,error:Object.values(formats).every(Boolean)?'':'Cette installation FFmpeg ne fournit pas tous les codecs requis.'};}
 catch{return {formats:{mov:false,mkv:false},error:'FFmpeg est introuvable. Installe FFmpeg et rends sa commande accessible au lancement de Frame, puis redémarre l’application.'};}
}
export function encodeVideoFile(input,output,format,{signal,binary='ffmpeg',maxBytes=512*1024*1024,timeout=10*60*1000,inputOptions=[],quality='balanced',preset='medium'}={}){
 const spec=encodingFormats[format];if(!spec)return Promise.reject(Error('Format vidéo inconnu.'));
 if(signal?.aborted)return Promise.reject(new DOMException('Export annulé.','AbortError'));
 return new Promise((resolve,reject)=>{
  const args=['-nostdin','-hide_banner','-loglevel','error','-y','-threads','2',...inputOptions,'-i',input,'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1','-c:v',spec.codec,'-pix_fmt',spec.pixel,'-threads','2',...(format==='mkv'?['-level','3','-coder','2','-context','1','-g','1','-slicecrc','1']:format==='mp4'?['-preset',['medium','veryfast'].includes(preset)?preset:'medium','-crf',String(({fine:18,balanced:21,small:24})[quality]??21),'-vf','scale=in_range=full:out_range=tv:out_color_matrix=bt709','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart']:[]),'-f',spec.muxer,output];
  const child=spawn(binary,args,{windowsHide:true,stdio:['ignore','ignore','pipe']});let diagnostic='',failure;
  const fail=error=>{failure||=error;child.kill('SIGKILL');};
  const abort=()=>fail(new DOMException('Export annulé.','AbortError'));signal?.addEventListener('abort',abort,{once:true});
  const clock=timeout==null?null:setTimeout(()=>fail(Error('Encodage trop long. Réduis la durée ou la résolution.')),timeout);
  const monitor=setInterval(async()=>{try{if((await stat(output)).size>maxBytes)fail(Error('Le fichier encodé dépasse '+Math.round(maxBytes/1024/1024)+' Mo. Réduis la durée ou la résolution.'));}catch{}},100);
  const cleanup=()=>{clearTimeout(clock);clearInterval(monitor);signal?.removeEventListener('abort',abort);};
  child.stderr.on('data',chunk=>{diagnostic=(diagnostic+chunk.toString()).slice(-4000);});
  child.once('error',()=>{cleanup();reject(Error('Impossible de démarrer FFmpeg. Vérifie son installation.'));});
  child.once('close',async code=>{cleanup();if(failure)return reject(failure);if(code!==0)return reject(Error('FFmpeg n’a pas pu encoder cette capture. '+diagnostic.trim().slice(-800)));try{const size=(await stat(output)).size;if(!size||size>maxBytes)throw Error('Fichier encodé vide ou supérieur à 512 Mo.');resolve({size,...spec});}catch(error){reject(error);}});
 });
}
