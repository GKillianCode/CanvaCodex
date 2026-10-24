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
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    async function mount() {
      await page.goto(base);
      await page.evaluate(async () => {
        const { createApp, h, ref, nextTick } =
          await import("/node_modules/.vite/deps/vue.js");
        const { default: Studio } = await import("/src/StudioApp.vue");
        const host = document.createElement("div");
        host.style = "position:fixed;inset:0;z-index:2000";
        document.body.append(host);
        const view = ref(null);
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
      });
    }
    await mount();
    await page.evaluate(async () => {
      const s = live();
      s.animation.setAutoKey(false);
      const { makeSlide } = await import("/src/model.js");
      const { normalizeAnimation } = await import("/src/animationModel.js");
      const scene = makeSlide("title");
      Object.assign(scene, {
        blockKeys: [],
        elements: {},
        positions: {},
        fragments: {},
        animation: normalizeAnimation({ duration: 8 }),
      });
      s.slides.value = [scene];
      s.index.value = 0;
      await tick();
      s.addShape("circle");
      await tick();
      window.key = s.selected.value;
      window.initial = JSON.parse(
        JSON.stringify(s.current.value.positions[key]),
      );
    });
    assert.equal(
      await page
        .getByRole("button", { name: "Images clés automatiques", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    await page
      .getByRole("button", { name: "Images clés automatiques", exact: true })
      .click();
    await page.evaluate(() => live().animation.seek(2));
    // Real inspector control, without ever touching its diamond.
    await page.getByRole("button", { name: "Couleurs", exact: true }).click();
    await page.getByText("Couleurs", { exact: true }).last().click();
    const color = page.locator('.shape-properties input[type="text"]').first();
    await color.fill("#ff6600");
    await color.dispatchEvent("input");
    assert.deepEqual(
      await page.evaluate(() =>
        live()
          .animation.clip.value.frames.filter((f) => f.field === "color")
          .map((f) => [f.time, f.value]),
      ),
      [
        [0, await page.evaluate(() => live().theme.value.accent)],
        [2, "#ff6600"],
      ],
    );
    await page.evaluate(async () => {
      const s = live(),
        a = s.animation;
      const p = { ...a.editorScene.value.positions[key] };
      a.commitPose(
        { [key]: { ...p, x: 1200, w: 450, rotation: 45 } },
        { [key]: p },
      );
      // A newly animated property at a later instant gets its own baseline.
      a.seek(4);
      a.setProperty("strokeWidth", 12);
      a.setProperty("opacity", 40);
      a.addEffect("glitch");
      window.effectStart = a.config.value.effects.at(-1).start;
      window.at4 = JSON.parse(JSON.stringify(a.editorScene.value));
      a.seek(0);
      window.at0 = JSON.parse(JSON.stringify(a.editorScene.value));
      await tick();
    });
    const sample = await page.evaluate(() => ({
      start: at0.positions[key],
      end: at4.positions[key],
      shape: at4.elements[key],
      effectStart,
    }));
    assert.equal(sample.start.x, await page.evaluate(() => initial.x));
    assert.equal(sample.end.x, 1200);
    assert.equal(sample.end.w, 450);
    assert.equal(sample.start.opacity, 100);
    assert.equal(sample.end.opacity, 40);
    assert.equal(sample.shape.strokeWidth, 12);
    assert.equal(sample.effectStart, 4);
    // Insertion is discrete, not a fade from the beginning of the scene.
    assert.deepEqual(
      await page.evaluate(async () => {
        const s = live(),
          a = s.animation;
        a.seek(3);
        s.addShape("circle");
        await tick();
        const k = s.selected.value;
        a.seek(2.9);
        const before = a.editorScene.value.hiddenKeys?.includes(k) ? 0 : a.editorScene.value.positions[k].opacity ?? 100;
        a.seek(3);
        return [before, a.editorScene.value.hiddenKeys?.includes(k) ? 0 : a.editorScene.value.positions[k].opacity ?? 100];
      }),
      [0, 100],
    );
    // Geometry is a common frame: retain spacing and record one synchronized undo step.
    const multi = await page.evaluate(async () => {
      const s = live(),
        a = s.animation,
        k2 = s.selected.value;
      s.selectedKeys.value = [key, k2];
      s.selected.value = null;
      await tick();
      a.seek(5);
      s.updateCommon("position", "x", 900);
      await tick();
      const tracks = a.config.value.clips.filter((c) =>
        c.frames.some((f) => f.field === "x" && c.start + f.time === 5),
      );
      const values = tracks.map((c) => ({
        keys: [...c.keys],
        end: c.frames.filter((f) => f.field === "x").at(-1).value,
      }));
      s.undo();
      await tick();
      const afterUndo = a.config.value.clips.some((c) =>
        c.frames.some((f) => f.field === "x" && c.start + f.time === 5),
      );
      s.redo();
      await tick();
      const afterRedo = a.config.value.clips.filter((c) =>
        c.frames.some((f) => f.field === "x" && c.start + f.time === 5),
      ).length;
      return { values, afterUndo, afterRedo };
    });
    assert.equal(multi.values.length, 1);
    assert(multi.values.every((c) => c.keys.length === 2 && c.end === 900));
    assert.equal(multi.afterUndo, false);
    assert.equal(multi.afterRedo, 1);
    // Emitter fields use the same automatic channels as object properties.
    assert.deepEqual(
      await page.evaluate(async () => {
        const s = live(),
          a = s.animation;
        a.seek(2);
        a.addEngine("particles", { x: 400, y: 400 });
        await tick();
        a.setProperty("particleForce", 900);
        a.setProperty("color", "#ff9900");
        const c = a.clip.value;
        return {
          forceTimes: c.frames
            .filter((f) => f.field === "particleForce")
            .map((f) => f.time),
          colorTimes: c.frames
            .filter((f) => f.field === "color")
            .map((f) => f.time),
          automatic: a.shouldKey("particleSize"),
        };
      }),
      { forceTimes: [0, 2], colorTimes: [0, 2], automatic: true },
    );
    // Seeking and switching mode create no keys; preference survives a refresh.
    assert.equal(
      await page.evaluate(() => {
        const a = live().animation,
          b = JSON.stringify(a.config.value);
        a.seek(1);
        a.setConstruction(false);
        a.setConstruction(true);
        return b === JSON.stringify(a.config.value);
      }),
      true,
    );
    await mount();
    assert.equal(
      await page
        .getByRole("button", { name: "Images clés automatiques", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Automatic keys: inspector color, poses, late properties, effects, insertion, multi-selection, undo/redo and preference OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
