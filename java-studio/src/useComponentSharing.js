import { ref,computed,watch,onMounted,onUnmounted } from 'vue';
import { ComponentLibraryFile } from './componentLibraryFile.js';
import { appendComponents,parseLibrary,serializeLibrary } from './frameTransfer.js';
import { canonical } from './projectFile.js';
export function useComponentSharing(notify){
 let cache;try{cache=JSON.parse(sessionStorage.getItem('frame-component-sharing'));}catch{}
 const file=new ComponentLibraryFile(),sharedComponents=ref([]),libraryScope=ref('project'),sharedFileName=ref(''),sharedBusy=ref(false),sharedError=ref(''),sharedBaseline=ref(cache?.baseline||null);
 try{sharedComponents.value=cache?.items?parseLibrary(serializeLibrary(cache.items)):sharedBaseline.value?parseLibrary(sharedBaseline.value):[];}catch{sharedBaseline.value=null;}
 try{if(sharedBaseline.value)parseLibrary(sharedBaseline.value);}catch{sharedBaseline.value=null;}
 const sharedDirty=computed(()=>canonical(sharedComponents.value)!==canonical(sharedBaseline.value?parseLibrary(sharedBaseline.value):[]));
 function persist(){try{sessionStorage.setItem('frame-component-sharing',JSON.stringify({items:sharedComponents.value,baseline:sharedBaseline.value}));}catch{notify('Bibliothèque trop volumineuse : enregistre le fichier pour la conserver.');}}
 watch([sharedComponents,sharedBaseline],persist,{deep:true});
 async function run(operation,silent=false){if(sharedBusy.value)return;sharedBusy.value=true;try{const items=await operation();if(items)sharedComponents.value=items;sharedBaseline.value=file.baseline;sharedFileName.value=file.handle?.name||'';sharedError.value='';if(!silent)notify('Bibliothèque partagée actualisée.');}catch(error){if(error.name!=='AbortError'){const message=error.message==='conflict'?'Conflit : '+error.conflicts.join(', ')+'. Exporte ta copie ou enregistre sous un autre fichier.':error.message==='changed'?'Le fichier a changé pendant l’enregistrement. Réessaie.':error.message==='limit'?'Limite de 100 composants atteinte.':error.message==='permission'?'Accès au fichier refusé.':'Fichier inaccessible ou bibliothèque Frame invalide.';if(sharedError.value!==message&&!silent)notify(message);sharedError.value=message;}}finally{sharedBusy.value=false;}}
 async function openSharedLibrary(){await run(()=>file.open(JSON.parse(JSON.stringify(sharedComponents.value))));libraryScope.value='shared';}
 async function saveSharedLibrary(saveAs=false){await run(()=>file.save(JSON.parse(JSON.stringify(sharedComponents.value)),saveAs));}
 async function refreshSharedLibrary(silent=false){if(!file.handle)return;await run(()=>file.reload(JSON.parse(JSON.stringify(sharedComponents.value))),silent);}
 function importLibrary(items){if(sharedBusy.value)throw Error('busy');sharedComponents.value=appendComponents(sharedComponents.value,items);libraryScope.value='shared';}
 async function autoRefresh(){if(document.visibilityState==='hidden'||!file.handle||sharedBusy.value)return;try{if(file.handle.queryPermission&&await file.handle.queryPermission({mode:'read'})!=='granted')return;await refreshSharedLibrary(true);}catch{}}
 onMounted(async()=>{await file.restore(sharedBaseline.value);sharedFileName.value=file.handle?.name||'';if(!sharedBaseline.value&&file.baseline){sharedBaseline.value=file.baseline;if(!sharedComponents.value.length)sharedComponents.value=parseLibrary(file.baseline);}await autoRefresh();window.addEventListener('focus',autoRefresh);document.addEventListener('visibilitychange',autoRefresh);});
 onUnmounted(()=>{window.removeEventListener('focus',autoRefresh);document.removeEventListener('visibilitychange',autoRefresh);});
 return {sharedComponents,libraryScope,sharedFileName,sharedBusy,sharedError,sharedDirty,sharedFileSupported:file.supported,openSharedLibrary,saveSharedLibrary,refreshSharedLibrary,importLibrary};
}
