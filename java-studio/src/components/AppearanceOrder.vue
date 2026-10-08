<script setup>
import MotionProperties from './MotionProperties.vue';
import { computed } from 'vue';
import { appearanceRows } from '../appearances.js';
const props=defineProps({slide:Object});const emit=defineEmits(['change']);const rows=computed(()=>appearanceRows(props.slide));
</script>
<template><div class="appearance-order"><button class="btn full" @click="emit('change',rows.flatMap(row=>row.keys),'animation','auto')">Varier les apparitions automatiquement</button><p class="field-help">Une ligne par groupe : l’étape choisie s’applique à tous ses éléments. Étape 0 : visible au départ.</p><div v-for="(row,n) in rows" :key="row.id" class="appearance-row"><strong>{{row.label}}</strong><p v-if="row.keys.length>1" class="field-help">{{row.members}}</p><div class="position-grid"><label>Étape<input type="number" min="0" max="20" :value="row.order??''" placeholder="Mixte" :aria-label="'Étape d’apparition '+(n+1)+' · '+row.label" @input="emit('change',row.keys,'order',$event.target.value)"></label><MotionProperties :animation="row.animation" :exit-animation="row.exitAnimation" @change="(field,value)=>emit('change',row.keys,field,value)"/></div><p v-if="row.order===undefined" class="field-help">Étapes différentes : choisis une étape commune pour les faire apparaître ensemble.</p></div></div></template>
