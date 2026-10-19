import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCatalog,
  migrateVideoClassification,
  installCatalog,
  catalogSnapshot,
} from "../src/videoCatalog.js";
import {
  makeVideoProject,
  normalizeVideoProject,
  videoTypeTitle,
} from "../src/videoProjects.js";
import {
  keywordCompletion,
  activeSearchField,
  paginationItems,
  matchesVideoSearch,
  parseVideoSearch,
} from "../src/videoSearch.js";
test("catalog migration replaces removed values and only fills unclassified types", () => {
  const c = normalizeCatalog({
    statuses: [["custom-draft", "Préparer"]],
    types: [
      ["custom-short", "Court"],
      ["exercise", "Exercice"],
    ],
    fallbackStatus: "custom-draft",
    defaultType: "custom-short",
  });
  assert.deepEqual(
    migrateVideoClassification(
      { status: "ready", videoType: "exercise" },
      c,
      true,
    ),
    { status: "custom-draft", videoType: "exercise" },
  );
  assert.equal(
    migrateVideoClassification(
      { status: "custom-draft", videoType: "" },
      c,
      false,
    ).videoType,
    "",
  );
  assert.equal(
    migrateVideoClassification(
      { status: "custom-draft", videoType: "" },
      c,
      true,
    ).videoType,
    "custom-short",
  );
  assert.equal(
    migrateVideoClassification(
      { status: "custom-draft", videoType: "removed" },
      c,
      false,
    ).videoType,
    "",
  );
  assert(normalizeCatalog({ statuses: [] }).statuses.length > 0);
});
test("stable custom identities survive normalization, renames, default creation and search", () => {
  const before = catalogSnapshot();
  try {
    installCatalog({
      statuses: [["custom-script", "Script"]],
      types: [["custom-short", "Court"]],
      defaultType: "custom-short",
      fallbackStatus: "custom-script",
    });
    const row = makeVideoProject("Démo");
    assert.equal(row.videoType, "custom-short");
    assert.equal(row.status, "custom-script");
    assert.equal(normalizeVideoProject(row).videoType, "custom-short");
    installCatalog({
      statuses: [["custom-script", "Préparation"]],
      types: [["custom-short", "Format court"]],
      defaultType: "custom-short",
    });
    assert.equal(videoTypeTitle(row.videoType), "Format court");
    assert(matchesVideoSearch(row, parseVideoSearch('type:"Format court"')));
    assert.equal(
      normalizeVideoProject({ ...row, videoType: undefined }).videoType,
      "",
    );
  } finally {
    installCatalog(before);
  }
});
test("keyword completion inserts field syntax before value suggestions", () => {
  assert.deepEqual(keywordCompletion("play"), {
    start: 0,
    end: 4,
    values: ["playlist"],
  });
  assert.deepEqual(keywordCompletion('playlist:"Java" vid'), {
    start: 16,
    end: 19,
    values: ["vidéo"],
  });
  assert.equal(keywordCompletion("playlist:Ja"), null);
  assert.equal(activeSearchField("playlist:").field, "playlist");
  assert.equal(keywordCompletion("autre mot"), null);
});
test("numeric pagination includes endpoints, neighbors and stable ellipses", () => {
  assert.deepEqual(paginationItems(1, 1), [1]);
  assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
  assert.deepEqual(paginationItems(5, 12), [1, "gap-1", 4, 5, 6, "gap-6", 12]);
  assert.deepEqual(paginationItems(1, 8), [1, 2, "gap-2", 8]);
});
