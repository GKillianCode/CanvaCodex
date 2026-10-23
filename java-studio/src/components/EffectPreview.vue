<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { effectSample } from "../animationEffectExamples.js";
import { renderAnimation } from "../animationRender.js";
const props = defineProps({ kind: String, theme: Object }),
  canvas = ref(null);
let scene,
  raf = 0,
  start = 0;
function draw(t = 0.9) {
  if (!canvas.value) return;
  const c = canvas.value.getContext("2d");
  c.resetTransform();
  c.clearRect(0, 0, 160, 90);
  c.scale(160 / 1920, 90 / 1080);
  renderAnimation(c, scene, props.theme, scene.animation, t, { camera: false });
}
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  draw();
}
function play() {
  start = performance.now();
  const tick = (now) => {
    draw(((now - start) / 1000) % 2.6);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
onMounted(() => {
  scene = effectSample(props.kind);
  scene.elements.sample.stroke = props.theme.ink;
  draw();
});
watch(
  () => props.theme,
  () => {
    if (scene) draw();
  },
);
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>
<template>
  <canvas
    ref="canvas"
    width="160"
    height="90"
    aria-hidden="true"
    @pointerenter="play"
    @pointerleave="stop"
  />
</template>
<style scoped>
canvas {
  width: 100%;
  height: 52px;
  object-fit: contain;
  display: block;
  pointer-events: auto;
}
</style>
