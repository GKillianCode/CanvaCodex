<script setup>
import { computed, ref } from "vue";
import { moveSegmentBoundary } from "../designModel.js";
const props = defineProps({
  modelValue: { type: Array, required: true },
  label: { type: String, default: "Colonne" },
  vertical: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const bar = ref(null);
const percentages = computed(() => {
  const total = props.modelValue.reduce((a, b) => a + b, 0);
  return props.modelValue.map((v) => (v / total) * 100);
});
const boundaries = computed(() =>
  percentages.value
    .slice(0, -1)
    .map((_, i) =>
      percentages.value.slice(0, i + 1).reduce((a, b) => a + b, 0),
    ),
);
const format = (v) => Number(v.toFixed(1)).toLocaleString("fr-FR");
function update(index, percent) {
  emit(
    "update:modelValue",
    moveSegmentBoundary(props.modelValue, index, percent),
  );
}
function drag(event, index) {
  event.preventDefault();
  event.target.setPointerCapture(event.pointerId);
  const weights = [...props.modelValue],
    rect = bar.value.getBoundingClientRect();
  const move = (e) => {
    const percent =
      (props.vertical
        ? (e.clientY - rect.top) / rect.height
        : (e.clientX - rect.left) / rect.width) * 100;
    emit("update:modelValue", moveSegmentBoundary(weights, index, percent));
  };
  const end = () => {
    event.target.removeEventListener("pointermove", move);
    event.target.removeEventListener("pointerup", end);
    event.target.removeEventListener("lostpointercapture", end);
  };
  event.target.addEventListener("pointermove", move);
  event.target.addEventListener("pointerup", end);
  event.target.addEventListener("lostpointercapture", end);
}
function keyboard(event, i) {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    update(
      i,
      boundaries.value[i] +
        (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) *
          (event.shiftKey ? 5 : 1),
    );
  }
}
</script>
<template>
  <div class="proportions-control">
    <div ref="bar" class="proportions-bar" :class="{ vertical }">
      <div
        v-for="(value, i) in percentages"
        :key="i"
        class="proportions-segment"
        :style="{ flexGrow: value }"
        :title="`${label} ${i + 1} : ${format(value)} %`"
      >
        <span>{{ i + 1 }}</span
        ><strong>{{ format(value) }} %</strong>
      </div>
      <button
        v-for="(value, i) in boundaries"
        :key="i"
        class="proportions-divider"
        :style="vertical ? { top: value + '%' } : { left: value + '%' }"
        role="slider"
        :aria-label="`Séparation ${label.toLowerCase()} ${i + 1} et ${i + 2}`"
        :aria-orientation="vertical ? 'vertical' : 'horizontal'"
        :aria-valuemin="(boundaries[i - 1] || 0) + 1"
        :aria-valuemax="(boundaries[i + 1] || 100) - 1"
        :aria-valuenow="Number(value.toFixed(1))"
        :aria-valuetext="format(value) + ' %'"
        @pointerdown="drag($event, i)"
        @keydown="keyboard($event, i)"
      >
        <span />
      </button>
    </div>
    <p class="field-help">Déplace les séparateurs pour répartir l’espace.</p>
  </div>
</template>
<style scoped>
.proportions-control {
  margin: 12px 0;
}
.proportions-bar {
  display: flex;
  position: relative;
  min-height: 60px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  isolation: isolate;
}
.proportions-segment {
  flex-basis: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  font-size: 10px;
  color: var(--muted);
}
.proportions-segment strong {
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
}
.proportions-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 16px;
  transform: translateX(-50%);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;
  display: grid;
  place-items: center;
}
.proportions-divider:before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
}
.proportions-divider span {
  width: 4px;
  height: 20px;
  border-radius: 3px;
  background: var(--muted);
  z-index: 1;
  opacity: 0.65;
}
.proportions-divider:hover span,
.proportions-divider:focus-visible span {
  background: var(--mint);
  opacity: 1;
}
.proportions-bar.vertical {
  flex-direction: column;
  height: 180px;
}
.vertical .proportions-segment {
  flex-direction: row;
  gap: 8px;
  min-height: 0;
}
.vertical .proportions-divider {
  left: 0;
  right: 0;
  bottom: auto;
  width: auto;
  height: 16px;
  transform: translateY(-50%);
  cursor: row-resize;
}
.vertical .proportions-divider:before {
  left: 0;
  right: 0;
  top: auto;
  bottom: auto;
  width: auto;
  height: 1px;
}
.vertical .proportions-divider span {
  width: 20px;
  height: 4px;
}
</style>
