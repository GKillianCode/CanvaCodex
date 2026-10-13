import {
  applications,
  applicationStorage,
  applicationFile,
  readApplicationFile,
} from "./applicationDocuments.js";
import { normalizeWorkspace, workspaceKeys } from "./workspaceStorage.js";
import { makeSlide } from "./model.js";
import { makeThumbnail, thumbnailPalette } from "./thumbnails.js";
import { makeOverlay } from "./overlays.js";
export const videoStatuses = [
  ["preparation", "Préparation"],
  ["ready", "Prêt à tourner"],
  ["editing", "Montage"],
  ["done", "Terminé"],
];
export const videoPlaylists = [
  "Java",
  "IA",
  "Conception",
  "DevOps",
  "Production",
  "Versioning",
  "Autre",
];
export const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = () => crypto.randomUUID();
const preview = (value) =>
  typeof value === "string" &&
  value.length < 200000 &&
  /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)
    ? value
    : null;
const label = (v, f, max = 200) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : f;
export function makeVideoProject(name = "Nouvelle vidéo") {
  const now = Date.now();
  return {
    id: uid(),
    name: label(name, "Nouvelle vidéo"),
    playlist: "Java",
    status: "preparation",
    notes: "",
    archived: false,
    createdAt: now,
    updatedAt: now,
    creations: [],
  };
}
export function normalizeVideoProject(raw) {
  if (
    !raw ||
    typeof raw !== "object" ||
    !Array.isArray(raw.creations) ||
    raw.creations.length > 100
  )
    throw Error("Fiche vidéo invalide.");
  return {
    ...makeVideoProject(raw.name),
    id: label(raw.id, uid(), 100),
    playlist:
      typeof raw.playlist === "string" ? raw.playlist.trim().slice(0, 200) : "",
    status: videoStatuses.some(([id]) => id === raw.status)
      ? raw.status
      : "preparation",
    notes: typeof raw.notes === "string" ? raw.notes.slice(0, 20000) : "",
    archived: raw.archived === true,
    preview: preview(raw.preview),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
    creations: raw.creations.map((c) => {
      if (
        !applications.some((a) => a.id === c?.app) ||
        typeof c.id !== "string"
      )
        throw Error("Création invalide.");
      return {
        id: c.id.slice(0, 100),
        app: c.app,
        name: label(c.name, "Sans titre"),
        preview: preview(c.preview),
      };
    }),
  };
}
export function memoryStorage(initial = {}, onChange = () => {}) {
  const values = clone(initial);
  return {
    getItem: (key) => values[key] ?? null,
    setItem(key, value) {
      if (values[key] !== String(value)) {
        values[key] = String(value);
        onChange();
      }
    },
    removeItem(key) {
      if (key in values) {
        delete values[key];
        onChange();
      }
    },
    snapshot: () => clone(values),
  };
}
export function storageForDocument(document, app) {
  const storage = memoryStorage(),
    scoped = applicationStorage(storage, app),
    kind = app === "banners" ? "banners" : "slides";
  scoped.setItem(
    workspaceKeys[kind],
    JSON.stringify({ ...clone(document), kind }),
  );
  return storage.snapshot();
}
export function documentFromStorage(values, app) {
  const raw = JSON.parse(
    applicationStorage(memoryStorage(values), app).getItem(
      workspaceKeys[app === "banners" ? "banners" : "slides"],
    ) || "null",
  );
  if (!raw) throw Error("Document de création absent.");
  const doc = applicationFile(raw, app);
  readApplicationFile(doc, app);
  return doc;
}
export function makeCreation(project, app, name, source = null) {
  if (!applications.some((a) => a.id === app)) throw Error("Atelier inconnu.");
  if (project.creations.length >= 100)
    throw Error("Limite de 100 créations par vidéo.");
  const kind = app === "banners" ? "banners" : "slides",
    title = label(name, applications.find((a) => a.id === app).name);
  let document = source;
  if (!document) {
    const data = {
      project: title,
      slides: [app === "thumbnails" ? makeThumbnail() : makeSlide("title")],
      banner: makeOverlay("lower"),
    };
    if (app === "thumbnails") {
      data.resolution = { width: 1280, height: 720 };
      data.projectColors = { ...thumbnailPalette };
    }
    document = applicationFile(normalizeWorkspace(data, kind), app);
  } else {
    const checked = readApplicationFile(document, app);
    document = applicationFile(checked[kind], app);
  }
  document.projectId = uid();
  document.project = title;
  return {
    id: uid(),
    videoId: project.id,
    app,
    name: title,
    updatedAt: Date.now(),
    storage: storageForDocument(document, app),
  };
}
export function attachCreation(project, creation) {
  if (
    creation.videoId !== project.id ||
    project.creations.some((c) => c.id === creation.id)
  )
    throw Error("Création déjà associée ou vidéo différente.");
  project.creations.push({
    id: creation.id,
    app: creation.app,
    name: creation.name,
  });
  project.updatedAt = Date.now();
}
export function videoBundle(project, creations) {
  return {
    format: "frame-video-project",
    version: 1,
    project: normalizeVideoProject(project),
    creations: project.creations.map((meta) => {
      const row = creations.find(
        (c) =>
          c.id === meta.id && c.app === meta.app && c.videoId === project.id,
      );
      if (!row) throw Error("Création manquante dans la sauvegarde.");
      return {
        id: row.id,
        app: row.app,
        name: row.name,
        document: documentFromStorage(row.storage, row.app),
      };
    }),
  };
}
export function importVideoBundle(raw, { duplicate = false } = {}) {
  if (
    raw?.format !== "frame-video-project" ||
    raw.version !== 1 ||
    !Array.isArray(raw.creations)
  )
    throw Error("Ce fichier n’est pas une sauvegarde de vidéo Frame.");
  const old = normalizeVideoProject(raw.project);
  if (
    raw.creations.length !== old.creations.length ||
    new Set(old.creations.map((c) => c.id)).size !== old.creations.length
  )
    throw Error("Liste de créations incohérente.");
  const project = {
      ...old,
      id: uid(),
      name: duplicate ? label(old.name + " · copie", "Copie") : old.name,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creations: [],
    },
    creations = [];
  for (const meta of old.creations) {
    const row = raw.creations.find((c) => c.id === meta.id);
    if (!row || row.app !== meta.app)
      throw Error("Type de création incohérent.");
    const checked = readApplicationFile(row.document, row.app),
      kind = row.app === "banners" ? "banners" : "slides",
      document = applicationFile(checked[kind], row.app),
      creation = makeCreation(
        project,
        row.app,
        label(row.name, meta.name),
        document,
      );
    attachCreation(project, creation);
    creations.push(creation);
  }
  return { project, creations };
}
export function videoRoute(hash) {
  const match = String(hash).match(
    /^#\/videos\/([\w-]+)(?:\/(slides|banners|thumbnails)\/([\w-]+))?$/,
  );
  return match
    ? { videoId: match[1], app: match[2] || null, creationId: match[3] || null }
    : null;
}
export const videoHash = (id, app = null, creationId = null) =>
  "#/videos/" + id + (app && creationId ? "/" + app + "/" + creationId : "");
