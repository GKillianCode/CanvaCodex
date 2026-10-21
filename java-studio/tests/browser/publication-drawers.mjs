import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright"),
  url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Use isolated 5289 origin");
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
  const id = await page.evaluate(async () => {
    const { videoRepository, makeVideoProject } =
      await import("/src/videoProjects.js");
    const { normalizePublication } = await import("/src/videoWorkflow.js");
    const p = makeVideoProject("Treize chapitres");
    p.workflow.publication = normalizePublication({
      descriptionMode: "template",
      descriptionRecipe: { templateId: "frame-course-default" },
      chapters: Array.from({ length: 13 }, (_, i) => ({
        id: crypto.randomUUID(),
        time: String(i).padStart(2, "0") + ":00",
        title: "Chapitre " + (i + 1),
      })),
    });
    await videoRepository().put(p);
    return p.id;
  });
  await page.goto(url + "/#/videos/" + id + "/publication");
  const chapters = page.locator(".publication-drawer").filter({
    has: page.locator("summary").filter({ hasText: /^Chapitres13$/ }),
  });
  await chapters.waitFor();
  assert.equal(await chapters.getAttribute("open"), null);
  assert.equal(
    await chapters
      .locator(":scope > summary > .publication-drawer-chevron")
      .count(),
    1,
  );
  assert.equal(
    await chapters
      .locator(":scope > summary")
      .evaluate((el) => getComputedStyle(el, "::after").content),
    "none",
  );
  assert.equal(
    await page
      .getByLabel("Horaire du chapitre 13", { exact: true })
      .isVisible(),
    false,
  );
  await chapters.locator(":scope > summary").click();
  await page
    .getByLabel("Titre du chapitre 13", { exact: true })
    .fill("Conclusion modifiée");
  let saved = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    saved = await page.evaluate(async (id) => {
      const { videoRepository } = await import("/src/videoProjects.js");
      const p = await videoRepository().get(id);
      return (
        p.workflow.publication.revision > 0 &&
        p.workflow.publication.chapters[12].title === "Conclusion modifiée"
      );
    }, id);
    if (saved) break;
    await page.waitForTimeout(50);
  }
  assert.ok(saved, "The chapter must be committed before reloading");
  await chapters.locator(":scope > summary").click();
  await page.reload();
  await chapters.waitFor();
  assert.equal(await chapters.getAttribute("open"), null);
  await chapters.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.getByLabel("Titre du chapitre 13", { exact: true }).inputValue(),
    "Conclusion modifiée",
  );
  await page.reload();
  await chapters.waitFor();
  assert.equal(await chapters.getAttribute("open"), "");
  await chapters.locator(":scope > summary").click();
  for (const mode of ["dark", "light"]) {
    await page.evaluate(
      async (mode) => (await import("/src/appearance.js")).setAppearance(mode),
      mode,
    );
    await page.waitForTimeout(150);
    await page.screenshot({
      path: "/tmp/frame-publication-drawers-" + mode + ".png",
    });
  }
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  assert.match(
    await page.getByLabel("Description finale", { exact: true }).innerText(),
    /12:00 Conclusion modifiée/,
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: 13 chapters, collapse/expand, keyboard, edits preserved, persisted drawer state, preview unchanged.",
  );
} finally {
  await browser.close();
}
