import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeTable,isHeaderCell,resizeTable,tableTracks,applyTableStyle,drawTable } from '../src/tables.js';
import { makeSlide,normalizeSlide } from '../src/model.js';
import { copyObjects,pasteObjects } from '../src/objectSelection.js';
import { usedFontFaces } from '../src/textStyles.js';
import { measurementTarget,measurementMargins } from '../src/measurementGuides.js';
import { rotatePoint } from '../src/editor.js';
import { normalizeThemes } from '../src/themes.js';
test('header placement and depth select all four edges and preserve legacy no-header tables',()=>{
 const expected={top:[[0,0],[0,1],[0,2],[0,3]],bottom:[[2,0],[2,1],[2,2],[2,3]],left:[[0,0],[1,0],[2,0]],right:[[0,3],[1,3],[2,3]],'top-left':[[0,0],[0,1],[0,2],[0,3],[1,0],[2,0]],none:[]};
 for(const [headerPosition,cells] of Object.entries(expected)){const e=normalizeTable({rows:3,columns:4,headerPosition});const actual=[];for(let r=0;r<3;r++)for(let c=0;c<4;c++)if(isHeaderCell(e,r,c))actual.push([r,c]);assert.deepEqual(actual,cells,headerPosition);}
 assert.equal(normalizeTable({header:false}).headerPosition,'none');assert.equal(normalizeTable({header:true}).headerPosition,'top');assert.equal(normalizeTable({headerPosition:'right',headerCount:99,columns:3}).headerCount,3);assert.ok(isHeaderCell(normalizeTable({headerPosition:'left',headerCount:2}),3,1));
});
test('style presets, resizing, reload and clipboard keep content and custom proportions independent',()=>{
 const e=normalizeTable({rows:3,columns:3,cells:[['A','B','C']],headerPosition:'bottom',cornerRadius:28.25,padding:18.75,borderWidth:1.5,headerSeparatorWidth:2.25,borderRole:null,border:'#aabbcc',stripeFillRole:'warning',columnWeights:[2,1,1],rowWeights:[1,2,1],headerFontSize:34.5,verticalAlign:'bottom',lineStyle:'dashed'});const cells=structuredClone(e.cells);applyTableStyle(e,'rounded');assert.deepEqual(e.cells,cells);assert.equal(e.headerPosition,'bottom');assert.deepEqual(e.columnWeights,[2,1,1]);e.cornerRadius=28.25;e.borderWidth=1.5;
 resizeTable(e,4,4);assert.deepEqual(e.columnWeights,[2,1,1,1]);assert.equal(e.cells[0][0],'A');const s=makeSlide('table-compare'),key=Object.keys(s.elements).find(k=>s.elements[k].type==='table');s.elements[key]=e;const restored=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.equal(restored.elements[key].cornerRadius,28.25);assert.equal(restored.elements[key].padding,18.75);assert.equal(restored.elements[key].borderWidth,1.5);assert.equal(restored.elements[key].headerFontSize,34.5);
 const target=makeSlide(),[copy]=pasteObjects(target,copyObjects(restored,[key]),0);target.elements[copy].columnWeights[0]=8;assert.equal(restored.elements[key].columnWeights[0],2);target.elements[copy].cells[0][0]='Copie';assert.equal(restored.elements[key].cells[0][0],'A');
});
test('relative tracks fill the entire frame and use actual widths/heights',()=>{
 const e=normalizeTable({rows:2,columns:3,rowWeights:[1,3],columnWeights:[2,1,1]});assert.deepEqual(tableTracks(e,{w:800,h:400}),{columns:[{at:0,size:400},{at:400,size:200},{at:600,size:200}],rows:[{at:0,size:100},{at:100,size:300}]});const invalid=normalizeTable({columnWeights:[0,-9,Infinity],rowWeights:[NaN]});assert.ok(invalid.columnWeights.every(w=>w>0&&Number.isFinite(w)));assert.equal(normalizeTable({cornerRadius:999,opacity:-1}).cornerRadius,120);
});
function fakeContext(){const result={fills:[],texts:[],lines:[],rounds:[]},stack=[];return {result,globalAlpha:1,save(){stack.push({globalAlpha:this.globalAlpha});},restore(){Object.assign(this,stack.pop());},beginPath(){},roundRect(...args){result.rounds.push(args);},rect(){},clip(){},fillRect(x,y,w,h){result.fills.push({x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},moveTo(x,y){this.start={x,y};},lineTo(x,y){this.end={x,y};},setLineDash(value){this.dash=value;},stroke(){result.lines.push({color:this.strokeStyle,width:this.lineWidth,dash:this.dash,start:this.start,end:this.end});},fillText(text,x,y){result.texts.push({text,x,y,color:this.fillStyle,font:this.font});}};}
test('shared renderer clips rounded corners, styles right headers and draws distinct dashed separators',()=>{
 const ctx=fakeContext(),e=normalizeTable({rows:2,columns:3,headerPosition:'right',cornerRadius:26,headerSeparatorWidth:3,headerBorderRole:null,headerBorder:'#ff0000',borderMode:'vertical',lineStyle:'dashed',striped:false,headerFontSize:40,columnWeights:[2,1,1],opacity:80});drawTable(ctx,e,{x:20,y:30,w:800,h:400},normalizeThemes()[0],(_ctx,text)=>[text]);assert.equal(ctx.result.rounds[0][4],26);assert.equal(ctx.result.fills[2].color,normalizeThemes()[0].accent);assert.equal(ctx.result.fills[2].w,200);assert.ok(ctx.result.lines.some(l=>l.color==='#ff0000'&&l.width===3&&l.dash.length===2));assert.match(ctx.result.texts[2].font,/700 40px/);assert.equal(ctx.result.fills[0].alpha,.8);assert.equal(ctx.globalAlpha,1);
 const none=fakeContext();drawTable(none,{...e,borderMode:'none'},{x:0,y:0,w:800,h:400},normalizeThemes()[0],(_ctx,t)=>[t]);assert.equal(none.result.lines.length,0);
});
test('body and header weights load the actual font faces',()=>{
 const s=makeSlide('table-compare'),key=Object.keys(s.elements).find(k=>s.elements[k].type==='table');s.elements[key]=normalizeTable({font:'inter',bodyBold:true,headerPosition:'left',headerBold:false});assert.deepEqual(usedFontFaces([s]).filter(f=>f.id==='inter').map(f=>f.weight),[400,700]);s.elements[key].headerPosition='none';assert.deepEqual(usedFontFaces([s]).filter(f=>f.id==='inter').map(f=>f.weight),[700]);
});
test('Alt target passes through the foreground selection for every object frame and respects z-order/rotation',()=>{
 const bounds={back:{x:0,y:0,w:500,h:300},middle:{x:10,y:10,w:400,h:200},selected:{x:20,y:20,w:200,h:100}};assert.equal(measurementTarget({x:80,y:80},['back','middle','selected'],bounds,['selected']),'middle');assert.equal(measurementTarget({x:80,y:80},['back','middle','selected'],bounds,['selected','middle']),'back');assert.equal(measurementTarget({x:800,y:80},['back','selected'],bounds,['selected']),null);const rotated={x:100,y:100,w:200,h:100,rotation:45},point=rotatePoint({x:110,y:110},rotated);assert.equal(measurementTarget(point,['target'],{target:rotated},[]),'target');assert.equal(measurementTarget(null,['target'],{target:rotated},[]),null);
});
test('four-edge measurements handle generic objects, reverse containment and partial overlaps with signed overflow',()=>{
 const outer={x:100,y:100,w:500,h:400},inner={x:150,y:180,w:200,h:100};const result=measurementMargins(inner,outer);assert.deepEqual([result.margins.left,result.margins.right,result.margins.top,result.margins.bottom],[50,250,80,220]);assert.deepEqual(measurementMargins(outer,inner),result);const partial=measurementMargins({...inner,x:80},outer);assert.equal(partial.margins.left,-20);assert.equal(partial.margins.right,320);assert.equal(measurementMargins({...inner,x:900},outer),null);const same=measurementMargins(outer,outer);assert.equal(same.margins.left,0);assert.equal(same.margins.bottom,0);
});
