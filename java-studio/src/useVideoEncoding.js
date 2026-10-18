import {shallowRef,ref,onUnmounted} from 'vue';
import {encodeVideo} from './videoEncoding.js';
export function useVideoEncoding(download,notify,{encoder=encodeVideo}={}){
 const recovery=shallowRef(null),busy=ref(false);let controller;
 function discard(){if(busy.value)return;if(recovery.value)URL.revokeObjectURL(recovery.value.url);recovery.value=null;}
 async function save(blob,format,name,{signal,preview=true}={}){
  busy.value=true;
  try{const output=await encoder(blob,format,{signal});if(signal?.aborted)throw new DOMException('Export annulé.','AbortError');download(output,name,preview);if(recovery.value)URL.revokeObjectURL(recovery.value.url);recovery.value=null;return output;}
  catch(error){if(error.name!=='AbortError'){if(recovery.value)URL.revokeObjectURL(recovery.value.url);recovery.value={blob,format,name,preview,error:error.message,url:URL.createObjectURL(blob),sourceName:name.replace(/\.(mov|mkv)$/,'-source-png.mov')};}throw error;}
  finally{busy.value=false;}
 }
 async function retry(){if(!recovery.value||busy.value)return;controller=new AbortController();const item=recovery.value;try{await save(item.blob,item.format,item.name,{signal:controller.signal,preview:item.preview});notify('Vidéo encodée, prête à télécharger.');}catch(error){if(error.name!=='AbortError')notify(error.message);}finally{controller=null;}}
 onUnmounted(()=>{controller?.abort();if(recovery.value)URL.revokeObjectURL(recovery.value.url);});
 return {recovery,busy,save,retry,discard};
}
