const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await browser.newPage({ viewport: { width: 1560, height: 980 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/#/animations");
    const results = await p.evaluate(async () => {
      const { effectCatalog } = await import("/src/animationEffectCatalog.js"),
        { effectSample, makeEffectsDemo } =
          await import("/src/animationEffectExamples.js"),
        { renderAnimation } = await import("/src/animationRender.js"),
        { normalizeSlides, themes } = await import("/src/model.js");
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 270;
      const x = c.getContext("2d");
      function draw(scene, t) {
        x.resetTransform();
        x.clearRect(0, 0, 480, 270);
        x.scale(0.25, 0.25);
        renderAnimation(x, scene, themes[0], scene.animation, t);
        return c.toDataURL();
      }
      const result = [];
      for (const e of effectCatalog) {
        let scene = effectSample(e.id);
        if (e.id === "pathDeform") {
          scene.animation.paths = [
            {
              id: "p",
              points: [
                { x: 500, y: 500 },
                { x: 800, y: 200 },
                { x: 1100, y: 800 },
                { x: 1400, y: 500 },
              ],
            },
          ];
          scene.animation.effects[0].pathId = "p";
        }
        const a = draw(scene, 0.8);
        draw(scene, 1.7);
        const b = draw(scene, 0.8);
        if (a !== b) throw Error("Not deterministic: " + e.id);
        result.push(e.id);
      }
      for (const scene of makeEffectsDemo()) {
        const restored = normalizeSlides([
          JSON.parse(JSON.stringify(scene)),
        ])[0];
        if (restored.blockKeys.length !== scene.blockKeys.length)
          throw Error("Lost objects in demo");
        draw(restored, 1);
      }
      window.effectImage = c.toDataURL();
      return result;
    });
    console.log("All effects rendered and deterministic:", results.length);
    const imageResult = await p.evaluate(async () => {
      const { effectSample } = await import("/src/animationEffectExamples.js"),
        { prepareImages } = await import("/src/render.js"),
        { renderAnimation } = await import("/src/animationRender.js"),
        { themes } = await import("/src/model.js");
      const image = document.createElement("canvas");
      image.width = image.height = 64;
      const i = image.getContext("2d");
      i.fillStyle = "#ff0000";
      i.fillRect(0, 0, 64, 64);
      const red = image.toDataURL();
      i.fillStyle = "#0000ff";
      i.fillRect(0, 0, 64, 64);
      const blue = image.toDataURL(),
        s = effectSample("transition");
      s.elements.sample = { type: "image", src: red, fit: "cover" };
      s.elements.target = { type: "image", src: blue, fit: "cover" };
      await prepareImages([s], themes[0]);
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 270;
      const x = c.getContext("2d");
      const pixels = [];
      for (const t of [0, 1, 2]) {
        x.resetTransform();
        x.clearRect(0, 0, 480, 270);
        x.scale(0.25, 0.25);
        renderAnimation(x, s, themes[0], s.animation, t);
        pixels.push([...x.getImageData(240, 135, 1, 1).data]);
      }
      return pixels;
    });
    assert.deepEqual(imageResult[0], [255, 0, 0, 255]);
    assert.equal(imageResult[1][3], 255);
    assert.deepEqual(imageResult[2], [0, 0, 255, 255]);
    await p.evaluate(async () => {
      const { createApp, h, ref, nextTick } =
          await import("/node_modules/.vite/deps/vue.js"),
        { default: Studio } = await import("/src/StudioApp.vue"),
        { makeAnimationExample } = await import("/src/animationExamples.js");
      const host = document.createElement("div");
      host.id = "qa-effects";
      host.style = "position:fixed;inset:0;z-index:9999";
      document.body.append(host);
      createApp({
        setup() {
          let studio = ref(null);
          window.live = () => studio.value?.getStudio();
          return () =>
            h(Studio, {
              application: "animation",
              initialView: "slides",
              ref: studio,
            });
        },
      }).mount(host);
      await nextTick();
      const s = live();
      s.slides.value = [makeAnimationExample("gc")];
      s.index.value = 0;
      s.workspace.value = "editor";
      await nextTick();
      s.selected.value = "shapeObject";
      s.selectedKeys.value = ["shapeObject"];
      s.selectionScope.value = "elements";
    });
    const root = p.locator("#qa-effects");
    await root
      .getByRole("button", { name: "Animation · propriétés", exact: true })
      .click();
    await root.getByText("Ajouter un effet", { exact: true }).click();
    await root
      .locator(".effect-gallery")
      .getByRole("button", { name: "Dissolution", exact: true })
      .click();
    await p.waitForTimeout(200);
    await root
      .locator('[data-drawer^="effect-"] summary')
      .filter({ hasText: "Dissolution" })
      .click();
    await root
      .locator('[data-drawer^="effect-"]')
      .filter({ hasText: "Dissolution" })
      .getByLabel("Durée · s", { exact: true })
      .fill("2");
    let e = await p.evaluate(() => {
      const s = live(),
        e = s.animation.config.value.effects.at(-1);
      return {
        id: e.id,
        count: s.animation.config.value.effects.length,
        key: e.key,
      };
    });
    assert.equal(e.key, "shapeObject");
    await root
      .getByLabel("Clé · effect:" + e.id + ":progress", { exact: true })
      .click();
    await p.evaluate(() => live().animation.seek(1));
    await root.getByLabel("Progression · valeur", { exact: true }).fill("80");
    assert.equal(
      await p.evaluate(
        () =>
          live()
            .animation.config.value.clips.flatMap((c) => c.frames)
            .filter((f) => f.field.includes(":progress")).length,
      ),
      2,
    );
    await root.getByLabel("Dupliquer l’effet", { exact: true }).click();
    assert.equal(
      await p.evaluate(
        () =>
          live().animation.config.value.effects.filter(
            (e) => e.kind === "dissolve",
          ).length,
      ),
      2,
    );
    await root.getByLabel("Retirer l’effet", { exact: true }).last().click();
    await root.getByRole("button", { name: "Supprimer", exact: true }).click();
    assert.equal(
      await p.evaluate(
        () =>
          live().animation.config.value.effects.filter(
            (e) => e.kind === "dissolve",
          ).length,
      ),
      1,
    );
    await root.getByRole("button", { name: "Mémoriser", exact: true }).click();
    await p.waitForFunction(async (id) => {
      const r = await fetch("/__frame_assets__/motions");
      return (await r.json()).data.motions.some((p) =>
        p.effects?.some((e) => e.id === id),
      );
    }, e.id);
    // Existing timeline spans also position effects. Their duration handle stretches them.
    const span = root
      .locator(".effect-timeline-track")
      .filter({ hasText: "Dissolution" })
      .locator(".clip-span");
    await span.scrollIntoViewIfNeeded();
    const box = await span.boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.down();
    await p.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, {
      steps: 5,
    });
    await p.mouse.up();
    assert.ok(
      await p.evaluate(
        () =>
          live().animation.config.value.effects.find(
            (e) => e.kind === "dissolve",
          ).start > 0,
      ),
    );
    const before = await p.evaluate(() => live().slides.value.length);
    const docId = await p.evaluate(async () => {
      const { createDesign, designElement } =
          await import("/src/designModel.js"),
        { designRepository } = await import("/src/designRepository.js"),
        { videoRepository } = await import("/src/videoProjects.js");
      const d = createDesign("vector", "QA illustration");
      d.pages[0].elements = [
        designElement("shape", {
          shape: "freeform",
          nodes: [
            { x: 0, y: 0 },
            { x: 100, y: 50 },
            { x: 0, y: 100 },
          ],
          gradient: true,
        }),
        designElement("text", { text: "Une feuille" }),
      ];
      await designRepository(videoRepository(), "vector").save(d);
      return d.id;
    });
    await root.getByText("Depuis l’atelier vectoriel", { exact: true }).click();
    await root
      .getByRole("button", { name: "Charger mes illustrations", exact: true })
      .click();
    await root.getByLabel("Illustration", { exact: true }).selectOption(docId);
    await root
      .getByRole("button", { name: "Ajouter comme scène", exact: true })
      .click();
    assert.equal(
      await p.evaluate(() => live().slides.value.length),
      before + 1,
    );
    assert.equal(
      await p.evaluate(() => live().current.value.blockKeys.length),
      2,
    );
    const exportResult = await p.evaluate(async () => {
      const { effectSample } = await import("/src/animationEffectExamples.js"),
        { renderAnimation } = await import("/src/animationRender.js"),
        { themes } = await import("/src/model.js"),
        { exportAnimationFrames } =
          await import("/src/animationVideoExport.js");
      const scene = effectSample("shatter");
      scene.animation.effects[0].duration = 1;
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 270;
      const x = c.getContext("2d");
      const draw = async (time) => {
        x.resetTransform();
        x.clearRect(0, 0, c.width, c.height);
        x.scale(0.25, 0.25);
        renderAnimation(x, scene, themes[0], scene.animation, time);
      };
      await draw(0.4);
      const alpha = x.getImageData(0, 0, 1, 1).data[3];
      const blob = await exportAnimationFrames({
        canvas: c,
        draw,
        duration: 1,
        fps: 10,
        format: "mov",
      });
      window.effectExport = Array.from(
        new Uint8Array(await blob.arrayBuffer()),
      );
      return { size: blob.size, alpha };
    });
    assert.equal(exportResult.alpha, 0);
    assert.ok(exportResult.size > 1000);
    require("node:fs").writeFileSync(
      "/tmp/frame-effects-export.mov",
      Buffer.from(await p.evaluate(() => window.effectExport)),
    );
    await p.evaluate(() => {
      const s = live(),
        key = s.current.value.blockKeys[0];
      s.selected.value = key;
      s.selectedKeys.value = [key];
    });
    await root
      .getByRole("button", { name: "Animation · propriétés", exact: true })
      .click();
    await root.getByText("Ajouter un effet", { exact: true }).click();
    await p.screenshot({ path: "/tmp/frame-effects-dark.png" });
    await p.evaluate(async () => {
      const { setAppearance } = await import("/src/appearance.js");
      setAppearance("light", false);
    });
    await p.waitForTimeout(500);
    await p.screenshot({ path: "/tmp/frame-effects-light.png" });
    assert.deepEqual(errors, []);
    console.log(
      "OK effect library on disk, timeline positioning, editable vector import and transparent MOV export",
      exportResult,
    );
    assert.deepEqual(errors, []);
    console.log(
      "OK effect picker, timing, progress keys, duplicate/delete confirmation, light/dark without errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
