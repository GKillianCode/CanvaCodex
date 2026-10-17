import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOverlay,makeOverlayClip,normalizeOverlay} from '../src/overlays.js';
import {clipMotion} from '../src/overlayAnimation.js';
import {appearanceRows} from '../src/appearances.js';
import {captureOverlayVideo} from '../src/overlayVideo.js';
test('YouTube outro has two separated 16:9 rectangles and a circular channel inside a 1080p frame',()=>{
 const slide=makeOverlay('youtube-outro',{playlist:'Java en profondeur'}),p=slide.positions;
 for(const key of ['shapeVideo','shapePlaylist']){assert.equal(p[key].w/p[key].h,16/9);assert.equal(p[key].w,640);assert.equal(p[key].h,360);}
 assert.equal(p.shapeChaine.w,p.shapeChaine.h);assert.equal(p.shapeChaine.w,294);assert.equal(slide.elements.shapeChaine.shape,'circle');
 assert.ok(p.shapeVideo.x+p.shapeVideo.w<p.shapeChaine.x);assert.ok(p.shapeChaine.x+p.shapeChaine.w<p.shapePlaylist.x);
 for(const [key,pos] of Object.entries(p)){assert.ok(pos.x>=0&&pos.y>=0&&pos.x+pos.w<=1920&&pos.y+pos.h<=1080,key);}
 assert.equal(slide.elements.textPlaylist.text,'Java en profondeur');assert.equal(slide.elements.shapeFondVert.fill,'#00ff00');assert.equal(p.shapeFondVert.locked,true);
 assert.ok(Object.values(slide.elements).filter(e=>e.type==='shape').every(e=>!e.fillRole));
});
test('outro green background and grouped timing survive edited export snapshots and reload',()=>{
 const slide=makeOverlay('youtube-outro'),clip=makeOverlayClip('youtube-outro',slide.blockKeys),rows=appearanceRows(slide);
 assert.equal(clip.duration,15);assert.equal(clip.background,'chroma');assert.equal(clip.chroma,'#00ff00');assert.equal(clip.format,'mov');
 const state=clipMotion(slide,clip,1.2,rows);assert.equal(state.shapeFondVert.alpha,1);assert.deepEqual(state.shapePlaylist,state.textPlaylist);assert.equal(state.shapeChaine.visible,false);
 slide.elements.textPlaylist.text='Ma playlist';slide.positions.shapeVideo.x=120;
 const restored=normalizeOverlay(JSON.parse(JSON.stringify({type:'youtube-outro',slide,clip}))),snapshot=captureOverlayVideo(restored);
 assert.equal(snapshot.slide.elements.textPlaylist.text,'Ma playlist');assert.equal(snapshot.slide.positions.shapeVideo.x,120);assert.equal(snapshot.clip.background,'chroma');assert.equal(restored.slide.groups.length,3);
});
