import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright'),url=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url||''))throw Error('Isolated server required');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/#/diaporamas');
 async function drawer(){await page.getByRole('button',{name:'Diapo · propriétés',exact:true}).click();await page.locator('[data-drawer="scene-background"] summary').click();}
 await drawer();await page.getByLabel('Type de fond',{exact:true}).selectOption('dots');
 await page.getByLabel('Rotation du fond · valeur',{exact:true}).fill('19');
 const toggle=page.getByLabel('Fond commun fixe sur toutes les diapos');await toggle.check();
 await page.getByLabel('Rotation du fond · valeur',{exact:true}).fill('37');
 await page.waitForTimeout(800);await page.reload();await drawer();
 assert.equal(await toggle.isChecked(),true);assert.equal(await page.getByLabel('Rotation du fond · valeur',{exact:true}).inputValue(),'37');
 await toggle.uncheck();assert.equal(await page.getByLabel('Rotation du fond · valeur',{exact:true}).inputValue(),'19');
 await toggle.check();assert.equal(await page.getByLabel('Rotation du fond · valeur',{exact:true}).inputValue(),'37');
 await page.screenshot({path:'/tmp/frame-fixed-background.png'});
 const result=await page.evaluate(async()=>{
 const {makeSlide,normalizeFrame}=await import('/src/model.js'),{renderSlide,renderSlideBackground}=await import('/src/render.js'),{drawSlideTransition}=await import('/src/slideTransition.js');
 const theme={bg:'#101820',accent:'#00ff00',secondary:'#ff0000',panel:'#112233',ink:'#ffffff'},s=makeSlide();s.hiddenKeys=[...s.blockKeys];s.background={mode:'solid',base:'#ff0000'};
 const frame=normalizeFrame({fixedBackground:true,background:{mode:'dots',base:'#112233',color:'#ffffff',opacity:30,size:6,spacing:39,rotation:23}});
 const canvas=()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;return c;};
 const expected=canvas();renderSlide(expected.getContext('2d'),s,theme,{background:frame.background});
 const from=canvas(),to=canvas();renderSlide(from.getContext('2d'),s,theme,{omitBackground:true});renderSlide(to.getContext('2d'),s,theme,{omitBackground:true});
 const blank=from.getContext('2d').getImageData(0,0,1,1).data[3]===0,checks=[];
 for(const direction of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}])for(const progress of [.17,.5,.83]){
 const c=canvas(),ctx=c.getContext('2d');renderSlideBackground(ctx,s,theme,{background:frame.background});drawSlideTransition(ctx,from,to,direction,progress);checks.push(c.toDataURL()===expected.toDataURL());}
 // Contents still move while the background remains fixed.
 const g=from.getContext('2d');g.fillStyle='#ff0000';g.fillRect(1200,400,80,80);
 const c=canvas(),ctx=c.getContext('2d');renderSlideBackground(ctx,s,theme,{background:frame.background});drawSlideTransition(ctx,from,to,{x:1,y:0},.5);
 const pixel=ctx.getImageData(250,410,1,1).data;
 return {blank,checks,moved:pixel[0]===255&&pixel[1]===0&&pixel[2]===0};
 });assert.equal(result.blank,true);assert.ok(result.checks.every(Boolean));assert.equal(result.moved,true);assert.deepEqual(errors,[]);
 console.log('OK: common background persisted, individual settings restored, stationary pixels in four directions, content moves');
}finally{await browser.close();}
