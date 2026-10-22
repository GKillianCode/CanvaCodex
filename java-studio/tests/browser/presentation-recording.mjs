import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright"),
  url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Use the isolated server on 5289");
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1000 },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors = [],
    requests = [],
    downloads = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/__frame_presentation__/")) requests.push(r.url());
  });
  page.on("download", (d) => downloads.push(d));
  await page.goto(url + "/#/diaporamas");
  await page.getByRole("button", { name: "Présenter", exact: true }).click();
  assert.equal(
    await page.getByText("Fond transparent", { exact: true }).count(),
    0,
  );
  const format = page.getByLabel("Format d’enregistrement", { exact: true });
  assert.equal(await format.inputValue(), "mp4");
  for(const appearance of ['dark','light']) {
    await page.evaluate(value=>document.documentElement.dataset.appearance=value,appearance);
    const colors=await format.locator('option').first().evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
    assert.notEqual(colors.fg,colors.bg);
    assert.equal(colors.bg,appearance==='dark'?'rgb(24, 33, 38)':'rgb(255, 255, 255)');
  }
  await page.evaluate(()=>document.documentElement.dataset.appearance='dark');
  await page.getByRole("button", { name: "Enregistrer", exact: true }).focus();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  const stop = page.getByRole("button", {
    name: "Stop : arrêter l’enregistrement",
    exact: true,
  });
  await stop.waitFor({ timeout: 15000 });
  assert.equal(await stop.getAttribute("tabindex"), "-1");
  assert.equal(
    await stop.evaluate((el) => el === document.activeElement),
    false,
  );
  await stop.evaluate((el) => el.focus());
  assert.equal(
    await stop.evaluate((el) => el === document.activeElement),
    false,
  );
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  assert.ok(await stop.isVisible());
  await page.keyboard.press("Escape");
  assert.ok(await stop.isVisible());
  assert.equal(downloads.length, 0);
  await page.getByTitle("Quitter (Échap)", { exact: true }).click();
  assert.ok(await stop.isVisible());
  const deadline = Date.now() + 20000;
  while (
    requests.filter((u) => u.includes("/chunk?")).length < 5 &&
    Date.now() < deadline
  )
    await page.waitForTimeout(100);
  assert.ok(requests.filter((u) => u.includes("/chunk?")).length >= 5);
  assert.equal(requests.filter((u) => u.endsWith("/finish")).length, 0);
  assert.equal(downloads.length, 0);
  assert.ok(await stop.isVisible());
  await page.screenshot({ path: "/tmp/frame-continuous-recording.png" });
  const downloadPromise = page.waitForEvent("download", {timeout:120000});
  await stop.click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.equal(requests.filter((u) => u.endsWith("/finish")).length, 1);
  assert.equal(download.suggestedFilename(), "frame-presentation.mp4");
  const info = JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_name",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      path,
    ]),
  );
  assert.equal(info.streams[0].codec_name, "h264");
  assert.ok(Number(info.format.duration) >= 4);
  const pixels = execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    path,
    "-frames:v",
    "1",
    "-vf",
    "scale=16:16",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "pipe:1",
  ]);
  for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
  assert.equal(downloads.length, 1);
  assert.deepEqual(errors, []);
  console.log(
    "OK: progressive capture, no automatic finish, opaque MP4, exit protection, Stop unfocusable, Enter/Space safe, explicit pointer Stop only.",
  );
} finally {
  await browser.close();
}
