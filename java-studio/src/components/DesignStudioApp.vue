<script setup>
import {
  reactive,
  provide,
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
  Palette,
  Ruler,
  Columns3,
  PanelTop,
  Pencil,
} from "lucide-vue-next";
import TransformFields from "./TransformFields.vue";
import SegmentedProportions from "./SegmentedProportions.vue";
import ThemeGallery from "./ThemeGallery.vue";
import { ensureAssets, localAssets } from "../localAssets.js";
import InspectorShell from "./InspectorShell.vue";
import InspectorDrawer from "./InspectorDrawer.vue";
import FloatingToolPalette from "./FloatingToolPalette.vue";
import DesignExportDialog from "./DesignExportDialog.vue";
import {
  defaultThemeId,
  saveDefaultTheme,
  loadThemeLibrary,
} from "../themeLibrary.js";
import { themeColors } from "../themes.js";
import GroupLayoutControls from "./GroupLayoutControls.vue";
import FontSelect from "./FontSelect.vue";
import FontWeightSelect from "./FontWeightSelect.vue";
import TextAlignment from "./TextAlignment.vue";
import TextSpacing from "./TextSpacing.vue";
import PlacementControls from "./PlacementControls.vue";
import PaletteColor from "./PaletteColor.vue";
import ShapeProperties from "./ShapeProperties.vue";
import { designColumns, designRows } from "../designModel.js";
import "../fontAssets.js";
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
  tab = ref("object");
const drawers = reactive({ "design-0": true });
provide("inspectorDrawers", drawers);
const exportOpen = ref(false),
  leftWidth = ref(220),
  themes = ref(loadThemeLibrary(window.localStorage)),
  themesView = ref(false);
const themeId = computed(() =>
  s.doc?.themeId && themes.value.some((t) => t.id === s.doc.themeId)
    ? s.doc.themeId
    : defaultThemeId(window.localStorage, themes.value),
);
function chooseTheme(id) {
  if (s.doc) s.changeDoc("themeId", id);
  saveDefaultTheme(window.localStorage, id);
}
function refreshThemes() {
  themes.value = loadThemeLibrary(window.localStorage, localAssets.themes);
}
onMounted(() => {
  ensureAssets()
    .then(refreshThemes)
    .catch(() => {});
});
watch(() => localAssets.version, refreshThemes);
function documentTab() {
  tab.value = "document";
  s.settings = true;
  for (const key in drawers) drawers[key] = false;
  drawers["design-0"] = true;
}
function resizeSidebar(e) {
  e.preventDefault();
  const x = e.clientX,
    w = leftWidth.value;
  const move = (ev) =>
    (leftWidth.value = Math.min(400, Math.max(170, w + ev.clientX - x)));
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
}

const title = props.kind === "layout" ? "Mise en page" : "Vectoriel",
  baseStyleNames = {
    title: "Titre",
    heading: "Sous-titre",
    body: "Paragraphe",
    caption: "Légende",
    code: "Code",
  },
  formats = designFormats[props.kind];
