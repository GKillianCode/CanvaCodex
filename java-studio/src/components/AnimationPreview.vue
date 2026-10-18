<script setup>
import { reactive, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { Play, Pause, X, Download, SkipBack } from "lucide-vue-next";
import { renderAnimation } from "../animationRender.js";
import { prepareImages } from "../render.js";
import { prepareFonts } from "../fontAssets.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  canvas = ref(null),
  root = ref(null),
  ready = ref(false),
  error = ref("");
let disposed = false,
  previousFocus;
function draw() {
  if (!canvas.value || !ready.value) return;
  const ctx = canvas.value.getContext("2d");
  ctx.clearRect(0, 0, 1920, 1080);
  renderAnimation(ctx, s.current, s.theme, a.config, a.time);
}
watch(() => [a.time, s.current, s.theme], draw, { deep: true });
function close() {
  a.stop();
  a.previewOpen = false;
}
function keyboard(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopImmediatePropagation();
    close();
  }
  if (e.key === "Tab") {
    const list = [
      ...root.value.querySelectorAll("button:not(:disabled),input,select,a"),
    ].filter((x) => x.getClientRects().length);
    if (!list.length) return;
    const first = list[0],
      last = list.at(-1);
    if (!list.includes(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
onMounted(async () => {
  previousFocus = document.activeElement;
  root.value?.focus();
  window.addEventListener("keydown", keyboard, true);
  try {
    await prepareFonts([s.current]);
    await prepareImages([s.current], s.theme);
    if (disposed) return;
    ready.value = true;
    await nextTick();
    draw();
  } catch (e) {
    if (!disposed) error.value = e.message;
  }
});
onUnmounted(() => {
  disposed = true;
  a.stop();
  window.removeEventListener("keydown", keyboard, true);
  previousFocus?.focus?.({ preventScroll: true });
});
</script>
<template>
  <section
    ref="root"
    tabindex="-1"
    class="animation-preview-dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Aperçu de l’animation"
  >
    <div class="animation-preview-heading">
      <div>
        <strong>{{ s.current.title || "Animation" }}</strong
        ><small
          >Aperçu de la vidéo · {{ s.resolution.width }} ×
          {{ s.resolution.height }}</small
        >
      </div>
      <button class="icon-btn" aria-label="Fermer l’aperçu" @click="close">
        <X :size="20" />
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="animation-preview-screen">
      <canvas
        ref="canvas"
        width="1920"
        height="1080"
        aria-label="Rendu de l’animation à l’instant courant"
      />
    </div>
    <div class="animation-preview-controls">
      <button class="icon-btn" title="Revenir au début" @click="a.seek(0)">
        <SkipBack :size="17" /></button
      ><button class="btn primary" @click="a.play()">
        <component :is="a.playing ? Pause : Play" :size="16" />{{
          a.playing ? "Pause" : "Lire"
        }}</button
      ><input
        type="range"
        min="0"
        :max="a.config.duration"
        :step="1 / a.config.fps"
        :value="a.time"
        aria-label="Position de lecture"
        @input="a.seek($event.target.value)"
      /><label
        ><input
          type="number"
          min="0"
          :max="a.config.duration"
          step=".01"
          :value="a.time.toFixed(2)"
          aria-label="Temps de l’aperçu"
          @change="a.seek($event.target.value)"
        />
        / {{ a.config.duration }} s</label
      ><label><input type="checkbox" v-model="a.loop" />Boucle</label
      ><select v-model="a.format" aria-label="Format vidéo de l’aperçu">
        <option value="mov">MOV · QTRLE</option>
        <option value="mkv">MKV · FFV1</option>
        <option value="webm">WebM · fond uni</option></select
      ><button class="btn" :disabled="a.busy" @click="a.exportVideo()">
        <Download :size="16" />Exporter</button
      ><button v-if="a.busy" class="btn" @click="a.cancel()">
        Annuler · {{ Math.round(a.progress * 100) }} %
      </button>
    </div>
  </section>
</template>
