import MarkdownIt from "markdown-it";
const linksMarkdown = new MarkdownIt({ html: false });
import { normalizeConductorImages } from "./videoWorkflow.js";
export const FREE_NOTE_TITLE_LIMIT = 80;
export const freeNoteTitle = (value) =>
  String(value || "Sans titre")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FREE_NOTE_TITLE_LIMIT) || "Sans titre";
export const freeNotesTreeKey = "free-notes-tree";
export const freeNoteKey = (id) => "free-note:" + id;
export const validFreeNoteId = (id) =>
  typeof id === "string" && /^[\w-]{1,100}$/.test(id);
export function normalizeFreeTree(raw) {
  const ids = new Set(),
    rows = [];
  for (const item of (Array.isArray(raw) ? raw : []).slice(0, 5000)) {
    if (!item || !validFreeNoteId(item.id) || ids.has(item.id)) continue;
    ids.add(item.id);
    rows.push({
      id: item.id,
      kind: item.kind === "folder" ? "folder" : "note",
      title: freeNoteTitle(item.title),
      parent: validFreeNoteId(item.parent) ? item.parent : "",
      links: [
        ...new Set(
          (Array.isArray(item.links) ? item.links : []).filter(validFreeNoteId),
        ),
      ],
      updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : Date.now(),
    });
  }
  const map = new Map(rows.map((row) => [row.id, row]));
  for (const row of rows) {
    let parent = row.parent;
    const visited = new Set([row.id]);
    while (parent) {
      if (!map.has(parent) || visited.has(parent)) {
        row.parent = "";
        break;
      }
      visited.add(parent);
      parent = map.get(parent).parent;
    }
  }
  return rows;
}
export function normalizeFreeNote(raw = {}) {
  if (!validFreeNoteId(raw.id)) throw Error("Identifiant de note invalide.");
  return {
    id: raw.id,
    revision: Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0,
    content: typeof raw.content === "string" ? raw.content.slice(0, 50000) : "",
    images: normalizeConductorImages(raw.images),
  };
}
export function freeNoteLinks(content) {
  if (!String(content).includes("#/notes/")) return [];
  const ids = new Set();
  for (const block of linksMarkdown.parse(String(content), {}))
    for (const token of block.children || []) {
      if (token.type === "link_open") {
        const match = token
          .attrGet("href")
          ?.match(/^#\/notes\/([\w-]{1,100})$/);
        if (match) ids.add(match[1]);
      }
    }
  return [...ids];
}
export function mergeFreeTree(existing, requested) {
  const current = normalizeFreeTree(existing),
    map = new Map(current.map((row) => [row.id, row])),
    seen = new Set();
  const result = normalizeFreeTree(requested)
    .filter((row) => map.has(row.id))
    .map((row) => {
      seen.add(row.id);
      return { ...map.get(row.id), title: row.title, parent: row.parent };
    });
  return normalizeFreeTree([
    ...result,
    ...current.filter((row) => !seen.has(row.id)),
  ]);
}
export function freeDescendants(tree, id) {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of tree)
      if (ids.has(row.parent) && !ids.has(row.id)) {
        ids.add(row.id);
        changed = true;
      }
  }
  return ids;
}
export function moveFreeEntry(tree, id, parent) {
  if (
    !tree.some((row) => row.id === id) ||
    (parent && !tree.some((row) => row.id === parent))
  )
    throw Error("Emplacement introuvable.");
  if (freeDescendants(tree, id).has(parent))
    throw Error(
      "Impossible de déplacer un élément dans ses propres sous-pages.",
    );
  return tree.map((row) => (row.id === id ? { ...row, parent } : row));
}
export function freeTreeRows(tree, expanded, query = "") {
  const fold = (s) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    term = fold(query.trim()),
    wanted = new Set();
  if (term) {
    for (const row of tree)
      if (fold(row.title).includes(term)) {
        let entry = row;
        while (entry && !wanted.has(entry.id)) {
          wanted.add(entry.id);
          entry = tree.find((item) => item.id === entry.parent);
        }
      }
  }
  const result = [],
    stack = tree
      .filter((row) => !row.parent)
      .reverse()
      .map((row) => ({ row, depth: 0 }));
  while (stack.length) {
    const item = stack.pop();
    if (term && !wanted.has(item.row.id)) continue;
    result.push(item);
    if (term || expanded.includes(item.row.id))
      for (const row of tree
        .filter((row) => row.parent === item.row.id)
        .reverse())
        stack.push({ row, depth: item.depth + 1 });
  }
  return result;
}
export function importFreeNotes(raw, existing = []) {
  if (
    raw?.format !== "frame-free-notes" ||
    !Array.isArray(raw.tree) ||
    !Array.isArray(raw.notes)
  )
    throw Error("Sauvegarde de notes invalide.");
  const source = normalizeFreeTree(raw.tree);
  if (source.length + existing.length > 5000)
    throw Error("Limite de 5 000 notes et dossiers.");
  const ids = new Map(source.map((row) => [row.id, crypto.randomUUID()]));
  const tree = source.map((row) => ({
    ...row,
    id: ids.get(row.id),
    parent: ids.get(row.parent) || "",
    links: row.links.map((id) => ids.get(id) || id),
  }));
  const bodies = new Map(
    raw.notes
      .filter((note) => note && validFreeNoteId(note.id))
      .map((note) => [note.id, note]),
  );
  const notes = source
    .filter((row) => row.kind === "note")
    .map((row) => {
      const note = normalizeFreeNote({ ...bodies.get(row.id), id: row.id });
      return {
        ...note,
        id: ids.get(row.id),
        content: note.content.replace(/#\/notes\/([\w-]{1,100})/g, (all, id) =>
          ids.has(id) ? "#/notes/" + ids.get(id) : all,
        ),
      };
    });
  return { tree: [...existing, ...tree], notes };
}

export function freeEntryPath(tree, id) {
  const names = [],
    seen = new Set(),
    map = new Map(tree.map((row) => [row.id, row]));
  let row = map.get(id);
  while (row && !seen.has(row.id)) {
    seen.add(row.id);
    names.unshift(row.title);
    row = map.get(row.parent);
  }
  return names.join(" / ");
}

// Retire aussi les descendants : aucune note contenue dans un ancien dossier ne survit.
export function notesWithoutFolders(raw) {
  const tree = normalizeFreeTree(raw),
    removed = new Set();
  for (const row of tree)
    if (row.kind === "folder")
      for (const id of freeDescendants(tree, row.id)) removed.add(id);
  return { tree: tree.filter((row) => !removed.has(row.id)), removed };
}
export function directChildNotes(tree, parent) {
  return tree.filter((row) => row.kind === "note" && row.parent === parent);
}

// Ignore body-derived links/timestamps: text autosave must not conflict with a rename.
export const freeTreeSignature = tree => JSON.stringify(normalizeFreeTree(tree).map(({id,title,parent})=>({id,title,parent})));
