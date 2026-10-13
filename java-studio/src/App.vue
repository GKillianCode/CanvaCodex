<script setup>
import { ref, shallowRef, onMounted, onBeforeUnmount } from "vue";
import { applicationFromHash, applicationHash } from "./applicationRoutes.js";
import {
  videoRepository,
  videoRoute,
  videoHash,
  creationSession,
} from "./videoProjects.js";
import StudioApp from "./StudioApp.vue";
import VideoLibrary from "./components/VideoLibrary.vue";
import VideoNotesApp from "./components/VideoNotesApp.vue";
const repository = videoRepository(),
  active = ref(null),
  video = ref(null),
  context = shallowRef(null),
  studio = ref(null),
  notesApp = ref(null),
  loading = ref(true),
  error = ref("");
let generation = 0;
function navigate(hash) {
  window.location.hash = hash;
}
async function syncRoute() {
  const request = ++generation;
  error.value = "";
  try {
    if (studio.value) await studio.value.flush();
    if (notesApp.value) await notesApp.value.flush();
    const route = videoRoute(window.location.hash),
      app = applicationFromHash(window.location.hash);
    if (route?.creationId) {
      loading.value = true;
      const [project, row] = await Promise.all([
        repository.get(route.videoId),
        repository.creation(route.creationId),
      ]);
      if (request !== generation) return;
      if (
        !project ||
        !row ||
        row.videoId !== project.id ||
        row.app !== route.app ||
        !project.creations.some((c) => c.id === row.id && c.app === row.app)
      )
        throw Error("Cette création est introuvable dans la vidéo.");
      const status = ref("saved");
      const storage = creationSession(
        row,
        (snapshot) => repository.saveCreation(snapshot),
        (state, e) => {
          status.value = state;
          if (
            state === "saved" &&
            error.value.startsWith("Sauvegarde de la création impossible.")
          )
            error.value = "";
          if (e)
            error.value =
              "Sauvegarde de la création impossible. Ton travail reste ouvert ; réessaie avant de partir.";
        },
      );
      context.value = {
        storage,
        fileSlot: "video:" + row.id,
        videoName: project.name,
        name: row.name,
        status,
      };
      active.value = row.app;
      video.value = route;
    } else {
      context.value = null;
      active.value = app;
      video.value = route;
    }
    loading.value = false;
  } catch (e) {
    if (request !== generation) return;
    loading.value = false;
    error.value = e.message || "Impossible d’ouvrir cet espace.";
  }
}
function home() {
  navigate(
    video.value?.creationId
      ? videoHash(video.value.videoId)
      : applicationHash(null),
  );
}
async function retry() {
  try {
    if (studio.value) await studio.value.flush();
    error.value = "";
    await syncRoute();
  } catch (e) {
    error.value = e.message;
  }
}
onMounted(() => {
  window.addEventListener("hashchange", syncRoute);
  syncRoute();
});
onBeforeUnmount(() => window.removeEventListener("hashchange", syncRoute));
</script>
<template>
  <div v-if="error" class="video-route-alert" role="alert">
    {{ error }}<button class="btn" @click="retry">Réessayer</button
    ><button v-if="!active" class="btn" @click="navigate('#/')">
      Bibliothèque
    </button>
  </div>
  <div v-if="loading" class="video-loading">Ouverture de ton espace…</div>
  <StudioApp
    v-else-if="active"
    ref="studio"
    :key="context?.fileSlot || active"
    :application="active"
    :creation-context="context"
    @home="home"
  /><VideoNotesApp
    v-else-if="video?.notes"
    ref="notesApp"
    :key="video.videoId + ':notes'"
    :repository="repository"
    :video-id="video.videoId"
    @back="navigate(videoHash(video.videoId))"
  /><VideoLibrary
    v-else
    :key="video?.videoId || 'home'"
    :repository="repository"
    :video-id="video?.videoId"
    @home="navigate('#/')"
    @open-app="(id) => navigate(applicationHash(id))"
    @open-video="(id) => navigate(videoHash(id))"
    @open-notes="(id) => navigate(videoHash(id) + '/notes')"
    @open-creation="(id, app, key) => navigate(videoHash(id, app, key))"
  />
</template>
