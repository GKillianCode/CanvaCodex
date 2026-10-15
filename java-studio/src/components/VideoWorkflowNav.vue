<script setup>
defineProps({active:String});
const emit=defineEmits(['navigate']);
</script>
<template><nav class="workspace-switch workflow-view-tabs" aria-label="Vues de la vidéo"><button v-for="[id,label] in [['conductor','Conducteur'],['publication','Publication']]" :key="id" :class="{active:active===id}" :aria-current="active===id?'page':undefined" @click="active!==id&&emit('navigate',id)">{{label}}</button></nav></template>
