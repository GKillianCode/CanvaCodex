import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright"),
  url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Use the isolated origin on 5289");
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const id = await page.evaluate(async () => {
    const { videoRepository, makeVideoProject } =
      await import("/src/videoProjects.js");
    const { normalizeConductor } = await import("/src/videoWorkflow.js");
    const p = makeVideoProject("Navigation de test");
    p.workflow.conductor = normalizeConductor({
      sequences: [
        {
          id: crypto.randomUUID(),
          title: "Introduction",
          script: "Une explication.",
        },
      ],
    });
    await videoRepository().put(p);
    return p.id;
  });
  const base = url + "/#/videos/" + id;
  async function order(mode) {
    const tabs = page.getByRole("navigation", { name: "Vues de la vidéo" }),
      modes = page.getByLabel(mode, { exact: true });
    await tabs.waitFor();
    const left = await tabs.boundingBox(),
      right = await modes.boundingBox();
    assert.ok(
      left.x + left.width <= right.x + 1,
      "Workflow navigation precedes prepare/preview",
    );
  }
  await page.goto(base + "/conductor");
  await order("Mode du conducteur");
  assert.ok(
    await page
      .getByRole("button", { name: "Présenter", exact: true })
      .isVisible(),
  );
  await page
    .getByLabel("Titre de la partie", { exact: true })
    .fill("Partie sauvegardée avant retour");
  await page
    .getByRole("button", {
      name: "Revenir à la fiche vidéo : Navigation de test",
      exact: true,
    })
    .click();
  await page.waitForURL(base);
  assert.equal(
    await page.evaluate(async (id) => {
      const { videoRepository } = await import("/src/videoProjects.js");
      return (await videoRepository().get(id)).workflow.conductor.sequences[0]
        .title;
    }, id),
    "Partie sauvegardée avant retour",
  );
  await page.goto(base + "/publication");
  await order("Mode de publication");
  await page
    .locator(".publication-drawer>summary")
    .filter({ hasText: /^Titre$/ })
    .click();
  await page
    .getByLabel("Titre YouTube", { exact: true })
    .fill("Publication sauvegardée avant retour");
  await page.getByRole("button", { name: "Vidéo", exact: true }).click();
  await page.waitForURL(base);
  assert.equal(
    await page.evaluate(async (id) => {
      const { videoRepository } = await import("/src/videoProjects.js");
      return (await videoRepository().get(id)).workflow.publication.title;
    }, id),
    "Publication sauvegardée avant retour",
  );
  await page.goto(base + "/publication");
  await page
    .getByRole("button", {
      name: "Revenir à la fiche vidéo : Navigation de test",
      exact: true,
    })
    .click();
  await page.waitForURL(base);
  await page.goto(base + "/conductor");
  await page.getByRole("button", { name: "Vidéo", exact: true }).click();
  await page.waitForURL(base);
  await page.goto(base + "/conductor");
  await page
    .getByRole("navigation", { name: "Vues de la vidéo" })
    .getByRole("button", { name: "Publication", exact: true })
    .click();
  await page.waitForURL(base + "/publication");
  await order("Mode de publication");
  await page
    .locator(".workspace-header")
    .screenshot({ path: "/tmp/frame-publication-header-dark.png" });
  await page
    .getByRole("navigation", { name: "Vues de la vidéo" })
    .getByRole("button", { name: "Conducteur", exact: true })
    .click();
  await page.waitForURL(base + "/conductor");
  await order("Mode du conducteur");
  await page.evaluate(async () =>
    (await import("/src/appearance.js")).setAppearance("light"),
  );
  await page.waitForTimeout(200);
  await page
    .locator(".workspace-header")
    .screenshot({ path: "/tmp/frame-conductor-header-light.png" });
  assert.deepEqual(errors, []);
  console.log(
    "OK: title and icon return to the current video from both workshops, save before navigation, consistent menu order, Present retained.",
  );
} finally {
  await browser.close();
}
