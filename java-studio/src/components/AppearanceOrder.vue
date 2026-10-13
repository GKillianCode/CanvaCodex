<script setup>
import {computed,ref,watch} from 'vue';
import {Shuffle,ChevronRight} from 'lucide-vue-next';
import MotionProperties from './MotionProperties.vue';
import {appearanceRows} from '../appearances.js';
import {animations} from '../motion.js';
const props=defineProps({slide:Object});const emit=defineEmits(['change']);const rows=computed(()=>appearanceRows(props.slide)),active=ref(null),chosen=computed(()=>rows.value.find(row=>row.id===active.value));
const animationName=value=>animations.find(([id])=>id===value)?.[1].replace(' · variation sobre','')||'Mixte';
watch(()=>props.slide.id,()=>active.value=null);
</script>
<template><div class="appearance-order compact-appearances"><div class="appearance-toolbar"><span>{{rows.length}} objet{{rows.length>1?'s':''}} / groupe{{rows.length>1?'s':''}}</span><button class="btn" title="Varier les apparitions sans changer les étapes" @click="emit('change',rows.flatMap(row=>row.keys),'animation','auto')"><Shuffle :size="14"/>Auto</button></div><p class="field-help">0 = visible au départ. Choisis une ligne pour régler son animation.</p><div class="appearance-list"><div v-for="(row,n) in rows" :key="row.id" :class="['appearance-item',{active:active===row.id}]"><input type="number" min="0" max="20" :value="row.order??''" placeholder="—" :aria-label="'Étape d’apparition '+(n+1)+' · '+row.label" @input="emit('change',row.keys,'order',$event.target.value)"><button :aria-label="'Régler les animations : '+row.label" :aria-expanded="active===row.id" @click="active=active===row.id?null:row.id"><span><strong>{{row.label}}</strong><small>{{animationName(row.animation)}}<template v-if="row.exitAnimation&&row.exitAnimation!=='none'"> · sortie {{animationName(row.exitAnimation).toLowerCase()}}</template></small></span><ChevronRight :size="15"/></button></div></div><div v-if="chosen" class="appearance-settings"><strong>{{chosen.label}}</strong><p v-if="chosen.keys.length>1" class="appearance-members">{{chosen.members}}</p><MotionProperties compact :animation="chosen.animation" :exit-animation="chosen.exitAnimation" @change="(field,value)=>emit('change',chosen.keys,field,value)"/></div></div></template>
