import {normalizeSlides,normalizeResolution,normalizeFrame} from './model.js';
import {normalizeOverlay} from './overlays.js';
import {normalizeThemes} from './themes.js';
import {normalizeProjectColors} from './projectTheme.js';
import {normalizeComponents} from './componentsLibrary.js';
export const workspaceKeys={slides:'frame-slides-project',banners:'frame-banners-project'};
export const workspaceNames={slides:'frame-diaporama.json',banners:'frame-incrustation.json'};
const shared=['projectId','project','themes','themeId','projectColors','components','resolution','frame','transitionMs'];
const clone=value=>JSON.parse(JSON.stringify(value));
const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}};
export function captureWorkspace(data,kind){const result={format:'frame-workspace',version:1,kind};for(const key of shared)if(data[key]!==undefined)result[key]=data[key];if(kind==='slides'){result.slides=data.slides;result.routeMode=data.routeMode;result.routeStart=data.routeStart;}else result.banner=data.banner;return clone(result);}
export function normalizeWorkspace(raw,kind){
 if(!raw||typeof raw!=='object'||!['slides','banners'].includes(kind))throw Error('Document Frame invalide.');
 if(raw.format&& (raw.format!=='frame-workspace'||raw.version!==1||raw.kind!==kind))throw Error('Type de document Frame incompatible.');
 if(kind==='banners'&&(!raw.banner||typeof raw.banner!=='object'))throw Error('Incrustation absente du fichier.');
 const themes=normalizeThemes(raw.themes),data={...raw,projectId:typeof raw.projectId==='string'&&raw.projectId.length<100?raw.projectId:crypto.randomUUID(),project:String(raw.project|| (kind==='slides'?'Mon diaporama':'Mon incrustation')).slice(0,200),themes,themeId:themes.some(t=>t.id===raw.themeId)?raw.themeId:themes[0].id,projectColors:normalizeProjectColors(raw.projectColors),components:normalizeComponents(raw.components),resolution:normalizeResolution(raw.resolution),frame:normalizeFrame(raw.frame),transitionMs:Number.isFinite(raw.transitionMs)?Math.max(0,Math.min(2000,raw.transitionMs)):650};
 if(kind==='slides'){data.slides=normalizeSlides(raw.slides);data.routeMode=raw.routeMode==='manual'?'manual':'spatial';data.routeStart=data.slides.some(s=>s.id===raw.routeStart)?raw.routeStart:'';}else data.banner=normalizeOverlay(raw.banner);
 return captureWorkspace(data,kind);
}
export function loadWorkspaces(storage,sample){
 const session=read(storage,'frame-session')||{},legacy=read(storage,'frame-project'),library=read(storage,'frame-themes');const preferred=session.scope==='banners'||session.view==='banners'?'banners':'slides',documents={},legacyScopes=[];
 for(const kind of ['slides','banners']){let value;const scoped=read(storage,workspaceKeys[kind]);try{if(scoped)value=normalizeWorkspace(scoped,kind);}catch{}
  if(!value&&legacy){try{value=normalizeWorkspace({...legacy,banner:legacy.banner||{type:'lower',title:'Le bytecode, expliqué.'}},kind);legacyScopes.push(kind);if(kind!==preferred)value.projectId=crypto.randomUUID();}catch{}}
  documents[kind]=value||normalizeWorkspace({slides:sample,banner:{type:'lower',title:'Le bytecode, expliqué.',subtitle:'JAVA · SOUS LE CAPOT'},themes:library},kind);
 }
 if(documents.slides.projectId===documents.banners.projectId)documents[preferred==='slides'?'banners':'slides'].projectId=crypto.randomUUID();
 const slidesSession=read(storage,'frame-slides-session')||session;
 return {documents,session:{...session,scope:preferred,slideId:slidesSession.slideId,workspace:slidesSession.workspace||session.workspace},legacyScope:legacyScopes.includes(preferred)?preferred:null};
}
export function saveWorkspaces(storage,documents,session){
 for(const kind of ['slides','banners']){const text=JSON.stringify(captureWorkspace(documents[kind],kind));if(storage.getItem(workspaceKeys[kind])!==text)storage.setItem(workspaceKeys[kind],text);}
 storage.setItem('frame-session',JSON.stringify({view:session.view,scope:session.scope}));
 storage.setItem('frame-slides-session',JSON.stringify({slideId:session.slideId,workspace:session.workspace}));
 storage.setItem('frame-banners-session',JSON.stringify({workspace:'editor'}));
 // Both replacements now exist. Keep the legacy value if a write fails beforehand.
 storage.removeItem('frame-project');
}
export function parseWorkspaceFile(raw){
 if(raw?.format==='frame-workspace'){if(!['slides','banners'].includes(raw.kind))throw Error('Type de document Frame invalide.');return {[raw.kind]:normalizeWorkspace(raw,raw.kind)};}
 if(raw?.format)throw Error('Ce fichier n’est pas un document Frame.');
 const slides=normalizeWorkspace(raw,'slides'),banners=normalizeWorkspace({...raw,banner:raw.banner||{type:'lower',title:'Le bytecode, expliqué.'}},'banners');banners.projectId=crypto.randomUUID();return {slides,banners};
}
