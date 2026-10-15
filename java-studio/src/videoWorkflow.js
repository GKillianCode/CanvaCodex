export const highlightColors={yellow:'#f6d776',mint:'#a5f3cf',blue:'#a9d7ff',pink:'#f5b8d3',orange:'#ffc49b'};
export function normalizeConductorImages(value){return (Array.isArray(value)?value:[]).slice(0,32).flatMap((i,index)=>i&&typeof i.src==='string'&&i.src.length<3000000&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(i.src)?[{id:typeof i.id==='string'&&/^[\w-]{1,100}$/.test(i.id)?i.id:'legacy-'+index,src:i.src,alt:typeof i.alt==='string'?i.alt.slice(0,300):'',width:Math.max(10,Math.min(100,Number(i.width)||50)),align:['left','right','center','block'].includes(i.align)?i.align:'center'}]:[]);}

export function highlightScript(script,start,end,color){if(!Object.hasOwn(highlightColors,color)||end<=start)return script;return script.slice(0,start)+script.slice(start,end).split('\n').map(line=>line?'=='+color+'|'+line+'==':'').join('\n')+script.slice(end);}
// All production data belongs to one video; supports reference existing creations.
const text=(v,max)=>typeof v==='string'?v.slice(0,max):'';
const id=v=>text(v,100);
export const supportKinds=[['camera','Caméra'],['slides','Diaporama'],['banners','Incrustation'],['ide','IDE / code'],['screen','Capture d’écran'],['none','Sans support']];
const revision=v=>Number.isSafeInteger(v)&&v>=0?v:0;
export function normalizeConductor(raw={}){
 const seen=new Set();return {revision:revision(raw?.revision),sequences:(Array.isArray(raw?.sequences)?raw.sequences:[]).slice(0,100).flatMap(s=>{
  if(!s||!id(s.id)||seen.has(id(s.id)))return [];seen.add(id(s.id));
  const images=normalizeConductorImages(s.images);let script=text(s.script,50000);const cues=text(s.cues,20000);for(const image of images)if(!s.images.some(raw=>raw?.id===image.id)&&!(script+'\n'+cues).includes('(frame-image:'+image.id+')'))script+='\n\n!['+image.alt.replace(/[\[\]\n]/g,'')+'](frame-image:'+image.id+')';
  return [{id:id(s.id),title:text(s.title,200),script,cues,images,support:supportKinds.some(([k])=>k===s.support)?s.support:'camera',creationId:id(s.creationId)}];
 })};
}
export function normalizePublication(raw={}){
 const seen=new Set();return {revision:revision(raw?.revision),title:text(raw?.title,200),description:text(raw?.description,20000),comment:text(raw?.comment,20000),thumbnailId:id(raw?.thumbnailId),chapters:(Array.isArray(raw?.chapters)?raw.chapters:[]).slice(0,100).flatMap(c=>{
  if(!c||!id(c.id)||seen.has(id(c.id)))return [];seen.add(id(c.id));return [{id:id(c.id),sequenceId:id(c.sequenceId),title:text(c.title,200),time:text(c.time,12)}];
 })};
}
export function normalizeWorkflow(raw={}){return {conductor:normalizeConductor(raw?.conductor),publication:normalizePublication(raw?.publication)};}
export function newSequence(title='Nouvelle partie'){return {id:crypto.randomUUID(),title,script:'',cues:'',support:'camera',creationId:'',images:[]};}
export function chapterSeconds(value){
 if(!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(String(value)))return null;
 const parts=value.split(':').map(Number);if(parts.at(-1)>59||parts.length===3&&parts[1]>59)return null;
 return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts[0]*60+parts[1];
}
export function chaptersText(chapters){return chapters.map(c=>`${c.time.trim()} ${c.title.trim()}`).join('\n');}
export function chapterErrors(chapters){const issues=[];let previous=-1;for(const [i,c] of chapters.entries()){const seconds=chapterSeconds(c.time);if(seconds===null)issues.push(`Chapitre ${i+1} : horaire attendu au format 00:00 ou 01:00:00.`);else if(seconds<=previous)issues.push(`Chapitre ${i+1} : l’horaire doit suivre le précédent.`);if(!c.title.trim())issues.push(`Chapitre ${i+1} : ajoute un titre.`);if(seconds!==null)previous=seconds;}return issues;}
export function chaptersFromConductor(sequences,current=[]){return sequences.map(s=>{const kept=current.find(c=>c.sequenceId===s.id);return {id:kept?.id||crypto.randomUUID(),sequenceId:s.id,title:s.title||'Sans titre',time:kept?.time||''};});}
export function remapWorkflow(workflow,mapping){const copy=normalizeWorkflow(workflow);for(const s of copy.conductor.sequences)s.creationId=mapping.get(s.creationId)||'';copy.publication.thumbnailId=mapping.get(copy.publication.thumbnailId)||'';copy.conductor.revision=0;copy.publication.revision=0;return copy;}
export function updateWorkflowSection(project,section,value,expected){
 if(!['conductor','publication'].includes(section))throw Error('Atelier inconnu.');
 const workflow=normalizeWorkflow(project.workflow);
 if(workflow[section].revision!==expected)throw Error('Cet atelier a été modifié dans une autre fenêtre. Exporte ton brouillon puis recharge la version enregistrée.');
 workflow[section]=(section==='conductor'?normalizeConductor:normalizePublication)(value);workflow[section].revision=expected+1;
 return {...project,...(section==='conductor'&&typeof value.draft==='string'?{notes:value.draft.slice(0,20000)}:{}),workflow,updatedAt:Date.now()};
}
