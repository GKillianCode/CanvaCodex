import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright');
const url=process.env.FRAME_TEST_URL;if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url||''))throw Error('Isolated server required');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
try{
const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const [route,tab] of [['diaporamas','Diapo'],['incrustations','Format'],['miniatures','Format'],['animations','Scène']]){
 await page.goto(url+'/#/'+route);await page.getByRole('button',{name:tab+' · propriétés',exact:true}).click();
 const drawer=page.locator('[data-drawer="scene-background"]');await drawer.locator('summary').click();
 await drawer.getByLabel('Type de fond',{exact:true}).selectOption('dots');
 await drawer.getByLabel('Rotation du fond · valeur',{exact:true}).fill('27');
 await drawer.getByLabel('Rotation du fond · valeur',{exact:true}).dispatchEvent('change');
 await drawer.getByLabel('Opacité du motif · valeur',{exact:true}).fill('24');
 await page.waitForTimeout(800);await page.reload();
 await page.getByRole('button',{name:tab+' · propriétés',exact:true}).click();await page.locator('[data-drawer="scene-background"] summary').click();
 assert.equal(await page.getByLabel('Type de fond',{exact:true}).inputValue(),'dots');
 assert.equal(await page.getByLabel('Rotation du fond · valeur',{exact:true}).inputValue(),'27');
 if(route==='incrustations'){
 await page.screenshot({path:'/tmp/frame-background-dark.png'});
 await page.evaluate(()=>document.documentElement.dataset.appearance='light');
 await page.getByRole('button',{name:'Papier à points',exact:true}).click();
 await page.waitForTimeout(150);await page.screenshot({path:'/tmp/frame-background-light.png'});
 await page.evaluate(()=>document.documentElement.dataset.appearance='dark');
 }
}
const results=await page.evaluate(async()=>{
 const {drawSceneBackground,backgroundModes}=await import('/src/sceneBackground.js');const {makeSlide,normalizeSlide}=await import('/src/model.js');const {renderSlide,renderStepTransition}=await import('/src/render.js');const {renderOverlayFrame}=await import('/src/overlayVideo.js');
 const theme={bg:'#101820',accent:'#00ff00',secondary:'#ff0000',panel:'#112233',ink:'#ffffff'};
 const canvas=()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;return c;};
 const checks=[];for(const [mode] of backgroundModes.filter(([m])=>!['inherit','transparent'].includes(m))){
 const c=canvas();drawSceneBackground(c.getContext('2d'),{mode,base:'#112233',color:'#ffffff',opacity:30,size:6,spacing:24,rotation:27},theme);
 const image=await createImageBitmap(await new Promise(resolve=>c.toBlob(resolve)));const restored=canvas();restored.getContext('2d').drawImage(image,0,0);checks.push(c.toDataURL()===restored.toDataURL());}
 const s=normalizeSlide(makeSlide());s.background={mode:'dots',base:'#112233',color:'#ffffff',opacity:30,size:6,spacing:24,rotation:27};s.hiddenKeys=[...s.blockKeys];const a=canvas(),b=canvas(),d=canvas();renderSlide(a.getContext('2d'),s,theme,{transparent:true});renderOverlayFrame(b.getContext('2d'),s,theme,{background:'transparent',duration:2},0);renderStepTransition(d.getContext('2d'),s,s,theme,.5,{transparent:true});
 checks.push(a.toDataURL()===b.toDataURL(),a.toDataURL()===d.toDataURL());
 const pixels=a.getContext('2d').getImageData(0,0,1920,1080).data;checks.push(pixels.some((v,i)=>i%4===0&&v!==17));
 return checks;
});assert.ok(results.every(Boolean),JSON.stringify(results));assert.deepEqual(errors,[]);
console.log('OK: four editors, persisted pattern controls, PNG pixels, overlay video and transition rendering');
}finally{await browser.close();}
