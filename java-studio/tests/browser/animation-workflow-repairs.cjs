const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/5289$/.test(base || "")) throw Error("Isolated server required");
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
          await import("/node_modules/.vite/deps/vue.js"),
        { default: Studio } = await import("/src/StudioApp.vue"),
        { makeSlide } = await import("/src/model.js"),
        { normalizeAnimation } = await import("/src/animationModel.js");
      const host = document.createElement("div");
      host.id = "test-studio";
      host.style = "position:fixed;inset:0;z-index:2000";
      document.body.append(host);
      const v = ref();
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
      const scene = makeSlide("title"),
        src =
          "data:image/svg+xml;base64," +
          btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="25" fill="#ff0000"/></svg>',
          );
      Object.assign(scene, {
        title: "Atelier de test SVG",
        blockKeys: ["one", "two", "three"],
        elements: {},
        positions: {},
        fragments: {},
        animation: normalizeAnimation({
          duration: 12,
          fps: 30,
          background: "solid",
        }),
      });
      for (const [i, key] of scene.blockKeys.entries()) {
        scene.elements[key] = {
          type: "image",
          custom: true,
          src,
          name: "SVG " + key,
          fit: "contain",
          svgColors: {},
        };
        scene.positions[key] = {
          x: 200 + i * 250,
          y: 200 + i * 100,
          w: 160,
          h: 160,
        };
        scene.fragments[key] = { order: 0, animation: "none" };
      }
      const s = live();
      s.slides.value = [scene];
      s.index.value = 0;
      s.workspace.value = "editor";
      await nextTick();
      s.selected.value = null;
      s.selectedKeys.value = ["one", "two", "three"];
      await nextTick();
    });
    const root = page.locator("#test-studio");
    assert.equal(await root.locator(".inspector-navigation").count(), 0);
    assert.equal(
      await root
        .getByRole("button", { name: "Composant", exact: true })
        .count(),
      1,
    );
    const changes = await page.evaluate(async () => {
      const s = live();
      s.animation.seek(2);
      s.arrangeObjects("y", "center");
      await tick();
      const y = Object.values(s.animation.editorScene.value.positions).map(
        (p) => p.y,
      );
      s.arrangeObjects("x", "spacing");
      await tick();
      const xs = Object.values(s.animation.editorScene.value.positions).map(
        (p) => p.x,
      );
      s.centerObjects("x");
      await tick();
      return {
        y,
        xs,
        keys: s.current.value.animation.clips.flatMap((c) => c.frames).length,
      };
    });
    assert(changes.y.every((y) => Math.abs(y - changes.y[0]) < 0.01));
    assert(changes.xs[1] > changes.xs[0]);
    assert(changes.keys > 0);
    await page.evaluate(() => live().selectLayer("one"));
    await root.getByRole("button", { name: "Style", exact: true }).click();
    assert.equal(
      await root
        .getByRole("button", { name: "Composant", exact: true })
        .count(),
      0,
    );
    assert.equal(await root.locator(".inspector-object").count(), 0);
    await root.locator('[data-drawer="identity"]>summary').click();
    assert(
      await root
        .locator('[data-drawer="identity"]')
        .getByLabel("Dupliquer la sélection")
        .isVisible(),
    );
    // A second click on a diamond removes its existing key.
    await page.evaluate(() => {
      const s = live();
      s.selectLayer("one");
      s.animation.seek(2);
    });
    await root.getByRole("button", { name: "Placement", exact: true }).click();
    await root.locator('[data-drawer="geometry"]>summary').click();
    const diamond = root.getByLabel("Clé · x", { exact: true });
    await diamond.click();
    assert.equal(await diamond.getAttribute("aria-pressed"), "false");
    await diamond.click();
    assert.equal(await diamond.getAttribute("aria-pressed"), "true");
    await root.getByRole("button", { name: "Couleurs", exact: true }).click();
    await root.locator('[data-drawer="svg-colors"]>summary').click();
    const colour = root.getByLabel("Clé · svgColor:%23ff0000", { exact: true });
    await colour.click();
    await page.evaluate(() => live().animation.seek(4));
    await root
      .locator('[data-drawer="svg-colors"] input[type="color"]')
      .fill("#00ff00");
    await page.evaluate(() => live().animation.seek(3));
    const interpolated = await page.evaluate(
      () =>
        live().animation.editorScene.value.elements.one.svgColors["#ff0000"]
          .color,
    );
    assert.equal(interpolated, "#808000");
    const multi = await page.evaluate(async () => {
      const s = live(),
        { svgColorField } = await import("/src/svgColors.js"),
        field = svgColorField("#ff0000");
      s.current.value.elements.three.svgColors = {
        "#ff0000": { color: "#0000ff" },
      };
      s.selected.value = null;
      s.selectedKeys.value = ["two", "three"];
      s.animation.seek(3);
      s.animation.toggleProperty(field);
      const initial = ["two", "three"].map(
        (k) =>
          s.animation.editorScene.value.elements[k].svgColors["#ff0000"].color,
      );
      s.animation.seek(4);
      s.animation.setProperty(field, "#ffff00");
      const final = ["two", "three"].map(
        (k) =>
          s.animation.editorScene.value.elements[k].svgColors["#ff0000"].color,
      );
      return { initial, final };
    });
    assert.deepEqual(multi.initial, ["#ff0000", "#0000ff"]);
    assert.deepEqual(multi.final, ["#ffff00", "#ffff00"]);
    // Group drag updates all visible objects before committing, not just an outline.
    await page.evaluate(() => {
      const s = live();
      s.selected.value = null;
      s.selectedKeys.value = ["one", "two", "three"];
      s.animation.seek(3);
      s.panels.value.snapping = false;
    });
    const canvas = root.locator(".stage-wrap canvas").first(),
      box = await canvas.boundingBox();
    const before = await page.evaluate(() =>
      JSON.parse(JSON.stringify(live().animation.editorScene.value.positions)),
    );
    const point = {
      x: box.x + ((before.one.x + 40 + 320) / 2560) * box.width,
      y: box.y + ((before.one.y + 40 + 180) / 1440) * box.height,
    };
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 50, point.y + 30, { steps: 8 });
    await page.screenshot({ path: "/tmp/frame192-drag.png" });
    await page.mouse.up();
    const after = await page.evaluate(() =>
      JSON.parse(JSON.stringify(live().animation.editorScene.value.positions)),
    );
    const dx = after.one.x - before.one.x;
    assert(Math.abs(dx) > 10);
    assert(Math.abs(after.two.x - before.two.x - dx) < 0.01);
    assert(Math.abs(after.three.x - before.three.x - dx) < 0.01);
    const regrouped = await page.evaluate(async () => {
      const s = live();
      s.centerObjects("y");
      await tick();
      return Object.values(s.animation.editorScene.value.positions).map(
        (p) => p.y,
      );
    });
    assert(
      regrouped.every((y) => Math.abs(y - 460) < 0.01),
      JSON.stringify(regrouped),
    );
    // Context and layout: scene on deselect; properties reach timeline bottom.
    await page.evaluate(() => live().deselect());
    await page.waitForTimeout(100);
    assert(await root.getByLabel("Scène · propriétés").isVisible());
    assert.equal(await root.getByLabel("Objet · propriétés").count(), 0);
    const panel = await root.locator(".properties-panel").boundingBox(),
      timeline = await root.locator(".animation-timeline").boundingBox();
    assert(Math.abs(panel.y + panel.height - timeline.y - timeline.height) < 3);
    assert(panel.x >= timeline.x + timeline.width - 2);
    await root.locator('[data-drawer="animation-scene"]>summary').click();
    const name = root.locator(
      '[data-drawer="animation-scene"] input[maxlength="200"]',
    );
    await name.fill("Nouveau titre");
    assert.equal(
      await page.evaluate(() => live().current.value.title),
      "Atelier de test SVG",
    );
    await name.press("Enter");
    assert.equal(
      await page.evaluate(() => live().current.value.title),
      "Nouveau titre",
    );

    // Move the presence bar: clip start and effect start follow, local key times remain stable.
    await page.evaluate(async () => {
      const s = live();
      s.animation.seek(3);
      s.current.value.animation.presences.one = { start: 2, end: 6 };
      s.current.value.animation.clips = [
        {
          id: "test-motion",
          name: "Déplacement",
          keys: ["one"],
          start: 2,
          duration: 4,
          easing: "linear",
          frames: [
            { field: "x", time: 0, value: 200, ease: "linear" },
            { field: "x", time: 4, value: 600, ease: "linear" },
          ],
        },
      ];
      s.current.value.animation.effects = [
        {
          id: "test-glow",
          kind: "glow",
          key: "one",
          start: 2,
          duration: 4,
          enabled: true,
          amount: 30,
          color: "#ffffff",
        },
      ];
      await tick();
    });
    const bar = root.locator('[data-object="one"] .presence-span');
    await bar.scrollIntoViewIfNeeded();
    const b = await bar.boundingBox();
    await page.mouse.move(b.x + b.width * 0.6, b.y + b.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.6 + 80, b.y + b.height * 0.7, {
      steps: 6,
    });
    await page.mouse.up();
    const moved = await page.evaluate(() => {
      const a = live().animation.config.value;
      return { range: a.presences.one, clip: a.clips[0], effect: a.effects[0] };
    });
    assert(moved.range.start > 2);
    assert(Math.abs(moved.clip.start - moved.range.start) < 0.001);
    assert(Math.abs(moved.effect.start - moved.range.start) < 0.001);
    assert.equal(moved.clip.frames[1].time, 4);
    // Effect previews do not change the document until Apply.
    await page.evaluate(() => live().selectLayer("one"));
    await root.getByRole("button", { name: "Animation", exact: true }).click();
    assert.equal(
      await root.locator('[data-drawer="animation-values"]').count(),
      0,
    );
    await root.locator('[data-drawer="add-animation-effect"]>summary').click();
    await root.getByLabel("Rechercher un effet", { exact: true }).fill("halo");
    await root.locator(".effect-card").first().click();
    await page.evaluate(
      () => (document.querySelector("#test-studio").style.zIndex = "auto"),
    );
    const modal = page.getByRole("dialog", { name: "Aperçu de l’effet" });
    assert(await modal.isVisible());
    assert.equal(
      await page.evaluate(() => live().animation.config.value.effects.length),
      1,
    );
    await modal.getByRole("button", { name: "Annuler", exact: true }).click();
    assert.equal(
      await page.evaluate(() => live().animation.config.value.effects.length),
      1,
    );
    // Transparent SVG halo paints pixels outside its alpha silhouette.
    const glow = await page.evaluate(async () => {
      const s = live(),
        { animationScene } = await import("/src/animationModel.js"),
        { prepareImages } = await import("/src/render.js"),
        { renderAnimation } = await import("/src/animationRender.js");
      const scene = JSON.parse(JSON.stringify(s.current.value));
      scene.animation.clips = [];
      scene.animation.presences = {};
      scene.animation.effects = [
        {
          id: "g",
          kind: "glow",
          key: "one",
          start: 0,
          duration: 12,
          enabled: true,
          amount: 30,
          color: "#ffffff",
        },
      ];
      scene.positions.one = { x: 200, y: 200, w: 160, h: 160 };
      scene.blockKeys = ["one"];
      scene.animation.background = "transparent";
      await prepareImages([scene], s.theme.value);
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext("2d");
      renderAnimation(ctx, scene, s.theme.value, scene.animation, 1, {
        camera: false,
      });
      const data = ctx.getImageData(280, 235, 1, 1).data;
      return Array.from(data);
    });
    assert(glow[3] > 0, JSON.stringify(glow));
    // Actual MP4 export waits for the SVG colour corresponding to every output frame.
    await page.evaluate(async () => {
      const s = live(),
        { normalizeAnimation } = await import("/src/animationModel.js"),
        { svgColorField } = await import("/src/svgColors.js");
      s.current.value.blockKeys = ["one"];
      s.current.value.positions.one = { x: 400, y: 250, w: 400, h: 400 };
      s.current.value.animation = normalizeAnimation({
        duration: 1,
        fps: 30,
        background: "solid",
        color: "#101010",
        clips: [
          {
            id: "colours",
            keys: ["one"],
            start: 0,
            duration: 1,
            frames: [
              {
                field: svgColorField("#ff0000"),
                time: 0,
                value: "#ff0000",
                ease: "linear",
              },
              {
                field: svgColorField("#ff0000"),
                time: 1,
                value: "#00ff00",
                ease: "linear",
              },
            ],
          },
        ],
      });
      s.animation.exportWidth.value = 320;
      s.animation.format.value = "mp4";
      window.exportPixels = [];
      window.nativeBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (...args) {
        if (this.width === 320 && this.height === 180)
          exportPixels.push([
            ...this.getContext("2d").getImageData(100, 75, 1, 1).data,
          ]);
        return nativeBlob.apply(this, args);
      };
      await tick();
    });
    const download = page.waitForEvent("download", { timeout: 30000 });
    await page.evaluate(() => void live().animation.exportVideo());
    await (await download).saveAs("/tmp/frame192-svg-colour.mp4");
    const pixels = await page.evaluate(() => {
      HTMLCanvasElement.prototype.toBlob = nativeBlob;
      return exportPixels;
    });
    assert.equal(pixels.length, 30);
    assert(pixels[0][0] > 240 && pixels[0][1] < 10);
    assert(
      Math.abs(pixels[15][0] - 128) < 5 && Math.abs(pixels[15][1] - 128) < 5,
    );
    assert(pixels[29][1] > 230);
    // Stress a larger SVG scene and exercise both wheel axes on real overflow.
    const timing = await page.evaluate(async () => {
      const s = live(),
        scene = s.current.value;
      scene.animation.clips = [];
      scene.animation.effects = [];
      scene.animation.presences = {};
      scene.blockKeys = [];
      const source = scene.elements.one.src;
      scene.elements = {};
      scene.positions = {};
      scene.fragments = {};
      for (let i = 0; i < 40; i++) {
        const key = "svg" + i;
        scene.blockKeys.push(key);
        scene.elements[key] = {
          type: "image",
          custom: true,
          src: source,
          name: "SVG " + i,
          fit: "contain",
        };
        scene.positions[key] = {
          x: 100 + (i % 8) * 210,
          y: 80 + Math.floor(i / 8) * 180,
          w: 120,
          h: 120,
        };
        scene.fragments[key] = { order: 0, animation: "none" };
      }
      s.selected.value = "svg0";
      s.selectedKeys.value = ["svg0"];
      s.animation.seek(4);
      await tick();
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        s.animation.propertyValue("x");
        s.animation.propertyValue("y");
      }
      return performance.now() - start;
    });
    assert(timing < 500, "Cached properties: " + timing + "ms");
    const tracks = root.locator(".animation-tracks");
    const bounds = await tracks.boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width * 0.7,
      bounds.y + bounds.height * 0.5,
    );
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(100);
    assert((await tracks.evaluate((e) => e.scrollTop)) > 0);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -350);
    await page.keyboard.up("Control");
    await page.waitForTimeout(100);
    const left = await tracks.evaluate((e) => e.scrollLeft);
    await page.keyboard.down("Shift");
    await page.mouse.wheel(0, 250);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(100);
    assert((await tracks.evaluate((e) => e.scrollLeft)) > left);
    console.log(
      "40 SVGs, 2000 cached field reads:",
      timing.toFixed(1) + "ms; vertical and Shift-horizontal wheel passed",
    );
    await page.screenshot({ path: "/tmp/frame192-scene.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Alignment, spacing, group motion, SVG keys, diamond toggle, scene commit and full-height properties passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
