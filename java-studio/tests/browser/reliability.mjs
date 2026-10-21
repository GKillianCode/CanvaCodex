// FRAME_TEST_URL must target an isolated Vite server with FRAME_ASSETS_DIR in /tmp.
// FRAME_PLAYWRIGHT_MODULE points to an existing Playwright installation; no dependency install.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const url = process.env.FRAME_TEST_URL;
if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):5289\/?$/.test(url))
  throw Error("Use the isolated test origin on port 5289.");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.FRAME_CHROME || "/usr/bin/google-chrome",
});
try {
  const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 },
    }),
    a = await context.newPage(),
    b = await context.newPage(),
    errors = [];
  for (const page of [a, b])
    page.on("pageerror", (e) => errors.push(e.message));
  await a.goto(url);
  await b.goto(url);
  const seeded = await a.evaluate(async () => {
    const { videoRepository, makeVideoProject, makeCreation, attachCreation } =
        await import("/src/videoProjects.js"),
      r = videoRepository();
    const project = makeVideoProject("Audit — restauration"),
      rows = ["slides", "banners", "thumbnails", "animation"].map((app) =>
        makeCreation(project, app),
      );
    for (const row of rows) attachCreation(project, row);
    await r.put(project);
    for (const row of rows) await r.saveCreation(row);
    await r.createFreeNote({
      id: "audit-note",
      kind: "note",
      title: "Note audit",
      parent: "",
    });
    await r.saveFreeNote({ id: "audit-note", content: "Initial" });
    await r.setSetting("publication-music-library", [
      {
        id: "audit-track",
        title: "Musique",
        artist: "Artiste",
        url: "",
        license: "",
      },
    ]);
    await r.setSetting("publication-description-library", {
      templates: [],
      blocks: [
        { id: "audit-block", name: "Présentation", content: "Texte fixe" },
      ],
    });
    await r.saveCanvas({
      nodes: [
        {
          id: "audit-node",
          videoId: project.id,
          type: "video",
          x: 100,
          y: 100,
        },
      ],
      edges: [],
      groups: [],
    });
    const { upsertAsset, refreshAssets, localAssets } =
        await import("/src/localAssets.js"),
      { themeDraft } = await import("/src/themes.js");
    const theme = themeDraft();
    theme.id = "custom-audit-reliability";
    theme.name = "Audit";
    await upsertAsset("themes", theme);
    const assets = await import("/src/localAssets.js");
    await assets.refreshAssets();
    if (
      !Object.values(assets.localAssets.paths).every((path) =>
        path.startsWith("/tmp/"),
      )
    )
      throw Error("Test assets must live in /tmp.");
    const { captureComponent } = await import("/src/componentsLibrary.js"),
      { makeSlide } = await import("/src/model.js"),
      { builtinMotions } = await import("/src/animationPresets.js");
    const component = captureComponent(
      makeSlide("split"),
      ["title"],
      { x: 0, y: 0 },
      "Composant audit",
    );
    component.id = "audit-component";
    await assets.upsertAsset("components", component);
    await assets.upsertAsset("motions", {
      ...structuredClone(builtinMotions[0]),
      id: "audit-motion",
      name: "Mouvement audit",
    });
    await r.createFreeNote({
      id: "audit-child",
      kind: "note",
      title: "Sous-note",
      parent: "audit-note",
    });
    await r.saveFreeNote({
      id: "audit-child",
      content: "[Note principale](#/notes/audit-note)",
    });
    localStorage.setItem("frame-notes-sidebar-width", "315");
    return { videoId: project.id };
  });
  // A and B read the same revision, then attempt different writes.
  for (const page of [a, b])
    await page.evaluate(async () => {
      window.repo = (await import("/src/videoProjects.js")).videoRepository();
      window.draft = await repo.freeNote("audit-note");
      window.tree = await repo.freeNotesTree();
      window.library = await repo.getSetting("publication-music-library");
    });
  await a.evaluate(async () => {
    draft.content = "Ajout A";
    await repo.saveFreeNote(draft);
  });
  const conflict = await b.evaluate(async () => {
    draft.content = "Ajout B";
    try {
      await repo.saveFreeNote(draft);
      return null;
    } catch (e) {
      return e.code;
    }
  });
  assert.equal(conflict, "FRAME_CONFLICT");
  assert.equal(
    await a.evaluate(async () => (await repo.freeNote("audit-note")).content),
    "Ajout A",
  );
  const structural = await b.evaluate(async () => {
    const { freeTreeSignature } = await import("/src/freeNotes.js");
    const expected = freeTreeSignature(tree);
    await repo.saveFreeNotesTree(
      tree.map((row) => ({ ...row, title: "Renommée" })),
      expected,
    );
    try {
      await repo.saveFreeNotesTree(tree, expected);
      return null;
    } catch (e) {
      return e.code;
    }
  });
  assert.equal(structural, "FRAME_CONFLICT");
  await a.evaluate(async () => {
    const expected = JSON.stringify(library);
    library.push({
      id: "another-track",
      title: "Ajout A",
      artist: "",
      url: "",
      license: "",
    });
    await repo.saveSetting("publication-music-library", library, expected);
  });
  assert.equal(
    await b.evaluate(async () => {
      const expected = JSON.stringify(library);
      library[0].title = "Ajout B";
      try {
        await repo.saveSetting("publication-music-library", library, expected);
        return null;
      } catch (e) {
        return e.code;
      }
    }),
    "FRAME_CONFLICT",
  );
  // Library conflict recovery is visible in the UI and preserves edits.
  await a.goto(url + "/#/musiques");
  await b.goto(url + "/#/musiques");
  for (const page of [a, b]) {
    await page
      .getByRole("button", { name: "Modifier la fiche", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Modifier la fiche", exact: true })
      .click();
  }
  await a.getByLabel("Titre de la musique", { exact: true }).fill("Version A");
  await a.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await a.getByText("Bibliothèque enregistrée.", { exact: true }).waitFor();
  await b.getByLabel("Titre de la musique", { exact: true }).fill("Version B");
  await b.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await b
    .getByRole("button", { name: "Télécharger mon brouillon", exact: true })
    .waitFor();
  assert.equal(
    await b.getByLabel("Titre de la musique", { exact: true }).inputValue(),
    "Version B",
  );
  const download = b.waitForEvent("download");
  await b
    .getByRole("button", { name: "Télécharger mon brouillon", exact: true })
    .click();
  assert.match((await download).suggestedFilename(), /brouillon/);
  b.once("dialog", (d) => d.accept());
  await b
    .getByRole("button", {
      name: "Recharger la version enregistrée",
      exact: true,
    })
    .click();
  await b.waitForFunction(
    () =>
      document.querySelector('[aria-label="Titre de la musique"]')?.value ===
      "Version A",
  );
  // Note UI also refuses stale edits, offers a portable draft, and reloads explicitly.
  await a.goto(url + "/#/notes/audit-note");
  await b.goto(url + "/#/notes/audit-note");
  const editor = (page) => page.locator('[contenteditable="true"]').first();
  await editor(a).waitFor();
  await editor(b).waitFor();
  await editor(a).fill("Texte A UI");
  await a.waitForTimeout(800);
  await editor(b).fill("Texte B UI");
  await b
    .getByRole("button", { name: "Télécharger mon brouillon", exact: true })
    .waitFor();
  assert.match(await editor(b).innerText(), /Texte B UI/);
  b.once("dialog", (d) => d.accept());
  await b
    .getByRole("button", {
      name: "Recharger la version enregistrée",
      exact: true,
    })
    .click();
  await b.waitForFunction(() =>
    document
      .querySelector('[contenteditable="true"]')
      ?.innerText.includes("Texte A UI"),
  );
  // Global export and restore into a fresh browser context; no disk permissions transferred.
  const backup = await a.evaluate(async () => {
    const { createBackup } = await import("/src/workspaceBackup.js");
    return createBackup(
      (await import("/src/videoProjects.js")).videoRepository(),
    );
  });
  assert.equal(backup.database.projects.length, 1);
  assert.equal(backup.database.creations.length, 4);
  assert.ok(
    backup.assets.themes.some((t) => t.id === "custom-audit-reliability"),
  );
  assert.ok(
    !backup.database.settings.some(([key]) => key.startsWith("video-folder-")),
  );
  assert.ok(backup.assets.components.some((c) => c.id === "audit-component"));
  assert.ok(backup.assets.motions.some((c) => c.id === "audit-motion"));
  await a.evaluate(async () => {
    const { updateAssets } = await import("/src/localAssets.js");
    for (const kind of ["components", "themes", "motions"])
      await updateAssets(kind, (data) => {
        data[kind] = [];
      });
  });
  const fresh = await browser.newContext(),
    restore = await fresh.newPage();
  await restore.goto(url);
  const restored = await restore.evaluate(async (data) => {
    const r = (await import("/src/videoProjects.js")).videoRepository(),
      { restoreBackup } = await import("/src/workspaceBackup.js");
    await restoreBackup(data, r);
    await restoreBackup(data, r);
    return r.exportSnapshot();
  }, backup);
  assert.deepEqual(restored, backup.database);
  const libraries = await restore.evaluate(async () => {
    const { refreshAssets, localAssets } = await import("/src/localAssets.js");
    await refreshAssets();
    return {
      components: localAssets.components,
      themes: localAssets.themes,
      motions: localAssets.motions,
    };
  });
  for (const kind of ["components", "themes", "motions"])
    assert.deepEqual(libraries[kind], backup.assets[kind]);

  const refused = await restore.evaluate(async (data) => {
    const r = (await import("/src/videoProjects.js")).videoRepository();
    const row = await r.freeNote("audit-note");
    row.content = "Version locale à garder";
    await r.saveFreeNote(row);
    try {
      const withNew = structuredClone(data.database);
      withNew.projects.push({
        ...withNew.projects[0],
        id: "atomic-audit",
        creations: [],
      });
      await r.importSnapshot(withNew);
      return null;
    } catch (e) {
      return {
        error: e.message,
        content: (await r.freeNote("audit-note")).content,
        partial: await r.get("atomic-audit"),
      };
    }
  }, backup);
  assert.match(refused.error, /Conflit/);
  assert.equal(refused.content, "Version locale à garder");
  assert.equal(refused.partial, undefined);
  // Restore through the actual file picker, then refresh the library without reloading.
  const uiContext = await browser.newContext(),
    ui = await uiContext.newPage();
  await ui.goto(url);
  await ui.getByRole("button", { name: "Fichier", exact: true }).click();
  await ui
    .getByRole("button", { name: "Sauvegarde globale…", exact: true })
    .click();
  const uiBackup = structuredClone(backup);
  const order = uiBackup.database.settings.find(
    ([key]) => key === "video-order",
  );
  if (order) order[1] = [seeded.videoId];
  else uiBackup.database.settings.push(["video-order", [seeded.videoId]]);
  const playlists = uiBackup.database.settings.find(
    ([key]) => key === "playlists",
  );
  playlists[1].push("Playlist restaurée");
  await ui.locator(".backup-dialog input[type=file]").setInputFiles({
    name: "frame-test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(uiBackup)),
  });
  await ui
    .getByRole("button", { name: "Restaurer cette sauvegarde", exact: true })
    .click();
  await ui
    .getByRole("status")
    .filter({ hasText: "Sauvegarde restaurée." })
    .waitFor();
  await ui
    .getByRole("button", { name: "Fermer la sauvegarde", exact: true })
    .click();
  await ui.getByText("Audit — restauration", { exact: true }).waitFor();
  assert.ok(
    (
      await ui.evaluate(async () =>
        (await import("/src/videoProjects.js")).videoRepository().playlists(),
      )
    ).includes("Playlist restaurée"),
  );
  // Shared menu and modal remain usable in light and dark, with no transparent panel.
  await a.goto(url);
  await a.getByRole("button", { name: "Fichier", exact: true }).click();
  await a
    .getByRole("button", { name: "Sauvegarde globale…", exact: true })
    .click();
  await a.getByRole("dialog", { name: "Sauvegarde de Frame" }).waitFor();
  for (const mode of ["dark", "light"]) {
    await a.evaluate(
      async (mode) => (await import("/src/appearance.js")).setAppearance(mode),
      mode,
    );
    await a.waitForTimeout(200);
    const bg = await a
      .locator(".backup-dialog")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.equal(
      bg,
      mode === "light" ? "rgb(255, 255, 255)" : "rgb(25, 28, 34)",
    );
    await a.screenshot({ path: "/tmp/frame-backup-" + mode + ".png" });
  }
  await a.getByRole("dialog").press("Escape");
  await a.getByRole("dialog").waitFor({ state: "hidden" });
  // Images needed by an export remain available when their decoded size exceeds the cache budget.
  const pixels = await a.evaluate(async () => {
    const { prepareImages, drawImageBlock } = await import("/src/render.js"),
      { releaseImages } = await import("/src/imageCache.js");
    const colors = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#00ffff",
        "#ff00ff",
      ],
      slide = { elements: {}, positions: {} };
    colors.forEach((color, i) => {
      const key = "image" + i;
      slide.elements[key] = {
        type: "image",
        src:
          "data:image/svg+xml;base64," +
          btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><rect width="1600" height="1600" fill="' +
              color +
              '"/></svg>',
          ),
        roundedCorners: false,
        opacity: 100,
      };
      slide.positions[key] = { x: i * 100, y: 0, w: 100, h: 100 };
    });
    await prepareImages([slide], {}, "audit-images");
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 100;
    const ctx = c.getContext("2d");
    for (const key of Object.keys(slide.elements))
      drawImageBlock(ctx, slide, key, { panel: "#000000", accent: "#ffffff" });
    const result = colors.map((_, i) => [
      ...ctx.getImageData(i * 100 + 50, 50, 1, 1).data,
    ]);
    releaseImages("audit-images");
    return result;
  });
  assert.deepEqual(pixels, [
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [255, 255, 0, 255],
    [0, 255, 255, 255],
    [255, 0, 255, 255],
  ]);
  // The shared shortcuts are present in every workshop, including custom studio headers.
  for (const route of [
    "/#/diaporamas",
    "/#/incrustations",
    "/#/miniatures",
    "/#/animations",
    "/#/notes",
    "/#/parcours",
    "/#/themes",
    "/#/musiques",
    "/#/modeles-description",
    "/#/videos/" + seeded.videoId,
    "/#/videos/" + seeded.videoId + "/conductor",
    "/#/videos/" + seeded.videoId + "/publication",
  ]) {
    await a.goto(url + route);
    const shortcuts = a.getByRole("navigation", {
      name: "Accès rapides",
      exact: true,
    });
    await shortcuts.waitFor();
    for (const name of ["Playlists", "Notes", "Parcours"])
      assert.equal(
        await shortcuts.getByRole("button", { name, exact: true }).count(),
        1,
      );
  }
  await a
    .getByRole("navigation", { name: "Accès rapides", exact: true })
    .getByRole("button", { name: "Playlists", exact: true })
    .click();
  await a
    .getByRole("dialog", { name: "Gestion des playlists", exact: true })
    .waitFor();
  await a.reload();
  await a
    .getByRole("dialog", { name: "Gestion des playlists", exact: true })
    .waitFor();
  // Deletion in another tab offers recovery, then permits leaving the deleted note.
  await a.evaluate(async () => {
    const r = (await import("/src/videoProjects.js")).videoRepository();
    await r.createFreeNote({
      id: "deleted-audit",
      kind: "note",
      title: "À supprimer",
    });
  });
  await b.goto(url + "/#/notes/deleted-audit");
  await editor(b).waitFor();
  await a.evaluate(async () => {
    await (
      await import("/src/videoProjects.js")
    )
      .videoRepository()
      .removeFreeNotes("deleted-audit");
  });
  await editor(b).fill("Brouillon à récupérer");
  await b
    .getByRole("button", { name: "Télécharger mon brouillon", exact: true })
    .waitFor();
  b.once("dialog", (d) => d.accept());
  await b
    .getByRole("button", {
      name: "Recharger la version enregistrée",
      exact: true,
    })
    .click();
  await b.waitForURL((current) => !current.hash.includes("deleted-audit"));
  assert.deepEqual(errors, []);
  console.log(
    "OK: conflicts in real tabs, recovery UI, global round-trip, idempotence, non-destructive conflict, light/dark dialog.",
  );
} finally {
  await browser.close();
}
