<script setup>
import { ref, computed, onMounted, inject } from "vue";
import { workflowNavigation } from "../workflowNavigation.js";
import { Music2, Copy } from "lucide-vue-next";
import {
  musicLibraryKey,
  normalizeMusicLibrary,
  musicCredits,
} from "../publicationMusic.js";
const props = defineProps({
    repository: Object,
    modelValue: { type: Array, default: () => [] },
  }),
  emit = defineEmits(["update:modelValue"]);
const navigation = inject(workflowNavigation, null);
async function manage() {
  sessionStorage.setItem(
    "frame-publication-library-return",
    window.location.hash,
  );
  await navigation?.navigate("#/musiques");
}
const musicSearch = ref("");
const choices = computed(() =>
  library.value
    .filter((row) =>
      (row.title + " " + row.artist)
        .toLowerCase()
        .includes(musicSearch.value.toLowerCase()),
    )
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title, "fr")),
);
const library = ref([]),
  loading = ref(true),
  error = ref(""),
  notice = ref("");
const credits = computed(() => musicCredits(library.value, props.modelValue));
async function load() {
  try {
    library.value = normalizeMusicLibrary(
      await props.repository.getSetting(musicLibraryKey),
    );
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
function select(id, checked) {
  emit(
    "update:modelValue",
    checked
      ? [...new Set([...props.modelValue, id])]
      : props.modelValue.filter((key) => key !== id),
  );
}
async function copy() {
  try {
    await navigator.clipboard.writeText(credits.value);
    notice.value = "Crédits musicaux copiés.";
  } catch {
    notice.value = "Sélectionne le bloc et utilise Ctrl C.";
  }
}
</script>
<template>
  <section class="publication-music">
    <div class="publication-field-label">
      <span><Music2 :size="16" /> Musiques de fond</span
      ><button
        class="icon-btn"
        aria-label="Copier les crédits musicaux"
        title="Copier les crédits musicaux"
        :disabled="!credits"
        @click="copy"
      >
        <Copy :size="16" />
      </button>
    </div>
    <p class="field-help">
      Coche les musiques utilisées dans cette vidéo. La bibliothèque est commune
      à toutes tes vidéos.
    </p>
    <p v-if="loading">Chargement…</p>
    <details v-else class="publication-music-picker">
      <summary class="btn">
        Choisir les musiques
        <span
          >{{
            library.filter((row) => modelValue.includes(row.id)).length
          }}
          sélectionnée(s)</span
        >
      </summary>
      <input
        v-model="musicSearch"
        aria-label="Rechercher une musique"
        placeholder="Rechercher un titre ou un artiste…"
      />
      <div class="publication-music-choices">
        <label v-for="row in choices" :key="row.id"
          ><input
            type="checkbox"
            :checked="modelValue.includes(row.id)"
            @change="select(row.id, $event.target.checked)"
          /><span
            >{{ row.title
            }}<small v-if="row.artist">{{ row.artist }}</small></span
          ></label
        >
        <p v-if="!library.length" class="field-help">
          Ajoute tes premières musiques dans la bibliothèque partagée.
        </p>
      </div>
    </details>
    <textarea
      v-if="credits"
      :value="credits"
      aria-label="Crédits musicaux formatés"
      readonly
      rows="5"
    />
    <button class="btn" @click="manage">
      Gérer la bibliothèque de musiques
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
