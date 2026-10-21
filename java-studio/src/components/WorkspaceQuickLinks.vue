<script setup>
import { inject } from "vue";
import { workflowNavigation } from "../workflowNavigation.js";
const navigation = inject(workflowNavigation, null);
const links = [
  { label: "Playlists", hash: "#/playlists" },
  { label: "Notes", hash: "#/notes" },
  { label: "Parcours", hash: "#/parcours" },
];
function open(hash) {
  if (navigation) navigation.navigate(hash).catch(() => {});
  else window.location.hash = hash;
}
</script>
<template>
  <nav
    class="workspace-nav-cluster workspace-quick-links"
    aria-label="Accès rapides"
  >
    <button
      v-for="link in links"
      :key="link.hash"
      class="app-menu-trigger"
      :aria-current="
        navigation?.hash?.value?.startsWith(link.hash) ? 'page' : undefined
      "
      @click="open(link.hash)"
    >
      {{ link.label }}
    </button>
  </nav>
</template>
<style scoped>
.workspace-quick-links {
  flex-shrink: 0;
}
.workspace-quick-links button[aria-current="page"] {
  background: color-mix(in srgb, var(--mint) 12%, transparent);
}
</style>
