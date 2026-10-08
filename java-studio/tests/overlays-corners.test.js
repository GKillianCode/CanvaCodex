import test from 'node:test';
import assert from 'node:assert/strict';
import {overlayFormats,makeOverlay,normalizeOverlay} from '../src/overlays.js';
import {visibleBlocks,setBlockText} from '../src/model.js';
import {cornerPixels,normalizeShape,drawShape} from '../src/shapes.js';
import {copyObjects,pasteObjects} from '../src/objectSelection.js';
import {captureComponent,normalizeComponents} from '../src/componentsLibrary.js';
import {renderSlide} from '../src/render.js';
test('24 distinct editable compositions survive reload without recreating deleted objects',()=>{
 assert.equal(overlayFormats.length,24);assert.equal(new Set(overlayFormats.map(f=>f.id)).size,24);
 const signatures=new Set();for(const f of overlayFormats){const s=makeOverlay(f.id),keys=visibleBlocks(s);assert.ok(keys.length>=2,f.id);assert.ok(keys.every(k=>s.elements[k]&&s.positions[k]&&s.fragments[k]));signatures.add(JSON.stringify(keys.map(k=>[s.elements[k].type,s.positions[k]])));const text=keys.find(k=>s.elements[k].type==='text');setBlockText(s,text,'Personnalisé');s.positions[text].x=333;const remove=keys.find(k=>k!==text);s.blockKeys=s.blockKeys.filter(k=>k!==remove);delete s.elements[remove];const r=normalizeOverlay(JSON.parse(JSON.stringify({type:f.id,slide:s})));assert.equal(r.slide.elements[text].text,'Personnalisé');assert.equal(r.slide.positions[text].x,333);assert.ok(!visibleBlocks(r.slide).includes(remove));assert.equal(r.slide.overlayFormat,f.id);}assert.equal(signatures.size,24);
});
test('legacy banners migrate text, subtitle, note and editable accents',()=>{
 for(const type of ['lower','chapter','tip','video']){const r=normalizeOverlay({type,title:'Mon titre',subtitle:'Mon surtitre',note:'Ma note'});assert.ok(Object.values(r.slide.elements).some(e=>e.text==='Mon titre'));if(type!=='tip')assert.ok(Object.values(r.slide.elements).some(e=>e.text==='Mon surtitre'));if(type==='video')assert.ok(Object.values(r.slide.elements).some(e=>e.text==='Ma note'));assert.ok(Object.values(r.slide.elements).some(e=>e.type==='shape'));}
});
test('thumbnail is an editable image, copied independently across scenes and components',()=>{
 const s=makeOverlay('video-thumbnail');s.elements.imageMiniature.src='data:image/png;base64,YQ==';s.elements.imageMiniature.fit='contain';s.positions.imageMiniature.rotation=15;const r=normalizeOverlay({type:'video-thumbnail',slide:s}).slide;assert.equal(r.elements.imageMiniature.src,s.elements.imageMiniature.src);assert.equal(r.positions.imageMiniature.rotation,15);const dest=makeOverlay('lower'),[key]=pasteObjects(dest,copyObjects(r,['imageMiniature']));assert.equal(dest.elements[key].src,s.elements.imageMiniature.src);dest.elements[key].fit='cover';assert.equal(r.elements.imageMiniature.fit,'contain');const c=normalizeComponents([captureComponent(r,['imageMiniature'],{x:0,y:0},'Miniature')])[0];assert.equal(c.items[0].element.src,s.elements.imageMiniature.src);
});
test('independent corners clamp safely and retain circular radii when stretched',()=>{
 const e=normalizeShape({shape:'rounded',radius:12,individualCorners:true,cornerRadii:{tl:0,tr:15,br:99,bl:-10}});assert.deepEqual(e.cornerRadii,{tl:0,tr:15,br:50,bl:0});assert.deepEqual(cornerPixels(e,800,200),[0,30,100,0]);assert.deepEqual(cornerPixels(e,200,800),[0,30,100,0]);assert.equal(cornerPixels({...e,individualCorners:false},800,200),24);assert.equal(cornerPixels({shape:'rect',radius:12},800,200),0);assert.equal(cornerPixels({shape:'rect',radius:12,roundedCorners:true},800,200),24);
 const s=makeOverlay();s.elements.shapeFond=e;const r=normalizeOverlay({type:'lower',slide:s}).slide;assert.deepEqual(r.elements.shapeFond.cornerRadii,e.cornerRadii);const dest=makeOverlay(),[key]=pasteObjects(dest,copyObjects(r,['shapeFond']));dest.elements[key].cornerRadii.tr=40;assert.equal(r.elements.shapeFond.cornerRadii.tr,15);
});
test('Canvas path uses four absolute corners and transparent scenes omit the full background',()=>{
 const oldPath=globalThis.Path2D;let corners;globalThis.Path2D=class{roundRect(...args){corners=args;}addPath(){}};
 try{const ctx={globalAlpha:1,save(){},restore(){},fill(){},setLineDash(){}};drawShape(ctx,normalizeShape({shape:'rounded',individualCorners:true,cornerRadii:{tl:0,tr:10,br:30,bl:50}}),{x:10,y:20,w:600,h:200},{accent:'#ffffff'});assert.deepEqual(corners,[10,20,600,200,[0,20,60,100]]);}finally{globalThis.Path2D=oldPath;}
 const s=makeOverlay();s.blockKeys=[];s.elements={};let backgrounds=0;const ctx={save(){},restore(){},fillRect(){backgrounds++;}};renderSlide(ctx,s,{bg:'#000000'},{transparent:true});assert.equal(backgrounds,0);renderSlide(ctx,s,{bg:'#000000'},{gradient:false});assert.equal(backgrounds,1);
});
