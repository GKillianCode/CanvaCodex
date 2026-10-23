const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const folder = await mkdtemp(join(tmpdir(), "frame-mp3-offset-"));
  let browser;
  try {
    const indexed = join(folder, "indexed.mp3"),
      unindexed = join(folder, "unindexed.mp3");
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=if(lt(t\\,10)\\,0.3*sin(2*PI*220*t)\\,0.3*sin(2*PI*880*t)):s=44100:d=45",
      "-c:a",
      "libmp3lame",
      "-q:a",
      "4",
      "-y",
      indexed,
    ]);
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      indexed,
      "-c:a",
      "copy",
      "-write_xing",
      "0",
      "-y",
      unindexed,
    ]);
    browser = await chromium.launch({
      headless: true,
      executablePath: "/usr/bin/google-chrome",
    });
    for (const file of [indexed, unindexed]) {
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
        const create = document.createElement.bind(document);
        document.createElement = function (tag, ...args) {
          const el = create(tag, ...args);
          if (tag === "audio") window.referenceAudio = el;
          return el;
        };
        const host = create("div");
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
        document.createElement = create;
        window.live = () => view.value.getStudio();
        live().workspace.value = "editor";
        window.playAttempts = [];
        const play = referenceAudio.play.bind(referenceAudio);
        referenceAudio.play = () => {
          playAttempts.push({
            time: referenceAudio.currentTime,
            seeking: referenceAudio.seeking,
            ready: referenceAudio.readyState,
          });
          return play();
        };
      });
      await page
        .getByRole("button", { name: "Scène · propriétés", exact: true })
        .click();
      await page
        .getByText("Audio de référence", { exact: true })
        .first()
        .click();
      await page
        .getByLabel("Importer l’audio de référence", { exact: true })
        .setInputFiles(file);
      await page.waitForFunction(() => !!live().animation.audio.asset.value);
      await page.evaluate(async () => {
        window.ctx = new AudioContext();
        window.spectrum = ctx.createAnalyser();
        spectrum.fftSize = 8192;
        ctx.createMediaElementSource(referenceAudio).connect(spectrum);
        spectrum.connect(ctx.destination);
        await ctx.resume();
      });
      // Check actual decoded sound, not only the media element's declared currentTime.
      for (const offset of [33, 0, 33]) {
        const input = page.getByLabel("Début dans le fichier · secondes");
        await input.fill(String(offset));
        await input.press("Tab");
        await page.evaluate(() => {
          live().animation.seek(0);
          live().animation.play();
        });
        await page.waitForFunction(
          () => !referenceAudio.paused && ctx.state === "running",
        );
        await page.waitForTimeout(400);
        const sound = await page.evaluate(() => {
          const data = new Float32Array(spectrum.frequencyBinCount);
          spectrum.getFloatFrequencyData(data);
          let bin = 0;
          for (let i = 1; i < data.length; i++)
            if (data[i] > data[bin]) bin = i;
          return {
            frequency: (bin * ctx.sampleRate) / spectrum.fftSize,
            level: data[bin],
            attempts: playAttempts,
          };
        });
        assert(sound.level > -70, "The analyser must receive audible samples");
        assert(
          Math.abs(sound.frequency - (offset === 0 ? 220 : 880)) < 20,
          `Source offset ${offset}: heard ${sound.frequency} Hz`,
        );
        assert(
          sound.attempts.every(
            (attempt) => !attempt.seeking && attempt.ready >= 2,
          ),
          "Playback must wait for the excerpt data and completed seek",
        );
        await page.evaluate(() => live().animation.stop());
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "MP3 audible offset: 220 Hz at start, 880 Hz at 33 seconds, indexed/unindexed files; playback waits for seek completion OK",
    );
  } finally {
    if (browser) await browser.close();
    await rm(folder, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
