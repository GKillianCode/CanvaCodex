<script setup>
import { reactive, onUnmounted } from "vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
let cleanup = () => {};
function drag(event, index) {
  event.preventDefault();
  event.stopPropagation();
  cleanup();
  a.beginGesture();
  a.stop();
  const svg = event.currentTarget.ownerSVGElement,
    rect = svg.getBoundingClientRect(),
    point = a.path.points[index];
  const move = (e) => {
    point.x = Math.round(((e.clientX - rect.left) / rect.width) * 2560 - 320);
    point.y = Math.round(((e.clientY - rect.top) / rect.height) * 1440 - 180);
  };
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    a.endGesture();
    cleanup = () => {};
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  cleanup = end;
}
onUnmounted(() => cleanup());
</script>
<template>
  <svg
    v-if="a.pathEditing && a.path"
    class="animation-path-editor"
    viewBox="-320 -180 2560 1440"
    preserveAspectRatio="none"
    aria-label="Éditer la spline"
  >
    <path
      :d="`M ${a.path.points[0].x} ${a.path.points[0].y} C ${a.path.points[1].x} ${a.path.points[1].y}, ${a.path.points[2].x} ${a.path.points[2].y}, ${a.path.points[3].x} ${a.path.points[3].y}`"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      :d="`M ${a.path.points[0].x} ${a.path.points[0].y} L ${a.path.points[1].x} ${a.path.points[1].y} M ${a.path.points[2].x} ${a.path.points[2].y} L ${a.path.points[3].x} ${a.path.points[3].y}`"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-dasharray="8 8"
    />
    <circle
      v-for="(p, i) in a.path.points"
      :key="i"
      :cx="p.x"
      :cy="p.y"
      :r="i === 0 || i === 3 ? 13 : 10"
      tabindex="0"
      role="button"
      :aria-label="'Point ' + (i + 1) + ' de la spline'"
      @pointerdown="drag($event, i)"
      @keydown.left.stop.prevent="p.x -= 10"
      @keydown.right.stop.prevent="p.x += 10"
      @keydown.up.stop.prevent="p.y -= 10"
      @keydown.down.stop.prevent="p.y += 10"
    />
  </svg>
</template>
