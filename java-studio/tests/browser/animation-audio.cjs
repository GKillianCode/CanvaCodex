const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const { writeFile } = require("node:fs/promises");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  // Ten minutes of real PCM audio, quiet at first and louder around the selected excerpt.
  const rate = 8000,
    duration = 600,
    data = Buffer.alloc(44 + rate * duration * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(data.length - 44, 40);
  for (let i = 0; i < rate * duration; i++)
    data.writeInt16LE(
      Math.round(
        Math.sin((i / rate) * Math.PI * 440) *
          (i / rate >= 20 && i / rate < 40 ? 0.8 : 0.1) *
          (0.2 + 0.8 * Math.abs(Math.sin((i / rate) * 4))) *
          32767,
      ),
      44 + i * 2,
    );
  const fixture = "/tmp/frame-animation-audio-10min.wav";
  await writeFile(fixture, data);
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1050 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    async function mount() {
      await page.goto(base);
      await page.evaluate(async () => {
        const { createApp, h, ref, nextTick } =
          await import("/node_modules/.vite/deps/vue.js");
        const { default: Studio } = await import("/src/StudioApp.vue");
        const create = document.createElement.bind(document);
        document.createElement = function (tag, ...args) {
          const el = create(tag, ...args);
          if (tag === "audio") window.referenceAudio = el;
          return el;
        };
        const host = create("div");
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
        document.createElement = create;
        window.live = () => v.value.getStudio();
        window.tick = nextTick;
        live().workspace.value = "editor";
        await tick();
      });
    }
    await mount();
    await page.evaluate(async () => {
      const s = live();
      const { makeSlide } = await import("/src/model.js"),
        { normalizeAnimation } = await import("/src/animationModel.js");
      s.slides.value = [3, 4].map((duration, i) => {
        const scene = makeSlide("title");
        Object.assign(scene, {
          title: "Audio " + (i + 1),
          elements: {},
          positions: {},
          fragments: {},
          blockKeys: [],
          animation: normalizeAnimation({
            duration,
            clips:
              i === 0
                ? [
                    {
                      id: "audio-test-clip",
                      keys: [],
                      duration,
                      frames: [{ field: "cameraZoom", time: 0, value: 100 }],
                    },
                  ]
                : [],
          }),
        });
        return scene;
      });
      s.index.value = 0;
      await tick();
    });
    await page
      .getByRole("button", { name: "Scène · propriétés", exact: true })
      .click();
    await page.getByText("Audio de référence", { exact: true }).first().click();
    await page
      .getByLabel("Importer l’audio de référence", { exact: true })
      .setInputFiles(fixture);
    await page.waitForFunction(
      () => live().animation.audio.asset.value?.duration === 600,
      {},
      { timeout: 30000 },
    );
    assert.deepEqual(
      await page.evaluate(() =>
        live().slides.value.map((s) => s.animation.audio.start),
      ),
      [0, 3],
    );
    assert.equal(await page.locator(".animation-audio-track").count(), 1);
    const before = await page
      .locator(".animation-audio-lane path")
      .getAttribute("d");
    await page.getByLabel("Début de l’extrait audio en secondes").fill("20");
    await page
      .getByLabel("Début de l’extrait audio en secondes")
      .dispatchEvent("change");
    assert.notEqual(
      await page.locator(".animation-audio-lane path").getAttribute("d"),
      before,
    );
    await page.evaluate(() => (live().animation.config.value.duration = 11));
    await page.waitForFunction(() =>
      document
        .querySelector(".animation-audio-label small")
        .textContent.includes("00:31.00"),
    );
    assert.equal(
      await page.evaluate(() => live().animation.config.value.audio.start),
      20,
    );
    await page
      .getByRole("button", { name: "Couper l’audio", exact: true })
      .click();
    assert.equal(await page.evaluate(() => referenceAudio.muted), true);
    await page
      .getByRole("button", { name: "Réactiver l’audio", exact: true })
      .click();
    await page.evaluate(() => live().animation.seek(2));
    await page.waitForFunction(
      () => Math.abs(referenceAudio.currentTime - 22) < 0.05,
    );
    assert.equal(await page.evaluate(() => referenceAudio.paused), true);
    await page.evaluate(() => live().animation.play());
    await page.waitForFunction(() => !referenceAudio.paused);
    await page.waitForTimeout(300);
    const playing = await page.evaluate(() => ({
      audio: referenceAudio.currentTime,
      visual: live().animation.time.value,
    }));
    assert(Math.abs(playing.audio - (20 + playing.visual)) < 0.2);
    await page.evaluate(() => live().animation.stop());
    await page.waitForFunction(() => referenceAudio.paused);
    // Scrubbing the waveform uses the timeline scale and seeks the same scene excerpt.
    const lane = await page.locator(".animation-audio-lane").boundingBox();
    await page.mouse.click(lane.x + lane.width * 0.5, lane.y + 30);
    assert(
      Math.abs((await page.evaluate(() => referenceAudio.currentTime)) - 25.5) <
        0.1,
    );
    // Mutually exclusive views share the clock; audio never occupies a keyframe row.
    assert.equal(await page.locator(".key-diamond").count(), 0);
    await page
      .getByRole("button", { name: "Images clés", exact: true })
      .click();
    assert.equal(await page.locator(".animation-audio-track").count(), 0);
    assert((await page.locator(".key-diamond").count()) > 0);
    await page.getByRole("button", { name: "Audio", exact: true }).click();
    assert.equal(await page.locator(".animation-audio-track").count(), 1);
    assert.equal(await page.locator(".key-diamond").count(), 0);
    assert.equal(await page.evaluate(() => live().animation.time.value), 5.5);
    // The existing preview uses the same clock and mute control.
    await page
      .getByRole("button", { name: "Aperçu plein écran", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Aperçu de l’animation" });
    await dialog.waitFor();
    await dialog
      .getByRole("button", { name: "Lire l’aperçu", exact: true })
      .click();
    await page.waitForFunction(() => !referenceAudio.paused);
    await dialog
      .getByRole("button", { name: "Couper l’audio", exact: true })
      .click();
    assert.equal(await page.evaluate(() => referenceAudio.muted), true);
    await dialog
      .getByRole("button", { name: "Fermer l’aperçu", exact: true })
      .click();
    // In storyboard mode, an explicit source offset is honored at the scene boundary.
    await page.evaluate(() => {
      const s = live(),
        a = s.animation;
      s.slides.value[0].animation.duration = 0.5;
      s.slides.value[1].animation.duration = 0.5;
      s.slides.value[1].animation.audio.start = 100;
      a.loop.value = false;
      a.allScenes.value = true;
      a.seekPlayback(0.4);
      a.play();
    });
    await page.waitForFunction(
      () => live().index.value === 1 && !referenceAudio.paused,
    );
    assert(
      Math.abs((await page.evaluate(() => referenceAudio.currentTime)) - 100) <
        0.4,
    );
    await page.evaluate(() => live().animation.stop());
    // Adding scenes continues the excerpt; changing scenes shows one waveform only.
    assert.equal(
      await page.evaluate(async () => {
        const s = live();
        s.add();
        await tick();
        return s.current.value.animation.audio.start;
      }),
      100.5,
    );
    assert.equal(await page.locator(".animation-audio-track").count(), 1);
    // Portable JSON carries the single shared audio; normal workspace data stays lightweight.
    assert.deepEqual(
      await page.evaluate(async () => {
        const s = live(),
          { portableVideoProject, restoreVideoProject } =
            await import("/src/videoMedia.js"),
          { videoRepository } = await import("/src/videoProjects.js");
        const portable = await portableVideoProject({
          slides: JSON.parse(JSON.stringify(s.slides.value)),
        });
        const src = s.current.value.animation.audio.src;
        await videoRepository().setSetting(src, null);
        await restoreVideoProject(portable);
        s.flushLocal();
        return {
          assets: Object.keys(portable.audioMedia).length,
          stored: (await videoRepository().getSetting(src)).duration,
          metadata: JSON.stringify(s.slides.value).length < 20000,
        };
      }),
      { assets: 1, stored: 600, metadata: true },
    );
    await mount();
    await page.waitForFunction(
      () => live().animation.audio.asset.value?.duration === 600,
    );
    assert.equal(
      await page.evaluate(() => live().animation.config.value.audio.start),
      100.5,
    );
    assert.equal(
      await page.evaluate(() => live().animation.audio.muted.value),
      true,
    );
    await page
      .getByRole("button", { name: "Scène · propriétés", exact: true })
      .click();
    await page.getByText("Audio de référence", { exact: true }).first().click();
    await page.evaluate(() => {
      const a = live().animation;
      a.config.value.duration = 11;
      a.audio.setStart(20);
      if (a.audio.muted.value) a.audio.toggleMute();
    });
    await page.screenshot({ path: "/tmp/frame-animation-audio-dark.png" });
    await page.evaluate(
      () => (document.documentElement.dataset.appearance = "light"),
    );
    await page.screenshot({ path: "/tmp/frame-animation-audio-light.png" });
    // Missing media and invalid imports report an error instead of silently losing the reference.
    await page.evaluate(() => {
      live().animation.config.value.audio.src =
        "frame-audio:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    });
    await page.waitForFunction(() =>
      live().animation.audio.error.value.includes("introuvable"),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Audio reference: 10-minute import, waveform crop, scene controls, synchronized play/pause/seek/preview/storyboard, mute, new scenes, JSON media roundtrip and reload OK",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
