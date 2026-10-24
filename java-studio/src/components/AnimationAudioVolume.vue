<script setup>
import { reactive, ref, computed, onMounted, onUnmounted, useId } from 'vue';
import { Volume2, VolumeX, ChevronUp } from 'lucide-vue-next';
import NumberRange from './NumberRange.vue';
const props = defineProps({ audio:Object });
const audio = reactive(props.audio), trigger=ref(null), palette=ref(null), open=ref(false), paletteId=useId();
const level=computed(()=>Math.round(audio.volume*100));
function position(){
  const bounds=trigger.value.getBoundingClientRect(),width=112,height=220;
  const owner=trigger.value.closest('.track-name')?.getBoundingClientRect();
  const minLeft=Math.max(8,owner?owner.left+8:8),maxLeft=Math.min(innerWidth-width-8,owner?owner.right-width-8:innerWidth-width-8);
  palette.value.style.left=Math.max(minLeft,Math.min(maxLeft,bounds.left+bounds.width/2-width/2))+'px';
  palette.value.style.top=Math.max(8,Math.min(innerHeight-height-8,bounds.top>=height+8?bounds.top-height-8:bounds.bottom+8))+'px';
}
function close(){if(palette.value?.matches(':popover-open'))palette.value.hidePopover();}
onMounted(()=>{window.addEventListener('resize',close);window.addEventListener('scroll',close,true);});
onUnmounted(()=>{window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);});
</script>
<template>
  <div class="animation-audio-volume">
    <button type="button" class="icon-btn"
      :aria-label="audio.muted ? 'Réactiver l’audio' : 'Couper l’audio'"
      :title="audio.muted ? 'Réactiver l’audio' : 'Couper l’audio'"
      :aria-pressed="audio.muted" @click="audio.toggleMute">
      <component :is="audio.muted || audio.volume === 0 ? VolumeX : Volume2" :size="15"/>
    </button>
    <button ref="trigger" type="button" class="volume-trigger" aria-label="Régler le volume" aria-haspopup="dialog"
      :aria-expanded="open" :popovertarget="paletteId" :title="'Régler le volume · '+level+' %'" @click="position">
      <span>{{level}} %</span><ChevronUp :size="12" :style="{transform:open?'rotate(180deg)':undefined}"/>
    </button>
    <div ref="palette" :id="paletteId" popover="auto" role="dialog" aria-label="Volume d’écoute" class="audio-volume-palette"
      @toggle="open=$event.newState==='open'" @pointerdown.stop>
      <NumberRange vertical label="Volume" unit="%" :model-value="level" @update:model-value="audio.setVolume($event)"/>
    </div>
  </div>
</template>
<style scoped>
.animation-audio-volume {display:flex;align-items:center;gap:4px;min-width:0;flex-shrink:0;}
.volume-trigger {display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--border);border-radius:6px;padding:4px 6px;background:transparent;color:inherit;font:inherit;font-size:11px;font-variant-numeric:tabular-nums;min-height:26px;}
.volume-trigger[aria-expanded="true"] {border-color:var(--mint);background:color-mix(in srgb,var(--mint) 8%,transparent);}
.audio-volume-palette {position:fixed;inset:auto;margin:0;width:112px;height:220px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--panel,#191c22);color:var(--ink,#e4e8ec);box-shadow:0 8px 24px #0003;}
.audio-volume-palette :deep(.number-range) {margin:0;min-width:0;}
.audio-volume-palette :deep(.number-range-heading) {display:flex!important;flex-direction:column!important;align-items:center;gap:8px;margin:0;font-size:11px;}
.audio-volume-palette :deep(.number-unit input) {width:44px;min-height:25px;padding:3px;font-size:11px;}
.audio-volume-palette :deep(input[type="range"]) {display:block;writing-mode:vertical-lr;direction:rtl;width:20px;height:130px;margin:10px auto 0;}
</style>
