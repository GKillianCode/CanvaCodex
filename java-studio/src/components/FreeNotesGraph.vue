<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { Search, LocateFixed, Plus, Minus, Network } from "lucide-vue-next";
import {
  noteGraph,
  layoutNoteGraph,
  graphNoteLabel,
  noteGraphLevel,
} from "../freeNotesGraph.js";
const props = defineProps({ tree: Array, activeId: String });
const emit = defineEmits(["open"]);
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
  const nodes = visible.value;
  if (!nodes.length) return;
  const xs = nodes.map((n) => n.x),
    ys = nodes.map((n) => n.y),
    left = Math.min(...xs) - 100,
    right = Math.max(...xs) + 100,
    top = Math.min(...ys) - 70,
    bottom = Math.max(...ys) + 70;
  const z = Math.max(
    0.03,
    Math.min(1.8, width.value / (right - left), height.value / (bottom - top)),
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
    points.value = layoutNoteGraph(graph.value);
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
  if (node && !moved) enterLevel(node.id);
}
onMounted(() => {
  observer = new ResizeObserver((entries) => {
    width.value = entries[0].contentRect.width;
    height.value = entries[0].contentRect.height;
    fit();
  });
  observer.observe(svg.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <section class="free-notes-graph" aria-label="Réseau de notes">
    <div class="notes-graph-tools">
      <div>
        <Network :size="19" /><strong>Réseau de notes</strong
        ><span>{{ visible.length }} notes · {{ edges.length }} relations</span>
      </div>
      <label class="notes-graph-search"
        ><Search :size="15" /><input
          v-model="query"
          placeholder="Rechercher une note…"
          aria-label="Rechercher dans la carte"
      /></label>
      <label><input v-model="orphans" type="checkbox" />Notes isolées</label>
      <label><input v-model="parents" type="checkbox" />Parenté</label>
    </div>
    <nav class="notes-graph-levels" aria-label="Niveau du réseau">
      <button
        @click="enterLevel('')"
        :aria-current="!level ? 'page' : undefined"
      >
        Racine
      </button>
      <template v-for="row in breadcrumb" :key="row.id"
        ><span>/</span
        ><button
          @click="enterLevel(row.id)"
          :aria-current="row.id === level ? 'page' : undefined"
        >
          {{ row.title }}
        </button></template
      >
      <button
        v-if="focused"
        class="btn notes-graph-open"
        @click="emit('open', focused.id)"
      >
        Ouvrir la note
      </button>
      <small>{{
        level
          ? Math.max(0, levelNotes.length - 1) + " sous-notes directes"
          : "Notes de premier niveau"
      }}</small>
    </nav>
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
      <g :transform="`translate(${camera.x} ${camera.y}) scale(${camera.z})`">
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
        <g
          v-for="node in visible"
          :key="node.id"
          :transform="`translate(${node.x} ${node.y})`"
          class="notes-graph-node"
          :class="{
            active: node.id === level,
            highlighted: hover === node.id,
            dimmed: hover && !neighbors.has(node.id),
          }"
          role="button"
          tabindex="0"
          :aria-label="'Explorer ' + node.title"
          @pointerdown.stop="down($event, node)"
          @mouseenter="hover = node.id"
          @mouseleave="hover = ''"
          @focus="hover = node.id"
          @blur="hover = ''"
          @keydown.enter.prevent="enterLevel(node.id)"
        >
          <title>{{ node.title }} · {{ node.degree }} relations</title>
          <rect x="-100" y="-20" width="200" height="64" fill="transparent" pointer-events="all" />
          <circle
            :r="
              Math.max(
                3 / camera.z,
                6 + Math.min(10, Math.sqrt(node.degree) * 2),
              )
            "
          />
          <text
            v-show="camera.z >= 0.22 || hover === node.id || level === node.id"
            y="29"
            text-anchor="middle"
            :style="{
              fontSize: graphNoteLabel(node.title, camera.z).size + 'px',
            }"
          >
            {{ graphNoteLabel(node.title, camera.z).text }}
          </text>
        </g>
      </g>
    </svg>
    <div v-if="!visible.length" class="notes-graph-empty">
      {{
        tree.length
          ? "Aucune note ne correspond aux filtres."
          : "Crée des notes et relie-les avec /page pour construire ta carte."
      }}
    </div>
    <footer class="notes-graph-footer">
      <span
        >Glisser pour déplacer · molette pour zoomer · cliquer pour explorer les
        sous-notes</span
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
