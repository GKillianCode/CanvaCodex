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
    await page.locator('.animation-object-track[data-object="shape"] button[aria-expanded]').click();
    const tooltip = page.getByLabel("Position de l’image clé", { exact: true });
    const diamond = () =>
      page.locator(".key-diamond").filter({ hasText: "◆" }).first();
    async function drag(delta, steps = 5) {
      const key = diamond();
      await key.scrollIntoViewIfNeeded();
      const b = await key.boundingBox(),
        lane = await key.locator("..").boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        b.x + b.width / 2 + (delta / 8) * lane.width,
        b.y + b.height / 2,
        { steps },
      );
    }
    await drag(0.5);
    await tooltip.waitFor();
    assert.match(await tooltip.innerText(), /2,500 s/);
    assert.match(await tooltip.innerText(), /Image 75/);
    assert.equal(
      await page.evaluate(
        () =>
          live().animation.clip.value.frames.find(
            (f) => f.field === "x" && f.value === 100,
          ).time,
      ),
      1.5,
    );
    await page.mouse.up();
    await tooltip.waitFor({ state: "hidden" });
    // Collision reports the actual unchanged time, not the attempted cursor position.
    await drag(1.5, 1);
    assert.match(await tooltip.innerText(), /2,500 s/);
    assert.match(await tooltip.innerText(), /Emplacement occupé/);
    await page.mouse.up();
    // Zoom and horizontal scroll keep scene-global time and group movement accurate.
    await page.locator(".animation-tracks").hover();
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -350);
    await page.keyboard.up("Control");
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const t = document.querySelector(".animation-tracks");
      t.scrollLeft = 100;
      const a = live().animation,
        c = a.clip.value;
      a.selectKey(
        c,
        c.frames.find((f) => f.field === "x" && f.value === 100),
      );
      a.selectKey(
        c,
        c.frames.find((f) => f.field === "y"),
        true,
      );
      document.documentElement.dataset.appearance = "light";
    });
    await drag(0.5);
    assert.match(await tooltip.innerText(), /3,000 s/);
    assert.match(await tooltip.innerText(), /Image 90/);
    await page.mouse.up();
    assert.equal(
      await page.evaluate(
        () =>
          live().animation.clip.value.frames.find((f) => f.field === "y").time,
      ),
      1.5,
    );
    // Losing window focus must clean up the time bubble too.
    await drag(0.1);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await tooltip.waitFor({ state: "hidden" });
    await page.mouse.up();
    // Creating a scene copies background settings only, with independent configuration.
    assert.deepEqual(
      await page.evaluate(async () => {
        const s = live(),
          prev = s.slides.value[0];
        s.add();
        await tick();
        const next = s.current.value;
        const fields = [
          "background",
          "color",
          "colorRole",
          "color2",
          "gradientAngle",
        ];
        const matches = fields.every(
          (k) => prev.animation[k] === next.animation[k],
        );
        next.animation.color2 = "#ffffff";
        return {
          matches,
          independent: prev.animation.color2 === "#667788",
          clips: next.animation.clips.length,
          objects: Object.keys(next.elements).length,
        };
      }),
      { matches: true, independent: true, clips: 0, objects: 0 },
    );
    for (const background of ["solid", "transparent"])
      assert.equal(
        await page.evaluate(async (background) => {
          const s = live();
          s.current.value.animation.background = background;
          s.add();
          await tick();
          return s.current.value.animation.background;
        }, background),
        background,
      );
    assert.deepEqual(errors, []);
    console.log(
      "Key drag time: exact scene seconds/frames, collision, zoom, multi-selection, blur cleanup; new-scene backgrounds OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
