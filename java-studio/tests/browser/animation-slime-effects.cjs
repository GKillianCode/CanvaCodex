const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Use isolated QA server");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console",message=>{if(message.text().startsWith("Slime export"))console.log(message.text());});
    await p.goto(base + "/#/animations");
    await p.evaluate(
      async (raw) => {
        const { createApp, h, ref, nextTick } =
            await import("/node_modules/.vite/deps/vue.js"),
          { default: Studio } = await import("/src/StudioApp.vue"),
          { readApplicationFile } =
            await import("/src/applicationDocuments.js");
        const host = document.createElement("div");
        host.id = "qa-slime";
        host.style = "position:fixed;inset:0;z-index:9999";
        document.body.append(host);
        createApp({
          setup() {
            const studio = ref(null);
            window.live = () => studio.value?.getStudio();
            return () =>
              h(Studio, {
                ref: studio,
                application: "animation",
                initialView: "slides",
              });
          },
        }).mount(host);
        await nextTick();
        const s = live();
        s.slides.value = readApplicationFile(raw, "animation").slides.slides;
        s.index.value = 0;
        s.workspace.value = "editor";
        await nextTick();
        s.selected.value = "shapeSlime";
        s.selectedKeys.value = ["shapeSlime"];
        s.animation.seek(2);
      },
      JSON.parse(
        fs.readFileSync(
          new URL(
            "../../../animation-slime-cinq-scenes.json",
            "file://" + __filename,
          ),
          "utf8",
        ),
      ),
    );
    const root = p.locator("#qa-slime");
    await root.getByLabel("Pistes de la sélection", { exact: true }).check();
    await root.locator('[data-object="shapeSlime"] .object-track-name button[aria-expanded]').click();
    assert.equal(await root.locator(".effect-timeline-track").count(), 1);
    await root
      .getByRole("button", {
        name: "Ouvrir les propriétés de Slime · personnage",
        exact: true,
      })
      .click();
    await p.waitForFunction(
      () =>
        document.querySelector('[data-drawer^="effect-slime-fx-0-shadow"]')
          ?.open,
    );
    assert.equal(
      await root
        .getByRole("button", { name: "Animation", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await root.getByLabel("Pistes de la sélection", { exact: true }).uncheck();
    for(const button of await root.locator('.object-track-name button[aria-expanded]').all())if(await button.isEnabled()&&await button.getAttribute('aria-expanded')==='false')await button.click();
    assert.ok((await root.locator(".effect-timeline-track").count()) > 10);
    const checks = await p.evaluate(async () => {
      const { renderAnimation } = await import("/src/animationRender.js"),
        { prepareImages } = await import("/src/render.js");
      const s = live(),
        c = document.createElement("canvas");
      c.width = 640;
      c.height = 360;
      const x = c.getContext("2d");
      await prepareImages(s.slides.value, s.theme.value);
      await document.fonts.ready;
      const rows = [];
      for (const scene of s.slides.value) {
        function render(t) {
          x.resetTransform();
          x.clearRect(0, 0, 640, 360);
          x.scale(1 / 3, 1 / 3);
          renderAnimation(x, scene, s.theme.value, scene.animation, t);
          return c.toDataURL();
        }
        const t = scene.animation.duration * 0.65,
          a = render(t);
        render(0.2);
        if (a !== render(t)) throw Error("Unstable render " + scene.title);
        rows.push(scene.blockKeys.length);
      }
      return rows;
    });
    assert.equal(checks.length, 5);
    await p.screenshot({ path: "/tmp/slime-editor-dark.png" });
    await p.evaluate(async () => {
      (await import("/src/appearance.js")).setAppearance("light", false);
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: "/tmp/slime-editor-light.png" });
    assert.deepEqual(errors, []);
    console.log(
      "OK five-scene JSON, deterministic scrubbing, selection filter and direct effect inspector, light/dark",
      checks,
    );
    const snapshots = await p.evaluate(async () => {
      const { renderAnimationStoryboard } =
          await import("/src/animationStoryboardRender.js"),
        s = live(),
        c = document.createElement("canvas");
      c.width = 960;
      c.height = 540;
      const x = c.getContext("2d"),
        frames = [];
      for (const time of [9.7, 19.7, 29.7, 43.7]) {
        x.resetTransform();
        x.clearRect(0, 0, 960, 540);
        x.scale(0.5, 0.5);
        renderAnimationStoryboard(x, s.slides.value, s.theme.value, time);
        frames.push(c.toDataURL().split(",")[1]);
      }
      return frames;
    });
    snapshots.forEach((v, i) =>
      fs.writeFileSync(
        "/tmp/slime-transition-" + i + ".png",
        Buffer.from(v, "base64"),
      ),
    );
    if (process.env.FRAME_SLIME_EXPORT === "1") {
      const result = await p.evaluate(async () => {
        const { renderAnimationStoryboard } =
            await import("/src/animationStoryboardRender.js"),
          { exportAnimationFrames } =
            await import("/src/animationVideoExport.js"),
          s = live(),
          c = document.createElement("canvas");
        c.width = 1280;
        c.height = 720;
        const x = c.getContext("2d");
        let last = -1;
        const begin = performance.now();
        const blob = await exportAnimationFrames({
          canvas: c,
          duration: 54,
          fps: 24,
          format: "mp4",
          quality: "balanced",
          draw: async (time) => {
            x.resetTransform();
            x.clearRect(0, 0, 1280, 720);
            x.scale(2 / 3, 2 / 3);
            renderAnimationStoryboard(x, s.slides.value, s.theme.value, time);
          },
          onProgress: (n) => {
            const phase = Math.floor(n * 10);
            if (phase !== last) {
              last = phase;
              console.log("Slime export " + Math.round(n * 100) + "%");
            }
          },
        });
        window.slimeMovie = Array.from(
          new Uint8Array(await blob.arrayBuffer()),
        );
        return { size: blob.size, ms: performance.now() - begin };
      });
      fs.writeFileSync(
        "/tmp/slime-cinq-mondes.mp4",
        Buffer.from(await p.evaluate(() => window.slimeMovie)),
      );
      console.log("Full 54-second export", result);
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
