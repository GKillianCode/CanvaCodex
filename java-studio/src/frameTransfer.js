import { normalizeComponents } from './componentsLibrary.js';
import { canonical } from './projectFile.js';
export const TRANSFER_PREFIX='FRAME_OBJECTS_V1\n',TRANSFER_MIME='application/x-frame-objects+json',MAX_TRANSFER=64000000;
const clone=v=>JSON.parse(JSON.stringify(v));
function components(raw){
 if(!Array.isArray(raw)||raw.length>100)throw Error('invalid');
 const result=normalizeComponents(raw);if(result.length!==raw.length||result.some((c,i)=>c.items.length!==raw[i].items.length))throw Error('invalid');
 const ids=new Set();for(const c of result){if(!c.id||ids.has(c.id))c.id=crypto.randomUUID();ids.add(c.id);}return result;
}
export function serializeObjects(clipboard,kind='selection'){
 const value={format:'frame-objects',version:1,kind,component:clipboard.component,groups:clipboard.groups||[],slideId:clipboard.slideId||null};const text=TRANSFER_PREFIX+JSON.stringify(value);if(text.length>MAX_TRANSFER)throw Error('size');return text;
}
export function parseObjects(text){
 if(typeof text!=='string'||!text.startsWith(TRANSFER_PREFIX))return null;
 if(text.length>MAX_TRANSFER)throw Error('size');let raw;try{raw=JSON.parse(text.slice(TRANSFER_PREFIX.length));}catch{throw Error('invalid');}
 if(raw?.format!=='frame-objects'||raw.version!==1||!['selection','component'].includes(raw.kind))throw Error('invalid');
 const [component]=components([raw.component]);if(!Array.isArray(raw.groups)||raw.groups.length>100)throw Error('invalid');
 const used=new Set();const groups=raw.groups.map(g=>{if(!Array.isArray(g)||g.length<2||g.length>component.items.length||g.some(i=>!Number.isInteger(i)||i<0||i>=component.items.length||used.has(i))||new Set(g).size!==g.length)throw Error('invalid');g.forEach(i=>used.add(i));return [...g];});
 return {component,groups,kind:raw.kind,slideId:typeof raw.slideId==='string'?raw.slideId:null};
}
export function serializeLibrary(items){const text=JSON.stringify({format:'frame-component-library',version:1,components:components(items)},null,2);if(text.length>MAX_TRANSFER)throw Error('size');return text;}
export function parseLibrary(text){if(typeof text!=='string'||text.length>MAX_TRANSFER)throw Error('size');let raw;try{raw=JSON.parse(text);}catch{throw Error('invalid');}if(raw?.format!=='frame-component-library'||raw.version!==1||!Array.isArray(raw.components))throw Error('invalid');const ids=new Set();for(const c of raw.components){if(!c||typeof c.id!=='string'||!c.id||c.id.length>200||ids.has(c.id))throw Error('invalid');ids.add(c.id);}return components(raw.components);}
export function mergeLibraries(base,local,remote){
 const b=new Map(base.map(c=>[c.id,c])),l=new Map(local.map(c=>[c.id,c])),r=new Map(remote.map(c=>[c.id,c]));const merged=[],conflicts=[];
 for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){const before=b.get(id),left=l.get(id),right=r.get(id);let chosen;
 if(canonical(left)===canonical(before))chosen=right;else if(canonical(right)===canonical(before)||canonical(left)===canonical(right))chosen=left;else{conflicts.push(left?.name||right?.name||before?.name||id);continue;}
 if(chosen)merged.push(clone(chosen));}
 if(merged.length>100)throw Error('limit');return {components:merged,conflicts};
}
export function appendComponents(existing,incoming){const output=components(existing);for(const raw of components(incoming)){const c=clone(raw),found=output.find(x=>x.id===c.id);if(found&&canonical(found)===canonical(c))continue;if(found)c.id=crypto.randomUUID();output.push(c);}if(output.length>100)throw Error('limit');return output;}
