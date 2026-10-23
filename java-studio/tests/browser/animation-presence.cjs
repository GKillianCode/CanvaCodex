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
      a.seek(5);
      s.addShape("circle");
      await nextTick();
      window.object = s.selected.value;
      s.current.value.positions[object] = {
        x: 200,
        y: 200,
        w: 200,
        h: 200,
        size: 38,
      };
      a.seek(5);
      s.addBlock("text");
      window.title = s.selected.value;
      s.closeEdit();
      await nextTick();
      window.sample = async (t) => {
        const { renderAnimation } = await import("/src/animationRender.js");
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        a.seek(t);
        await nextTick();
        renderAnimation(ctx, s.current.value, s.theme.value, a.config.value, t);
        return ctx.getImageData(300, 300, 1, 1).data[3];
      };
    });
    assert.equal(
      await page.evaluate(
        () => live().animation.config.value.presences[title].start,
      ),
      5,
    );
    assert.equal(
      await page.evaluate(() => live().animation.config.value.clips.length),
      0,
      "Presence must not require a clip or opacity keys",
    );
    await page.getByText("Présence dans la scène", { exact: true }).click();
    assert.equal(
      await page.getByLabel("Apparaît à · secondes").inputValue(),
      "05",
    );
    await page.evaluate(() => live().animation.seek(7));
    await page
      .getByRole("button", { name: "Terminer au curseur", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Disparaît à · secondes").inputValue(),
      "07",
    );
    assert.equal(
      await page.evaluate(
        () => live().animation.config.value.presences[title].end,
      ),
      7,
    );
    // Same interval on the circle allows a pixel-level preview/export-render check.
    await page.evaluate(() => live().animation.setPresence([object], "end", 7));
    for (const [t, visible] of [
      [4, false],
      [5, true],
      [6, true],
      [7, false],
      [9, false],
    ]) {
      const alpha = await page.evaluate((t) => sample(t), t);
      assert.equal(alpha > 0, visible, `Render presence at ${t}`);
    }
    await page.evaluate(() => {
      live().animation.seek(4);
      live().deselect();
    });
    const hiddenPoint = await page.evaluate(() => {
      const r = live().canvas.value.getBoundingClientRect();
      return {
        x: r.left + ((300 + 320) / 2560) * r.width,
        y: r.top + ((250 + 180) / 1440) * r.height,
      };
    });
    await page.mouse.click(hiddenPoint.x, hiddenPoint.y);
    assert.equal(
      await page.evaluate(() => live().selected.value),
      null,
      "An absent object must not intercept canvas selection",
    );
    assert.equal(await page.locator(".presence-track").count(), 2);
    // Drag the right handle in the shared timeline to extend the circle by one second.
    await page.evaluate(() => live().selectLayer(object));
    const handle = page.getByLabel(
      await page.evaluate(() => "Fin de présence de " + object),
    );
    await handle.scrollIntoViewIfNeeded();
    const box = await handle.boundingBox(),
      lane = await handle.locator("..").locator("..").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + lane.width / 10,
      box.y + box.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
    assert(
      Math.abs(
        (await page.evaluate(
          () => live().animation.config.value.presences[object].end,
        )) - 8,
      ) < 0.04,
    );
    await page.evaluate(async () => {
      live().undo();
      await tick();
    });
    assert.equal(
      await page.evaluate(
        () => live().animation.config.value.presences[object].end,
      ),
      7,
    );
    await page.evaluate(async () => {
      live().redo();
      await tick();
    });
    assert(
      Math.abs(
        (await page.evaluate(
          () => live().animation.config.value.presences[object].end,
        )) - 8,
      ) < 0.04,
    );
    // Fade-out is applied only to the render copy and multiplies the base opacity.
    await page.evaluate(() => {
      const a = live().animation;
      a.setPresence([object], "exit", "fade");
      a.setPresence([object], "exitDuration", 0.4);
    });
    const faded = await page.evaluate(() => sample(7.9));
    assert(faded > 0 && faded < 255);
    assert.equal(
      await page.evaluate(() => live().current.value.positions[object].opacity),
      undefined,
    );
    await page.evaluate(() => live().animation.seek(6));
    await page.screenshot({ path: "/tmp/frame-object-presence-dark.png" });
    await page.evaluate(
      () => (document.documentElement.dataset.appearance = "light"),
    );
    await page.screenshot({ path: "/tmp/frame-object-presence-light.png" });
    // Existing history and document normalization retain the independent interval.
    const restored = await page.evaluate(async () => {
      const { normalizeSlides } = await import("/src/model.js");
      const s = live();
      return normalizeSlides(JSON.parse(JSON.stringify(s.slides.value)))[0]
        .animation.presences;
    });
    assert.equal(restored[await page.evaluate(() => title)].end, 7);
    const headerMetrics = await page
      .locator(".animation-timeline-header")
      .evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        legend: getComputedStyle(el.querySelector("legend")).position,
        tools: el.querySelector(".bottom-tools").getBoundingClientRect().height,
      }));
    assert(headerMetrics.height <= 56, JSON.stringify(headerMetrics));
    assert.equal(headerMetrics.legend, "absolute");
    assert.equal(
      await page
        .locator('.animation-timeline [aria-label="Aperçu plein écran"]')
        .count(),
      0,
    );
    const loop = page.getByRole("button", { name: "Boucle", exact: true });
    await loop.click();
    assert.equal(await loop.getAttribute("aria-pressed"), "false");
    await loop.click();
    assert.equal(await loop.getAttribute("aria-pressed"), "true");
    await page.setViewportSize({ width: 1000, height: 850 });
    assert(
      (await page.locator(".animation-timeline-header").boundingBox()).height <=
        56,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Presence without auto keys/clips: insertion at cursor, timecode start/end, shared render boundaries/fades, draggable timeline, JSON normalization, light/dark OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
