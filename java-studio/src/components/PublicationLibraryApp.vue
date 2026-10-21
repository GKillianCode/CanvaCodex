<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from "vue";
import {
  Plus,
  Trash2,
  Search,
  Music2,
  FileText,
  Save,
  GripVertical,
  Pencil,
  ArrowLeft,
} from "lucide-vue-next";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import { workflowNavigation } from "../workflowNavigation.js";
import { musicLibraryKey, normalizeMusicLibrary } from "../publicationMusic.js";
import {
  descriptionLibraryKey,
  normalizeDescriptionLibrary,
} from "../publicationTemplates.js";
const props = defineProps({ repository: Object, kind: String });
const emit = defineEmits(["home"]);
const navigation = inject(workflowNavigation, null),
  music = ref([]),
  library = ref({ templates: [], blocks: [] }),
  tab = ref("templates"),
  query = ref(""),
  sort = ref("name"),
  selected = ref(""),
  busy = ref(false),
  loading = ref(true),
  loadedOk = ref(false),
  error = ref(""),
  notice = ref(""),
  snapshot = ref("");
const editing = ref(new Set());
function returnPrevious() {
  navigation
    ?.navigate(
      window.sessionStorage.getItem("frame-publication-library-return") || "#/",
    )
    .catch(() => {});
}
function edit(id) {
  selected.value = id;
  editing.value.add(id);
  notice.value = "";
}
const isMusic = computed(() => props.kind === "music");
const rows = computed(() =>
  isMusic.value ? music.value : library.value[tab.value],
);
const visible = computed(() => {
  const q = query.value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return rows.value
    .filter(
      (row) =>
        (row.title || row.name || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q) || row.artist?.toLowerCase().includes(q),
    )
    .slice()
    .sort((a, b) =>
      sort.value === "name"
        ? (a.title || a.name).localeCompare(b.title || b.name, "fr")
        : sort.value === "artist"
          ? (a.artist || "").localeCompare(b.artist || "", "fr")
          : 0,
    );
});
const current = computed(() =>
  rows.value.find((row) => row.id === selected.value),
);
const serialized = () =>
  JSON.stringify(isMusic.value ? music.value : library.value);
