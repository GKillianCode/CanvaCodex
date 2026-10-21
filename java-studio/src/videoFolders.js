import { documentFromStorage, clone } from "./videoProjects.js";
function identifier(value) {
  if (typeof value !== "string" || !/^[\w-]+$/.test(value))
    throw Error("Identifiant de fichier invalide.");
  return value;
}
async function write(directory, name, value) {
  const file = await directory.getFileHandle(name, { create: true }),
    stream = await file.createWritable();
  try {
    await stream.write(value);
    await stream.close();
  } catch (e) {
    await stream.abort?.();
    throw e;
  }
}
export async function writeVideoFolder(root, project, rows = []) {
  const folder = await root.getDirectoryHandle(identifier(project.id), {
    create: true,
  });
  for (const row of rows) {
    if (row.videoId !== project.id)
      throw Error("Création associée à une autre vidéo.");
    const document = documentFromStorage(row.storage, row.app);
    await write(
      folder,
      `${identifier(row.app)}-${identifier(row.id)}.json`,
      JSON.stringify(document, null, 2),
    );
  }
  await write(folder, "carnet.md", project.notes || "");
  await write(folder, "video.frame.json", JSON.stringify(project, null, 2));
}
export function videoFolderStorage(
  repository,
  host = globalThis,
  onState = () => {},
) {
  let root = null,
    tail = Promise.resolve();
  const pending = new Map();
  const pendingIds = new Set();
  const recoveryIds = new Set();
  const state = {
    supported: typeof host.showDirectoryPicker === "function",
    name: "",
    status: "browser",
    error: "",
    needsRelink: false,
  };
  const report = () => onState({ ...state });
  const ready = repository
    .getSetting("video-folder-root")
    .then((handle) => {
      root = handle || null;
      return repository.getSetting("video-folder-pending").then((ids) => {
        for (const id of Array.isArray(ids) ? ids : []) {
          pendingIds.add(id);
          recoveryIds.add(id);
        }
      });
    })
    .then(() => {
      state.name = root?.name || "";
      state.status = root ? "check" : "browser";
      if (pendingIds.size)
        state.error =
          "Des fichiers attendent leur mise à jour. Réautorise le dossier de travail.";
      report();
    })
    .catch((e) => {
      state.error = e.message;
      report();
    });
  async function mirror(project, rows) {
    await ready;
    if (!root) return;
    let entry = pending.get(project.id);
    if (!entry) entry = { project: null, rows: new Map() };
    entry.project = clone(project);
    for (const row of rows) entry.rows.set(row.id, clone(row));
    pending.set(project.id, entry);
    pendingIds.add(project.id);
    const task = async () => {
      const snapshot = pending.get(project.id);
      if (!snapshot) return;
      pending.delete(project.id);
      try {
        await repository.setSetting("video-folder-pending", [...pendingIds]);
        if ((await root.queryPermission({ mode: "readwrite" })) !== "granted")
          throw Error(
            "Réautorise le dossier de travail pour mettre à jour les fichiers.",
          );
        state.status = "saving";
        state.error = "";
        report();
        let complete = recoveryIds.has(project.id);
        try {
          await root.getDirectoryHandle(identifier(project.id));
        } catch (e) {
          if (e.name === "NotFoundError") complete = true;
          else throw e;
        }
        await writeVideoFolder(
          root,
          complete ? await repository.get(project.id) : snapshot.project,
          complete
            ? await repository.allCreations(project.id)
            : [...snapshot.rows.values()],
        );
        recoveryIds.delete(project.id);
        if (!pending.has(project.id)) pendingIds.delete(project.id);
        await repository.setSetting("video-folder-pending", [...pendingIds]);
        state.status = "saved";
        report();
      } catch (e) {
        recoveryIds.add(project.id);
        state.status = "error";
        folderError(e);
        report();
      }
    };
    tail = tail.then(task, task);
    await tail;
  }
  function folderError(error) {
    state.status = "error";
    state.needsRelink = ["NotFoundError", "InvalidStateError"].includes(error.name);
    state.error = state.needsRelink
      ? "Le dossier de travail est introuvable ou a été déplacé. Choisis son nouvel emplacement."
      : error.message || "Écriture du dossier impossible.";
  }
  async function retryPending() {
    for (const id of [...pendingIds]) {
      const project = await repository.get(id);
      if (project) await mirror(project, await repository.allCreations(id));
      else {
        pendingIds.delete(id);
        recoveryIds.delete(id);
        await repository.setSetting("video-folder-pending", [...pendingIds]);
      }
    }
    if (pendingIds.size) throw Object.assign(Error(state.error || "Des fichiers attendent encore leur sauvegarde."), {name: state.needsRelink ? "NotFoundError" : "Error"});
  }
  async function link(next) {
    await ready;
    await tail;
    await repository.setSetting("video-folder-root", next);
    root = next;
    state.name = root.name;
    state.status = "saved";
    state.error = "";
    state.needsRelink = false;
    report();
    await retryPending();
  }
  async function authorize() {
    // Pick synchronously from this click when a stale handle was detected.
    if (!root || state.needsRelink) return changeFolder();
    try {
      if ((await root.requestPermission({ mode: "readwrite" })) !== "granted")
        throw Error("Accès au dossier refusé. Autorise-le ou choisis un autre dossier.");
      // Permission can remain granted even after the physical folder moved.
      if (typeof root.entries === "function") await root.entries().next();
      await link(root);
    } catch (error) {
      folderError(error);
      report();
      throw Error(state.error);
    }
  }
  async function changeFolder() {
    if (!state.supported)
      throw Error("Ce navigateur ne permet pas l’écriture automatique dans un dossier.");
    // The picker must run before any database await to preserve user activation.
    const next = await host.showDirectoryPicker({
      id: "frame-video-workspace",
      mode: "readwrite",
      startIn: "documents",
    });
    try {
      if (typeof next.entries === "function") await next.entries().next();
      await link(next);
    } catch (error) {
      folderError(error);
      report();
      throw Error(state.error);
    }
  }
  return {
    ready,
    authorize,
    changeFolder,
    async sync(id) {
      await authorize();
      const project = await repository.get(id);
      if (project) await mirror(project, await repository.allCreations(id));
    },
    repository: {
      ...repository,
      async saveVideoCatalog(raw,applyDefault=false,replacement=null) {
        const result=await repository.saveVideoCatalog(raw,applyDefault,replacement);
        for(const id of result.changed){const project=await repository.get(id);if(project)await mirror(project,[]);}
        return result;
      },
      async removeVideo(id){await repository.removeVideo(id);pending.delete(id);pendingIds.delete(id);recoveryIds.delete(id);await repository.setSetting('video-folder-pending',[...pendingIds]);},
      async put(project, rows = []) {
        await repository.put(project, rows);
        await mirror(project, rows);
      },
      async editPlaylist(previous, next) {
        const affected =
          previous === null
            ? []
            : (await repository.list())
                .filter((p) => p.playlist === previous)
                .map((p) => p.id);
        await repository.editPlaylist(previous, next);
        for (const id of affected) {
          const project = await repository.get(id);
          if (project) await mirror(project, []);
        }
      },
      async importSnapshot(data) {
        const result=await repository.importSnapshot(data);
        for(const project of data.projects) await mirror(await repository.get(project.id),await repository.allCreations(project.id));
        return result;
      },
      async saveWorkflow(videoId,section,value,expected){
        const project=await repository.saveWorkflow(videoId,section,value,expected);await mirror(project,[]);return project;
      },
      async removeCreation(videoId,id) {
        const removed=await repository.removeCreation(videoId,id);
        const project=await repository.get(videoId);
        if(project)await mirror(project,[]);
        return removed;
      },
      async saveCreation(row) {
        await repository.saveCreation(row);
        const project = await repository.get(row.videoId);
        if (project) await mirror(project, [row]);
      },
    },
  };
}
