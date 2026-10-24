<script setup>
import { Pencil, Copy, Lock, LockOpen, Trash2 } from "lucide-vue-next";
defineProps({
  edit: Function,
  duplicate: Function,
  toggleLock: Function,
  remove: Function,
  locked: Boolean,
});
</script>
<template>
  <div class="selection-actions">
    <button
      v-if="edit"
      class="icon-btn"
      aria-label="Éditer le contenu"
      title="Éditer le contenu"
      @click="edit"
    >
      <Pencil :size="15" /></button
    ><button
      v-if="duplicate"
      class="icon-btn"
      aria-label="Dupliquer la sélection"
      title="Dupliquer · Ctrl D"
      @click="duplicate"
    >
      <Copy :size="15" /></button
    ><button
      v-if="toggleLock"
      class="icon-btn"
      :aria-label="
        locked ? 'Déverrouiller la sélection' : 'Verrouiller la sélection'
      "
      :title="locked ? 'Déverrouiller' : 'Verrouiller le placement'"
      @click="toggleLock"
    >
      <component :is="locked ? Lock : LockOpen" :size="15" /></button
    ><button
      v-if="remove"
      class="icon-btn"
      aria-label="Supprimer la sélection"
      title="Supprimer"
      @click="remove"
    >
      <Trash2 :size="15" />
    </button>
  </div>
</template>
<style scoped>
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  flex-wrap: wrap;
}
.selection-actions > .icon-btn {
  border: 1px solid var(--border);
}
</style>
