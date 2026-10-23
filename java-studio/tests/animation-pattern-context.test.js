import {hasTransparentScenes,resolveAnimationFormat} from '../src/animationExportSettings.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {animationScene,normalizeAnimation} from '../src/animationModel.js';
import {backgroundModes,patternChannels} from '../src/sceneBackground.js';
import {applyMotion,captureMotion,builtinMotions} from '../src/animationPresets.js';
const scene={id:'qa-pattern',blockKeys:['a','b'],positions:{a:{x:100,y:100,w:100,h:100},b:{x:500,y:100,w:100,h:100}},elements:{a:{type:'shape',shape:'rect',filled:true,fill:'#ffffff'},b:{type:'text',text:'Texte'}},fragments:{a:{order:0,animation:'none'},b:{order:0,animation:'none'}},background:{mode:'dots',base:'#000000',color:'#ffffff',opacity:20,size:4,spacing:32}};
test('pattern channels interpolate with shared curves and colour interpolation; mode crossfades only its two endpoints',()=>{
 const fields={patternBase:['#000000','#ffffff'],patternColor:['#ff0000','#0000ff'],patternColor2:['#001122','#334455'],patternOpacity:[20,80],patternSize:[4,12],patternSpacing:[32,64],patternThickness:[1,3],patternRotation:[0,90],patternOffsetX:[0,80],patternOffsetY:[0,40]};
 const cfg=normalizeAnimation({duration:4,clips:[{id:'bg',keys:[],duration:4,easing:'linear',frames:[...Object.entries(fields).flatMap(([field,values])=>values.map((value,i)=>({field,time:i*4,value,ease:'linear'}))),{field:'patternMode',time:0,value:backgroundModes.findIndex(([m])=>m==='dots'),ease:'linear'},{field:'patternMode',time:4,value:backgroundModes.findIndex(([m])=>m==='hexagons')},{field:'patternStagger',time:0,value:0},{field:'patternStagger',time:4,value:1}]}]});
 const mid=animationScene(scene,cfg,2).scene;
 assert.equal(mid.background.base,'#808080');assert.equal(mid.background.color,'#800080');
 assert.equal(mid.background.opacity,50);assert.equal(mid.background.size,8);assert.equal(mid.background.spacing,48);
 assert.equal(mid.background.rotation,45);assert.equal(mid.background.offsetX,40);assert.equal(mid.background.offsetY,20);assert.equal(mid.background.thickness,2);
 assert.equal(mid.background.stagger,false);assert.equal(mid.background.mode,'dots');
 assert.equal(mid.backgroundBlend.background.mode,'hexagons');assert.equal(mid.backgroundBlend.progress,.5);
 const end=animationScene(scene,cfg,4).scene;assert.equal(end.background.mode,'hexagons');assert.equal(end.background.stagger,true);
 assert.deepEqual(normalizeAnimation(JSON.parse(JSON.stringify(cfg))),cfg);
 assert.equal(scene.background.base,'#000000');assert.equal(scene.backgroundBlend,undefined);
 assert(Object.keys(patternChannels).every(field=>cfg.clips[0].frames.some(f=>f.field===field)));
});
test('new group tracks transform the group frame and preserve internal proportions while legacy clips retain their semantics',()=>{
 const cfg=normalizeAnimation({duration:4,clips:[{keys:['a','b'],groupTransform:true,duration:4,easing:'linear',frames:[{field:'x',time:0,value:100,ease:'linear'},{field:'x',time:4,value:300},{field:'w',time:0,value:500,ease:'linear'},{field:'w',time:4,value:1000}]}]});
 for(const [t,x,w] of [[0,100,500],[2,200,750],[4,300,1000]]){
  const {positions:p}=animationScene(scene,cfg,t).scene;
  assert.equal(p.a.x,x);assert.equal(p.a.w,w/5);assert.equal(p.b.x+p.b.w-p.a.x,w);
 }
 assert.equal(normalizeAnimation({clips:[{keys:['a','b']}]}).clips[0].groupTransform,undefined);
 const preset=captureMotion(cfg.clips[0],{x:100,y:100,w:500,h:100},null,'Groupe');
 const restored=applyMotion(preset,{x:200,y:100,w:500,h:100},['a','b'],0,4);
 assert.equal(restored.clip.keys.length,2);assert.equal(restored.clip.groupTransform,true);
 const pulse=applyMotion(builtinMotions.find(m=>m.id==='builtin-pulse'),{x:100,y:100,w:500,h:100},['a','b'],0,2);
 assert.equal(pulse.clip.keys.length,2);
});

test('export format detects transparency across keyed and fixed pattern backgrounds',()=>{
 const idx=mode=>backgroundModes.findIndex(([id])=>id===mode);
 const opaque={...scene,animation:{background:'transparent',clips:[{enabled:true,start:0,keys:[],frames:[{field:'patternMode',time:0,value:idx('dots')},{field:'patternMode',time:4,value:idx('hexagons')}]}]}};
 assert.equal(hasTransparentScenes([opaque]),false);assert.equal(resolveAnimationFormat('auto',[opaque]),'mp4');
 const clear=structuredClone(opaque);clear.animation.clips[0].frames[1].value=idx('transparent');
 assert.equal(hasTransparentScenes([clear]),true);assert.equal(resolveAnimationFormat('auto',[clear]),'mkv');
 assert.equal(hasTransparentScenes([{...scene,animation:{background:'transparent'}}]),false);
 assert.equal(hasTransparentScenes([{...scene,background:{mode:'transparent'},animation:{background:'solid'}}]),true);
});
