import test from "node:test";
import assert from "node:assert/strict";
import { writeVideoFolder, videoFolderStorage } from "../src/videoFolders.js";
import {
  makeVideoProject,
  makeCreation,
  attachCreation,
  documentFromStorage,
} from "../src/videoProjects.js";
function directory(name = "Frame", files = new Map(), prefix = "") {
  const root = {
    name,
    permission: "granted",
    queryPermission: async () => root.permission,
    requestPermission: async () => (root.permission = "granted"),
    async getDirectoryHandle(id, options = {}) {
      if (
        !options.create &&
        ![...files.keys()].some((key) => key.startsWith(prefix + id + "/"))
      )
        throw Object.assign(Error("Missing folder"), { name: "NotFoundError" });
      return directory(id, files, prefix + id + "/");
    },
    async getFileHandle(name) {
      return {
        async createWritable() {
          let text;
          return {
            async write(value) {
              text = value;
            },
            async close() {
              files.set(prefix + name, text);
            },
            async abort() {},
          };
        },
      };
    },
  };
  return root;
}
function repository(settings = {}) {
  const projects = new Map(),
    rows = new Map();
  return {
    getSetting: async (key) => settings[key],
    setSetting: async (key, v) => (settings[key] = v),
    put: async (p, r = []) => {
      projects.set(p.id, structuredClone(p));
      r.forEach((x) => rows.set(x.id, structuredClone(x)));
    },
    get: async (id) => projects.get(id),
    allCreations: async (id) =>
      [...rows.values()].filter((r) => r.videoId === id),
    saveCreation: async (row) => rows.set(row.id, structuredClone(row)),
  };
}
test("video ID folder stores separate editable documents and multiline Markdown immediately", async () => {
  const files = new Map(),
    root = directory("Frame", files),
    p = makeVideoProject("Cours"),
    rows = ["slides", "banners", "thumbnails"].map((app) =>
      makeCreation(p, app, app),
    );
  rows.forEach((r) => attachCreation(p, r));
  p.notes = "# Plan\n\n```java\nint x = 1;\n```";
  await writeVideoFolder(root, p, rows);
  assert.equal(files.size, 5);
  assert.equal(files.get(p.id + "/carnet.md"), p.notes);
  for (const r of rows)
    assert.deepEqual(
      JSON.parse(files.get(`${p.id}/${r.app}-${r.id}.json`)),
      documentFromStorage(r.storage, r.app),
    );
  assert.equal(JSON.parse(files.get(p.id + "/video.frame.json")).id, p.id);
  await assert.rejects(() =>
    writeVideoFolder(root, { ...p, id: "../escape" }, []),
  );
});
test("linked root persists and autosaves creation changes without requesting a new destination", async () => {
  const files = new Map(),
    root = directory("Frame", files),
    settings = {},
    base = repository(settings);
  let picks = 0;
  const controller = videoFolderStorage(base, {
    showDirectoryPicker: async () => {
      picks++;
      return root;
    },
  });
  await controller.ready;
  await controller.authorize();
  const p = makeVideoProject("Cours"),
    r = makeCreation(p, "slides", "Cours");
  attachCreation(p, r);
  await controller.repository.put(p, [r]);
  const changed = structuredClone(r);
  changed.name = "Mis à jour";
  await controller.repository.saveCreation(changed);
  const second = videoFolderStorage(base, {
    showDirectoryPicker: async () => {
      throw Error("should not ask again");
    },
  });
  await second.ready;
  p.notes = "Notes modifiées";
  await second.repository.put(p);
  assert.equal(files.get(p.id + "/carnet.md"), p.notes);
  assert.equal(picks, 1);
});
test("permission failure preserves browser documents and reauthorization retries pending files", async () => {
  const files = new Map(),
    root = directory("Frame", files),
    base = repository({ "video-folder-root": root }),
    states = [];
  root.permission = "denied";
  const controller = videoFolderStorage(base, {}, (s) => states.push(s));
  await controller.ready;
  const p = makeVideoProject("Cours"),
    r = makeCreation(p, "thumbnails", "Image");
  attachCreation(p, r);
  await controller.repository.put(p, [r]);
  assert.equal((await base.get(p.id)).name, p.name);
  assert.equal(files.size, 0);
  assert.equal(states.at(-1).status, "error");
  await controller.authorize();
  assert.ok(files.has(`${p.id}/thumbnails-${r.id}.json`));
  assert.equal(states.at(-1).status, "saved");
});
test("browser-only mode remains functional when directory picker is unavailable", async () => {
  const base = repository(),
    controller = videoFolderStorage(base, {});
  await controller.ready;
  const p = makeVideoProject();
  await controller.repository.put(p);
  assert.equal((await base.get(p.id)).id, p.id);
  await assert.rejects(() => controller.authorize(), /navigateur/);
});

test("failed file writes are recovered after reloading the controller", async () => {
  const files = new Map(),
    root = directory("Frame", files),
    settings = { "video-folder-root": root },
    base = repository(settings);
  root.permission = "denied";
  const first = videoFolderStorage(base, {});
  await first.ready;
  const project = makeVideoProject("Reprise"),
    row = makeCreation(project, "banners", "Bandeau");
  attachCreation(project, row);
  await first.repository.put(project, [row]);
  assert.deepEqual(settings["video-folder-pending"], [project.id]);
  const next = videoFolderStorage(base, {});
  await next.ready;
  await next.authorize();
  assert.ok(files.has(`${project.id}/banners-${row.id}.json`));
  assert.deepEqual(settings["video-folder-pending"], []);
});

