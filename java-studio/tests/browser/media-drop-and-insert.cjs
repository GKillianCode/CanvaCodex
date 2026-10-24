const {chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),base=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base||''))throw Error('Isolated server required');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 const sample=process.env.FRAME_TEST_VIDEO_FILE||'/tmp/frame-video-sample.mp4',bytes=fs.readFileSync(sample).toString('base64');
 for(const application of ['slides','animation','banners']){
  await page.evaluate(async application=>{
   window.testApp?.unmount();document.getElementById('test-studio')?.remove();
   const {createApp,h,ref,nextTick}=await import('/node_modules/.vite/deps/vue.js'),{default:Studio}=await import('/src/StudioApp.vue'),{makeSlide}=await import('/src/model.js'),{normalizeAnimation}=await import('/src/animationModel.js');
   const host=document.createElement('div');host.id='test-studio';host.style='position:fixed;inset:0;z-index:2000';document.body.append(host);const v=ref();window.testApp=createApp({render:()=>h(Studio,{ref:v,application,initialView:application==='banners'?'banners':'slides'})});testApp.mount(host);await nextTick();window.live=()=>v.value.getStudio();window.tick=nextTick;
   const scene=makeSlide('title');Object.assign(scene,{blockKeys:[],elements:{},positions:{},fragments:{},animation:normalizeAnimation({duration:8})});const s=live();if(application==='banners')s.banner.value.slide=scene;else{s.slides.value=[scene];s.index.value=0;}s.workspace.value='editor';await tick();if(s.isAnimation)s.animation.seek(2);
  },application);
  const canvas=page.locator('#test-studio canvas[aria-label^="Diapo :"]'),bounds=await canvas.boundingBox();
  const dt=await page.evaluateHandle(({bytes})=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],'drop.MP4',{type:''}));const c=document.createElement('canvas');c.width=c.height=5;const data=atob(c.toDataURL().split(',')[1]);dt.items.add(new File([Uint8Array.from(data,c=>c.charCodeAt(0))],'image.png',{type:'image/png'}));return dt;},{bytes});
  await canvas.dispatchEvent('dragover',{dataTransfer:dt});await canvas.dispatchEvent('drop',{dataTransfer:dt,clientX:bounds.x+bounds.width*.5,clientY:bounds.y+bounds.height*.5});
  await page.waitForFunction(()=>Object.values(live().current.value.elements).filter(e=>e.type==='image').length===2);
  await page.waitForFunction(async()=>{const s=live(),key=Object.keys(s.current.value.elements).find(k=>s.current.value.elements[k].mediaKind==='video');const {videoAsset}=await import('/src/videoMedia.js');return videoAsset(s.current.value.id,key,s.current.value.elements[key].src).ready;});
  const dropped=await page.evaluate(()=>{const s=live(),entries=Object.entries(s.current.value.elements);return {names:entries.map(([,e])=>e.name),video:entries[0][1],presence:s.animation?.config.value.presences[entries[0][0]]};});
  assert.deepEqual(dropped.names,['drop.MP4','image.png']);assert.equal(dropped.video.autoplay,true);assert.match(dropped.video.src,/^frame-video:/);if(application==='animation')assert.equal(dropped.presence.start,2);
  await page.waitForFunction(()=>live().toast.value.includes('média(s) ajouté'));
  await page.evaluate(()=>live().undo());await page.waitForFunction(()=>Object.keys(live().current.value.elements).length===0);await page.evaluate(()=>live().redo());await page.waitForFunction(()=>Object.keys(live().current.value.elements).length===2);
  // Header and context menu consume the same insertion component.
  await page.locator('#test-studio .app-menu-trigger').filter({hasText:'Insérer'}).click();
  const headerItems=await page.locator('#test-studio .app-menu-popover [data-insert]').evaluateAll(es=>es.map(e=>e.dataset.insert));
  await canvas.click({button:'right',position:{x:30,y:150}});
  const menu=page.locator('#test-studio .element-context');const contextItems=await menu.locator('[data-insert]').evaluateAll(es=>es.map(e=>e.dataset.insert));assert.deepEqual(contextItems,headerItems);assert(headerItems.includes('bits'));assert(headerItems.includes('title'));assert(headerItems.includes('list'));assert(headerItems.includes('video'));assert.equal(headerItems.includes('counter'),application==='animation');
  const rect=await menu.boundingBox();assert(rect.y+rect.height<=1000);
  await menu.locator('[data-insert="bits"]').click();assert.equal(await page.evaluate(()=>live().selectedType.value),'bits');assert.equal(await menu.count(),0);
  await canvas.click({button:'right',position:{x:30,y:150}});await menu.locator('[data-insert="video"] input').setInputFiles(sample);
  await page.waitForFunction(()=>Object.values(live().current.value.elements).filter(e=>e.mediaKind==='video').length===2);assert.equal(await menu.count(),0);
  if(application==='animation'){
   await canvas.click({button:'right',position:{x:30,y:150}});await menu.locator('[data-insert="counter"]').click();assert.ok(await page.evaluate(()=>live().animation.config.value.counters[live().selected.value]));
  }
  // Changing scene while a file is being read must never insert into the new scene.
  await page.evaluate(()=>{window.originScene=live().current.value;window.originCount=Object.keys(originScene.elements).length;window.originalReader=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(...args){setTimeout(()=>originalReader.apply(this,args),150);};});
  await canvas.dispatchEvent('drop',{dataTransfer:dt,clientX:bounds.x+bounds.width*.5,clientY:bounds.y+bounds.height*.5});
  await page.evaluate(async application=>{const {makeSlide}=await import('/src/model.js'),{normalizeAnimation}=await import('/src/animationModel.js');const scene=makeSlide('title');Object.assign(scene,{blockKeys:[],elements:{},positions:{},fragments:{},animation:normalizeAnimation()});if(application==='banners')live().banner.value.slide=scene;else{live().slides.value.push(scene);live().index.value=live().slides.value.length-1;}},application);
  await page.waitForFunction(()=>live().toast.value==='Import annulé : la scène a changé.');assert.equal(await page.evaluate(()=>Object.keys(originScene.elements).length===originCount&&Object.keys(live().current.value.elements).length===0),true);await page.evaluate(()=>FileReader.prototype.readAsDataURL=originalReader);

 }
 assert.deepEqual(errors,[]);console.log('MP4 drop with missing MIME + mixed image, rendering, undo/redo, scene presence, menu parity, bits/counter and video picker passed in slides, animation and overlays');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
