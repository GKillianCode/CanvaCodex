export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
const options={types:[{description:'Projet Frame',accept:{'application/json':['.json']}}]};
export async function fileMemory(record,write=false,slot='active'){
 return new Promise((resolve,reject)=>{const request=indexedDB.open('frame-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('session');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('session',write?'readwrite':'readonly'),store=tx.objectStore('session'),op=write?store.put(record,slot):store.get(slot);let value;op.onsuccess=()=>value=op.result;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=()=>{db.close();reject(tx.error);};};});
}
export class ProjectFile {
 constructor(api=window,memory=fileMemory){this.api=api;this.memory=memory;this.handle=null;this.baseline=null;this.projectId=null;this.busy=false;}
 get supported(){return !!this.api.showSaveFilePicker;}
 async restore(projectId){try{const r=await this.memory();if(r?.projectId===projectId){this.handle=r.handle;this.baseline=r.baseline;this.projectId=projectId;}}catch{} }
 async remember(){try{await this.memory({handle:this.handle,baseline:this.baseline,projectId:this.projectId},true);}catch{/* File linking still works until this tab closes. */}}
 async detach(){this.handle=null;this.baseline=null;this.projectId=null;await this.remember();}
 async open(){const [handle]=await this.api.showOpenFilePicker(options);const file=await handle.getFile();return {handle,text:await file.text()};}
 async link(handle,projectId){this.handle=handle;this.projectId=projectId;this.baseline=await (await handle.getFile()).text();await this.remember();}
 async save(text,projectId,saveAs=false){
 if(this.busy) return 'busy';this.busy=true;
 try{
 let handle=this.handle,baseline=this.baseline;
 if(saveAs||!handle){handle=await this.api.showSaveFilePicker({...options,suggestedName:this.handle?.name||'frame-projet.json'});baseline=null;}
 const permission={mode:'readwrite'};
 if(handle.queryPermission&&await handle.queryPermission(permission)!=='granted'&&await handle.requestPermission(permission)!=='granted')throw Error('permission');
 if(baseline!==null&&await (await handle.getFile()).text()!==baseline)throw Error('conflict');
 const writer=await handle.createWritable();try{await writer.write(text);await writer.close();}catch(error){await writer.abort?.();throw error;}
 this.handle=handle;this.projectId=projectId;this.baseline=text;await this.remember();return 'saved';
 }finally{this.busy=false;}
 }
}
