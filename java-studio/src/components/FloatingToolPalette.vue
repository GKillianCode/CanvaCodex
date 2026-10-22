<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from "vue";
import { GripVertical, ChevronLeft, ChevronRight } from "lucide-vue-next";
const props = defineProps({
  application: String,
  label: { type: String, default: "Outils de création" },
});
const palette = ref(null),
  collapsed = ref(false),
  position = ref({ x: 14, y: 12 }),
  moving = ref(false);
const storageKey = `frame-drawing-palette:${props.application}`;
{
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey));
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      position.value = { x: Math.max(0, saved.x), y: Math.max(0, saved.y) };
      collapsed.value = saved.collapsed === true;
    }
  } catch {}
}
function savePalette() {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ ...position.value, collapsed: collapsed.value }),
    );
  } catch {}
}
let gesture = null,
  observer;
function constrain() {
  const el = palette.value,
    host = el?.parentElement;
  if (!host) return;
  position.value = {
    x: Math.max(
      0,
      Math.min(position.value.x, host.clientWidth - el.offsetWidth),
    ),
    y: Math.max(
      0,
      Math.min(position.value.y, host.clientHeight - el.offsetHeight),
    ),
  };
}
function startPalette(e) {
  if (e.button !== 0) return;
  e.preventDefault();
  gesture = {
    id: e.pointerId,
    clientX: e.clientX,
    clientY: e.clientY,
    ...position.value,
  };
  moving.value = true;
  e.currentTarget.setPointerCapture(e.pointerId);
}
function movePalette(e) {
  if (!gesture || e.pointerId !== gesture.id) return;
  position.value = {
    x: gesture.x + e.clientX - gesture.clientX,
    y: gesture.y + e.clientY - gesture.clientY,
  };
  constrain();
}
function endPalette() {
  gesture = null;
  moving.value = false;
  savePalette();
}
function movePaletteKey(e) {
  const delta = {
    ArrowLeft: [-16, 0],
    ArrowRight: [16, 0],
    ArrowUp: [0, -16],
    ArrowDown: [0, 16],
  }[e.key];
  if (!delta) return;
  e.preventDefault();
  e.stopPropagation();
  position.value = {
    x: position.value.x + delta[0],
    y: position.value.y + delta[1],
  };
  constrain();
  savePalette();
}
async function togglePalette() {
  collapsed.value = !collapsed.value;
  await nextTick();
  constrain();
  savePalette();
}
onMounted(() => {
  if (!palette.value) return;
  observer = new ResizeObserver(constrain);
  observer.observe(palette.value.parentElement);
  observer.observe(palette.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div
    ref="palette"
    class="drawing-tool-palette"
    :class="{ 'is-collapsed': collapsed }"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    role="toolbar"
    :aria-label="label"
    @pointerdown.stop
  >
    <div class="drawing-palette-controls">
      <button
        class="drawing-palette-grip"
        :class="{ moving }"
        aria-label="Déplacer la palette"
        title="Déplacer la palette · flèches du clavier"
        @pointerdown.stop="startPalette"
        @pointermove="movePalette"
        @pointerup="endPalette"
        @pointercancel="endPalette"
        @lostpointercapture="endPalette"
        @keydown="movePaletteKey"
      >
        <GripVertical :size="16" />
      </button>
      <button
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? 'Déplier la palette' : 'Replier la palette'"
        :title="collapsed ? 'Déplier la palette' : 'Replier la palette'"
        @click="togglePalette"
      >
        <component :is="collapsed ? ChevronRight : ChevronLeft" :size="15" />
      </button>
    </div>
    <div v-show="!collapsed" class="drawing-palette-content">
      <slot />
    </div>
  </div>
</template>
