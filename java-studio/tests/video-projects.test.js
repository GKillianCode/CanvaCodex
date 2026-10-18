import test from "node:test";
import assert from "node:assert/strict";
import {
  makeVideoProject,
  makeCreation,
  attachCreation,
  videoBundle,
  importVideoBundle,
  documentFromStorage,
  memoryStorage,
  creationSession,
  videoRoute,
  videoHash,
} from "../src/videoProjects.js";
import { applicationStorage } from "../src/applicationDocuments.js";
import { workspaceKeys } from "../src/workspaceStorage.js";
test("each video owns independent creations in all three editors", () => {
  const p = makeVideoProject("Primitifs"),
    rows = ["slides", "banners", "thumbnails"].map((app) =>
      makeCreation(p, app, app),
    );
  rows.forEach((row) => attachCreation(p, row));
  const documents = rows.map((row) =>
    documentFromStorage(row.storage, row.app),
  );
  assert.deepEqual(
    documents.map((d) => d.kind),
    ["slides", "banners", "thumbnails"],
  );
  assert.equal(documents[1].slides, undefined);
  assert.equal(documents[0].banner, undefined);
  assert.equal(documents[2].resolution.width, 1280);
  assert.equal(new Set(documents.map((d) => d.projectId)).size, 3);
  assert.throws(() => attachCreation(makeVideoProject(), rows[0]));
});
test("bundle duplication is independent and preserves content", () => {
  const p = makeVideoProject("Primitifs"),
    row = makeCreation(p, "slides", "Cours");
  attachCreation(p, row);
  const local = applicationStorage(memoryStorage(row.storage), "slides"),
    doc = JSON.parse(local.getItem(workspaceKeys.slides));
  doc.slides[0].title = "Valeur exacte";
  local.setItem(workspaceKeys.slides, JSON.stringify(doc));
  row.storage = { "frame-slides-project": local.getItem(workspaceKeys.slides) };
  p.notes = "Notes\nsur deux lignes";
  const raw = videoBundle(p, [row]),
    copy = importVideoBundle(raw, { duplicate: true });
  assert.notEqual(copy.project.id, p.id);
  assert.notEqual(copy.creations[0].id, row.id);
  assert.equal(copy.project.notes, p.notes);
  const d = documentFromStorage(copy.creations[0].storage, "slides");
  assert.equal(d.slides[0].title, "Valeur exacte");
  assert.notEqual(d.projectId, doc.projectId);
  d.slides[0].title = "Autre";
  assert.equal(doc.slides[0].title, "Valeur exacte");
  assert.throws(() => importVideoBundle({ ...raw, version: 99 }));
  assert.throws(() => importVideoBundle({ ...raw, creations: [] }));
  assert.throws(() =>
    importVideoBundle({
      ...raw,
      creations: [{ ...raw.creations[0], app: "banners" }],
    }),
  );
  assert.throws(() =>
    importVideoBundle({
      ...raw,
      creations: [
        {
          ...raw.creations[0],
          document: { ...raw.creations[0].document, kind: "banners" },
        },
      ],
    }),
  );
});
test("scoped editor storage never changes the standalone draft or another creation", () => {
  const p = makeVideoProject(),
    a = makeCreation(p, "slides", "A"),
    b = makeCreation(p, "slides", "B"),
    legacy = memoryStorage({ "frame-slides-project": "original" }),
    session = memoryStorage(a.storage),
    scoped = applicationStorage(session, "slides");
  const changed = JSON.parse(scoped.getItem(workspaceKeys.slides));
  changed.project = "Modifié";
  scoped.setItem(workspaceKeys.slides, JSON.stringify(changed));
  assert.equal(
    documentFromStorage(session.snapshot(), "slides").project,
    "Modifié",
  );
  assert.equal(documentFromStorage(b.storage, "slides").project, "B");
  assert.equal(legacy.getItem("frame-slides-project"), "original");
});
test("creation persistence retries failed durable writes without losing the draft", async () => {
  const row = makeCreation(makeVideoProject(), "slides", "Cours"),
    saved = [],
    statuses = [];
  let fail = true;
  const session = creationSession(
    row,
    async (value) => {
      if (fail) throw Error("quota");
      saved.push(value);
    },
    (state) => statuses.push(state),
  );
  const scoped = applicationStorage(session, "slides"),
    doc = JSON.parse(scoped.getItem(workspaceKeys.slides));
  doc.project = "Dernier état";
  scoped.setItem(workspaceKeys.slides, JSON.stringify(doc));
  await assert.rejects(session.flush(), /quota/);
  assert.equal(statuses.at(-1), "error");
  assert.equal(saved.length, 0);
  assert.equal(
    documentFromStorage(session.snapshot(), "slides").project,
    "Dernier état",
  );
  fail = false;
  await session.flush();
  assert.equal(saved[0].name, "Dernier état");
  assert.equal(statuses.at(-1), "saved");
});
test("video routes retain exact video and editor creation on refresh", () => {
  const hash = videoHash("video-id", "banners", "creation-id");
  assert.deepEqual(videoRoute(hash), {
    videoId: "video-id",
    app: "banners",
    creationId: "creation-id",
  });
  assert.deepEqual(videoRoute(videoHash("video-id")), {
    videoId: "video-id",
    app: null,
    creationId: null,
  });
  assert.equal(videoRoute("#/videos/id/unknown/doc"), null);
});
test("queued writes keep the newest editor state after an earlier write finishes", async () => {
  const row = makeCreation(makeVideoProject(), "slides", "Cours"),
    saved = [];
  let release;
  const blocked = new Promise((resolve) => (release = resolve));
  const session = creationSession(row, async (value) => {
    if (!saved.length) await blocked;
    saved.push(value);
  });
  session.setItem("preference", "first");
  const first = session.flush();
  session.setItem("preference", "second");
  const second = session.flush();
  release();
  await Promise.all([first, second]);
  assert.equal(saved.at(-1).storage.preference, "second");
  assert.equal(row.storage.preference, "second");
});
test("mixed application bundles round-trip through normalized independent documents", () => {
  const p = makeVideoProject("Types"),
    rows = ["slides", "banners", "thumbnails"].map((app) =>
      makeCreation(p, app, app),
    );
  rows.forEach((row) => attachCreation(p, row));
  const restored = importVideoBundle(videoBundle(p, rows));
  assert.equal(restored.creations.length, 3);
  for (const row of restored.creations) {
    const doc = documentFromStorage(row.storage, row.app);
    assert.equal(doc.kind, row.app);
    assert.equal(row.videoId, restored.project.id);
    assert.ok(restored.project.creations.some((c) => c.id === row.id));
  }
  assert.equal(
    new Set(
      restored.creations.map(
        (c) => documentFromStorage(c.storage, c.app).projectId,
      ),
    ).size,
    3,
  );
});

