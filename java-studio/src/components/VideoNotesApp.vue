<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import VideoWorkflowNav from "./VideoWorkflowNav.vue";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import VideoNotebook from "./VideoNotebook.vue";
const props = defineProps({ repository: Object, videoId: String });
const emit = defineEmits(["back", "workshop"]);
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
function exportMarkdown() {
  const blob = new Blob([notes.value], { type: "text/markdown;charset=utf-8" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "carnet.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function goWorkshop(name){try{await flush();emit("workshop",name);}catch(e){error.value=e.message;}}
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
  <main
    class="video-notes-app"
    @keydown.ctrl.s.prevent="save"
    @keydown.meta.s.prevent="save"
  >
    <WorkspaceHeader title="Carnet" back-label="Vidéo" @back="back"
      ><template #context
        ><span class="creation-context-name">{{
          project?.name
        }}</span></template
      ><template #file
        ><button :disabled="busy" @click="save">
          Enregistrer le carnet · Ctrl S</button
        ><button @click="exportMarkdown">Exporter en Markdown</button></template
      ><template #actions
        ><span class="save-state">{{
          dirty ? "Modifications à enregistrer" : "Carnet sauvegardé"
        }}</span></template
      ></WorkspaceHeader
    >
    <VideoWorkflowNav active="notes" @navigate="goWorkshop"/>
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
