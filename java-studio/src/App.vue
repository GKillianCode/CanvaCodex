<script setup>
import {installCatalog,catalogKey} from "./videoCatalog.js";
import { ref, shallowRef, onMounted, onBeforeUnmount, provide } from "vue";
import { applicationFromHash, applicationHash } from "./applicationRoutes.js";
import {
  videoRepository,
  videoRoute,
  videoHash,
  creationSession,
} from "./videoProjects.js";
import { useGlobalModalScroll } from "./modalScroll.js";
import { videoFolderStorage } from "./videoFolders.js";
import UndoNotifications from "./components/UndoNotifications.vue";
import ComponentEditorApp from "./components/ComponentEditorApp.vue";
import StudioApp from "./StudioApp.vue";
import { workflowNavigation, navigateAfterSave } from "./workflowNavigation.js";
import VideoLibrary from "./components/VideoLibrary.vue";
import VideoCanvasApp from "./components/VideoCanvasApp.vue";
import ConductorApp from "./components/ConductorApp.vue";
import PublicationApp from "./components/PublicationApp.vue";
useGlobalModalScroll();
const folderState = ref({
  supported: typeof window.showDirectoryPicker === "function",
  name: "",
  status: "browser",
  error: "",
});
const folders = videoFolderStorage(
  videoRepository(),
  window,
  (value) => (folderState.value = value),
);
const repository = folders.repository,
  active = ref(null),
  video = ref(null),
  context = shallowRef(null),
  studio = ref(null),
  canvasApp = ref(null),
  workflowApp = ref(null),componentApp=ref(null),componentId=ref(null),
  loading = ref(true),
  error = ref("");
const navigationProject = ref(null),
  currentHash = ref(window.location.hash || "#/");
provide(workflowNavigation, {
  project: navigationProject,
  hash: currentHash,
  repository,
  navigate,
});
let generation = 0;
let catalogReady;
function loadCatalog(){return catalogReady ||= repository.getSetting(catalogKey).then(raw=>installCatalog(raw||{}));}
async function navigate(hash) {
  try {
    await navigateAfterSave(
      [studio.value?.flush, canvasApp.value?.flush, workflowApp.value?.flush,componentApp.value?.flush],
      () => {
        window.location.hash = hash;
      },
    );
  } catch (e) {
    error.value =
      e.message ||
      "Le travail en cours doit être enregistré avant de quitter cet atelier.";
    throw e;
  }
}
async function syncRoute() {
  const request = ++generation;
  error.value = "";
  try {
    await loadCatalog();
    if(componentApp.value)await componentApp.value.flush();
    if (studio.value) await studio.value.flush();
    if (canvasApp.value) await canvasApp.value.flush();
    if (workflowApp.value) await workflowApp.value.flush();
    loading.value = true;
    const componentMatch=window.location.hash.match(/^#\/composants\/([\w-]+)$/);
    componentId.value=componentMatch?.[1]||null;
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
        playlist: project.playlist,
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
    navigationProject.value = video.value?.videoId
      ? await repository.get(video.value.videoId)
      : null;
    if (request !== generation) return;
    currentHash.value = window.location.hash || "#/";
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
    if(componentApp.value)await componentApp.value.flush();
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
  <UndoNotifications/>
  <div v-if="folderState.error" class="folder-warning" role="alert">
    {{ folderState.error }} Ta copie dans le navigateur est conservée.<button
      class="btn"
      @click="folders.authorize().catch((e) => { if(e.name !== 'AbortError') folderState.error = e.message; })"
    >
      {{ folderState.needsRelink ? 'Choisir le nouvel emplacement…' : 'Réautoriser / réessayer' }}
    </button><button v-if="folderState.supported && !folderState.needsRelink" class="btn"
      @click="folders.changeFolder().catch((e) => { if(e.name !== 'AbortError') folderState.error = e.message; })">Choisir un autre dossier…</button>
  </div>
  <div v-if="error" class="video-route-alert" role="alert">
    {{ error }}<button class="btn" @click="retry">Réessayer</button
    ><button v-if="!active" class="btn" @click="navigate('#/')">
      Bibliothèque
    </button>
  </div>
  <div v-if="loading" class="video-loading">Ouverture de ton espace…</div>
  <ComponentEditorApp v-else-if="componentId" ref="componentApp" :id="componentId" :key="componentId"/><VideoCanvasApp
    v-else-if="active === 'canvas'"
    ref="canvasApp"
    :repository="repository"
    @home="navigate('#/')"
    @open="(id) => navigate(videoHash(id))"
  />
  <StudioApp
    v-else-if="active"
    ref="studio"
    :key="context?.fileSlot || active"
    :application="active === 'themes' ? 'slides' : active"
    :initial-view="active === 'themes' ? 'themes' : undefined"
    :creation-context="context"
    @home="home"
    @dashboard="navigate('#/')"
  /><component
    :is="video?.workshop === 'conductor' ? ConductorApp : PublicationApp"
    v-else-if="video?.workshop"
    ref="workflowApp"
    :key="video.videoId + ':' + video.workshop + ':' + video.reader"
    :repository="repository"
    :video-id="video.videoId"
    :reader="video.reader"
    @home="navigate('#/')"
    @back="navigate(videoHash(video.videoId))"
    @workshop="(name) => navigate(videoHash(video.videoId) + '/' + name)"
    @open-creation="(id, app, key) => navigate(videoHash(id, app, key))"
  /><VideoLibrary
    v-else
    :key="video?.videoId || 'home'"
    :repository="repository"
    :folders="folders"
    :folder-state="folderState"
    :video-id="video?.videoId"
    @home="navigate('#/')"
    @open-app="(id) => navigate(applicationHash(id))"
    @open-video="(id) => navigate(videoHash(id))"
    @open-workshop="(id, name) => navigate(videoHash(id) + '/' + name)"
    @open-creation="(id, app, key) => navigate(videoHash(id, app, key))"
  />
</template>