// The catalogue stores only small summaries; document bodies stay in creations.
export function videoSummary(project) {
  return {
    id: project.id,
    name: project.name,
    playlist: project.playlist || "",
    status: project.status,
    archived: project.archived === true,
    updatedAt: project.updatedAt,
    counts: Object.fromEntries(
      applications.map((a) => [
        a.id,
        project.creations.filter((c) => c.app === a.id).length,
      ]),
    ),
    total: project.creations.length,
  };
}
export function changePlaylist(project, previous, next) {
  return project.playlist === previous
    ? { ...project, playlist: next, updatedAt: Date.now() }
    : project;
}
export function validatePlaylist(name, existing = [], previous = null) {
  const value = label(name, "", 200);
  if (!value) throw Error("Donne un nom à la playlist.");
  if (
    existing.some(
      (n) =>
        n !== previous && n.toLocaleLowerCase() === value.toLocaleLowerCase(),
    )
  )
    throw Error("Cette playlist existe déjà.");
  return value;
}
export function videoRepository(api = globalThis.indexedDB) {
  let opening;
  function database() {
    if (!api)
      return Promise.reject(
        Error("Le stockage local IndexedDB est indisponible."),
      );
    if (!opening)
      opening = new Promise((resolve, reject) => {
        const r = api.open("frame-video-library", 3);
        r.onupgradeneeded = () => {
          const db = r.result,
            tx = r.transaction;
          if (!db.objectStoreNames.contains("projects"))
            db.createObjectStore("projects", { keyPath: "id" });
          const creations = db.objectStoreNames.contains("creations")
            ? tx.objectStore("creations")
            : db.createObjectStore("creations", { keyPath: "id" });
          if (!creations.indexNames.contains("videoId"))
            creations.createIndex("videoId", "videoId");
          if (!db.objectStoreNames.contains("summaries")) {
            const summaries = db.createObjectStore("summaries", {
                keyPath: "id",
              }),
              names = new Set(videoPlaylists);
            db.createObjectStore("settings");
            tx.objectStore("projects").openCursor().onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                summaries.put(videoSummary(cursor.value));
                if (cursor.value.playlist) names.add(cursor.value.playlist);
                cursor.continue();
              } else tx.objectStore("settings").put([...names], "playlists");
            };
          }
        };
        r.onsuccess = () => {
          r.result.onversionchange = () => {
            r.result.close();
            opening = null;
          };
          resolve(r.result);
        };
        r.onerror = () => {
          opening = null;
          reject(r.error);
        };
        r.onblocked = () => {
          opening = null;
          reject(
            Error(
              "Ferme les autres onglets Frame puis réessaie pour mettre à jour la bibliothèque.",
            ),
          );
        };
      });
    return opening;
  }
  async function transaction(mode, run) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        ["projects", "creations", "summaries", "settings"],
        mode,
      );
      let result;
      const set = (v) => (result = v);
      try {
        run(
          tx.objectStore("projects"),
          tx.objectStore("creations"),
          set,
          tx,
          tx.objectStore("summaries"),
          tx.objectStore("settings"),
        );
      } catch (error) {
        tx.abort();
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () =>
        reject(
          tx.error ||
            (result instanceof Error
              ? result
              : Error("Sauvegarde locale interrompue.")),
        );
    });
  }
  function storeProject(p, s, settings, project) {
    p.put(clone(project));
    s.put(videoSummary(project));
    if (project.playlist)
      settings.get("playlists").onsuccess = (e) => {
        const names = e.target.result || [];
        if (!names.includes(project.playlist))
          settings.put([...names, project.playlist], "playlists");
      };
  }
  return {
    playlists: () =>
      transaction("readonly", (p, c, set, tx, s, settings) => {
        settings.get("playlists").onsuccess = (e) => set(e.target.result || []);
      }),
    editPlaylist: (previous, next) =>
      transaction("readwrite", (p, c, set, tx, s, settings) => {
        settings.get("playlists").onsuccess = (e) => {
          const names = e.target.result || [];
          if (previous !== null && !names.includes(previous)) {
            set(
              Error("Cette playlist n’existe plus. Recharge la bibliothèque."),
            );
            tx.abort();
            return;
          }
          let value;
          try {
            value =
              next === null ? "" : validatePlaylist(next, names, previous);
          } catch (error) {
            set(error);
            tx.abort();
            return;
          }
          settings.put(
            previous === null
              ? [...names, value]
              : next === null
                ? names.filter((n) => n !== previous)
                : names.map((n) => (n === previous ? value : n)),
            "playlists",
          );
          if (previous !== null)
            p.openCursor().onsuccess = (event) => {
              const cursor = event.target.result;
              if (!cursor) return;
              const current = cursor.value,
                changed = changePlaylist(current, previous, value);
              if (changed !== current) {
                cursor.update(changed);
                s.put(videoSummary(changed));
              }
              cursor.continue();
            };
        };
      }),
    preview: (videoId, creationId, image) =>
      transaction("readwrite", (p, c) => {
        p.get(videoId).onsuccess = (e) => {
          const project = e.target.result,
            meta = project?.creations.find((x) => x.id === creationId);
          if (!meta) return;
          meta.preview = preview(image);
          if (project.creations[0]?.id === creationId)
            project.preview = meta.preview;
          p.put(project);
        };
      }),
    list: () =>
      transaction("readonly", (p, c, set, tx, s) => {
        s.getAll().onsuccess = (e) =>
          set(e.target.result.sort((a, b) => b.updatedAt - a.updatedAt));
      }),
    cover: (id) =>
      transaction("readonly", (p, c, set) => {
        p.get(id).onsuccess = (e) => set(preview(e.target.result?.preview));
      }),
    get: (id) =>
      transaction("readonly", (p, c, set) => {
        p.get(id).onsuccess = (e) => set(e.target.result);
      }),
    creation: (id) =>
      transaction("readonly", (p, c, set) => {
        c.get(id).onsuccess = (e) => set(e.target.result);
      }),
    put: (project, creations = []) =>
      transaction("readwrite", (p, c, set, tx, s, settings) => {
        storeProject(p, s, settings, project);
        for (const row of creations) c.put(clone(row));
      }),
    saveCreation: (row) =>
      transaction("readwrite", (p, c, set, tx, s, settings) => {
        p.get(row.videoId).onsuccess = (e) => {
          const project = e.target.result,
            meta = project?.creations.find(
              (x) => x.id === row.id && x.app === row.app,
            );
          if (!meta) {
            tx.abort();
            return;
          }
          meta.name = row.name;
          meta.preview = null;
          if (project.creations[0]?.id === row.id) project.preview = null;
          project.updatedAt = Date.now();
          storeProject(p, s, settings, project);
          c.put(clone(row));
        };
      }),
    allCreations: (id) =>
      transaction("readonly", (p, c, set) => {
        c.index("videoId").getAll(id).onsuccess = (e) => set(e.target.result);
      }),
  };
}

export function creationSession(row, save, onStatus = () => {}) {
  let version = 0,
    persisted = 0,
    queued = -1,
    tail = Promise.resolve(),
    scheduled = false;
  const storage = memoryStorage(row.storage, () => {
    version++;
    onStatus("saving");
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        flush().catch(() => {});
      });
    }
  });
  function flush() {
    if (version === persisted) return tail;
    if (version === queued) return tail;
    queued = version;
    const revision = version,
      snapshot = {
        ...clone(row),
        storage: storage.snapshot(),
        updatedAt: Date.now(),
      };
    try {
      snapshot.name = documentFromStorage(snapshot.storage, row.app).project;
    } catch {}
    onStatus("saving");
    tail = tail
      .catch(() => {})
      .then(() => save(snapshot))
      .then(
        () => {
          persisted = revision;
          row.storage = snapshot.storage;
          row.name = snapshot.name;
          onStatus(persisted === version ? "saved" : "saving");
        },
        (error) => {
          queued = -1;
          onStatus("error", error);
          throw error;
        },
      );
    return tail;
  }
  return { ...storage, flush };
}
