import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toSuperscript,powerText,replaceSelection} from '../src/powers.js';
import {renderNotes,normalizeNotes,MAX_NOTES} from '../src/presentationNotes.js';
import {makeSlide,normalizeSlide} from '../src/model.js';
import {copyObjects,pasteObjects} from '../src/objectSelection.js';
import {renderSlide} from '../src/render.js';
import {appearanceRows,setAppearance} from '../src/appearances.js';
import {groupSelection} from '../src/selection.js';
test('powers support multidigit, negative and parenthesized exponents without changing ordinary text',()=>{
 assert.equal(powerText('2','23'),'2²³');assert.equal(powerText('10','-12'),'10⁻¹²');assert.equal(toSuperscript('(n+1)'),'⁽ⁿ⁺¹⁾');assert.equal(toSuperscript('²³'),'²³');assert.equal(toSuperscript('hello'),null);assert.equal(powerText('','23'),null);
 assert.deepEqual(replaceSelection('La valeur 23 ici',10,12,'²³'),{text:'La valeur ²³ ici',cursor:12});assert.equal(replaceSelection('abc',1,1,'123',5),null);
});
test('powers remain plain portable text in projects, copies and components',()=>{
 const s=makeSlide('title');s.title=powerText('2','23');const normalized=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.equal(normalized.title,'2²³');const target=makeSlide();const keys=pasteObjects(target,copyObjects(normalized,['title']));assert.equal(target.elements[keys[0]].text,'2²³');
});
test('Markdown notes render headings, multiline lists, emphasis, code, tables and safe links',()=>{
 const html=renderNotes('## Points\n\n- **Important**\n- *À expliquer*\n\n`code`\nligne 2\n\n```java\nSystem.out.println(2);\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[Docs](https://example.com)');
 for(const fragment of ['<h2>Points</h2>','<strong>Important</strong>','<em>À expliquer</em>','<code>code</code>','<br>','<pre><code class="language-java">','<table>','rel="noopener noreferrer"','target="_blank"'])assert.ok(html.includes(fragment),fragment);
});
test('notes escape HTML and refuse active URLs and external image loads',()=>{
 const html=renderNotes('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n[x](data:text/html,test)\n![tracking](https://example.com/pixel.png)');
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('href="javascript:'));assert.ok(!html.includes('href="data:'));assert.ok(html.includes('&lt;script&gt;'));assert.equal(normalizeNotes({text:'oops'}),'');assert.equal(normalizeNotes('x'.repeat(MAX_NOTES+1)).length,MAX_NOTES);
});
test('notes are slide-specific, survive old/new imports and are excluded from Canvas rendering',()=>{
 const s=makeSlide('title');s.notes='## NOTE PRIVÉE\n- **Un point**';const restored=normalizeSlide(JSON.parse(JSON.stringify(s)));assert.equal(restored.notes,s.notes);assert.equal(normalizeSlide({layout:'title',title:'ancien',body:'',code:''}).notes,'');
 const copy=normalizeSlide(JSON.parse(JSON.stringify(s)));copy.notes='autres';assert.equal(s.notes,'## NOTE PRIVÉE\n- **Un point**');
 const painted=[],ctx=new Proxy({font:'',globalAlpha:1,measureText(t){return {width:t.length*8};},fillText(t){painted.push(t);},createLinearGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:()=>{};}});renderSlide(ctx,s,{ink:'#fff',accent:'#000',secondary:'#111'},{transparent:true});assert.ok(painted.length);assert.ok(painted.every(t=>!t.includes('NOTE PRIVÉE')));
});
test('compact appearance editing keeps group steps and entry/exit settings independent',()=>{
 const s=makeSlide();groupSelection(s,['title','body']);setAppearance(s,['title'],'order',2);const row=appearanceRows(s)[0];assert.equal(row.keys.length,2);assert.equal(row.order,2);setAppearance(s,row.keys,'animation','auto');setAppearance(s,row.keys,'exitAnimation','down');assert.equal(s.fragments.body.animation,'auto');assert.equal(s.fragments.body.exitAnimation,'down');assert.equal(s.fragments.code.order,0);setAppearance(s,appearanceRows(s).flatMap(r=>r.keys),'animation','auto');assert.equal(s.fragments.title.order,2);
});