const dirty = computed(() => loadedOk.value && snapshot.value !== serialized());
onMounted(async () => {
  try {
    if (isMusic.value)
      music.value = normalizeMusicLibrary(
        await props.repository.getSetting(musicLibraryKey),
      );
    else
      library.value = normalizeDescriptionLibrary(
        await props.repository.getSetting(descriptionLibraryKey),
      );
    selected.value = rows.value[0]?.id || "";
    snapshot.value = serialized();
    loadedOk.value = true;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
let savingPromise;
function save() {
  if (savingPromise) return savingPromise;
  savingPromise = performSave().finally(() => (savingPromise = null));
  return savingPromise;
}
async function performSave() {
  if (loading.value || !loadedOk.value) return;
  const savedState = serialized(),
    payload = JSON.parse(savedState);
  busy.value = true;
  error.value = "";
  try {
    if (isMusic.value) {
      const normalized = normalizeMusicLibrary(payload);
      if (normalized.some((row) => !row.title))
        throw Error("Chaque musique doit avoir un titre.");
      await props.repository.setSetting(musicLibraryKey, normalized);
    } else {
      if (
        [...payload.templates, ...payload.blocks].some(
          (row) => !row.name.trim(),
        )
      )
        throw Error("Chaque modèle et chaque bloc doit avoir un nom.");
      await props.repository.setSetting(
        descriptionLibraryKey,
        normalizeDescriptionLibrary(payload),
      );
    }
    snapshot.value = savedState;
    if (serialized() === savedState) editing.value.clear();
    notice.value = "Bibliothèque enregistrée.";
  } catch (e) {
    error.value = e.message;
    throw e;
  } finally {
    busy.value = false;
  }
}
async function flush() {
  if (savingPromise) await savingPromise;
  while (dirty.value) await save();
}
defineExpose({ flush });
function add() {
  const row = isMusic.value
    ? {
        id: crypto.randomUUID(),
        title: "Nouvelle musique",
        artist: "",
        url: "",
        license: "",
      }
    : tab.value === "templates"
      ? {
          id: crypto.randomUUID(),
          name: "Nouveau modèle",
          playlist: "",
          intro: "",
          outro: "",
          slots: [],
        }
      : { id: crypto.randomUUID(), name: "Nouveau bloc", content: "" };
  rows.value.push(row);
  selected.value = row.id;
  editing.value.add(row.id);
  query.value = "";
  notice.value = "";
}
function remove() {
  if (
    !current.value ||
    !window.confirm(
      "Supprimer « " +
        (current.value.title || current.value.name) +
        " » de la bibliothèque ?",
    )
  )
    return;
  const index = rows.value.findIndex((row) => row.id === selected.value);
  rows.value.splice(index, 1);
  selected.value = rows.value[Math.max(0, index - 1)]?.id || "";
  notice.value = "";
}
function changeTab(value) {
  tab.value = value;
  query.value = "";
  selected.value = rows.value[0]?.id || "";
}
function addSlot() {
  if (current.value.slots.length < 20)
    current.value.slots.push({
      id: crypto.randomUUID(),
      label: "Partie interchangeable",
      defaultBlockId: "",
    });
}
let draggedSlot = "";
function dropSlot(index) {
  const slots = current.value.slots,
    from = slots.findIndex((s) => s.id === draggedSlot);
  if (from < 0) return;
  const [row] = slots.splice(from, 1);
  slots.splice(index, 0, row);
  draggedSlot = "";
}
function beforeUnload(e) {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
onMounted(() => window.addEventListener("beforeunload", beforeUnload));
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>
<template>
  <main class="resource-app" @keydown.ctrl.s.prevent="save().catch(() => {})">
    <WorkspaceHeader
      :title="isMusic ? 'Musiques' : 'Modèles de description'"
      @back="emit('home')"
      ><template #context
        ><button
          class="text-action resource-return"
          aria-label="Revenir à la page précédente"
          @click="returnPrevious"
        >
          <ArrowLeft :size="14" />Retour
        </button>
        <button
          class="text-action"
          @click="
            navigation?.navigate(
              isMusic ? '#/modeles-description' : '#/musiques',
            )
          "
        >
          {{ isMusic ? "Modèles de description" : "Bibliothèque de musiques" }}
        </button></template
      ><template #utilities
        ><span class="notes-save-state">{{
          dirty ? "Modifications en attente" : "Enregistré"
        }}</span></template
      ></WorkspaceHeader
    >
    <div class="resource-heading">
      <div>
        <span class="eyebrow">PUBLICATION · BIBLIOTHÈQUE PARTAGÉE</span>
        <h1>
          {{ isMusic ? "Musiques de fond" : "Des descriptions à composer" }}
        </h1>
        <p>
          {{
            isMusic
              ? "Tes titres et leurs crédits, disponibles dans chaque vidéo."
              : "Un socle fixe, des blocs réutilisables et des parties adaptées à chaque vidéo."
          }}
        </p>
      </div>
      <button
        class="btn primary"
        :disabled="busy || loading || !loadedOk"
        @click="save().catch(() => {})"
      >
        <Save :size="16" />Enregistrer
      </button>
    </div>
    <p v-if="error" class="video-alert" role="alert">{{ error }}</p>
    <p v-if="notice" class="resource-notice" role="status">{{ notice }}</p>
    <div v-if="!loading && loadedOk" class="resource-layout">
      <aside class="resource-sidebar">
        <div v-if="!isMusic" class="resource-tabs">
          <button
            :class="{ active: tab === 'templates' }"
            @click="changeTab('templates')"
          >
            Modèles</button
          ><button
            :class="{ active: tab === 'blocks' }"
            @click="changeTab('blocks')"
          >
            Blocs réutilisables
          </button>
        </div>
        <label class="resource-search"
          ><Search :size="16" /><input
            v-model="query"
            aria-label="Rechercher dans la bibliothèque"
            placeholder="Rechercher…"
        /></label>
        <div class="resource-list-tools">
          <select v-model="sort" aria-label="Trier la bibliothèque">
            <option value="name">Ordre alphabétique</option>
            <option v-if="isMusic" value="artist">Par artiste</option>
            <option value="original">Ordre d’ajout</option></select
          ><button
            class="icon-btn"
            aria-label="Ajouter à la bibliothèque"
            :disabled="rows.length >= (isMusic ? 500 : 200)"
            @click="add"
          >
            <Plus :size="18" />
          </button>
        </div>
        <div
          v-for="row in visible"
          :key="row.id"
          class="resource-item"
          :class="{ active: selected === row.id }"
        >
          <button class="resource-row" @click="selected = row.id">
            <Music2 v-if="isMusic" :size="17" /><FileText
              v-else
              :size="17"
            /><span
              >{{ row.title || row.name
              }}<small>{{
                isMusic
                  ? row.artist
                  : tab === "templates"
                    ? row.playlist || "Toutes les vidéos"
                    : row.content.slice(0, 65)
              }}</small></span
            ></button
          ><button
            class="icon-btn resource-edit"
            :aria-label="'Modifier ' + (row.title || row.name)"
            title="Modifier la fiche"
            @click="edit(row.id)"
          >
            <Pencil :size="14" />
          </button>
        </div>
        <p v-if="!visible.length" class="field-help">
          Aucun résultat. Ajoute un élément avec +.
        </p>
      </aside>
      <section class="resource-editor" v-if="current" :key="current.id">
        <div class="resource-editor-heading">
          <span class="eyebrow">{{
            isMusic
              ? "FICHE MUSIQUE"
              : tab === "templates"
                ? "MODÈLE"
                : "BLOC RÉUTILISABLE"
          }}</span>
          <div class="resource-editor-controls">
            <small>{{
              editing.has(current.id) ? "Modification" : "Lecture seule"
            }}</small
            ><button
              v-if="!editing.has(current.id)"
              class="icon-btn"
              aria-label="Modifier la fiche"
              title="Modifier la fiche"
              @click="edit(current.id)"
            >
              <Pencil :size="16" /></button
            ><button
              class="icon-btn"
              aria-label="Supprimer cet élément"
              @click="remove"
            >
              <Trash2 :size="17" />
            </button>
          </div>
        </div>
        <fieldset
          class="resource-editor-fields"
          :disabled="busy || !editing.has(current.id)"
        >
          <template v-if="isMusic"
            ><label
              >Titre<input
                v-model="current.title"
                maxlength="200"
                aria-label="Titre de la musique" /></label
            ><label
              >Artiste<input
                v-model="current.artist"
                maxlength="200"
                aria-label="Artiste de la musique" /></label
            ><label
              >Lien<input
                v-model="current.url"
                maxlength="2000"
                placeholder="https://…"
                aria-label="Lien de la musique" /></label
            ><label
              >Crédits et licence<textarea
                v-model="current.license"
                maxlength="2000"
                rows="7"
                aria-label="Crédits et licence"
              /></label
          ></template>
          <template v-else
            ><label
              >Nom<input
                v-model="current.name"
                maxlength="120"
                aria-label="Nom de l’élément" /></label
            ><template v-if="tab === 'blocks'"
              ><label
                >Contenu du bloc<textarea
                  v-model="current.content"
                  maxlength="20000"
                  rows="15"
                  aria-label="Contenu du bloc"
                  placeholder="Présentation d’un outil, liens, précisions sur Java…"
                /></label></template
            ><template v-else
              ><label
                >Playlist (facultatif)<input
                  v-model="current.playlist"
                  maxlength="200"
                  placeholder="Vide : modèle utilisable pour toutes les vidéos" /></label
              ><label
                >Texte fixe · début<textarea
                  v-model="current.intro"
                  maxlength="20000"
                  rows="5"
                  aria-label="Texte fixe de début"
                />
              </label>
              <section class="resource-slots">
                <div>
                  <h3>Parties interchangeables</h3>
                  <button
                    class="btn"
                    :disabled="current.slots.length >= 20"
                    @click="addSlot"
                  >
                    <Plus :size="14" />Ajouter une partie
                  </button>
                </div>
                <p class="field-help">
                  Chaque partie peut recevoir un bloc de la bibliothèque ou un
                  texte propre à la vidéo.
                </p>
                <article
                  v-for="(slot, i) in current.slots"
                  :key="slot.id"
                  @dragover.prevent
                  @drop.prevent="dropSlot(i)"
                >
                  <button
                    class="icon-btn"
                    draggable="true"
                    @dragstart="draggedSlot = slot.id"
                    @dragend="draggedSlot = ''"
                    aria-label="Déplacer la partie"
                  >
                    <GripVertical :size="16" /></button
                  ><label
                    >Nom<input v-model="slot.label" maxlength="100" /></label
                  ><label
                    >Bloc par défaut<select v-model="slot.defaultBlockId">
                      <option value="">Aucun</option>
                      <option
                        v-for="block in library.blocks"
                        :key="block.id"
                        :value="block.id"
                      >
                        {{ block.name }}
                      </option>
                    </select></label
                  ><button
                    class="icon-btn"
                    aria-label="Supprimer la partie"
                    @click="current.slots.splice(i, 1)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </article>
              </section>
              <label
                >Texte fixe · fin<textarea
                  v-model="current.outro"
                  maxlength="20000"
                  rows="5"
                  aria-label="Texte fixe de fin"
                /></label></template
          ></template>
        </fieldset>
      </section>
      <section v-else class="resource-empty">
        <FileText :size="32" />
        <h2>
          {{
            isMusic ? "Ta bibliothèque musicale" : "Tes modèles de publication"
          }}
        </h2>
        <p>Sélectionne un élément ou crée le premier.</p>
        <button class="btn" @click="add"><Plus :size="16" />Ajouter</button>
      </section>
    </div>
  </main>
</template>
