<script setup>
import { ref, computed, onMounted } from "vue";
import { Music2, Copy, Plus, Trash2 } from "lucide-vue-next";
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
const library = ref([]),
  draft = ref([]),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  manager = ref(null);
const credits = computed(() => musicCredits(library.value, props.modelValue));
async function load() {
  try {
    library.value = normalizeMusicLibrary(
      await props.repository.getSetting(musicLibraryKey),
    );
    draft.value = JSON.parse(JSON.stringify(library.value));
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
function add() {
  if (draft.value.length < 500)
    draft.value.push({
      id: crypto.randomUUID(),
      title: "",
      artist: "",
      url: "",
      license: "",
    });
}
async function save() {
  busy.value = true;
  error.value = "";
  try {
    const rows = normalizeMusicLibrary(draft.value);
    if (rows.some((row) => !row.title))
      throw Error("Donne un titre à chaque musique.");
    await props.repository.setSetting(musicLibraryKey, rows);
    library.value = rows;
    draft.value = JSON.parse(JSON.stringify(rows));
    notice.value = "Bibliothèque de musiques enregistrée.";
    manager.value.open = false;
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
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
      <div class="publication-music-choices">
        <label v-for="row in library" :key="row.id"
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
          Ajoute tes premières musiques dans la bibliothèque ci-dessous.
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
    <details ref="manager" class="publication-music-manager">
      <summary class="btn">Gérer la bibliothèque de musiques</summary>
      <p class="field-help">
        Les changements de cette liste s’appliquent à toutes les vidéos. Retirer
        une musique la retire des blocs de crédits.
      </p>
      <fieldset :disabled="busy || loading">
        <article
          v-for="(row, i) in draft"
          :key="row.id"
          class="publication-music-entry"
        >
          <div>
            <input
              v-model="row.title"
              :aria-label="'Titre de la musique ' + (i + 1)"
              placeholder="Titre"
              maxlength="200"
            /><button
              class="icon-btn"
              :aria-label="'Supprimer la musique ' + (i + 1)"
              @click="draft.splice(i, 1)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
          <input
            v-model="row.artist"
            :aria-label="'Artiste de la musique ' + (i + 1)"
            placeholder="Artiste"
            maxlength="200"
          /><input
            v-model="row.url"
            :aria-label="'Lien de la musique ' + (i + 1)"
            placeholder="Lien"
            maxlength="2000"
          /><textarea
            v-model="row.license"
            :aria-label="'Crédits et licence de la musique ' + (i + 1)"
            placeholder="Crédits ou licence à mentionner"
            rows="2"
            maxlength="2000"
          />
        </article>
        <div class="production-actions">
          <button class="btn" :disabled="draft.length >= 500" @click="add">
            <Plus :size="14" />Ajouter une musique</button
          ><button class="btn" @click="save">
            Enregistrer la bibliothèque
          </button>
        </div>
      </fieldset>
    </details>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>
