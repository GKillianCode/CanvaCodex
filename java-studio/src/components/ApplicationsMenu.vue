<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount } from "vue";
import {
  workflowNavigation,
  workspaceTools,
  videoDestinations,
} from "../workflowNavigation.js";
const props = defineProps({ disabled: Boolean });
const navigation = inject(workflowNavigation, null),
  root = ref(null),
  opened = ref(false),
  error = ref("");
const emit = defineEmits(["open"]);
const rows = computed(() => [
  ...workspaceTools,
  ...videoDestinations(navigation?.project.value).filter((row) =>
    ["conductor", "publication"].includes(row.id),
  ),
]);
function toggle() {
  if (props.disabled) return;
  opened.value = !opened.value;
  if (opened.value) emit("open");
}
async function go(row) {
  try {
    await navigation?.navigate(row.hash);
    if (!navigation) window.location.hash = row.hash;
    opened.value = false;
    error.value = "";
  } catch (e) {
    error.value = e.message;
  }
}
function outside(e) {
  if (!root.value?.contains(e.target)) opened.value = false;
}
onMounted(() => document.addEventListener("pointerdown", outside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", outside));
</script>
<template>
  <div ref="root" class="app-menu" @keydown.esc.stop="opened = false">
    <button
      class="app-menu-trigger"
      :aria-expanded="opened"
      :disabled="disabled"
      @click="toggle"
    >
      Applications
    </button>
    <div v-if="opened" class="app-menu-popover" aria-label="Applications">
      <button v-for="row in rows" :key="row.id" @click="go(row)">
        {{ row.name }}
      </button>
      <p v-if="error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>
