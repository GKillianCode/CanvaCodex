<script setup>
import {installCatalog,catalogKey} from "./videoCatalog.js";
import { ref, shallowRef, onMounted, onBeforeUnmount, provide, defineAsyncComponent } from "vue";
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
const ComponentEditorApp = defineAsyncComponent(() => import("./components/ComponentEditorApp.vue"));
import WorkshopLoadError from "./components/WorkshopLoadError.vue";
const DesignStudioApp = defineAsyncComponent({loader:() => import("./components/DesignStudioApp.vue"),errorComponent:WorkshopLoadError,timeout:20000});
const designApp = ref(null);
const StudioApp = defineAsyncComponent(() => import("./StudioApp.vue"));
import { workflowNavigation, navigateAfterSave } from "./workflowNavigation.js";
const PublicationLibraryApp = defineAsyncComponent(() => import("./components/PublicationLibraryApp.vue"));
const FreeNotesApp = defineAsyncComponent(() => import("./components/FreeNotesApp.vue"));
import VideoLibrary from "./components/VideoLibrary.vue";
const VideoCanvasApp = defineAsyncComponent(() => import("./components/VideoCanvasApp.vue"));
const ConductorApp = defineAsyncComponent(() => import("./components/ConductorApp.vue"));
const PublicationApp = defineAsyncComponent(() => import("./components/PublicationApp.vue"));
const WorkspaceBackupDialog = defineAsyncComponent(() => import('./components/WorkspaceBackupDialog.vue'));
const backupVisible = ref(false), restoredVersion = ref(0);
async function restored() { catalogReady = null; await loadCatalog(); restoredVersion.value++; }
async function flushCurrent() {
  for (const app of [designApp.value,resourceApp.value, studio.value, canvasApp.value, workflowApp.value, componentApp.value, notesApp.value]) await app?.flush?.();
}
async function openBackup() {
  try { await flushCurrent(); backupVisible.value=true; }
  catch(e) { error.value=e.message; }
}
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
  notesApp=ref(null),resourceApp=ref(null),
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
  openBackup,
});
let generation = 0;
let catalogReady;
function loadCatalog(){return catalogReady ||= repository.getSetting(catalogKey).then(raw=>installCatalog(raw||{}));}
async function navigate(hash) {
  try {
    await navigateAfterSave(
      [designApp.value?.flush,resourceApp.value?.flush,studio.value?.flush, canvasApp.value?.flush, workflowApp.value?.flush,componentApp.value?.flush,notesApp.value?.flush],
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
    if(designApp.value)await designApp.value.flush();
    if(resourceApp.value)await resourceApp.value.flush();
    if(notesApp.value)await notesApp.value.flush();
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
      active.value = app === 'playlists' ? null : app;
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
  <WorkspaceBackupDialog v-if="backupVisible" :repository="repository" @close="backupVisible=false" @restored="restored"/>
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
    :key="restoredVersion"
    ref="canvasApp"
    :repository="repository"
    @home="navigate('#/')"
    @open="(id) => navigate(videoHash(id))"
  />
  <PublicationLibraryApp v-else-if="['music','descriptionTemplates'].includes(active)" :key="active" ref="resourceApp" :repository="repository" :kind="active==='music'?'music':'templates'" @home="navigate('#/')"/>
  <FreeNotesApp v-else-if="active==='notes'" :key="currentHash + restoredVersion" ref="notesApp" :repository="repository" :note-id="currentHash.match(/^#\/notes\/([\w-]+)$/)?.[1]||''" @home="navigate('#/')" @open="id=>navigate(id?'#/notes/'+id:'#/notes')"/>
  <DesignStudioApp v-else-if="['vector','layout'].includes(active)" ref="designApp" :key="active + restoredVersion" :kind="active" :repository="repository" :document-id="currentHash.match(/^#\/(?:vectoriel|mise-en-page)\/([\w-]+)$/)?.[1]||''" @home="navigate('#/')"/>
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
    :key="(video?.videoId || 'home') + restoredVersion"
    :repository="repository"
    :folders="folders"
    :folder-state="folderState"
    :video-id="video?.videoId"
    :show-playlists="currentHash === '#/playlists'"
    @home="navigate('#/')"
    @open-app="(id) => navigate(applicationHash(id))"
    @open-video="(id) => navigate(videoHash(id))"
    @open-workshop="(id, name) => navigate(videoHash(id) + '/' + name)"
    @open-creation="(id, app, key) => navigate(videoHash(id, app, key))"
  />
</template>
