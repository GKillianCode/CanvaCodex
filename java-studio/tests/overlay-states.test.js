import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOverlay,normalizeOverlay} from '../src/overlays.js';
import {addPedagogicalStep,movePedagogicalStep,removePedagogicalStep} from '../src/pedagogicalSteps.js';
import {normalizeClip} from '../src/overlayAnimation.js';
import {overlayKeys,overlayStates,overlayStateAt} from '../src/overlayTimeline.js';
import {renderOverlayFrame,captureOverlayVideo} from '../src/overlayVideo.js';
const theme={bg:'#000000',panel:'#111111',ink:'#ffffff',muted:'#aaaaaa',accent:'#00ff00',secondary:'#ffffff'};
function context(){const painted=[],matrices=[],stack=[];globalThis.Path2D=class{roundRect(){}addPath(path,matrix){matrices.push(matrix.values);}};globalThis.DOMMatrix=class{constructor(values){this.values=values;}};
 const ctx=new Proxy({globalAlpha:1,fillStyle:'',save(){stack.push([this.globalAlpha,this.fillStyle]);},restore(){[this.globalAlpha,this.fillStyle]=stack.pop();},measureText:t=>({width:String(t).length*16}),fillText(t){painted.push([t,this.globalAlpha]);},createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}});return {ctx,painted,matrices};}
test('overlay states remain independent through edits, deletion, reordering and JSON reload',()=>{
 const slide=makeOverlay('subscribe');addPedagogicalStep(slide);slide.pedagogicalSteps[0].scene.elements.textAction.text='Bienvenue !';addPedagogicalStep(slide,1);
 const last=slide.pedagogicalSteps[1];last.scene.positions.textAction.x=100;
 const banner=normalizeOverlay(JSON.parse(JSON.stringify({type:'subscribe',slide,clip:{duration:9,stepStarts:{[last.id]:7}}})));
 assert.equal(banner.slide.elements.textAction.text,'Abonnez-vous');assert.equal(banner.slide.pedagogicalSteps[0].scene.elements.textAction.text,'Bienvenue !');assert.equal(banner.slide.pedagogicalSteps[1].scene.positions.textAction.x,100);
 assert.deepEqual(overlayStates(banner.slide,banner.clip).map(r=>r.start),[0,3,7]);
 movePedagogicalStep(banner.slide,2,-1);assert.equal(banner.slide.pedagogicalSteps[0].id,last.id);
 removePedagogicalStep(banner.slide,1,1);assert.equal(banner.slide.pedagogicalSteps.length,1);
});
test('timeline stays ordered with invalid starts and shortened clips, and seeks deterministically',()=>{
 const slide=makeOverlay('subscribe');addPedagogicalStep(slide);addPedagogicalStep(slide,1);
 const [a,b]=slide.pedagogicalSteps,clip=normalizeClip({duration:2,stepStarts:{[a.id]:19,[b.id]:-2}},overlayKeys(slide));const states=overlayStates(slide,clip);
 assert.ok(states[1].start<states[2].start&&states[2].start<2);
 assert.equal(overlayStateAt(slide,clip,0).row.index,0);assert.equal(overlayStateAt(slide,clip,2).row.index,2);
 const normal=normalizeClip({duration:6},overlayKeys(slide));assert.equal(overlayStateAt(slide,normal,2.25).progress,.5);assert.equal(overlayStateAt(slide,normal,1).row.index,0);
});
test('video renderer uses shared interpolation once and preserves the final transparent exit',()=>{
 const slide=makeOverlay('subscribe');slide.blockKeys=['shapeBouton'];slide.groups=[];slide.elements.shapeBouton.shape='rect';slide.elements.shapeBouton.roundedCorners=false;slide.elements.shapeBouton.individualCorners=false;slide.positions.shapeBouton.interpolate=true;Object.assign(slide.positions.shapeBouton,{x:100,y:300,w:300,h:200});
 addPedagogicalStep(slide);Object.assign(slide.pedagogicalSteps[0].scene.positions.shapeBouton,{x:800,y:200,w:600,h:400});
 const clip=normalizeClip({duration:4,stagger:0,animation:'none',exitAnimation:'fade'},overlayKeys(slide)),c=context();
 renderOverlayFrame(c.ctx,slide,theme,clip,2.25);assert.deepEqual(c.matrices,[[4.5,0,0,3,450,250]]);
 c.matrices.length=0;renderOverlayFrame(c.ctx,slide,theme,clip,4);assert.equal(c.matrices.length,0);
});
test('step-only objects and timing reach export snapshots without recreating deleted base content',()=>{
 const slide=makeOverlay('subscribe');addPedagogicalStep(slide);const next=slide.pedagogicalSteps[0];next.scene.blockKeys=['textOnly'];next.scene.elements={textOnly:{type:'text',text:'Texte final',custom:true}};next.scene.positions={textOnly:{...slide.positions.textAction}};next.scene.fragments={textOnly:{order:0,animation:'none'}};
 const banner=normalizeOverlay({type:'subscribe',slide,clip:{duration:4,tracks:{textOnly:{start:0,end:4,entry:.1,exit:.1,animation:'none',exitAnimation:'fade'}}}});
 assert.ok(banner.clip.tracks.textOnly);const snapshot=captureOverlayVideo(banner);next.scene.elements.textOnly.text='Modification ultérieure';
 const c=context();renderOverlayFrame(c.ctx,snapshot.slide,theme,snapshot.clip,3);assert.ok(c.painted.some(([t])=>t==='Texte final'));assert.ok(!c.painted.some(([t])=>t==='Abonnez-vous'));
});
