<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import { ArrowLeft } from "lucide-vue-next";
import VideoNotebook from "./VideoNotebook.vue";
const props = defineProps({ repository: Object, videoId: String });
const emit = defineEmits(["back"]);
const project = ref(null),
  notes = ref(""),
  saved = ref(""),
  busy = ref(false),
  error = ref(""),
  loading = ref(true);
const dirty = computed(() => notes.value !== saved.value);
async function load() {
  try {
    const value = await props.repository.get(props.videoId);
    if (!value) throw Error("Cette vidéo est introuvable.");
    project.value = value;
    notes.value = value.notes || "";
    saved.value = notes.value;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (busy.value || !project.value) return;
  busy.value = true;
  error.value = "";
  const value = notes.value;
  try {
    const current = await props.repository.get(props.videoId);
    if (!current) throw Error("Cette vidéo est introuvable.");
    current.notes = value;
    current.updatedAt = Date.now();
    await props.repository.put(current);
    project.value = current;
    saved.value = value;
  } catch (e) {
    error.value = e.message || "Impossible d’enregistrer le carnet.";
  } finally {
    busy.value = false;
  }
}
async function back() {
  if (dirty.value) await save();
  if (!busy.value && !dirty.value) emit("back");
}
function beforeUnload(event) {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
async function flush() {
  if (dirty.value) await save();
  if (dirty.value || busy.value)
    throw Error("Le carnet n’a pas été enregistré. Réessaie avant de quitter.");
}
defineExpose({ flush });
onMounted(() => {
  window.addEventListener("beforeunload", beforeUnload);
  load();
});
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>
<template>
  <main class="video-notes-app">
    <header class="notebook-app-header">
      <button class="btn" @click="back">
        <ArrowLeft :size="16" />Retour à la vidéo
      </button>
      <div>
        <span class="eyebrow">CARNET · ATELIER D’ÉCRITURE</span>
        <h1>{{ project?.name || "Carnet vidéo" }}</h1>
      </div>
      <span>{{
        dirty ? "Modifications à enregistrer" : "Enregistré sur cet appareil"
      }}</span>
    </header>
    <div v-if="error" class="video-alert" role="alert">
      {{ error
      }}<button class="btn" @click="project ? save() : load()">
        Réessayer
      </button>
    </div>
    <p v-if="loading">Ouverture du carnet…</p>
    <VideoNotebook
      v-else-if="project"
      v-model="notes"
      :saved-value="saved"
      :busy="busy"
      @save="save"
    />
  </main>
</template>
