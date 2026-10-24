const {chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base||''))throw Error('Isolated server required');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1050},permissions:['clipboard-read','clipboard-write']}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.evaluate(async()=>{
   const {createApp,h,ref,nextTick}=await import('/node_modules/.vite/deps/vue.js');
   const {default:Studio}=await import('/src/StudioApp.vue');
   const v=ref(null),host=document.createElement('div');host.style='position:fixed;inset:0;z-index:2000';document.body.append(host);
   createApp({render:()=>h(Studio,{ref:v,application:'animation',initialView:'slides'})}).mount(host);await nextTick();window.live=()=>v.value.getStudio();window.tick=nextTick;
   const {makeSlide}=await import('/src/model.js'),{normalizeAnimation}=await import('/src/animationModel.js');
   const scene=makeSlide('title');Object.assign(scene,{blockKeys:['text'],elements:{text:{type:'text',text:'Un texte stylisé',name:'Titre'}},positions:{text:{x:100,y:150,w:400,h:140,size:28,textStyle:{font:'JetBrains Mono',weight:600,italic:true,underline:true,color:'#111111'}}},fragments:{text:{order:0,animation:'none'}},groups:[],animation:normalizeAnimation({duration:8,clips:[{id:'text-motion',keys:['text'],duration:8,frames:[{field:'x',time:0,value:100,ease:'linear'},{field:'x',time:5,value:650},{field:'size',time:0,value:28,ease:'linear'},{field:'size',time:5,value:72},{field:'color',time:0,value:'#111111',ease:'linear'},{field:'color',time:5,value:'#ff8800'},{field:'rotation',time:0,value:0,ease:'linear'},{field:'rotation',time:5,value:25}]}]})});
   const s=live();s.slides.value=[scene];s.index.value=0;s.workspace.value='editor';await tick();s.selected.value='text';s.selectedKeys.value=['text'];s.selectionScope.value='elements';s.animation.seek(5);await tick();
  });
  const canvas=page.locator('canvas[aria-label^="Diapo :"]');await canvas.focus();
  await page.keyboard.press('Control+d');
  let state=await page.evaluate(()=>{const s=live(),key=s.selected.value;window.duplicateKey=key;return {key,p:s.current.value.positions[key],clips:s.animation.config.value.clips.map(c=>c.keys),presence:s.animation.config.value.presences[key],text:s.current.value.elements[key].text};});
  assert.notEqual(state.key,'text');assert.equal(state.p.x,674);assert.equal(state.p.y,174);assert.equal(state.p.size,72);assert.equal(state.p.rotation,25);
  assert.equal(state.p.textStyle.color,'#ff8800');assert.equal(state.p.textStyle.font,'JetBrains Mono');assert.equal(state.p.textStyle.underline,true);assert.equal(state.text,'Un texte stylisé');
  assert.equal(state.presence.start,5);assert(!state.clips.some(keys=>keys.includes(state.key)));
  await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>!!live().current.value.positions[duplicateKey]),false);
  await page.keyboard.press('Control+Shift+z');assert.equal(await page.evaluate(()=>live().current.value.positions[duplicateKey].size),72);
  await page.evaluate(async()=>{const s=live();s.selected.value='text';s.selectedKeys.value=['text'];s.selectionScope.value='elements';s.animation.seek(5);await tick();});await canvas.focus();
  await page.keyboard.press('Control+c');
  await page.waitForFunction(async()=>((await navigator.clipboard.readText()).startsWith('FRAME_OBJECTS_V1')));
  await page.evaluate(()=>live().animation.seek(7));
  await page.keyboard.press('Control+v');
  await page.waitForFunction(()=>live().selected.value!=='text'&&live().selected.value!==duplicateKey);
  state=await page.evaluate(()=>{const s=live(),key=s.selected.value;return {key,p:s.current.value.positions[key],clips:s.animation.config.value.clips.map(c=>c.keys),presence:s.animation.config.value.presences[key],original:s.current.value.positions.text};});
  assert.equal(state.p.x,674);assert.equal(state.p.size,72);assert.equal(state.p.rotation,25);assert.equal(state.p.textStyle.color,'#ff8800');assert.equal(state.p.textStyle.italic,true);
  assert.equal(state.presence.start,7);assert(!state.clips.some(keys=>keys.includes(state.key)));assert.equal(state.original.size,28);assert.equal(state.original.x,100);
  assert.equal(await page.evaluate(()=>{const s=live();s.animation.seek(7.5);return s.animation.evaluate().scene.positions[s.selected.value].size;}),72);
  assert.deepEqual(errors,[]);
  console.log('Actual Ctrl D and Ctrl C/V preserve evaluated text appearance without tracks; undo/redo, paste at a later time and original independence passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
