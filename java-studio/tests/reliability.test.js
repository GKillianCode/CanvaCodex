import test from "node:test";
import assert from "node:assert/strict";
import { ProjectHistory } from "../src/history.js";
import { createImageCache } from "../src/imageCache.js";
import {
  validateBackup,
  missingItems,
  equalData,
  portableSetting,
  portableBrowserKey,
} from "../src/workspaceBackup.js";
import { freeTreeSignature, normalizeFreeNote } from "../src/freeNotes.js";
test("history shares embedded resources, preserves reserved strings and releases unreachable images", () => {
  const image = "data:image/png;base64," + "a".repeat(10000),
    history = new ProjectHistory({
      image,
      x: 0,
      special: "\u0000frame-history:1",
    });
  for (let x = 1; x < 10; x++)
    history.record({ image, x, special: "\u0000frame-history:1" });
  assert.ok(history.bytes < 30000);
  assert.equal(history.undo().x, 8);
  assert.equal(history.redo().image, image);
  assert.equal(history.undo().special, "\u0000frame-history:1");
  history.record({ image: "other", x: 10 });
  assert.equal(history.redo(), null);
  const bounded = new ProjectHistory({ image }, 1);
  bounded.record({ image: "new" });
  assert.equal(bounded.pool.size, 0);
});
test("history budget retains only current state if a document alone exceeds it", () => {
  const history = new ProjectHistory({ x: "a".repeat(100) }, 60, 100);
  history.record({ x: "b".repeat(100) });
  assert.equal(history.states.length, 1);
  assert.equal(history.undo(), null);
  const grouped = new ProjectHistory({ x: 0 });
  grouped.record({ x: 1 }, "move");
  grouped.record({ x: 2 }, "move");
  assert.deepEqual(grouped.undo(), { x: 0 });
  assert.deepEqual(grouped.redo(), { x: 2 });
});
test("decoded image cache uses bytes, LRU and resolves failed resources", async () => {
  const made = [];
  const cache = createImageCache({
    maxBytes: 1000,
    createImage: () => {
      const image = { naturalWidth: 10, naturalHeight: 10 };
      made.push(image);
      return image;
    },
    notify: () => {},
  });
  const a = cache.get("a"),
    b = cache.get("b");
  made[0].onload();
  made[1].onload();
  cache.get("a");
  const c = cache.get("c");
  made[2].onload();
  assert.equal(cache.size, 2);
  assert.ok(cache.bytes <= 1000);
  assert.equal(cache.get("a"), a);
  assert.notEqual(cache.get("b"), b);
  made.at(-1).onerror();
  await Promise.all([a.promise, b.promise, c.promise]);
});
const backup = () => ({
  format: "frame-backup",
  version: 1,
  database: { projects: [], creations: [], settings: [] },
  browser: [],
  assets: { components: [], themes: [], motions: [] },
});
test("global backup rejects foreign formats, duplicate settings and nonportable handles", () => {
  assert.equal(validateBackup(backup()).version, 1);
  assert.throws(() => validateBackup({ ...backup(), version: 2 }));
  const raw = backup();
  raw.database.settings = [["video-folder-root", {}]];
  assert.throws(() => validateBackup(raw));
  raw.database.settings = [
    ["x", 1],
    ["x", 2],
  ];
  assert.throws(() => validateBackup(raw));
  assert.equal(portableSetting("video-folder-pending"), false);
  assert.equal(portableBrowserKey("unrelated-app"), false);
  assert.equal(
    portableBrowserKey("frame-animation:frame-slides-project"),
    true,
  );
});
test("restore additions are idempotent and never replace conflicting identities", () => {
  const existing = [{ id: "a", name: "A" }];
  assert.deepEqual(
    missingItems(existing, [...existing, { id: "b", name: "B" }], "notes"),
    [{ id: "b", name: "B" }],
  );
  assert.throws(
    () => missingItems(existing, [{ id: "a", name: "Changed" }], "notes"),
    /Conflit/,
  );
  assert.ok(equalData({ b: 2, a: 1 }, { a: 1, b: 2 }));
});
test("note revisions default to zero and structural signatures ignore body-derived metadata", () => {
  assert.equal(normalizeFreeNote({ id: "note" }).revision, 0);
  assert.equal(normalizeFreeNote({ id: "note", revision: 3 }).revision, 3);
  const rows = [{ id: "note", title: "Titre", parent: "", links: [] }];
  assert.equal(
    freeTreeSignature(rows),
    freeTreeSignature([{ ...rows[0], updatedAt: 5, links: ["other"] }]),
  );
  assert.notEqual(
    freeTreeSignature(rows),
    freeTreeSignature([{ ...rows[0], title: "Renommé" }]),
  );
});

test("cache keeps active exports complete even beyond budget, then releases their images", async () => {
  const images = [];
  const cache = createImageCache({
    maxBytes: 100,
    maxEntries: 1,
    createImage: () => {
      const image = { naturalWidth: 100, naturalHeight: 100 };
      images.push(image);
      return image;
    },
    notify: () => {},
  });
  cache.reserve("export", ["a", "b"]);
  const a = cache.get("a"),
    b = cache.get("b");
  images.forEach((image) => image.onload());
  await Promise.all([a.promise, b.promise]);
  assert.equal(cache.get("a"), a);
  assert.equal(cache.get("b"), b);
  assert.equal(cache.size, 2);
  cache.release("export");
  assert.equal(cache.size, 1);
});

test("playlist quick access has a persistent route", async () => {
  const { applicationFromHash, applicationHash } =
    await import("../src/applicationRoutes.js");
  assert.equal(applicationFromHash("#/playlists"), "playlists");
  assert.equal(applicationHash("playlists"), "#/playlists");
});
