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

    // A legacy animated object still gets one lifetime drawer (no presence map required).
    const group = page.locator('.animation-object-track[data-object="shape"]');
    assert.equal(await group.count(), 1);
    assert.equal(await page.locator('.presence-track').count(), 0);
    const toggle = group.locator('button[aria-expanded]');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.key-diamond').count(), 3);
    assert.equal(await page.locator('.frame-marker:not(.empty)').count(), 0,
      'Expanded properties must not duplicate keyed markers on the summary');
    assert.equal(await group.locator('.presence-span').count(), 1);
    await toggle.click();
    assert.equal(await page.locator('.animation-sequence-track').count(), 0);
    assert.equal(await page.locator('.key-diamond').count(), 0);
    await toggle.click();
    assert.equal(await page.locator('.key-diamond').count(), 3);
    const sequence = page.locator('.animation-sequence-track');
    await sequence.getByTitle('Replier les propriétés').click();
    assert.equal(await page.locator('.key-diamond').count(), 0);
    assert.equal(await page.locator('.frame-marker').count(), 2);
    await page.getByLabel('Image clé à 3 secondes', {exact:true}).dblclick();
    assert.equal(await page.evaluate(()=>live().animation.time.value),4);
    await sequence.getByTitle('Déplier les propriétés').click();
    assert.equal(await page.locator('.key-diamond').count(), 3);
    // Effects stay inside their owner. Multiple sequences share one drawer.
    await page.evaluate(async()=>{
      const a=live().animation.config.value;
      a.clips.push({...JSON.parse(JSON.stringify(a.clips[0])),id:'second',name:'Deuxième mouvement'});
      a.effects.push({id:'fade-test',key:'shape',kind:'fade',name:'Fondu test',enabled:true,start:2,duration:1});
      await tick();
    });
    assert.equal(await page.locator('.animation-object-track').count(),1);
    assert.equal(await page.locator('.animation-sequence-track').count(),2);
    assert.equal(await page.locator('.effect-timeline-track').count(),1);
    await toggle.click();
    assert.equal(await page.locator('.animation-sequence-track').count(),0);
    assert.equal(await page.locator('.effect-timeline-track').count(),0);
    await toggle.click();
    await page.evaluate(async()=>{
      const s=live(),a=s.animation.config.value;
      s.current.value.elements.other={...s.current.value.elements.shape,name:'Autre objet'};
      s.current.value.positions.other={x:300,y:200,w:100,h:100};
      s.current.value.fragments.other={order:0,animation:'none'};
      s.current.value.blockKeys.push('other');
      a.presences.other={start:2,end:6};
      a.clips[1].keys=['shape','other'];
      a.clips.push({...JSON.parse(JSON.stringify(a.clips[0])),id:'global',name:'Caméra',keys:[]});
      await tick();
    });
    assert.equal(await page.locator('.animation-object-track').count(),3);
    assert.equal(await page.locator('.animation-sequence-track').count(),2,
      'Multi-target sequence appears once, global drawer starts collapsed');
    await page.getByLabel('Pistes de la sélection').check();
    assert.equal(await page.locator('.animation-object-track').count(),2,
      'Selection keeps selected owner and global tracks');
    await page.getByLabel('Pistes de la sélection').uncheck();
    assert.equal(await page.locator('.animation-object-track').count(),3);
    await page.locator('.animation-timeline').evaluate(el=>el.style.height='440px');
    await page.screenshot({path:'/tmp/frame-timeline-group-dark.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='light');
    await page.screenshot({path:'/tmp/frame-timeline-group-light.png'});
    assert.deepEqual(errors,[]);
    console.log('Timeline object drawers, integrated lifetime, unique key markers and nested effects passed');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
