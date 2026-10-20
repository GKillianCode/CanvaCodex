import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFreeTree,
  normalizeFreeNote,
  moveFreeEntry,
  freeDescendants,
  freeTreeRows,
  importFreeNotes,
  freeNoteLinks,
  freeEntryPath,
} from "../src/freeNotes.js";
import {
  applicationFromHash,
  applicationHash,
} from "../src/applicationRoutes.js";
import { renderConductor } from "../src/notebookMarkdown.js";
const tree = [
  { id: "folder", kind: "folder", title: "Java", parent: "" },
  { id: "note", kind: "note", title: "Idées", parent: "folder" },
  { id: "child", kind: "note", title: "Cours", parent: "note" },
];
test("free notes support folders, subnotes, search ancestors and safe moves", () => {
  const rows = normalizeFreeTree(tree);
  assert.equal(freeEntryPath(rows, "child"), "Java / Idées / Cours");
  assert.deepEqual(
    [...freeDescendants(rows, "folder")],
    ["folder", "note", "child"],
  );
  assert.throws(() => moveFreeEntry(rows, "folder", "child"));
  assert.equal(
    moveFreeEntry(rows, "child", "").find((row) => row.id === "child").parent,
    "",
  );
  assert.deepEqual(
    freeTreeRows(rows, []).map((x) => x.row.id),
    ["folder"],
  );
  assert.deepEqual(
    freeTreeRows(rows, [], "cours").map((x) => x.row.id),
    ["folder", "note", "child"],
  );
  assert.equal(
    normalizeFreeTree([
      { id: "x", parent: "y" },
      { id: "y", parent: "x" },
    ]).some((x) => !x.parent),
    true,
  );
});
test("backup import makes new identities, preserves existing notes and remaps links", () => {
  const source = {
    format: "frame-free-notes",
    tree,
    notes: [
      { id: "note", content: "[Cours](#/notes/child)" },
      { id: "child", content: "Texte" },
    ],
  };
  const imported = importFreeNotes(source, [
    { id: "existing", kind: "note", title: "À garder", parent: "" },
  ]);
  assert.equal(imported.tree.length, 4);
  assert.equal(imported.tree[0].id, "existing");
  const child = imported.tree.find((row) => row.title === "Cours");
  const note = imported.notes.find((row) => row.content.includes("[Cours]"));
  assert.deepEqual(freeNoteLinks(note.content), [child.id]);
  assert.notEqual(child.id, "child");
  assert.equal(
    normalizeFreeNote({ id: "note", content: "a".repeat(60000) }).content
      .length,
    50000,
  );
});
test("note routes and internal links stay in the application", () => {
  assert.equal(applicationHash("notes"), "#/notes");
  assert.equal(applicationFromHash("#/notes/note-id"), "notes");
  assert.equal(applicationFromHash("#/notes/a/b"), null);
  const html = renderConductor("[Ma note](#/notes/note-id)");
  assert.match(html, /class="free-note-link"/);
  assert.doesNotMatch(html, /target="_blank"/);
});

test("links ignore code and stale tree writes cannot delete new notes or restore removed ones", async () => {
  const { mergeFreeTree } = await import("../src/freeNotes.js");
  assert.deepEqual(
    freeNoteLinks(
      "`[code](#/notes/code)`\n\n```\n[literal](#/notes/literal)\n```\n\n[Réel](#/notes/real)",
    ),
    ["real"],
  );
  const merged = mergeFreeTree(
    [
      { id: "kept", title: "Gardée", links: ["real"] },
      { id: "new", title: "Nouvelle" },
    ],
    [
      { id: "kept", title: "Renommée", links: [] },
      { id: "removed", title: "Supprimée" },
    ],
  );
  assert.deepEqual(
    merged.map((row) => row.id),
    ["kept", "new"],
  );
  assert.equal(merged[0].title, "Renommée");
  assert.deepEqual(merged[0].links, ["real"]);
});

test('folder removal deletes its entire subtree and page choices contain direct children only', async () => {
  const { notesWithoutFolders, directChildNotes } = await import('../src/freeNotes.js');
  const rows = [
    {id:'root',kind:'note',title:'Racine',parent:''},
    {id:'child',kind:'note',title:'Enfant',parent:'root'},
    {id:'grandchild',kind:'note',title:'Petit-enfant',parent:'child'},
    {id:'folder',kind:'folder',title:'Dossier',parent:''},
    {id:'nested',kind:'folder',title:'Sous-dossier',parent:'folder'},
    {id:'deleted',kind:'note',title:'Supprimée',parent:'nested'},
  ];
  const result = notesWithoutFolders(rows);
  assert.deepEqual(result.tree.map(row=>row.id), ['root','child','grandchild']);
  assert.deepEqual([...result.removed].sort(), ['deleted','folder','nested']);
  assert.deepEqual(directChildNotes(result.tree,'root').map(row=>row.id), ['child']);
  assert.deepEqual(directChildNotes(result.tree,'child').map(row=>row.id), ['grandchild']);
});

test('note titles have a bounded single-line name including imported metadata', async()=>{
 const {freeNoteTitle,FREE_NOTE_TITLE_LIMIT}=await import('../src/freeNotes.js');
 assert.equal(FREE_NOTE_TITLE_LIMIT,80);
 assert.equal(freeNoteTitle('A'.repeat(1000)).length,80);
 assert.equal(freeNoteTitle(' Test\n\tavec espaces '),'Test avec espaces');
 assert.equal(normalizeFreeTree([{id:'long',kind:'note',title:'X'.repeat(1000)}])[0].title.length,80);
});
