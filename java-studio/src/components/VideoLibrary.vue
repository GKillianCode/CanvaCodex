<script setup>
import {libraryPreferenceKey, readLibraryView, parseVideoSearch, matchesVideoSearch, activeSearchField, fold} from '../videoSearch.js';
import {useUndoNotifications} from "../undoNotifications.js";
import { ref, computed, watch, onMounted, nextTick } from "vue";
import {
  Plus,
  ArrowLeft,
  ArrowUpRight,
  PanelsTopLeft,
  Clapperboard,
  Image,
  FolderOpen,
  Search,
  Copy,
  Trash2,
  Archive,
  Download,
  Upload,
  MoreHorizontal,
  Film,
  ListVideo,
  Send,
  X,
} from "lucide-vue-next";
import { applications, applicationStorage } from "../applicationDocuments.js";
import { workspaceKeys } from "../workspaceStorage.js";
import {
  makeVideoProject,
  videoTypes,
  videoTypeTitle,
  makeCreation,
  attachCreation,
  videoBundle,
  importVideoBundle,
  videoStatuses,
  sortVideos,
  documentFromStorage,
  clone,
} from "../videoProjects.js";
import LibraryPreview from "./LibraryPreview.vue";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import PlaylistOrder from "./PlaylistOrder.vue";
import VideoWorkflowOverview from "./VideoWorkflowOverview.vue";
const props = defineProps({
    repository: Object,
    videoId: String,
    folders: Object,
    folderState: Object,
  }),
  emit = defineEmits([
    "open-video",
    "open-workshop",
    "open-creation",
    "open-app",
    "home",
  ]);
const initialView = readLibraryView(window.localStorage);
const pageSize = ref(initialView.pageSize), searchInput = ref(null), searchFocused=ref(false), caret=ref(initialView.query.length), suggestionIndex=ref(0);
const projects = ref([]),
  creations = ref([]),
  busy = ref(false),
  error = ref(""),
  query = ref(initialView.query),
  playlist = ref(""),
  archives = ref(initialView.archives),
  modal = ref(null),
  name = ref(""),
  app = ref("slides"),
  copyCurrent = ref(false),
  draft = ref(null),
  icons = { animation: Clapperboard, slides: PanelsTopLeft, banners: Clapperboard, thumbnails: Image };
const creationFilter=ref('all'),notices=useUndoNotifications();
watch(() => props.videoId,()=>notices.clear());
const newVideoType = ref("");
const starterApps = ref(["slides", "banners", "thumbnails"]);
const browserOnly = ref(false);
const selected = ref(null),
  playlists = ref([]),
  page = ref(initialView.page),
  sortMode = ref(initialView.sortMode),
  importFiles = ref({}),
  playlistName = ref(""),
  newPlaylist = ref("");
const visibleStatuses = ref(initialView.visibleStatuses);
const parsedSearch=computed(()=>parseVideoSearch(query.value));
const filtered = computed(() =>
  sortVideos(
    projects.value.filter(
      (p) =>
        p.archived === archives.value &&
        visibleStatuses.value.includes(p.status) &&
        (!playlist.value ||
          p.playlist ===
            (playlist.value === "__none__" ? "" : playlist.value)) &&
        matchesVideoSearch(p, parsedSearch.value),
    ),
    sortMode.value,
  ),
);
const pages = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / pageSize.value)),
  ),
  paged = computed(() =>
    filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
  );
watch(
  [query, playlist, archives, sortMode, visibleStatuses, pageSize],
  () => (page.value = 1),
  {deep:true},
);
watch([query,archives,sortMode,visibleStatuses,pageSize,page],()=>{
 try {localStorage.setItem(libraryPreferenceKey,JSON.stringify({query:query.value,archives:archives.value,sortMode:sortMode.value,visibleStatuses:visibleStatuses.value,pageSize:pageSize.value,page:page.value}));}catch{}
},{deep:true});
const activeSearch = computed(()=>activeSearchField(query.value,caret.value));
const suggestions = computed(()=>{
 const active=activeSearch.value;if(!active)return [];
 const values=active.field==='playlist'?[...playlists.value,'Sans playlist']:active.field==='type'?['Non défini',...videoTypes.map(([,title])=>title)]:projects.value.map(p=>p.name);
 return [...new Set(values)].filter(v=>fold(v).includes(active.value)).slice(0,20);
});
watch(suggestions,()=>suggestionIndex.value=0);
function updateCaret(event){caret.value=event.target.selectionStart??query.value.length;}
async function chooseSuggestion(value){
 const active=activeSearch.value;if(!active)return;
 const prefix=active.field==='video'?'vidéo':active.field;
 const replacement=prefix+':'+JSON.stringify(value)+' ';
 query.value=query.value.slice(0,active.start)+replacement+query.value.slice(active.end);
 const next=active.start+replacement.length;
 await nextTick();searchInput.value?.focus();searchInput.value?.setSelectionRange(next,next);caret.value=next;
}
function searchKey(event){
 if(event.key==='Escape'){searchFocused.value=false;return;}
 if(!searchFocused.value||!suggestions.value.length)return;
 if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const delta=event.key==='ArrowDown'?1:-1;suggestionIndex.value=(suggestionIndex.value+delta+suggestions.value.length)%suggestions.value.length;}
 else if(event.key==='Enter'){event.preventDefault();chooseSuggestion(suggestions.value[suggestionIndex.value]);}
}
let retryAction = null;
watch(modal, async (value) => {
  if (value) {
    await nextTick();
    document
      .querySelector(".video-modal input:not([type=file]):not([type=checkbox])")
      ?.focus();
  }
  if (!value) {
    error.value = "";
    retryAction = null;
  }
});
const date = (value) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    value,
  );
