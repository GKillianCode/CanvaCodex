<script setup>
import {
  reactive,
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/700.css";
import {
  Plus,
  ArrowLeft,
  Download,
  Upload,
  Save,
  Search,
  FileText,
  PenTool,
  MousePointer2,
  Square,
  Circle,
  Type,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Layers,
  Lock,
  LockOpen,
  Eye,
  EyeOff,
  GripVertical,
  Undo2,
  Redo2,
  Minus,
  Maximize2,
  RotateCw,
  X,
  Settings2,
  FilePlus2,
  BringToFront,
  SendToBack,
  Group,
  Ungroup,
  Scissors,
  MoreHorizontal,
  Check,
  Grid2X2,
  Magnet,
} from "lucide-vue-next";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import NumberRange from "./NumberRange.vue";
import { useDesignStudio } from "../useDesignStudio.js";
import {
  designFormats,
  designBounds,
  paragraphStyles,
} from "../designModel.js";
import {
  artworkMarkup,
  furnitureMarkup,
  designTextLines,
} from "../designExport.js";
import { shapes as allShapes } from "../shapes.js";
import { freeformPath } from "../freeform.js";
const props = defineProps({
    kind: { type: String, required: true },
    repository: Object,
    documentId: String,
  }),
  emit = defineEmits(["home"]);
const s = reactive(useDesignStudio(props)),
  pageDrag = ref(null),
  layerDrag = ref(null),
  tab = ref("pages");
const title = props.kind === "layout" ? "Mise en page" : "Vectoriel",
  styleNames = {
    title: "Titre",
    heading: "Sous-titre",
    body: "Paragraphe",
    caption: "Légende",
    code: "Code",
  },
  formats = designFormats[props.kind];
const fontVersion = ref(0);
const fontsReady = () => fontVersion.value++;
onMounted(() => {
  document.fonts.addEventListener("loadingdone", fontsReady);
  document.fonts.ready.then(fontsReady);
});
onBeforeUnmount(() =>
  document.fonts.removeEventListener("loadingdone", fontsReady),
);
const libraryPage = ref(1);
watch(
  () => s.query,
  () => (libraryPage.value = 1),
);
const filtered = computed(() =>
    s.rows.filter((row) =>
      row.name.toLocaleLowerCase().includes(s.query.toLocaleLowerCase()),
    ),
  ),
  markup = computed(() =>
    (fontVersion.value, s.page)
      ? artworkMarkup(s.page, { selection: true, prefix: "editor" })
      : "",
  ),
  furniture = computed(() =>
    s.doc ? furnitureMarkup(s.doc, s.pageIndex) : "",
  ),
  size = computed(() =>
    s.doc
      ? {
          width: (s.doc.width * s.zoom) / 100 + "px",
          height: (s.doc.height * s.zoom) / 100 + "px",
        }
      : {},
  ),
  overflow = computed(
    () =>
      s.object?.type === "text" &&
      designTextLines(s.object).length * s.object.size * s.object.leading >
        s.object.h,
  ),
  handleSize = computed(() => (6 * 100) / s.zoom),
  selectionRotation = computed(() => s.object?.rotation || 0);
const handles = computed(() => {
  const b = s.bounds;
  return b
    ? [
        ["nw", b.x, b.y],
        ["n", b.x + b.w / 2, b.y],
        ["ne", b.x + b.w, b.y],
        ["e", b.x + b.w, b.y + b.h / 2],
        ["se", b.x + b.w, b.y + b.h],
        ["s", b.x + b.w / 2, b.y + b.h],
        ["sw", b.x, b.y + b.h],
        ["w", b.x, b.y + b.h / 2],
      ]
    : [];
});
const selectedEditable = computed(() => s.selected.some((e) => !e.locked)),
  nodes = computed(() => s.object?.nodes || []),
  palette = [
    "#172b25",
    "#ffffff",
    "#70bba2",
    "#d8eae2",
    "#5484a0",
    "#ddd9ed",
    "#c49465",
    "#eee3d6",
  ];
const unit = s.isLayout ? "mm" : "px",
  factor = s.isLayout ? 25.4 / 96 : 1;
const length = (value) => Math.round(value * factor * 10) / 10;
function value(field, event) {
  const n = Number(event.target.value);
  if (Number.isFinite(n))
    s.change(field, ["x", "y", "w", "h"].includes(field) ? n / factor : n);
}
function docNumber(field, event) {
  const n = Number(event.target.value);
  if (Number.isFinite(n)) s.changeDoc(field, Math.max(0, n / factor));
}
function dropPage(index) {
  if (pageDrag.value !== null) s.movePage(pageDrag.value, index);
  pageDrag.value = null;
}
function dropLayer(id) {
  const from = s.page.elements.findIndex((e) => e.id === layerDrag.value),
    to = s.page.elements.findIndex((e) => e.id === id);
  if (from >= 0 && to >= 0)
    s.edit(() => {
      const [e] = s.page.elements.splice(from, 1);
      s.page.elements.splice(to, 0, e);
    });
  layerDrag.value = null;
}
function renamePage(event) {
  s.edit(() => (s.page.name = event.target.value.slice(0, 100) || "Page"));
}
function nodePoint(n, field = "") {
  const e = s.object;
  return {
    x: e.x + ((field ? n[field + "X"] : n.x) / 100) * e.w,
    y: e.y + ((field ? n[field + "Y"] : n.y) / 100) * e.h,
  };
}
function beginNode(event, index, handle) {
  s.nodeIndex = index;
  s.begin(event, "node", handle);
}
function applyFormat(event) {
  const f = formats[Number(event.target.value)];
  if (f)
    s.edit(() => {
      s.doc.width = f[1];
      s.doc.height = f[2];
    });
  s.fit();
}
function action(fn) {
  fn();
  s.context = null;
}
function choosePen() {
  s.tool = s.tool === "pen" ? "select" : "pen";
  s.penNodes = [];
  s.nodeEditing = false;
}
defineExpose({ flush: s.flush });
</script>
<template>
  <div class="design-app">
    <WorkspaceHeader :title="title" @back="emit('home')"
      ><template #file
        ><button @click="s.newDialog = true">
          <FilePlus2 :size="15" />Nouveau document…</button
        ><button v-if="s.doc" @click="s.saveFile(false)">
          <Save :size="15" />Enregistrer le fichier…</button
        ><button v-if="s.doc" @click="s.saveFile(true)">
          Enregistrer sous…</button
        ><button v-if="s.doc" @click="s.exportProject">
          <Download :size="15" />Exporter le projet éditable…</button
        ><label class="design-file"
          ><Upload :size="15" />Importer un projet…<input
            type="file"
            accept="application/json,.json"
            @change="s.importProject" /></label
        ><template v-if="s.doc"
          ><hr />
          <button @click="s.svg">Exporter cette page en SVG</button
          ><button @click="s.png">Exporter cette page en PNG</button
          ><button v-if="s.isLayout" @click="s.pdf">
            Exporter le document en PDF…
          </button></template
        ></template
      ><template #context
        ><button
          v-if="s.doc"
          class="text-action design-return"
          @click="s.open('')"
        >
          <ArrowLeft :size="14" />Documents</button
        ><span class="design-test">TEST</span></template
      ><template #actions
        ><template v-if="s.doc"
          ><input
            class="design-document-name"
            aria-label="Nom du document"
            :value="s.doc.name"
            maxlength="100"
            @change="s.changeDoc('name', $event.target.value || 'Sans titre')"
          /><button
            class="btn primary"
            :title="
              s.isLayout
                ? 'Ouvre l’impression : choisir Enregistrer en PDF'
                : 'Exporter la page en SVG'
            "
            @click="s.isLayout ? s.pdf() : s.svg()"
          >
            <Download :size="15" />{{
              s.isLayout ? "Exporter PDF" : "Exporter SVG"
            }}
          </button></template
        ></template
      ><template #utilities
        ><button
          v-if="s.doc"
          class="text-action design-save"
          title="Copie automatique dans le navigateur. Fichier → Enregistrer sous pour un fichier externe."
          :disabled="s.saving"
          @click="s.flush().catch(() => {})"
        >
          <Save :size="14" />{{
            s.saving
              ? "Enregistrement…"
              : s.dirty
                ? "Enregistrer"
                : "Enregistré"
          }}
        </button></template
      ></WorkspaceHeader
    >
    <div v-if="s.error" class="design-error" role="alert">
      {{ s.error
      }}<button v-if="s.doc" class="btn" @click="s.exportProject">
        Récupérer ma copie JSON</button
      ><button
        class="icon-btn"
        title="Masquer le message"
        @click="s.error = ''"
      >
        <X :size="16" />
      </button>
    </div>
    <div v-if="s.loading" class="design-loading">Ouverture de l’atelier…</div>
    <main v-else-if="!s.doc" class="design-library">
      <div class="design-library-heading">
        <div>
          <span class="eyebrow"
            >ATELIER {{ s.isLayout ? "DOCUMENTS" : "VECTORIEL" }}</span
          >
          <h1>
            {{
              s.isLayout
                ? "Des idées à transmettre."
                : "Dessine tes explications."
            }}
          </h1>
          <p>
            {{
              s.isLayout
                ? "Compose tes fiches, tes exercices et tes supports de cours."
                : "Crée des formes et des schémas qui restent nets à toutes les tailles."
            }}
          </p>
        </div>
        <button class="btn primary" @click="s.newDialog = true">
          <Plus :size="17" />{{
            s.isLayout ? "Nouveau document" : "Nouveau dessin"
          }}
        </button>
      </div>
      <div class="design-library-bar">
        <label class="design-search"
          ><Search :size="16" /><input
            v-model="s.query"
            placeholder="Rechercher un document"
            aria-label="Rechercher un document" /></label
        ><span>{{ s.rows.length }} document(s)</span
        ><label class="btn design-file"
          ><Upload :size="15" />Importer<input
            type="file"
            accept=".json"
            @change="s.importProject"
        /></label>
      </div>
      <div class="design-document-grid">
        <article class="design-example">
          <span class="design-example-symbol"
            ><FileText v-if="s.isLayout" :size="36" /><PenTool
              v-else
              :size="36"
          /></span>
          <h2>Prends tes marques</h2>
          <p>
            {{
              s.isLayout
                ? "Une fiche de cours et son exercice, entièrement éditables."
                : "Un schéma de mémoire pour essayer les outils, sans partir de zéro."
            }}
          </p>
          <button class="btn" @click="s.create(true)">
            Ouvrir un exemple <ChevronRight :size="15" />
          </button>
        </article>
        <article
          v-for="row in filtered.slice(
            (libraryPage - 1) * 24,
            libraryPage * 24,
          )"
          :key="row.id"
          class="design-document-card"
        >
          <button class="design-document-open" @click="s.open(row.id)">
            <div class="design-document-preview">
              <svg
                :viewBox="`0 0 ${row.width} ${row.height}`"
                aria-hidden="true"
              >
                <rect width="100%" height="100%" fill="white" />
                <g
                  v-html="
                    artworkMarkup(
                      { elements: row.preview || [] },
                      { prefix: 'thumb-' + row.id },
                    )
                  "
                />
              </svg>
            </div>
            <div>
              <strong>{{ row.name }}</strong
              ><small
                >{{ row.pages }}
                {{ s.isLayout ? "page(s)" : "plan(s) de travail" }} ·
                {{ Math.round(row.width) }} ×
                {{ Math.round(row.height) }}</small
              >
            </div></button
          ><button
            class="icon-btn design-document-delete"
            :aria-label="'Supprimer ' + row.name"
            @click="s.removeDocument(row)"
          >
            <Trash2 :size="15" />
          </button>
        </article>
      </div>
      <div v-if="filtered.length > 24" class="design-library-pagination">
        <button class="btn" :disabled="libraryPage <= 1" @click="libraryPage--">
          Précédent</button
        ><span>{{ libraryPage }} / {{ Math.ceil(filtered.length / 24) }}</span
        ><button
          class="btn"
          :disabled="libraryPage >= Math.ceil(filtered.length / 24)"
          @click="libraryPage++"
        >
          Suivant
        </button>
      </div>
      <p v-if="s.query && !filtered.length" class="field-help">
        Aucun document ne correspond à cette recherche.
      </p>
    </main>
    <div v-else class="design-workbench">
      <aside class="design-left">
        <div class="design-left-heading">
          <strong>{{ s.isLayout ? "Pages" : "Plans de travail" }}</strong
          ><button
            class="icon-btn"
            :aria-label="
              s.isLayout ? 'Ajouter une page' : 'Ajouter un plan de travail'
            "
            @click="s.addPage()"
          >
            <Plus :size="17" />
          </button>
        </div>
        <div class="design-page-list">
          <button
            v-for="(p, i) in s.doc.pages"
            :key="p.id"
            class="design-page-row"
            :class="{
              active: s.pageIndex === i,
              'drop-target': pageDrag !== null && pageDrag !== i,
            }"
            draggable="true"
            @dragstart="
              pageDrag = i;
              $event.dataTransfer.setData('text/plain', p.id);
            "
            @dragend="pageDrag = null"
            @dragover.prevent
            @drop.prevent="dropPage(i)"
            @click="s.setPage(i)"
          >
            <GripVertical :size="13" /><span class="design-page-number">{{
              String(i + 1).padStart(2, "0")
            }}</span
            ><span>{{ p.name }}</span>
          </button>
        </div>
        <div class="design-page-actions">
          <button
            class="icon-btn"
            title="Dupliquer cette page"
            aria-label="Dupliquer cette page"
            @click="s.addPage(true)"
          >
            <Copy :size="15" /></button
          ><button
            class="icon-btn"
            title="Supprimer cette page"
            aria-label="Supprimer cette page"
            :disabled="s.doc.pages.length === 1"
            @click="s.removePage"
          >
            <Trash2 :size="15" /></button
          ><button class="text-action" @click="s.settings = !s.settings">
            <Settings2 :size="14" />Document
          </button>
        </div>
        <div class="design-left-heading design-layers-heading">
          <strong><Layers :size="14" />Calques</strong
          ><small>{{ s.page.elements.length }}</small>
        </div>
        <div class="design-layer-list">
          <div
            v-for="e in [...s.page.elements].reverse()"
            :key="e.id"
            class="design-layer"
            :class="{ active: s.selection.includes(e.id), hidden: e.hidden }"
            draggable="true"
            @dragstart="
              layerDrag = e.id;
              $event.dataTransfer.setData('text/plain', e.id);
            "
            @dragend="layerDrag = null"
            @dragover.prevent
            @drop.prevent="dropLayer(e.id)"
          >
            <button class="design-layer-name" @click="s.pick(e.id, $event)">
              <Type v-if="e.type === 'text'" :size="14" /><ImagePlus
                v-else-if="e.type === 'image'"
                :size="14"
              /><PenTool v-else-if="e.shape === 'freeform'" :size="14" /><Square
                v-else
                :size="14"
              /><span>{{ e.name }}</span
              ><small v-if="e.group">G</small></button
            ><button
              class="icon-btn"
              :aria-label="(e.hidden ? 'Afficher ' : 'Masquer ') + e.name"
              @click="s.edit(() => (e.hidden = !e.hidden))"
            >
              <EyeOff v-if="e.hidden" :size="13" /><Eye
                v-else
                :size="13"
              /></button
            ><button
              class="icon-btn"
              :aria-label="
                (e.locked ? 'Déverrouiller ' : 'Verrouiller ') + e.name
              "
              @click="s.edit(() => (e.locked = !e.locked))"
            >
              <Lock v-if="e.locked" :size="13" /><LockOpen v-else :size="13" />
            </button>
          </div>
          <p v-if="!s.page.elements.length" class="design-empty-layer">
            Ajoute un texte, une forme ou une image pour commencer.
          </p>
        </div>
        <button
          v-if="s.isLayout"
          class="btn design-flow-trigger"
          @click="s.flowDialog = true"
        >
          <FileText :size="15" />Ajouter un texte continu…</button
        ><button class="text-action design-library-back" @click="s.open('')">
          <ArrowLeft :size="14" />Tous les documents
        </button>
      </aside>
      <section class="design-center">
        <div class="design-toolbar">
          <div class="design-tool-group">
            <button
              class="icon-btn"
              :class="{ active: s.tool === 'select' }"
              title="Sélection · Maj pour ajouter"
              aria-label="Outil sélection"
              @click="
                s.tool = 'select';
                s.penNodes = [];
              "
            >
              <MousePointer2 :size="18" /></button
            ><button
              class="icon-btn"
              :class="{ active: s.tool === 'pen' }"
              title="Plume · clic-glisser pour une courbe · Entrée pour terminer"
              aria-label="Outil plume"
              @click="choosePen"
            >
              <PenTool :size="18" /></button
            ><span class="design-toolbar-divider" /><button
              class="icon-btn"
              title="Ajouter un rectangle"
              aria-label="Ajouter un rectangle"
              @click="s.add('shape', { shape: 'rect' })"
            >
              <Square :size="18" /></button
            ><button
              class="icon-btn"
              title="Ajouter une ellipse"
              aria-label="Ajouter une ellipse"
              @click="s.add('shape', { shape: 'ellipse' })"
            >
              <Circle :size="18" />
            </button>
            <details class="design-shape-menu">
              <summary class="icon-btn" title="Toutes les formes">
                <MoreHorizontal :size="18" />
              </summary>
              <div>
                <button
                  v-for="shape in allShapes"
                  :key="shape.id"
                  @click="
                    s.add('shape', {
                      shape: shape.id,
                      name: shape.name,
                      filled: !shape.open,
                      outlined: shape.open,
                    });
                    $event.target.closest('details').open = false;
                  "
                >
                  {{ shape.name }}
                </button>
              </div>
            </details>
            <button
              class="icon-btn"
              title="Ajouter un texte"
              aria-label="Ajouter un texte"
              @click="s.add('text')"
            >
              <Type :size="18" /></button
            ><label
              class="icon-btn design-file"
              title="Importer une image ou un SVG"
              aria-label="Importer une image"
              ><ImagePlus :size="18" /><input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                @change="s.importImage"
            /></label>
          </div>
          <div class="design-tool-group">
            <button
              class="icon-btn"
              :disabled="!s.canUndo"
              title="Annuler · Ctrl Z"
              aria-label="Annuler"
              @click="s.undo"
            >
              <Undo2 :size="17" /></button
            ><button
              class="icon-btn"
              :disabled="!s.canRedo"
              title="Rétablir · Ctrl Maj Z"
              aria-label="Rétablir"
              @click="s.redo"
            >
              <Redo2 :size="17" /></button
            ><span class="design-toolbar-divider" /><button
              class="icon-btn"
              :class="{ active: s.snapping }"
              title="Aimantation à la grille"
              aria-label="Aimantation"
              :aria-pressed="s.snapping"
              @click="s.snapping = !s.snapping"
            >
              <Magnet :size="17" /></button
            ><button
              class="icon-btn"
              :class="{ active: s.guides }"
              title="Afficher les repères"
              aria-label="Repères"
              :aria-pressed="s.guides"
              @click="s.guides = !s.guides"
            >
              <Grid2X2 :size="17" />
            </button>
          </div>
        </div>
        <div
          :ref="(el) => (s.viewport = el)"
          class="design-viewport"
          @wheel="s.wheel"
          @pointerdown.self="s.begin"
          @pointermove.self="s.move"
          @pointerup.self="s.end"
          @pointercancel.self="s.end"
          @contextmenu.prevent="s.openContext"
        >
          <div
            class="design-canvas-holder"
            :style="{ transform: `translate(${s.pan.x}px,${s.pan.y}px)` }"
          >
            <div class="design-page-caption">
              <span>{{ s.page.name }}</span
              ><small
                >{{ Math.round(s.doc.width) }} ×
                {{ Math.round(s.doc.height) }} px</small
              >
            </div>
            <svg
              :ref="(el) => (s.stage = el)"
              class="design-paper"
              :class="{
                checker: s.doc.transparent,
                'pen-mode': s.tool === 'pen',
              }"
              :viewBox="`0 0 ${s.doc.width} ${s.doc.height}`"
              :style="size"
              aria-label="Zone de création"
              tabindex="0"
              @pointerdown="s.begin"
              @pointermove="s.move"
              @pointerup="s.end"
              @pointercancel="s.end"
              @dblclick="s.tool === 'pen' ? s.finishPen() : s.editText()"
              @contextmenu.prevent.stop="s.openContext"
            >
              <rect
                v-if="!s.doc.transparent"
                width="100%"
                height="100%"
                :fill="s.page.background"
              />
              <g v-html="markup" />
              <g v-html="furniture" pointer-events="none" />
              <g
                v-if="s.guides && s.isLayout"
                class="design-guides"
                pointer-events="none"
              >
                <rect
                  :x="s.doc.margin"
                  :y="s.doc.margin"
                  :width="s.doc.width - 2 * s.doc.margin"
                  :height="s.doc.height - 2 * s.doc.margin"
                />
                <template v-if="s.doc.columns > 1">
                  <line
                    v-for="col in s.doc.columns - 1"
                    :key="col"
                    :x1="
                      s.doc.margin +
                      col *
                        ((s.doc.width - 2 * s.doc.margin + s.doc.gutter) /
                          s.doc.columns) -
                      s.doc.gutter / 2
                    "
                    :x2="
                      s.doc.margin +
                      col *
                        ((s.doc.width - 2 * s.doc.margin + s.doc.gutter) /
                          s.doc.columns) -
                      s.doc.gutter / 2
                    "
                    :y1="s.doc.margin"
                    :y2="s.doc.height - s.doc.margin"
                  />
                </template>
              </g>
              <g v-if="s.tool === 'select'">
                <rect
                  v-for="e in s.page.elements.filter((e) => !e.hidden)"
                  :key="e.id"
                  :data-hit="e.id"
                  :x="e.x"
                  :y="e.y"
                  :width="e.w"
                  :height="e.h"
                  :transform="`rotate(${e.rotation} ${e.x + e.w / 2} ${e.y + e.h / 2})`"
                  fill="transparent"
                  class="design-hit"
                />
              </g>
              <g
                v-if="s.bounds && s.tool === 'select' && !s.nodeEditing"
                :transform="`rotate(${selectionRotation} ${s.bounds.x + s.bounds.w / 2} ${s.bounds.y + s.bounds.h / 2})`"
                class="design-selection"
              >
                <rect
                  :x="s.bounds.x"
                  :y="s.bounds.y"
                  :width="s.bounds.w"
                  :height="s.bounds.h"
                  fill="none"
                  vector-effect="non-scaling-stroke"
                  pointer-events="none"
                />
                <template v-if="selectedEditable">
                  <rect
                    v-for="[handle, x, y] in handles"
                    :key="handle"
                    :x="x - handleSize"
                    :y="y - handleSize"
                    :width="2 * handleSize"
                    :height="2 * handleSize"
                    class="design-resize"
                    :style="{ cursor: handle + '-resize' }"
                    @pointerdown.stop="s.begin($event, 'resize', handle)"
                  />
                  <template v-if="s.object">
                    <line
                      :x1="s.bounds.x + s.bounds.w / 2"
                      :x2="s.bounds.x + s.bounds.w / 2"
                      :y1="s.bounds.y"
                      :y2="s.bounds.y - (30 * 100) / s.zoom"
                      vector-effect="non-scaling-stroke"
                      pointer-events="none"
                    />
                    <circle
                      :cx="s.bounds.x + s.bounds.w / 2"
                      :cy="s.bounds.y - (30 * 100) / s.zoom"
                      :r="handleSize + 1"
                      class="design-rotation"
                      @pointerdown.stop="s.begin($event, 'rotate')"
                    />
                  </template>
                </template>
              </g>
              <g
                v-if="s.object && s.nodeEditing"
                :transform="`rotate(${s.object.rotation} ${s.object.x + s.object.w / 2} ${s.object.y + s.object.h / 2})`"
                class="design-node-tools"
              >
                <template v-for="(n, i) in nodes" :key="i">
                  <template v-if="i === s.nodeIndex">
                    <line
                      v-for="field in ['in', 'out']"
                      :key="field"
                      :x1="nodePoint(n).x"
                      :y1="nodePoint(n).y"
                      :x2="nodePoint(n, field).x"
                      :y2="nodePoint(n, field).y"
                    />
                    <circle
                      v-for="field in ['in', 'out']"
                      :key="field"
                      :cx="nodePoint(n, field).x"
                      :cy="nodePoint(n, field).y"
                      :r="handleSize * 0.75"
                      @pointerdown.stop="beginNode($event, i, field)"
                    />
                  </template>
                  <rect
                    :x="nodePoint(n).x - handleSize"
                    :y="nodePoint(n).y - handleSize"
                    :width="handleSize * 2"
                    :height="handleSize * 2"
                    :class="{ active: i === s.nodeIndex }"
                    @pointerdown.stop="beginNode($event, i, 'anchor')"
                  />
                </template>
              </g>
              <rect
                v-if="s.marquee"
                v-bind="{
                  x: s.marquee.x,
                  y: s.marquee.y,
                  width: s.marquee.w,
                  height: s.marquee.h,
                }"
                class="design-marquee"
              />
              <g v-if="s.penNodes.length" class="design-pen-preview">
                <path :d="freeformPath(s.penNodes, false)" fill="none" />
                <circle
                  v-for="(n, i) in s.penNodes"
                  :key="i"
                  :cx="n.x"
                  :cy="n.y"
                  :r="handleSize"
                />
              </g>
            </svg>
          </div>
        </div>
        <footer class="design-bottom">
          <span>{{
            s.tool === "pen"
              ? "Clic : point · Glisser : courbe · Entrée : terminer · Échap : annuler"
              : "Molette : défiler · Ctrl molette : zoom · Molette enfoncée ou Espace : déplacer"
          }}</span>
          <div class="design-zoom">
            <button
              class="icon-btn"
              aria-label="Dézoomer"
              @click="s.zoom = Math.max(10, s.zoom - 10)"
            >
              <Minus :size="15" /></button
            ><label
              ><input
                type="number"
                aria-label="Zoom"
                min="10"
                max="400"
                :value="Math.round(s.zoom)"
                @change="
                  s.zoom = Math.max(
                    10,
                    Math.min(400, Number($event.target.value) || 100),
                  )
                "
              />%</label
            ><button
              class="icon-btn"
              aria-label="Zoomer"
              @click="s.zoom = Math.min(400, s.zoom + 10)"
            >
              <Plus :size="15" /></button
            ><button
              class="icon-btn"
              aria-label="Ajuster la page"
              title="Ajuster la page"
              @click="s.fit"
            >
              <Maximize2 :size="15" />
            </button>
          </div>
        </footer>
      </section>
      <aside class="design-inspector">
        <div class="design-inspector-heading">
          <strong>{{
            s.settings || !s.selection.length
              ? "Document"
              : s.object
                ? s.object.name
                : s.selection.length + " objets"
          }}</strong
          ><button
            v-if="s.selection.length"
            class="icon-btn"
            aria-label="Propriétés du document"
            @click="s.settings = !s.settings"
          >
            <Settings2 :size="16" />
          </button>
        </div>
        <div class="design-inspector-body">
          <template v-if="s.settings || !s.selection.length"
            ><details name="design-inspector" open>
              <summary>Format et page</summary>
              <label
                >Nom de la page<input
                  :value="s.page.name"
                  maxlength="100"
                  @change="renamePage" /></label
              ><label
                >Format<select
                  aria-label="Format du document"
                  @change="applyFormat"
                >
                  <option value="" selected disabled>Choisir un format</option>
                  <option v-for="(f, i) in formats" :key="f[0]" :value="i">
                    {{ f[0] }}
                  </option>
                </select></label
              >
              <div class="design-field-grid">
                <label
                  >Largeur · {{ unit
                  }}<input
                    type="number"
                    aria-label="Largeur du document"
                    :min="length(128)"
                    :max="length(4096)"
                    :value="length(s.doc.width)"
                    @change="docNumber('width', $event)" /></label
                ><label
                  >Hauteur · {{ unit
                  }}<input
                    type="number"
                    aria-label="Hauteur du document"
                    :min="length(128)"
                    :max="length(8192)"
                    :value="length(s.doc.height)"
                    @change="docNumber('height', $event)"
                /></label>
              </div>
              <label v-if="!s.isLayout" class="checkbox-label"
                ><input
                  type="checkbox"
                  :checked="s.doc.transparent"
                  @change="s.changeDoc('transparent', $event.target.checked)"
                />Fond transparent</label
              ><label
                >Couleur de la page<input
                  type="color"
                  :value="s.page.background"
                  @change="
                    s.edit(() => (s.page.background = $event.target.value))
                  "
              /></label>
            </details>
            <details v-if="s.isLayout" name="design-inspector">
              <summary>Marges et colonnes</summary>
              <NumberRange
                label="Marges"
                unit="px"
                :min="12"
                :max="180"
                :model-value="s.doc.margin"
                @update:model-value="s.changeDoc('margin', $event)"
              /><label
                >Colonnes<select
                  :value="s.doc.columns"
                  @change="s.changeDoc('columns', Number($event.target.value))"
                >
                  <option v-for="n in [1, 2, 3, 4]" :key="n" :value="n">
                    {{ n }}
                  </option>
                </select></label
              ><NumberRange
                label="Gouttière"
                unit="px"
                :min="0"
                :max="80"
                :model-value="s.doc.gutter"
                @update:model-value="s.changeDoc('gutter', $event)"
              />
              <p class="field-help">
                Les repères guident le placement. Le texte continu suit les
                marges et colonnes lors de sa répartition.
              </p>
            </details>
            <details v-if="s.isLayout" name="design-inspector">
              <summary>En-tête et pagination</summary>
              <label
                >En-tête<input
                  :value="s.doc.header"
                  maxlength="200"
                  @change="s.changeDoc('header', $event.target.value)" /></label
              ><label
                >Pied de page<input
                  :value="s.doc.footer"
                  maxlength="200"
                  @change="s.changeDoc('footer', $event.target.value)" /></label
              ><label class="checkbox-label"
                ><input
                  type="checkbox"
                  :checked="s.doc.pageNumbers"
                  @change="s.changeDoc('pageNumbers', $event.target.checked)"
                />Numéroter les pages</label
              >
            </details>
            <details name="design-inspector">
              <summary>Styles du document</summary>
              <div
                v-for="(style, id) in s.doc.styles"
                :key="id"
                class="design-style-row"
              >
                <strong>{{ styleNames[id] }}</strong>
                <label
                  >Police<select
                    :value="style.font"
                    @change="s.changeStyle(id, 'font', $event.target.value)"
                  >
                    <option value="inter">Inter</option>
                    <option value="montserrat">Montserrat</option>
                    <option value="lora">Lora</option>
                    <option value="monospace">Monospace</option>
                  </select></label
                >
                <div class="design-field-grid">
                  <label
                    >Taille<input
                      type="number"
                      :aria-label="styleNames[id] + ' · taille'"
                      min="6"
                      max="120"
                      :value="style.size"
                      @change="
                        s.changeStyle(id, 'size', Number($event.target.value))
                      " /></label
                  ><label
                    >Interligne<input
                      type="number"
                      :aria-label="styleNames[id] + ' · interligne'"
                      min="0.8"
                      max="3"
                      step="0.05"
                      :value="style.leading"
                      @change="
                        s.changeStyle(
                          id,
                          'leading',
                          Number($event.target.value),
                        )
                      "
                  /></label>
                </div>
              </div>
              <p class="field-help">
                Une modification s’applique à tous les textes utilisant ce style
                dans le document.
              </p>
            </details></template
          >
          <template v-else
            ><div class="design-selection-actions">
              <button
                class="icon-btn"
                title="Dupliquer · Ctrl D"
                aria-label="Dupliquer la sélection"
                @click="s.duplicate"
              >
                <Copy :size="15" /></button
              ><button
                class="icon-btn"
                title="Supprimer la sélection"
                aria-label="Supprimer la sélection"
                @click="s.deleteSelection"
              >
                <Trash2 :size="15" /></button
              ><button
                class="icon-btn"
                title="Verrouiller / déverrouiller"
                @click="
                  s.edit(() =>
                    s.selected.forEach((e) => (e.locked = !e.locked)),
                  )
                "
              >
                <Lock :size="15" />
              </button>
            </div>
            <details name="design-inspector" open>
              <summary>Position et dimensions</summary>
              <label v-if="s.object"
                >Nom<input
                  :value="s.object.name"
                  maxlength="100"
                  @change="s.change('name', $event.target.value)" /></label
              ><template v-if="s.object"
                ><div class="design-field-grid">
                  <label
                    v-for="[field, label] in [
                      ['x', 'Position X'],
                      ['y', 'Position Y'],
                      ['w', 'Largeur'],
                      ['h', 'Hauteur'],
                    ]"
                    :key="field"
                    >{{ label
                    }}<input
                      type="number"
                      :aria-label="label"
                      :value="length(s.object[field])"
                      :disabled="s.object.locked"
                      @change="value(field, $event)"
                  /></label>
                </div>
                <NumberRange
                  label="Rotation"
                  unit="°"
                  :min="-180"
                  :max="180"
                  :model-value="s.object.rotation"
                  @update:model-value="
                    s.change('rotation', $event)
                  " /></template
              ><button class="btn" @click="s.centerPage">
                Centrer sur la page
              </button>
              <p class="field-help">
                Maj + poignée : proportions conservées. Maj + rotation : pas de
                90°.
              </p>
            </details>
            <details v-if="s.object?.type === 'text'" name="design-inspector">
              <summary>Texte et typographie</summary>
              <button class="btn full" @click="s.editText()">
                <Type :size="15" />Éditer le texte</button
              ><label
                >Style<select
                  :value="s.object.style"
                  @change="s.applyStyle($event.target.value)"
                >
                  <option
                    v-for="(name, id) in styleNames"
                    :key="id"
                    :value="id"
                  >
                    {{ name }}
                  </option>
                </select></label
              >
              <div class="design-field-grid">
                <label
                  >Taille<input
                    type="number"
                    min="6"
                    max="300"
                    :value="s.object.size"
                    @change="value('size', $event)" /></label
                ><label
                  >Graisse<select
                    :value="s.object.weight"
                    @change="s.change('weight', Number($event.target.value))"
                  >
                    <option :value="400">Normal</option>
                    <option :value="700">Gras</option>
                  </select></label
                >
              </div>
              <label
                >Alignement<select
                  :value="s.object.align"
                  @change="s.change('align', $event.target.value)"
                >
                  <option value="left">Gauche</option>
                  <option value="center">Centré</option>
                  <option value="right">Droite</option>
                  <option value="justify">Justifié</option>
                </select></label
              ><NumberRange
                label="Interligne"
                :min="0.8"
                :max="3"
                :step="0.05"
                :model-value="s.object.leading"
                @update:model-value="s.change('leading', $event)"
              />
              <p v-if="overflow" class="design-warning">
                Le texte dépasse le bloc.
              </p>
              <button class="btn" @click="s.fitText">
                Ajuster la hauteur au texte
              </button>
            </details>
            <details name="design-inspector">
              <summary>Aspect et couleurs</summary>
              <label v-if="s.object?.type !== 'image'"
                >{{
                  s.object?.type === "text"
                    ? "Couleur du texte"
                    : "Remplissage"
                }}<input
                  type="color"
                  :value="s.object?.fill || '#70bba2'"
                  @change="s.change('fill', $event.target.value)"
              /></label>
              <div v-if="s.object?.type !== 'image'" class="design-swatches">
                <button
                  v-for="c in palette"
                  :key="c"
                  :style="{ background: c }"
                  :aria-label="'Couleur ' + c"
                  @click="s.change('fill', c)"
                />
              </div>
              <template v-if="s.object?.type === 'shape'"
                ><label class="checkbox-label"
                  ><input
                    type="checkbox"
                    :checked="s.object.filled"
                    @change="s.change('filled', $event.target.checked)"
                  />Remplissage</label
                ><label class="checkbox-label"
                  ><input
                    type="checkbox"
                    :checked="s.object.gradient"
                    @change="s.change('gradient', $event.target.checked)"
                  />Dégradé</label
                ><label v-if="s.object.gradient"
                  >Deuxième couleur<input
                    type="color"
                    :value="s.object.fill2"
                    @change="s.change('fill2', $event.target.value)" /></label
                ><label class="checkbox-label"
                  ><input
                    type="checkbox"
                    :checked="s.object.outlined"
                    @change="s.change('outlined', $event.target.checked)"
                  />Contour</label
                ><template v-if="s.object.outlined"
                  ><label
                    >Couleur du contour<input
                      type="color"
                      :value="s.object.stroke"
                      @change="
                        s.change('stroke', $event.target.value)
                      " /></label
                  ><NumberRange
                    label="Épaisseur"
                    unit="px"
                    :min="0.5"
                    :max="30"
                    :step="0.5"
                    :model-value="s.object.strokeWidth"
                    @update:model-value="s.change('strokeWidth', $event)"
                  /><label class="checkbox-label"
                    ><input
                      type="checkbox"
                      :checked="s.object.dashed"
                      @change="s.change('dashed', $event.target.checked)"
                    />Pointillés</label
                  ></template
                ><NumberRange
                  v-if="s.object.shape === 'rounded'"
                  label="Arrondi"
                  unit="%"
                  :max="50"
                  :model-value="s.object.radius"
                  @update:model-value="s.change('radius', $event)" /></template
              ><label v-if="s.object?.type === 'image'"
                >Cadrage<select
                  :value="s.object.fit"
                  @change="s.change('fit', $event.target.value)"
                >
                  <option value="contain">Image entière</option>
                  <option value="cover">Remplir</option>
                </select></label
              ><NumberRange
                label="Opacité"
                unit="%"
                :model-value="s.object?.opacity ?? 100"
                @update:model-value="s.change('opacity', $event)"
              />
            </details>
            <details v-if="s.object?.type === 'shape'" name="design-inspector">
              <summary>Image dans la forme</summary>
              <label class="btn design-file"
                ><ImagePlus :size="15" />{{
                  s.object.imageSrc
                    ? "Remplacer l’image"
                    : "Importer une image"
                }}<input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  @change="s.importFillImage" /></label
              ><template v-if="s.object.imageSrc"
                ><label
                  >Cadrage<select
                    :value="s.object.imageFit"
                    @change="s.change('imageFit', $event.target.value)"
                  >
                    <option value="cover">Remplir</option>
                    <option value="contain">Image entière</option>
                  </select></label
                ><button class="btn" @click="s.change('imageSrc', '')">
                  Retirer l’image
                </button></template
              >
              <p class="field-help">
                L’image suit la forme ; son contour reste indépendant.
              </p>
            </details>
            <details
              v-if="s.object?.shape === 'freeform'"
              name="design-inspector"
            >
              <summary>Points du tracé</summary>
              <button
                class="btn"
                @click="
                  s.nodeEditing = !s.nodeEditing;
                  s.nodeIndex = 0;
                "
              >
                {{
                  s.nodeEditing ? "Terminer l’édition" : "Éditer les points"
                }}</button
              ><label class="checkbox-label"
                ><input
                  type="checkbox"
                  :checked="s.object.closed"
                  @change="s.change('closed', $event.target.checked)"
                />Fermer le tracé</label
              >
              <div class="design-point-actions">
                <button class="btn" @click="s.addNode">Ajouter un point</button
                ><button
                  class="btn"
                  :disabled="s.nodeIndex < 0"
                  @click="s.deleteNode"
                >
                  Supprimer le point</button
                ><button
                  class="btn"
                  :disabled="s.nodeIndex < 0"
                  @click="s.curveNode(true)"
                >
                  Point courbe</button
                ><button
                  class="btn"
                  :disabled="s.nodeIndex < 0"
                  @click="s.curveNode(false)"
                >
                  Point anguleux
                </button>
              </div>
              <p class="field-help">
                Déplace les points et leurs poignées directement sur le dessin.
              </p>
            </details>
            <details name="design-inspector">
              <summary>Alignement et calques</summary>
              <div class="design-align-grid">
                <button
                  v-for="[id, label] in [
                    ['left', 'Gauche'],
                    ['center', 'Centre X'],
                    ['right', 'Droite'],
                    ['top', 'Haut'],
                    ['middle', 'Centre Y'],
                    ['bottom', 'Bas'],
                  ]"
                  :key="id"
                  class="btn"
                  :disabled="s.selected.length < 2"
                  @click="s.align(id)"
                >
                  {{ label }}
                </button>
              </div>
              <button
                class="btn"
                :disabled="s.selected.length < 3"
                @click="s.distribute('x')"
              >
                Répartir horizontalement</button
              ><button
                class="btn"
                :disabled="s.selected.length < 3"
                @click="s.distribute('y')"
              >
                Répartir verticalement
              </button>
              <div class="design-point-actions">
                <button class="btn" @click="s.order('front')">
                  <BringToFront :size="14" />Devant</button
                ><button class="btn" @click="s.order('back')">
                  <SendToBack :size="14" />Derrière</button
                ><button
                  class="btn"
                  :disabled="s.selected.length < 2"
                  @click="s.group"
                >
                  <Group :size="14" />Grouper</button
                ><button class="btn" @click="s.ungroup">
                  <Ungroup :size="14" />Dégrouper
                </button>
              </div>
            </details>
            <details
              v-if="s.selected.every((e) => e.type === 'shape')"
              name="design-inspector"
            >
              <summary>Combiner les formes</summary>
              <button
                class="btn"
                :disabled="s.selected.length !== 2"
                @click="s.boolean('subtract')"
              >
                <Scissors :size="14" />Soustraire la forme du dessus</button
              ><button
                class="btn"
                :disabled="s.selected.length !== 2"
                @click="s.boolean('intersect')"
              >
                Intersection</button
              ><button
                v-if="s.object?.cutouts?.length"
                class="btn"
                @click="s.change('cutouts', [])"
              >
                Séparer les formes
              </button>
              <p class="field-help">
                Découpe non destructive : les formes sources restent accessibles
                dans les calques.
              </p>
            </details></template
          >
        </div>
      </aside>
    </div>
    <div
      v-if="s.context && s.doc"
      class="design-context"
      role="menu"
      :style="{ left: s.context.x + 'px', top: s.context.y + 'px' }"
    >
      <button
        role="menuitem"
        @click="action(() => s.add('text', {}, s.context?.point))"
      >
        Ajouter un texte</button
      ><button
        role="menuitem"
        @click="
          action(() => s.add('shape', { shape: 'rect' }, s.context?.point))
        "
      >
        Ajouter un rectangle</button
      ><button
        role="menuitem"
        @click="
          action(() => s.add('shape', { shape: 'ellipse' }, s.context?.point))
        "
      >
        Ajouter une ellipse</button
      ><button role="menuitem" @click="action(choosePen)">
        Dessiner avec la plume</button
      ><template v-if="s.selected.length"
        ><hr />
        <button role="menuitem" @click="action(s.copy)">
          Copier <span>Ctrl C</span></button
        ><button role="menuitem" @click="action(s.duplicate)">
          Dupliquer <span>Ctrl D</span></button
        ><button role="menuitem" @click="action(s.group)">
          Grouper <span>Ctrl G</span></button
        ><button role="menuitem" @click="action(s.ungroup)">Dégrouper</button
        ><button role="menuitem" @click="action(s.deleteSelection)">
          Supprimer <span>Suppr</span>
        </button></template
      >
      <hr />
      <button role="menuitem" @click="action(s.paste)">
        Coller <span>Ctrl V</span>
      </button>
    </div>
    <div
      v-if="s.newDialog"
      class="modal-backdrop"
      @click.self="s.newDialog = false"
    >
      <form class="design-dialog" @submit.prevent="s.create()">
        <div class="design-dialog-heading">
          <div>
            <span class="eyebrow">{{ title }}</span>
            <h2>
              {{ s.isLayout ? "Un nouveau document" : "Un nouveau dessin" }}
            </h2>
          </div>
          <button
            class="icon-btn"
            type="button"
            aria-label="Fermer"
            @click="s.newDialog = false"
          >
            <X :size="19" />
          </button>
        </div>
        <label
          >Nom<input
            v-model="s.newName"
            aria-label="Nom du nouveau document"
            maxlength="100"
            :placeholder="s.isLayout ? 'Fiche de cours' : 'Mon illustration'"
        /></label>
        <div class="design-format-grid">
          <button
            v-for="(f, i) in formats"
            :key="f[0]"
            type="button"
            :class="{ active: s.newFormat === i }"
            @click="s.newFormat = i"
          >
            <span
              class="design-format-icon"
              :style="{ aspectRatio: f[1] + '/' + f[2] }"
            /><strong>{{ f[0] }}</strong
            ><small>{{ length(f[1]) }} × {{ length(f[2]) }} {{ unit }}</small>
          </button>
        </div>
        <p class="field-help">
          {{
            s.isLayout
              ? "Pages, marges et styles restent modifiables après la création."
              : "Le fond est transparent. Toutes les formes restent éditables."
          }}
        </p>
        <footer>
          <button class="btn" type="button" @click="s.newDialog = false">
            Annuler</button
          ><button class="btn primary" type="submit">
            <Plus :size="15" />Créer
          </button>
        </footer>
      </form>
    </div>
    <div
      v-if="s.textDialog"
      class="modal-backdrop"
      @click.self="s.textDialog = null"
    >
      <form
        class="design-dialog design-text-dialog"
        @submit.prevent="s.commitText"
      >
        <div class="design-dialog-heading">
          <h2>Modifier le texte</h2>
          <button
            class="icon-btn"
            type="button"
            aria-label="Fermer"
            @click="s.textDialog = null"
          >
            <X :size="18" />
          </button>
        </div>
        <textarea
          v-model="s.textDialog.value"
          aria-label="Texte de l’objet"
          rows="12"
          maxlength="50000"
          autofocus
        />
        <footer>
          <button class="btn" type="button" @click="s.textDialog = null">
            Annuler</button
          ><button class="btn primary" type="submit">Appliquer</button>
        </footer>
      </form>
    </div>
    <div
      v-if="s.flowDialog"
      class="modal-backdrop"
      @click.self="s.flowDialog = false"
    >
      <form class="design-dialog design-text-dialog" @submit.prevent="s.flow">
        <div class="design-dialog-heading">
          <div>
            <span class="eyebrow">TEXTE CONTINU</span>
            <h2>Répartir sur de nouvelles pages</h2>
          </div>
          <button
            class="icon-btn"
            type="button"
            aria-label="Fermer"
            @click="s.flowDialog = false"
          >
            <X :size="18" />
          </button>
        </div>
        <p>
          Le texte sera réparti selon les marges et colonnes du document, sans
          remplacer les pages existantes.
        </p>
        <label
          >Style<select v-model="s.flowStyle">
            <option v-for="(name, id) in styleNames" :key="id" :value="id">
              {{ name }}
            </option>
          </select></label
        ><textarea
          v-model="s.flowText"
          aria-label="Texte continu"
          rows="12"
          maxlength="150000"
          placeholder="Colle ton cours ou ton exercice ici…"
        />
        <footer>
          <button class="btn" type="button" @click="s.flowDialog = false">
            Annuler</button
          ><button
            class="btn primary"
            :disabled="!s.flowText.trim()"
            type="submit"
          >
            Créer les pages
          </button>
        </footer>
      </form>
    </div>
    <div v-if="s.pending" class="modal-backdrop" @click.self="s.pending = null">
      <section
        class="design-dialog design-confirm"
        role="alertdialog"
        aria-modal="true"
        :aria-label="s.pending.title"
      >
        <h2>{{ s.pending.title }}</h2>
        <p>{{ s.pending.detail }}</p>
        <footer>
          <button class="btn" @click="s.pending = null">Annuler</button
          ><button class="btn danger" @click="s.accept">Supprimer</button>
        </footer>
      </section>
    </div>
    <div v-if="s.notice" class="design-notice" role="status">
      <Check :size="16" />{{ s.notice }}
    </div>
  </div>
</template>
<style src="../designStudio.css"></style>
