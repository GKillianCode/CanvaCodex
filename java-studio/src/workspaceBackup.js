import { refreshAssets, updateAssets, localAssets } from "./localAssets.js";
export const assetKinds = ["components", "themes", "motions"];
export const portableSetting = (key) =>
  typeof key === "string" && !key.startsWith("video-folder-");
export const portableBrowserKey = (key) =>
  /^(frame[-:]|slides:frame-|banners:frame-)/.test(key);
export function equalData(a, b) {
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export function validateBackup(raw) {
  if (
    raw?.format !== "frame-backup" ||
    raw.version !== 1 ||
    !raw.database ||
    !raw.assets ||
    !Array.isArray(raw.browser)
  )
    throw Error(
      "Ce fichier n’est pas une sauvegarde globale Frame compatible.",
    );
  for (const key of ["projects", "creations", "settings"])
    if (!Array.isArray(raw.database[key]) || raw.database[key].length > 100000)
      throw Error("Inventaire de sauvegarde invalide.");
  const checkEntries = (rows, predicate) => {
    const seen = new Set();
    for (const row of rows) {
      if (
        !Array.isArray(row) ||
        row.length !== 2 ||
        typeof row[0] !== "string" ||
        row[0].length > 300 ||
        seen.has(row[0]) ||
        !predicate(row[0], row[1])
      )
        throw Error("Entrée de sauvegarde invalide ou dupliquée.");
      seen.add(row[0]);
    }
  };
  checkEntries(raw.database.settings, portableSetting);
  checkEntries(
    raw.browser,
    (key, value) => portableBrowserKey(key) && typeof value === "string",
  );
  for (const kind of assetKinds) {
    const rows = raw.assets[kind],
      seen = new Set();
    if (!Array.isArray(rows) || rows.length > 100)
      throw Error("Bibliothèque de sauvegarde invalide.");
    for (const item of rows) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !/^[\w-]{1,100}$/.test(item.id) ||
        seen.has(item.id)
      )
        throw Error("Identifiant de bibliothèque invalide.");
      seen.add(item.id);
    }
  }
  return raw;
}
export async function createBackup(repository, storage = localStorage) {
  await refreshAssets();
  if (Object.values(localAssets.warnings).some(Boolean))
    throw Error(
      "Une bibliothèque locale contient des éléments illisibles. Corrige-la avant de créer une sauvegarde complète.",
    );
  const database = await repository.exportSnapshot(),
    browser = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (portableBrowserKey(key)) {
      const value = storage.getItem(key);
      if (typeof value === "string") browser.push([key, value]);
    }
  }
  const assets = {
    ...Object.fromEntries(
      assetKinds.map((kind) => [
        kind,
        JSON.parse(JSON.stringify(localAssets[kind])),
      ]),
    ),
    removed: [...localAssets.removed],
  };
  return {
    format: "frame-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    database,
    browser,
    assets,
  };
}
export function backupInventory(data) {
  return {
    videos: data.database.projects.length,
    creations: data.database.creations.length,
    notes: data.database.settings.filter(([k]) => k.startsWith("free-note:"))
      .length,
    components: data.assets.components.length,
    themes: data.assets.themes.length,
    motions: data.assets.motions.length,
  };
}
export function missingItems(current, incoming, label) {
  const byId = new Map(current.map((v) => [v.id, v]));
  for (const item of incoming)
    if (byId.has(item.id) && !equalData(byId.get(item.id), item))
      throw Error(
        "Conflit : " +
          label +
          " « " +
          (item.name || item.title || item.id) +
          " » existe déjà avec un autre contenu. Rien ne sera remplacé.",
      );
  return incoming.filter((item) => !byId.has(item.id));
}
function browserAdditions(data, storage) {
  const additions = [];
  for (const [key, value] of data.browser) {
    const old = storage.getItem(key);
    if (old === null) additions.push([key, value]);
    // UI preferences remain those of this browser; documents must never be silently replaced.
    else if (old !== value && /(?:project|workspace|themes)$/.test(key))
      throw Error(
        "Un document autonome différent existe déjà (" +
          key +
          "). Exporte-le avant de restaurer dans un espace vide.",
      );
  }
  return additions;
}
export async function restoreBackup(raw, repository, storage = localStorage) {
  const data = validateBackup(raw);
  await refreshAssets();
  for (const kind of assetKinds) {
    const added = missingItems(localAssets[kind], data.assets[kind], kind);
    if (localAssets[kind].length + added.length > 100)
      throw Error("La bibliothèque " + kind + " dépasserait 100 éléments.");
  }
  const browser = browserAdditions(data, storage);
  await repository.checkSnapshot(data.database);
  // Libraries are added first. A later error leaves existing data intact and retry is idempotent.
  for (const kind of assetKinds)
    if (
      data.assets[kind].length ||
      (kind === "themes" && data.assets.removed?.length)
    )
      await updateAssets(kind, (current) => {
        const added = missingItems(current[kind], data.assets[kind], kind);
        if (current[kind].length + added.length > 100)
          throw Error("Bibliothèque pleine.");
        current[kind].push(...added);
        if (kind === "themes")
          current.removed = [
            ...new Set([
              ...current.removed,
              ...(Array.isArray(data.assets.removed)
                ? data.assets.removed.filter(
                    (id) => typeof id === "string" && id.length <= 100,
                  )
                : []),
            ]),
          ].filter((id) => !current.themes.some((t) => t.id === id));
      });
  const written = [];
  try {
    for (const [key, value] of browser) {
      if (storage.getItem(key) !== null)
        throw Error(
          "Le navigateur a changé pendant la restauration. Réessaie.",
        );
      storage.setItem(key, value);
      written.push([key, value]);
    }
    await repository.importSnapshot(data.database);
  } catch (e) {
    for (const [key, value] of written)
      if (storage.getItem(key) === value) storage.removeItem(key);
    throw e;
  }
}
