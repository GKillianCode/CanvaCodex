import {normalizeAnimation} from './animationModel.js';
import {parseWorkspaceFile,captureWorkspace,workspaceKeys} from './workspaceStorage.js';
export const applications=[{id:'animation',name:'Animation',description:'Mettre les idées en mouvement. Images clés et trajectoires.',tag:'MOUVEMENT'},{id:'slides',name:'Diaporamas',description:'Expliquer, révéler et présenter. Des cours qui prennent vie.',tag:'PRÉSENTER'},{id:'banners',name:'Incrustations',description:'Habiller tes vidéos. Des blocs animés prêts pour le montage.',tag:'ANIMER'},{id:'thumbnails',name:'Miniatures',description:'Donner envie de cliquer. Composer une image forte pour chaque sujet.',tag:'COMPOSER'}];
export function applicationStorage(storage,app){
 if(app==='animation')return {getItem:k=>storage.getItem('frame-animation:'+k),setItem:(k,v)=>storage.setItem('frame-animation:'+k,v),removeItem:k=>storage.removeItem('frame-animation:'+k)};
 const thumbnail=app==='thumbnails',own=app==='banners'?'banners':'slides';
 const key=k=>thumbnail?'frame-thumbnails:'+k:['frame-workspace','frame-themes','frame-session'].includes(k)?app+':'+k:k;
 return {getItem(k){return storage.getItem(key(k))||(!thumbnail&&['frame-workspace','frame-themes','frame-session'].includes(k)?storage.getItem(k):null);},setItem(k,v){if(!thumbnail&&app==='banners'&&k==='frame-slides-session')return;if(!thumbnail&&Object.entries(workspaceKeys).some(([kind,value])=>value===k&&kind!==own))return;storage.setItem(key(k),v);},removeItem(k){if(!thumbnail&&k==='frame-project'&&(!storage.getItem(workspaceKeys.slides)||!storage.getItem(workspaceKeys.banners)))return;storage.removeItem(key(k));}};
}
export function applicationFile(data,app){const result=captureWorkspace(data,app==='banners'?'banners':'slides');if(app==='animation')result.kind='animation';if(app==='thumbnails'){result.kind='thumbnails';result.slides=result.slides.slice(0,1);}return result;}
export function readApplicationFile(raw,app){
 if(app==='animation'&&(raw?.format!=='frame-workspace'||raw.kind!=='animation'))throw Error('Fichier d’animation invalide.');
 const kind=app==='banners'?'banners':'slides';
 if(raw?.format==='frame-workspace'&&raw.kind!==app)throw Error('Ce fichier appartient à une autre application. Ouvre-la depuis l’accueil.');
 const incoming=parseWorkspaceFile(['thumbnails','animation'].includes(app)?{...raw,kind:'slides'}:raw);
 if(app==='animation')for(const scene of incoming.slides.slides)scene.animation=normalizeAnimation(scene.animation);
 if(app==='thumbnails'){if(raw?.format!=='frame-workspace'||raw.kind!=='thumbnails'||incoming.slides.slides.length!==1)throw Error('Fichier de miniature invalide.');}
 return {[kind]:incoming[kind]};
}
