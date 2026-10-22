<script setup>
defineProps({ studio: Object });
</script>
<template>
  <div class="group-layout">
    <button class="btn full" @click="studio.centerObjects('x')">
      Centrer horizontalement</button
    ><button class="btn full" @click="studio.centerObjects('y')">
      Centrer verticalement</button
    ><button class="btn full" @click="studio.arrangeObjects('x', 'line')">
      Disposer en ligne</button
    ><button class="btn full" @click="studio.arrangeObjects('y', 'line')">
      Disposer en colonne</button
    ><label
      >Espacement · px<input
        type="number"
        min="0"
        v-model.number="studio.spacing"
        aria-label="Espacement des éléments" /></label
    ><button class="btn full" @click="studio.arrangeObjects('x', 'spacing')">
      Espacer horizontalement</button
    ><button class="btn full" @click="studio.arrangeObjects('y', 'spacing')">
      Espacer verticalement</button
    ><button class="btn full" @click="studio.groupObjects">
      Grouper · Ctrl G</button
    ><button
      v-if="studio.canUngroup"
      class="btn full"
      @click="studio.ungroupObjects"
    >
      Dissocier · Ctrl Maj G</button
    ><button class="btn full" @click="studio.copySelection">
      Copier · Ctrl C
    </button>
  </div>
</template>
