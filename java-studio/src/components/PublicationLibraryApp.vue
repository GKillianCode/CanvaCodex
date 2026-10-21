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
import { downloadText } from "../useVideoWorkflow.js";
import DescriptionTokenEditor from "./DescriptionTokenEditor.vue";
import "../publication.css";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import { workflowNavigation } from "../workflowNavigation.js";
import { musicLibraryKey, normalizeMusicLibrary } from "../publicationMusic.js";
import {
  descriptionLibraryKey,
  normalizeDescriptionLibrary,
  publicationTitles,
  structuredTemplate,
  formatPublicationHeading,
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
const conflict = ref(false);
let expected = "null";
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
const settingsMode = computed(() => !isMusic.value && tab.value === "settings");
const rows = computed(() =>
  isMusic.value
    ? music.value
    : settingsMode.value
      ? []
      : library.value[tab.value],
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
const packEditorId = ref("");
const currentPack = computed(
  () =>
    library.value.settings?.headingPacks.find(
      (p) =>
        p.id ===
        (packEditorId.value || library.value.settings.defaultHeadingPack),
    ) || library.value.settings?.headingPacks[0],
);
function addPack() {
  if (library.value.settings.headingPacks.length >= 20) return;
  const pack = {
    ...JSON.parse(JSON.stringify(currentPack.value)),
    id: crypto.randomUUID(),
    name: "Mon style",
  };
  library.value.settings.headingPacks.push(pack);
  packEditorId.value = pack.id;
  library.value.settings.defaultHeadingPack = pack.id;
}
function removePack() {
  if (library.value.settings.headingPacks.length < 2) return;
  if (
    !window.confirm(
      "Supprimer ce style ? Les vidéos qui l’utilisent suivront le style par défaut.",
    )
  )
    return;
  library.value.settings.headingPacks =
    library.value.settings.headingPacks.filter(
      (p) => p.id !== currentPack.value.id,
    );
  packEditorId.value = library.value.settings.headingPacks[0].id;
  library.value.settings.defaultHeadingPack = packEditorId.value;
}
const serialized = () =>
  JSON.stringify(isMusic.value ? music.value : library.value);
const dirty = computed(() => loadedOk.value && snapshot.value !== serialized());
let loadingPromise;
function load() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = performLoad().finally(() => (loadingPromise = null));
  return loadingPromise;
}
async function performLoad() {
  loading.value = true;
  try {
    const raw = await props.repository.getSetting(
      isMusic.value ? musicLibraryKey : descriptionLibraryKey,
    );
    expected = JSON.stringify(raw ?? null);
    if (isMusic.value) music.value = normalizeMusicLibrary(raw);
    else {
      library.value = normalizeDescriptionLibrary(raw);
      if (!library.value.templates.some((t) => t.id === "frame-course-default"))
        library.value.templates.unshift(structuredTemplate());
    }
    selected.value = rows.value[0]?.id || "";
    snapshot.value = serialized();
    editing.value.clear();
    loadedOk.value = true;
    conflict.value = false;
    error.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
function downloadDraft() {
  downloadText(
    isMusic.value
      ? "frame-musiques-brouillon.json"
      : "frame-modeles-brouillon.json",
    serialized(),
    "application/json",
  );
}
function reloadLibrary() {
  if (
    !window.confirm(
      "Recharger la bibliothèque enregistrée ? Télécharge d’abord ton brouillon pour conserver tes modifications.",
    )
  )
    return;
  load();
}
let savingPromise;
function save() {
  if (savingPromise) return savingPromise;
  savingPromise = performSave().finally(() => (savingPromise = null));
  return savingPromise;
}
async function performSave() {
  if (loading.value || !loadedOk.value) return;
  if (conflict.value) throw Error(error.value);
  const savedState = serialized(),
    payload = JSON.parse(savedState);
  busy.value = true;
  error.value = "";
  try {
    if (isMusic.value) {
      const normalized = normalizeMusicLibrary(payload);
      if (normalized.some((row) => !row.title))
        throw Error("Chaque musique doit avoir un titre.");
      await props.repository.saveSetting(musicLibraryKey, normalized, expected);
      expected = JSON.stringify(normalized);
    } else {
      if (
        [...payload.templates, ...payload.blocks].some(
          (row) => !row.name.trim(),
        )
      )
        throw Error("Chaque modèle et chaque bloc doit avoir un nom.");
      const normalized = normalizeDescriptionLibrary(payload);
      await props.repository.saveSetting(
        descriptionLibraryKey,
        normalized,
        expected,
      );
      expected = JSON.stringify(normalized);
    }
    snapshot.value = savedState;
    if (serialized() === savedState) editing.value.clear();
    notice.value = "Bibliothèque enregistrée.";
  } catch (e) {
    conflict.value = e.code === "FRAME_CONFLICT";
    error.value = e.message;
    throw e;
  } finally {
    busy.value = false;
  }
}
async function flush() {
  if (loadingPromise) await loadingPromise;
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
      ? structuredTemplate(crypto.randomUUID(), "Nouveau modèle")
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
  if (current.value.slots.length >= 20) return;
  const slot = {
    id: crypto.randomUUID(),
    label: "Ma nouvelle rubrique",
    kind: "text",
    defaultBlockId: "",
  };
  current.value.slots.push(slot);
  if (current.value.body)
    current.value.body += "\n\n{{partie:" + slot.id + "}}";
}
function removeSlot(index) {
  const [slot] = current.value.slots.splice(index, 1);
  current.value.body = current.value.body
    .replace(new RegExp("{{\\s*partie:" + slot.id + "\\s*}}", "g"), "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    <div v-if="error" class="video-alert" role="alert">
      {{ error
      }}<template v-if="conflict"
        ><button class="btn" @click="downloadDraft">
          Télécharger mon brouillon</button
        ><button class="btn" @click="reloadLibrary">
          Recharger la version enregistrée
        </button></template
      ><button v-else-if="!loadedOk" class="btn" @click="load">
        Réessayer
      </button>
    </div>
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
            Blocs réutilisables</button
          ><button
            :class="{ active: settingsMode }"
            @click="changeTab('settings')"
          >
            Rubriques et chaîne
          </button>
        </div>
        <label v-if="!settingsMode" class="resource-search"
          ><Search :size="16" /><input
            v-model="query"
            aria-label="Rechercher dans la bibliothèque"
            placeholder="Rechercher…"
        /></label>
        <div v-if="!settingsMode" class="resource-list-tools">
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
        <p v-if="!visible.length && !settingsMode" class="field-help">
          Aucun résultat. Ajoute un élément avec +.
        </p>
      </aside>
      <section
        v-if="settingsMode"
        class="resource-editor publication-shared-settings"
      >
        <div class="resource-editor-heading">
          <span class="eyebrow">COMMUN À TOUTES LES VIDÉOS EN MODE MODÈLE</span
          ><button
            class="btn"
            @click="editing.add('settings')"
            v-if="!editing.has('settings')"
          >
            <Pencil :size="15" />Modifier les réglages partagés
          </button>
        </div>
        <p class="field-help">
          Les intitulés ci-dessous se mettent à jour dans tous les modèles à
          balises. Les chapitres et les descriptions libres propres à chaque
          vidéo ne sont pas renommés.
        </p>
        <fieldset
          class="resource-editor-fields"
          :disabled="busy || !editing.has('settings')"
        >
          <h2>Styles des titres</h2>
          <p class="field-help">
            Choisis le style par défaut. Chaque vidéo peut utiliser un autre
            pack. Les signes et emojis font partie du texte copié et exporté.
          </p>
          <div class="publication-pack-options">
            <button
              v-for="pack in library.settings.headingPacks"
              :key="pack.id"
              type="button"
              :aria-label="'Style par défaut ' + pack.name"
              :aria-pressed="library.settings.defaultHeadingPack === pack.id"
              :class="{
                active: library.settings.defaultHeadingPack === pack.id,
              }"
              @click="
                library.settings.defaultHeadingPack = pack.id;
                packEditorId = pack.id;
              "
            >
              <strong>{{ pack.name }}</strong
              ><span>{{
                formatPublicationHeading(
                  "Chapitres",
                  "chapitrage",
                  library.settings,
                  pack.id,
                )
              }}</span>
            </button>
          </div>
          <div class="publication-pack-editor" v-if="currentPack">
            <div class="publication-field-grid">
              <label
                >Nom du style<input
                  v-model="currentPack.name"
                  aria-label="Nom du style"
                  maxlength="80" /></label
              ><label class="publication-pack-checkbox"
                ><input
                  type="checkbox"
                  v-model="currentPack.uppercase"
                  aria-label="Titres en majuscules"
                />Titres en majuscules</label
              ><label
                >Signes avant le titre<input
                  v-model="currentPack.prefix"
                  aria-label="Signes avant le titre"
                  maxlength="60"
                  placeholder="===, ***, —…" /></label
              ><label
                >Signes après le titre<input
                  v-model="currentPack.suffix"
                  aria-label="Signes après le titre"
                  maxlength="60"
              /></label>
            </div>
            <details>
              <summary>Emojis des rubriques · facultatifs</summary>
              <div class="publication-field-grid">
                <label
                  v-for="(label, key) in {
                    ...publicationTitles,
                    custom: 'Rubriques personnalisées',
                  }"
                  :key="key"
                  >{{ label
                  }}<input
                    v-model="currentPack.emojis[key]"
                    :aria-label="'Emoji · ' + label"
                    maxlength="32"
                    placeholder="Aucun"
                /></label>
              </div>
            </details>
            <div class="production-actions">
              <button
                class="btn"
                :disabled="library.settings.headingPacks.length >= 20"
                @click="addPack"
              >
                <Plus :size="14" />Créer un style</button
              ><button
                class="btn"
                :disabled="library.settings.headingPacks.length < 2"
                @click="removePack"
              >
                <Trash2 :size="14" />Supprimer ce style
              </button>
            </div>
          </div>
          <h2>Titres des rubriques</h2>
          <div class="publication-field-grid">
            <label v-for="(label, key) in publicationTitles" :key="key"
              >{{ label
              }}<input
                v-model="library.settings.titles[key]"
                :aria-label="'Titre commun · ' + label"
                maxlength="120"
            /></label>
          </div>
          <h2>Ressources complémentaires</h2>
          <label
            >Texte commun de ressources<textarea
              v-model="library.settings.resourcesText"
              aria-label="Texte commun de ressources"
              rows="4"
              maxlength="20000"
            />
          </label>
          <h2>Présentation de la chaîne et invitation</h2>
          <label
            >Texte commun de la chaîne<textarea
              v-model="library.settings.channelText"
              aria-label="Texte commun de la chaîne"
              rows="10"
              maxlength="20000"
            />
          </label>
        </fieldset>
      </section>
      <section class="resource-editor" v-else-if="current" :key="current.id">
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
              :disabled="current.id === 'frame-course-default'"
              :title="
                current.id === 'frame-course-default'
                  ? 'Le modèle de base peut être modifié ou dupliqué en créant un nouveau modèle'
                  : 'Supprimer cet élément'
              "
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
                >Titre affiché · facultatif<input
                  v-model="current.heading"
                  aria-label="Titre affiché du bloc"
                  maxlength="120"
                  placeholder="Vide : contenu sans titre" /></label
              ><DescriptionTokenEditor
                v-model="current.content"
                :library="{
                  blocks: library.blocks.filter((b) => b.id !== current.id),
                }"
                label="Contenu du bloc" /></template
            ><template v-else
              ><label
                >Playlist (facultatif)<input
                  v-model="current.playlist"
                  maxlength="200"
                  placeholder="Vide : modèle utilisable pour toutes les vidéos" /></label
              ><label
                >Lien de playlist par défaut<input
                  v-model="current.playlistUrl"
                  aria-label="Lien de playlist du modèle"
                  maxlength="2000"
                  placeholder="https://www.youtube.com/playlist?list=…"
              /></label>
              <DescriptionTokenEditor
                v-model="current.body"
                :library="library"
                :slots="current.slots"
                label="Structure de la description"
              />
              <p class="field-help">
                Déplace les balises dans ce texte pour changer l’ordre. Ajoute
                des blocs réutilisables ou tes propres parties ci-dessous. Leurs
                noms deviennent les titres des rubriques personnalisées.
              </p>
              <details class="publication-legacy-model">
                <summary>Textes de l’ancien format · compatibilité</summary>
                <p class="field-help">
                  Ces champs sont utilisés si la structure de description est
                  vide.
                </p>
                <label
                  >Texte fixe · début<textarea
                    v-model="current.intro"
                    maxlength="20000"
                    rows="5"
                    aria-label="Texte fixe de début"
                  /></label
                ><label
                  >Texte fixe · fin<textarea
                    v-model="current.outro"
                    rows="4"
                    maxlength="20000"
                    aria-label="Texte fixe de fin"
                  />
                </label>
              </details>
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
                  texte propre à la vidéo. Le glisser-déposer réorganise les
                  champs de saisie ; l’ordre final se règle avec les balises
                  dans la structure.
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
                    >Format<select
                      v-model="slot.kind"
                      :aria-label="'Format de ' + slot.label"
                    >
                      <option value="text">Texte libre</option>
                      <option value="list">Liste · un point par ligne</option>
                    </select></label
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
                    @click="removeSlot(i)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </article>
              </section> </template
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