test("playlist names survive exports and removing a playlist preserves creations", async () => {
  const { normalizeVideoProject, changePlaylist, validatePlaylist } =
    await import("../src/videoProjects.js");
  const project = makeVideoProject("Cours");
  project.playlist = "Java avancé";
  const row = makeCreation(project, "slides", "Cours");
  attachCreation(project, row);
  assert.equal(normalizeVideoProject(project).playlist, "Java avancé");
  assert.equal(
    importVideoBundle(videoBundle(project, [row])).project.playlist,
    "Java avancé",
  );
  const renamed = changePlaylist(project, "Java avancé", "JVM");
  assert.equal(renamed.playlist, "JVM");
  const removed = changePlaylist(renamed, "JVM", "");
  assert.equal(removed.playlist, "");
  assert.deepEqual(removed.creations, project.creations);
  assert.equal(changePlaylist(project, "Autre", ""), project);
  assert.throws(() => validatePlaylist(" JAVA ", ["Java"]));
  assert.throws(() => validatePlaylist("   ", []));
  assert.equal(validatePlaylist("Java", ["Java"], "Java"), "Java");
});
test("500 catalogue summaries exclude notes, previews and document bodies", async () => {
  const { videoSummary } = await import("../src/videoProjects.js");
  const rows = Array.from({ length: 500 }, (_, i) => {
    const p = makeVideoProject("Vidéo " + i);
    p.notes = "longues notes".repeat(1000);
    p.preview = "data:image/png;base64," + "A".repeat(150000);
    p.creations = [
      { id: "slide-" + i, app: "slides", name: "Cours", preview: p.preview },
    ];
    return videoSummary(p);
  });
  assert.equal(rows.length, 500);
  assert.ok(JSON.stringify(rows).length < 200000);
  for (const row of rows) {
    assert.equal(row.preview, undefined);
    assert.equal(row.notes, undefined);
    assert.equal(row.creations, undefined);
    assert.equal(row.counts.slides, 1);
  }
});
test("individual imports normalize legacy projects and reject a different application", () => {
  const p = makeVideoProject(),
    original = makeCreation(p, "banners", "Overlay"),
    doc = documentFromStorage(original.storage, "banners");
  const imported = makeCreation(p, "banners", "Import", doc);
  assert.notEqual(
    documentFromStorage(imported.storage, "banners").projectId,
    doc.projectId,
  );
  assert.throws(() => makeCreation(p, "slides", "Wrong", doc));
  const legacy = {
    ...documentFromStorage(
      makeCreation(p, "slides", "Ancien").storage,
      "slides",
    ),
  };
  delete legacy.format;
  legacy.slides[0].title = "Texte préservé";
  const row = makeCreation(p, "slides", "Ancien", legacy);
  assert.equal(
    documentFromStorage(row.storage, "slides").slides[0].title,
    "Texte préservé",
  );
});

