<script setup>
import { slideAnchors } from "../slidePlacement.js";
defineProps({ disabled: Boolean });
const emit = defineEmits(["place"]);
</script>
<template>
  <div class="slide-anchor-grid">
    <button
      v-for="[x, y, label, icon] in slideAnchors"
      :key="x + y"
      class="btn"
      :aria-label="label.replace('diapo', 'page')"
      :title="label.replace('diapo', 'page')"
      :disabled="disabled"
      @click="emit('place', x, y)"
    >
      <span aria-hidden="true">{{ icon }}</span
      ><small>{{ label.replace("diapo", "page") }}</small>
    </button>
  </div>
</template>
