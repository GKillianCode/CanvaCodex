const {chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base||''))throw Error('Isolated server required');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);
 await page.evaluate(async()=>{
 const {createApp,h,ref,nextTick}=await import('/node_modules/.vite/deps/vue.js');const {default:Studio}=await import('/src/StudioApp.vue');
 window.mountTest=async()=>{const host=document.createElement('div');host.style='position:fixed;inset:0;z-index:2000';document.body.append(host);const v=ref();window.testApp=createApp({render:()=>h(Studio,{ref:v,application:'animation',initialView:'slides'})});testApp.mount(host);await nextTick();window.live=()=>v.value.getStudio();window.tick=nextTick;live().workspace.value='editor';await tick();};await mountTest();
 const {makeSlide}=await import('/src/model.js');const {normalizeAnimation}=await import('/src/animationModel.js');const {normalizeShape}=await import('/src/shapes.js');const scene=makeSlide('title');Object.assign(scene,{title:'Organisation',blockKeys:['texta','textb','textc','shape1'],elements:Object.fromEntries(['texta','textb','textc'].map(k=>[k,{type:'text',custom:true,name:k,text:k}])),positions:{texta:{x:100,y:100,w:200,h:100,size:40},textb:{x:400,y:100,w:200,h:100,size:40},textc:{x:700,y:100,w:200,h:100,size:40},shape1:{x:100,y:400,w:200,h:200}},fragments:{},animation:normalizeAnimation({duration:10,presences:{texta:{start:0,end:8}},clips:[{id:'anim',keys:['texta'],duration:10,frames:[{field:'x',time:0,value:100},{field:'x',time:5,value:300}]}]})});scene.fragments=Object.fromEntries(scene.blockKeys.map(k=>[k,{order:0,animation:'none'}]));scene.elements.shape1=normalizeShape({shape:'circle'});const next=JSON.parse(JSON.stringify(scene));next.id=crypto.randomUUID();next.title='Deuxième';live().slides.value=[scene,next];live().index.value=0;await tick();
 });
 assert.equal(await page.getByLabel('Dossier Textes',{exact:true}).count(),1);assert.equal(await page.getByLabel('Dossier Formes',{exact:true}).count(),1);
 const rows=()=>page.locator('.animation-object-track').evaluateAll(nodes=>nodes.map(n=>n.dataset.object));
 const resize=await page.getByLabel('Redimensionner la timeline',{exact:true}).boundingBox();await page.mouse.move(resize.x+resize.width/2,resize.y+resize.height/2);await page.mouse.down();await page.mouse.move(resize.x+resize.width/2,resize.y-300,{steps:5});await page.mouse.up();
 const before=await page.evaluate(()=>JSON.stringify(live().current.value.blockKeys));

 await page.getByLabel('Déplacer la piste de textc',{exact:true}).dragTo(page.locator('[data-object="textb"] .object-track-name'),{targetPosition:{x:70,y:4}});
 assert.deepEqual(await rows(),['texta','textc','textb','shape1']);assert.equal(await page.evaluate(()=>JSON.stringify(live().current.value.blockKeys)),before);
 await page.evaluate(async()=>{live().addBlock('text');await tick();live().closeEdit();});
 const keys=await rows();assert.deepEqual(keys.slice(0,3),['texta','textc','textb']);assert.match(keys[3],/^text/);assert.equal(keys.at(-1),'shape1');
 // Native wheel scrolls horizontally and leaves scene timing untouched.
 const lane=page.locator('[data-object="texta"] .track-lane');await lane.scrollIntoViewIfNeeded();const lb=await lane.boundingBox();await page.mouse.move(lb.x+100,lb.y+15);await page.mouse.wheel(0,250);await page.waitForTimeout(100);
 assert.ok(await page.locator('.animation-tracks').evaluate(e=>e.scrollLeft)>0);
 // Real keyboard events seek frames, never nudge selected objects.
 await page.locator('.animation-timeline').focus();await page.evaluate(()=>live().animation.seek(2));const positions=await page.evaluate(()=>JSON.stringify(live().current.value.positions));await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>live().animation.time.value),61/30);await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>live().animation.time.value),2);assert.equal(await page.evaluate(()=>JSON.stringify(live().current.value.positions)),positions);
 await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>live().animation.playing.value),true);await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>live().animation.playing.value),false);
 // An edge magnetizes within eight visible pixels of the playhead.
 await page.evaluate(async()=>{live().animation.seek(5);await tick();document.querySelector('.animation-tracks').scrollLeft=800;});
 const end=page.locator('[data-object="texta"] .presence-handle.end');await end.scrollIntoViewIfNeeded();const edge=await end.boundingBox();const l=await lane.boundingBox();const span=Number(await page.locator('.animation-tracks-world').getAttribute('data-time-span'));
 await page.mouse.move(edge.x+edge.width/2,edge.y+edge.height/2);await page.mouse.down();await page.mouse.move(edge.x+edge.width/2-3/span*l.width+3,edge.y+edge.height/2,{steps:5});await page.mouse.up();assert.equal(await page.evaluate(()=>live().animation.config.value.presences.texta.end),5);
 // UI state survives unmount/remount, separately from the animation JSON.
 await page.evaluate(async()=>{const s=live();s.index.value=1;await tick();s.animation.seek(3.8);s.zoom.value=140;s.animation.panX.value=31;s.animation.panY.value=-18;s.animation.loop.value=false;s.selected.value='texta';s.selectedKeys.value=['texta'];await tick();});
 await page.getByLabel('Animations de texta',{exact:true}).click();await page.getByLabel('Dossier Formes',{exact:true}).click();
 const ruler=await page.locator('.timeline-ruler').boundingBox();await page.mouse.move(Math.min(1200,ruler.x+ruler.width/2),ruler.y+12);await page.keyboard.down('Control');await page.mouse.wheel(0,-200);await page.keyboard.up('Control');await page.waitForTimeout(100);
 await page.getByLabel('Scène · propriétés',{exact:true}).click();await page.locator('[data-drawer="scene-background"] > summary').click();
 await page.locator('.inspector-body').evaluate(e=>e.scrollTop=80);
 await page.getByRole('button',{name:'Audio',exact:true}).click();await page.locator('.animation-tracks').evaluate(e=>e.scrollLeft=360);

 await page.waitForTimeout(250);
 const expected=await page.evaluate(()=>{const s=live();s.flushLocal();return JSON.parse(JSON.stringify(s.editorView.value));});
 await page.evaluate(async()=>{testApp.unmount();await mountTest();});await page.waitForTimeout(150);
 const actual=await page.evaluate(()=>{const s=live();return {scene:s.current.value.id,time:s.animation.time.value,loop:s.animation.loop.value,zoom:s.zoom.value,panX:s.animation.panX.value,selection:s.selectedKeys.value,ui:s.editorView.value};});
 
 assert.equal(actual.scene,expected.sceneId);assert.equal(actual.time,3.8);assert.equal(actual.loop,false);assert.equal(actual.zoom,140);assert.equal(actual.panX,31);assert.deepEqual(actual.selection,['texta']);assert.equal(actual.ui.timeline.panel,'audio');assert.equal(actual.ui.inspector.section,'slide');assert.equal(actual.ui.timeline.height,expected.timeline.height);assert.equal(actual.ui.timeline.zoom,expected.timeline.zoom);assert.equal(actual.ui.inspector.drawers['scene-background'],true);assert.equal(await page.locator('.inspector-body').evaluate(e=>e.scrollTop),expected.inspector.scrolls['slide:']||0);assert.equal(await page.locator('.animation-tracks').evaluate(e=>e.scrollLeft),360);
 // Export is a real portable file, without scene content.
 const download=page.waitForEvent('download');await page.evaluate(()=>live().exportEditorView());const file=await download;const fs=require('node:fs');const exported=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(exported.format,'frame-editor-configuration');assert.equal(exported.view.loop,false);assert(!exported.slides);
 // The existing linked-file writer automatically updates the selected external JSON.
 await page.evaluate(async()=>{window.configTestHandle=await (await navigator.storage.getDirectory()).getFileHandle('frame-interface-test.json',{create:true});window.showSaveFilePicker=async()=>configTestHandle;await live().saveEditorView();live().animation.loop.value=true;});
 await page.waitForFunction(async()=>{try{return JSON.parse(await (await configTestHandle.getFile()).text()).view.loop===true;}catch{return false;}});
 // A second browser context can import the file without carrying browser preferences.
 const seed=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>!key.includes('frame-editor-view:'))));
 const other=await browser.newContext({viewport:{width:1600,height:1050}}),target=await other.newPage();await target.goto(base);await target.evaluate(seed=>{localStorage.clear();for(const [key,value]of Object.entries(seed))localStorage.setItem(key,value);},seed);await target.reload();
 const mount=async()=>{const {createApp,h,ref,nextTick}=await import('/node_modules/.vite/deps/vue.js');const {default:Studio}=await import('/src/StudioApp.vue');const host=document.createElement('div');host.style='position:fixed;inset:0;z-index:2000';document.body.append(host);const v=ref();createApp({render:()=>h(Studio,{ref:v,application:'animation',initialView:'slides'})}).mount(host);await nextTick();window.live=()=>v.value.getStudio();};
 await target.evaluate(mount);
 await target.getByRole('button',{name:'Fichier',exact:true}).last().click();
 const input=target.locator('.menu-file').filter({hasText:'Importer une configuration d’interface'}).locator('input');
 const reloaded=target.waitForEvent('load');await input.setInputFiles({name:'configuration.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await reloaded;await target.evaluate(mount);
 const imported=await target.evaluate(()=>({loop:live().animation.loop.value,time:live().animation.time.value,zoom:live().zoom.value,panel:live().editorView.value.timeline.panel}));assert.deepEqual(imported,{loop:false,time:3.8,zoom:140,panel:'audio'});await other.close();
 assert.deepEqual(errors,[]);await page.getByRole('button',{name:'Images clés',exact:true}).click();await page.screenshot({path:'/tmp/frame-animation-workspace.png'});console.log('Folders, row reorder, append, wheel pan, shortcuts, edge snap, workspace restoration and JSON export passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
