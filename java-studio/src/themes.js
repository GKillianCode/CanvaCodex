import { themes } from './model.js';
export const colorFields = [['accent','Accent'],['secondary','Accent secondaire'],['bg','Fond'],['panel','Surface du code'],['ink','Texte']];
export function normalizeThemes(value) {
 if(!Array.isArray(value)||!value.length||value.length>100) return normalizeThemes(themes);
 const seen=new Set();const valid=[];for(const t of value){if(!t||typeof t.id!=='string'||!/^[\w-]{1,100}$/.test(t.id)||seen.has(t.id)||!colorFields.every(([key])=>/^#[\da-f]{6}$/i.test(t[key]))||typeof t.name!=='string'||!t.name.trim())continue;seen.add(t.id);valid.push({id:t.id,name:t.name.trim().slice(0,60),desc:String(t.desc||'').slice(0,180),...Object.fromEntries(colorFields.map(([k])=>[k,t[k]])),swatches:normalizeSwatches(t.swatches,t),light:t.light===true});}
 return valid.length?valid:normalizeThemes(themes);
}
export function themeDraft(source) { return {...(source||themes[0]),swatches:normalizeSwatches(source?.swatches,source||themes[0]),id:'custom-'+crypto.randomUUID(),name:source?source.name+' · copie':'Mon thème',desc:source?.desc||''}; }

export function normalizeSwatches(raw,t){const defaults=[['soft','Accent doux',mix(t.accent,t.ink,.45)],['deep','Accent profond',mix(t.accent,t.bg,.4)],['muted','Texte discret',mix(t.ink,t.bg,.35)],['success','Succès',t.light?'#18794e':'#69e6a6'],['warning','Attention',t.light?'#946200':'#ffd166'],['danger','Erreur',t.light?'#c52a43':'#ff718b']].map(([id,name,color])=>({id,name,color}));return defaults.map(d=>{const c=Array.isArray(raw)&&raw.find(c=>c?.id===d.id);return c&&/^#[\da-f]{6}$/i.test(c.color)?{...d,color:c.color}:d;});}
function mix(a,b,n){return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-n)+parseInt(b.slice(i,i+2),16)*n).toString(16).padStart(2,'0')).join('');}
export function themeColors(t){return [...colorFields.map(([id,name])=>({id,name,color:t[id]})),...normalizeSwatches(t.swatches,t)];}
