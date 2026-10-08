import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeList,listMarker,layoutText } from '../src/textLists.js';
import { wrapLines,text,autoTextBounds,fitText } from '../src/render.js';
import { makeSlide,normalizeSlides,visibleBlocks,blockType,applyLayout } from '../src/model.js';
import { textRoles,textRole,applyTextRole } from '../src/textRoles.js';
import { getTextStyle,usedFontFaces } from '../src/textStyles.js';
import { copyObjects,pasteObjects } from '../src/objectSelection.js';
import { normalizeComponents,captureComponent } from '../src/componentsLibrary.js';
import { normalizeThemes } from '../src/themes.js';
import { projectTheme,normalizeProjectColors } from '../src/projectTheme.js';
import { ProjectHistory } from '../src/history.js';
const ctx={font:'',measureText(t){return {width:t.length*10,actualBoundingBoxAscent:-2,actualBoundingBoxDescent:18};}};
test('roles use Inter titles/subtitles and Montserrat body, preserving custom fonts on reload/layout',()=>{
 const s=makeSlide();assert.equal(s.positions.title.font,'inter');assert.equal(s.positions.body.font,'montserrat');assert.equal(s.positions.code.font,'monospace');
 for(const role of textRoles){applyTextRole(s,'body',role.id);assert.equal(s.positions.body.font,role.font);assert.equal(s.positions.body.size,role.size);assert.equal(getTextStyle(s,'body').weight,role.weight);}
 applyTextRole(s,'body','subtitle');s.positions.body.font='lora';s.positions.body.x=321;
 const restored=normalizeSlides(JSON.parse(JSON.stringify([s])))[0];assert.equal(restored.positions.body.font,'lora');assert.equal(textRole(restored,'body').id,'subtitle');assert.equal(restored.positions.body.x,321);applyLayout(restored,'three');assert.equal(restored.positions.body.textRole,'subtitle');assert.equal(restored.positions.body.font,'lora');
 assert.ok(usedFontFaces([makeSlide()]).some(f=>f.id==='montserrat'&&f.weight===400));
});
test('list markers handle every style, custom symbols and extended numbering safely',()=>{
 for(const [type,expected] of [['bullet','•'],['circle','○'],['square','▪'],['dash','–'],['decimal','4.'],['alpha','d.'],['roman','iv.'],['check','✓'],['custom','→']])assert.equal(listMarker(normalizeList({type,start:4}),0),expected);
 assert.equal(listMarker(normalizeList({type:'alpha',start:27}),0),'aa.');assert.equal(listMarker(normalizeList({type:'roman',start:49}),0),'xlix.');
 const safe=normalizeList({type:'bad',start:-10,indent:999,spacing:-5,color:'red',colorRole:'bad!',symbol:'abcdefghijk'});assert.equal(safe.type,'none');assert.equal(safe.start,1);assert.equal(safe.indent,240);assert.equal(safe.spacing,0);assert.equal(safe.color,null);assert.equal(safe.colorRole,null);assert.equal(safe.symbol.length,8);
});
test('list wrapping has hanging indents and shared fitting accounts for item spacing',()=>{
 const style={list:normalizeList({type:'decimal',indent:40,gap:10,spacing:12})},layout=layoutText(ctx,'first item wraps\nsecond',120,20,1.4,style,wrapLines);
 assert.equal(layout.rows.filter(r=>r.marker).length,2);assert.equal(layout.rows[0].marker,'1.');assert.equal(layout.rows.find(r=>r.marker==='2.').y,layout.rows.filter(r=>!r.marker||r.marker==='1.').length*28+12);
 assert.ok(layout.rows.every(r=>r.x===40));assert.equal(layout.rows[1].marker,'');assert.ok(layout.rows[0].markerX+ctx.measureText('1.').width<layout.rows[0].x);
 const plain=layoutText(ctx,'alpha\nbeta',120,20,1.4,{},wrapLines);assert.equal(plain.height,56);assert.ok(plain.rows.every(r=>r.x===0&&!r.marker));
 const value='alpha\nbeta\ngamma',p={w:180,h:180,size:42,font:'inter',textStyle:{list:{type:'bullet',spacing:40}}};assert.ok(fitText(ctx,value,p,400,1.4)<fitText(ctx,value,{...p,textStyle:{}},400,1.4));
});
test('Canvas renders custom-colored markers and aligns continuation text; auto frames include list indent',()=>{
 const calls=[],g={...ctx,save(){},restore(){},fillText(t,x,y){calls.push({t,x,y,color:this.fillStyle});}},style={weight:400,list:normalizeList({type:'square',spacing:10,indent:40}),markerColor:'#ff0000'};
 text(g,'wrap around here\nnext',100,200,150,20,'#ffffff',400,'Inter',1.4,style);assert.equal(calls[0].t,'▪');assert.equal(calls[0].color,'#ff0000');assert.equal(calls[1].color,'#ffffff');assert.equal(calls[1].x,140);assert.equal(calls[2].x,140);
 const s=makeSlide();s.body='short\nnext';s.positions.body={x:100,y:100,w:400,size:20,font:'montserrat',wrapWidth:400,autoSize:true,textStyle:{list:style.list}};const b=autoTextBounds(ctx,s,'body');assert.ok(b.w>=40+50);assert.ok(b.h>autoTextBounds(ctx,{...s,positions:{...s.positions,body:{...s.positions.body,textStyle:{}}}},'body').h);
});
test('lists and roles survive reload, clipboard and reusable components without aliasing',()=>{
 const s=makeSlide();s.body='one\ntwo';applyTextRole(s,'body','subtitle');s.positions.body.textStyle.list=normalizeList({type:'roman',start:4,colorRole:'secondary',spacing:24});
 const restored=normalizeSlides(JSON.parse(JSON.stringify([s])))[0];assert.equal(restored.positions.body.textStyle.list.type,'roman');assert.equal(restored.positions.body.textRole,'subtitle');
 const dest=makeSlide(),[key]=pasteObjects(dest,copyObjects(restored,['body']));assert.equal(dest.positions[key].textStyle.list.start,4);dest.positions[key].textStyle.list.start=10;assert.equal(restored.positions.body.textStyle.list.start,4);
 const component=normalizeComponents([captureComponent(restored,['body'],{x:0,y:0},'List')])[0];assert.equal(component.items[0].position.textRole,'subtitle');assert.equal(component.items[0].position.textStyle.list.colorRole,'secondary');
});
test('project palette changes stay independent of the base, other projects and snapshot history',()=>{
 const base=normalizeThemes()[0],before=JSON.stringify(base),custom={accent:'#112233',ink:'#ffffff',soft:'#445566'};
 const effective=projectTheme(base,custom);assert.equal(effective.accent,'#112233');assert.equal(effective.swatches.find(c=>c.id==='soft').color,'#445566');assert.equal(JSON.stringify(base),before);assert.equal(projectTheme(base,{}).accent,base.accent);
 effective.swatches[0].color='#000000';assert.equal(JSON.stringify(base),before);
 const snapshot={version:18,projectColors:custom,themeId:base.id,themes:[base]},roundtrip=JSON.parse(JSON.stringify(snapshot));assert.equal(projectTheme(roundtrip.themes[0],roundtrip.projectColors).accent,'#112233');
 const history=new ProjectHistory({...snapshot,projectColors:{}});history.record(snapshot);assert.deepEqual(history.undo().projectColors,{});assert.equal(history.redo().projectColors.accent,'#112233');
 const malformed=JSON.parse('{"__proto__":"#112233","accent":"bad","unknown":"#223344"}');assert.deepEqual(normalizeProjectColors(malformed),{unknown:'#223344'});assert.equal(projectTheme(base,malformed).unknown,undefined);assert.deepEqual(normalizeProjectColors(null),{});
});
