import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.FRAME_TEST_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):5289\/?$/.test(url))
  throw Error("Use an isolated test origin on port 5289.");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.FRAME_CHROME || "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1500, height: 1000 },
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  const ids = await page.evaluate(async () => {
    for (const key of [
      "title",
      "model",
      "intro",
      "programme",
      "description",
      "chapters",
      "music",
      "comment",
    ])
      localStorage.setItem("frame-publication-drawer:" + key, "true");
    const { videoRepository, makeVideoProject } =
        await import("/src/videoProjects.js"),
      { normalizePublication } = await import("/src/videoWorkflow.js"),
      { normalizeDescriptionLibrary, structuredTemplate } =
        await import("/src/publicationTemplates.js");
    const r = videoRepository(),
      rows = ["Avant", "Vidéo en préparation", "Après", "Deuxième vidéo"].map(
        (name) => makeVideoProject(name),
      );
    for (const [i, p] of rows.entries()) {
      p.workflow.publication = normalizePublication({
        description:
          i === 1 ? "DESCRIPTION HISTORIQUE À GARDER" : "Autre texte",
        details: { videoUrl: "https://youtu.be/audit-" + i },
      });
      await r.put(p);
    }
    await r.setSetting(
      "video-order",
      rows.map((p) => p.id),
    );
    const template = structuredTemplate(
      "audit-model",
      "Mon modèle pédagogique",
    );
    template.slots = [
      {
        id: "objectif",
        label: "Mes objectifs",
        kind: "list",
        defaultBlockId: "",
      },
    ];
    template.body += "\n\n{{partie:objectif}}\n\n{{bloc:commun}}";
    template.playlistUrl = "https://www.youtube.com/playlist?list=audit";
    await r.setSetting(
      "publication-description-library",
      normalizeDescriptionLibrary({
        templates: [template],
        blocks: [
          {
            id: "commun",
            name: "Signature libre",
            content: "Un bloc personnel réutilisable.",
          },
        ],
      }),
    );
    await r.setSetting("publication-music-library", [
      {
        id: "track",
        title: "Ambiance de test",
        artist: "Artiste",
        url: "https://example.com/track",
        license: "Licence de test",
      },
    ]);
    return rows.map((p) => p.id);
  });
  const route = (id) => url + "/#/videos/" + id + "/publication";
  await page.goto(route(ids[1]));
  await page.getByLabel("Modèle de description", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Description YouTube", { exact: true }).inputValue(),
    "DESCRIPTION HISTORIQUE À GARDER",
  );
  await page
    .getByLabel("Modèle de description", { exact: true })
    .selectOption("audit-model");
  await page
    .getByLabel("Introduction de la vidéo", { exact: true })
    .fill("Une introduction pour présenter le sujet.");
  await page
    .getByLabel("Programme de la vidéo", { exact: true })
    .fill("Comprendre la notion étudiée\nObserver son comportement");
  await page
    .getByLabel("Source de Mes objectifs", { exact: true })
    .selectOption("custom");
  await page
    .getByLabel("Mes objectifs", { exact: true })
    .fill("Objectif A\nObjectif B");
  for (let i = 1; i <= 3; i++) {
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page
      .getByLabel("Horaire du chapitre " + i, { exact: true })
      .fill(i === 1 ? "00:00" : "0" + (i - 1) + ":00");
    await page
      .getByLabel("Titre du chapitre " + i, { exact: true })
      .fill("Partie " + i);
  }
  await page
    .locator(".publication-detail-card > summary")
    .filter({ hasText: "Informations techniques" })
    .click();
  await page
    .getByRole("button", { name: "Ajouter une notion", exact: true })
    .click();
  await page
    .getByLabel("Notion 1", { exact: true })
    .fill("Notion de démonstration");
  await page
    .getByLabel("Version Java de la notion 1", { exact: true })
    .fill("17");
  await page
    .locator(".publication-detail-card > summary")
    .filter({ hasText: "Ressources complémentaires" })
    .click();
  await page
    .getByRole("button", { name: "Ajouter une ressource", exact: true })
    .click();
  await page
    .getByLabel("Nom de la ressource 1", { exact: true })
    .fill("Documentation de démonstration");
  await page
    .getByLabel("Lien de la ressource 1", { exact: true })
    .fill("https://example.com/docs");
  await page.locator(".publication-music-picker > summary").click();
  await page.getByRole("checkbox", { name: /Ambiance de test/ }).check();
  await page
    .locator(".publication-detail-card > summary")
    .filter({ hasText: "Hashtags et mots-clés" })
    .click();
  await page
    .getByLabel("Hashtags de la description", { exact: true })
    .fill("#Cours #Java");
  await page.getByLabel("Tags YouTube", { exact: true }).fill("cours, java");
  await page
    .getByLabel("Commentaire épinglé", { exact: true })
    .fill("Mon commentaire personnel.");
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  const final = page.getByLabel("Description finale", { exact: true });
  await final.waitFor();
  let text = await final.innerText();
  for (const fragment of [
    "Une introduction pour présenter",
    "Au programme",
    "00:00 Partie 1",
    "Informations techniques",
    "depuis Java 17",
    "https://youtu.be/audit-0",
    "https://youtu.be/audit-2",
    "playlist?list=audit",
    "Ambiance de test",
    "Mes objectifs",
    "• Objectif A",
    "Un bloc personnel réutilisable.",
    "#Cours #Java",
  ])
    assert.ok(text.includes(fragment), fragment);
  assert.ok(!text.includes("https://example.com/docs"));
  assert.ok(!text.includes("DESCRIPTION HISTORIQUE"));
  assert.equal(
    await page
      .locator(
        ".publication-final-preview input,.publication-final-preview textarea",
      )
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Copier", exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), text);
  await page
    .getByRole("button", { name: "Commentaire épinglé", exact: true })
    .click();
  assert.match(
    await page.getByLabel("Commentaire final", { exact: true }).innerText(),
    /Mon commentaire personnel\.[\s\S]*https:\/\/example.com\/docs/,
  );
  await page.getByRole("button", { name: "Description", exact: true }).click();
  // Another video uses the same model. A shared title change must update both.
  const second = await context.newPage();
  second.on("pageerror", (e) => errors.push(e.message));
  await second.goto(route(ids[3]));
  await second
    .getByLabel("Modèle de description", { exact: true })
    .selectOption("audit-model");
  await second
    .getByLabel("Programme de la vidéo", { exact: true })
    .fill("Un autre programme");
  await second.getByRole("button", { name: "Aperçu", exact: true }).click();
  const libraryPage = await context.newPage();
  libraryPage.on("pageerror", (e) => errors.push(e.message));
  await libraryPage.goto(url + "/#/modeles-description");
  await libraryPage
    .getByRole("button", { name: "Rubriques et chaîne", exact: true })
    .click();
  await libraryPage
    .getByRole("button", {
      name: "Modifier les réglages partagés",
      exact: true,
    })
    .click();
  await libraryPage
    .getByRole("button", { name: "Textes communs", exact: true })
    .click();
  await libraryPage
    .getByLabel("Titre commun · Au programme", { exact: true })
    .fill("Ce que vous allez apprendre");
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByText("Bibliothèque enregistrée.", { exact: true })
    .waitFor();
  await page
    .getByText("Ce que vous allez apprendre", { exact: false })
    .first()
    .waitFor();
  await second
    .getByText("Ce que vous allez apprendre", { exact: false })
    .first()
    .waitFor();
  // Edit a model using tag insertion, add a custom per-video part and create a shared block.
  await libraryPage
    .getByRole("button", { name: "Modèles", exact: true })
    .click();
  await libraryPage
    .getByRole("button", {
      name: "Modifier Mon modèle pédagogique",
      exact: true,
    })
    .click();
  await libraryPage
    .getByRole("button", { name: "Ajouter une partie", exact: true })
    .click();
  const last = libraryPage.locator(".resource-slots article").last();
  await last.getByLabel("Nom", { exact: true }).fill("Ma rubrique libre");
  await last
    .getByLabel("Format de Ma rubrique libre", { exact: true })
    .selectOption("text");
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByText("Bibliothèque enregistrée.", { exact: true })
    .waitFor();
  await libraryPage
    .getByRole("button", { name: "Blocs réutilisables", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Ajouter à la bibliothèque", exact: true })
    .click();
  await libraryPage
    .getByLabel("Nom de l’élément", { exact: true })
    .fill("Mon nouveau bloc");
  await libraryPage
    .getByLabel("Contenu du bloc", { exact: true })
    .fill("Une rubrique entièrement personnelle.");
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Modèles", exact: true })
    .click();
  await libraryPage
    .getByRole("button", {
      name: "Modifier Mon modèle pédagogique",
      exact: true,
    })
    .click();
  await libraryPage.locator(".description-source > summary").click();
  await libraryPage
    .getByLabel("Structure de la description", { exact: true })
    .click();
  await libraryPage
    .getByLabel("Structure de la description", { exact: true })
    .press("Control+End");
  await libraryPage
    .getByRole("button", { name: "Bloc · Mon nouveau bloc", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await page.getByRole("button", { name: "Préparer", exact: true }).click();
  await page
    .getByLabel("Source de Ma rubrique libre", { exact: true })
    .waitFor();
  await page
    .getByLabel("Source de Ma rubrique libre", { exact: true })
    .selectOption("custom");
  await page
    .getByLabel("Ma rubrique libre", { exact: true })
    .fill("Texte différent pour cette vidéo.");
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await final
    .filter({ hasText: "Une rubrique entièrement personnelle." })
    .waitFor();
  assert.match(await final.innerText(), /Ma rubrique libre\nTexte différent/);
  // Switching back preserves the original free description; switching again restores custom values.
  await page.getByRole("button", { name: "Préparer", exact: true }).click();
  await page
    .getByLabel("Modèle de description", { exact: true })
    .selectOption("");
  assert.equal(
    await page.getByLabel("Description YouTube", { exact: true }).inputValue(),
    "DESCRIPTION HISTORIQUE À GARDER",
  );
  await page
    .getByLabel("Modèle de description", { exact: true })
    .selectOption("audit-model");
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  // Styles are configured once in the shared library, never per video.
  await page.getByRole("button", { name: "Préparer", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Style Encadré", exact: true })
      .count(),
    0,
  );
  await libraryPage
    .getByRole("button", { name: "Rubriques et chaîne", exact: true })
    .click();
  await libraryPage
    .getByRole("button", {
      name: "Modifier les réglages partagés",
      exact: true,
    })
    .click();
  await libraryPage
    .getByRole("button", { name: "Apparence", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Style par défaut Encadré", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByText("Bibliothèque enregistrée.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  await final
    .filter({ hasText: "=== Ce que vous allez apprendre ===" })
    .waitFor();
  await page.getByRole("button", { name: "Préparer", exact: true }).click();
  await page.screenshot({
    path: "/tmp/frame-publication-editor.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  for (const mode of ["dark", "light"]) {
    await page.evaluate(
      async (mode) => (await import("/src/appearance.js")).setAppearance(mode),
      mode,
    );
    await page.waitForTimeout(200);
    await page.screenshot({
      path: "/tmp/frame-publication-" + mode + ".png",
      fullPage: true,
    });
  }
  // One renderer drives export and preview.
  text = await final.innerText();
  await page.getByRole("button", { name: "Fichier", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Exporter les textes de publication",
      exact: true,
    })
    .click();
  const download = await downloaded,
    exported = await readFile(await download.path(), "utf8");
  assert.ok(
    exported.includes("DESCRIPTION\n" + text + "\n\nCOMMENTAIRE ÉPINGLÉ"),
  );
  assert.ok(exported.includes("TAGS YOUTUBE\ncours, java"));
  await page.reload();
  await page.getByRole("button", { name: "Aperçu", exact: true }).click();
  assert.equal(await final.innerText(), text);
  // A shared custom pack updates every templated video.
  await libraryPage
    .getByRole("button", { name: "Rubriques et chaîne", exact: true })
    .click();
  await libraryPage
    .getByRole("button", {
      name: "Modifier les réglages partagés",
      exact: true,
    })
    .click();
  await libraryPage
    .getByRole("button", { name: "Apparence", exact: true })
    .click();
  await libraryPage
    .getByRole("button", { name: "Créer un style", exact: true })
    .click();
  await libraryPage
    .getByLabel("Nom du style", { exact: true })
    .fill("Mon style de chaîne");
  await libraryPage
    .getByLabel("Signes avant le titre", { exact: true })
    .fill(">>>");
  await libraryPage
    .getByLabel("Signes après le titre", { exact: true })
    .fill("<<<");
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByText("Bibliothèque enregistrée.", { exact: true })
    .waitFor();
  await second
    .locator(".publication-final-text")
    .filter({ hasText: ">>> Ce que vous allez apprendre <<<" })
    .waitFor();
  await final
    .filter({ hasText: ">>> Ce que vous allez apprendre <<<" })
    .waitFor();
  await libraryPage.evaluate(async () =>
    (await import("/src/appearance.js")).setAppearance("light"),
  );
  await libraryPage.waitForTimeout(200);
  assert.ok(
    await libraryPage
      .getByRole("button", {
        name: "Style par défaut Mon style de chaîne",
        exact: true,
      })
      .isVisible(),
  );
  await libraryPage.screenshot({
    path: "/tmp/frame-publication-library.png",
    fullPage: true,
  });
  // Reorder the shared model itself using a real browser drag-and-drop.
  await libraryPage
    .getByRole("button", { name: "Structure", exact: true })
    .click();
  await libraryPage
    .getByLabel("Modèle partagé à organiser", { exact: true })
    .selectOption("audit-model");
  await libraryPage
    .getByRole("button", {
      name: "Modifier les réglages partagés",
      exact: true,
    })
    .click();
  const organizer = libraryPage.getByRole("region", {
    name: "Ordre des sections",
  });
  const list = libraryPage.locator(
    ".description-settings-structure .description-sections",
  );
  await list
    .getByRole("button", { name: "Déplacer Chapitres", exact: true })
    .dragTo(list.locator("li").first(), { targetPosition: { x: 100, y: 5 } });
  assert.equal(
    await list.locator(".description-section-name strong").first().innerText(),
    "Chapitres",
  );
  await libraryPage
    .getByRole("button", { name: "Enregistrer", exact: true })
    .click();
  await libraryPage
    .getByText("Bibliothèque enregistrée.", { exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document
      .querySelector(".publication-final-text")
      ?.textContent.trim()
      .startsWith(">>> Chapitres <<<"),
  );
  await libraryPage.reload();
  await libraryPage
    .getByRole("button", { name: "Rubriques et chaîne", exact: true })
    .click();
  await libraryPage
    .getByLabel("Modèle partagé à organiser", { exact: true })
    .selectOption("audit-model");
  assert.equal(
    await libraryPage
      .locator(
        ".description-settings-structure .description-section-name strong",
      )
      .first()
      .innerText(),
    "Chapitres",
  );
  for (const mode of ["light", "dark"]) {
    await libraryPage.evaluate(
      async (mode) => (await import("/src/appearance.js")).setAppearance(mode),
      mode,
    );
    await libraryPage.waitForTimeout(200);
    await libraryPage.screenshot({
      path: "/tmp/frame-description-structure-" + mode + ".png",
      fullPage: true,
    });
  }
  await libraryPage
    .getByRole("button", { name: "Textes communs", exact: true })
    .click();
  await libraryPage.screenshot({
    path: "/tmp/frame-description-content.png",
    fullPage: true,
  });
  await libraryPage.setViewportSize({ width: 850, height: 1000 });
  await libraryPage
    .getByRole("button", { name: "Structure", exact: true })
    .click();
  assert.ok(
    await libraryPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const freshId = await page.evaluate(async () => {
    const { videoRepository, makeVideoProject } =
      await import("/src/videoProjects.js");
    const p = makeVideoProject("Publication neuve");
    await videoRepository().put(p);
    return p.id;
  });
  await page.goto(route(freshId));
  await page.getByLabel("Modèle de description", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("Modèle de description", { exact: true })
      .inputValue(),
    "frame-course-default",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Style Encadré", exact: true })
      .count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: editable shared model, custom blocks/parts, programme/chapters, optional links, shared headings in two videos, preview/copy/export parity, free-text preservation and reload.",
  );
} finally {
  await browser.close();
}
