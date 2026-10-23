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
    await page.getByText("Compteur animé", { exact: true }).click();
    await page.getByLabel("Valeur d’arrivée", { exact: true }).fill("1000");
    await page.getByLabel("Valeur d’arrivée", { exact: true }).press("Tab");
    const sample = async (time) =>
      page.evaluate(
        async ({ key, time }) => {
          const s = live(),
            { animationScene } = await import("/src/animationModel.js");
          const result = animationScene(
            s.current.value,
            s.animation.config.value,
            time,
          );
          return {
            text: result.scene.elements[key].text,
            visible: result.presence[key].visible,
            font: result.scene.positions[key].font,
          };
        },
        { key, time },
      );
    assert.deepEqual(await sample(5), {
      text: "0000",
      visible: true,
      font: "jetbrains-mono",
    });
    assert.equal((await sample(10)).text, "0500");
    assert.equal((await sample(15)).text, "1000");
    assert.equal((await sample(4)).visible, false);
    await page.getByLabel("Durée du défilement · secondes").fill("04");
    await page.getByLabel("Durée du défilement · secondes").press("Tab");
    assert.equal((await sample(7)).text, "0500");
    await page.getByLabel("Texte avant", { exact: true }).fill("Total : ");
    await page.getByLabel("Texte avant", { exact: true }).press("Tab");
    await page.getByLabel("Texte après", { exact: true }).fill(" pts");
    await page.getByLabel("Texte après", { exact: true }).press("Tab");
    assert.equal((await sample(7)).text, "Total : 0500 pts");
    // Render path used by preview and export, including the standard font/style.
    const rendered = await page.evaluate(
      async ({ key }) => {
        const s = live(),
          { renderAnimation } = await import("/src/animationRender.js");
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d"),
          texts = [],
          fill = ctx.fillText.bind(ctx);
        ctx.fillText = (text, ...args) => {
          texts.push(text);
          fill(text, ...args);
        };
        renderAnimation(
          ctx,
          s.current.value,
          s.theme.value,
          s.animation.config.value,
          7,
        );
        return texts.join("");
      },
      { key },
    );
    assert(rendered.includes("0500"));
    // Scroll whole values through a clipped text window with standard keyframed styling.
    await page.getByLabel('Valeur de départ',{exact:true}).fill('2026');
    await page.getByLabel('Valeur d’arrivée',{exact:true}).fill('2022');
    await page.getByLabel('Texte avant',{exact:true}).fill('');
    await page.getByLabel('Texte après',{exact:true}).fill('');
    await page.getByLabel('Affichage du compteur',{exact:true}).selectOption('scroll');
    await page.evaluate(({key})=>{
      const s=live(),a=s.animation.config.value;
      s.current.value.positions[key]={...s.current.value.positions[key],x:200,y:200,w:600,h:160,autoSize:false};
      a.clips.push({id:'counter-style',name:'Couleur du compteur',keys:[key],enabled:true,start:5,duration:4,easing:'linear',frames:[{field:'color',time:0,value:'#ff0000',ease:'linear'},{field:'color',time:4,value:'#0000ff',ease:'linear'}]});
    },{key});
    for(const direction of ['up','down','left','right']) {
      await page.getByLabel('Sens du défilement',{exact:true}).selectOption(direction);
      const render=await page.evaluate(async({key})=>{
        const s=live(),{renderAnimation}=await import('/src/animationRender.js');
        const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;
        const ctx=canvas.getContext('2d'),calls=[],fill=ctx.fillText.bind(ctx);
        ctx.fillText=(text,...args)=>{const m=ctx.getTransform();calls.push({text,color:ctx.fillStyle,font:ctx.font,x:m.e,y:m.f});fill(text,...args);};
        renderAnimation(ctx,s.current.value,s.theme.value,s.animation.config.value,5.5);
        let outside=0;for(let y=0;y<1080;y+=5)for(let x=0;x<1920;x+=5)if((x<200||x>=800||y<200||y>=360)&&ctx.getImageData(x,y,1,1).data[3])outside++;
        return {calls,outside};
      },{key});
      assert.equal(render.outside,0,'Counter pixels must remain inside its window');
      assert(render.calls.some(c=>c.text.includes('2026')));
      assert(render.calls.some(c=>c.text.includes('2025')));
      const first=render.calls.find(c=>c.text.includes('2026')),next=render.calls.find(c=>c.text.includes('2025'));
      assert.equal(first.color,next.color);assert.notEqual(first.color,'#ff0000');
      assert.match(first.font,/JetBrains/);
      assert.equal(Math.sign(direction==='left'||direction==='right'?first.x:first.y),['left','up'].includes(direction)?-1:1);
      assert.equal(Math.sign(direction==='left'||direction==='right'?next.x:next.y),['left','up'].includes(direction)?1:-1);
    }
    await page.evaluate(()=>live().animation.seek(5.5));
    await page.screenshot({path:'/tmp/frame-counter-scroll-dark.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='light');
    await page.screenshot({path:'/tmp/frame-counter-scroll-light.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='dark');
    await page.getByLabel('Affichage du compteur',{exact:true}).selectOption('replace');
    await page.getByLabel('Valeur de départ',{exact:true}).fill('0');
    await page.getByLabel('Valeur d’arrivée',{exact:true}).fill('1000');
    await page.getByLabel('Texte avant',{exact:true}).fill('Total : ');
    await page.getByLabel('Texte après',{exact:true}).fill(' pts');
    await page
      .getByLabel("Type de compteur", { exact: true })
      .selectOption("time");
    // Reset both values using the same numeric timecode input as the scene.
    for (const [name, value] of [
      ["Valeur de départ · secondes", "59"],
      ["Valeur d’arrivée · heures", "01"],
      ["Valeur d’arrivée · minutes", "01"],
      ["Valeur d’arrivée · secondes", "01"],
    ]) {
      await page.getByLabel(name, { exact: true }).fill(value);
      await page.getByLabel(name, { exact: true }).press("Tab");
    }
    await page.getByLabel("Séparateur", { exact: true }).fill(".");
    await page.getByLabel("Séparateur", { exact: true }).press("Tab");
    assert.equal((await sample(5)).text, "Total : 00.00.59 pts");
    assert.equal((await sample(9)).text, "Total : 01.01.01 pts");
    const restored = await page.evaluate(async () => {
      const { normalizeSlides } = await import("/src/model.js");
      return normalizeSlides(JSON.parse(JSON.stringify(live().slides.value)))[0]
        .animation.counters;
    });
    assert.equal(restored[key].separator, ".");
    assert.equal(restored[key].to, 3661);
    await page.evaluate(() => live().animation.seek(7));
    await page.screenshot({ path: "/tmp/frame-counter-dark.png" });
    await page.evaluate(
      () => (document.documentElement.dataset.appearance = "light"),
    );
    await page.screenshot({ path: "/tmp/frame-counter-light.png" });
    const duplicate = await page.evaluate(async () => {
      const s = live();
      s.duplicateSelected();
      await tick();
      return {
        key: s.selected.value,
        counter: s.animation.config.value.counters[s.selected.value],
        range: s.animation.config.value.presences[s.selected.value],
      };
    });
    assert.notEqual(duplicate.key, key);
    assert.equal(duplicate.counter.to, 3661);
    assert.equal(duplicate.range.start, 7);
    await page.evaluate(async () => {
      live().undo();
      await tick();
    });
    assert.equal(
      await page.evaluate(
        (key) => !!live().current.value.elements[key],
        duplicate.key,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Counter: shared insertion, text style/font, padding, duration, prefix/suffix, real render, clock carry/separator and JSON roundtrip OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
