const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Isolated server required");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 1050 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url + "/#/mise-en-page");
    await p.getByText("Ouvrir un exemple", { exact: true }).click();
    await p.getByLabel("Zone de création").waitFor();
    await p
      .getByRole("button", { name: "Objet · propriétés", exact: true })
      .click();
    assert.match(
      await p.locator(".design-inspector-body").innerText(),
      /Sélectionne un objet/,
    );
    await p
      .getByRole("button", { name: "Document · propriétés", exact: true })
      .first()
      .click();
    await p
      .getByLabel("Couleur de la page · palette du thème")
      .selectOption("accent");
    assert.notEqual(
      await p.getByLabel("Couleur de la page personnalisée").inputValue(),
      "#ffffff",
    );
    assert.equal(
      await p.getByText("Styles du document", { exact: true }).count(),
      0,
    );
    await p.getByText("Marges et grille", { exact: true }).click();
    await p.getByLabel("Nombre de colonnes", { exact: true }).selectOption("2");
    const separator = p.getByRole("slider", {
      name: "Séparation colonne 1 et 2",
      exact: true,
    });
    await separator.focus();
    for (let i = 0; i < 15; i++) await separator.press("ArrowRight");
    assert.equal(await separator.getAttribute("aria-valuenow"), "65");
    await p.getByLabel("Nombre de lignes", { exact: true }).selectOption("3");
    assert.equal(
      await p.getByRole("slider", { name: /Séparation ligne/ }).count(),
      2,
    );
    assert.equal(await p.locator("[data-row-guide]").count(), 6);
    await p.getByLabel("Ajouter une page", { exact: true }).click();
    await p
      .getByLabel("Orientation de la nouvelle page")
      .selectOption("landscape");
    await p.getByRole("button", { name: "Créer la page", exact: true }).click();
    let box = await p.getByLabel("Zone de création").boundingBox();
    assert.ok(box.width > box.height);
    await p.getByLabel("Ajouter un texte", { exact: true }).click();
    await p.getByText("Texte et typographie", { exact: true }).click();
    assert.equal(
      await p
        .getByLabel("Police de l’élément", { exact: true })
        .locator("option")
        .count(),
      12,
    );
    await p
      .getByLabel("Police de l’élément", { exact: true })
      .selectOption("dm-sans");
    await p.getByLabel("Graisse du texte", { exact: true }).selectOption("600");
    await p
      .getByPlaceholder("Nom du style", { exact: true })
      .fill("Titre personnalisé");
    await p
      .getByRole("button", { name: "Créer depuis ce texte", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Modifier le style « Titre personnalisé »" })
      .click();
    await p.getByLabel("Taille du style · valeur", { exact: true }).fill("33");
    await p
      .getByLabel("Taille du style · valeur", { exact: true })
      .dispatchEvent("change");
    await p.waitForTimeout(900);
    await p.reload();
    await p.getByLabel("Zone de création").waitFor();
    await p.screenshot({ path: "/tmp/frame-layout-v3-dark.png" });
    await p.evaluate(
      () => (document.documentElement.dataset.appearance = "light"),
    );
    await p.screenshot({ path: "/tmp/frame-layout-v3-light.png" });
    const result = await p.evaluate(async () => {
      const { designPageSize, designColumns } =
          await import("/src/designModel.js"),
        { designRepository } = await import("/src/designRepository.js"),
        { videoRepository } = await import("/src/videoProjects.js"),
        { designPrintHtml } = await import("/src/designExport.js");
      const repo = designRepository(videoRepository(), "layout"),
        id = location.hash.split("/").at(-1),
        loaded = await repo.load(id);
      return {
        raw: loaded,
        html: designPrintHtml(loaded.document || loaded.doc || loaded),
      };
    });
    assert.match(result.html, /@page sheet2/);
    assert.deepEqual(errors, []);
    console.log("OK layout v3", JSON.stringify(result.raw).slice(0, 100));
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
