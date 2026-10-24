const {chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base||''))throw Error('Isolated server required');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1800,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await page.evaluate(async()=>{
   const {createApp,h,ref,nextTick}=await import('/node_modules/.vite/deps/vue.js');
   const {default:Studio}=await import('/src/StudioApp.vue');
   const v=ref(null),host=document.createElement('div');host.style='position:fixed;inset:0;z-index:2000';document.body.append(host);
   createApp({render:()=>h(Studio,{ref:v,application:'animation',initialView:'slides'})}).mount(host);await nextTick();window.live=()=>v.value.getStudio();window.tick=nextTick;
   const {makeSlide}=await import('/src/model.js'),{normalizeAnimation}=await import('/src/animationModel.js');
   const image=document.createElement('canvas');image.width=20;image.height=20;image.getContext('2d').fillRect(0,0,20,20);
   const scene=makeSlide('title');Object.assign(scene,{blockKeys:['a','b','c'],elements:{},positions:{},fragments:{},groups:[],animation:normalizeAnimation({duration:8})});
   ['a','b','c'].forEach((key,i)=>{scene.elements[key]={type:'image',src:image.toDataURL(),name:key};scene.positions[key]={x:250+i*330,y:250+i*40,w:160,h:120};scene.fragments[key]={order:0,animation:'none'};});
   const s=live();s.slides.value=[scene];s.index.value=0;s.workspace.value='editor';s.panels.value.snapping=false;s.selected.value=null;s.selectedKeys.value=[];await tick();s.animation.setAutoKey(true);
  });
  const canvas=page.locator('canvas[aria-label^="Diapo :"]');await canvas.waitFor();
  async function screen(x,y){const r=await canvas.boundingBox();return{x:r.x+(x+320)/2560*r.width,y:r.y+(y+180)/1440*r.height};}
  await page.evaluate(async()=>{const s=live();s.selected.value='a';s.selectedKeys.value=['a'];s.animation.seek(5);await tick();});
  async function dragImage(x,y,dx,dy){const from=await screen(x,y),to=await screen(x+dx,y+dy);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
  await dragImage(330,310,100,0);
  await page.evaluate(async()=>{
    const s=live(),a=s.animation;
    const c=a.config.value.clips.find(c=>c.keys.includes('a'));
    const key=c.frames.find(f=>f.field==='x'&&Math.abs(c.start+f.time-5)<1e-6);key.ease='bezier';key.curve=[.4,0,.7,1.2];
    // Work on another image, then return via a different track of the first image.
    s.selected.value='b';s.selectedKeys.value=['b'];a.seek(6);a.setProperty('opacity',40);await tick();
    a.config.value.clips.push({id:'other-a-track',name:'Opacité',keys:['a'],start:0,duration:8,enabled:true,frames:[{field:'opacity',time:5,value:100,ease:'linear'}]});
    a.selectClip('other-a-track');a.seek(5.003);await tick();
  });
  await dragImage(430,310,100,40);
  const result=await page.evaluate(async()=>{
    const s=live(),a=s.animation;
    const keys=()=>a.config.value.clips.filter(c=>c.keys.length===1&&c.keys[0]==='a').flatMap(c=>c.frames.filter(f=>f.field==='x'&&Math.round((c.start+f.time)*30)===150).map(f=>({clip:c.id,value:f.value,ease:f.ease,curve:f.curve})));
    const edited=keys();s.undo();await tick();const undone=keys();s.redo();await tick();const redone=keys();
    a.setAutoKey(false);a.seek(5.004);a.setProperty('x',700);const manual=keys();
    const c=a.clip.value,k=c.frames.find(f=>f.field==='x'&&Math.round((c.start+f.time)*30)===150);
    a.selectKey(c,k,false);a.copyKeys();a.seek(5.009);a.pasteKeys();
    return {edited,undone,redone,manual,pasted:keys(),position:a.evaluate().scene.positions.a.x};
  });
  for(const name of ['edited','redone','manual','pasted'])assert.equal(result[name].length,1,name+' has one key');
  assert(Math.abs(result.edited[0].value-450)<.1);assert(Math.abs(result.undone[0].value-350)<.1);
  assert.equal(result.edited[0].ease,'bezier');assert.deepEqual(result.edited[0].curve,[.4,0,.7,1.2]);
  assert.equal(result.manual[0].value,700);assert.equal(result.pasted[0].value,700);assert.equal(result.position,700);
  assert.deepEqual(errors,[]);
  console.log('Same-image re-edit at 5 seconds after another selection/track: one key, updated pose, preserved curve, undo/redo, manual editing and paste passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
