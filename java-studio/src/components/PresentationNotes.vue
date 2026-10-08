<script setup>
import {computed,ref,watch} from 'vue';
import {X,Minus,Plus} from 'lucide-vue-next';
import {renderNotes} from '../presentationNotes.js';
const props=defineProps({notes:String,index:Number});const emit=defineEmits(['close']);const html=computed(()=>renderNotes(props.notes)),size=ref(16),body=ref(null);
function noteKeys(event){if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)||event.key==='Enter'&&event.target.closest('a'))event.stopPropagation();}
watch(()=>props.index,()=>{if(body.value)body.value.scrollTop=0;},{flush:'post'});
</script>
<template><aside class="presentation-notes" aria-label="Notes de présentation"><div class="presentation-notes-heading"><div><strong>Notes</strong><small>Diapo {{index+1}}</small></div><button class="icon-btn" aria-label="Réduire la taille des notes" :disabled="size<=12" @click="size=Math.max(12,size-2)"><Minus :size="15"/></button><button class="icon-btn" aria-label="Augmenter la taille des notes" :disabled="size>=28" @click="size=Math.min(28,size+2)"><Plus :size="15"/></button><button class="icon-btn" aria-label="Masquer les notes" @click="emit('close')"><X :size="17"/></button></div><div ref="body" class="markdown-notes presentation-notes-body" :style="{fontSize:size+'px'}" tabindex="0" @keydown="noteKeys" v-html="html||'<p>Aucune note pour cette diapo.</p>'"></div><small class="notes-private">Notes personnelles · hors enregistrement</small></aside></template>
