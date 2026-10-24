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
      host.id = "qa-playback";
      host.style = "position:fixed;inset:0;z-index:2000";
      document.body.append(host);
      const vm = ref();
      createApp({
        render: () =>
          h(Studio, {
            ref: vm,
            application: "animation",
            initialView: "slides",
          }),
      }).mount(host);
      await nextTick();
      window.live = () => vm.value.getStudio();
      window.tick = nextTick;
      const scene = makeSlide("title");
      Object.assign(scene, {
        blockKeys: ["shape", "other"],
        elements: {
          shape: {
            type: "shape",
            shape: "circle",
            filled: true,
            fill: "#ff5555",
            name: "Cercle",
          },
          other: {
            type: "shape",
            shape: "rect",
            filled: true,
            fill: "#55aaee",
            name: "Rectangle",
          },
        },
        positions: {
          shape: { x: 400, y: 300, w: 200, h: 200 },
          other: { x: 700, y: 300, w: 200, h: 200 },
        },
        fragments: {
          shape: { order: 0, animation: "none" },
          other: { order: 0, animation: "none" },
        },
        animation: normalizeAnimation({
          duration: 12,
          fps: 30,
          presences: { shape: { start: 2 + 10 / 30, end: 8 + 20 / 30 } },
        }),
      });
      const s = live();
      s.slides.value = [scene];
      s.index.value = 0;
      s.workspace.value = "editor";
      await nextTick();
      s.selectLayer("shape");
      await nextTick();
    });
    const root = page.locator("#qa-playback");
    assert.equal(
      await root.getByRole("button", { name: "Style", exact: true }).count(),
      0,
    );
    await root.getByRole("button", { name: "Objet", exact: true }).click();
    const values = async () =>
      root.locator("[data-object-time]").allTextContents();
    assert.deepEqual(await values(), [
      "00:00:02:10",
      "00:00:08:20",
      "00:00:06:10",
    ]);
    assert.equal(
      await root
        .locator('[data-drawer="animation-presence"] .object-timing-summary')
        .count(),
      0,
    );
    await page.evaluate(() => {
      const s = live();
      s.animation.config.value.presences.shape.end = null;
    });
    assert.deepEqual(await values(), [
      "00:00:02:10",
      "00:00:12:00",
      "00:00:09:20",
    ]);
    await page.evaluate(() => {
      const s = live();
      s.selected.value = null;
      s.selectedKeys.value = ["shape", "other"];
    });
    assert.deepEqual(await values(), ["Mixte", "00:00:12:00", "Mixte"]);
    await page.evaluate(() => {
      const s = live();
      s.animation.config.value.fps = 24;
      s.animation.config.value.presences.shape = {
        start: 1 + 5 / 24,
        end: 4 + 10 / 24,
      };
      s.selectLayer("shape");
    });
    assert.deepEqual(await values(), [
      "00:00:01:05",
      "00:00:04:10",
      "00:00:03:05",
    ]);
    await page.evaluate(() => {
      const s = live();
      s.animation.seek(2);
    });
    await root.locator(".playback-toggle").click();
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => live().animation.time.value);
    const canvas = root.locator(".stage-wrap canvas").first();
    await canvas.click({ position: { x: 40, y: 400 } });
    await page.waitForTimeout(150);
    const state = await page.evaluate(() => ({
      playing: live().animation.playing.value,
      time: live().animation.time.value,
      selection: live().selectedKeys.value,
    }));
    assert.equal(state.playing, true);
    assert(state.time > before);
    assert.deepEqual(state.selection, []);
    // Even clicking a visible object while playing must not start an edit or drag.
    await page.evaluate(() => live().selectLayer("shape"));
    const box = await canvas.boundingBox();
    await canvas.click({
      position: {
        x: ((500 + 320) / 2560) * box.width,
        y: ((400 + 180) / 1440) * box.height,
      },
    });
    await page.waitForTimeout(80);
    assert.equal(
      await page.evaluate(() => live().animation.playing.value),
      true,
    );
    assert.deepEqual(await page.evaluate(() => live().selectedKeys.value), []);
    await root.locator(".playback-toggle").click();
    assert.equal(
      await page.evaluate(() => live().animation.playing.value),
      false,
    );
    await page.evaluate(() => live().selectLayer("shape"));
    await root.getByRole("button", { name: "Objet", exact: true }).click();
    await page.screenshot({ path: "/tmp/frame193-object.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Canvas clicks deselect without pausing; explicit pause works; Object times use frame cadence, scene end and mixed selection",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
