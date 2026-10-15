import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRuns,applyInlineStyle,remapRuns,textSegments} from '../src/richText.js';
import {layoutRichText} from '../src/richTextLayout.js';
import {makeSlide,normalizeSlides,setBlockText} from '../src/model.js';
import {getTextStyle,usedFontFaces} from '../src/textStyles.js';
import {text,autoTextBounds} from '../src/render.js';
import {copyObjects,pasteObjects} from '../src/objectSelection.js';
function context(){const calls=[];return {calls,font:'400 20px Inter',save(){},restore(){},fillRect(){},fillText(value,x,y){calls.push({value,x,y,color:this.fillStyle,font:this.font});},measureText(value){return {width:[...value].length*(this.font.includes('700 ')?15:10),actualBoundingBoxAscent:-2,actualBoundingBoxDescent:18};}};}
test('selection overrides overlap independently, merge adjacent runs and clear only selected styles',()=>{
 const value='Java et Java',first=applyInlineStyle(value,[],0,4,{color:'#ff0000'}),bold=applyInlineStyle(value,first,2,9,{weight:700});
 assert.deepEqual(textSegments(value,bold).map(p=>[p.text,p.style]),[['Ja',{color:'#ff0000'}],['va',{weight:700,color:'#ff0000'}],[' et J',{weight:700}],['ava',{}]]);
 const cleared=applyInlineStyle(value,bold,1,3,null);assert.deepEqual(textSegments(value,cleared,1,3)[0].style,{});assert.equal(cleared[0].style.color,'#ff0000');
 assert.deepEqual(applyInlineStyle(value,first,0,4,{color:undefined,colorRole:undefined}),[]);
 assert.deepEqual(normalizeRuns([{start:-10,end:100,style:{color:'bad',italic:true,script:'bad'}}],value),[{start:0,end:12,style:{italic:true}}]);
});
test('editing preserves styles around insertions, replacements, deletion and repeated words',()=>{
 const before='Java et Java',runs=applyInlineStyle(before,[],8,12,{colorRole:'accent',italic:true});
 const next='Premier Java et Java';assert.deepEqual(remapRuns(before,next,runs),[{start:16,end:20,style:{italic:true,colorRole:'accent'}}]);
 assert.deepEqual(remapRuns(before,'Java et Kotlin',runs),[{start:8,end:14,style:{italic:true,colorRole:'accent'}}]);
 assert.deepEqual(remapRuns(before,'Java et ',runs),[]);
 const middle=remapRuns('abc','aXYZbc',applyInlineStyle('abc',[],0,3,{weight:700}));assert.deepEqual(middle,[{start:0,end:6,style:{weight:700}}]);
});
test('rich wrapping measures bold passages and preserves exact source offsets across repeated lines',()=>{
 const ctx=context(),value='Java Java\nJava Java',runs=applyInlineStyle(value,[],10,14,{weight:700}),style={weight:400,align:'left'};
 const layout=layoutRichText(ctx,value,100,20,1.4,style,'Inter',runs);
 assert.deepEqual(layout.rows.map(r=>[r.text,r.start]),[['Java Java',0],['Java',10],['Java',15]]);
 const emoji='👩‍💻👩‍💻',small=layoutRichText(ctx,emoji,10,20,1.4,style,'Inter',applyInlineStyle(emoji,[],0,emoji.length,{weight:700}));assert.deepEqual(small.rows.map(r=>r.text),['👩‍💻','👩‍💻']);
});
test('canvas paints theme colors, marks and typewriter segments with stable layout',()=>{
 const ctx=context(),value='Java clair',runs=applyInlineStyle(value,[],0,4,{colorRole:'accent',weight:700,underline:true}),style={weight:400,runs,richTheme:{ink:'#ffffff',accent:'#ff0000'},verticalAlign:'middle'};
 text(ctx,value,0,0,300,20,'#ffffff',400,'Inter',1.4,style,100);assert.equal(ctx.calls[0].value,'Java');assert.equal(ctx.calls[0].color,'#ff0000');assert.match(ctx.calls[0].font,/700 20px/);assert.equal(ctx.calls[1].x,60);assert.equal(ctx.calls[1].color,'#ffffff');
 const full=ctx.calls[0];ctx.calls.length=0;text(ctx,value,0,0,300,20,'#ffffff',400,'Inter',1.4,style,100,{count:2,cursor:''});assert.equal(ctx.calls[0].value,'Ja');assert.equal(ctx.calls[0].x,full.x);assert.equal(ctx.calls[0].y,full.y);
});
test('ranges survive save/load and component copying and request all styled font faces',()=>{
 const s=makeSlide();s.body='Java et code';s.positions.body.textRuns=applyInlineStyle(s.body,[],0,4,{weight:700,italic:true,color:'#ff0000'});
 const restored=normalizeSlides(JSON.parse(JSON.stringify([s])))[0];assert.deepEqual(restored.positions.body.textRuns,s.positions.body.textRuns);
 assert.ok(usedFontFaces([restored]).some(f=>f.id==='montserrat'&&f.weight===700&&f.italic));
 const data=copyObjects(restored,['body']),target=makeSlide(),keys=pasteObjects(target,data);assert.deepEqual(target.positions[keys[0]].textRuns,s.positions.body.textRuns);
 const ctx=context();s.positions.body.autoSize=true;s.positions.body.wrapWidth=100;assert.ok(autoTextBounds(ctx,s,'body').h>20);assert.equal(s.positions.body.textRuns.length,1);
});

test('shared text edits retain styled ranges and rich alignment supports lists and justification',()=>{
 const s=makeSlide();s.body='Java Java';s.positions.body.textRuns=applyInlineStyle(s.body,[],5,9,{italic:true});setBlockText(s,'body','Début Java Java');assert.equal(s.positions.body.textRuns[0].start,11);
 const ctx=context(),value='a b c d',runs=applyInlineStyle(value,[],0,1,{weight:700});
 const justified=layoutRichText(ctx,value,55,20,1.4,{weight:400,align:'justify'},'Inter',runs);assert.equal(justified.rows[0].richWords.length,2);assert.equal(justified.rows[0].wordGap,30);
 const centered=layoutRichText(ctx,'a',100,20,1.4,{weight:400,align:'center'},'Inter',runs);assert.equal(centered.rows[0].x,42.5);
 const list=layoutRichText(ctx,'abc def',90,20,1.4,{weight:400,list:{type:'bullet',indent:30,gap:10,spacing:5}},'Inter',runs);assert.equal(list.rows[0].marker,'•');assert.equal(list.rows[1].marker,'');assert.equal(list.rows[1].x,30);
});
