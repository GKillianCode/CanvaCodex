import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSlide,normalizeSlide } from '../src/model.js';
import { scaleObjects,scaleFromHandle } from '../src/scaleObjects.js';
import { layoutText } from '../src/textLists.js';
import { normalizeTextStyle } from '../src/textStyles.js';
import { text,wrapLines,blockBounds,renderSlide } from '../src/render.js';
import { animations,resolvedAnimation,motionState } from '../src/motion.js';
import { setAppearance } from '../src/appearances.js';
import { groupSelection } from '../src/selection.js';
import { normalizeTable } from '../src/tables.js';
import { copyObjects,pasteObjects } from '../src/objectSelection.js';
const ctx={save(){},restore(){},createLinearGradient(){return {addColorStop(){}};},font:'',measureText(t){return {width:String(t).length*10,actualBoundingBoxAscent:0,actualBoundingBoxDescent:20};}};
test('paragraph alignment uses available width and justifies only wrapped nonfinal lines',()=>{
 const get=align=>layoutText(ctx,'one two three four\nlast',140,20,1.4,{align},wrapLines);
 assert.equal(get('left').rows[0].x,0);assert.equal(get('center').rows[0].x,5);assert.equal(get('right').rows[0].x,10);
 const justified=get('justify');assert.deepEqual(justified.rows[0].words,['one','two','three']);assert.equal(justified.rows[0].wordGap,15);assert.equal(justified.rows[1].words,null);assert.equal(justified.rows[2].words,null);
 assert.equal(normalizeTextStyle({align:'invalid'}).align,'left');
 const painted=[],drawing={...ctx,fillText(t,x,y){painted.push({t,x,y});}};text(drawing,'one two three four',10,0,140,20,'#fff',400,'Arial',1.4,{weight:400,align:'justify'});
 assert.deepEqual(painted.slice(0,3).map(v=>v.x),[10,55,100]);
 const list=layoutText(ctx,'one two three four',180,20,1.4,{align:'right',list:{type:'bullet',indent:40,gap:10}},wrapLines);assert.equal(list.rows[0].markerX,20);assert.equal(list.rows[0].x,50);assert.equal(list.rows[1].x,140);
});
test('uniform group scaling preserves anchor, relative centers, rotation and independent styles',()=>{
 const originals={a:{x:100,y:100,w:200,h:100,size:40,rotation:35,textStyle:{align:'center',list:{indent:48}}},b:{x:400,y:200,w:100,h:200,size:30,autoSize:true,wrapWidth:100}};
 const bounds={x:100,y:100,w:400,h:300},plan=scaleFromHandle(bounds,'nw',-80,-60),result=scaleObjects(originals,bounds,plan.factor,plan.anchor);assert.equal(result.factor,1.2);assert.equal(result.positions.a.x,20);assert.equal(result.positions.a.rotation,35);assert.equal(result.positions.b.wrapWidth,120);assert.equal(result.positions.a.size,48);assert.equal(result.positions.a.contentScale,1.2);assert.equal(result.positions.a.x+result.positions.a.w,260);assert.equal(result.positions.b.x+result.positions.b.w,500);
 result.positions.a.textStyle.list.indent=99;assert.equal(originals.a.textStyle.list.indent,48);assert.equal(scaleObjects(originals,bounds,NaN),null);
 const restored=scaleObjects(result.positions,bounds,1/1.2,plan.anchor);assert.ok(Math.abs(restored.positions.a.size-40)<1e-8);
});
test('scaled text/code/table metrics survive project and portable clipboard roundtrips',()=>{
 const s=makeSlide('split');s.elements.textTable=normalizeTable({rows:2,columns:2,fontSize:28,padding:18,borderWidth:2});s.positions.textTable={x:100,y:500,w:500,h:200,size:30};s.fragments.textTable={order:1,animation:'auto',exitAnimation:'fade'};s.blockKeys.push('textTable');s.positions.title.textStyle={align:'right'};
 const before=blockBounds(ctx,s,'code'),table=structuredClone(s.elements.textTable),result=scaleObjects(s.positions,{x:0,y:0,w:1920,h:1080},1.5,{x:0,y:0});s.positions=result.positions;groupSelection(s,['title','body','textTable']);
 const code=blockBounds(ctx,s,'code');assert.equal(code.w,before.w*1.5);assert.equal(code.h,before.h*1.5);assert.equal(code.size,before.size*1.5);assert.deepEqual(s.elements.textTable,table);
 const reload=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.equal(reload.positions.title.contentScale,1.5);assert.equal(reload.positions.title.textStyle.align,'right');assert.equal(reload.fragments.textTable.exitAnimation,'fade');
 const target=makeSlide(),keys=pasteObjects(target,copyObjects(reload,['title','body','textTable']),0);assert.equal(keys.length,3);assert.equal(target.groups.at(-1).keys.length,3);assert.equal(target.positions[keys[0]].contentScale,1.5);assert.equal(target.positions[keys[0]].textStyle.align,'right');
});
test('automatic motion is stable per reveal, varied, reversible and grouped',()=>{
 const s=makeSlide();assert.equal(resolvedAnimation('auto',s,1),resolvedAnimation('auto',s,1));assert.equal(new Set(Array.from({length:6},(_,i)=>resolvedAnimation('auto',s,i))).size,6);
 for(const [id] of animations.filter(([id])=>!['none','auto'].includes(id))){assert.equal(motionState(id,0).alpha,0);assert.equal(motionState(id,1).alpha,1);assert.equal(motionState(id,0,true).alpha,1);assert.equal(motionState(id,1,true).alpha,0);assert.deepEqual(motionState(id,0,true),motionState(id,1));}
 groupSelection(s,['title','body']);setAppearance(s,['title'],'animation','auto');setAppearance(s,['body'],'exitAnimation','right');assert.equal(s.fragments.title.exitAnimation,'right');assert.equal(s.fragments.body.animation,'auto');const reload=normalizeSlide(s);assert.equal(reload.fragments.body.exitAnimation,'right');
});
test('group zoom shares a transform center and content scaling uses canonical internal metrics',()=>{
 const s=makeSlide('title');s.blockKeys=['title','body'];s.groups=[{id:'g',keys:['title','body']}];s.fragments.title={order:1,animation:'zoom'};s.fragments.body={order:1,animation:'zoom'};
 const calls=[],drawing=new Proxy({...ctx,globalAlpha:1},{get(o,k){if(k in o)return o[k];return (...args)=>calls.push([k,...args]);}});
 renderSlide(drawing,s,{ink:'#ffffff',accent:'#a5f3cf',secondary:'#00ffaa'},{transparent:true,order:1,motion:{order:1,started:0},now:210});const transforms=calls.filter(c=>c[0]==='scale');assert.equal(transforms.length,2);assert.deepEqual(transforms[0],transforms[1]);const centers=calls.filter(c=>c[0]==='translate'&&c[1]>0);assert.deepEqual(centers[0],centers[1]);
 s.positions=scaleObjects(s.positions,{x:0,y:0,w:1920,h:1080},2,{x:0,y:0}).positions;calls.length=0;renderSlide(drawing,s,{ink:'#ffffff',accent:'#a5f3cf',secondary:'#00ffaa'},{transparent:true});assert.equal(calls.filter(c=>c[0]==='scale'&&c[1]===2).length,2);
});
