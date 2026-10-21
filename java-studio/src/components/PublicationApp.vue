<script setup>
import { ref, computed, watch, nextTick } from "vue";
import {
  Copy,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from "lucide-vue-next";
import PublicationTemplateForm from "./PublicationTemplateForm.vue";
import PublicationDetails from "./PublicationDetails.vue";
import PublicationPreview from "./PublicationPreview.vue";
import { usePublicationComposition } from "../usePublicationComposition.js";
import "../publication.css";
import PublicationMusic from "./PublicationMusic.vue";
import {
  musicLibraryKey,
  normalizeMusicLibrary,
  musicCredits,
} from "../publicationMusic.js";
import VideoWorkflowNav from "./VideoWorkflowNav.vue";
import WorkspaceHeader from "./WorkspaceHeader.vue";
import WorkflowAlerts from "./WorkflowAlerts.vue";
import LibraryPreview from "./LibraryPreview.vue";
import { useVideoWorkflow, downloadText } from "../useVideoWorkflow.js";
import {
  normalizeWorkflow,
  chapterErrors,
  chaptersText,
  chaptersFromConductor,
} from "../videoWorkflow.js";
const props = defineProps({ repository: Object, videoId: String });
const emit = defineEmits(["home", "back", "workshop", "open-creation"]);
const {
  project,
  data,
  error,
  loading,
  saving,
  dirty,
  recovery,
  storageError,
  load,
  save,
  flush: flushWorkflow,
  recover,
  exportDraft,
} = useVideoWorkflow(props, "publication");
const reading = ref(false);
const {
  library: sharedLibrary,
  templates: descriptionTemplates,
  videos,
  neighbors,
  result: composed,
  description: finalDescription,
  ready: compositionReady,
  error: compositionError,
  refresh: refreshComposition,
} = usePublicationComposition(props, project, data);
async function flush() {
  await refreshComposition();
  await nextTick();
  await flushWorkflow();
}
defineExpose({ flush });
const notice = ref(""),
  chapterUndo = ref(null);
const thumbnails = computed(
    () => project.value?.creations.filter((c) => c.app === "thumbnails") || [],
  ),
  thumbnail = computed(() =>
    thumbnails.value.find((c) => c.id === data.value?.thumbnailId),
  );
watch(
  [thumbnails, data],
  () => {
    if (
      data.value &&
      thumbnails.value.length &&
      !thumbnails.value.some((row) => row.id === data.value.thumbnailId)
    )
      data.value.thumbnailId = thumbnails.value[0].id;
  },
  { immediate: true },
);
function cycleThumbnail(delta) {
  const rows = thumbnails.value;
  if (!rows.length) return;
  const i = rows.findIndex((row) => row.id === data.value.thumbnailId);
  data.value.thumbnailId = rows[(i + delta + rows.length) % rows.length].id;
}
const issues = computed(() => chapterErrors(data.value?.chapters || [])),
  formatted = computed(() => chaptersText(data.value?.chapters || []));
const publicationWarnings = computed(() => [
  ...composed.value.warnings,
  ...issues.value,
]);
async function go(action) {
  try {
    await flush();
    action();
  } catch {}
}
async function copy(value, name) {
  try {
    if (!navigator.clipboard?.writeText) throw Error();
    await navigator.clipboard.writeText(value);
    notice.value = name + " copié.";
  } catch {
    notice.value =
      "La copie n’est pas disponible ici. Sélectionne le texte du champ puis utilise Ctrl/⌘ C.";
  }
}
function addChapter() {
  if (data.value.chapters.length < 100)
    data.value.chapters.push({
      id: crypto.randomUUID(),
      sequenceId: "",
      time: "",
      title: "Chapitre " + (data.value.chapters.length + 1),
    });
}
function moveChapter(i, delta) {
  const to = i + delta;
  if (to < 0 || to >= data.value.chapters.length) return;
  const [row] = data.value.chapters.splice(i, 1);
  data.value.chapters.splice(to, 0, row);
}
const chapterDrag = ref(""),
  chapterDrop = ref(null);
function startChapterDrag(event, id) {
  chapterDrag.value = id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", id);
}
function setChapterDrop(event, index) {
  const rect = event.currentTarget.getBoundingClientRect();
  chapterDrop.value =
    index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
}
function dropChapter(index) {
  const from = data.value.chapters.findIndex(
    (row) => row.id === chapterDrag.value,
  );
  if (from < 0) return;
  chapterUndo.value = JSON.parse(JSON.stringify(data.value.chapters));
  const [row] = data.value.chapters.splice(from, 1);
  data.value.chapters.splice(index > from ? index - 1 : index, 0, row);
  chapterDrag.value = "";
  chapterDrop.value = null;
}
async function fromConductor() {
  try {
    const latest = await props.repository.get(props.videoId),
      sequences = normalizeWorkflow(latest?.workflow).conductor.sequences;
    if (!sequences.length) {
      notice.value = "Le conducteur ne contient pas encore de parties.";
      return;
    }
    chapterUndo.value = structuredClone(
      JSON.parse(JSON.stringify(data.value.chapters)),
    );
    data.value.chapters = chaptersFromConductor(sequences, data.value.chapters);
    notice.value =
      "Titres repris du conducteur. Renseigne les horaires du montage final.";
  } catch (e) {
    error.value = e.message;
  }
}
function removeChapter(i) {
  chapterUndo.value = JSON.parse(JSON.stringify(data.value.chapters));
  data.value.chapters.splice(i, 1);
}
async function exportPublication() {
  try {
    await flush();
    const extra =
      data.value.descriptionMode === "template"
        ? ""
        : `\n\nCHAPITRES\n${formatted.value}\n\nMUSIQUES DE FOND\n${musicCredits(normalizeMusicLibrary(await props.repository.getSetting(musicLibraryKey)), data.value.musicIds)}`;
    downloadText(
      "publication.txt",
      `TITRE\n${data.value.title || project.value.name}\n\nDESCRIPTION\n${finalDescription.value}${extra}\n\nCOMMENTAIRE ÉPINGLÉ\n${composed.value.comment}${composed.value.tags ? "\n\nTAGS YOUTUBE\n" + composed.value.tags : ""}`,
    );
  } catch (e) {
    error.value = e.message || "Export impossible.";
  }
}
</script>
<template>
  <main
    class="production-app publication-app"
    @keydown.ctrl.s.prevent="flush().catch(() => {})"
    @keydown.meta.s.prevent="flush().catch(() => {})"
  >
    <WorkspaceHeader
      title=""
      back-label="Vidéo"
      @home="go(() => emit('home'))"
      @back="go(() => emit('back'))"
      ><template #context
        ><span class="creation-context-name">{{ project?.name }}</span
        ><span class="production-test">TEST</span></template
      ><template #file
        ><button @click="flush().catch(() => {})">Enregistrer · Ctrl S</button
        ><button :disabled="!data" @click="exportPublication">
          Exporter les textes de publication
        </button></template
      ><template #actions
        ><span class="save-state" role="status">{{
          saving
            ? "Sauvegarde…"
            : dirty
              ? "Modifications en attente"
              : "Enregistré"
        }}</span>
        <div class="workspace-switch" aria-label="Mode de publication">
          <button
            :class="{ active: !reading }"
            :aria-pressed="!reading"
            @click="reading = false"
          >
            Préparer</button
          ><button
            :class="{ active: reading }"
            :aria-pressed="reading"
            @click="reading = true"
          >
            Aperçu
          </button>
        </div>
        <VideoWorkflowNav
          active="publication"
          @navigate="(name) => go(() => emit('workshop', name))" /></template
    ></WorkspaceHeader>
    <WorkflowAlerts
      :error="error"
      :storage-error="storageError"
      :recovery="!!recovery"
      @retry="flush().catch(() => {})"
      @reload="load"
      @export="exportDraft"
      @recover="recover"
    />
    <p v-if="loading" class="production-loading">
      Ouverture de la publication…
    </p>
    <template v-else-if="project && data">
      <p v-if="notice" class="publication-feedback" role="status">
        {{ notice }}
      </p>
      <div v-if="compositionError" class="publication-feedback" role="alert">
        {{ compositionError
        }}<button class="btn" @click="refreshComposition">Réessayer</button>
      </div>
      <div
        v-if="publicationWarnings.length"
        class="publication-composition-warnings"
        role="status"
      >
        <p v-for="warning in publicationWarnings" :key="warning">
          {{ warning }}
        </p>
      </div>
      <PublicationPreview
        v-if="reading"
        :title="data.title || project.name"
        :description="finalDescription"
        :comment="composed.comment"
        :tags="composed.tags"
        @copy="copy"
      />
      <div v-else class="publication-layout">
        <section class="publication-writing">
          <article class="production-card publication-title">
            <div class="publication-field-label">
              <label for="publication-title">Titre</label
              ><button
                class="icon-btn"
                title="Copier le titre"
                aria-label="Copier le titre"
                :disabled="!data.title.trim()"
                @click="copy(data.title, 'Titre')"
              >
                <Copy :size="16" />
              </button>
            </div>
            <input
              id="publication-title"
              v-model="data.title"
              aria-label="Titre YouTube"
              maxlength="200"
              :placeholder="project.name"
            /><button
              v-if="!data.title"
              class="text-action"
              @click="data.title = project.name"
            >
              Utiliser le nom de la vidéo
            </button>
          </article>
          <PublicationTemplateForm
            :publication="data"
            :templates="descriptionTemplates"
            :library="sharedLibrary"
            :ready="compositionReady"
          />
          <PublicationDetails
            :publication="data"
            :videos="videos"
            :neighbors="neighbors"
            :video-id="videoId"
            part="intro"
          />
          <article class="production-card publication-texts">
            <section>
              <div class="publication-field-label">
                <label for="publication-description">Description</label
                ><button
                  class="icon-btn"
                  :disabled="
                    !finalDescription.trim() ||
                    (!compositionReady && data.descriptionMode === 'template')
                  "
                  title="Copier : Description"
                  aria-label="Copier : Description"
                  @click="copy(finalDescription, 'Description')"
                >
                  <Copy :size="16" />
                </button>
              </div>
              <textarea
                v-if="data.descriptionMode !== 'template'"
                id="publication-description"
                v-model="data.description"
                aria-label="Description YouTube"
                rows="6"
                maxlength="20000"
                placeholder="Dans cette vidéo…"
              />
              <p v-if="data.descriptionMode === 'template'" class="field-help">
                La description est composée par le modèle.
                <button class="text-action" @click="reading = true">
                  Voir le résultat dans Aperçu
                </button>
              </p>
              <p class="publication-character-count">
                {{ finalDescription.length.toLocaleString("fr-FR") }} / 5 000
                caractères
              </p>
            </section>
            <section>
              <div class="publication-field-label">
                <span id="chapters-label">Chapitres</span
                ><button
                  class="icon-btn"
                  :disabled="!data.chapters.length || issues.length > 0"
                  title="Copier : Chapitres"
                  aria-label="Copier : Chapitres"
                  @click="copy(formatted, 'Chapitres')"
                >
                  <Copy :size="16" />
                </button>
              </div>
              <div class="production-actions chapter-actions">
                <button class="btn" @click="fromConductor">
                  Reprendre les titres du conducteur</button
                ><button
                  class="btn"
                  :disabled="data.chapters.length >= 100"
                  @click="addChapter"
                >
                  <Plus :size="14" />Ajouter</button
                ><button
                  v-if="chapterUndo"
                  class="text-action"
                  @click="
                    data.chapters = chapterUndo;
                    chapterUndo = null;
                  "
                >
                  Annuler la dernière modification de liste
                </button>
              </div>
              <div v-if="!data.chapters.length" class="production-inline-empty">
                Commence depuis le conducteur ou ajoute tes propres chapitres.
              </div>
              <div
                v-for="(chapter, i) in data.chapters"
                :key="chapter.id"
                class="publication-chapter"
                :class="{
                  'chapter-drop-before': chapterDrop === i,
                  'chapter-is-dragging': chapterDrag === chapter.id,
                  'chapter-drop-after':
                    i === data.chapters.length - 1 &&
                    chapterDrop === data.chapters.length,
                }"
                @dragover.prevent="setChapterDrop($event, i)"
                @drop.prevent="dropChapter(chapterDrop ?? i)"
              >
                <button
                  class="icon-btn chapter-grip"
                  draggable="true"
                  :aria-label="'Déplacer le chapitre ' + (i + 1)"
                  title="Glisser pour réordonner"
                  @dragstart="startChapterDrag($event, chapter.id)"
                  @dragend="
                    chapterDrag = '';
                    chapterDrop = null;
                  "
                >
                  <GripVertical :size="16" /></button
                ><span>{{ String(i + 1).padStart(2, "0") }}</span
                ><input
                  v-model="chapter.time"
                  :aria-label="'Horaire du chapitre ' + (i + 1)"
                  placeholder="00:00"
                  maxlength="12"
                /><input
                  v-model="chapter.title"
                  :aria-label="'Titre du chapitre ' + (i + 1)"
                  placeholder="Titre du chapitre"
                  maxlength="200"
                />
                <div>
                  <button
                    data-reorder-arrow
                    class="icon-btn"
                    :disabled="i === 0"
                    :aria-label="'Monter le chapitre ' + (i + 1)"
                    @click="moveChapter(i, -1)"
                  >
                    <ArrowUp :size="13" /></button
                  ><button
                    data-reorder-arrow
                    class="icon-btn"
                    :disabled="i === data.chapters.length - 1"
                    :aria-label="'Descendre le chapitre ' + (i + 1)"
                    @click="moveChapter(i, 1)"
                  >
                    <ArrowDown :size="13" /></button
                  ><button
                    class="icon-btn"
                    :aria-label="'Supprimer le chapitre ' + (i + 1)"
                    @click="removeChapter(i)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              <div v-if="issues.length" class="chapter-issues" role="status">
                <p v-for="issue in issues.slice(0, 4)" :key="issue">
                  {{ issue }}
                </p>
                <p v-if="issues.length > 4">
                  Et {{ issues.length - 4 }} autres champs à compléter.
                </p>
              </div>
              <details v-if="data.chapters.length" class="chapter-copy-preview">
                <summary>Voir le texte à copier</summary>
                <textarea
                  :value="formatted"
                  aria-label="Chapitres formatés"
                  readonly
                  rows="4"
                />
              </details>
            </section>
            <PublicationDetails
              :publication="data"
              :videos="videos"
              :neighbors="neighbors"
              :video-id="videoId"
              part="details"
            />
            <PublicationMusic
              :repository="repository"
              v-model="data.musicIds"
            />
            <section>
              <div class="publication-field-label">
                <label for="publication-comment">Commentaire épinglé</label
                ><button
                  class="icon-btn"
                  :disabled="!composed.comment.trim()"
                  title="Copier : Commentaire épinglé"
                  aria-label="Copier : Commentaire épinglé"
                  @click="copy(composed.comment, 'Commentaire')"
                >
                  <Copy :size="16" />
                </button>
              </div>
              <textarea
                id="publication-comment"
                v-model="data.comment"
                aria-label="Commentaire épinglé"
                rows="6"
                maxlength="20000"
                placeholder="Ton message personnel à épingler…"
              />
              <p v-if="data.details.resources.length" class="field-help">
                Les liens de ressources seront ajoutés automatiquement à ce
                texte. Consulte le commentaire final dans Aperçu.
              </p>
            </section>
          </article>
        </section>
        <aside class="publication-visual">
          <article class="production-card">
            <div class="publication-field-label">
              <span>Miniature</span><Image :size="18" />
            </div>
            <div v-if="thumbnails.length" class="publication-carousel">
              <button
                class="icon-btn"
                aria-label="Miniature précédente"
                :disabled="thumbnails.length < 2"
                @click="cycleThumbnail(-1)"
              >
                <ChevronLeft :size="18" /></button
              ><span
                >{{
                  thumbnails.findIndex((row) => row.id === data.thumbnailId) + 1
                }}
                / {{ thumbnails.length
                }}<small>{{ thumbnail?.name }}</small></span
              ><button
                class="icon-btn"
                aria-label="Miniature suivante"
                :disabled="thumbnails.length < 2"
                @click="cycleThumbnail(1)"
              >
                <ChevronRight :size="18" />
              </button>
            </div>
            <div
              v-if="thumbnail"
              :key="thumbnail.id"
              class="publication-thumbnail"
            >
              <LibraryPreview :repository="repository" :creation="thumbnail" />
              <h3>{{ data.title || project.name }}</h3>
              <button
                class="btn"
                @click="
                  go(() =>
                    emit('open-creation', videoId, thumbnail.app, thumbnail.id),
                  )
                "
              >
                Ouvrir dans Miniatures<ExternalLink :size="14" />
              </button>
            </div>
            <div v-else class="production-inline-empty">
              <Image :size="30" />
              <p>
                {{
                  data.thumbnailId
                    ? "Cette miniature a été retirée de la vidéo."
                    : "Retrouve ici les miniatures de cette vidéo."
                }}
              </p>
              <button
                v-if="!thumbnails.length"
                class="btn"
                @click="go(() => emit('back'))"
              >
                Créer depuis la fiche vidéo
              </button>
            </div>
            <div v-if="thumbnails.length > 1" class="publication-variants">
              <button
                v-for="row in thumbnails"
                :key="row.id"
                :class="{ active: row.id === data.thumbnailId }"
                :aria-label="'Choisir ' + row.name"
                :aria-pressed="row.id === data.thumbnailId"
                @click="data.thumbnailId = row.id"
              >
                <LibraryPreview
                  :repository="repository"
                  :creation="row"
                /><span>{{ row.name }}</span>
              </button>
            </div>
          </article>
        </aside>
      </div>
    </template>
  </main>
</template>
