const {chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const base=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base||''))throw Error('Isolated server required');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  const checks=await page.evaluate(async()=>{
   const {normalizeAnimation}=await import('/src/animationModel.js');
   const {renderAnimation}=await import('/src/animationRender.js');
   const {drawSceneBackground}=await import('/src/sceneBackground.js');
   const theme={ink:'#ffffff',accent:'#a7eaca',background:'#101820'};
   const source={blockKeys:[],positions:{},elements:{},fragments:{},background:{mode:'dots',base:'#ffffff',color:'#000000',opacity:100,size:10,spacing:32}};
   const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
   const ctx=canvas.getContext('2d',{willReadFrequently:true}),results=[];
   for(const reverse of [false,true])for(const ease of ['linear','smooth','bezier']){
    const [a,b]=reverse?['#000000','#ffffff']:['#ffffff','#000000'];
    const cfg=normalizeAnimation({duration:4,clips:[{keys:[],duration:4,frames:[
     {field:'patternBase',time:0,value:a,ease,curve:[.25,.1,.25,2]},{field:'patternBase',time:3,value:b},
     {field:'patternColor',time:0,value:b,ease,curve:[.25,.1,.25,2]},{field:'patternColor',time:3,value:a},
     {field:'patternMode',time:0,value:4,ease,curve:[.25,.1,.25,2]},{field:'patternMode',time:3,value:5},
    ]}]});
    const final={...source.background,mode:'grid',base:b,color:a};
    ctx.clearRect(0,0,1920,1080);drawSceneBackground(ctx,final,theme);
    const expected=[...ctx.getImageData(0,0,64,64).data];
    const times=ease==='bezier'?[2.1,2.5,2.9,3-1/30,3,3+1/30,3.9]:[3,3+1/30,3.9];
    for(const t of times){
     ctx.clearRect(0,0,1920,1080);renderAnimation(ctx,source,theme,cfg,t,{camera:false});
     const actual=[...ctx.getImageData(0,0,64,64).data];
     results.push({reverse,ease,time:t,exact:actual.every((v,i)=>v===expected[i])});
    }
   }
   return results;
  });
  assert(checks.every(c=>c.exact),JSON.stringify(checks.filter(c=>!c.exact)));
  assert.deepEqual(errors,[]);
  console.log(`${checks.length} rendered endpoint/overshoot samples match final pixels: both colour inversions, linear/smooth/Bezier, before/at/after the last key.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
