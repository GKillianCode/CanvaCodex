<script setup>
import { animations,exits } from '../motion.js';
defineProps({animation:String,exitAnimation:String});const emit=defineEmits(['change']);
</script>
<template><label>Apparition<select aria-label="Animation d’apparition" :value="animation??''" @change="emit('change','animation',$event.target.value)"><option disabled value="">Mixte</option><option v-for="[id,label] in animations" :key="id" :value="id">{{label}}</option></select></label><label>Disparition au retour<select aria-label="Animation de disparition" :value="exitAnimation??'none'" @change="emit('change','exitAnimation',$event.target.value)"><option v-for="[id,label] in exits" :key="id" :value="id">{{label}}</option></select></label><p class="field-help">Variation automatique stable, synchronisée dans les groupes. La disparition s’applique en revenant d’une étape (Retour arrière).</p></template>
