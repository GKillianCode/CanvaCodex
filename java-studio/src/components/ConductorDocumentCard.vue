<script setup>
import { ref } from "vue";
import { ArrowUpRight, FileText, NotebookPen } from "lucide-vue-next";
import ConductorPage from "./ConductorPage.vue";
const props = defineProps({
  modelValue: String,
  layout: Array,
  images: Array,
  otherContent: String,
  maxLength: { type: Number, default: 50000 },
  label: String,
  privateNotes: Boolean,
});
const emit = defineEmits([
  "update:modelValue",
  "update:layout",
  "update:images",
  "error",
]);
const opened = ref(false),
  page = ref(null);
async function flush() {
  await page.value?.flush();
}
defineExpose({ flush });
</script>
<template>
  <section class="conductor-document-card">
    <button
      class="document-card-open"
      :aria-label="'Ouvrir ' + label"
      @click="opened = true"
    >
      <header>
        <span
          ><NotebookPen v-if="privateNotes" :size="20" /><FileText
            v-else
            :size="20"
          /><strong>{{ label }}</strong></span
        ><ArrowUpRight :size="19" />
      </header>
      <div class="document-card-preview" aria-hidden="true">
        <img class="document-card-art" :src="privateNotes?'/illustrations/conductor-cues.svg':'/illustrations/conductor-script.svg'" alt="" loading="lazy"/>
      </div>
      <footer>
        <span>{{
          privateNotes
            ? "Consignes privées de tournage"
            : "Le fil de ton intervention"
        }}</span
        ><strong>Ouvrir l’éditeur ↗</strong>
      </footer>
    </button>
    <Teleport to="body"
      ><div
        v-if="opened"
        class="conductor-editor-dialog production-app"
        role="dialog"
        aria-modal="true"
        :aria-label="'Éditeur · ' + label"
      >
        <ConductorPage
          ref="page"
          start-expanded
          :model-value="modelValue"
          :layout="layout"
          :images="images"
          :other-content="otherContent"
          :max-length="maxLength"
          :label="label"
          @update:model-value="emit('update:modelValue', $event)"
          @update:layout="emit('update:layout', $event)"
          @update:images="emit('update:images', $event)"
          @error="emit('error', $event)"
          @close="opened = false"
        /></div
    ></Teleport>
  </section>
</template>
