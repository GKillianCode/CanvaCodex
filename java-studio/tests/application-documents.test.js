import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationStorage,applicationFile,readApplicationFile} from '../src/applicationDocuments.js';
import {loadWorkspaces,saveWorkspaces,workspaceKeys} from '../src/workspaceStorage.js';
import {thumbnailPresets,makeThumbnail,applyThumbnailIdentity} from '../src/thumbnails.js';
import {normalizeSlides} from '../src/model.js';
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('applications preserve legacy creations and never overwrite an inactive document',()=>{
 const base=storage(),slide=makeThumbnail();base.setItem('frame-project',JSON.stringify({project:'Ancien',slides:[slide],banner:{type:'chapter',title:'Mon incrustation'}}));
 const slides=applicationStorage(base,'slides'),banners=applicationStorage(base,'banners');
 const first=loadWorkspaces(slides,[slide]);first.documents.slides.project='Cours';saveWorkspaces(slides,first.documents,{});
 assert.ok(base.getItem('frame-project'));assert.equal(base.getItem(workspaceKeys.banners),null);
 const second=loadWorkspaces(banners,[slide]);assert.equal(second.documents.banners.banner.slide.elements.textTitre.text,'Mon incrustation');second.documents.banners.project='Overlay';saveWorkspaces(banners,second.documents,{});
 assert.equal(JSON.parse(base.getItem(workspaceKeys.slides)).project,'Cours');assert.equal(JSON.parse(base.getItem(workspaceKeys.banners)).project,'Overlay');assert.equal(base.getItem('frame-project'),null);
 first.documents.banners.project='Obsolète';saveWorkspaces(slides,first.documents,{});assert.equal(JSON.parse(base.getItem(workspaceKeys.banners)).project,'Overlay');
 slides.setItem('frame-themes','slide-theme');banners.setItem('frame-themes','banner-theme');assert.equal(slides.getItem('frame-themes'),'slide-theme');assert.equal(banners.getItem('frame-themes'),'banner-theme');
 const thumbnails=applicationStorage(base,'thumbnails');thumbnails.setItem(workspaceKeys.slides,'miniature');assert.equal(JSON.parse(slides.getItem(workspaceKeys.slides)).project,'Cours');assert.equal(thumbnails.getItem(workspaceKeys.slides),'miniature');
});
test('each file imports into its application exclusively, including scoped legacy migration',()=>{
 const data={slides:[makeThumbnail()],banner:{type:'chapter',title:'Overlay'}};
 for(const app of ['slides','banners','thumbnails']){const file=applicationFile(data,app);assert.equal(file.kind,app);assert.equal('banner' in file,app==='banners');assert.equal('slides' in file,app!=='banners');assert.equal(Object.keys(readApplicationFile(file,app)).length,1);for(const other of ['slides','banners','thumbnails'].filter(a=>a!==app))assert.throws(()=>readApplicationFile(file,other),/autre application/);}
 assert.deepEqual(Object.keys(readApplicationFile(data,'slides')),['slides']);assert.deepEqual(Object.keys(readApplicationFile(data,'banners')),['banners']);assert.throws(()=>readApplicationFile(data,'thumbnails'));
});
test('playlist identities preserve custom content and survive saving without accumulating frames',()=>{
 assert.equal(thumbnailPresets.length,6);
 const scene=makeThumbnail();scene.elements.textTitle={type:'text',custom:true,text:'Mon titre'};scene.positions.textTitle={x:200,y:200,w:700,h:200,size:80};scene.fragments.textTitle={order:0};scene.blockKeys.push('textTitle');
 for(const preset of thumbnailPresets){applyThumbnailIdentity(scene,preset.id);const [restored]=normalizeSlides([JSON.parse(JSON.stringify(scene))]);assert.equal(restored.elements.textTitle.text,'Mon titre');assert.equal(restored.elements.shapePlaylistBorder.stroke,preset.color);assert.equal(restored.elements.shapePlaylistBackground.fill,'#FFFFFF');assert.equal(restored.elements.textPlaylistLabel.text,preset.label);assert.equal(scene.blockKeys.length,5);}
 assert.equal(thumbnailPresets[0].color,'#D32F2F');assert.equal(thumbnailPresets[1].color,'#2563EB');
});
