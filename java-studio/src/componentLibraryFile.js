import { fileMemory } from './projectFile.js';
import { parseLibrary,serializeLibrary,mergeLibraries,appendComponents,MAX_TRANSFER } from './frameTransfer.js';
const options={types:[{description:'Bibliothèque de composants Frame',accept:{'application/json':['.json']}}]};
async function read(handle){const file=await handle.getFile();if(file.size>MAX_TRANSFER)throw Error('size');return file.text();}
export class ComponentLibraryFile{
 constructor(api=window,memory=(r,w)=>fileMemory(r,w,'components')){this.api=api;this.memory=memory;this.handle=null;this.baseline=null;this.busy=false;}
 get supported(){return !!this.api.showSaveFilePicker&&!!this.api.showOpenFilePicker;}
 async remember(){try{await this.memory({handle:this.handle,baseline:this.baseline},true);}catch{}}
 async restore(cachedBaseline){try{const saved=await this.memory();if(saved?.handle){this.handle=saved.handle;this.baseline=cachedBaseline??saved.baseline;}}catch{}}
 async open(local=[]){const [handle]=await this.api.showOpenFilePicker(options),text=await read(handle),items=appendComponents(parseLibrary(text),local);this.handle=handle;this.baseline=text;await this.remember();return items;}
 async reload(local){if(this.busy)throw Error('busy');if(!this.handle)throw Error('unlinked');this.busy=true;try{const text=await read(this.handle),remote=parseLibrary(text),base=this.baseline?parseLibrary(this.baseline):[];const merged=mergeLibraries(base,local,remote);if(merged.conflicts.length)throw Object.assign(Error('conflict'),{conflicts:merged.conflicts});this.baseline=text;await this.remember();return merged.components;}finally{this.busy=false;}}
 async save(local,saveAs=false){if(this.busy)throw Error('busy');this.busy=true;let writer;try{
 let handle=this.handle,baseline=this.baseline,items=local;
 if(saveAs||!handle){handle=await this.api.showSaveFilePicker({...options,suggestedName:'frame-composants.json'});baseline=null;}
 const permission={mode:'readwrite'};if(handle.queryPermission&&await handle.queryPermission(permission)!=='granted'&&await handle.requestPermission(permission)!=='granted')throw Error('permission');
 const disk=await read(handle);
 if(baseline!==null&&disk!==baseline){const merged=mergeLibraries(parseLibrary(baseline),local,parseLibrary(disk));if(merged.conflicts.length)throw Object.assign(Error('conflict'),{conflicts:merged.conflicts});items=merged.components;}
 if(baseline===null&&disk.trim())items=appendComponents(parseLibrary(disk),local);
 const text=serializeLibrary(items);writer=await handle.createWritable();
 if(await read(handle)!==disk)throw Error('changed');
 await writer.write(text);await writer.close();writer=null;this.handle=handle;this.baseline=text;await this.remember();return parseLibrary(text);
 }catch(error){await writer?.abort?.().catch(()=>{});throw error;}finally{this.busy=false;}}
 async detach(){this.handle=null;this.baseline=null;await this.remember();}
}
