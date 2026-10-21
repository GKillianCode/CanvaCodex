<script setup>
import { ArrowLeft } from "lucide-vue-next";
defineProps({ name: String });
const emit = defineEmits(["back"]);
</script>
<template>
  <button
    type="button"
    class="creation-context-name video-context-return"
    :aria-label="'Revenir à la fiche vidéo' + (name ? ' : ' + name : '')"
    title="Revenir à la fiche vidéo"
    @click="emit('back')"
  >
    <ArrowLeft :size="14" /><span>{{ name || "Fiche vidéo" }}</span>
  </button>
</template>

<style scoped>
.video-context-return {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  min-width: 0;
  text-align: left;
}
.video-context-return > svg {
  flex-shrink: 0;
  opacity: 0.7;
}
.video-context-return > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.video-context-return:hover > span {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.video-context-return:focus-visible {
  outline: 2px solid var(--mint);
  outline-offset: 3px;
}
</style>
