<script setup>
import { ref, computed } from "vue";
import { MAX_NOTES } from "../presentationNotes.js";
import { renderNotebook } from "../notebookMarkdown.js";
const props = defineProps({
  modelValue: String,
  savedValue: String,
  busy: Boolean,
});
const emit = defineEmits(["update:modelValue", "save"]);
const mode = ref("split");
const html = computed(() => renderNotebook(props.modelValue));
const words = computed(
  () => (props.modelValue || "").trim().split(/\s+/).filter(Boolean).length,
);
</script>
<template>
  <section class="video-notebook">
    <header>
      <div>
        <span class="eyebrow">PRÉPARATION</span>
        <h2>Carnet de la vidéo</h2>
        <p>Idées, plan du cours, script et sources, dans une seule page.</p>
      </div>
      <button class="btn primary" :disabled="busy" @click="emit('save')">
        Enregistrer le carnet
      </button>
    </header>
    <div class="notebook-tools">
      <div role="group" aria-label="Affichage du carnet">
        <button
          v-for="[id, label] in [
            ['write', 'Écrire'],
            ['split', 'Écrire et lire'],
            ['read', 'Lire'],
          ]"
          :key="id"
          class="btn"
          :aria-pressed="mode === id"
          :class="{ active: mode === id }"
          @click="mode = id"
        >
          {{ label }}
        </button>
      </div>
      <small
        >{{ words }} mots · Markdown ·
        {{
          modelValue === savedValue
            ? "Enregistré"
            : "Modifications à enregistrer"
        }}</small
      >
    </div>
    <div class="notebook-page" :class="mode">
      <textarea
        v-if="mode !== 'read'"
        :value="modelValue"
        :maxlength="MAX_NOTES"
        aria-label="Carnet vidéo en Markdown"
        placeholder="# Objectif de la vidéo&#10;&#10;## Plan&#10;- Introduction&#10;- Démonstration&#10;&#10;## Script&#10;&#10;## Sources"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown.ctrl.s.prevent="emit('save')"
        @keydown.meta.s.prevent="emit('save')"
      />
      <article
        v-if="mode !== 'write'"
        class="markdown-notes"
        v-html="
          html ||
          '<p>Ton carnet est vide. Commence par le plan ou une idée.</p>'
        "
      />
    </div>
  </section>
</template>
