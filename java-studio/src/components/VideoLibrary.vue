<script setup>
import { ref, computed, watch, onMounted } from "vue";
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
  Archive,
  Download,
  Upload,
  MoreHorizontal,
  Film,
  X,
} from "lucide-vue-next";
import { applications, applicationStorage } from "../applicationDocuments.js";
import { workspaceKeys } from "../workspaceStorage.js";
import {
  makeVideoProject,
  makeCreation,
  attachCreation,
  videoBundle,
  importVideoBundle,
  videoStatuses,
  documentFromStorage,
  clone,
} from "../videoProjects.js";
import LibraryPreview from "./LibraryPreview.vue";
const props = defineProps({ repository: Object, videoId: String }),
  emit = defineEmits(["open-video", "open-creation", "open-app", "home"]);
const projects = ref([]),
  creations = ref([]),
  busy = ref(false),
  error = ref(""),
  query = ref(""),
  playlist = ref(""),
  archives = ref(false),
  modal = ref(null),
  name = ref(""),
  app = ref("slides"),
  copyCurrent = ref(false),
  draft = ref(null),
  icons = { slides: PanelsTopLeft, banners: Clapperboard, thumbnails: Image };
const selected = ref(null),
  playlists = ref([]),
  page = ref(1),
  importFiles = ref({}),
  playlistName = ref(""),
  newPlaylist = ref("");
const filtered = computed(() =>
  projects.value.filter(
    (p) =>
      p.archived === archives.value &&
      (!playlist.value ||
        p.playlist === (playlist.value === "__none__" ? "" : playlist.value)) &&
      p.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase()),
  ),
);
const pages = computed(() =>
    Math.max(1, Math.ceil(filtered.value.length / 24)),
  ),
  paged = computed(() =>
    filtered.value.slice((page.value - 1) * 24, page.value * 24),
  );
