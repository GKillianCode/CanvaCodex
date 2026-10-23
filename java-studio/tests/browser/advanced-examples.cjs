const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1600, height: 1050 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const stored = (kind) =>
      p.evaluate(async (kind) => {
        const { designRepository } = await import("/src/designRepository.js"),
          { videoRepository } = await import("/src/videoProjects.js");
        return (
          await designRepository(videoRepository(), kind).load(
            location.hash.split("/").at(-1),
          )
        ).document;
      }, kind);
    await p.goto(base + "/#/vectoriel");
    await p.locator(".design-example-cover").waitFor();
    await p.waitForFunction(
      () => document.querySelector(".design-example-cover")?.naturalWidth > 0,
    );
    await p.screenshot({ path: "/tmp/frame-examples/library-dark.png" });
    await p.evaluate(async () => {
      const { setAppearance } = await import("/src/appearance.js");
      setAppearance("light");
    });
    await p.screenshot({ path: "/tmp/frame-examples/library-light.png" });
    await p
      .getByRole("button", { name: "Explorer le projet", exact: true })
      .click();
    await p.getByLabel("Zone de création").waitFor();
    const vectorUrl = p.url();
    let vector = await stored("vector");
    assert.equal(vector.pages.length, 4);
    await p
      .getByRole("button", { name: "Calques · propriétés", exact: true })
      .click();
    await p
      .locator(".design-layer-name")
      .filter({ hasText: "La mémoire, sans boîte noire." })
      .click();
    await p.getByText("Texte et typographie", { exact: true }).click();
    await p
      .getByRole("button", { name: "Éditer le texte", exact: true })
      .click();
    await p
      .getByLabel("Texte de l’objet")
      .fill("Atlas mémoire\nVersion de travail.");
    await p.getByRole("button", { name: "Appliquer", exact: true }).click();
    await p.waitForTimeout(800);
    assert.ok(
      (await stored("vector")).pages[0].elements.some(
        (e) => e.text === "Atlas mémoire\nVersion de travail.",
      ),
    );
    await p.getByRole("button", { name: "Annuler", exact: true }).click();
    await p.waitForTimeout(800);
    assert.ok(
      (await stored("vector")).pages[0].elements.some(
        (e) => e.text === "La mémoire,\nsans boîte noire.",
      ),
    );
    // Open a real multi-object group and nudge it without detaching its Boolean cutter.
    await p.locator(".design-page-row").nth(2).click();
    await p
      .getByRole("button", { name: "Calques · propriétés", exact: true })
      .click();
    await p
      .locator(".design-layer-name")
      .filter({ hasText: "Anneau · soustraction" })
      .click();
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(800);
    let moved = await stored("vector"),
      ring = moved.pages[2].elements.find(
        (e) => e.name === "Anneau · soustraction",
      ),
      cut = moved.pages[2].elements.find((e) => e.id === ring.cutouts[0]);
    assert.equal(cut.x - ring.x, 58);
    assert.equal(ring.x, 101);
    await p.getByRole("button", { name: "Annuler", exact: true }).click();
    await p.getByRole("button", { name: "Exporter", exact: true }).click();
    const dialog = p.getByRole("dialog", { name: "Exporter le document" });
    await dialog.getByLabel("Zone à exporter").selectOption("page");
    const svgDownload = p.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Exporter SVG", exact: true })
      .click();
    const svgFile = await svgDownload,
      svg = await fs.readFile(await svgFile.path(), "utf8");
    assert.match(svg, /@font-face/);
    assert.match(svg, /SIL OPEN FONT LICENSE/);
    assert.match(svg, /<mask /);
    await dialog.getByLabel("Format", { exact: true }).selectOption("png");
    const pngDownload = p.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Exporter PNG", exact: true })
      .click();
    const png = await pngDownload;
    assert.ok((await fs.stat(await png.path())).size > 10000);
    await p.getByLabel("Fermer l’export").click();
    await p.waitForTimeout(800);
    await p.reload();
    await p.getByLabel("Zone de création").waitFor();
    assert.equal((await stored("vector")).pages.length, 4);
    await p.goto(base + "/#/mise-en-page");
    await p
      .getByRole("button", { name: "Explorer le projet", exact: true })
      .click();
    await p.getByLabel("Zone de création").waitFor();
    let layout = await stored("layout");
    assert.equal(layout.pages.length, 7);
    await p.locator(".design-page-row").nth(4).click();
    const box = await p.getByLabel("Zone de création").boundingBox();
    assert.ok(box.width > box.height);
    await p.screenshot({ path: "/tmp/frame-examples/layout-poster-ui.png" });
    // Exercise the actual print pipeline, including its isolated font faces and cleanup.
    await p.evaluate(() => {
      window.__printed = false;
      const original = document.createElement.bind(document);
      document.createElement = function (tag, ...args) {
        const element = original(tag, ...args);
        if (String(tag).toLowerCase() === "iframe")
          element.addEventListener("load", () => {
            element.contentWindow.print = () => (window.__printed = true);
          });
        return element;
      };
    });
    await p.getByRole("button", { name: "Exporter", exact: true }).click();
    await p.getByRole("button", { name: "Exporter PDF", exact: true }).click();
    await p.waitForFunction(() => window.__printed);
    const info = await p.evaluate(() => {
      const f = document.querySelector(
        'iframe[title="Document prêt à imprimer"]',
      );
      return {
        pages: f.contentDocument.querySelectorAll("section").length,
        fonts: f.contentDocument.fonts.size,
        styles: [...f.contentDocument.querySelectorAll("style")]
          .map((s) => s.textContent)
          .join(""),
      };
    });
    assert.equal(info.pages, 7);
    assert.ok(info.fonts > 0 && info.styles.includes("@font-face"));
    await p.evaluate(() =>
      document
        .querySelector('iframe[title="Document prêt à imprimer"]')
        .contentWindow.dispatchEvent(new Event("afterprint")),
    );
    assert.equal(
      await p.locator('iframe[title="Document prêt à imprimer"]').count(),
      0,
    );
    // Generate 300 native shapes through the existing renderer, without saving test content.
    const stress = await p.evaluate(async () => {
      const { createDesign, designElement } =
          await import("/src/designModel.js"),
        { exportDesignSvg } = await import("/src/designExport.js");
      let d = createDesign("vector"),
        start = performance.now();
      d.pages[0].elements = Array.from({ length: 300 }, (_, i) =>
        designElement("shape", {
          x: (i % 20) * 48,
          y: Math.floor(i / 20) * 48,
          w: 30,
          h: 30,
          shape: i % 2 ? "star" : "rounded",
        }),
      );
      const svg = exportDesignSvg(d);
      return {
        objects: (svg.match(/data-design-id=/g) || []).length,
        ms: performance.now() - start,
      };
    });
    assert.equal(stress.objects, 300);
    assert.deepEqual(errors, []);
    console.log(
      "OK advanced projects: create/edit/undo/group/Boolean persistence/SVG+PNG/fonts/PDF+cleanup/stress",
      stress,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
