import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {normalizeWorkflow} from './videoWorkflow.js';
export function downloadText(name,value,type='text/plain;charset=utf-8'){
 const url=URL.createObjectURL(new Blob([value],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// Serialize saves, detect concurrent edits, and keep a per-tab recovery draft.
export function useVideoWorkflow(props,section,readonly=false){
 const project=ref(null),data=ref(null),error=ref(''),loading=ref(true),saving=ref(false),saved=ref(''),recovery=ref(null),storageError=ref('');
 let revision=0,timer,active=true,inflight=null,poll,needsReload=false;
 const key=`frame-workflow-draft:${props.videoId}:${section}`;
 const signature=value=>JSON.stringify({...value,revision:0});
 const dirty=computed(()=>!!data.value&&signature(data.value)!==saved.value);
 async function load(){
  error.value='';loading.value=true;
  try{const value=await props.repository.get(props.videoId);if(!value)throw Error('Cette vidéo est introuvable.');if(!active)return;
   project.value=value;data.value=normalizeWorkflow(value.workflow)[section];if(section==='conductor')data.value.draft=value.notes||'';revision=data.value.revision;saved.value=signature(data.value);needsReload=false;
   if(!readonly){try{const draft=JSON.parse(sessionStorage.getItem(key)||'null');recovery.value=draft&&signature(draft)!==saved.value?draft:null;}catch{}}
  }catch(e){error.value=e.message;}finally{loading.value=false;}
 }
 async function save(){
  clearTimeout(timer);if(readonly||!dirty.value)return;if(needsReload)throw Error(error.value);
  if(inflight){await inflight;if(dirty.value)return save();return;}
  const snapshot=JSON.parse(JSON.stringify(data.value));saving.value=true;error.value='';
  inflight=(async()=>{try{
   const value=await props.repository.saveWorkflow(props.videoId,section,snapshot,revision);revision=normalizeWorkflow(value.workflow)[section].revision;project.value=value;saved.value=signature(snapshot);
   if(!dirty.value){try{sessionStorage.removeItem(key);}catch{}}
  }catch(e){error.value=e.message||'Sauvegarde impossible.';needsReload=error.value.includes('autre fenêtre');throw e;}finally{saving.value=false;inflight=null;}})();
  await inflight;if(dirty.value)timer=setTimeout(()=>save().catch(()=>{}),400);
 }
 watch(data,()=>{if(loading.value||readonly||!dirty.value)return;try{sessionStorage.setItem(key,JSON.stringify(data.value));storageError.value='';}catch{storageError.value='Le brouillon de secours ne peut pas être conservé dans cet onglet. Enregistre avant de fermer.';}clearTimeout(timer);timer=setTimeout(()=>save().catch(()=>{}),500);},{deep:true,flush:'post'});
 async function flush(){clearTimeout(timer);if(inflight)await inflight;if(dirty.value)await save();if(dirty.value)throw Error(error.value||'Les modifications attendent leur sauvegarde.');}
 function beforeUnload(e){if(dirty.value){e.preventDefault();e.returnValue='';}}
 function recover(){if(recovery.value){const recovered=normalizeWorkflow({[section]:recovery.value})[section];if(section==='conductor')recovered.draft=typeof recovery.value.draft==='string'?recovery.value.draft:project.value.notes||'';data.value=recovered;recovery.value=null;}}
 function exportDraft(){downloadText(`frame-${section}-brouillon.json`,JSON.stringify(data.value,null,2),'application/json');}
 onMounted(()=>{load();window.addEventListener('beforeunload',beforeUnload);if(readonly)poll=setInterval(async()=>{if(document.hidden||loading.value)return;try{const value=await props.repository.get(props.videoId);if(value&&active){project.value=value;data.value=normalizeWorkflow(value.workflow)[section];saved.value=signature(data.value);error.value='';}}catch{error.value='Actualisation impossible. Les derniers textes restent affichés.';}},1500);});
 onBeforeUnmount(()=>{active=false;clearTimeout(timer);clearInterval(poll);window.removeEventListener('beforeunload',beforeUnload);});
 return {project,data,error,loading,saving,dirty,recovery,storageError,load,save,flush,recover,exportDraft};
}
