const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
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
    await p.goto(base + "/#/vectoriel");
    await p.getByText("Ouvrir un exemple", { exact: true }).click();
    await p.getByLabel("Zone de création").waitFor();
    await p.getByRole("button", { name: "Fichier", exact: true }).click();
    await p.getByRole("button", { name: "Thèmes", exact: true }).click();
    await p
      .getByRole("button", { name: "Appliquer Studio", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Retour à Vectoriel", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Plan · propriétés", exact: true })
      .first()
      .click();
    const label = p.getByLabel("Couleur de la page · palette du thème");
    await label.selectOption("accent");
    const color = await p
      .getByLabel("Couleur de la page personnalisée")
      .inputValue();
    await p.waitForTimeout(900);
    const saved = await p.evaluate(async () => {
      const { designRepository } = await import("/src/designRepository.js"),
        { videoRepository } = await import("/src/videoProjects.js");
      return await designRepository(videoRepository(), "vector").load(
        location.hash.split("/").at(-1),
      );
    });
    assert.equal(saved.document.themeId, "paper");
    assert.equal(
      await p.evaluate(() => localStorage.getItem("frame-default-theme")),
      "paper",
    );
    assert.equal(
      await p.getByText("Palette du thème", { exact: true }).count(),
      0,
    );
    await p.screenshot({ path: "/tmp/frame-drawers-dark.png" });
    await p.evaluate(
      () => (document.documentElement.dataset.appearance = "light"),
    );
    await p.screenshot({ path: "/tmp/frame-drawers-light.png" });
    await p.reload();
    await p.getByLabel("Zone de création").waitFor();
    await p
      .getByRole("button", { name: "Plan · propriétés", exact: true })
      .first()
      .click();
    assert.equal(
      await p.getByLabel("Couleur de la page personnalisée").inputValue(),
      color,
    );
    assert.deepEqual(errors, []);
    console.log(
      "OK theme gallery, document theme, reload, palettes, light/dark",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