watch([query, playlist, archives], () => (page.value = 1));
let retryAction = null;
watch(modal, (value) => {
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
  videoStatuses.find(([key]) => key === id)?.[1] || "Préparation";
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
  newPlaylist.value = playlists.value[0] || "";
  modal.value = { type: "video" };
}
function newCreation(kind) {
  app.value = kind;
  name.value = "";
  copyCurrent.value = false;
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
function editPlaylist(previous = null) {
  playlistName.value = previous || "";
  modal.value = { type: "playlist", previous };
}
async function removePlaylist(previous) {
  await run(async () => {
    await props.repository.editPlaylist(previous, null);
    if (playlist.value === previous) playlist.value = "";
    await reload();
  });
}
async function savePlaylist() {
  await run(async () => {
    await props.repository.editPlaylist(
      modal.value.previous,
      playlistName.value,
    );
    modal.value = { type: "playlists" };
    await reload();
  });
}
async function submit() {
  await run(async () => {
    if (!name.value.trim()) throw Error("Donne un nom à ta création.");
    if (modal.value.type === "video") {
      const project = makeVideoProject(name.value);
      project.playlist = newPlaylist.value;
      const rows = [];
      for (const [kind, file] of Object.entries(importFiles.value)) {
        if (file) rows.push(await importDocument(file, project, kind));
      }
      await props.repository.put(project, rows);
      modal.value = null;
      importFiles.value = {};
      emit("open-video", project.id);
      await reload();
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
            [app.value === "thumbnails" ? "frame-thumbnails:" + key : key]: raw,
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
async function saveDetails() {
  await run(async () => {
    const project = await props.repository.get(props.videoId);
    Object.assign(project, {
      name: draft.value.name.trim() || project.name,
      playlist: draft.value.playlist,
      status: draft.value.status,
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
    <header class="video-library-header">
      <a class="brand-name" href="#/" @click.prevent="emit('home')"
        >frame<span class="brand-dot">.</span></a
      ><span class="video-test-badge">ESPACES VIDÉO · VERSION TEST</span
      ><span class="home-personal">TON STUDIO PERSONNEL</span>
    </header>
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
          <h1>Tes vidéos, au même endroit.</h1>
          <p>
            Prépare un cours et retrouve ses diaporamas, ses incrustations et
            ses miniatures.
          </p>
        </div>
        <div class="video-actions">
          <label class="btn video-file"
            ><Upload :size="16" />Importer une vidéo<input
              type="file"
              accept="application/json,.json"
              :disabled="busy"
              aria-label="Importer une sauvegarde vidéo"
              @change="importVideo" /></label
          ><button class="btn primary" :disabled="busy" @click="newVideo">
            <Plus :size="16" />Nouvelle vidéo
          </button>
        </div>
      </section>
      <section class="video-filter" aria-label="Filtres des vidéos">
        <label class="video-search"
          ><Search :size="16" /><input
            v-model="query"
            placeholder="Rechercher une vidéo"
            aria-label="Rechercher une vidéo" /></label
        ><select v-model="playlist" aria-label="Filtrer par playlist">
          <option value="">Toutes les playlists</option>
          <option value="__none__">Sans playlist</option>
          <option v-for="p in playlists" :key="p">{{ p }}</option></select
        ><button class="btn" @click="modal = { type: 'playlists' }">
          Gérer les playlists</button
        ><button
          class="btn"
          :class="{ active: archives }"
          @click="archives = !archives"
        >
          <Archive :size="15" />{{
            archives ? "Voir les vidéos actives" : "Archives"
          }}
        </button>
      </section>
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
              : query || playlist
                ? "Aucune vidéo correspondante"
                : "Ta prochaine vidéo commence ici."
          }}
        </h2>
        <p v-if="!archives && !query && !playlist">
          Crée un espace pour réunir tes créations. Tes ateliers actuels restent
          accessibles ci-dessous.
        </p>
      </section>
      <nav
        v-if="pages > 1"
        class="video-pagination"
        aria-label="Pages de vidéos"
      >
        <button class="btn" :disabled="page === 1" @click="page--">
          Précédent</button
        ><span
          >Page {{ page }} / {{ pages }} · {{ filtered.length }} vidéos</span
        ><button class="btn" :disabled="page === pages" @click="page++">
          Suivant
        </button>
      </nav>
      <section class="video-workshops">
        <div>
          <h2>Les ateliers</h2>
          <p>Ouvre ta création autonome, ou copie-la ensuite dans une vidéo.</p>
        </div>
        <div class="video-workshop-grid">
          <button
            v-for="a in applications"
            :key="a.id"
            @click="emit('open-app', a.id)"
          >
            <component :is="icons[a.id]" :size="24" /><span
              ><strong>{{ a.name }}</strong
              ><small>{{ a.tag }}</small></span
            ><ArrowUpRight :size="18" />
          </button>
        </div></section
    ></template>
    <template v-else-if="selected && draft"
      ><button class="video-back" @click="emit('home')">
        <ArrowLeft :size="16" />Toutes les vidéos
      </button>
      <section class="video-heading">
        <div>
          <span class="eyebrow"
            >{{ selected.playlist || "Sans playlist" }} ·
            {{ status(selected.status) }}</span
          >
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
          <button class="btn" :disabled="busy" @click="duplicate(selected)">
            <Copy :size="16" />Dupliquer</button
          ><button class="btn" :disabled="busy" @click="exportVideo(selected)">
            <Download :size="16" />Sauvegarder la vidéo</button
          ><button class="btn" :disabled="busy" @click="archive(selected)">
            <Archive :size="16" />{{
              selected.archived ? "Restaurer" : "Archiver"
            }}
          </button>
        </div>
      </section>
      <details class="video-details">
        <summary>
          Fiche de la vidéo <span>Nom, playlist, statut et notes</span>
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
          <label
            >Notes générales<textarea
              v-model="draft.notes"
              maxlength="20000"
              rows="4"
              placeholder="Objectif du cours, idées, choses à préparer…"
            /></label
          ><button class="btn primary" :disabled="busy">
            Enregistrer la fiche
          </button>
        </form>
      </details>
      <section
        v-for="a in applications"
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
      v-if="modal && !['playlists', 'playlist'].includes(modal.type)"
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
          <p>
            Tu as déjà préparé tes documents ? Ajoute-les ici, ou importe-les
            plus tard.
          </p>
          <label v-for="a in applications" :key="a.id"
            >{{ a.name }} · JSON facultatif<input
              type="file"
              accept="application/json,.json"
              :aria-label="'Document existant : ' + a.name"
              @change="
                (event) => (importFiles[a.id] = event.target.files?.[0])
              " /></label></template
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
            {{ modal.type === "rename" ? "Enregistrer" : "Créer" }}
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
          <div class="playlist-list">
            <div v-for="p in playlists" :key="p">
              <strong>{{ p }}</strong
              ><button
                class="btn"
                :disabled="busy"
                :aria-label="'Renommer la playlist ' + p"
                @click="editPlaylist(p)"
              >
                Renommer</button
              ><button
                class="btn"
                :disabled="busy"
                :aria-label="'Supprimer la playlist ' + p"
                @click="removePlaylist(p)"
              >
                Supprimer
              </button>
            </div>
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
              @click="modal = { type: 'playlists' }"
            >
              Retour</button
            ><button class="btn primary" :disabled="busy">Enregistrer</button>
          </div>
        </form>
        <div v-if="error" class="video-alert" role="alert">{{ error }}</div>
      </section>
    </div>
  </main>
</template>