test("playlist positions are independent, contiguous and moving one video preserves other playlists", async () => {
  const { numberedVideos, moveVideoOrder } =
    await import("../src/videoProjects.js");
  const rows = [
    { id: "a", playlist: "Java", createdAt: 1 },
    { id: "x", playlist: "IA", createdAt: 2 },
    { id: "b", playlist: "Java", createdAt: 3, archived: true },
    { id: "y", playlist: "IA", createdAt: 4 },
    { id: "c", playlist: "Java", createdAt: 5 },
  ];
  const ids = moveVideoOrder(rows, [], "c", 1),
    numbered = numberedVideos(rows, ids);
  assert.deepEqual(
    numbered
      .filter((p) => p.playlist === "Java")
      .map((p) => [p.id, p.playlistPosition]),
    [
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ],
  );
  assert.deepEqual(
    numbered
      .filter((p) => p.playlist === "IA")
      .map((p) => [p.id, p.playlistPosition]),
    [
      ["x", 1],
      ["y", 2],
    ],
  );
  assert.throws(() => moveVideoOrder(rows, ids, "a", 0));
  assert.throws(() => moveVideoOrder(rows, ids, "a", 4));
  assert.throws(() => moveVideoOrder(rows, ids, "a", 1.5));
  assert.throws(() => moveVideoOrder(rows, ids, "unknown", 1));
  assert.equal(rows[0].playlistPosition, undefined);
});
test("saved video order survives status, names and playlist renames and appends new videos", async () => {
  const { numberedVideos, videoOrderIds, changePlaylist } =
    await import("../src/videoProjects.js");
  const rows = [
      { id: "a", playlist: "Java", createdAt: 1, status: "preparation" },
      { id: "b", playlist: "Java", createdAt: 2, status: "published" },
    ],
    saved = ["b", "a"];
  const changed = rows.map((p) =>
    changePlaylist({ ...p, status: "editing", updatedAt: 9999 }, "Java", "JVM"),
  );
  assert.deepEqual(
    numberedVideos(changed, saved).map((p) => [p.id, p.playlistPosition]),
    [
      ["b", 1],
      ["a", 2],
    ],
  );
  const added = [...rows, { id: "c", playlist: "Java", createdAt: 3 }];
  assert.deepEqual(videoOrderIds(added, ["b", "b", "missing", "a"]), [
    "b",
    "a",
    "c",
  ]);
});
test("process sorting follows the workflow while playlist sorting follows manual positions", async () => {
  const { sortVideos, videoStatuses } = await import("../src/videoProjects.js");
  const rows = videoStatuses.map(([status], i) => ({
    id: String(i),
    playlist: "Java",
    status,
    playlistPosition: videoStatuses.length - i,
    updatedAt: i,
  }));
  assert.deepEqual(
    sortVideos(rows.slice().reverse(), "process").map((p) => p.status),
    videoStatuses.map(([id]) => id),
  );
  assert.deepEqual(
    sortVideos(rows, "playlist").map((p) => p.playlistPosition),
    rows.map((p) => p.playlistPosition).sort((a, b) => a - b),
  );
  assert.equal(sortVideos(rows, "recent")[0].updatedAt, rows.length - 1);
  assert.equal(rows[0].status, "backlog");
});

