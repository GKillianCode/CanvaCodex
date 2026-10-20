<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  Search,
  LocateFixed,
  Plus,
  Minus,
  ArrowLeft,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-vue-next";
import {
  noteGraph,
  layoutFocusedNotes,
  graphNoteLabel,
  noteGraphLevel,
  previewNoteLevel,
} from "../freeNotesGraph.js";
const props = defineProps({ tree: Array, activeId: String });
const emit = defineEmits(["open"]);
const navigating = ref(false),
  filters = ref(null);
let navigationTimer;
const query = ref(""),
  parents = ref(true),
  level = ref(""),
  orphans = ref(true),
  hover = ref(""),
  svg = ref(null),
  points = ref([]),
  width = ref(1000),
  height = ref(650),
  camera = ref({ x: 500, y: 325, z: 1 });
const levelNotes = computed(() => noteGraphLevel(props.tree, level.value));
const graph = computed(() => noteGraph(levelNotes.value, parents.value));
const branches = computed(
  () =>
    new Set(
      props.tree
        .filter((row) => row.kind === "note" && row.parent)
        .map((row) => row.parent),
    ),
);
const canExplore = (id) => branches.value.has(id);
const focused = computed(() =>
  props.tree.find((row) => row.id === level.value),
);
const breadcrumb = computed(() => {
  const result = [],
    seen = new Set();
  let row = focused.value;
  while (row && !seen.has(row.id)) {
    seen.add(row.id);
    result.unshift(row);
    row = props.tree.find((parent) => parent.id === row.parent);
  }
  return result;
});
function enterLevel(id) {
  if (id === level.value || (id && !canExplore(id))) return;
  navigating.value = true;
  clearTimeout(navigationTimer);
  navigationTimer = setTimeout(() => (navigating.value = false), 480);
  level.value = id;
  query.value = "";
  hover.value = "";
}
watch(
  () => props.tree,
  () => {
    if (level.value && !props.tree.some((row) => row.id === level.value))
      enterLevel("");
  },
);
const fold = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const visible = computed(() =>
  points.value.filter(
    (node) =>
      (orphans.value || node.degree || node.id === level.value) &&
      fold(node.title).includes(fold(query.value)),
  ),
);
const preview = computed(() => previewNoteLevel(props.tree, visible.value));
const ids = computed(() => new Set(visible.value.map((node) => node.id)));
const byId = computed(
  () => new Map(points.value.map((node) => [node.id, node])),
);
const edges = computed(() =>
  graph.value.edges.filter(
    (edge) => ids.value.has(edge.source) && ids.value.has(edge.target),
  ),
);
const neighbors = computed(() => {
  const result = new Set([hover.value]);
  for (const edge of edges.value)
    if (edge.source === hover.value || edge.target === hover.value) {
      result.add(edge.source);
      result.add(edge.target);
    }
  return result;
});
function fit() {
  const nodes = [...visible.value, ...preview.value];
  if (!nodes.length) return;
  const xs = nodes.map((n) => n.x),
    ys = nodes.map((n) => n.y),
    left = Math.min(...xs) - 100,
    right = Math.max(...xs) + 100,
    top = Math.min(...ys) - 70,
    bottom = Math.max(...ys) + 70;
  const z = Math.max(
    0.03,
    Math.min(1.25, width.value / (right - left), height.value / (bottom - top)),
  );
  camera.value = {
    x: width.value / 2 - ((left + right) / 2) * z,
    y: height.value / 2 - ((top + bottom) / 2) * z,
    z,
  };
}
watch(
  graph,
  () => {
    points.value = layoutFocusedNotes(graph.value, level.value);
    nextTick(fit);
  },
  { immediate: true },
);
function zoom(factor, x = width.value / 2, y = height.value / 2) {
  const old = camera.value,
    z = Math.max(0.03, Math.min(5, old.z * factor));
  camera.value = {
    x: x - ((x - old.x) * z) / old.z,
    y: y - ((y - old.y) * z) / old.z,
    z,
  };
}
function wheel(event) {
  const rect = svg.value.getBoundingClientRect();
  zoom(
    Math.exp(-event.deltaY * 0.0015),
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
}
let gesture = null,
  observer;
function down(event, node) {
  navigating.value = false;
  if (event.button !== 0 && event.button !== 1) return;
  event.preventDefault();
  svg.value.focus();
  svg.value.setPointerCapture(event.pointerId);
  gesture = {
    id: event.pointerId,
    node,
    x: event.clientX,
    y: event.clientY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
}
function move(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x,
    dy = event.clientY - gesture.y;
  gesture.moved ||=
    Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >
    4;
  if (gesture.node) {
    gesture.node.x += dx / camera.value.z;
    gesture.node.y += dy / camera.value.z;
  } else {
    camera.value.x += dx;
    camera.value.y += dy;
  }
  gesture.x = event.clientX;
  gesture.y = event.clientY;
}
function up(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const { node, moved } = gesture;
  gesture = null;
  if (node && !moved && canExplore(node.id)) enterLevel(node.id);
}
function closeFilters(event) {
  if (filters.value && !filters.value.contains(event.target))
    filters.value.open = false;
}
onMounted(() => {
  window.addEventListener("pointerdown", closeFilters);
  observer = new ResizeObserver((entries) => {
    width.value = entries[0].contentRect.width;
    height.value = entries[0].contentRect.height;
    fit();
  });
  observer.observe(svg.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(navigationTimer);
  window.removeEventListener("pointerdown", closeFilters);
});
</script>
<template>
  <section
    class="free-notes-graph notes-explorer"
    :class="{ 'is-navigating': navigating }"
    aria-label="Réseau de notes"
  >
    <div class="notes-explorer-toolbar">
      <button
        class="icon-btn"
        :disabled="!level"
        title="Revenir au niveau précédent"
        aria-label="Niveau précédent"
        @click="enterLevel(focused?.parent || '')"
      >
        <ArrowLeft :size="18" />
      </button>
      <nav class="notes-explorer-breadcrumb" aria-label="Niveau du réseau">
        <button
          @click="enterLevel('')"
          :aria-current="!level ? 'page' : undefined"
        >
          Racine
        </button>
        <template v-for="row in breadcrumb" :key="row.id"
          ><ChevronRight :size="12" /><button
            @click="enterLevel(row.id)"
            :title="row.title"
            :aria-current="row.id === level ? 'page' : undefined"
          >
            {{ row.title }}
          </button></template
        >
      </nav>
      <label class="notes-graph-search"
        ><Search :size="15" /><input
          v-model="query"
          placeholder="Rechercher à ce niveau…"
          aria-label="Rechercher dans la carte"
      /></label>
      <details
        ref="filters"
        class="notes-explorer-filters"
        @keydown.esc="filters.open = false"
      >
        <summary
          class="icon-btn"
          title="Options d’affichage"
          aria-label="Options d’affichage"
        >
          <SlidersHorizontal :size="17" />
        </summary>
        <div>
          <label><input v-model="orphans" type="checkbox" />Notes isolées</label
          ><label
            ><input v-model="parents" type="checkbox" />Relations
            parent/enfant</label
          >
        </div>
      </details>
      <button
        v-if="focused"
        class="btn notes-explorer-open"
        @click="emit('open', focused.id)"
      >
        Ouvrir la note<ArrowUpRight :size="15" />
      </button>
    </div>
    <svg
      ref="svg"
      class="notes-graph-stage"
      tabindex="0"
      role="group"
      aria-label="Graphe interactif : déplacer pour naviguer, molette pour zoomer"
      @wheel.prevent="wheel"
      @pointerdown="down($event, null)"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="gesture = null"
      @lostpointercapture="gesture = null"
      @keydown.plus.prevent="zoom(1.2)"
      @keydown.minus.prevent="zoom(1 / 1.2)"
      @keydown.escape="hover = ''"
    >
      <g
        class="notes-graph-camera"
        :transform="`translate(${camera.x} ${camera.y}) scale(${camera.z})`"
      >
        <circle v-if="level" class="notes-explorer-focus-glow" r="95" />
        <g class="notes-explorer-preview" aria-hidden="true">
          <line
            v-for="node in preview"
            :key="'preview-edge-' + node.id"
            :x1="byId.get(node.parent).x"
            :y1="byId.get(node.parent).y"
            :x2="node.x"
            :y2="node.y"
          />
          <g
            v-for="node in preview"
            :key="node.id"
            :transform="`translate(${node.x} ${node.y})`"
          >
            <circle :r="Math.max(3, 2.5 / camera.z)" />
            <text
              v-if="camera.z >= 0.4"
              y="18"
              text-anchor="middle"
              :style="{
                fontSize: graphNoteLabel(node.title, camera.z).size + 'px',
              }"
            >
              {{ graphNoteLabel(node.title, camera.z).text }}
            </text>
          </g>
        </g>
        <line
          v-for="edge in edges"
          :key="edge.key"
          :x1="byId.get(edge.source).x"
          :y1="byId.get(edge.source).y"
          :x2="byId.get(edge.target).x"
          :y2="byId.get(edge.target).y"
          class="notes-graph-edge"
          :class="{
            parent: edge.kind === 'parent',
            highlighted:
              hover && (edge.source === hover || edge.target === hover),
            dimmed: hover && !neighbors.has(edge.source),
          }"
        />
        <TransitionGroup name="notes-constellation" tag="g">
          <g
            v-for="node in visible"
            :key="node.id"
            :transform="`translate(${node.x} ${node.y})`"
            class="notes-graph-node"
            :class="{
              active: node.id === level,
              'is-leaf': !canExplore(node.id),
              highlighted: hover === node.id,
              dimmed: hover && !neighbors.has(node.id),
            }"
            :role="canExplore(node.id) ? 'button' : 'img'"
            :tabindex="canExplore(node.id) ? 0 : -1"
            :aria-disabled="!canExplore(node.id) || undefined"
            :aria-label="
              (canExplore(node.id) ? 'Explorer ' : 'Note finale : ') +
              node.title
            "
            @pointerdown.stop="down($event, node)"
            @mouseenter="hover = node.id"
            @mouseleave="hover = ''"
            @focus="hover = node.id"
            @blur="hover = ''"
            @keydown.enter.prevent="enterLevel(node.id)"
          >
            <title>
              {{ node.title }} ·
              {{
                canExplore(node.id)
                  ? "Explorer les sous-notes"
                  : "Aucune sous-note"
              }}
            </title>
            <rect
              x="-100"
              y="-20"
              width="200"
              height="64"
              fill="transparent"
              pointer-events="all"
            />
            <circle class="notes-explorer-node-ring" r="24" />
            <circle
              :r="
                Math.max(
                  3 / camera.z,
                  6 + Math.min(10, Math.sqrt(node.degree) * 2),
                )
              "
            />
            <text
              v-show="
                camera.z >= 0.22 || hover === node.id || level === node.id
              "
              y="29"
              text-anchor="middle"
              :style="{
                fontSize: graphNoteLabel(node.title, camera.z).size + 'px',
              }"
            >
              {{ graphNoteLabel(node.title, camera.z).text }}
            </text>
          </g>
        </TransitionGroup>
      </g>
    </svg>
    <div v-if="!visible.length" class="notes-graph-empty">
      {{
        tree.length
          ? "Aucune note ne correspond aux filtres."
          : "Crée des notes et relie-les avec /page pour construire ta carte."
      }}
    </div>
    <div
      v-if="focused && levelNotes.length === 1 && !query"
      class="notes-explorer-leaf"
    >
      <strong>{{ focused.title }}</strong
      ><span>Cette note n’a pas encore de sous-notes.</span
      ><button @click="emit('open', focused.id)">
        Lire ou enrichir cette note <ArrowUpRight :size="14" />
      </button>
    </div>
    <footer class="notes-graph-footer">
      <span
        >{{ visible.length }} {{ visible.length > 1 ? "notes" : "note"
        }}<span class="notes-explorer-count-separator">·</span
        >{{ edges.length }} relations<span
          v-if="preview.length"
          class="notes-explorer-preview-legend"
        >
          · {{ preview.length }} au niveau suivant</span
        ></span
      >
      <div>
        <button
          class="icon-btn"
          title="Dézoomer"
          aria-label="Dézoomer la carte"
          @click="zoom(1 / 1.2)"
        >
          <Minus :size="16" /></button
        ><span>{{ Math.round(camera.z * 100) }} %</span
        ><button
          class="icon-btn"
          title="Zoomer"
          aria-label="Zoomer la carte"
          @click="zoom(1.2)"
        >
          <Plus :size="16" /></button
        ><button
          class="icon-btn"
          title="Recentrer"
          aria-label="Recentrer la carte"
          @click="fit"
        >
          <LocateFixed :size="17" />
        </button>
      </div>
    </footer>
  </section>
</template>
