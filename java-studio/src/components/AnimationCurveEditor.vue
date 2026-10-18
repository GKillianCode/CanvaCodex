<script setup>
import { computed, ref } from "vue";
import { easeAnimation } from "../animationModel.js";
const props = defineProps({ frame: Object }),
  root = ref(null),
  drag = ref(null);
const presets = {
  linear: [0, 0, 1, 1],
  smooth: [0.42, 0, 0.58, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  bezier: [0.25, 0.1, 0.25, 1],
};
const curve = computed(() => props.frame.curve || presets.bezier),
  x = (v) => 20 + v * 200,
  y = (v) => 130 - (v + 1) * 40;
const path = computed(() =>
  Array.from({ length: 61 }, (_, i) => {
    const t = i / 60;
    return (
      (i ? "L" : "M") +
      x(t) +
      " " +
      y(easeAnimation(t, props.frame.ease, curve.value))
    );
  }).join(" "),
);
function enable() {
  const value = presets[props.frame.ease] || presets.bezier;
  props.frame.curve = [...value];
  props.frame.ease = "bezier";
}
function down(e, index) {
  e.preventDefault();
  if (props.frame.ease !== "bezier") enable();
  drag.value = index;
  root.value.setPointerCapture(e.pointerId);
  move(e);
}
function move(e) {
  if (drag.value === null) return;
  const r = root.value.getBoundingClientRect(),
    px = ((e.clientX - r.left) / r.width) * 240,
    py = ((e.clientY - r.top) / r.height) * 160;
  const next = [...curve.value];
  next[drag.value] = Math.max(0, Math.min(1, (px - 20) / 200));
  next[drag.value + 1] = Math.max(-1, Math.min(2, (130 - py) / 40 - 1));
  props.frame.curve = next;
}
function nudge(e, i) {
  if (!e.key.startsWith("Arrow")) return;
  e.preventDefault();
  if (props.frame.ease !== "bezier") enable();
  const c = [...curve.value];
  if (["ArrowLeft", "ArrowRight"].includes(e.key))
    c[i] = Math.max(
      0,
      Math.min(1, c[i] + (e.key === "ArrowLeft" ? -0.02 : 0.02)),
    );
  else
    c[i + 1] = Math.max(
      -1,
      Math.min(2, c[i + 1] + (e.key === "ArrowUp" ? 0.02 : -0.02)),
    );
  props.frame.curve = c;
}
</script>
<template>
  <div class="animation-curve-editor">
    <button v-if="frame.ease !== 'bezier'" class="btn" @click="enable">
      Personnaliser la courbe</button
    ><svg
      ref="root"
      viewBox="0 0 240 160"
      aria-label="Courbe de progression de la clé"
      @pointermove="move"
      @pointerup="drag = null"
      @pointercancel="drag = null"
    >
      <path d="M20 10 V130 H220 M20 90 H220 M20 50 H220" class="curve-grid" />
      <path :d="path" class="curve-line" />
      <template v-if="frame.ease === 'bezier'">
        <path
          :d="`M20 90 L${x(curve[0])} ${y(curve[1])} M220 50 L${x(curve[2])} ${y(curve[3])}`"
          class="curve-grid"
        />
        <circle
          v-for="i in [0, 2]"
          :key="i"
          :cx="x(curve[i])"
          :cy="y(curve[i + 1])"
          r="6"
          role="slider"
          tabindex="0"
          :aria-label="'Poignée de courbe ' + (i / 2 + 1)"
          :aria-valuenow="curve[i]"
          @pointerdown="down($event, i)"
          @keydown="nudge($event, i)"
        />
      </template>
      <text x="20" y="151">Temps →</text>
      <text x="20" y="20">Progression</text></svg
    ><small v-if="frame.ease === 'bezier'"
      >Glisse les deux points pour régler l’accélération.</small
    >
  </div>
</template>
<style scoped>
.animation-curve-editor {
  margin: 8px 0;
}
.animation-curve-editor svg {
  width: 100%;
  height: auto;
  touch-action: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--panel);
}
.curve-grid {
  fill: none;
  stroke: var(--muted);
  opacity: 0.25;
}
.curve-line {
  fill: none;
  stroke: var(--accent, #a5f3cf);
  stroke-width: 2;
}
.animation-curve-editor circle {
  fill: var(--accent, #a5f3cf);
  stroke: var(--panel);
  stroke-width: 2;
  cursor: grab;
}
.animation-curve-editor text {
  font-size: 10px;
  fill: var(--muted);
}
</style>
