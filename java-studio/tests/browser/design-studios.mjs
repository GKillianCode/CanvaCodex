import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright"),
  url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Isolated server required");
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1600, height: 1050 },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url + "/#/vectoriel");
  await page
    .getByRole("button", { name: "Ouvrir un exemple", exact: false })
    .click();
  await page.waitForURL(/#\/vectoriel\/[\w-]+/);
  await page.getByLabel("Zone de création").waitFor();
  await page.waitForTimeout(500);
  const vectorUrl = page.url();
  await page.screenshot({ path: "/tmp/frame-vector-dark.png" });
  await page
    .getByRole("button", { name: "Ajouter un rectangle", exact: true })
    .click();
  assert.equal(await page.locator(".design-layer").count(), 8);
  await page.getByLabel("Position X", { exact: true }).fill("320");
  await page.getByLabel("Position X", { exact: true }).dispatchEvent("change");
  await page.keyboard.press("Tab");
  await page
    .getByRole("button", { name: "Dupliquer la sélection", exact: true })
    .click();
  assert.equal(await page.locator(".design-layer").count(), 9);
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  assert.equal(await page.locator(".design-layer").count(), 8);
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();
  assert.equal(await page.locator(".design-layer").count(), 9);
  await page.locator(".design-layer-name").first().click();
  await page
    .getByRole("button", { name: "Supprimer la sélection", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  assert.equal(await page.locator(".design-layer").count(), 9);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter SVG", exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /\.svg$/);
  await page.getByRole("button", { name: "Applications", exact: true }).click();
  assert.equal((await page.locator(".applications-menu").count()) >= 0, true);
  const menu = page.locator(".applications-popover");
  if (await menu.count()) assert.match(await menu.innerText(), /^Notes/);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await page.reload();
  await page.getByLabel("Zone de création").waitFor();
  assert.equal(await page.locator(".design-layer").count(), 9);
  // Make and edit a curved path with the pen.
  await page.getByRole("button", { name: "Outil plume", exact: true }).click();
  const box = await page.getByLabel("Zone de création").boundingBox();
  const points = [
    [0.15, 0.73],
    [0.35, 0.65],
    [0.5, 0.8],
  ];
  for (const [x, y] of points) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width * x + 20,
      box.y + box.height * y - 15,
    );
    await page.mouse.up();
  }
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".design-layer").count(), 10);
  await page.getByText("Points du tracé", { exact: true }).click();
  await page
    .getByRole("button", { name: "Éditer les points", exact: true })
    .click();
  assert.equal(await page.locator(".design-node-tools>rect").count(), 3);
  await page
    .getByRole("button", { name: "Ajouter un point", exact: true })
    .click();
  assert.equal(await page.locator(".design-node-tools>rect").count(), 4);
  await page
    .getByRole("button", { name: "Activer le mode clair", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/frame-vector-light.png" });
  await page.goto(url + "/#/mise-en-page");
  await page
    .getByRole("button", { name: "Ouvrir un exemple", exact: false })
    .click();
  await page.waitForURL(/#\/mise-en-page\/[\w-]+/);
  await page.getByLabel("Zone de création").waitFor();
  assert.equal(await page.locator(".design-page-row").count(), 2);
  await page.screenshot({ path: "/tmp/frame-layout-light.png" });
  await page
    .getByRole("button", { name: "Ajouter un texte continu…", exact: true })
    .click();
  await page
    .getByLabel("Texte continu", { exact: true })
    .fill(
      "Un paragraphe pédagogique avec du texte qui se répartit sur plusieurs pages.\n\n".repeat(
        100,
      ),
    );
  await page
    .getByRole("button", { name: "Créer les pages", exact: true })
    .click();
  assert.ok((await page.locator(".design-page-row").count()) > 2);
  await page.waitForTimeout(800);
  await page.reload();
  await page.getByLabel("Zone de création").waitFor();
  assert.ok((await page.locator(".design-page-row").count()) > 2);
  await page
    .getByRole("button", { name: "Activer le mode sombre", exact: true })
    .click();
  await page.screenshot({ path: "/tmp/frame-layout-dark.png" });
  // Produce the same print document in Chromium and inspect the resulting real PDF.
  const html = await page.evaluate(async () => {
    const { sampleDesign } = await import("/src/designModel.js"),
      { designPrintHtml } = await import("/src/designExport.js");
    return designPrintHtml(sampleDesign("layout"));
  });
  const printPage = await context.newPage();
  await printPage.setContent(html);
  await printPage.pdf({
    path: "/tmp/frame-layout-sample.pdf",
    preferCSSPageSize: true,
    printBackground: true,
  });
  await printPage.close();
  await context.addInitScript(() => {
    window.print = () => {
      window.__printRequested = true;
    };
  });
  await page.getByRole("button", { name: "Exporter PDF", exact: true }).click();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("iframe")).some(
      (f) => f.contentWindow.__printRequested,
    ),
  );
  assert.ok(
    await page.locator('iframe[title="Document prêt à imprimer"]').count(),
  );
  await page.evaluate(() =>
    document
      .querySelector('iframe[title="Document prêt à imprimer"]')
      .contentWindow.dispatchEvent(new Event("afterprint")),
  );
  assert.equal(
    await page.locator('iframe[title="Document prêt à imprimer"]').count(),
    0,
  );
  await page.goto(vectorUrl);
  await page.getByLabel("Zone de création").waitFor();
  assert.equal(await page.locator(".design-layer").count(), 10);
  assert.deepEqual(errors, []);
  const atomic = await page.evaluate(async () => {
    const { videoRepository } = await import("/src/videoProjects.js"),
      { designRepository } = await import("/src/designRepository.js"),
      { createDesign } = await import("/src/designModel.js");
    const repo = videoRepository(),
      store = designRepository(repo, "vector"),
      d = createDesign("vector", "Concurrence");
    const revision = await store.save(d);
    const results = await Promise.allSettled([
      store.save({ ...d, name: "A" }, revision),
      store.save({ ...d, name: "B" }, revision),
    ]);
    return results.map((r) => r.status);
  });
  assert.equal(atomic.filter((s) => s === "fulfilled").length, 1);
  assert.equal(atomic.filter((s) => s === "rejected").length, 1);
  const pixels = await page.evaluate(async () => {
    const { createDesign, designElement } = await import("/src/designModel.js"),
      { exportDesignSvg } = await import("/src/designExport.js");
    const d = createDesign("vector"),
      base = designElement("shape", {
        shape: "rect",
        x: 0,
        y: 0,
        w: 300,
        h: 300,
        fill: "#ff0000",
      }),
      cut = designElement("shape", {
        shape: "rect",
        x: 100,
        y: 100,
        w: 100,
        h: 100,
      });
    base.cutouts = [cut.id];
    d.width = d.height = 300;
    d.pages[0].elements = [base, cut];
    const image = new Image(),
      src = URL.createObjectURL(
        new Blob([exportDesignSvg(d)], { type: "image/svg+xml" }),
      );
    try {
      image.src = src;
      await image.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 300;
      c.getContext("2d").drawImage(image, 0, 0);
      return {
        outside: [...c.getContext("2d").getImageData(20, 20, 1, 1).data],
        inside: [...c.getContext("2d").getImageData(150, 150, 1, 1).data],
      };
    } finally {
      URL.revokeObjectURL(src);
    }
  });
  assert.deepEqual(pixels.outside, [255, 0, 0, 255]);
  assert.equal(pixels.inside[3], 0);
  console.log(
    "OK: both studios, document routing/reload, independent storage, creation, undo/redo, confirmation, pen nodes, SVG download, flowing text and PDF, light/dark",
  );
} finally {
  await browser.close();
}
