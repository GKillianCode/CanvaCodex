<script setup>
import { ref } from "vue";
import { Copy } from "lucide-vue-next";
const props = defineProps({
  title: String,
  description: String,
  comment: String,
  tags: String,
});
const emit = defineEmits(["copy"]);
const shown = ref("description");
</script>
<template>
  <section
    class="publication-final-preview"
    aria-label="Aperçu de la publication"
  >
    <div class="publication-preview-tools">
      <nav class="workspace-switch" aria-label="Texte à prévisualiser">
        <button
          :class="{ active: shown === 'description' }"
          @click="shown = 'description'"
        >
          Description</button
        ><button
          :class="{ active: shown === 'comment' }"
          @click="shown = 'comment'"
        >
          Commentaire épinglé</button
        ><button
          v-if="tags"
          :class="{ active: shown === 'tags' }"
          @click="shown = 'tags'"
        >
          Tags YouTube
        </button>
      </nav>
      <button
        class="btn"
        @click="
          emit(
            'copy',
            shown === 'description'
              ? description
              : shown === 'comment'
                ? comment
                : tags,
            shown === 'description'
              ? 'Description'
              : shown === 'comment'
                ? 'Commentaire'
                : 'Tags',
          )
        "
      >
        <Copy :size="15" />Copier
      </button>
    </div>
    <article class="publication-preview-page">
      <h1>{{ title }}</h1>
      <div
        class="publication-final-text"
        :aria-label="
          shown === 'description'
            ? 'Description finale'
            : shown === 'comment'
              ? 'Commentaire final'
              : 'Tags finaux'
        "
      >
        {{
          (shown === "description"
            ? description
            : shown === "comment"
              ? comment
              : tags) || "Aucun texte à afficher pour le moment."
        }}
      </div>
    </article>
    <p v-if="shown === 'description'" class="publication-character-count">
      {{ description.length.toLocaleString("fr-FR") }} / 5 000 caractères
    </p>
  </section>
</template>
