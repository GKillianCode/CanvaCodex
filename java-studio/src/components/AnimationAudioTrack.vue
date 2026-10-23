<script setup>
import { reactive, computed } from "vue";
import AnimationAudioVolume from "./AnimationAudioVolume.vue";
import { Music2 } from "lucide-vue-next";
import { audioWavePath, audioTimeLabel } from "../animationAudioModel.js";
const props = defineProps({ studio: Object, span: Number }),
  s = reactive(props.studio),
  a = s.animation;
const emit = defineEmits(["scrub"]);
const wave = computed(() =>
  audioWavePath(
    a.audio.asset,
    a.config.audio.start,
    a.config.duration,
    props.span,
  ),
);
</script>
<template>
  <div v-if="a.config.audio.src" class="animation-track animation-audio-track">
    <div class="track-name">
      <span class="animation-audio-label"
        ><strong
          ><Music2 :size="12" /><span>{{
            a.audio.asset?.name || "Audio de référence"
          }}</span></strong
        ><small
          >{{ audioTimeLabel(a.config.audio.start, a.audio.frameRate) }} →
          {{ audioTimeLabel(a.config.audio.start + a.config.duration, a.audio.frameRate) }}</small
        ></span
      >
      <AnimationAudioVolume :audio="a.audio"/>
    </div>
    <div
      class="track-lane animation-audio-lane"
      :class="{ muted: a.audio.muted }"
      aria-label="Forme d’onde de la scène sélectionnée"
      @pointerdown="emit('scrub', $event)"
    >
      <svg
        v-if="wave"
        viewBox="0 0 1000 64"
        preserveAspectRatio="none"
        role="img"
        aria-label="Extrait audio de la scène"
      >
        <path :d="wave" />
      </svg>
      <span v-else class="animation-audio-loading">{{
        a.audio.loading || a.audio.importing
          ? "Chargement de la forme d’onde…"
          : a.audio.error || "Audio indisponible"
      }}</span>
      <i
        class="track-cursor"
        :style="{ left: (a.time / span) * 100 + '%' }"
      ></i>
    </div>
  </div>
</template>

<style scoped>
.animation-audio-track > .track-name {display:flex;flex-direction:column;align-items:stretch;justify-content:center;padding:6px 10px;gap:6px;}
</style>