const status = (id) =>
  videoStatuses.find(([key]) => key === id)?.[1] || "Création";
async function savePreview(row, image) {
  try {
    const meta = selected.value?.creations.find((c) => c.id === row.id);
    if (meta?.preview === image) return;
    await props.repository.preview(props.videoId, row.id, image);
    if (meta) {
      meta.preview = image;
      if (selected.value.creations[0]?.id === row.id)
        selected.value.preview = image;
    }
  } catch {}
}
async function reload() {
  [projects.value, playlists.value] = await Promise.all([
    props.repository.list(),
    props.repository.playlists(),
  ]);
  selected.value = props.videoId
    ? await props.repository.get(props.videoId)
    : null;
  creations.value = selected.value?.creations || [];
  draft.value = selected.value ? clone(selected.value) : null;

  page.value = Math.min(page.value, pages.value);
}
async function run(action) {
  if (busy.value) return;
  retryAction = action;
  busy.value = true;
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = e.message || "L’opération n’a pas pu être sauvegardée.";
  } finally {
    busy.value = false;
  }
}
onMounted(() => run(reload));
watch(
  () => props.videoId,
  () => run(reload),
);
function newVideo() {
  name.value = "";
  importFiles.value = {};
  starterApps.value = ["slides", "banners", "thumbnails"];
  browserOnly.value = false;
  newPlaylist.value = playlists.value[0] || "";
  newVideoType.value = "";
  modal.value = { type: "video" };
}
function newCreation(kind) {
  app.value = kind;
  name.value = "";
  copyCurrent.value = false;
  browserOnly.value = false;
  modal.value = { type: "creation" };
}
function renameCreation(row) {
  name.value = row.name;
  modal.value = { type: "rename", row };
}
async function importDocument(file, project, kind) {
  if (file.size > 256 * 1024 * 1024) throw Error("Le document dépasse 256 Mo.");
  const raw = JSON.parse(await file.text()),
    row = makeCreation(
      project,
      kind,
      raw.project || file.name.replace(/\.json$/i, ""),
      raw,
    );
  attachCreation(project, row);
  return row;
}
async function importCreation(event, kind) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  await run(async () => {
    const project = await props.repository.get(props.videoId),
      row = await importDocument(file, project, kind);
    await props.repository.put(project, [row]);
    await reload();
  });
}
function editPlaylist(previous = null, returnToPlaylist = false) {
  playlistName.value = previous || "";
  modal.value = { type: "playlist", previous, returnToPlaylist };
}
async function removePlaylist(previous) {
  await run(async () => {
    await props.repository.editPlaylist(previous, null);
    if (playlist.value === previous) playlist.value = "";
    await reload();
    modal.value = { type: "playlists" };
  });
}
async function savePlaylist() {
  await run(async () => {
    const previous = modal.value.previous,
      returnToPlaylist = modal.value.returnToPlaylist;
    await props.repository.editPlaylist(previous, playlistName.value);
    if (playlist.value === previous) playlist.value = playlistName.value.trim();
    await reload();
    modal.value = returnToPlaylist
      ? { type: "playlist-view", playlist: playlistName.value.trim() }
      : { type: "playlists" };
  });
}
async function submit() {
  await run(async () => {
    if (!name.value.trim()) throw Error("Donne un nom à ta création.");
    if (
      ["video", "creation"].includes(modal.value.type) &&
      props.folderState?.supported &&
      !browserOnly.value &&
      (!props.folderState.name ||
        ["check", "error"].includes(props.folderState.status))
    )
      await props.folders.authorize();
    if (modal.value.type === "video") {
      const project = makeVideoProject(name.value);
      project.playlist = newPlaylist.value;
      project.videoType = newVideoType.value;
      const rows = [];
      for (const a of applications) {
        if (importFiles.value[a.id])
          rows.push(
            await importDocument(importFiles.value[a.id], project, a.id),
          );
        else if (starterApps.value.includes(a.id)) {
          const row = makeCreation(project, a.id, a.name);
          attachCreation(project, row);
          rows.push(row);
        }
      }
      await props.repository.put(project, rows);
      modal.value = null;
      importFiles.value = {};
      emit("open-video", project.id);
      await reload();
    } else if (modal.value.type === "video-rename") {
      const original = modal.value,
        project = await props.repository.get(original.row.id);
      project.name = name.value.trim().slice(0, 200);
      project.updatedAt = Date.now();
      await props.repository.put(project);
      await reload();
      modal.value = { type: "playlist-view", playlist: original.playlist };
    } else if (modal.value.type === "creation") {
      const project = await props.repository.get(props.videoId);
      let source = null;
      if (copyCurrent.value) {
        const scoped = applicationStorage(window.localStorage, app.value),
          key = workspaceKeys[app.value === "banners" ? "banners" : "slides"],
          raw = scoped.getItem(key);
        if (!raw)
          throw Error(
            "Cet atelier n’a pas encore de création sauvegardée. Ouvre-le une fois ou importe un JSON dans la nouvelle création.",
          );
        source = documentFromStorage(
          {
            [app.value === "animation" ? "frame-animation:" + key : app.value === "thumbnails" ? "frame-thumbnails:" + key : key]: raw,
          },
          app.value,
        );
      }
      const row = makeCreation(project, app.value, name.value, source);
      attachCreation(project, row);
      await props.repository.put(project, [row]);
      modal.value = null;
      await reload();
      emit("open-creation", project.id, row.app, row.id);
    } else {
      const row = await props.repository.creation(modal.value.row.id),
        doc = documentFromStorage(row.storage, row.app),
        storage = applicationStorage(
          {
            getItem: (k) => row.storage[k] ?? null,
            setItem: (k, v) => (row.storage[k] = v),
            removeItem: (k) => delete row.storage[k],
          },
          row.app,
        );
      doc.project = name.value.trim().slice(0, 200);
      row.name = doc.project;
      storage.setItem(
        workspaceKeys[row.app === "banners" ? "banners" : "slides"],
        JSON.stringify({
          ...doc,
          kind: row.app === "banners" ? "banners" : "slides",
        }),
      );
      await props.repository.saveCreation(row);
      modal.value = null;
      await reload();
    }
  });
}
const playlistRows = computed(() =>
  sortVideos(
    projects.value.filter((p) => p.playlist === modal.value?.playlist),
    "playlist",
  ),
);
function openPlaylist(value) {
  error.value = "";
  modal.value = { type: "playlist-view", playlist: value };
}
async function movePlaylistVideo(id, position) {
  await run(async () => {
    await props.repository.moveVideo(id, position);
    await reload();
  });
}
function openPlaylistVideo(id) {
  modal.value = null;
  emit("open-video", id);
}
function renamePlaylistVideo(row) {
  name.value = row.name;
  modal.value = { type: "video-rename", row, playlist: modal.value.playlist };
}
async function removePlaylistVideo(row) {
  await run(async () => {
    const project = await props.repository.get(row.id);
    project.playlist = "";
    project.updatedAt = Date.now();
    await props.repository.put(project);
    await reload();
  });
}
async function changeVideoPlaylist(id, playlist) {
  await run(async () => {
    const project = await props.repository.get(id);
    project.playlist = playlist;
    project.updatedAt = Date.now();
    await props.repository.put(project);
    await reload();
  });
}
async function saveDetails() {
  await run(async () => {
    const project = await props.repository.get(props.videoId);
    Object.assign(project, {
      name: draft.value.name.trim() || project.name,
      playlist: draft.value.playlist,
      status: draft.value.status,
      videoType: draft.value.videoType,
      notes: draft.value.notes,
      updatedAt: Date.now(),
    });
    await props.repository.put(project);
    await reload();
  });
}
async function archive(project) {
  await run(async () => {
    const current = await props.repository.get(project.id);
    current.archived = !current.archived;
    current.updatedAt = Date.now();
    await props.repository.put(current);
    await reload();
  });
}
async function duplicate(project) {
  await run(async () => {
    const current = await props.repository.get(project.id),
      rows = await props.repository.allCreations(project.id),
      copy = importVideoBundle(videoBundle(current, rows), { duplicate: true });
    await props.repository.put(copy.project, copy.creations);
    await reload();
    emit("open-video", copy.project.id);
  });
}
async function removeCreation(row) {
  if(busy.value||!window.confirm(`Supprimer « ${row.name} » de cette vidéo ? Les fichiers déjà exportés sont conservés.`))return;
  await run(async()=>{
    const index=selected.value.creations.findIndex(item=>item.id===row.id),before=selected.value.creations[index-1]?.id,after=selected.value.creations[index+1]?.id;
    const removed=await props.repository.removeCreation(props.videoId,row.id);
    await reload();
    if(removed)notices.push('« '+removed.meta.name+' » supprimée.',()=>restoreCreation(removed,before,after),()=>!busy.value);
  });
}
async function restoreCreation(removed,before,after) {
  let restored=false;
  await run(async()=>{
    if(!removed||removed.videoId!==props.videoId)return;
    const project=await props.repository.get(props.videoId);
    if(project.creations.length>=100)throw Error("Limite de 100 créations par vidéo.");
    const next=project.creations.findIndex(item=>item.id===after),previous=project.creations.findIndex(item=>item.id===before);
    if(!project.creations.some(row=>row.id===removed.row.id))project.creations.splice(next>=0?next:previous>=0?previous+1:removed.index,0,removed.meta);
    project.preview=project.creations[0]?.preview||null;project.updatedAt=Date.now();
    await props.repository.put(project,[removed.row]);
    await reload();restored=true;
  });
  return restored;
}
async function duplicateCreation(row) {
  await run(async () => {
    const project = await props.repository.get(props.videoId),
      copy = makeCreation(
        project,
        row.app,
        row.name + " · copie",
        documentFromStorage(
          (await props.repository.creation(row.id)).storage,
          row.app,
        ),
      );
    attachCreation(project, copy);
    await props.repository.put(project, [copy]);
    await reload();
  });
}
async function exportVideo(project) {
  await run(async () => {
    const current = await props.repository.get(project.id),
      rows = await props.repository.allCreations(project.id),
      blob = new Blob([JSON.stringify(videoBundle(current, rows), null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      "frame-video-" +
      project.name.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 80) +
      ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
async function importVideo(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  await run(async () => {
    if (file.size > 256 * 1024 * 1024)
      throw Error("La sauvegarde dépasse 256 Mo.");
    const data = importVideoBundle(JSON.parse(await file.text()));
    await props.repository.put(data.project, data.creations);
    await reload();
    emit("open-video", data.project.id);
  });
}
</script>
<template>
  <main class="video-library">
    <WorkspaceHeader
      :title="videoId ? '' : 'Studio'"
      :back-label="videoId ? 'Accueil' : ''"
      @back="emit('home')"
    >
      <template #file
        ><label v-if="!videoId" class="menu-file"
          >Importer une vidéo JSON<input
            type="file"
            accept="application/json,.json"
            :disabled="busy"
            aria-label="Importer une sauvegarde vidéo"
            @change="importVideo" /></label
        ><button
          v-if="selected"
          :disabled="busy"
          @click="exportVideo(selected)"
        >
          Exporter la vidéo complète JSON</button
        ><button
          v-if="folderState?.supported"
          @click="run(() => folders.authorize())"
        >
          {{
            folderState.name
              ? "Réautoriser le dossier de travail"
              : "Choisir le dossier de travail…"
          }}</button
        ><button
          v-if="folderState?.name"
          @click="run(() => folders.changeFolder())"
        >
          Changer de dossier…</button
        ><button
          v-if="videoId && folderState?.supported"
          @click="run(() => folders.sync(videoId))"
        >
          Mettre cette vidéo dans le dossier</button
        ><small>{{
          folderState?.name
            ? "Dossier : " + folderState.name
            : "Sauvegarde dans le navigateur"
        }}</small></template
      >
      <template #applications>
        <button v-for="a in applications" :key="a.id" @click="emit('open-app',a.id)"><component :is="icons[a.id]" :size="16"/>{{a.name}}</button>
        <hr><button @click="emit('open-app','canvas')"><PanelsTopLeft :size="16"/>Canevas des parcours</button>
      </template>
      <template #actions
        ><span class="save-state">{{
          folderState?.name ? folderState.name : "Bibliothèque locale"
        }}</span></template
      >
    </WorkspaceHeader>
    <div v-if="error" class="video-alert" role="alert">
      {{ error }}
      <button class="btn" :disabled="busy" @click="run(retryAction || reload)">
        Réessayer
      </button>
    </div>
    <template v-if="!videoId"
      ><section class="video-heading">
        <div>
          <span class="eyebrow">DE L’IDÉE À LA VIDÉO</span>
          <h1>Tes vidéos. Ton espace de création.</h1>
          <p>
            Prépare, crée et publie depuis un projet unique pour chaque vidéo.
          </p>
        </div>
        <div class="video-actions">
          <button class="btn primary" :disabled="busy" @click="newVideo">
            <Plus :size="16" />Nouvelle vidéo
          </button>
        </div>
      </section>
      <section class="video-filter" aria-label="Filtres des vidéos">
        <div class="video-search-wrap">
          <label class="video-search"><Search :size="16"/><input ref="searchInput" v-model="query" maxlength="4000" role="combobox" :aria-expanded="searchFocused&&suggestions.length>0" aria-controls="video-search-suggestions" :aria-activedescendant="searchFocused&&suggestions.length?'video-suggestion-'+suggestionIndex:undefined" aria-autocomplete="list" placeholder='Rechercher · playlist: · vidéo: · type:' aria-label="Rechercher des vidéos" @focus="searchFocused=true;updateCaret($event)" @blur="searchFocused=false" @input="searchFocused=true;updateCaret($event)" @click="updateCaret" @keyup="updateCaret" @keydown="searchKey"/><button v-if="query" class="icon-btn" title="Effacer la recherche" aria-label="Effacer la recherche" @click="query='';searchInput?.focus()"><X :size="15"/></button></label>
          <div v-if="searchFocused&&suggestions.length" id="video-search-suggestions" class="video-search-suggestions" role="listbox" aria-label="Suggestions de recherche">
            <button v-for="(value,i) in suggestions" :id="'video-suggestion-'+i" :key="value" role="option" :aria-selected="i===suggestionIndex" :class="{active:i===suggestionIndex}" @pointerdown.prevent @click="chooseSuggestion(value)"><span>{{activeSearch.field==='video'?'vidéo':activeSearch.field}}:</span>{{value}}</button>
          </div>
        </div>
        <details class="library-display">
          <summary class="btn">
            Affichage
            <span>{{
              archives
                ? "Archives"
                : visibleStatuses.length === videoStatuses.length
                  ? "Tous les états"
                  : visibleStatuses.length + " états"
            }}</span>
          </summary>
          <div class="library-display-panel">
            <label
              >Trier les vidéos<select
                v-model="sortMode"
                aria-label="Trier les vidéos"
              >
                <option value="recent">Dernières modifications</option>
                <option value="process">État du processus</option>
                <option value="playlist">Ordre dans les playlists</option>
              </select></label
            >
            <details class="video-state-filter" open>
              <summary class="btn">
                États · {{ visibleStatuses.length }}/{{ videoStatuses.length }}
              </summary>
              <div class="video-state-options">
                <div class="video-state-shortcuts">
                  <button
                    class="btn"
                    @click="visibleStatuses = videoStatuses.map(([id]) => id)"
                  >
                    Tout afficher</button
                  ><button class="btn" @click="visibleStatuses = []">
                    Tout masquer
                  </button>
                </div>
                <label v-for="[id, title] in videoStatuses" :key="id"
                  ><input
                    type="checkbox"
                    v-model="visibleStatuses"
                    :value="id"
                  />{{ title }}</label
                >
              </div>
            </details>
            <button
              class="btn"
              :class="{ active: archives }"
              @click="archives = !archives"
            >
              <Archive :size="15" />{{
                archives ? "Voir les vidéos actives" : "Archives"
              }}
            </button>
          </div>
        </details>
        <button class="btn" @click="modal = { type: 'playlists' }">
          Playlists
        </button>
        <button class="btn" @click="emit('open-app','canvas')"><PanelsTopLeft :size="16"/>Parcours</button>
      </section>
      <p class="video-search-help">Combine les filtres : playlist:"Java" playlist:"IA" type:"Cours" · vidéo: recherche dans le titre. Plusieurs playlists ou types élargissent la sélection.</p>
      <div v-if="busy && !projects.length" class="video-empty">
        Chargement de la bibliothèque…
      </div>
      <section
        v-else-if="filtered.length"
        class="video-grid"
        aria-label="Vidéos"
      >
        <article v-for="p in paged" :key="p.id" class="video-card">
          <button class="video-card-open" @click="emit('open-video', p.id)">
            <div class="video-cover" :data-playlist="p.playlist">
              <LibraryPreview
                :key="p.id + ':' + p.updatedAt"
                :repository="repository"
                :project-id="p.id"
              /><span>{{ p.playlist || "Sans playlist" }}</span
              ><ArrowUpRight :size="20" />
            </div>
            <div class="video-card-info">
              <span class="video-status" :data-status="p.status">{{
                status(p.status)
              }}</span>
              <span class="video-type" :data-video-type="p.videoType">{{videoTypeTitle(p.videoType)}}</span>
              <span class="video-order-number"
                >N° {{ p.playlistPosition }} dans
                {{ p.playlist || "Sans playlist" }}</span
              >
              <h2>{{ p.name }}</h2>
              <p>
                {{ p.total }} création{{ p.total > 1 ? "s" : "" }} · Modifié le
                {{ date(p.updatedAt) }}
              </p>
              <div class="video-counts">
                <span v-for="a in applications" :key="a.id"
                  ><component :is="icons[a.id]" :size="14" />{{
                    p.counts[a.id]
                  }}</span
                >
              </div>
            </div>
          </button>
          <div class="video-card-tools">
            <button
              :disabled="busy"
              @click="duplicate(p)"
              :aria-label="'Dupliquer ' + p.name"
            >
              <Copy :size="15" />Dupliquer</button
            ><button
              :disabled="busy"
              @click="archive(p)"
              :aria-label="(p.archived ? 'Restaurer ' : 'Archiver ') + p.name"
            >
              <Archive :size="15" />{{ p.archived ? "Restaurer" : "Archiver" }}
            </button>
          </div>
        </article>
      </section>
      <section v-else class="video-empty">
        <FolderOpen :size="36" />
        <h2>
          {{
            archives
              ? "Aucune vidéo archivée"
              : query ||
                  playlist ||
                  visibleStatuses.length !== videoStatuses.length
                ? "Aucune vidéo correspondante"
                : "Ta prochaine vidéo commence ici."
          }}
        </h2>
        <p
          v-if="
            !archives &&
            !query &&
            !playlist &&
            visibleStatuses.length === videoStatuses.length
          "
        >
          Crée un espace pour réunir tes créations. Tes ateliers actuels restent
          accessibles dans le menu Applications.
        </p>
      </section>
      <nav
        class="video-pagination"
        aria-label="Pages de vidéos"
      >
        <label class="video-page-size">Vidéos par page<select v-model.number="pageSize" aria-label="Vidéos par page"><option v-for="size in [10,20,30,50]" :key="size" :value="size">{{size}}</option></select></label>
        <button class="btn" :disabled="page === 1" @click="page--">
          Précédent</button
        ><span
          >Page {{ page }} / {{ pages }} · {{ filtered.length }} vidéos</span
        ><button class="btn" :disabled="page === pages" @click="page++">
          Suivant
        </button>
      </nav>
    </template>
    <template v-else-if="selected && draft"
      ><section class="video-heading">
        <div>
          <span class="eyebrow"
            >{{ selected.playlist || "Sans playlist" }} ·
            {{ status(selected.status) }}</span
          >
          <span class="video-type" :data-video-type="selected.videoType">{{videoTypeTitle(selected.videoType)}}</span>
          <h1>{{ selected.name }}</h1>
          <p>
            {{ selected.creations.length }} création{{
              selected.creations.length > 1 ? "s" : ""
            }}
            ·
            {{
              selected.archived
                ? "Vidéo archivée"
                : "Sauvegarde locale sur cet appareil"
            }}
          </p>
        </div>
        <div class="video-actions">
          <button
            class="btn"
            :disabled="busy"
            @click="openPlaylist(selected.playlist)"
          >
            Ouvrir la playlist
          </button>
          <details class="video-actions-more">
            <summary class="btn">Actions</summary>
            <div>
              <button class="btn" :disabled="busy" @click="duplicate(selected)">
                <Copy :size="16" />Dupliquer</button
              ><button
                class="btn"
                :disabled="busy"
                @click="exportVideo(selected)"
              >
                <Download :size="16" />Sauvegarder la vidéo</button
              ><button class="btn" :disabled="busy" @click="archive(selected)">
                <Archive :size="16" />{{
                  selected.archived ? "Restaurer" : "Archiver"
                }}
              </button>
            </div>
          </details>
        </div>
      </section>
      <details class="video-details">
        <summary>
          Fiche de la vidéo <span>Nom, playlist, type et statut</span>
        </summary>
        <form @submit.prevent="saveDetails">
          <div class="video-details-grid">
            <label
              >Nom de la vidéo<input
                v-model="draft.name"
                maxlength="200"
                required /></label
            ><label
              >Playlist<select v-model="draft.playlist">
                <option value="">Sans playlist</option>
                <option v-for="p in playlists" :key="p">{{ p }}</option>
              </select></label
            ><label
              >Type de vidéo<select v-model="draft.videoType"><option value="">Non défini</option><option v-for="[id,title] in videoTypes" :key="id" :value="id">{{title}}</option></select></label><label
              >Statut<select v-model="draft.status">
                <option
                  v-for="[id, title] in videoStatuses"
                  :key="id"
                  :value="id"
                >
                  {{ title }}
                </option>
              </select></label
            >
          </div>
          <button class="btn primary" :disabled="busy">
            Enregistrer la fiche
          </button>
        </form>
      </details>
      <VideoWorkflowOverview @workshop="emit('open-workshop',selected.id,$event)"/>
      <section class="video-assets-heading"><div><span class="eyebrow">SUPPORTS DE LA VIDÉO</span><h2>Toutes tes créations</h2></div><div class="workspace-switch" aria-label="Filtrer les supports"><button v-for="[id,label] in [['all','Tous'],['animation','Animations'],['slides','Diaporamas'],['banners','Incrustations'],['thumbnails','Miniatures']]" :key="id" :class="{active:creationFilter===id}" @click="creationFilter=id">{{label}}</button></div></section>
      <div class="video-assets-grid">
        <section
          v-for="a in applications.filter(a=>creationFilter==='all'||a.id===creationFilter)"
          :key="a.id"
          class="video-creation-section"
        >
          <div class="video-section-heading">
            <h2>
              <component :is="icons[a.id]" :size="21" />{{ a.name }}
              <span>{{ creations.filter((c) => c.app === a.id).length }}</span>
            </h2>
            <div class="video-actions">
              <label class="btn video-file"
                ><Upload :size="16" />Importer<input
                  type="file"
                  accept="application/json,.json"
                  :disabled="busy"
                  :aria-label="'Importer dans ' + a.name"
                  @change="(event) => importCreation(event, a.id)" /></label
              ><button class="btn" :disabled="busy" @click="newCreation(a.id)">
                <Plus :size="16" />{{
                  a.id === "slides"
                    ? "Nouveau diaporama"
                    : a.id === "banners"
                      ? "Nouvelle incrustation"
                      : "Nouvelle miniature"
                }}
              </button>
            </div>
          </div>
          <div
            class="video-creation-grid"
            v-if="creations.some((c) => c.app === a.id)"
          >
            <article
              class="video-creation-card"
              v-for="row in creations.filter((c) => c.app === a.id)"
              :key="row.id"
            >
              <button
                class="video-creation-open"
                @click="emit('open-creation', selected.id, row.app, row.id)"
              >
                <LibraryPreview
                  :repository="repository"
                  :creation="row"
                  @preview="(image) => savePreview(row, image)"
                /><span>{{ row.name }}<ArrowUpRight :size="17" /></span>
              </button>
              <div class="video-card-tools">
                <button :disabled="busy" @click="renameCreation(row)">
                  Renommer</button
                ><button :disabled="busy" @click="duplicateCreation(row)">
                  <Copy :size="14" />Dupliquer
                </button>
                <button :disabled="busy" :aria-label="'Supprimer '+row.name" @click="removeCreation(row)"><Trash2 :size="14"/>Supprimer</button>
              </div>
            </article>
          </div>
          <div v-else class="video-section-empty">
            {{
              a.id === "slides"
                ? "Le fil de ton cours."
                : a.id === "banners"
                  ? "Les éléments à ajouter au montage."
                  : "Tes variantes pour cette vidéo."
            }}
          </div>
        </section>
      </div>

    </template>
    <div v-else-if="!busy" class="video-empty">
      <h2>Vidéo introuvable.</h2>
      <button class="btn" @click="emit('home')">
        Revenir à la bibliothèque
      </button>
    </div>
    <footer>
      Bibliothèque locale · Sauvegarde une vidéo complète en JSON pour la
      transférer ou la conserver sur ton ordinateur.
    </footer>
    <div
      v-if="
        modal &&
        !['canvas', 'playlists', 'playlist', 'playlist-view'].includes(
          modal.type,
        )
      "
      class="modal-backdrop"
      @click.self="modal = null"
    >
      <form
        class="video-modal"
        role="dialog"
        aria-modal="true"
        :aria-label="
          modal.type === 'video'
            ? 'Nouvelle vidéo'
            : modal.type === 'video-rename'
              ? 'Renommer la vidéo'
              : modal.type === 'rename'
                ? 'Renommer la création'
                : 'Nouvelle création'
        "
        @submit.prevent="submit"
        @keydown.esc="modal = null"
      >
        <button
          type="button"
          class="icon-btn video-modal-close"
          aria-label="Fermer"
          @click="modal = null"
        >
          <X :size="19" /></button
        ><span class="eyebrow">{{
          modal.type === "video" ? "UN NOUVEAU SUJET" : "DANS CETTE VIDÉO"
        }}</span>
        <h2>
          {{
            modal.type === "video"
              ? "Nouvelle vidéo"
              : modal.type === "video-rename"
                ? "Renommer la vidéo"
                : modal.type === "rename"
                  ? "Renommer la création"
                  : "Nouvelle création"
          }}
        </h2>
        <label
          >Nom<input
            v-model="name"
            maxlength="200"
            required
            autofocus
            :placeholder="
              modal.type === 'video'
                ? 'Les primitifs en Java'
                : 'Fiche int, présentation du cours…'
            "
            aria-label="Nom de la nouvelle création" /></label
        ><template v-if="modal.type === 'video'"
          ><label
            >Playlist<select v-model="newPlaylist">
              <option value="">Sans playlist</option>
              <option v-for="p in playlists" :key="p">{{ p }}</option>
            </select></label
          >
          <label>Type de vidéo<select v-model="newVideoType"><option value="">Non défini</option><option v-for="[id,title] in videoTypes" :key="id" :value="id">{{title}}</option></select></label>
          <div class="video-folder-setup">
            <strong>{{
              folderState?.name
                ? "Fichiers automatiques dans " + folderState.name
                : "Où conserver tes fichiers ?"
            }}</strong>
            <p>
              Un dossier portant l’ID de la vidéo accueillera les créations et
              le brouillon du conducteur.
            </p>
            <button
              v-if="folderState?.supported"
              type="button"
              class="btn"
              @click="run(() => folders.authorize())"
            >
              {{
                folderState.name
                  ? "Réautoriser le dossier"
                  : "Choisir un dossier de travail…"
              }}</button
            ><small v-else
              >Ce navigateur conserve les créations localement ; export JSON
              disponible.</small
            >
          </div>
          <label
            v-if="folderState?.supported && !folderState.name"
            class="video-check"
            ><input type="checkbox" v-model="browserOnly" />Conserver uniquement
            dans le navigateur pour le moment</label
          >
          <h3>Ateliers de départ</h3>
          <p>
            Crée les documents maintenant ou utilise tes fichiers existants.
          </p>
          <label
            v-for="a in applications"
            :key="a.id"
            class="starter-application"
          >
            <span
              ><input type="checkbox" v-model="starterApps" :value="a.id" />{{
                a.name
              }}</span
            ><span class="starter-import"
              >Importer un JSON existant<input
                type="file"
                accept="application/json,.json"
                :aria-label="'Document existant : ' + a.name"
                @change="
                  (event) => (importFiles[a.id] = event.target.files?.[0])
                " /></span></label></template
        ><template v-if="modal.type === 'creation'"
          ><label
            >Atelier<select v-model="app">
              <option v-for="a in applications" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select></label
          ><label class="video-check"
            ><input type="checkbox" v-model="copyCurrent" />Copier la création
            actuelle de cet atelier</label
          >
          <p>
            La copie reste indépendante. Tu peux aussi importer un document JSON
            depuis l’atelier après sa création.
          </p></template
        >
        <div v-if="error" role="alert" class="video-alert">{{ error }}</div>
        <div class="video-modal-actions">
          <button type="button" class="btn" @click="modal = null">
            Annuler</button
          ><button class="btn primary" :disabled="busy">
            {{
              ["rename", "video-rename"].includes(modal.type)
                ? "Enregistrer"
                : "Créer"
            }}
          </button>
        </div>
      </form>
    </div>
    <div
      v-if="modal && ['playlists', 'playlist'].includes(modal.type)"
      class="modal-backdrop"
      @click.self="modal = null"
    >
      <section
        class="video-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Gestion des playlists"
      >
        <button
          class="icon-btn video-modal-close"
          aria-label="Fermer"
          @click="modal = null"
        >
          <X :size="19" />
        </button>
        <h2>
          {{
            modal.type === "playlist"
              ? modal.previous
                ? "Renommer la playlist"
                : "Nouvelle playlist"
              : "Tes playlists"
          }}
        </h2>
        <template v-if="modal.type === 'playlists'"
          ><p>
            Supprimer une playlist conserve ses vidéos dans « Sans playlist ».
          </p>
          <div class="playlist-directory">
            <button
              v-for="p in playlists"
              :key="p"
              class="playlist-directory-entry"
              :aria-label="'Ouvrir la playlist ' + p"
              @click="openPlaylist(p)"
            >
              <span
                ><strong>{{ p }}</strong
                ><small
                  >{{
                    projects.filter((row) => row.playlist === p).length
                  }}
                  vidéos</small
                ></span
              ><ArrowUpRight :size="18" /></button
            ><button
              v-if="projects.some((row) => !row.playlist)"
              class="playlist-directory-entry"
              aria-label="Ouvrir Sans playlist"
              @click="openPlaylist('')"
            >
              <span
                ><strong>Sans playlist</strong
                ><small
                  >{{
                    projects.filter((row) => !row.playlist).length
                  }}
                  vidéos</small
                ></span
              ><ArrowUpRight :size="18" />
            </button>
          </div>
          <button class="btn primary" @click="editPlaylist()">
            <Plus :size="16" />Nouvelle playlist
          </button></template
        >
        <form v-else @submit.prevent="savePlaylist">
          <label
            >Nom de la playlist<input
              v-model="playlistName"
              maxlength="200"
              required
              autofocus
          /></label>
          <div class="video-modal-actions">
            <button
              type="button"
              class="btn"
              @click="
                modal = modal.returnToPlaylist
                  ? { type: 'playlist-view', playlist: modal.previous }
                  : { type: 'playlists' }
              "
            >
              Retour</button
            ><button class="btn primary" :disabled="busy">Enregistrer</button>
          </div>
        </form>
        <div v-if="error" class="video-alert" role="alert">{{ error }}</div>
      </section>
    </div>
    <div
      v-if="modal?.type === 'playlist-view'"
      class="modal-backdrop playlist-order-backdrop"
      @click.self="modal = null"
    >
      <PlaylistOrder
        :return-label="videoId ? 'Vidéo' : 'Accueil'"
        :name="modal.playlist"
        :repository="repository"
        :playlists="playlists"
        @change-playlist="changeVideoPlaylist"
        :rows="playlistRows"
        :busy="busy"
        :error="error"
        @move="movePlaylistVideo"
        @open="openPlaylistVideo"
        @close="modal = null"
        @back="modal = { type: 'playlists' }"
        @rename="editPlaylist(modal.playlist, true)"
        @remove="removePlaylist(modal.playlist)"
        @archive-video="archive"
        @remove-video="removePlaylistVideo"
        @rename-video="renamePlaylistVideo"
      />
    </div>
  </main>
</template>
