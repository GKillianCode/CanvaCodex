<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  Plus,
  Folder,
  FileText,
  ChevronRight,
  MoreHorizontal,
  Link2,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Trash2,
  Copy,
  GripVertical,
  Network,
  NotebookPen,
} from "lucide-vue-next";
import FreeNotesGraph from "./FreeNotesGraph.vue";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import ConductorRichEditor from "./ConductorRichEditor.vue";
import {
  freeTreeRows,
  freeDescendants,
  moveFreeEntry,
  freeNoteLinks,
  mergeFreeTree,
  freeEntryPath,
} from "../freeNotes.js";
import { downloadText } from "../useVideoWorkflow.js";
const props = defineProps({ repository: Object, noteId: String }),
  emit = defineEmits(["home", "open"]);
const tree = ref([]),
  activeId = ref(""),
  document = ref(null),
  editor = ref(null),
  loading = ref(true),
  busy = ref(false),
  saving = ref(false),
  error = ref(""),
  notice = ref(""),
  search = ref(""),
  expanded = ref([]),
  menu = ref(null),
  moving = ref(false),
  destination = ref(""),
  linkPicker = ref(false),
  linkQuery = ref("");
const graphVisible = ref(false);
async function showGraph() {
  await run(async () => {
    graphVisible.value = true;
  });
}
const sidebarWidth = ref(270),
  pageAction = ref(""),
  pageTitle = ref("");
let stopResize;
function resizeSidebar(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  stopResize?.();
  const start = event.clientX,
    width = sidebarWidth.value;
  const move = (e) => {
    sidebarWidth.value = Math.max(
      200,
      Math.min(650, window.innerWidth - 250, width + e.clientX - start),
    );
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    try {
      localStorage.setItem("frame-notes-sidebar-width", sidebarWidth.value);
    } catch {}
    stopResize = null;
  };
  stopResize = end;
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}
function choosePageAction(action) {
  pageAction.value = action;
  nextTick(() =>
    window.document.querySelector(".free-notes-picker input")?.focus(),
  );
}
async function createLinkedChild() {
  if (!pageTitle.value.trim()) return;
  await run(async () => {
    const row = {
      id: crypto.randomUUID(),
      kind: "note",
      title: pageTitle.value.trim().slice(0, 80),
      parent: activeId.value,
      links: [],
      updatedAt: Date.now(),
    };
    tree.value = await props.repository.createFreeNote(row);
    if (!expanded.value.includes(activeId.value))
      expanded.value.push(activeId.value);
    rememberUI();
    await insertLink(row);
    await flush();
  });
}
const draggedId = ref(""),
  dropTarget = ref(null);
let expandTimer;
function endDrag() {
  draggedId.value = "";
  dropTarget.value = null;
  clearTimeout(expandTimer);
}
function startDrag(event, id) {
  if (busy.value || saving.value) {
    event.preventDefault();
    return;
  }
  draggedId.value = id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-frame-note", id);
  menu.value = null;
}
function dragOver(event, parent) {
  if (
    !draggedId.value ||
    freeDescendants(tree.value, draggedId.value).has(parent)
  )
    return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  if (dropTarget.value !== parent) {
    clearTimeout(expandTimer);
    dropTarget.value = parent;
    if (parent && !expanded.value.includes(parent))
      expandTimer = setTimeout(() => {
        expanded.value.push(parent);
        rememberUI();
      }, 650);
  }
  const sidebar = event.currentTarget.closest(".free-notes-sidebar");
  if (sidebar) {
    const bounds = sidebar.getBoundingClientRect();
    if (event.clientY > bounds.bottom - 45) sidebar.scrollTop += 18;
    if (event.clientY < bounds.top + 45) sidebar.scrollTop -= 18;
  }
}
async function dropEntry(event, parent) {
  event.preventDefault();
  const id = draggedId.value;
  endDrag();
  if (!id || freeDescendants(tree.value, id).has(parent)) return;
  if (tree.value.find((row) => row.id === id)?.parent === parent) return;
  await run(async () => {
    tree.value = await props.repository.saveFreeNotesTree(
      moveFreeEntry(tree.value, id, parent),
    );
    if (parent && !expanded.value.includes(parent)) expanded.value.push(parent);
    rememberUI();
  });
}
const current = computed(() =>
    tree.value.find((row) => row.id === activeId.value),
  ),
  rows = computed(() => freeTreeRows(tree.value, expanded.value, search.value)),
  noteChoices = computed(() =>
    tree.value.filter(
      (row) =>
        row.kind === "note" &&
        row.title
          .toLocaleLowerCase()
          .includes(linkQuery.value.toLocaleLowerCase()),
    ),
  ),
  moveChoices = computed(() => {
    const excluded = freeDescendants(tree.value, menu.value?.id);
    return tree.value.filter((row) => !excluded.has(row.id));
  });
