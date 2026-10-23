const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(localhost|127\.0\.0\.1):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(async () => {
      const { createApp, h, ref, nextTick } =
        await import("/node_modules/.vite/deps/vue.js");
      const { default: Studio } = await import("/src/StudioApp.vue");
      const host = document.createElement("div");
      host.style = "position:fixed;inset:0;z-index:9999";
      document.body.append(host);
      const view = ref();
      createApp({
        render: () =>
          h(Studio, {
            ref: view,
            application: "animation",
            initialView: "slides",
          }),
      }).mount(host);
      await nextTick();
      window.live = () => view.value.getStudio();
      window.tick = nextTick;
      const s = live(),
        a = s.animation;
      s.workspace.value = "editor";
      const scene = JSON.parse(JSON.stringify(s.current.value));
      Object.assign(scene, {
        id: "qa-presence",
        elements: {},
        positions: {},
        fragments: {},
        blockKeys: [],
        groups: [],
        background: null,
      });
      const { normalizeAnimation } = await import("/src/animationModel.js");
      scene.animation = normalizeAnimation({
        duration: 10,
        background: "transparent",
      });
      s.slides.value = [scene];
      s.index.value = 0;
      await nextTick();
      a.setAutoKey(false);
      a.config.value.duration = 20;
      a.seek(5);
    });
    await page.getByRole("button", { name: "Insérer", exact: true }).click();
    await page
      .getByRole("button", { name: "Compteur animé", exact: true })
      .click();
    const key = await page.evaluate(() => live().selected.value);
    assert.equal(await page.evaluate(() => live().selectedType.value), "text");
    assert.equal(
      await page.evaluate(
        (key) => live().animation.config.value.presences[key].start,
        key,
      ),
      5,
    );
    assert.equal(await page.locator(".text-dialog").count(), 0);
    await page.evaluate(({key})=>live().animation.setPresence([key],'end',15+1/30),{key});
    assert.equal(await page.locator('.inspector [data-drawer]').first().getAttribute('data-drawer'),'animation-presence');

    await page.getByText('Compteur animé',{exact:true}).click();
    await page.getByLabel('Valeur d’arrivée',{exact:true}).fill('38000');
    await page.getByText('Présence dans la scène',{exact:true}).click();
    assert.equal(await page.getByLabel('Maintien final · secondes',{exact:true}).inputValue(),'00');
    await page.getByLabel('Disparaît à · images',{exact:true}).fill('00');
    await page.getByLabel('Disparaît à · images',{exact:true}).press('Tab');
    await page.getByLabel('Animation de disparition',{exact:true}).selectOption('fade');
    await page.getByLabel('Durée de disparition · s',{exact:true}).fill('1');
    await page.getByLabel('Maintien final · secondes',{exact:true}).fill('02');
    await page.getByLabel('Maintien final · secondes',{exact:true}).press('Tab');
    assert.equal(await page.evaluate(({key})=>live().animation.config.value.presences[key].holdDuration,{key}),2);
    assert.equal(await page.locator('.presence-hold-zone').count(),1);
    assert.equal(await page.locator('.presence-exit-zone').count(),1);
    const sample=async time=>page.evaluate(async({key,time})=>{
      const s=live(),{animationScene}=await import('/src/animationModel.js');
      const state=animationScene(s.current.value,s.animation.config.value,time);
      return {text:state.scene.elements[key].text,alpha:state.presence[key].alpha,visible:state.presence[key].visible,roll:state.scene.counterFrames?.[key]};
    },{key,time});
    await page.getByText('Compteur animé',{exact:true}).click();
    assert.equal(await page.getByLabel('Durée du comptage calculée · secondes',{exact:true}).inputValue(),'07');
    for(const display of ['replace','scroll']) {
      await page.getByLabel('Affichage du compteur',{exact:true}).selectOption(display);
      for(const easing of ['linear','smooth','easeIn','easeOut']) {
        await page.getByLabel('Rythme du compteur',{exact:true}).selectOption(easing);
        for(const time of [12,13,14]) {const v=await sample(time);assert.equal(v.text,'38000');assert.equal(v.alpha,1);if(display==='scroll')assert.equal(v.roll.progress,0);}
        assert.equal((await sample(14.5)).text,'38000');assert((await sample(14.5)).alpha>0 && (await sample(14.5)).alpha<1);
        assert.equal((await sample(15)).visible,false);
      }
    }
    await page.evaluate(()=>live().animation.seek(13));
    await page.getByText('Présence dans la scène',{exact:true}).click();
    await page.screenshot({path:'/tmp/frame-counter-hold-dark.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='light');
    await page.screenshot({path:'/tmp/frame-counter-hold-light.png'});
    const restored=await page.evaluate(async({key})=>{
      const {normalizeSlides}=await import('/src/model.js');
      return normalizeSlides(JSON.parse(JSON.stringify(live().slides.value)))[0].animation.presences[key];
    },{key});assert.equal(restored.holdDuration,2);
    await page.evaluate(async()=>{live().addShape('circle');await tick();});
    assert.equal(await page.getByLabel('Maintien final · secondes',{exact:true}).inputValue(),'00');
    await page.getByLabel('Maintien final · secondes',{exact:true}).fill('01');
    await page.getByLabel('Maintien final · secondes',{exact:true}).press('Tab');
    assert.equal(await page.evaluate(()=>live().animation.config.value.presences[live().selected.value].holdDuration),1);
    await page.evaluate(()=>live().undo());
    assert.equal(await page.evaluate(()=>Object.values(live().animation.config.value.presences).filter(p=>p.holdDuration===1).length),0);
    assert.deepEqual(errors,[]);
    console.log('Final hold: UI, 38000 visible before/during fade, both displays and all rates, shared shapes, undo and JSON passed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
