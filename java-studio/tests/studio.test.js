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


test('thirty templates offer distinct compositions with independent text and image blocks', () => {
  assert.equal(presets.length,30);
  const signatures=new Set();
  for(const p of presets){ const s=makeSlide(p.id); const keys=visibleBlocks(s); assert.ok(keys.length>=2); for(const k of keys){assert.ok(s.positions[k]);assert.ok(s.fragments[k]);} signatures.add(JSON.stringify(keys.map(k=>[k,s.positions[k]]))); }
  assert.equal(signatures.size,30);
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
test('laser samples densely, ignores released moves and expires independently between strokes',async()=>{
 const {LaserTrail}=await import('../src/laser.js');const t=new LaserTrail(900);t.append({x:1,y:1},0);assert.equal(t.points.length,0);t.begin({x:0,y:0},0,'#ff0000',12);t.append({x:100,y:0},100);assert.ok(t.points.length>30);for(let i=1;i<t.points.length;i++)assert.ok(t.points[i].x-t.points[i-1].x<=3);const count=t.points.length;t.end();t.append({x:200,y:0},200);assert.equal(t.points.length,count);assert.equal(t.active,false);const oldStroke=t.points.at(-1).stroke;t.begin({x:400,y:400},300,'#0000ff',8);assert.notEqual(oldStroke,t.points.at(-1).stroke);t.end();assert.equal(t.prune(950),true);assert.ok(t.points.every(p=>p.now>50));assert.equal(t.prune(1200),false);t.begin({x:0,y:0},1300,'#ff0000',10);for(let i=0;i<3000;i++)t.append({x:i,y:i},1300+i);assert.equal(t.points.length,2400);t.clear();assert.equal(t.points.length,0);
});
test('all thirty editable layouts keep their reserved regions within the design canvas',async()=>{
 const {themes}=await import('../src/model.js');assert.equal(themes.length,10);assert.equal(new Set(themes.map(t=>t.id)).size,10);for(const p of presets){const s=makeSlide(p.id);assert.equal(s.designVersion,3);for(const k of visibleBlocks(s)){const b=s.positions[k];assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=1920&&b.y+(b.h||0)<=1080,`${p.id}/${k}`);}}
});

test('element duplication keeps independent content, styling, image source and fragment settings',async()=>{
 const {duplicateElement}=await import('../src/editor.js');for(const source of ['title','body','code']){const s=makeSlide();s.codeTitle='Hello.java';s.fragments[source]={order:2,animation:'up'};const key=duplicateElement(s,source);assert.notEqual(key,source);assert.equal(blockText(s,key),blockText(s,source));assert.deepEqual(s.fragments[key],s.fragments[source]);setBlockText(s,key,'Copie modifiée');assert.notEqual(blockText(s,key),blockText(s,source));const migrated=normalizeSlides([s])[0];assert.equal(blockText(migrated,key),'Copie modifiée');if(source==='code')assert.equal(migrated.elements[key].caption,'Hello.java');if(source==='title')assert.equal(migrated.elements[key].weight,700);}
 const s=makeSlide('image-right');s.elements.image1.src='data:image/png;base64,aGVsbG8=';const key=duplicateElement(s,'image1');s.elements[key].fit='cover';assert.equal(s.elements.image1.fit,'contain');assert.equal(normalizeSlides([s])[0].elements[key].src,s.elements.image1.src);
});
test('arrow movements use one output pixel and resize corners retain the opposite anchor',async()=>{
 const {nudgePosition,resizePosition}=await import('../src/editor.js');const p={x:100,y:200,w:500,h:300,size:40};assert.equal(nudgePosition(p,1,0,2560).x,100.75);assert.equal(nudgePosition(p,0,-10,2560).y,192.5);for(const corner of ['nw','ne','sw','se']){const b=resizePosition(p,corner,20,30,'image');assert.equal(b.size,40);if(corner.includes('w'))assert.equal(b.x+b.w,p.x+p.w);else assert.equal(b.x,p.x);if(corner.includes('n'))assert.equal(b.y+b.h,p.y+p.h);else assert.equal(b.y,p.y);}const tiny=resizePosition(p,'se',-10000,-10000,'code');assert.equal(tiny.w,240);assert.equal(tiny.h,180);const big=resizePosition(p,'se',10000,10000,'image');assert.ok(big.x+big.w<=1920&&big.y+big.h<=1080);
});
test('optional code captions and duplicated code survive legacy and current project migrations',()=>{
 const s=makeSlide();s.codeTitle='HelloWorld.java';assert.equal(normalizeSlides([s])[0].codeTitle,s.codeTitle);delete s.codeTitle;assert.equal(normalizeSlides([s])[0].codeTitle,'');
});

test('laser draws one smooth ribbon per stroke without circular sample markers, including closed loops',async()=>{
 const {LaserTrail}=await import('../src/laser.js');const t=new LaserTrail();t.begin({x:0,y:0},0,'#ff0000',12);t.append({x:60,y:30},100);t.append({x:0,y:0},200);t.end();t.begin({x:100,y:100},300,'#ff0000',12);t.append({x:120,y:120},400);t.end();let fills=0;const ctx={save(){},restore(){},beginPath(){},moveTo(){},quadraticCurveTo(){},closePath(){},fill(){fills++},createLinearGradient(x,y,a,b){assert.ok(x!==a||y!==b);return {addColorStop(n,color){assert.match(color,/^#[0-9a-f]{8}$/i)}}}};t.draw(ctx,450);assert.equal(fills,2);
});

test('editable themes validate unique identities, colors and portable custom palettes',async()=>{
 const {normalizeThemes,themeDraft}=await import('../src/themes.js');const {themes}=await import('../src/model.js');const draft=themeDraft(themes[0]);draft.name='Java Émeraude';draft.accent='#00ffcc';const palette=normalizeThemes([...themes,draft]);assert.equal(palette.length,11);assert.equal(palette.at(-1).accent,'#00ffcc');assert.deepEqual(normalizeThemes(JSON.parse(JSON.stringify(palette))),palette);assert.equal(normalizeThemes([draft,draft]).length,1);assert.equal(normalizeThemes([{...draft,accent:'red'}]).length,10);assert.notEqual(draft.id,themes[0].id);draft.name='Changed';assert.equal(themes[0].name,'Terminal');
});
test('deleting all visible elements persists an empty slide without reviving template blocks',()=>{
 const s=makeSlide('image-right');s.blockKeys=[];s.elements={};s.positions={};s.fragments={};assert.deepEqual(visibleBlocks(normalizeSlides([s])[0]),[]);
});

test('spatial route follows 4 → 3 → 1 → 2 and keeps identity and content',async()=>{
 const {spatialRoute}=await import('../src/route.js');const slides=[makeSlide('title',{x:1,y:1}),makeSlide('title',{x:1,y:2}),makeSlide('title',{x:1,y:0}),makeSlide('title',{x:0,y:0})];slides.forEach((s,n)=>s.title='Diapo '+(n+1));const route=spatialRoute(slides);assert.deepEqual(route.map(s=>s.title),['Diapo 4','Diapo 3','Diapo 1','Diapo 2']);assert.deepEqual(route.slice(0,-1).map((s,n)=>transitionDirection(s,route[n+1])),[{x:1,y:0},{x:0,y:1},{x:0,y:1}]);assert.equal(slides[0].title,'Diapo 1');assert.equal(route[0],slides[3]);
});
test('custom starts and traced routes support reverse directions, duplicates and missing ids',async()=>{
 const {spatialRoute,tracedRoute,connectRoute}=await import('../src/route.js');const slides=[makeSlide('title',{x:1,y:1}),makeSlide('title',{x:0,y:1}),makeSlide('title',{x:2,y:1}),makeSlide('title',{x:2,y:2})];const ids=slides.map(s=>s.id);assert.deepEqual(spatialRoute(slides,ids[3]).map(s=>s.id),[ids[3],ids[2],ids[0],ids[1]]);const traced=tracedRoute(slides,[ids[3],ids[2],ids[3],'missing',ids[0],ids[1]]);assert.deepEqual(traced.map(s=>s.id),[ids[3],ids[2],ids[0],ids[1]]);assert.deepEqual(transitionDirection(traced[0],traced[1]),{x:0,y:-1});assert.deepEqual(transitionDirection(traced[1],traced[2]),{x:-1,y:0});const linked=connectRoute(slides,ids[3],ids[0]);assert.equal(linked.at(-1).id,ids[0]);assert.equal(new Set(linked.map(s=>s.id)).size,4);assert.deepEqual(connectRoute(slides,ids[0],ids[0]),slides);assert.equal(tracedRoute(slides,[ids[2]]).length,4);assert.deepEqual(normalizeSlides(JSON.parse(JSON.stringify(traced))).map(s=>s.id),traced.map(s=>s.id));
});
test('connector geometry uses facing edges and follows transition direction',async()=>{
 const {routePath}=await import('../src/route.js');assert.match(routePath({x:0,y:0},{x:300,y:0}),/^M 240 85 C/);assert.match(routePath({x:300,y:215},{x:300,y:0}),/^M 420 215 C/);assert.match(routePath({x:0,y:0},{x:900,y:860},{x:0,y:1}),/^M 120 192 C/);
});

test('shape catalog and style sanitization support twenty deformable shapes', async () => {
 const {shapes,normalizeShape,shapePath}=await import('../src/shapes.js');
 assert.equal(shapes.length,20);assert.equal(new Set(shapes.map(s=>s.id)).size,20);
 for(const spec of shapes){assert.ok(spec.w>0&&spec.h>0);assert.match(shapePath({shape:spec.id}),/^M/);}
 const s=normalizeShape({shape:'bad',fill:'invalid',strokeWidth:999,opacity:-10,points:99,innerRatio:2});
 assert.equal(s.shape,'rect');assert.equal(s.fill,'#35ff91');assert.equal(s.strokeWidth,60);assert.equal(s.opacity,0);assert.equal(s.points,12);assert.equal(s.innerRatio,.8);
 assert.notEqual(shapePath({shape:'line',direction:'vertical'}),shapePath({shape:'line',direction:'horizontal'}));
});

test('custom shape geometry and styles survive save/import and independent duplication', async () => {
 const {normalizeShape}=await import('../src/shapes.js');const {duplicateElement}=await import('../src/editor.js');
 const s=makeSlide();s.elements.shape123=normalizeShape({shape:'star',fill:'#ff0066',stroke:'#ffffff',outlined:true,opacity:65,points:7,innerRatio:.3});s.positions.shape123={x:100,y:120,w:8,h:8,size:38};s.fragments.shape123={order:2,animation:'zoom'};
 const copy=duplicateElement(s,'shape123');s.elements[copy].fill='#00ffcc';
 const restored=normalizeSlides(JSON.parse(JSON.stringify([s])))[0];
 assert.equal(restored.elements.shape123.fill,'#ff0066');assert.equal(restored.elements[copy].fill,'#00ffcc');assert.equal(restored.elements.shape123.points,7);assert.equal(restored.positions.shape123.h,8);assert.equal(restored.positions.shape123.w,8);assert.deepEqual(restored.fragments[copy],{order:2,animation:'zoom'});assert.ok(visibleBlocks(restored).includes(copy));
});

test('all eight resize handles anchor opposite edges and side handles alter one axis',async()=>{
 const {resizePosition}=await import('../src/editor.js');const p={x:100,y:200,w:500,h:300,size:40};
 for(const type of ['text','code','image','shape'])for(const handle of ['nw','n','ne','w','e','sw','s','se']){
 const b=resizePosition(p,handle,20,30,type);
 if(handle.includes('w'))assert.equal(b.x+b.w,p.x+p.w);else assert.equal(b.x,p.x);
 if(handle.includes('n'))assert.equal(b.y+b.h,p.y+p.h);else assert.equal(b.y,p.y);
 if(['n','s'].includes(handle)){assert.equal(b.w,p.w);assert.equal(b.size,p.size);}
 if(['e','w'].includes(handle)){assert.equal(b.h,p.h);assert.equal(b.size,p.size);}
 }
 const tiny=resizePosition(p,'se',-10000,-10000,'shape');assert.equal(tiny.w,8);assert.equal(tiny.h,8);
 const big=resizePosition(p,'nw',-10000,-10000,'shape');assert.equal(big.x,0);assert.equal(big.y,0);assert.equal(big.x+big.w,600);assert.equal(big.y+big.h,500);
});

test('vector shape rendering keeps stroke thickness independent of deformation',async()=>{
 const {drawShape,normalizeShape}=await import('../src/shapes.js');const previousPath=globalThis.Path2D,previousMatrix=globalThis.DOMMatrix;let matrix,strokeWidth;
 globalThis.Path2D=class{addPath(path,transform){matrix=transform.values;}};globalThis.DOMMatrix=class{constructor(values){this.values=values;}};
 const ctx={globalAlpha:1,save(){},restore(){},fill(){},stroke(){strokeWidth=this.lineWidth;},setLineDash(d){this.dashes=d;}};
 try{drawShape(ctx,normalizeShape({shape:'rect',outlined:true,strokeWidth:6,dashed:true}),{x:100,y:200,w:600,h:120});assert.deepEqual(matrix,[5.94,0,0,1.14,103,203]);assert.equal(strokeWidth,6);assert.deepEqual(ctx.dashes,[18,12]);}
 finally{globalThis.Path2D=previousPath;globalThis.DOMMatrix=previousMatrix;}
});

test('rotation follows pointer around center and Shift snaps to multiples of 45 degrees',async()=>{
 const {rotationFromPointer,normalizeAngle}=await import('../src/editor.js');const b={x:100,y:200,w:400,h:200,rotation:0},start={x:500,y:300};
 assert.equal(rotationFromPointer(b,start,{x:300,y:500}),90);assert.equal(rotationFromPointer(b,start,{x:300,y:100}),270);
 const point={x:300+200*Math.cos(23*Math.PI/180),y:300+200*Math.sin(23*Math.PI/180)};assert.ok(Math.abs(rotationFromPointer(b,start,point)-23)<1e-9);assert.equal(rotationFromPointer(b,start,point,true),45);
 assert.equal(rotationFromPointer({...b,rotation:45},start,{x:300,y:500},true),135);assert.equal(normalizeAngle(-45),315);assert.equal(normalizeAngle(NaN),0);
});

test('rotated resize keeps opposite corner fixed and preserves rotation',async()=>{
 const {resizeRotated,rotatePoint}=await import('../src/editor.js');const b={x:600,y:400,w:300,h:200,size:40,rotation:45};
 for(const handle of ['nw','ne','sw','se']){const opposite={x:handle.includes('w')?b.x+b.w:b.x,y:handle.includes('n')?b.y+b.h:b.y},anchor=rotatePoint(opposite,b),r=resizeRotated(b,handle,20,30,'shape'),after=rotatePoint({x:handle.includes('w')?r.x+r.w:r.x,y:handle.includes('n')?r.y+r.h:r.y},r);assert.ok(Math.abs(anchor.x-after.x)<1e-8);assert.ok(Math.abs(anchor.y-after.y)<1e-8);assert.equal(r.rotation,45);}
 const r=resizeRotated(b,'e',20,20,'shape');assert.equal(r.h,b.h);assert.equal(r.size,b.size);
 const p={x:750,y:420},inverse=rotatePoint(rotatePoint(p,b),b,-45);assert.ok(Math.hypot(inverse.x-p.x,inverse.y-p.y)<1e-8);
});

test('rotation is normalized during import and retained in independent copies',async()=>{
 const {duplicateElement}=await import('../src/editor.js');const s=makeSlide();s.positions.title.rotation=-45;s.positions.body.rotation='invalid';const restored=normalizeSlides([s])[0];assert.equal(restored.positions.title.rotation,315);assert.equal(restored.positions.body.rotation,0);const key=duplicateElement(restored,'title');assert.equal(restored.positions[key].rotation,315);restored.positions[key].rotation=90;assert.equal(restored.positions.title.rotation,315);assert.equal(normalizeSlides(JSON.parse(JSON.stringify([restored])))[0].positions[key].rotation,90);
});

test('font catalog sanitizes selections and limits Java to monospace families',async()=>{
 const {fonts,normalizeFont,fontCss}=await import('../src/fonts.js');assert.equal(fonts.filter(f=>!f.local).length,8);assert.equal(new Set(fonts.map(f=>f.id)).size,fonts.length);assert.equal(normalizeFont('untrusted font'), 'inter');assert.equal(normalizeFont('lora','code'),'monospace');assert.equal(normalizeFont('jetbrains-mono','code'),'jetbrains-mono');assert.equal(fontCss('lora'),'"Lora", serif');
});

test('font selections survive migration, JSON roundtrip and independent duplication',async()=>{
 const {duplicateElement}=await import('../src/editor.js');const {usedFonts}=await import('../src/fonts.js');const s=makeSlide();s.positions.title.font='lora';s.positions.code.font='jetbrains-mono';s.positions.body.font='invalid';const normalized=normalizeSlides([s])[0];assert.equal(normalized.positions.title.font,'lora');assert.equal(normalized.positions.body.font,'inter');const key=duplicateElement(normalized,'title');assert.equal(normalized.positions[key].font,'lora');normalized.positions[key].font='inter';const restored=normalizeSlides(JSON.parse(JSON.stringify([normalized])))[0];assert.equal(restored.positions[key].font,'inter');assert.equal(restored.positions.title.font,'lora');assert.equal(restored.positions.code.font,'jetbrains-mono');assert.ok(usedFonts([restored]).includes('jetbrains-mono'));assert.ok(usedFonts([restored]).includes('inter'));
});

test('text fitting and code bounds measure the selected font',async()=>{
 const {fitText,blockBounds}=await import('../src/render.js');let family;const ctx={font:'',measureText(value){family=this.font;return {width:value.length*(this.font.includes('JetBrains Mono')?22:10)};}};
 fitText(ctx,'Java é à',{w:300,h:50,size:32,font:'lora'},700,1.12);assert.match(ctx.font,/Lora/);
 const s=makeSlide();s.code='a'.repeat(40);s.positions.code={x:100,y:100,w:600,h:500,size:32,font:'jetbrains-mono'};const b=blockBounds(ctx,s,'code');assert.match(family,/JetBrains Mono/);assert.ok(b.size<32);assert.equal(Math.round(b.size*100)/100,17.82);
});

test('font loader awaits requested faces, shares loads and retries failures',async()=>{
 const {createFontLoader}=await import('../src/fontLoader.js');let calls=0,resolveLoads;const gate=new Promise(resolve=>{resolveLoads=resolve;});const load=createFontLoader(()=>({load:async()=>{calls++;await gate;return [{}];}}));const s=makeSlide();s.positions.title.font='inter';s.positions.body.font='inter';let ready=false;const first=load([s]).then(()=>{ready=true;});const second=load([s]);await Promise.resolve();assert.equal(calls,2);assert.equal(ready,false);resolveLoads();await Promise.all([first,second]);assert.equal(ready,true);await load([s]);assert.equal(calls,2);
 let fail=true;const retry=createFontLoader(()=>({load:async()=>fail?[]:[{}]}));await assert.rejects(retry([s]),/Police indisponible/);fail=false;await retry([s]);
 const system=createFontLoader(()=>({load(){throw Error('System fonts must not trigger downloads');}}));const systemSlide=makeSlide();systemSlide.positions.title.font='arial';systemSlide.positions.body.font='arial';await system([systemSlide]);
});

test('text styles sanitize values and select a real font weight',async()=>{
 const {normalizeTextStyle,fontWeights}=await import('../src/textStyles.js');assert.deepEqual(fontWeights('lora'),[400,500,600,700]);const style=normalizeTextStyle({weight:900,italic:true,underline:'yes',highlight:true,highlightColor:'bad',highlightOpacity:150},'lora');assert.equal(style.weight,700);assert.equal(style.italic,true);assert.equal(style.underline,false);assert.equal(style.highlightColor,'#ffe066');assert.equal(style.highlightOpacity,100);assert.equal(normalizeTextStyle({},'inter','text',true).weight,700);assert.equal(normalizeTextStyle({},'inter').weight,400);
});

test('typography survives import, rotation and independent duplication without changing heading roles',async()=>{
 const {duplicateElement}=await import('../src/editor.js');const {getTextStyle}=await import('../src/textStyles.js');const s=makeSlide();s.positions.title.font='inter';s.positions.title.rotation=45;s.positions.title.textStyle={weight:300,italic:true,underline:true,strike:true,highlight:true,highlightColor:'#ffaa22',highlightOpacity:55};const copy=duplicateElement(s,'title');s.positions[copy].textStyle.weight=900;const restored=normalizeSlides(JSON.parse(JSON.stringify([s])))[0];assert.equal(getTextStyle(restored,'title').weight,300);assert.equal(getTextStyle(restored,copy).weight,900);assert.equal(restored.positions.title.rotation,45);assert.equal(restored.elements[copy].weight,700);assert.equal(restored.positions.title.textStyle.highlightColor,'#ffaa22');assert.equal(restored.positions.title.textStyle.underline,true);assert.equal(restored.positions[copy].textStyle.strike,true);
});

test('Canvas text draws per-line highlights behind glyphs and decorations in front',async()=>{
 const {text}=await import('../src/render.js');const {normalizeTextStyle}=await import('../src/textStyles.js');const calls=[];const ctx={globalAlpha:1,save(){this.saved=[this.globalAlpha,this.fillStyle];},restore(){[this.globalAlpha,this.fillStyle]=this.saved;},measureText(t){return {width:t.length*10,actualBoundingBoxAscent:-2,actualBoundingBoxDescent:18};},fillRect(x,y,w,h){calls.push({kind:'rect',x,y,w,h,color:this.fillStyle,alpha:this.globalAlpha});},fillText(t,x,y){calls.push({kind:'text',t,x,y});}};
 const style=normalizeTextStyle({weight:600,italic:true,underline:true,strike:true,highlight:true,highlightOpacity:40},'inter');text(ctx,'Java\nMémoire',100,200,300,20,'#ffffff',600,'Inter',1.4,style);assert.equal(ctx.font,'italic 600 20px Inter');assert.deepEqual(calls.map(c=>c.kind),['rect','text','rect','rect','rect','text','rect','rect']);assert.equal(calls[0].alpha,.4);assert.equal(calls[4].y-calls[0].y,28);assert.ok(calls[4].w>calls[0].w);assert.equal(ctx.globalAlpha,1);
});

test('font face cache differentiates weight and true italic while synthetic italic loads normal',async()=>{
 const {createFontLoader}=await import('../src/fontLoader.js');const requests=[];const load=createFontLoader(()=>({load:async spec=>{requests.push(spec);return [{}];}}));const s=makeSlide();s.positions.body.font='arial';s.positions.title.font='inter';s.positions.title.textStyle={weight:900,italic:true};await load([s]);assert.deepEqual(requests,['italic 900 24px "Inter"']);s.positions.title.textStyle.weight=300;await load([s]);assert.equal(requests.at(-1),'italic 300 24px "Inter"');s.positions.title.font='space-grotesk';await load([s]);assert.equal(requests.at(-1),'300 24px "Space Grotesk"');
});

test('reapplying a composition preserves selected fonts and text styles',()=>{
 const s=makeSlide();s.positions.title.font='inter';s.positions.title.textStyle={weight:300,italic:true};s.positions.body.textStyle={highlight:true,highlightColor:'#ffaaff'};applyLayout(s,'title');assert.equal(s.positions.title.font,'inter');assert.equal(s.positions.title.textStyle.weight,300);assert.equal(s.positions.body.textStyle.highlightColor,'#ffaaff');
});
