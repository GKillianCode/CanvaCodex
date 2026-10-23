const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");
const folder = fs.mkdtempSync("/tmp/frame-audio-precision-");
const url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(localhost|127\.0\.0\.1):5289$/.test(url || ""))
  throw Error("Isolated server required");
let file = process.env.FRAME_AUDIO_FILE;
if (!file) {
  file = join(folder, "vbr.mp3");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "aevalsrc=(0.2*sin(2*PI*(220*t+30*sin(t)))+0.1*sin(2*PI*(330*t+10*t*t)))*(0.1+0.9*abs(sin(1.7*t))):s=48000:d=86",
    "-ac",
    "2",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "4",
    file,
  ]);
}
function measure(reference, chunk) {
  const expected = chunk.time - 4096 / 48000,
    y = chunk.samples;
  const origin = Math.max(0, Math.floor((expected - 0.3) * 8000)),
    end = Math.min(
      reference.length - y.length,
      Math.ceil((expected + 0.3) * 8000),
    );
  let energyY = y.reduce((n, v) => n + v * v, 0),
    best = -1,
    at = 0;
  for (let k = origin; k < end; k++) {
    let product = 0,
      energy = 0;
    for (let i = 0; i < y.length; i++) {
      const v = reference[k + i];
      product += v * y[i];
      energy += v * v;
    }
    const score = product / Math.sqrt(energy * energyY || 1);
    if (score > best) {
      best = score;
      at = k / 8000;
    }
  }
  return { correlation: best, error: at - expected };
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1050 },
    });
    await page.goto(url);
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
      document.createElement = create;
      window.live = () => v.value.getStudio();
      live().workspace.value = "editor";
    });
    await page
      .getByRole("button", { name: "Scène · propriétés", exact: true })
      .click();
    await page.getByText("Audio de référence", { exact: true }).first().click();
    await page
      .getByLabel("Importer l’audio de référence", { exact: true })
      .setInputFiles(file);
    await page.waitForFunction(() => !!live().animation.audio.asset.value);
    const reference = await page.evaluate(async () => {
      const asset = live().animation.audio.asset.value;
      const buffer = await new OfflineAudioContext(1, 1, 8000).decodeAudioData(
        await (await fetch(asset.src)).arrayBuffer(),
      );
      const samples = buffer.getChannelData(0);
      window.ctx = new AudioContext({ sampleRate: 48000 });
      window.capture = ctx.createScriptProcessor(4096, 1, 1);
      window.chunks = [];
      capture.onaudioprocess = (e) => {
        if (window.recording)
          chunks.push({
            time: referenceAudio.currentTime,
            scene: live().animation.time.value,
            context: ctx.currentTime,
            samples: Array.from(e.inputBuffer.getChannelData(0)).filter(
              (_, i) => i % 6 === 0,
            ),
          });
      };
      ctx.createMediaElementSource(referenceAudio).connect(capture);
      capture.connect(ctx.destination);
      await ctx.resume();
      return {
        samples: Array.from(samples),
        duration: buffer.duration,
        mediaDuration: referenceAudio.duration,
      };
    });
    assert.equal(
      await page.evaluate(() => referenceAudio.currentSrc.startsWith("blob:")),
      true,
    );
    const results = [];
    for (const offset of [0, 21, 54, 33, 21]) {
      await page.evaluate((offset) => {
        const a = live().animation;
        a.stop();
        a.config.value.duration = 31;
        a.seek(5);
        a.audio.setStart(offset);
      }, offset);
      await page.waitForFunction(
        (offset) =>
          !referenceAudio.seeking &&
          Math.abs(referenceAudio.currentTime - offset) < 0.01,
        offset,
      );
      await page.evaluate(() => {
        window.chunks = [];
        window.recording = true;
        live().animation.play();
      });
      await page.waitForTimeout(2300);
      results.push(
        await page.evaluate((offset) => {
          window.recording = false;
          live().animation.stop();
          return { offset, chunks };
        }, offset),
      );
    }
    for (const result of results) {
      const measured = result.chunks
        .slice(5, 22)
        .map((c) => measure(reference.samples, c))
        .filter((m) => m.correlation > 0.8);
      assert(
        measured.length >= 3,
        "At least three strongly correlated audio blocks per offset",
      );
      const median = measured.map((m) => m.error).sort((a, b) => a - b)[
        Math.floor(measured.length / 2)
      ];
      // ScriptProcessor callbacks can be delayed by the UI thread; the median
      // detects a systematic seek error without mistaking callback jitter for it.
      assert(
        Math.abs(median) < 0.012,
        `Audible seek at ${result.offset}s median must stay within 12ms: ${JSON.stringify(measured)}`,
      );
      console.log(
        "Audible source offset",
        result.offset,
        "s; median error",
        median * 1000,
        "ms",
      );
    }
    // The same input can use Kdenlive-style frame units without modifying stored seconds.
    await page.getByLabel("Unité du timecode").selectOption("frames");
    await page.getByLabel("Début dans le fichier · secondes").fill("21");
    await page.getByLabel("Début dans le fichier · secondes").press("Tab");
    await page.getByLabel("Début dans le fichier · images").fill("15");
    await page.getByLabel("Début dans le fichier · images").press("Tab");
    assert.equal(
      await page.evaluate(() => live().animation.audio.settings.value.start),
      21.5,
    );
    assert.match(
      await page.locator(".timeline-source-time").innerText(),
      /00:00:21:15/,
    );
    assert.equal(
      await page.getByLabel("Temps de la scène · images").inputValue(),
      "00",
    );
    await page.evaluate(() => live().animation.seek(2));
    await page.waitForFunction(
      () => Math.abs(referenceAudio.currentTime - 23.5) < 0.005,
    );
    await page.screenshot({ path: "/tmp/frame-audio-precision-dark.png" });
    await page.evaluate(() => {
      document.documentElement.dataset.appearance = "light";
    });
    await page.screenshot({ path: "/tmp/frame-audio-precision-light.png" });
    await page.getByLabel("Unité du timecode").selectOption("ms");
    assert.equal(
      await page
        .getByLabel("Début dans le fichier · millisecondes")
        .inputValue(),
      "500",
    );
    console.log(
      "Frames 30fps: 21s15f = 21.5s, scene2 = source23.5, switching units preserves start OK",
    );
  } finally {
    await browser.close();
    fs.rmSync(folder, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
