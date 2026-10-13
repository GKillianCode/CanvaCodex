import {makeOverlay} from './overlays.js';
import {normalizeShape} from './shapes.js';
export const thumbnailCategories=[['java','Java','#D32F2F'],['ai','IA','#2563EB'],['design','Conception','#7C3AED'],['devops','DevOps','#0F766E'],['production','Mise en production','#C2410C'],['git','Versioning','#475569']];
export const thumbnailPresets=thumbnailCategories.map(([category,label,color])=>({id:category,category,label,color,name:label}));
export const thumbnailPalette={bg:'#FFFFFF',panel:'#FFFFFF',ink:'#111111',muted:'#525252',accent:'#D32F2F',secondary:'#2563EB'};
const identityKeys=['shapePlaylistBackground','shapePlaylistBorder','shapePlaylistLabel','textPlaylistLabel'];
export function applyThumbnailIdentity(scene,id){
 const p=thumbnailPresets.find(p=>p.id===id)||thumbnailPresets[0],remove=new Set(identityKeys);
 const kept=scene.blockKeys.filter(k=>!remove.has(k));if(kept.length+identityKeys.length>100)throw Error('Libère quatre calques pour appliquer cette identité.');
 for(const key of remove){delete scene.elements[key];delete scene.positions[key];delete scene.fragments[key];}
 const add=(key,e,x,y,w,h,size=32)=>{scene.elements[key]=e;scene.positions[key]={x,y,w,h,size,font:'inter',textRole:'subtitle'};scene.fragments[key]={order:0,animation:'none'};};
 add(identityKeys[0],normalizeShape({shape:'rect',name:'Fond blanc',fill:'#FFFFFF'}),0,0,1920,1080);
 add(identityKeys[1],normalizeShape({shape:'rect',name:'Contour · '+p.label,filled:false,outlined:true,stroke:p.color,strokeWidth:20,topGap:[58/1888*100,(58+Math.max(210,p.label.length*28+96))/1888*100]}),16,16,1888,1048);
 const width=Math.max(210,p.label.length*28+96);
 add(identityKeys[2],normalizeShape({shape:'rect',name:'Zone transparente du repère de playlist',filled:false,outlined:false,fill:'#FFFFFF'}),74,0,width,100);
 add(identityKeys[3],{type:'text',custom:true,name:'Nom de la playlist',text:p.label,weight:700},106,30,width-64,60,38);scene.positions[identityKeys[3]].textStyle={weight:700,color:'#111111'};
 scene.blockKeys=[identityKeys[0],...kept,...identityKeys.slice(1)];scene.groups=(scene.groups||[]).map(g=>({...g,keys:g.keys.filter(k=>!remove.has(k))})).filter(g=>g.keys.length>1);
 scene.hiddenKeys=(scene.hiddenKeys||[]).filter(k=>!remove.has(k));scene.thumbnailPreset=p.id;return p;
}
export function makeThumbnail(id='java'){
 const scene=makeOverlay('chapter');scene.elements={};scene.positions={};scene.fragments={};scene.blockKeys=[];scene.overlayFormat=undefined;scene.overlayName=undefined;applyThumbnailIdentity(scene,id);return scene;
}
