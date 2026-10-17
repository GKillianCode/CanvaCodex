import {reactive} from 'vue';
import {videoRepository} from './videoProjects.js';
export const localDataState=reactive({enabled:false,pending:false,error:'',notice:''});
let active=null,legacyRepository=null,token='',appId='',versions={},preferenceVersions={},tail=Promise.resolve(),scheduled=false;
const dirty=new Map();
const owned=key=>/^(frame-|slides:frame-|banners:frame-)/.test(key)&&!key.startsWith('frame-local-');
export const workspaceLocalStorage={
 getItem(key){if(active)return active.get(key)??null;try{return globalThis.localStorage?.getItem(key)??null;}catch{return null;}},
 setItem(key,value){value=String(value);if(!active){globalThis.localStorage?.setItem(key,value);return;}active.set(key,value);try{globalThis.localStorage?.setItem(key,value);}catch{}queuePreference(key,value);},
 removeItem(key){if(!active){globalThis.localStorage?.removeItem(key);return;}active.delete(key);try{globalThis.localStorage?.removeItem(key);}catch{}queuePreference(key,null);}
};
async function call(path,input){const response=await fetch('/__frame_local__/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Frame-Token':token},body:JSON.stringify(input)});const value=await response.json();if(!response.ok)throw Error(value.error||'Sauvegarde sur disque impossible.');return value;}
function persistOutbox(){try{const key='frame-local-outbox:'+appId;if(!dirty.size)globalThis.localStorage.removeItem(key);else globalThis.localStorage.setItem(key,JSON.stringify([...dirty].map(([key,value])=>({key,value,expected:preferenceVersions[key]||null}))));}catch{localDataState.error='La copie de secours du navigateur est pleine. Garde cette fenêtre ouverte jusqu’à la sauvegarde sur disque.';}}
function queuePreference(key,value){if(!owned(key))return;dirty.set(key,value);persistOutbox();localDataState.pending=true;if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;flushLocalData().catch(()=>{});});}}
export function flushLocalData(){
 const task=async()=>{while(dirty.size){const [key,value]=dirty.entries().next().value;
  try{const result=await call('preferences',{key,value,expected:preferenceVersions[key]||null});preferenceVersions[key]=result.versions[JSON.stringify(['preferences',key])]||null;if(dirty.get(key)===value)dirty.delete(key);persistOutbox();localDataState.error='';}
  catch(error){localDataState.error=error.message;throw error;}
 }localDataState.pending=false;};
 tail=tail.catch(()=>{}).then(task);return tail;
}
export function persistentVideoRepository(){
 if(!localDataState.enabled)return videoRepository();
 const localKeys=new Set(['video-folder-root','video-folder-pending']);
 return Object.fromEntries(Object.keys(videoRepository()).map(method=>[method,async(...args)=>{
  if(['getSetting','setSetting'].includes(method)&&localKeys.has(args[0]))return legacyRepository[method](...args);
  const result=await call('rpc',{method,args,expected:versions});Object.assign(versions,result.versions);return result.result;
 }]));
}
export async function initLocalPersistence({progress=()=>{}}={}){
 const response=await fetch('/__frame_local__/session',{cache:'no-store'});
 if(!response.ok)throw Error('Le service de données locales est indisponible. Relance Frame depuis son dossier.');
 let session;try{session=await response.json();}catch{throw Error('Ce lancement ne fournit pas le stockage local. Lance Frame avec npm run dev ou npm run preview.');}
 token=session.token;appId=session.id;legacyRepository=videoRepository();
 const marker='frame-local-import:'+appId;
 if(!session.initialized||globalThis.localStorage.getItem(marker)!=='done'){
  progress('Reprise des données de ce navigateur…');
  // Add-only migration. The originals are never cleared; each imported video
  // also has a disk recovery record before it becomes available to the app.
  const rows=await legacyRepository.list();
  for(let i=0;i<rows.length;i++){
   progress(`Reprise des vidéos : ${i+1} / ${rows.length}`);
   const project=await legacyRepository.get(rows[i].id),creations=await legacyRepository.allCreations(rows[i].id);
   if(project){const imported=await call('migrate',{origin:location.origin,data:{projects:[project],creations,summaries:[rows[i]],settings:{}}});if(imported.conflicts?.length)localDataState.notice='Des copies différentes existaient déjà sur disque. Elles ont été conservées dans les archives de récupération, sans écraser la version partagée.';}
  }
  const settings={};for(const key of ['playlists','video-order','learning-canvas']){const value=await legacyRepository.getSetting(key);if(value!==undefined)settings[key]=value;}
  await call('migrate',{origin:location.origin,data:{projects:[],creations:[],settings}});
  const initial={};for(let i=0;i<globalThis.localStorage.length;i++){const key=globalThis.localStorage.key(i);if(owned(key))initial[key]=globalThis.localStorage.getItem(key);}
  const library=sessionStorage.getItem('frame-component-sharing');if(library)initial['frame-shared-library-draft']=library;
  for(const [key,value] of Object.entries(initial))await call('preferences',{key,value,importOnly:true});
  await call('rpc',{method:'setSetting',args:['local-data-ready',true],expected:{}});
  globalThis.localStorage.setItem(marker,'done');
  session=await (await fetch('/__frame_local__/session',{cache:'no-store'})).json();
 }
 const outbox=JSON.parse(globalThis.localStorage.getItem('frame-local-outbox:'+appId)||'[]');
 for(const item of outbox){if(!owned(item.key)||!(item.value===null||typeof item.value==='string'))throw Error('La copie de secours locale est invalide ; elle a été conservée.');dirty.set(item.key,item.value);preferenceVersions[item.key]=item.expected;}
 if(dirty.size){localDataState.pending=true;progress('Reprise des sauvegardes en attente…');await flushLocalData();}
 session=await (await fetch('/__frame_local__/session',{cache:'no-store'})).json();
 active=new Map();for(const [key,item] of Object.entries(session.preferences||{})){active.set(key,item.value);preferenceVersions[key]=item.version;}
 localDataState.enabled=true;
 window.addEventListener('beforeunload',event=>{if(dirty.size){event.preventDefault();event.returnValue='';}});
}

export function downloadLocalRecovery(){
 const values=active?Object.fromEntries(active):Object.fromEntries(Array.from({length:globalThis.localStorage.length},(_,i)=>globalThis.localStorage.key(i)).filter(owned).map(key=>[key,globalThis.localStorage.getItem(key)]));
 const blob=new Blob([JSON.stringify({format:'frame-local-recovery',version:1,applicationId:appId,origin:location.origin,values,outbox:[...dirty].map(([key,value])=>({key,value}))},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='frame-copie-secours.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function downloadMigrationArchives(){const archives=await call('recoveries',{});const blob=new Blob([JSON.stringify({format:'frame-migration-archives',version:1,applicationId:appId,archives},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='frame-archives-migration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
