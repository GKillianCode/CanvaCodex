import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSlide, normalizeSlides, neighbor, nextFreeGrid, fragmentOrders, memorySlides, transitionDirection, presets, visibleBlocks, applyLayout, reorderSlides, blockText, setBlockText } from '../src/model.js';
import { javaLines } from '../src/code.js';
import { formatJava } from '../src/formatter.js';

test('old projects retain their text and positions and gain a collision-free grid', () => {
  const old = makeSlide(); old.positions.title.x = 487;
  delete old.grid; delete old.fragments;
  const migrated = normalizeSlides([old, { ...old, id: 'second' }]);
  assert.equal(migrated[0].title, old.title);
  assert.equal(migrated[0].positions.title.x, 487);
  assert.deepEqual(migrated.map(s => s.grid), [{ x: 0, y: 0 }, { x: 1, y: 0 }]);
  assert.deepEqual(fragmentOrders(migrated[0]), []);
  assert.throws(() => normalizeSlides([{ ...old, title: 42 }]));
});

test('all four directions choose the nearest slide on the matching axis', () => {
  const slides = [[0, 0], [2, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].map(([x, y]) => makeSlide('split', { x, y }));
  assert.equal(neighbor(slides, 0, 'right'), 2);
  assert.equal(neighbor(slides, 0, 'left'), 3);
  assert.equal(neighbor(slides, 0, 'down'), 4);
  assert.equal(neighbor(slides, 0, 'up'), 5);
  assert.deepEqual(nextFreeGrid(slides, slides[0].grid, 'right'), { x: 3, y: 0 });
  assert.equal(neighbor(slides, 5, 'left'), -1);
});

test('fragment ordering groups equal steps and ignores hidden layout blocks', () => {
  const s = makeSlide();
  s.fragments.title.order = 0; s.fragments.body.order = 5; s.fragments.code.order = 5;
  assert.deepEqual(fragmentOrders(s), [5]);
  s.fragments.code.order = 2;
  assert.deepEqual(fragmentOrders(s), [2, 5]);
  applyLayout(s,'title');
  assert.deepEqual(fragmentOrders(s), [5]);
});

test('memory sequence descends, uses decimal units, and explains binary units separately', () => {
  const s = memorySlides({ x: 4, y: -1 });
  assert.deepEqual(s.map(s => s.grid), [{ x: 4, y: -1 }, { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }]);
  assert.match(s[0].body, /1 Go = 1 000 Mo/);
  assert.match(s[2].body, /1 Ko = 1 000 octets/);
  assert.match(s[3].body, /1 octet = 8 bits/);
  assert.match(s[3].body, /GiB, MiB et KiB/);
  assert.deepEqual(transitionDirection(s[0], s[1]), { x: 0, y: 1 });
  assert.deepEqual(transitionDirection(s[1], s[0]), { x: 0, y: -1 });
});

test('Java tokenization distinguishes strings, keywords, numbers, and multiline comments', () => {
  const code = '/* class\ncomment */\npublic class Demo { String s = "class 42"; int n = 42; }';
  const lines = javaLines(code), tokens = lines.flat();
  assert.equal(lines.length, 3);
  assert.ok(lines[1].some(t => t.type === 'comment'));
  assert.ok(tokens.some(t => t.type === 'keyword' && t.text === 'public'));
  assert.ok(tokens.some(t => t.type === 'string' && t.text === '"class 42"'));
  assert.ok(tokens.some(t => t.type === 'number' && t.text === '42'));
});

test('Java formatter indents classes and snippets but preserves incomplete pasted input', async () => {
  const whole = await formatJava('public class Demo{public void run(){int n=42;System.out.println("{ text }");}}');
  assert.equal(whole.ok, true);
  assert.match(whole.code, /\n {4}public void run\(\) \{/);
  assert.match(whole.code, /\n {8}int n = 42;/);
  assert.match(whole.code, /"\{ text \}"/);
  const snippet = await formatJava('int n=42;System.out.println(n);');
  assert.equal(snippet.code, 'int n = 42;\nSystem.out.println(n);');
  const incomplete = 'public class Demo {\nint value =';
  assert.deepEqual(await formatJava(incomplete), { ok: false, code: incomplete });
});


test('twenty templates offer distinct compositions with independent text and image blocks', () => {
  assert.equal(presets.length,20);
  const signatures=new Set();
  for(const p of presets){ const s=makeSlide(p.id); const keys=visibleBlocks(s); assert.ok(keys.length>=2); for(const k of keys){assert.ok(s.positions[k]);assert.ok(s.fragments[k]);} signatures.add(JSON.stringify(keys.map(k=>[k,s.positions[k]]))); }
  assert.equal(signatures.size,20);
  const s=makeSlide('three');assert.deepEqual(fragmentOrders(s),[1,2,3]);setBlockText(s,'text1','Un texte indépendant.');assert.equal(blockText(s,'text1'),'Un texte indépendant.');
});

test('custom text, image, placement, and departure survive export migration', () => {
 const s=makeSlide('image-right');s.elements.image1.src='data:image/png;base64,aGVsbG8=';s.elements.textCustom={type:'text',name:'Détail',text:'Mémoire'};s.positions.textCustom={x:200,y:700,w:1200,size:35};s.fragments.textCustom={order:3,animation:'zoom'};s.exitDirection='down';s.grid={x:-1200,y:340};
 const copy=normalizeSlides([JSON.parse(JSON.stringify(s))])[0];assert.equal(copy.elements.image1.src,s.elements.image1.src);assert.equal(blockText(copy,'textCustom'),'Mémoire');assert.deepEqual(copy.grid,s.grid);assert.deepEqual(copy.fragments.textCustom,s.fragments.textCustom);assert.equal(copy.exitDirection,'down');assert.equal(copy.positions.image1.h,s.positions.image1.h);
 copy.elements.image1.src='https://example.com/image.png';assert.equal(normalizeSlides([copy])[0].elements.image1.src,'');
 delete s.elements.textCustom;delete s.elements.image1;s.blockKeys=s.blockKeys.filter(k=>k!=='image1');const deleted=normalizeSlides([s])[0];assert.equal(deleted.elements.image1,undefined);assert.ok(!visibleBlocks(deleted).includes('image1'));
});

test('reordering changes the start without moving spatial positions or mutating the source', () => {
 const s=[makeSlide('title'),makeSlide('three',{x:0,y:1}),makeSlide('code',{x:1,y:1})];const moved=reorderSlides(s,1,0);assert.equal(moved[0].id,s[1].id);assert.equal(s[0].layout,'title');assert.deepEqual(moved[0].grid,{x:0,y:1});assert.deepEqual(reorderSlides(s,0,2).map(s=>s.layout),['three','code','title']);
});

test('explicit departure describes the outgoing slide and overrides automatic geometry', () => {
 const a=makeSlide(),b=makeSlide('title',{x:0,y:1});assert.deepEqual(transitionDirection(a,b),{x:0,y:1});
 for(const [direction,vector] of Object.entries({left:{x:1,y:0},right:{x:-1,y:0},up:{x:0,y:1},down:{x:0,y:-1}})){a.exitDirection=direction;const result=transitionDirection(a,b);assert.equal(result.x||0,vector.x);assert.equal(result.y||0,vector.y);}
});


test('changing a composition preserves image sources without leaving old template blocks visible', () => {
 const s=makeSlide('image-right');s.elements.image1.src='data:image/png;base64,aGVsbG8=';s.elements.textOwn={type:'text',custom:true,text:'À conserver',name:'Détail'};s.positions.textOwn={x:100,y:800,w:1200,size:30};s.fragments.textOwn={order:4,animation:'fade'};
 applyLayout(s,'three');assert.ok(!visibleBlocks(s).includes('image1'));assert.ok(visibleBlocks(s).includes('textOwn'));assert.ok(s.elements.image1.src);
 applyLayout(s,'image-right');assert.ok(visibleBlocks(s).includes('image1'));assert.equal(s.elements.image1.src,'data:image/png;base64,aGVsbG8=');
});


test('QHD defaults and custom 16:9 formats reject malformed dimensions', async()=>{
 const {normalizeResolution}=await import('../src/model.js');assert.deepEqual(normalizeResolution(),{width:2560,height:1440});assert.deepEqual(normalizeResolution({width:3840,height:2160}),{width:3840,height:2160});for(const raw of [{width:1920,height:1200},{width:4000,height:2250},{width:641,height:360.5625},{width:'1920',height:1080}])assert.deepEqual(normalizeResolution(raw),{width:2560,height:1440});
});
test('laser release stops new points while the old trail fades, without joining strokes',async()=>{
 const {LaserTrail}=await import('../src/laser.js');const t=new LaserTrail(900);t.append({x:1,y:1},0);assert.equal(t.points.length,0);t.begin({x:0,y:0},0,'red',12);t.append({x:10,y:10},100);t.end();t.append({x:30,y:30},200);assert.equal(t.points.length,2);assert.equal(t.active,false);t.begin({x:40,y:40},300,'blue',8);assert.notEqual(t.points[1].stroke,t.points[2].stroke);t.end();assert.equal(t.prune(950),true);assert.equal(t.points.length,2);assert.equal(t.prune(1200),false);t.begin({x:0,y:0},1300,'red',10);for(let i=0;i<1000;i++)t.append({x:i,y:i},1300+i);assert.equal(t.points.length,600);t.clear();assert.equal(t.points.length,0);
});
test('all twenty art-directed layouts keep their reserved regions within the design canvas',async()=>{
 const {themes}=await import('../src/model.js');assert.equal(themes.length,10);assert.equal(new Set(themes.map(t=>t.id)).size,10);for(const p of presets){const s=makeSlide(p.id);assert.equal(s.designVersion,2);for(const k of visibleBlocks(s)){const b=s.positions[k];assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1920&&b.y+(b.h||0)<=1080,`${p.id}/${k}`);}}
});
