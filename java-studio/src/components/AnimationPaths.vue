<script setup>
import { reactive, onUnmounted, computed } from "vue";
import {
  splinePathData,
  splineSegments,
  moveSplinePoint,
  splinePoint,
} from "../splines.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
let cleanup = () => {};
const handles = computed(() =>
  splineSegments(a.path?.points || [], false)
    .map(
      ([p, b, c, d]) =>
        `M ${p.x} ${p.y} L ${b.x} ${b.y} M ${c.x} ${c.y} L ${d.x} ${d.y}`,
    )
    .join(" "),
);
function position(event, svg) {
  const rect = svg.getBoundingClientRect();
  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * 2560 - 320),
    y: Math.round(((event.clientY - rect.top) / rect.height) * 1440 - 180),
  };
}
function drag(event, index) {
  event.preventDefault();
  event.stopPropagation();
  cleanup();
  a.selectedPathPoint = index;
  a.beginGesture();
  a.stop();
  const svg = event.currentTarget.ownerSVGElement;
  const move = (e) => {
    const p = position(e, svg);
    moveSplinePoint(a.path, index, p.x, p.y);
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
function add(event) {
  const p = position(event, event.currentTarget.ownerSVGElement),
    count = splineSegments(a.path.points, a.path.closed).length;
  let nearest = { distance: Infinity, segment: 0, t: 0.5 };
  for (let i = 0; i < count; i++)
    for (let j = 1; j < 40; j++) {
      const t = j / 40,
        q = splinePoint(a.path.points, (i + t) / count, a.path.closed),
        distance = Math.hypot(q.x - p.x, q.y - p.y);
      if (distance < nearest.distance) nearest = { distance, segment: i, t };
    }
  a.addPathPoint(nearest.segment, nearest.t);
}
function nudge(i, dx, dy) {
  a.beginGesture();
  moveSplinePoint(a.path, i, a.path.points[i].x + dx, a.path.points[i].y + dy);
  a.endGesture();
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
      :d="splinePathData(a.path)"
      fill="none"
      stroke="transparent"
      stroke-width="22"
      style="pointer-events: stroke; cursor: copy"
      @dblclick.stop.prevent="add"
    >
      <title>Double-cliquer pour ajouter un point</title>
    </path>
    <path
      :d="splinePathData(a.path)"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      :d="handles"
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
      :r="i % 3 === 0 ? 13 : 9"
      :class="{ selected: a.selectedPathPoint === i }"
      tabindex="0"
      role="button"
      :aria-label="'Point ' + (i + 1) + ' de la spline'"
      @pointerdown="drag($event, i)"
      @contextmenu.stop.prevent="a.removePathPoint(i)"
      @keydown.delete.stop.prevent="a.removePathPoint(i)"
      @keydown.left.stop.prevent="nudge(i, -10, 0)"
      @keydown.right.stop.prevent="nudge(i, 10, 0)"
      @keydown.up.stop.prevent="nudge(i, 0, -10)"
      @keydown.down.stop.prevent="nudge(i, 0, 10)"
    />
  </svg>
</template>
