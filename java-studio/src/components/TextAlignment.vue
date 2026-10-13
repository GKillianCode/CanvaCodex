<script setup>
import { AlignLeft,AlignCenter,AlignRight,AlignJustify } from 'lucide-vue-next';
defineProps({value:String});const emit=defineEmits(['change']);const options=[['left','À gauche',AlignLeft],['center','Centré',AlignCenter],['right','À droite',AlignRight],['justify','Justifié',AlignJustify]];
</script>
<template><div class="alignment-tools" role="group" aria-label="Alignement du texte"><button v-for="[id,label,icon] in options" :key="id" :aria-label="'Texte : '+label" :title="label" :aria-pressed="value===id" :class="{active:value===id}" @click="emit('change',id)"><component :is="icon" :size="17"/></button></div></template>
