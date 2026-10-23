const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
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
    page.setDefaultTimeout(5000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(async () => {
      const { createApp, h, ref, nextTick } =
        await import("/node_modules/.vite/deps/vue.js");
      const { default: Studio } = await import("/src/StudioApp.vue");
      const host = document.createElement("div");
      host.style = "position:fixed;inset:0;z-index:2000";
      document.body.append(host);
      const v = ref(null);
      createApp({
        render: () =>
          h(Studio, {
            ref: v,
            application: "animation",
            initialView: "slides",
          }),
      }).mount(host);
      await nextTick();
      window.live = () => v.value.getStudio();
      window.tick = nextTick;
      const s = live();
      s.workspace.value = "editor";
      await tick();
      const { makeSlide } = await import("/src/model.js");
      const { normalizeAnimation } = await import("/src/animationModel.js");
      const { normalizeShape } = await import("/src/shapes.js");
      const scene = makeSlide("title");
      Object.assign(scene, {
        elements: { shape: normalizeShape({ shape: "circle" }) },
        positions: { shape: { x: 100, y: 100, w: 200, h: 200 } },
        fragments: { shape: { order: 0, animation: "none" } },
        blockKeys: ["shape"],
        animation: normalizeAnimation({
          duration: 8,
          fps: 30,
          background: "gradient",
          color: "#224466",
          colorRole: "accent",
          color2: "#667788",
          gradientAngle: 45,
          clips: [
            {
              id: "movement",
              keys: ["shape"],
              start: 1,
              duration: 6,
              frames: [
                { field: "x", time: 1, value: 100 },
                { field: "x", time: 3, value: 500 },
                { field: "y", time: 1, value: 100 },
              ],
            },
          ],
        }),
      });
      s.slides.value = [scene];
      s.index.value = 0;
      await tick();
      s.animation.selectedClip.value = "movement";
    });

    await page.getByRole('button',{name:'Scène · propriétés',exact:true}).click();
    await page.locator('[data-drawer="animation-scene"] > summary').click();
    const duration=page.locator('.timecode-input').filter({has:page.locator('legend', {hasText:'Durée de la scène'})}).first();
    assert.equal(await duration.locator('input').count(),3);
    assert.equal(await duration.getByLabel('Durée de la scène · heures',{exact:true}).count(),0);
    const minutes=duration.getByLabel('Durée de la scène · minutes',{exact:true});
    const seconds=duration.getByLabel('Durée de la scène · secondes',{exact:true});
    const frames=duration.getByLabel('Durée de la scène · images',{exact:true});
    await minutes.fill('01');await minutes.press('Tab');
    await seconds.fill('12');await seconds.press('Tab');
    await frames.fill('15');await frames.press('Tab');
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),72.5);
    await page.evaluate(()=>live().undo());
    await page.locator('[data-drawer="animation-scene"]').evaluate(el=>el.open=true);
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),72);
    await frames.fill('30');await frames.press('Tab');
    assert.equal(await frames.getAttribute('aria-invalid'),'true');
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),72);
    await frames.fill('00');await frames.press('Tab');
    await page.locator('.inspector').getByLabel('Fréquence').selectOption('24');
    await frames.fill('12');await frames.press('Tab');
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),72.5);
    await minutes.fill('03');await minutes.press('Tab');
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),120);
    assert.equal(await minutes.inputValue(),'02');
    assert.equal(await seconds.inputValue(),'00');
    assert.equal(await frames.inputValue(),'00');
    await minutes.fill('00');await minutes.press('Tab');
    assert.equal(await page.evaluate(()=>live().animation.config.value.duration),.125);
    assert.equal(await frames.inputValue(),'03');
    await page.screenshot({path:'/tmp/frame-scene-duration-dark.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='light');
    await page.screenshot({path:'/tmp/frame-scene-duration-light.png'});
    assert.deepEqual(errors,[]);
    console.log('Scene duration: minutes/seconds/frames, 30/24fps, undo, invalid frames and duration limits passed');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
