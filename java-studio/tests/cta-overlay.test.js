import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOverlay,makeOverlayClip,normalizeOverlay} from '../src/overlays.js';
import {appearanceRows} from '../src/appearances.js';
import {clipMotion} from '../src/overlayAnimation.js';
import {captureOverlayVideo} from '../src/overlayVideo.js';

test('CTA reveals like, subscription and thanks in sequence with synchronized groups and transparent exit',()=>{
 const slide=makeOverlay('like-subscribe'),clip=makeOverlayClip('like-subscribe',slide.blockKeys),rows=appearanceRows(slide);
 const at=time=>clipMotion(slide,clip,time,rows);
 assert.equal(clip.duration,8);assert.equal(clip.format,'mov');assert.equal(clip.background,'transparent');
 assert.equal(at(.5).textInvitation.alpha,1-(1-.5/.55)**3);
 assert.equal(at(.5).textLike.visible,false);assert.equal(at(1.6).textLike.alpha,1);
 assert.deepEqual(at(1.1).shapeLike,at(1.1).textLike);assert.deepEqual(at(1.1).shapeCoeur,at(1.1).textLike);
 assert.equal(at(2).textAbonnement.visible,false);assert.equal(at(3.5).textAbonnement.alpha,1);
 assert.deepEqual(at(2.9).shapeAbonnement,at(2.9).textAbonnement);
 assert.equal(at(4).textMerci.visible,false);assert.equal(at(5.6).textMerci.alpha,1);
 assert.ok(at(7.7).textLike.alpha>0&&at(7.7).textLike.alpha<1);
 assert.ok(Object.values(at(8)).every(state=>state.visible===false));
});
test('CTA defaults only apply to new clips and edited content and timing survive reload and export snapshots',()=>{
 const fresh=normalizeOverlay({type:'like-subscribe'});assert.equal(fresh.clip.tracks.textAbonnement.start,2.7);
 fresh.slide.elements.textAbonnement.text='Rejoignez la chaîne';fresh.clip.tracks.textAbonnement.start=3.2;
 const restored=normalizeOverlay(JSON.parse(JSON.stringify(fresh)));
 assert.equal(restored.slide.elements.textAbonnement.text,'Rejoignez la chaîne');assert.equal(restored.clip.tracks.textAbonnement.start,3.2);
 assert.equal(restored.slide.groups.length,3);
 const snapshot=captureOverlayVideo(restored);assert.equal(snapshot.slide.elements.textAbonnement.text,'Rejoignez la chaîne');assert.equal(snapshot.clip.tracks.textAbonnement.start,3.2);
 assert.deepEqual(Object.keys(normalizeOverlay({type:'subscribe'}).clip.tracks),[]);
});
