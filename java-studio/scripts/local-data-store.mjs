import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
const stores=['projects','creations','summaries','settings','preferences','recovery'];
export function createDiskStore(directory){
 let tail=Promise.resolve();
 async function readManifest(){try{return JSON.parse(await fs.readFile(join(directory,'manifest.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;return {version:1,revision:0,initialized:false,stores:Object.fromEntries(stores.map(name=>[name,{}]))};}}
 async function locked(run){await fs.mkdir(join(directory,'records'),{recursive:true,mode:0o700});const lock=join(directory,'write.lock');let handle;
  for(let attempt=0;attempt<100;attempt++){try{handle=await fs.open(lock,'wx');await handle.writeFile(JSON.stringify({pid:process.pid}));break;}catch(error){if(error.code!=='EEXIST')throw error;try{const owner=JSON.parse(await fs.readFile(lock,'utf8'));try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH'){await fs.unlink(lock);continue;}}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}}
  if(!handle)throw Error('Le dossier de données est occupé. Réessaie.');try{return await run();}finally{await handle.close();await fs.unlink(lock).catch(()=>{});}
 }
 async function transaction(mode,run,{expected={}}={}){
  const task=async()=>{
   const manifest=await readManifest(),patch=new Map(),versions={};let aborted=false,result,pending=0,resolveDone,rejectDone;
   const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
   const keyOf=(name,key)=>JSON.stringify([name,String(key)]);
   async function read(name,key){const k=keyOf(name,key);if(patch.has(k))return structuredClone(patch.get(k).value);const entry=manifest.stores[name]?.[String(key)];versions[k]=entry?.hash||null;if(!entry)return undefined;return JSON.parse(await fs.readFile(join(directory,'records',entry.hash+'.json'),'utf8'));}
   function write(name,key,value){if(mode!=='readwrite')throw Error('Transaction en lecture seule.');if(['__proto__','constructor','prototype'].includes(String(key)))throw Error('Clé invalide.');if(!stores.includes(name))throw Error('Collection inconnue.');patch.set(keyOf(name,key),{name,key:String(key),value:structuredClone(value)});}
   const tx={abort(){aborted=true;rejectDone(result instanceof Error?result:Error('Transaction annulée.'));}};
   function request(action){const req={};pending++;queueMicrotask(async()=>{try{if(aborted)return;const value=await action();req.result=value;req.onsuccess?.({target:req});}catch(error){aborted=true;rejectDone(error);}finally{pending--;if(!pending&&!aborted)resolveDone();}});return req;}
   function keys(name){return [...new Set([...Object.keys(manifest.stores[name]||{}),...[...patch.values()].filter(p=>p.name===name).map(p=>p.key)])];}
   function store(name){return {
    get:key=>request(()=>read(name,key)),
    put(value,key=value?.id){if(key===undefined)throw Error('Clé manquante.');write(name,key,value);},
    delete:key=>write(name,key,undefined),
    getAll:()=>request(async()=>{const values=await Promise.all(keys(name).map(key=>read(name,key)));return values.filter(v=>v!==undefined);}),
    index(index){if(name!=='creations'||index!=='videoId')throw Error('Index inconnu.');return {getAll:id=>request(async()=>{const candidates=keys(name).filter(key=>{const p=patch.get(keyOf(name,key));return (p?p.value?.videoId:manifest.stores[name][key]?.videoId)===id;});return (await Promise.all(candidates.map(key=>read(name,key)))).filter(Boolean);})};},
    openCursor(){const ids=keys(name);let at=0;const req={};const step=()=>{pending++;queueMicrotask(async()=>{try{if(aborted)return;let value;while(at<ids.length){value=await read(name,ids[at]);if(value!==undefined)break;at++;}req.result=at<ids.length?{value,update:next=>write(name,ids[at],next),continue(){at++;step();}}:null;req.onsuccess?.({target:req});}catch(error){aborted=true;rejectDone(error);}finally{pending--;if(!pending&&!aborted)resolveDone();}});};step();return req;}
   };}
   try{run(store('projects'),store('creations'),value=>result=value,tx,store('summaries'),store('settings'),store);if(!pending&&!aborted)resolveDone();}catch(error){aborted=true;rejectDone(error);}
   await done;
   if(patch.size){
    for(const [key,p] of patch){const prior=manifest.stores[p.name]?.[p.key]?.hash||null;if(Object.hasOwn(expected,key)&&expected[key]!==prior)throw Error('Ces données ont changé dans une autre fenêtre. Recharge avant de réessayer.');
     if(p.value===undefined){delete manifest.stores[p.name][p.key];versions[key]=null;continue;}
     const content=JSON.stringify(p.value),hash=digest(content);await fs.writeFile(join(directory,'records',hash+'.json'),content,{flag:'wx',mode:0o600}).catch(error=>{if(error.code!=='EEXIST')throw error;});
     manifest.stores[p.name][p.key]={hash,...(p.name==='creations'?{videoId:p.value.videoId}:{})};versions[key]=hash;
    }
    manifest.revision++;const temporary=join(directory,'manifest-'+randomUUID()+'.tmp');await fs.writeFile(temporary,JSON.stringify(manifest),{mode:0o600});await fs.rename(temporary,join(directory,'manifest.json'));
   }
   return {result,versions};
  };
  if(mode==='readwrite'){const next=tail.then(()=>locked(task),()=>locked(task));tail=next.catch(()=>{});return next;}
  await tail;return task();
 }
 // Settings and preference access uses the same transactional adapter.
 async function values(name){const m=await readManifest();const result={};for(const [key,entry] of Object.entries(m.stores[name]||{}))result[key]={value:JSON.parse(await fs.readFile(join(directory,'records',entry.hash+'.json'),'utf8')),version:entry.hash};return result;}
 async function importRows(rows){return transaction('readwrite',(p,c,set,tx,s,settings)=>{
  const conflicts=[];set(conflicts);
  for(const row of rows.projects||[]){p.get(row.id).onsuccess=e=>{if(e.target.result&&JSON.stringify(e.target.result)!==JSON.stringify(row)){conflicts.push(row.id);return;}for(const creation of rows.creations||[]){if(creation.videoId===row.id)c.get(creation.id).onsuccess=event=>{if(!event.target.result)c.put(creation);};}if(!e.target.result){p.put(row);s.put(rows.summaries?.find(item=>item.id===row.id)||{id:row.id,name:row.name,playlist:row.playlist,status:row.status,videoType:row.videoType,archived:!!row.archived,updatedAt:row.updatedAt,createdAt:row.createdAt,counts:Object.fromEntries(['slides','banners','thumbnails'].map(app=>[app,row.creations.filter(x=>x.app===app).length]))});}};}
  for(const [key,value] of Object.entries(rows.settings||{})){settings.get(key).onsuccess=e=>{if(e.target.result===undefined)settings.put(value,key);};}
 });}
 return {transaction,values,importRows,readManifest,directory};
}
