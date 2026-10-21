import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Use the isolated origin on 5289");
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page.getByRole("button", { name: /Paramètres des vidéos/ }).click();
  await page.getByRole("button", { name: /Typographie Police/ }).click();
  await page
    .getByLabel("Police des textes de travail", { exact: true })
    .selectOption("mono");
  await page
    .getByLabel("Police de l’interface", { exact: true })
    .selectOption("inter");
  assert.ok(
    await page
      .getByRole("checkbox", { name: "Chiffres de largeur fixe", exact: false })
      .isChecked(),
  );
  await page.evaluate(() => document.fonts.ready);
  const widths = await page
    .getByLabel("Exemple de typographie", { exact: true })
    .evaluate(async (el) => {
      await document.fonts.load('14px "JetBrains Mono"');
      const s = getComputedStyle(el),
        span = document.createElement("span");
      span.style.cssText = "position:absolute;font:inherit;white-space:pre";
      el.append(span);
      const widths = [..."0123456789"].map((d) => {
        span.textContent = d;
        return span.getBoundingClientRect().width;
      });
      span.remove();
      return { font: s.fontFamily, numeric: s.fontVariantNumeric, widths };
    });
  assert.match(widths.font, /JetBrains Mono/);
  assert.equal(widths.numeric, "tabular-nums");
  assert.ok(Math.max(...widths.widths) - Math.min(...widths.widths) < 0.1);
  for (const mode of ["dark", "light"]) {
    await page.evaluate(
      async (mode) => (await import("/src/appearance.js")).setAppearance(mode),
      mode,
    );
    await page.waitForTimeout(180);
    await page.screenshot({ path: "/tmp/frame-typography-" + mode + ".png" });
  }
  await page
    .getByRole("button", { name: "Fermer les paramètres", exact: true })
    .click();
  const id = await page.evaluate(async () => {
    const { videoRepository, makeVideoProject } =
      await import("/src/videoProjects.js");
    const r = videoRepository(),
      p = makeVideoProject("Test police");
    p.workflow.publication.descriptionMode = "manual";
    p.workflow.publication.description =
      "00:00 Introduction\n11:11 Explication";
    await r.put(p);
    return p.id;
  });
  await page.goto(url + "/#/videos/" + id + "/publication");
  await page
    .locator(".publication-drawer > summary")
    .filter({ hasText: /^Description$/ })
    .click();
  assert.match(
    await page
      .getByLabel("Description YouTube", { exact: true })
      .evaluate((el) => getComputedStyle(el).fontFamily),
    /JetBrains Mono/,
  );
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  const final = page.getByLabel("Description finale", { exact: true });
  assert.equal(
    await final.innerText(),
    "00:00 Introduction\n11:11 Explication",
  );
  assert.match(
    await final.evaluate((el) => getComputedStyle(el).fontFamily),
    /JetBrains Mono/,
  );
  await page.reload();
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  assert.match(
    await final.evaluate((el) => getComputedStyle(el).fontFamily),
    /JetBrains Mono/,
  );
  await page.goto(url);
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  await page.getByRole("button", { name: /Paramètres des vidéos/ }).click();
  await page.getByRole("button", { name: /Typographie Police/ }).click();
  await page
    .getByRole("checkbox", { name: "Chiffres de largeur fixe", exact: false })
    .uncheck();
  assert.equal(
    await page
      .getByLabel("Exemple de typographie", { exact: true })
      .evaluate((el) => getComputedStyle(el).fontVariantNumeric),
    "normal",
  );
  assert.equal(
    await page
      .getByLabel("Police des textes de travail", { exact: true })
      .inputValue(),
    "mono",
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: settings UI, equal digit widths, publication preview, persistence, dark/light, independent controls.",
  );
} finally {
  await browser.close();
}