test("folder writer produces importable JSON files on disk with stable creation IDs", async () => {
  const fs = await import("node:fs/promises"),
    path = await import("node:path"),
    os = await import("node:os");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "frame-video-folder-"));
  function handle(base) {
    return {
      async getDirectoryHandle(id) {
        const target = path.join(base, id);
        await fs.mkdir(target, { recursive: true });
        return handle(target);
      },
      async getFileHandle(name) {
        return {
          async createWritable() {
            let value;
            return {
              async write(text) {
                value = text;
              },
              async close() {
                await fs.writeFile(path.join(base, name), value);
              },
            };
          },
        };
      },
    };
  }
  try {
    const project = makeVideoProject("Disque"),
      row = makeCreation(project, "thumbnails", "Miniature");
    attachCreation(project, row);
    await writeVideoFolder(handle(temp), project, [row]);
    const names = await fs.readdir(path.join(temp, project.id));
    assert.deepEqual(
      names.sort(),
      [`thumbnails-${row.id}.json`, "carnet.md", "video.frame.json"].sort(),
    );
    const document = JSON.parse(
      await fs.readFile(
        path.join(temp, project.id, `thumbnails-${row.id}.json`),
        "utf8",
      ),
    );
    assert.deepEqual(document, documentFromStorage(row.storage, row.app));
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});

test("first save in a newly linked folder copies existing creations without loading unrelated videos", async () => {
  const files = new Map(),
    root = directory("Frame", files),
    base = repository({ "video-folder-root": root });
  const project = makeVideoProject("Existant"),
    row = makeCreation(project, "slides", "Diapo");
  attachCreation(project, row);
  await base.put(project, [row]);
  const controller = videoFolderStorage(base, {});
  await controller.ready;
  project.notes = "Notes";
  await controller.repository.put(project);
  assert.ok(files.has(`${project.id}/slides-${row.id}.json`));
  assert.equal(files.get(project.id + "/carnet.md"), "Notes");
});


test("moved directory with granted permission can be replaced and replays pending creations", async () => {
  const old = directory("Ancien"), files = new Map(), next = directory("Nouveau", files);
  const missing = () => Object.assign(Error("Gone"), {name:"NotFoundError"});
  old.entries = () => ({next:async()=>{throw missing();}});
  old.getDirectoryHandle = async()=>{throw missing();};
  const settings = {"video-folder-root":old}, base = repository(settings), states=[];
  let picks=0;
  const controller=videoFolderStorage(base,{showDirectoryPicker:async()=>{picks++;return next;}},s=>states.push(s));
  await controller.ready;
  const project=makeVideoProject("Déplacé"), row=makeCreation(project,"slides","Diapo");attachCreation(project,row);
  await controller.repository.put(project,[row]);
  assert.equal(states.at(-1).needsRelink,true);
  await controller.authorize();
  assert.equal(picks,1);assert.equal(settings["video-folder-root"],next);
  assert.ok(files.has(`${project.id}/slides-${row.id}.json`));
  assert.deepEqual(settings["video-folder-pending"],[]);
  assert.equal(states.at(-1).status,"saved");assert.equal(states.at(-1).needsRelink,false);
});
test("reauthorization probes a stale directory even without pending writes; cancelling replacement preserves it",async()=>{
 const old=directory("Ancien"),settings={"video-folder-root":old},states=[];
 old.entries=()=>({next:async()=>{throw Object.assign(Error("Gone"),{name:"NotFoundError"});}});
 const c=videoFolderStorage(repository(settings),{showDirectoryPicker:async()=>{throw Object.assign(Error("Cancelled"),{name:"AbortError"});}},s=>states.push(s));
 await c.ready;await assert.rejects(c.authorize(),/déplacé/);assert.equal(states.at(-1).needsRelink,true);
 await assert.rejects(c.authorize(),{name:"AbortError"});assert.equal(settings["video-folder-root"],old);
});
test("changing destination retries pending writes and reports failure rather than silently succeeding",async()=>{
 const old=directory("Ancien"),next=directory("Nouveau"),settings={"video-folder-root":old},base=repository(settings),states=[];
 old.permission="denied";
 const c=videoFolderStorage(base,{showDirectoryPicker:async()=>next},s=>states.push(s));await c.ready;
 const p=makeVideoProject();await c.repository.put(p);
 next.getDirectoryHandle=async()=>{throw Error("Disque plein");};
 await assert.rejects(c.changeFolder(),/Disque plein/);
 assert.equal(states.at(-1).status,"error");assert.deepEqual(settings["video-folder-pending"],[p.id]);assert.ok(await base.get(p.id));
});

test('catalog changes mirror affected video metadata into the linked folder',async()=>{
 const files=new Map(),root=directory('Frame',files),base=repository(),project=makeVideoProject('Court');
 await base.put(project);
 base.saveVideoCatalog=async()=>{project.videoType='custom-short';await base.put(project);return {catalog:{},changed:[project.id]};};
 const controller=videoFolderStorage(base,{showDirectoryPicker:async()=>root});
 await controller.ready;await controller.authorize();
 await controller.repository.saveVideoCatalog({},true);
 assert.equal(JSON.parse(files.get(project.id+'/video.frame.json')).videoType,'custom-short');
});