const ancestors = computed(() => {
  const rows = [],
    seen = new Set();
  let row = tree.value.find((row) => row.id === current.value?.parent);
  while (row && !seen.has(row.id)) {
    seen.add(row.id);
    rows.unshift(row);
    row = tree.value.find((item) => item.id === row.parent);
  }
  return rows;
});
let bodyVersion = 0,
  bodySaved = 0,
  treeVersion = 0,
  treeSaved = 0,
  timer,
  writing = null;
const dirty = computed(() => dirtyFlag.value),
  dirtyFlag = ref(false);
function schedule() {
  dirtyFlag.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => flush().catch(() => {}), 350);
}
function changeContent(value) {
  document.value.content = value;
  bodyVersion++;
  const row = current.value;
  if (row) row.links = freeNoteLinks(value);
  schedule();
}
function changeImages(value) {
  document.value.images = value;
  bodyVersion++;
  schedule();
}
function changeTitle() {
  treeVersion++;
  schedule();
}
async function flush() {
  await editor.value?.flush();
  clearTimeout(timer);
  if (writing) {
    await writing;
    if (dirtyFlag.value) return flush();
    return;
  }
  if (bodyVersion === bodySaved && treeVersion === treeSaved) return;
  const save = async () => {
    saving.value = true;
    error.value = "";
    try {
      while (bodyVersion !== bodySaved || treeVersion !== treeSaved) {
        if (treeVersion !== treeSaved) {
          const version = treeVersion;
          await props.repository.saveFreeNotesTree(
            JSON.parse(JSON.stringify(tree.value)),
          );
          treeSaved = version;
        }
        if (document.value && bodyVersion !== bodySaved) {
          const version = bodyVersion,
            snapshot = JSON.parse(JSON.stringify(document.value));
          await props.repository.saveFreeNote(snapshot);
          bodySaved = version;
        }
      }
      dirtyFlag.value = false;
    } catch (e) {
      error.value = e.message || "Impossible d’enregistrer la note.";
      throw e;
    } finally {
      saving.value = false;
    }
  };
  writing = save();
  try {
    await writing;
  } finally {
    writing = null;
  }
}
defineExpose({ flush });
function rememberUI() {
  try {
    localStorage.setItem(
      "frame-free-notes-expanded",
      JSON.stringify(expanded.value),
    );
    localStorage.setItem("frame-free-notes-last", activeId.value);
  } catch {}
}
function toggle(id) {
  expanded.value = expanded.value.includes(id)
    ? expanded.value.filter((key) => key !== id)
    : [...expanded.value, id];
  rememberUI();
}
function open(id) {
  graphVisible.value = false;
  menu.value = null;
  emit("open", id);
}
async function run(action) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await flush();
    await action();
  } catch (e) {
    error.value = e.message || "Opération impossible.";
  } finally {
    busy.value = false;
  }
}
async function create(kind, parent = "") {
  await run(async () => {
    const entry = {
      id: crypto.randomUUID(),
      kind,
      title: "Nouvelle note",
      parent,
      links: [],
      updatedAt: Date.now(),
    };
    tree.value = await props.repository.createFreeNote(entry);
    if (parent && !expanded.value.includes(parent)) expanded.value.push(parent);
    rememberUI();
    open(entry.id);
  });
}
function showMenu(event, row) {
  event.preventDefault();
  menu.value = {
    id: row.id,
    x: Math.max(8, Math.min(event.clientX, window.innerWidth - 235)),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - 320)),
  };
}
function deleteSelected(event) {
  if (
    event.key !== "Delete" ||
    busy.value ||
    loading.value ||
    moving.value ||
    linkPicker.value
  )
    return;
  if (
    event.target.closest(
      'input,textarea,select,[contenteditable="true"],[role="dialog"]',
    )
  )
    return;
  if (!event.target.closest(".free-notes-sidebar") || !activeId.value) return;
  event.preventDefault();
  remove(activeId.value);
}
async function remove(selectedId) {
  const id = typeof selectedId === "string" ? selectedId : menu.value?.id;
  const row = tree.value.find((row) => row.id === id);
  if (!row) return;
  const ids = freeDescendants(tree.value, row.id);
  if (
    !window.confirm(
      `Supprimer « ${row.title} »${ids.size > 1 ? " et ses " + (ids.size - 1) + " sous-pages" : ""} ?`,
    )
  )
    return;
  menu.value = null;
  await run(async () => {
    tree.value = await props.repository.removeFreeNotes(row.id);
    if (ids.has(activeId.value)) emit("open", tree.value[0]?.id || "");
  });
}
async function duplicate() {
  const row = tree.value.find((row) => row.id === menu.value?.id);
  if (!row || row.kind !== "note") return;
  menu.value = null;
  await run(async () => {
    const source = await props.repository.freeNote(row.id),
      entry = {
        ...row,
        id: crypto.randomUUID(),
        title: row.title + " · copie",
        updatedAt: Date.now(),
      };
    tree.value = await props.repository.createFreeNote(entry);
    if (source)
      await props.repository.saveFreeNote({ ...source, id: entry.id });
    open(entry.id);
  });
}
async function move() {
  const id = menu.value?.id;
  await run(async () => {
    tree.value = await props.repository.saveFreeNotesTree(
      moveFreeEntry(tree.value, id, destination.value),
    );
    moving.value = false;
    menu.value = null;
    if (destination.value && !expanded.value.includes(destination.value))
      expanded.value.push(destination.value);
    rememberUI();
  });
}
async function reorder(delta) {
  const id = menu.value?.id;
  menu.value = null;
  await run(async () => {
    const index = tree.value.findIndex((row) => row.id === id),
      row = tree.value[index],
      siblings = tree.value.filter((item) => item.parent === row.parent),
      to = siblings.findIndex((item) => item.id === id) + delta;
    if (to < 0 || to >= siblings.length) return;
    const target = tree.value.findIndex((item) => item.id === siblings[to].id),
      next = [...tree.value];
    [next[index], next[target]] = [next[target], next[index]];
    tree.value = await props.repository.saveFreeNotesTree(next);
  });
}
async function exportAll() {
  if (busy.value) return;
  busy.value = true;
  try {
    await editor.value?.flush();
    let unsaved = false;
    try {
      await flush();
    } catch {
      unsaved = true;
    }
    const data = await props.repository.exportFreeNotes();
    data.tree = mergeFreeTree(data.tree, tree.value);
    if (document.value) {
      data.notes = data.notes.filter((note) => note.id !== document.value.id);
      data.notes.push(JSON.parse(JSON.stringify(document.value)));
      const row = data.tree.find((row) => row.id === document.value.id);
      if (row) row.links = freeNoteLinks(document.value.content);
      else if (current.value)
        data.tree.push({
          ...current.value,
          parent: "",
          links: freeNoteLinks(document.value.content),
        });
    }
    downloadText(
      "frame-notes.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
    if (unsaved)
      notice.value =
        "La sauvegarde exportée inclut aussi la note en cours non enregistrée.";
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function importAll(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  await run(async () => {
    if (file.size > 256 * 1024 * 1024)
      throw Error("La sauvegarde dépasse 256 Mo.");
    tree.value = await props.repository.importFreeNotes(
      JSON.parse(await file.text()),
    );
    notice.value = "Notes importées sans remplacer les notes existantes.";
  });
}
async function exportCurrent() {
  try {
    await editor.value?.flush();
    if (document.value)
      downloadText(
        (current.value?.title || "note").replace(/[\\/:*?"<>|]/g, "-") + ".md",
        document.value.content,
      );
  } catch (e) {
    error.value = e.message;
  }
}
function noteClick(event) {
  if (event.target.closest("[data-page-unlink]")) return;
  const a = event.target.closest('a[href^="#/notes/"]');
  if (!a) return;
  const id = a.getAttribute("href").match(/^#\/notes\/([\w-]+)$/)?.[1];
  if (id) {
    event.preventDefault();
    open(id);
  }
}
function requestLink() {
  linkQuery.value = "";
  pageAction.value = "";
  pageTitle.value = "";
  linkPicker.value = true;
  nextTick(() =>
    window.document.querySelector(".free-notes-picker input")?.focus(),
  );
}
async function insertLink(row) {
  linkPicker.value = false;
  await nextTick();
  editor.value?.insertNoteLink(row);
}
function outside(event) {
  if (moving.value || linkPicker.value) return;
  if (!event.target.closest(".free-notes-menu,.free-note-menu-trigger"))
    menu.value = null;
}
function beforeUnload(event) {
  if (dirtyFlag.value || saving.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
function pagehide() {
  flush().catch(() => {});
}
onMounted(async () => {
  window.addEventListener("pointerdown", outside);
  window.addEventListener("beforeunload", beforeUnload);
  window.addEventListener("pagehide", pagehide);
  try {
    try {
      const width = Number(localStorage.getItem("frame-notes-sidebar-width"));
      if (width >= 200 && width <= 650) sidebarWidth.value = width;
    } catch {}
    tree.value = await props.repository.freeNotesTree();
    let last = "";
    try {
      expanded.value = JSON.parse(
        localStorage.getItem("frame-free-notes-expanded") || "[]",
      );
      if (!Array.isArray(expanded.value)) expanded.value = [];
      last = localStorage.getItem("frame-free-notes-last") || "";
    } catch {}
    activeId.value =
      props.noteId ||
      (tree.value.some((row) => row.id === last) ? last : tree.value[0]?.id) ||
      "";
    let parent = current.value?.parent;
    while (parent) {
      if (!expanded.value.includes(parent)) expanded.value.push(parent);
      parent = tree.value.find((row) => row.id === parent)?.parent;
    }
    if (current.value?.kind === "note")
      document.value = await props.repository.freeNote(activeId.value);
    rememberUI();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
    await nextTick();
    if (props.noteId)
      window.document
        .querySelector(".free-notes-tree-row.active .free-note-open")
        ?.focus({ preventScroll: true });
  }
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  endDrag();
  stopResize?.();
  window.removeEventListener("pointerdown", outside);
  window.removeEventListener("beforeunload", beforeUnload);
  window.removeEventListener("pagehide", pagehide);
});
</script>
<template>
  <main
    class="free-notes-app"
    @keydown.ctrl.s.prevent="flush().catch(() => {})"
    @keydown.meta.s.prevent="flush().catch(() => {})"
  >
    <WorkspaceHeader title="Notes" @back="emit('home')"
      ><template #file
        ><button :disabled="busy" @click="flush().catch(() => {})">
          Enregistrer · Ctrl S</button
        ><button :disabled="busy" @click="exportAll">
          Exporter toutes les notes JSON</button
        ><label class="menu-file"
          >Importer une sauvegarde de notes<input
            type="file"
            accept="application/json,.json"
            :disabled="busy"
            aria-label="Importer les notes"
            @change="importAll" /></label
        ><button v-if="document" :disabled="busy" @click="exportCurrent">
          Exporter cette note Markdown
        </button></template
      ><template #context>
        <button
          class="notes-view-toggle"
          :disabled="busy || loading"
          @click="graphVisible ? (graphVisible = false) : showGraph()"
          :title="
            graphVisible
              ? 'Revenir au bloc-notes'
              : 'Explorer le réseau de notes'
          "
        >
          <NotebookPen v-if="graphVisible" :size="15" /><Network
            v-else
            :size="15"
          />
          {{ graphVisible ? "Bloc-notes" : "Réseau de notes" }}
        </button> </template
      ><template #utilities>
        <span class="notes-save-state" role="status">{{
          saving
            ? "Sauvegarde…"
            : dirty
              ? "Modifications en attente"
              : "Enregistré"
        }}</span>
      </template>
    </WorkspaceHeader>
    <p v-if="error" role="alert" class="video-alert">
      {{ error }}
      <button class="btn" @click="flush().catch(() => {})">Réessayer</button>
    </p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <FreeNotesGraph
      v-if="graphVisible"
      :tree="tree"
      :active-id="activeId"
      @open="open"
    />
    <div
      v-show="!graphVisible"
      class="free-notes-layout"
      :style="{ '--notes-sidebar-width': sidebarWidth + 'px' }"
    >
      <div class="free-notes-sidebar-shell">
        <aside
          class="free-notes-sidebar"
          tabindex="0"
          aria-label="Notes et sous-notes"
          @keydown="deleteSelected"
        >
          <div class="free-notes-sidebar-heading">
            <span>MON ESPACE DE NOTES</span
            ><button
              class="icon-btn"
              title="Nouvelle note à la racine"
              aria-label="Nouvelle note"
              :disabled="busy || loading"
              @click="create('note')"
            >
              <Plus :size="17" />
            </button>
          </div>
          <label class="free-notes-search"
            ><Search :size="15" /><input
              v-model="search"
              aria-label="Rechercher dans les notes"
              placeholder="Rechercher une page…"
          /></label>
          <div
            class="free-notes-root-drop"
            :class="{ targeted: dropTarget === '', dragging: draggedId }"
            @dragover.stop="dragOver($event, '')"
            @drop.stop="dropEntry($event, '')"
          >
            <Folder :size="14" /> Racine des notes
            <span :style="{ visibility: draggedId ? 'visible' : 'hidden' }"
              >Déposer ici pour revenir à la racine</span
            >
          </div>
          <nav
            aria-label="Arborescence des notes"
            @dragleave="dropTarget = null"
          >
            <div
              v-for="{ row, depth } in rows"
              :key="row.id"
              class="free-notes-tree-row"
              :class="{
                active: row.id === activeId,
                'drop-target': dropTarget === row.id,
                'is-dragging': draggedId === row.id,
              }"
              :style="{ paddingLeft: 8 + depth * 16 + 'px' }"
              :data-note-id="row.id"
              @contextmenu="showMenu($event, row)"
              @dragover.stop="dragOver($event, row.id)"
              @drop.stop="dropEntry($event, row.id)"
            >
              <button
                class="icon-btn free-notes-drag"
                draggable="true"
                :disabled="busy || saving"
                :aria-label="'Déplacer ' + row.title"
                title="Glisser vers une note ou la racine · autres options dans le menu"
                @dragstart="startDrag($event, row.id)"
                @dragend="endDrag"
                @click.stop
              >
                <GripVertical :size="13" />
              </button>
              <button
                class="icon-btn free-notes-expand"
                :aria-label="'Déplier ' + row.title"
                :aria-expanded="expanded.includes(row.id)"
                @click="toggle(row.id)"
              >
                <ChevronRight
                  :size="13"
                  :style="{
                    transform: expanded.includes(row.id)
                      ? 'rotate(90deg)'
                      : undefined,
                    opacity: tree.some((item) => item.parent === row.id)
                      ? 1
                      : 0.2,
                  }"
                /></button
              ><button
                class="free-note-open"
                :title="row.title"
                :aria-current="row.id === activeId ? 'page' : undefined"
                @click="open(row.id)"
              >
                <FileText :size="16" /><span>{{ row.title }}</span></button
              ><button
                class="icon-btn free-note-menu-trigger"
                :aria-label="'Options de ' + row.title"
                @click="showMenu($event, row)"
              >
                <MoreHorizontal :size="15" />
              </button>
            </div>
          </nav>
          <p v-if="!tree.length && !loading" class="field-help">
            Un espace pour tes idées, sans vidéo à créer.
          </p>
        </aside>
        <div
          class="free-notes-sidebar-resizer"
          role="separator"
          tabindex="0"
          aria-label="Largeur de la barre des notes"
          aria-orientation="vertical"
          :aria-valuenow="sidebarWidth"
          aria-valuemin="200"
          aria-valuemax="650"
          @pointerdown="resizeSidebar"
          @keydown.left.prevent="
            sidebarWidth = Math.max(200, sidebarWidth - 20)
          "
          @keydown.right.prevent="
            sidebarWidth = Math.min(650, sidebarWidth + 20)
          "
        />
      </div>
      <section class="free-notes-content" @click.capture="noteClick">
        <p v-if="loading">Ouverture des notes…</p>
        <template v-else-if="current"
          ><div class="free-notes-document-heading">
            <nav
              v-if="ancestors.length"
              class="free-notes-breadcrumb"
              aria-label="Emplacement de la note"
            >
              <template v-for="row in ancestors" :key="row.id"
                ><button @click="open(row.id)">{{ row.title }}</button
                ><span>/</span></template
              >
            </nav>
            <span class="eyebrow">NOTE LIBRE</span
            ><input
              v-model="current.title"
              class="free-notes-title"
              aria-label="Titre de la page"
              maxlength="80"
              :disabled="busy"
              placeholder="Sans titre"
              @input="changeTitle"
            />
            <div class="free-notes-actions">
              <button
                class="btn"
                :disabled="busy"
                @click="create('note', current.id)"
              >
                <Plus :size="15" />Sous-note
              </button>
            </div>
          </div>
          <ConductorRichEditor
            v-if="document && current.kind === 'note'"
            ref="editor"
            :key="current.id"
            document-mode
            hide-tools
            note-links
            :note-pages="tree"
            :child-note-ids="
              tree.filter((row) => row.parent === activeId).map((row) => row.id)
            "
            :model-value="document.content"
            :images="document.images"
            label="Contenu de la note"
            @update:model-value="changeContent"
            @update:images="changeImages"
            @request-note-link="requestLink"
            @error="error = $event"
          />
        </template>
        <div v-else class="free-notes-empty">
          <FileText :size="42" />
          <h1>
            {{
              noteId
                ? "Cette page est introuvable."
                : "Tes idées commencent ici."
            }}
          </h1>
          <p>
            Des notes libres, des sous-pages et des liens pour organiser tes
            idées de vidéos.
          </p>
          <button class="btn primary" :disabled="busy" @click="create('note')">
            <Plus :size="16" />Créer une note
          </button>
        </div>
      </section>
    </div>
    <div
      v-if="menu && !moving"
      class="app-menu-popover free-notes-menu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      role="menu"
    >
      <button
        role="menuitem"
        @click="
          create('note', menu.id);
          menu = null;
        "
      >
        Ajouter une sous-note
      </button>
      <hr />
      <button role="menuitem" @click="remove">
        <Trash2 :size="14" />Supprimer
      </button>
    </div>
    <div
      v-if="moving || linkPicker"
      class="modal-backdrop"
      @click.self="
        moving = false;
        linkPicker = false;
        menu = null;
      "
      @keydown.esc="
        moving = false;
        linkPicker = false;
        menu = null;
      "
    >
      <section
        class="video-modal free-notes-picker"
        role="dialog"
        aria-modal="true"
        :aria-label="moving ? 'Déplacer la page' : 'Page'"
      >
        <button
          class="icon-btn video-modal-close"
          aria-label="Fermer"
          @click="
            moving = false;
            linkPicker = false;
            menu = null;
          "
        >
          <X :size="18" />
        </button>
        <h2>{{ moving ? "Déplacer la page" : "Page" }}</h2>
        <template v-if="moving"
          ><label
            >Destination<select
              v-model="destination"
              aria-label="Note de destination"
            >
              <option value="">Racine des notes</option>
              <option v-for="row in moveChoices" :key="row.id" :value="row.id">
                Note ·
                {{ freeEntryPath(tree, row.id) }}
              </option>
            </select></label
          ><button class="btn primary" :disabled="busy" @click="move">
            Déplacer
          </button></template
        ><template v-else>
          <div class="free-notes-page-actions">
            <button
              class="btn"
              :class="{ primary: pageAction === 'associate' }"
              @click="choosePageAction('associate')"
            >
              <Link2 :size="18" /><span
                ><strong>Associer une note</strong
                ><small>Insérer un lien vers une page existante</small></span
              ><ChevronRight :size="16" />
            </button>
            <button
              class="btn"
              :class="{ primary: pageAction === 'create' }"
              @click="choosePageAction('create')"
            >
              <Plus :size="18" /><span
                ><strong>Créer une note enfant</strong
                ><small>Créer une sous-note et l’associer ici</small></span
              ><ChevronRight :size="16" />
            </button>
          </div>
          <form
            v-if="pageAction === 'create'"
            class="free-notes-create-page"
            @submit.prevent="createLinkedChild"
          >
            <label for="new-page-title">Titre de la page</label>
            <input
              id="new-page-title"
              v-model="pageTitle"
              maxlength="80"
              placeholder="Donne un titre à ta note…"
              :disabled="busy"
            />
            <button class="btn primary" :disabled="busy || !pageTitle.trim()">
              Créer et associer
            </button>
          </form>
          <template v-if="pageAction === 'associate'">
            <label class="free-notes-page-search"
              ><Search :size="16" /><input
                v-model="linkQuery"
                aria-label="Rechercher une page à lier"
                placeholder="Rechercher une note…"
            /></label>
            <div class="free-notes-link-choices">
              <button
                v-for="row in noteChoices"
                :key="row.id"
                @click="insertLink(row)"
              >
                <FileText :size="16" /><span
                  >{{ row.title
                  }}<small>{{ freeEntryPath(tree, row.id) }}</small></span
                >
              </button>
              <p v-if="!noteChoices.length" class="field-help">
                Aucune page correspondante.
              </p>
            </div></template
          ></template
        >
      </section>
    </div>
  </main>
</template>
