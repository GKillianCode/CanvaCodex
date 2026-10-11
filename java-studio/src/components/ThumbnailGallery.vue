<script setup>
import {ref,computed,onMounted,onUnmounted} from 'vue';
import {X} from 'lucide-vue-next';
import {thumbnailCategories,thumbnailPresets,makeThumbnail} from '../thumbnails.js';
import {renderSlide} from '../render.js';
const props=defineProps({theme:Object});defineEmits(['choose','close']);
const category=ref('all'),root=ref(null),items=computed(()=>thumbnailPresets.filter(p=>category.value==='all'||p.category===category.value));
function preview(canvas,id){if(!canvas)return;const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.scale(320/1920,180/1080);renderSlide(ctx,makeThumbnail(id),props.theme,{header:false,footer:false});}
let focus;onUnmounted(()=>focus?.focus?.());onMounted(()=>{focus=document.activeElement;root.value.querySelector('button')?.focus();});
function keyboard(e){if(e.key==='Escape')root.value.querySelector('[aria-label="Fermer les presets"]')?.click();if(e.key==='Tab'){const nodes=[...root.value.querySelectorAll('button,select')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
</script>
<template><div class="modal-backdrop" @keydown.stop="keyboard" @pointerdown.stop @click.self="$emit('close')"><section ref="root" class="thumbnail-gallery" role="dialog" aria-modal="true" aria-label="Presets de miniatures"><header><div><span class="eyebrow">MINIATURES · 16:9</span><h2>Un visuel à la hauteur du sujet.</h2></div><button class="icon-btn" aria-label="Fermer les presets" @click="$emit('close')"><X/></button></header><label>Catégorie<select v-model="category"><option value="all">Toutes les catégories</option><option v-for="[id,name] in thumbnailCategories" :value="id" :key="id">{{name}}</option></select></label><p>Le preset remplace la composition. Ctrl Z permet de revenir en arrière. Tous les objets restent éditables.</p><div class="thumbnail-presets"><button v-for="p in items" :key="p.id" @click="$emit('choose',p.id)"><canvas :ref="el=>preview(el,p.id)" width="320" height="180"/><strong>{{p.name}}</strong><small>{{p.style==='split'?'Texte + visuel personnalisable':'Titre fort + badge'}}</small></button></div></section></div></template>
