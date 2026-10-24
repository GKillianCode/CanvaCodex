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
  // Shift constrains the shared drag gesture to its dominant axis, for one or several objects.
  await page.evaluate(()=>live().animation.setAutoKey(false));
  async function lockedDrag(keys,dx,dy){
    const initial=await page.evaluate(keys=>{const s=live();s.selected.value=keys.length===1?keys[0]:null;s.selectedKeys.value=keys;return JSON.parse(JSON.stringify(s.current.value.positions));},keys);
    const from=await screen(initial.a.x+80,initial.a.y+60),to=await screen(initial.a.x+80+dx,initial.a.y+60+dy);
    await page.keyboard.down('Shift');await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:10});await page.mouse.up();await page.keyboard.up('Shift');
    const after=await page.evaluate(()=>live().animation.evaluate().scene.positions);
    for(const key of keys){if(Math.abs(dx)>Math.abs(dy)){assert.equal(after[key].y,initial[key].y);assert(Math.abs(after[key].x-initial[key].x-dx)<1);}else{assert.equal(after[key].x,initial[key].x);assert(Math.abs(after[key].y-initial[key].y-dy)<1);}}
    await page.evaluate(initial=>{Object.assign(live().current.value.positions,initial);live().animation.config.value.clips=[];live().animation.selectedClip.value='';live().selected.value=null;live().selectedKeys.value=[];live().requestDraw?.();},initial);
  }
  await lockedDrag(['a'],100,20);await lockedDrag(['a','b','c'],20,90);
  await page.evaluate(()=>live().animation.setAutoKey(true));
  // Select the three images using the actual shared canvas interaction.
  await page.keyboard.down('Control');
  for(const [x,y]of [[330,310],[660,350],[990,390]]){const p=await screen(x,y);await page.mouse.click(p.x,p.y);}
  await page.keyboard.up('Control');
  assert.equal(await page.evaluate(()=>live().selectedKeys.value.length),3);
  await page.evaluate(()=>live().animation.seek(2));
  let from=await screen(330,310),to=await screen(450,390);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();
  const first=await page.evaluate(()=>{
   const s=live(),a=s.animation;a.seek(1);return {positions:a.evaluate().scene.positions,clips:a.config.value.clips,groups:s.current.value.groups};
  });
  assert.equal(first.clips.length,1);assert.equal(first.clips[0].groupTransform,true);assert.deepEqual(first.clips[0].keys,['a','b','c']);assert.equal(first.groups.length,0);
  for(const [i,key]of ['a','b','c'].entries()){
   assert(Math.abs(first.positions[key].x-(250+i*330+60))<.01);
   assert(Math.abs(first.positions[key].y-(250+i*40+40))<.01);
  }
  const checks=await page.evaluate(async()=>{
   const s=live(),a=s.animation,{enclosingBounds}=await import('/src/selection.js'),{rotateObjects}=await import('/src/editor.js'),{scaleObjects}=await import('/src/scaleObjects.js');
   const clone=v=>JSON.parse(JSON.stringify(v)),results=[];
   const compare=(wanted,got)=>Object.keys(wanted).every(key=>['x','y','w','h','rotation'].every(field=>Math.abs((wanted[key][field]||0)-(got[key][field]||0))<.01));
   a.seek(3);let origins=clone(a.evaluate().scene.positions),bounds=enclosingBounds(Object.values(origins));
   const rotated=rotateObjects(origins,bounds,45);a.commitPose(rotated,origins);await tick();results.push({test:'group rotation',pass:compare(rotated,a.evaluate().scene.positions)});
   a.seek(4);origins=clone(a.evaluate().scene.positions);bounds=enclosingBounds(Object.values(origins));
   const scaled=scaleObjects(origins,bounds,1.5,{x:bounds.x,y:bounds.y}).positions;
   a.commitPose(scaled,origins);await tick();results.push({test:'group scale after rotation',pass:compare(scaled,a.evaluate().scene.positions)});
   const snap=JSON.stringify(a.config.value.clips);s.undo();await tick();s.redo();await tick();results.push({test:'undo/redo',pass:JSON.stringify(a.config.value.clips)===snap});
   // Shared geometry inputs remain a group frame with automatic keys.
   a.seek(5);const before=enclosingBounds(Object.values(a.evaluate().scene.positions));a.setProperty('x',before.x+100);await tick();
   const after=a.evaluate().scene.positions;results.push({test:'inspector preserves spacing',pass:Math.abs((after.b.x-after.a.x)-(origins.b.x-origins.a.x)*1.5)<.01});
   // Common opacity retains independent tracks but all keys share the cursor time.
   a.setProperty('opacity',30);await tick();results.push({test:'opacity synchronized',pass:['a','b','c'].every(key=>a.config.value.clips.some(c=>c.keys.includes(key)&&c.frames.some(f=>f.field==='opacity'&&Math.abs(c.start+f.time-5)<1e-6)))});
   a.seek(6);origins=clone(a.evaluate().scene.positions);
   const moved=Object.fromEntries(Object.entries(origins).map(([key,p])=>[key,{...p,x:p.x-50,y:p.y+25}]));
   a.commitPose(moved,origins);await tick();
   results.push({test:'reuse common clip after opacity edits',pass:a.config.value.clips.filter(c=>c.groupTransform).length===1&&compare(moved,a.evaluate().scene.positions)});
   a.setAutoKey(false);a.recordProperty('x');await tick();
   results.push({test:'manual diamond keeps common track',pass:a.clip.value.keys.length===3&&a.clip.value.frames.some(f=>f.field==='x'&&cTime(a.clip.value,f)===6)});
   function cTime(c,f){return c.start+f.time;}
   const {normalizeAnimation}=await import('/src/animationModel.js');
   results.push({test:'JSON roundtrip',pass:normalizeAnimation(JSON.parse(JSON.stringify(a.config.value))).clips.some(c=>c.groupTransform&&c.keys.length===3)});
   return results;
  });
  assert(checks.every(c=>c.pass),JSON.stringify(checks));assert.deepEqual(errors,[]);
  console.log('Three-image canvas selection and drag, synchronized interpolation, common rotation/scale, inspector spacing, opacity and undo/redo passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