const styleNames = computed(() =>
  Object.fromEntries(
    Object.entries(s.doc?.styles || {}).map(([id, style]) => [
      id,
      style.name || baseStyleNames[id] || id,
    ]),
  ),
);
const fontVersion = ref(0);
const fontsReady = () => fontVersion.value++;
onMounted(() => {
  document.fonts.addEventListener("loadingdone", fontsReady);
  document.fonts.ready.then(fontsReady);
});
onBeforeUnmount(() =>
  document.fonts.removeEventListener("loadingdone", fontsReady),
);
watch(
  () => s.selection.join(","),
  (ids) => {
    if (ids) {
      tab.value = "object";
      s.settings = false;
    }
  },
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
          width: (s.pageSize.width * s.zoom) / 100 + "px",
          height: (s.pageSize.height * s.zoom) / 100 + "px",
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
const spacing = ref(24);
const groupAdapter = reactive({
  get spacing() {
    return spacing.value;
  },
  set spacing(v) {
    spacing.value = v;
  },
  get canUngroup() {
    return s.selected.some((e) => e.group);
  },
  centerObjects(axis) {
    s.place(axis === "x" ? "center" : null, axis === "y" ? "center" : null);
  },
  arrangeObjects(axis, mode) {
    s.arrange(axis, mode, spacing.value);
  },
  groupObjects() {
    s.group();
  },
  ungroupObjects() {
    s.ungroup();
  },
  copySelection() {
    s.copy();
  },
});
const activeTheme = computed(
  () => themes.value.find((t) => t.id === themeId.value) || themes.value[0],
);
const objectProxy = new Proxy(
  {},
  {
    get: (_, k) => s.object?.[k],
    set: (_, k, v) => {
      if (s.object) {
        if (k === "fillRole" || k === "strokeRole") {
          const field = k.replace("Role", ""),
            c = themeColors(activeTheme.value).find((c) => c.id === v);
          if (c) s.change(field, c.color);
        } else s.change(k, v);
      }
      return true;
    },
  },
);
const newPageOpen = ref(false),
  newOrientation = ref("portrait"),
  styleName = ref(""),
  editStyle = ref(false),
  rightWidth = ref(300);
const rowGuides = computed(() => (s.doc ? designRows(s.doc, s.pageIndex) : []));
const columns = computed(() =>
  s.doc ? designColumns(s.doc, s.pageIndex) : [],
);
function createStyle() {
  const name = styleName.value.trim();
  if (!name || !s.object) return;
  const id = "style-" + crypto.randomUUID();
  s.edit(() => {
    s.doc.styles[id] = {
      name,
      font: s.object.font,
      size: s.object.size,
      weight: s.object.weight,
      leading: s.object.leading,
    };
    s.object.style = id;
  });
  styleName.value = "";
}
function resizeProperties(e) {
  e.preventDefault();
  const x = e.clientX,
    w = rightWidth.value;
  const move = (ev) =>
    (rightWidth.value = Math.min(520, Math.max(250, w + x - ev.clientX)));
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end, { once: true });
}
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
function tableCell(row, col, value) {
  const cells = s.object.text.split("\n").map((line) => line.split("\t"));
  while (cells.length <= row) cells.push([]);
  while (cells[row].length <= col) cells[row].push("");
  cells[row][col] = value.replace(/[\t\n]/g, " ");
  s.change("text", cells.map((line) => line.join("\t")).join("\n"));
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
      s.page.width = f[1];
      s.page.height = f[2];
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
    <WorkspaceHeader
      :title="title"
      @back="emit('home')"
      :theme-action="() => (themesView = true)"
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
          <button @click="exportOpen = true">Exporter…</button
          ><button v-if="s.isLayout" @click="s.pdf">
            Exporter le document en PDF…
          </button></template
        ></template
      ><template #view
        ><button @click="themesView = true">Thèmes</button></template
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
            @click="exportOpen = true"
          >
            <Download :size="15" />{{ "Exporter" }}
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
    <section v-else-if="themesView" class="theme-page design-theme-page">
      <div class="design-theme-heading">
        <div>
          <h2>Une identité. Toutes tes créations.</h2>
          <p>
            Choisis le thème de ce document. Ses couleurs seront disponibles
            dans les propriétés.
          </p>
        </div>
        <button class="btn" @click="themesView = false">
          <ArrowLeft :size="15" />Retour à
          {{ s.isLayout ? "la mise en page" : "Vectoriel" }}
        </button>
      </div>
      <ThemeGallery
        :themes="themes"
        :selected="themeId"
        @select="chooseTheme"
      />
    </section>
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
    <div
      v-else
      class="design-workbench"
      :style="{
        '--design-left-width': leftWidth + 'px',
        '--design-right-width': rightWidth + 'px',
      }"
    >
      <aside class="design-left">
        <div class="design-left-heading">
          <strong>{{ s.isLayout ? "Pages" : "Plans de travail" }}</strong
          ><button
            class="icon-btn"
            :aria-label="
              s.isLayout ? 'Ajouter une page' : 'Ajouter un plan de travail'
            "
            @click="newPageOpen = true"
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
            @dblclick="documentTab"
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
          ><button class="text-action" @click="documentTab">
            <Settings2 :size="14" />Document
          </button>
        </div>
        <div
          class="design-sidebar-resize"
          role="separator"
          aria-label="Largeur des plans de travail"
          aria-orientation="vertical"
          tabindex="0"
          @pointerdown="resizeSidebar"
          @keydown.left.prevent="leftWidth = Math.max(170, leftWidth - 20)"
          @keydown.right.prevent="leftWidth = Math.min(400, leftWidth + 20)"
        />
      </aside>
      <section class="design-center">
        <FloatingToolPalette :application="'design-' + kind">
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
          <details v-if="s.selected.length" class="design-shape-menu">
            <summary class="icon-btn" title="Combiner les formes">
              <Scissors :size="18" />
            </summary>
            <div>
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
            </div>
          </details>
        </FloatingToolPalette>
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
                >{{ Math.round(s.pageSize.width) }} ×
                {{ Math.round(s.pageSize.height) }} px</small
              >
            </div>
            <div class="design-sheet-frame">
              <div
                v-if="s.guides"
                class="design-ruler-horizontal"
                :style="{ width: size.width }"
              >
                <span
                  v-for="n in Math.floor(
                    s.pageSize.width / (s.isLayout ? (96 / 25.4) * 10 : 100),
                  ) + 1"
                  :key="n"
                  :style="{
                    left:
                      ((n - 1) *
                        (s.isLayout ? (96 / 25.4) * 10 : 100) *
                        s.zoom) /
                        100 +
                      'px',
                  }"
                  >{{ (n - 1) * (s.isLayout ? 10 : 100) }}</span
                ><small>{{ unit }}</small>
              </div>
              <div
                v-if="s.guides"
                class="design-ruler-vertical"
                :style="{ height: size.height }"
              >
                <span
                  v-for="n in Math.floor(
                    s.pageSize.height / (s.isLayout ? (96 / 25.4) * 10 : 100),
                  ) + 1"
                  :key="n"
                  :style="{
                    top:
                      ((n - 1) *
                        (s.isLayout ? (96 / 25.4) * 10 : 100) *
                        s.zoom) /
                        100 +
                      'px',
                  }"
                  >{{ (n - 1) * (s.isLayout ? 10 : 100) }}</span
                >
              </div>
              <svg
                :ref="(el) => (s.stage = el)"
                class="design-paper"
                :class="{
                  checker: s.doc.transparent,
                  'pen-mode': s.tool === 'pen',
                }"
                :viewBox="`0 0 ${s.pageSize.width} ${s.pageSize.height}`"
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
                    :width="s.pageSize.width - 2 * s.doc.margin"
                    :height="s.pageSize.height - 2 * s.doc.margin"
                  />
                  <template v-for="(column, i) in columns" :key="i">
                    <line
                      :x1="column.x"
                      :x2="column.x"
                      :y1="s.doc.margin"
                      :y2="s.pageSize.height - s.doc.margin"
                    />
                    <line
                      :x1="column.x + column.w"
                      :x2="column.x + column.w"
                      :y1="s.doc.margin"
                      :y2="s.pageSize.height - s.doc.margin"
                    />
                  </template>
                  <template v-for="(row, i) in rowGuides" :key="'row-' + i">
                    <line
                      data-row-guide
                      :x1="s.doc.margin"
                      :x2="s.pageSize.width - s.doc.margin"
                      :y1="row.y"
                      :y2="row.y"
                    />
                    <line
                      data-row-guide
                      :x1="s.doc.margin"
                      :x2="s.pageSize.width - s.doc.margin"
                      :y1="row.y + row.h"
                      :y2="row.y + row.h"
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
                      :x="
                        x - handleSize * (['n', 's'].includes(handle) ? 1.5 : 1)
                      "
                      :y="
                        y - handleSize * (['e', 'w'].includes(handle) ? 1.5 : 1)
                      "
                      :width="
                        handleSize * (['n', 's'].includes(handle) ? 3 : 2)
                      "
                      :height="
                        handleSize * (['e', 'w'].includes(handle) ? 3 : 2)
                      "
                      :rx="(2 * 100) / s.zoom"
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
        </div>
        <footer class="design-bottom">
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
      <InspectorShell
        class="design-inspector"
        :tabs="[
          ['object', 'Objet', MousePointer2],
          ['document', s.isLayout ? 'Document' : 'Plan', FileText],
          ['layers', 'Calques', Layers],
        ]"
        :active="tab"
        :count="s.selection.length"
        body-class="design-inspector-body"
        :body-visible="tab !== 'layers'"
        @resize="resizeProperties"
        @select="
          (value) => {
            tab = value;
            if (value === 'document') documentTab();
            else s.settings = false;
          }
        "
        ><template #context>
          <div v-show="tab === 'layers'" class="design-layers-panel">
            <div class="design-left-heading design-layers-heading">
              <strong><Layers :size="14" />Calques</strong
              ><small>{{ s.page.elements.length }}</small>
            </div>
            <div class="design-layer-list">
              <div
                v-for="e in [...s.page.elements].reverse()"
                :key="e.id"
                class="design-layer"
                :class="{
                  active: s.selection.includes(e.id),
                  hidden: e.hidden,
                }"
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
                  /><PenTool
                    v-else-if="e.shape === 'freeform'"
                    :size="14"
                  /><Square v-else :size="14" /><span>{{ e.name }}</span
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
                  <Lock v-if="e.locked" :size="13" /><LockOpen
                    v-else
                    :size="13"
                  />
                </button>
              </div>
              <p v-if="!s.page.elements.length" class="design-empty-layer">
                Ajoute un texte, une forme ou une image pour commencer.
              </p>
            </div>
          </div>

          <div
            v-show="
              tab !== 'layers' && (tab === 'document' || s.selection.length)
            "
            class="design-inspector-heading"
          >
            <strong>{{
              tab === "document"
                ? "Document"
                : s.object
                  ? s.object.name
                  : s.selection.length + " objets"
            }}</strong
            ><button
              v-if="s.selection.length"
              class="icon-btn"
              aria-label="Propriétés du document"
              @click="documentTab"
            >
              <Settings2 :size="16" />
            </button>
          </div>
        </template>
        <template v-if="tab === 'document'"
          ><InspectorDrawer
            id="design-0"
            title="Format et page"
            :icon="Settings2"
          >
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
                  :value="length(s.pageSize.width)"
                  @change="docNumber('width', $event)" /></label
              ><label
                >Hauteur · {{ unit
                }}<input
                  type="number"
                  aria-label="Hauteur du document"
                  :min="length(128)"
                  :max="length(8192)"
                  :value="length(s.pageSize.height)"
                  @change="docNumber('height', $event)"
              /></label>
            </div>
            <label v-if="!s.isLayout" class="checkbox-label"
              ><input
                type="checkbox"
                :checked="s.doc.transparent"
                @change="s.changeDoc('transparent', $event.target.checked)"
              />Fond transparent</label
            >
            <PaletteColor
              :element="s.page"
              field="background"
              label="Couleur de la page"
              :theme="activeTheme"
              controlled
              @change="(v) => s.edit(() => (s.page.background = v))"
            />
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.isLayout"
            id="design-1"
            title="Marges et grille"
            :icon="Columns3"
          >
            <NumberRange
              label="Marges"
              :unit="unit"
              :min="0"
              :max="180 * factor"
              :step="0.1"
              :model-value="s.doc.margin * factor"
              @update:model-value="s.changeDoc('margin', $event / factor)"
            />
            <template v-for="axis in ['columns', 'rows']" :key="axis">
              <label
                >{{ axis === "columns" ? "Colonnes" : "Lignes"
                }}<select
                  :aria-label="
                    axis === 'columns'
                      ? 'Nombre de colonnes'
                      : 'Nombre de lignes'
                  "
                  :value="s.doc[axis]"
                  @change="s.changeDoc(axis, Number($event.target.value))"
                >
                  <option v-for="n in 8" :key="n" :value="n">{{ n }}</option>
                </select></label
              >
              <SegmentedProportions
                v-if="s.doc[axis] > 1"
                :label="axis === 'columns' ? 'Colonne' : 'Ligne'"
                :model-value="
                  s.doc[axis === 'columns' ? 'columnWeights' : 'rowWeights']
                "
                :vertical="axis === 'rows'"
                @update:model-value="
                  s.changeDoc(
                    axis === 'columns' ? 'columnWeights' : 'rowWeights',
                    $event,
                  )
                "
              />
              <NumberRange
                v-if="s.doc[axis] > 1"
                :label="
                  axis === 'columns'
                    ? 'Gouttière des colonnes'
                    : 'Gouttière des lignes'
                "
                :unit="unit"
                :min="0"
                :max="120 * factor"
                :step="0.1"
                :model-value="
                  s.doc[axis === 'columns' ? 'gutter' : 'rowGutter'] * factor
                "
                @update:model-value="
                  s.changeDoc(
                    axis === 'columns' ? 'gutter' : 'rowGutter',
                    $event / factor,
                  )
                "
              />
            </template>
            <p class="field-help">
              Les repères de lignes et colonnes aimantent les objets sans
              apparaître à l’export. Le texte continu suit les marges et
              colonnes lors de sa répartition.
            </p>
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.isLayout"
            id="design-2"
            title="En-tête et pagination"
            :icon="PanelTop"
          >
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
          </InspectorDrawer>
        </template>
        <p
          v-else-if="!s.selection.length"
          class="field-help design-empty-object"
        >
          Sélectionne un objet pour le personnaliser.
        </p>
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
                s.edit(() => s.selected.forEach((e) => (e.locked = !e.locked)))
              "
            >
              <Lock :size="15" />
            </button>
          </div>
          <InspectorDrawer
            id="design-4"
            title="Position et dimensions"
            :icon="Square"
          >
            <label v-if="s.object"
              >Nom<input
                :value="s.object.name"
                maxlength="100"
                @change="s.change('name', $event.target.value)"
            /></label>
            <TransformFields
              v-if="s.object"
              :value="{
                x: length(s.object.x),
                y: length(s.object.y),
                w: length(s.object.w),
                h: length(s.object.h),
                rotation: s.object.rotation,
              }"
              :unit="unit"
              :disabled="s.object.locked"
              @change="value"
            />
            <button class="btn" @click="s.centerPage">
              Centrer sur la page
            </button>
            <p class="field-help">
              Maj + poignée : proportions conservées. Maj + rotation : pas de
              45°.
            </p>
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.object?.type === 'text'"
            id="design-5"
            title="Texte et typographie"
            :icon="Type"
          >
            <button class="btn full" @click="s.editText()">
              <Type :size="15" />Éditer le texte</button
            ><label
              >Style<select
                :value="s.object.style"
                @change="s.applyStyle($event.target.value)"
              >
                <option v-for="(name, id) in styleNames" :key="id" :value="id">
                  {{ name }}
                </option>
              </select></label
            >
            <FontSelect
              :model-value="s.object.font"
              :type="s.object.code ? 'code' : 'text'"
              @update:model-value="s.change('font', $event)"
            />
            <NumberRange
              label="Taille du texte"
              unit="px"
              :min="6"
              :max="300"
              :model-value="s.object.size"
              @update:model-value="s.change('size', $event)"
            />
            <FontWeightSelect
              :model-value="s.object.weight"
              :font="s.object.font"
              :type="s.object.code ? 'code' : 'text'"
              @update:model-value="s.change('weight', $event)"
            />
            <TextAlignment
              :value="s.object.align"
              @change="s.change('align', $event)"
            />
            <TextSpacing
              :value="{
                lineHeight: s.object.leading,
                letterSpacing: s.object.letterSpacing,
              }"
              @change="
                (field, v) =>
                  s.change(
                    field === 'lineHeight' ? 'leading' : field,
                    v ?? 1.55,
                  )
              "
            />
            <div class="design-linked-style">
              <button class="btn" @click="editStyle = !editStyle">
                <Pencil :size="14" />Modifier le style «
                {{ styleNames[s.object.style] }} »</button
              ><template v-if="editStyle"
                ><p class="field-help">
                  Ces réglages s’appliquent à tous les textes utilisant ce
                  style.
                </p>
                <label
                  >Nom du style<input
                    :value="styleNames[s.object.style]"
                    @change="
                      s.changeStyle(s.object.style, 'name', $event.target.value)
                    " /></label
                ><FontSelect
                  :model-value="s.doc.styles[s.object.style]?.font"
                  @update:model-value="
                    s.changeStyle(s.object.style, 'font', $event)
                  " /><FontWeightSelect
                  :model-value="s.doc.styles[s.object.style]?.weight"
                  :font="s.doc.styles[s.object.style]?.font"
                  @update:model-value="
                    s.changeStyle(s.object.style, 'weight', $event)
                  " /><NumberRange
                  label="Taille du style"
                  :min="6"
                  :max="300"
                  :model-value="s.doc.styles[s.object.style]?.size || 17"
                  @update:model-value="
                    s.changeStyle(s.object.style, 'size', $event)
                  " /></template
              ><label
                >Nouveau style<input
                  v-model="styleName"
                  maxlength="80"
                  placeholder="Nom du style" /></label
              ><button
                class="btn"
                :disabled="!styleName.trim()"
                @click="createStyle"
              >
                Créer depuis ce texte
              </button>
            </div>
            <p v-if="overflow" class="design-warning">
              Le texte dépasse le bloc.
            </p>
            <button class="btn" @click="s.fitText">
              Ajuster la hauteur au texte
            </button>
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.object?.code"
            id="design-6"
            title="Bloc de code"
            :icon="Square"
            ><label
              >Langage<select
                aria-label="Langage"
                :value="s.object.language"
                @change="s.change('language', $event.target.value)"
              >
                <option
                  v-for="lang in [
                    'java',
                    'javascript',
                    'typescript',
                    'python',
                    'cpp',
                    'json',
                    'sql',
                    'bash',
                    'plaintext',
                  ]"
                  :key="lang"
                >
                  {{ lang }}
                </option>
              </select></label
            ><label
              >Fond du code<input
                type="color"
                :value="s.object.codeBackground"
                @change="
                  s.change('codeBackground', $event.target.value)
                " /></label
          ></InspectorDrawer>
          <InspectorDrawer
            v-if="s.object?.type === 'table'"
            id="design-7"
            title="Tableau"
            :icon="Square"
            ><label
              >Lignes<input
                type="number"
                min="1"
                max="30"
                :value="s.object.rows"
                @change="
                  s.change(
                    'rows',
                    Math.max(1, Math.min(30, Number($event.target.value))),
                  )
                " /></label
            ><label
              >Colonnes<input
                type="number"
                min="1"
                max="12"
                :value="s.object.columns"
                @change="
                  s.change(
                    'columns',
                    Math.max(1, Math.min(12, Number($event.target.value))),
                  )
                " /></label
            ><label class="checkbox-label"
              ><input
                type="checkbox"
                :checked="s.object.outlined"
                @change="s.change('outlined', $event.target.checked)"
              />Afficher la grille</label
            ><label class="checkbox-label"
              ><input
                type="checkbox"
                :checked="s.object.filled"
                @change="s.change('filled', $event.target.checked)"
              />Fond des cellules</label
            ><label
              >Couleur de grille<input
                type="color"
                :value="s.object.stroke"
                @change="s.change('stroke', $event.target.value)"
            /></label>
            <label
              >Couleur du texte<input
                type="color"
                :value="s.object.cellColor"
                @change="s.change('cellColor', $event.target.value)"
            /></label>
            <NumberRange
              label="Taille du texte"
              :min="6"
              :max="80"
              unit="px"
              :model-value="s.object.size"
              @update:model-value="s.change('size', $event)" />
            <div
              class="design-table-editor"
              :style="{
                gridTemplateColumns:
                  'repeat(' + s.object.columns + ',minmax(80px,1fr))',
              }"
            >
              <template v-for="row in s.object.rows" :key="row"
                ><input
                  v-for="col in s.object.columns"
                  :key="col"
                  :aria-label="'Cellule ' + row + ', ' + col"
                  :value="
                    s.object.text.split('\n')[row - 1]?.split('\t')[col - 1] ||
                    ''
                  "
                  @change="tableCell(row - 1, col - 1, $event.target.value)"
              /></template></div
          ></InspectorDrawer>
          <InspectorDrawer
            id="design-8"
            title="Aspect et couleurs"
            :icon="Palette"
          >
            <template v-if="s.object?.type === 'shape'"
              ><ShapeProperties
                :shape="objectProxy"
                :scale="1"
                :theme="activeTheme"
                mode="style" /><ShapeProperties
                :shape="objectProxy"
                :scale="1"
                :theme="activeTheme"
                mode="colors"
            /></template>
            <PaletteColor
              v-else-if="s.object?.type === 'text'"
              :element="s.object"
              field="fill"
              label="Couleur du texte"
              :theme="activeTheme"
              controlled
              @change="(v) => s.change('fill', v)"
            />
            <label v-if="s.object?.type === 'image'"
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
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.object?.type === 'shape'"
            id="design-9"
            title="Image dans la forme"
            :icon="Square"
          >
            <label class="btn design-file"
              ><ImagePlus :size="15" />{{
                s.object.imageSrc ? "Remplacer l’image" : "Importer une image"
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
          </InspectorDrawer>
          <InspectorDrawer
            v-if="s.object?.shape === 'freeform'"
            id="design-10"
            title="Points du tracé"
            :icon="Square"
          >
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
          </InspectorDrawer>
          <InspectorDrawer
            id="design-11"
            title="Placement et superposition"
            :icon="Square"
          >
            <PlacementControls @place="s.place" /><GroupLayoutControls
              v-if="s.selected.length > 1"
              :studio="groupAdapter"
            />
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
          </InspectorDrawer>
        </template>
      </InspectorShell>
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
      ><button
        role="menuitem"
        @click="
          action(() =>
            s.add(
              'text',
              {
                style: 'code',
                code: true,
                font: 'monospace',
                name: 'Code',
                text: 'int valeur = 42;',
                w: 420,
                h: 180,
              },
              s.context?.point,
            ),
          )
        "
      >
        Ajouter un bloc de code
      </button>
      <button
        v-if="s.isLayout"
        role="menuitem"
        @click="action(() => (s.flowDialog = true))"
      >
        Répartir un texte sur des pages…
      </button>
      <button
        role="menuitem"
        @click="
          action(() =>
            s.add(
              'table',
              {
                name: 'Tableau',
                w: 420,
                h: 200,
                fill: '#ffffff',
                outlined: true,
                text: 'Titre 1\tTitre 2\tTitre 3\nTexte\tTexte\tTexte',
              },
              s.context?.point,
            ),
          )
        "
      >
        Ajouter un tableau
      </button>
      <button role="menuitem" @click="action(choosePen)">
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
      v-if="newPageOpen"
      class="modal-backdrop"
      @click.self="newPageOpen = false"
    >
      <form
        class="design-dialog"
        @submit.prevent="
          s.addPage(false, newOrientation);
          newPageOpen = false;
        "
      >
        <h2>{{ s.isLayout ? "Nouvelle page" : "Nouveau plan de travail" }}</h2>
        <label
          >Orientation<select
            v-model="newOrientation"
            aria-label="Orientation de la nouvelle page"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Paysage</option>
          </select></label
        >
        <footer>
          <button class="btn" type="button" @click="newPageOpen = false">
            Annuler</button
          ><button class="btn primary">Créer la page</button>
        </footer>
      </form>
    </div>
    <DesignExportDialog
      v-if="exportOpen && s.doc"
      :document="s.doc"
      :page-index="s.pageIndex"
      :selection="s.selection"
      @close="exportOpen = false"
      @pdf="s.pdf"
    />
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
