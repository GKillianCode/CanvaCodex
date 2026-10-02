<script setup>
import { X, ChevronRight, ChevronDown, ChevronLeft, ChevronUp } from 'lucide-vue-next';
import { presets, makeSlide } from '../model.js';
import { renderSlide } from '../render.js';
const props = defineProps({ theme: Object });
const emit = defineEmits(['close', 'choose', 'memory']);
function preview(preset) {
  const s = makeSlide(preset.id);
  if (preset.id === 'title') { s.title = 'Comprendre.\nConstruire.'; s.body = 'Une idée qui mérite toute la place.'; }
  const c = document.createElement('canvas'); c.width = 384; c.height = 216;
  const ctx = c.getContext('2d'); ctx.scale(.2, .2); renderSlide(ctx, s, props.theme);
  return c.toDataURL('image/jpeg', .7);
}
// This gallery is mounted only on opening. Previews are generated once, not during editing.
const previews = Object.fromEntries(presets.map(p => [p.id, preview(p)]));
</script>
<template>
  <div class="gallery-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <section class="layout-gallery" role="dialog" aria-modal="true" aria-label="Nouvelle diapo">
      <div class="gallery-heading"><div><span class="eyebrow">NOUVELLE DIAPO</span><h2>20 façons de raconter ton idée.</h2></div><button autofocus class="icon-btn" @click="emit('close')" title="Fermer la galerie"><X :size="21"/></button></div>
      <div class="layout-gallery-grid"><button v-for="p in presets" :key="p.id" class="gallery-card" @click="emit('choose', p.id)"><img :src="previews[p.id]" alt=""><strong>{{p.name}}</strong><span>{{p.desc}}</span></button></div>
      <button class="memory-example" @click="emit('memory')"><span class="unit-chain">Go <ChevronDown :size="17"/> Mo <ChevronDown :size="17"/> Ko <ChevronDown :size="17"/> octets</span><span><strong>Ajouter le parcours mémoire</strong><small>4 diapos verticales · unités décimales · explications au clic</small></span><ChevronRight :size="20"/></button>
    </section>
  </div>
</template>
