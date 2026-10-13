<script setup>
import {ref,computed,onMounted,onUnmounted} from 'vue';
import {X} from 'lucide-vue-next';
import {thumbnailCategories,thumbnailPresets,makeThumbnail,thumbnailPalette} from '../thumbnails.js';
import {renderSlide} from '../render.js';
const props=defineProps({theme:Object});defineEmits(['choose','close']);
const category=ref('all'),root=ref(null),items=computed(()=>thumbnailPresets.filter(p=>category.value==='all'||p.category===category.value));
function preview(canvas,id){if(!canvas)return;const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.scale(320/1920,180/1080);renderSlide(ctx,makeThumbnail(id),{...props.theme,...thumbnailPalette},{header:false,footer:false});}
let focus;onUnmounted(()=>focus?.focus?.());onMounted(()=>{focus=document.activeElement;root.value.querySelector('button')?.focus();});
function keyboard(e){if(e.key==='Escape')root.value.querySelector('[aria-label="Fermer les presets"]')?.click();if(e.key==='Tab'){const nodes=[...root.value.querySelectorAll('button,select')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
</script>
<template><div class="modal-backdrop" @keydown.stop="keyboard" @pointerdown.stop @click.self="$emit('close')"><section ref="root" class="thumbnail-gallery" role="dialog" aria-modal="true" aria-label="Identités de playlists"><header><div><span class="eyebrow">HABILLAGES DE PLAYLISTS</span><h2>Une playlist. Un repère reconnaissable.</h2></div><button class="icon-btn" aria-label="Fermer les presets" @click="$emit('close')"><X/></button></header><label>Catégorie<select v-model="category"><option value="all">Toutes les catégories</option><option v-for="[id,name] in thumbnailCategories" :value="id" :key="id">{{name}}</option></select></label><p>Fond blanc, texte noir et contour de couleur. Ton titre, tes images et tes autres objets sont conservés. Ctrl Z pour annuler.</p><div class="thumbnail-presets"><button v-for="p in items" :key="p.id" @click="$emit('choose',p.id)"><canvas :ref="el=>preview(el,p.id)" width="320" height="180"/><strong>{{p.name}}</strong><small>Contour de couleur · contenu libre</small></button></div></section></div></template>
