import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.FRAME_PLAYWRIGHT_MODULE||'playwright'),url=process.env.FRAME_TEST_URL;
if(!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url||''))throw Error('Isolated server required');
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/#/diaporamas');await page.getByRole('button',{name:'Diapo · propriétés',exact:true}).click();await page.locator('[data-drawer="scene-background"] summary').click();await page.getByLabel('Fond commun fixe sur toutes les diapos').check();await page.getByLabel('Type de fond',{exact:true}).selectOption('dots');await page.getByLabel('Rotation du fond · valeur',{exact:true}).fill('37');await page.getByRole('button',{name:'Présenter',exact:true}).click();await page.waitForTimeout(800);
 const laser=page.getByRole('button',{name:'Laser',exact:true}),canvas=page.locator('canvas[aria-label^="Diapo"]');
 assert.equal(await laser.getAttribute('aria-pressed'),'false');assert.equal(await canvas.evaluate(c=>getComputedStyle(c).cursor),'none');
 const box=await canvas.boundingBox(),point={x:box.x+box.width*.035,y:box.y+box.height*.045};
 const patch=()=>canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(Math.round(c.width*.035)-18,Math.round(c.height*.045)-18,36,36).data).join(','));
 const before=await patch();await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+3,point.y+3);await page.mouse.up();await page.waitForTimeout(100);assert.equal(await patch(),before,'Refocusing does not draw a laser');
 await laser.click();await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+8,point.y+3,{steps:4});await page.mouse.up();await page.waitForTimeout(60);assert.notEqual(await patch(),before,'Explicit laser draws into the scene');
 await laser.click();await page.mouse.move(point.x,point.y);await page.waitForTimeout(80);assert.equal(await patch(),before,'Disabling immediately removes the laser and trail');
 // The actual presentation compositor must keep the patterned background stationary.
 await page.evaluate(()=>{window.__backgroundFrames=[];const c=document.querySelector('canvas[aria-label^="Diapo"]');const start=performance.now();function sample(){window.__backgroundFrames.push(Array.from(c.getContext('2d').getImageData(0,0,70,70).data).join(','));if(performance.now()-start<850)requestAnimationFrame(sample);}sample();});
 await page.keyboard.press('ArrowRight');await page.waitForTimeout(950);
 const frames=await page.evaluate(()=>window.__backgroundFrames);assert.ok(frames.length>8);assert.equal(new Set(frames).size,1,'No pattern movement in the real presentation');
 await laser.click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Présenter',exact:true}).click();assert.equal(await laser.getAttribute('aria-pressed'),'false','New presentations start without laser');
 assert.deepEqual(errors,[]);console.log('OK: focus clicks and motion leave no marks; laser toggles and clears; native cursor hidden; presentation background fixed; next presentation resets laser');
}finally{await browser.close();}
