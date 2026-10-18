<script setup>
import { reactive, computed, ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import {
  MousePointer2,
  RectangleHorizontal,
  Circle,
  Lasso,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Spline,
  Plus,
  Minus,
  Layers,
  Square,
  Trash2,
  CornerDownRight,
} from "lucide-vue-next";
import { freeformPath } from "../freeform.js";
const props = defineProps({
    studio: Object,
    mode: { type: String, default: "toolbar" },
  }),
  s = reactive(props.studio),
  t = s.drawingTools;
const tools = [
  ["move", "Déplacer", "V", MousePointer2],
  ["rect", "Sélection rectangulaire", "M", RectangleHorizontal],
  ["ellipse", "Sélection elliptique", "E", Circle],
  ["lasso", "Lasso", "L", Lasso],
  ["pen", "Plume", "P", PenTool],
  ["nodes", "Modifier les points", "A", Spline],
];
const modes = [
  ["replace", "Remplacer la sélection", Square],
  ["add", "Ajouter à la sélection", Plus],
  ["subtract", "Retirer de la sélection", Minus],
  ["intersect", "Intersection de sélection", Layers],
];
const box = computed(() => {
  const p = t.region?.points || [],
    xs = p.map((p) => p.x),
    ys = p.map((p) => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
});
const poly = computed(() => (t.region?.points || []).map(p => p.x + "," + p.y).join(" "));
const palette = ref(null), collapsed = ref(false), position = ref({x:14,y:12}), moving = ref(false);
let gesture = null, observer;
function constrain() {
  const el = palette.value, host = el?.parentElement;
  if (!host) return;
  position.value = {
    x: Math.max(0, Math.min(position.value.x, host.clientWidth - el.offsetWidth)),
    y: Math.max(0, Math.min(position.value.y, host.clientHeight - el.offsetHeight)),
  };
}
function startPalette(e) {
  if (e.button !== 0) return;
  e.preventDefault();
  gesture = {id:e.pointerId, clientX:e.clientX, clientY:e.clientY, ...position.value};
  moving.value = true;
  e.currentTarget.setPointerCapture(e.pointerId);
}
function movePalette(e) {
  if (!gesture || e.pointerId !== gesture.id) return;
  position.value = {x:gesture.x + e.clientX - gesture.clientX,y:gesture.y + e.clientY - gesture.clientY};
  constrain();
}
function endPalette() { gesture = null; moving.value = false; }
function movePaletteKey(e) {
  const delta = {ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[e.key];
  if (!delta) return;
  e.preventDefault();e.stopPropagation();
  position.value = {x:position.value.x+delta[0],y:position.value.y+delta[1]};constrain();
}
async function togglePalette() { collapsed.value = !collapsed.value; await nextTick(); constrain(); }
onMounted(() => {
  if (!palette.value) return;
  observer = new ResizeObserver(constrain);
  observer.observe(palette.value.parentElement);observer.observe(palette.value);
});
onBeforeUnmount(() => observer?.disconnect());
const r = computed(
  () =>
    (7 * (s.isAnimation ? 2560 : 1920)) /
    Math.max(1, s.canvas?.getBoundingClientRect().width || 900),
);
function nodeDown(e, i, part) {
  t.startNode(e, i, part);
}
</script>
<template>
  <div
    v-if="mode === 'toolbar'"
    ref="palette"
    class="drawing-tool-palette"
    :class="{ 'is-collapsed': collapsed }"
    :style="{left: position.x + 'px', top: position.y + 'px'}"
    role="toolbar"
    aria-label="Outils de sélection et plume"
    @pointerdown.stop
  >
    <div class="drawing-palette-controls">
      <button class="drawing-palette-grip" :class="{moving}" aria-label="Déplacer la palette" title="Déplacer la palette · flèches du clavier" @pointerdown.stop="startPalette" @pointermove="movePalette" @pointerup="endPalette" @pointercancel="endPalette" @lostpointercapture="endPalette" @keydown="movePaletteKey"><GripVertical :size="16" /></button>
      <button :aria-expanded="!collapsed" :aria-label="collapsed ? 'Déplier la palette' : 'Replier la palette'" :title="collapsed ? 'Déplier la palette' : 'Replier la palette'" @click="togglePalette"><component :is="collapsed ? ChevronRight : ChevronLeft" :size="15" /></button>
    </div>
    <div v-show="!collapsed" class="drawing-palette-content">
    <div class="drawing-tool-row">
      <button
        v-for="[id, label, key, icon] in tools"
        :key="id"
        :class="{ active: t.tool === id }"
        :title="label + ' · ' + key"
        :aria-label="label"
        :aria-pressed="t.tool === id"
        @click="t.setTool(id)"
      >
        <component :is="icon" :size="17" />
      </button>
    </div>
    <div
      v-if="['rect', 'ellipse', 'lasso'].includes(t.tool)"
      class="drawing-tool-row drawing-tool-secondary"
    >
      <button
        v-for="[id, label, icon] in modes"
        :key="id"
        :title="label"
        :aria-label="label"
        :aria-pressed="t.mode === id"
        :class="{ active: t.mode === id }"
        @click="t.mode = id"
      >
        <component :is="icon" :size="15" /></button
      ><span>Maj : ajouter · Alt : retirer</span>
    </div>
    <div
      v-if="t.tool === 'pen'"
      class="drawing-tool-secondary drawing-tool-help"
    >
      <span>Clic : point · glisser : courbe</span
      ><template v-if="t.draft"
        ><button @click="t.finish(false)">Terminer</button
        ><button @click="t.finish(true)">Fermer la forme</button
        ><button @click="t.cancel()">Annuler</button></template
      >
    </div>
    <div
      v-if="t.tool === 'nodes' && t.selectedPath"
      class="drawing-tool-row drawing-tool-secondary"
    >
      <label
        >Point<select
          v-model.number="t.activeNode"
          aria-label="Point de la forme"
        >
          <option v-for="(_, i) in t.nodes" :value="i" :key="i">
            {{ i + 1 }}
          </option>
        </select></label
      ><button
        title="Ajouter un point après celui sélectionné"
        aria-label="Ajouter un point"
        :disabled="
          t.nodes.length >= 128 ||
          (!t.selectedPath.element.closed &&
            t.activeNode === t.nodes.length - 1)
        "
        @click="t.addNode()"
      >
        <Plus :size="15" /></button
      ><button
        title="Supprimer le point · Suppr"
        aria-label="Supprimer le point"
        :disabled="t.nodes.length <= (t.selectedPath.element.closed ? 3 : 2)"
        @click="t.removeNode()"
      >
        <Trash2 :size="15" /></button
      ><button
        title="Point anguleux"
        aria-label="Point anguleux"
        @click="t.cornerNode()"
      >
        <CornerDownRight :size="15" /></button
      ><button
        title="Lisser le point · Alt pendant le déplacement dissocie les tangentes"
        aria-label="Lisser le point"
        @click="t.smoothNode()"
      >
        <Spline :size="15" /></button
      ><label
        ><input
          type="checkbox"
          :checked="t.selectedPath.element.closed"
          @change="t.toggleClosed()"
        />Fermée</label
      >
    </div>
    </div>
  </div>
  <svg
    v-else
    class="drawing-tools-overlay"
    :viewBox="s.isAnimation ? '0 0 2560 1440' : '0 0 1920 1080'"
    aria-label="Repères de sélection et points de la forme"
  >
    <g :transform="s.isAnimation ? 'translate(320 180)' : undefined">
      <g v-if="t.region" class="drawing-region">
        <rect v-if="t.region.type === 'rect'" :x="box.x" :y="box.y" :width="box.w" :height="box.h" />
        <ellipse
          v-else-if="t.region.type === 'ellipse'"
          :cx="box.x + box.w / 2"
          :cy="box.y + box.h / 2"
          :rx="box.w / 2"
          :ry="box.h / 2"
        />
        <polygon v-else :points="poly" fill-rule="evenodd" />
      </g>
      <g v-if="t.draft" class="drawing-pen-preview">
        <path :d="freeformPath(t.draft, false)" />
        <line
          v-if="t.hover && t.draft.length"
          :x1="t.draft.at(-1).x"
          :y1="t.draft.at(-1).y"
          :x2="t.hover.x"
          :y2="t.hover.y"
          class="drawing-pen-ghost"
        />
        <g v-for="(n, i) in t.draft" :key="i">
          <line :x1="n.inX" :y1="n.inY" :x2="n.outX" :y2="n.outY" />
          <circle :cx="n.x" :cy="n.y" :r="r * 0.6" />
        </g>
      </g>
      <g v-if="t.tool === 'nodes' && t.selectedPath" class="drawing-nodes">
        <path
          :d="freeformPath(t.nodes, t.selectedPath.element.closed)"
          class="drawing-node-outline"
        />
        <g v-for="(n, i) in t.nodes" :key="i">
          <template v-if="i === t.activeNode">
            <line :x1="n.inX" :y1="n.inY" :x2="n.outX" :y2="n.outY" />
            <circle
              v-for="side in ['in', 'out']"
              v-show="Math.hypot(n[side + 'X'] - n.x, n[side + 'Y'] - n.y) > 1"
              :key="side"
              class="drawing-node-handle"
              :cx="n[side + 'X']"
              :cy="n[side + 'Y']"
              :r="r * 0.7"
              @pointerdown.stop="nodeDown($event, i, side)"
              @pointermove.stop="s.move"
              @pointerup.stop="s.up"
              @pointercancel.stop="s.up"
              @lostpointercapture.stop="s.up"
            />
          </template>
          <circle
            :class="['drawing-node-anchor', { active: i === t.activeNode }]"
            :cx="n.x"
            :cy="n.y"
            :r="r"
            @pointerdown.stop="nodeDown($event, i, 'anchor')"
            @pointermove.stop="s.move"
            @pointerup.stop="s.up"
            @pointercancel.stop="s.up"
            @lostpointercapture.stop="s.up"
          />
        </g>
      </g>
    </g>
  </svg>
</template>
