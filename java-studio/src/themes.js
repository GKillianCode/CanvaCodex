import { themes } from './model.js';
export const colorFields = [['accent','Accent'],['secondary','Accent secondaire'],['bg','Fond'],['panel','Surface du code'],['ink','Texte']];
export function normalizeThemes(value) {
 if(!Array.isArray(value)||!value.length||value.length>100) return structuredClone(themes);
 const seen=new Set();const valid=[];for(const t of value){if(!t||typeof t.id!=='string'||!/^[\w-]{1,100}$/.test(t.id)||seen.has(t.id)||!colorFields.every(([key])=>/^#[\da-f]{6}$/i.test(t[key]))||typeof t.name!=='string'||!t.name.trim())continue;seen.add(t.id);valid.push({id:t.id,name:t.name.trim().slice(0,60),desc:String(t.desc||'').slice(0,180),...Object.fromEntries(colorFields.map(([k])=>[k,t[k]])),light:t.light===true});}
 return valid.length?valid:structuredClone(themes);
}
export function themeDraft(source) { return {...(source||themes[0]),id:'custom-'+crypto.randomUUID(),name:source?source.name+' · copie':'Mon thème',desc:source?.desc||''}; }
