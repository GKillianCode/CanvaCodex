<script setup>
import { reactive } from 'vue';
import { Volume2, VolumeX } from 'lucide-vue-next';
import NumberRange from './NumberRange.vue';
const props = defineProps({ audio:Object });
const audio = reactive(props.audio);
</script>
<template>
  <div class="animation-audio-volume">
    <button type="button" class="icon-btn"
      :aria-label="audio.muted ? 'Réactiver l’audio' : 'Couper l’audio'"
      :title="audio.muted ? 'Réactiver l’audio' : 'Couper l’audio'"
      :aria-pressed="audio.muted" @click="audio.toggleMute">
      <component :is="audio.muted || audio.volume === 0 ? VolumeX : Volume2" :size="15"/>
    </button>
    <NumberRange label="Volume" unit="%" :model-value="Math.round(audio.volume*100)"
      @update:model-value="audio.setVolume($event)"/>
  </div>
</template>
<style scoped>
.animation-audio-volume {display:flex;align-items:center;gap:6px;min-width:140px;max-width:210px;}
.animation-audio-volume :deep(.number-range) {flex:1;min-width:0;margin:0;}
.animation-audio-volume :deep(.number-range-heading) {font-size:10px;margin:0;}
.animation-audio-volume :deep(.number-unit input) {width:42px;min-height:22px;padding:2px;font-size:10px;}
.animation-audio-volume :deep(input[type="range"]) {width:100%;margin:2px 0;}
</style>