test("playlist drag insertion handles upward/downward drops and preserves neighboring order", async () => {
  const { playlistDropPosition, moveVideoOrder, numberedVideos } =
    await import("../src/videoProjects.js");
  const rows = ["a", "b", "c", "d"].map((id, i) => ({
    id,
    playlist: "Java",
    createdAt: i,
  }));
  for (const [source, target, after, expected] of [
    ["a", "c", false, ["b", "a", "c", "d"]],
    ["a", "c", true, ["b", "c", "a", "d"]],
    ["d", "b", false, ["a", "d", "b", "c"]],
    ["d", "b", true, ["a", "b", "d", "c"]],
    ["b", "b", false, ["a", "b", "c", "d"]],
    ["b", "b", true, ["a", "b", "c", "d"]],
  ]) {
    const position = playlistDropPosition(rows, source, target, after),
      saved = moveVideoOrder(rows, [], source, position);
    assert.deepEqual(
      numberedVideos(rows, saved).map((row) => row.id),
      expected,
    );
  }
  assert.throws(() => playlistDropPosition(rows, "missing", "a"));
  assert.throws(() => playlistDropPosition(rows, "a", "missing"));
});

test("backlog status survives editable video bundles", async () => {
  const { normalizeVideoProject } = await import("../src/videoProjects.js");
  const project = makeVideoProject("Idée pour plus tard");
  project.status = "backlog";
  assert.equal(normalizeVideoProject(project).status, "backlog");
  assert.equal(
    importVideoBundle(videoBundle(project, [])).project.status,
    "backlog",
  );
});

test("video cover prefers thumbnails then first slide then overlay", async () => {
  const { preferredVideoCreation } = await import("../src/videoProjects.js");
  const rows = [
    { id: "b", app: "banners" },
    { id: "s", app: "slides" },
    { id: "t", app: "thumbnails" },
  ];
  assert.equal(preferredVideoCreation(rows).id, "t");
  assert.equal(preferredVideoCreation(rows.slice(0, 2)).id, "s");
  assert.equal(preferredVideoCreation(rows.slice(0, 1)).id, "b");
  assert.equal(preferredVideoCreation([]), null);
  assert.equal(rows[0].id, "b");
});

test("learning canvas has an independent application route", async () => {
  const { applicationFromHash, applicationHash } =
    await import("../src/applicationRoutes.js");
  assert.equal(applicationFromHash("#/parcours"), "canvas");
  assert.equal(applicationHash("canvas"), "#/parcours");
});
test('removing one creation preserves other apps and refreshes the video cover',async()=>{
 const {detachCreation}=await import('../src/videoProjects.js');
 for(const app of ['slides','banners','thumbnails']){
  const project=makeVideoProject('Cours'),rows=['slides','banners','thumbnails'].map(kind=>makeCreation(project,kind,kind));
  rows.forEach(row=>attachCreation(project,row));project.creations.forEach((meta,i)=>{meta.preview='cover'+i;});project.preview='cover0';
  const target=rows.find(row=>row.app===app),before=structuredClone(project.creations),removed=detachCreation(project,target.id);
  assert.equal(removed.meta.id,target.id);assert.equal(removed.index,rows.indexOf(target));
  assert.deepEqual(project.creations,before.filter(row=>row.id!==target.id));assert.equal(project.preview,project.creations[0].preview);
  assert.throws(()=>detachCreation(project,target.id));
  project.creations.splice(removed.index,0,removed.meta);assert.deepEqual(project.creations,before);
 }
 const project=makeVideoProject(),row=makeCreation(project,'slides','Seul');attachCreation(project,row);detachCreation(project,row.id);assert.equal(project.creations.length,0);assert.equal(project.preview,null);
});

test('video types persist independently of status and historical videos remain unclassified',async()=>{
 const {makeVideoProject,normalizeVideoProject,videoSummary,videoTypes}=await import('../src/videoProjects.js');
 const p=makeVideoProject('Cours Java');assert.equal(p.videoType,'');
 for(const [videoType] of videoTypes){const normalized=normalizeVideoProject(JSON.parse(JSON.stringify({...p,videoType,status:'editing'})));assert.equal(normalized.videoType,videoType);assert.equal(normalized.status,'editing');assert.equal(videoSummary(normalized).videoType,videoType);}
 const old={...p};delete old.videoType;assert.equal(normalizeVideoProject(old).videoType,'');
 assert.equal(normalizeVideoProject({...p,videoType:'unknown'}).videoType,'');
});
