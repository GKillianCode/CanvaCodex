<script setup>
import { computed, ref } from "vue";
import {
  GripVertical,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Eye,
  Code2,
} from "lucide-vue-next";
import {
  descriptionSections,
  sectionsBody,
  moveDescriptionSection,
  legacyDescriptionBody,
} from "../descriptionStructure.js";
import { descriptionTokens } from "../publicationTemplates.js";
import { composePublication } from "../publicationComposition.js";
import DescriptionTokenEditor from "./DescriptionTokenEditor.vue";
const props = defineProps({
  template: Object,
  library: Object,
  disabled: Boolean,
});
const emit = defineEmits(["update:body"]);
const dragged = ref(-1),
  target = ref(-1),
  adding = ref("");
const rows = computed(() => descriptionSections(props.template.body));
const options = computed(() => [
  ...descriptionTokens.map(([value, label]) => ({ value, label })),
  ...props.library.blocks.map((b) => ({
    value: "bloc:" + b.id,
    label: b.name,
  })),
  ...props.template.slots.map((s) => ({
    value: "partie:" + s.id,
    label: s.label,
  })),
  { value: "__text", label: "Texte libre" },
]);
function info(row) {
  if (row.kind === "text") return { label: "Texte libre", detail: row.value };
  const option = options.value.find((o) => o.value === row.value);
  return {
    label:
      props.library.settings.titles[row.value] || option?.label || row.value,
    detail: row.value.startsWith("bloc:")
      ? "Bloc partagé"
      : row.value.startsWith("partie:")
        ? "Partie personnalisée"
        : "Rubrique dynamique",
  };
}
function write(value) {
  if (props.disabled) return;
  if (value.length > 20000) {
    error.value = "Le modèle dépasse 20 000 caractères.";
    return;
  }
  error.value = "";
  emit("update:body", value);
}
const error = ref("");
function move(from, destination) {
  write(moveDescriptionSection(props.template.body, from, destination));
}
function drop() {
  if (dragged.value >= 0 && target.value >= 0)
    move(dragged.value, target.value);
  clear();
}
function clear() {
  dragged.value = -1;
  target.value = -1;
}
function start(event, index) {
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  dragged.value = index;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(
    "text/plain",
    "frame-description-section:" + index,
  );
}
function over(event, index) {
  if (dragged.value < 0) return;
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  target.value = index + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
  event.dataTransfer.dropEffect = "move";
}
function remove(index) {
  const next = rows.value.slice();
  next.splice(index, 1);
  write(sectionsBody(next));
}
function add() {
  if (!adding.value) return;
  const next = [
    ...rows.value,
    adding.value === "__text"
      ? { kind: "text", value: "Votre texte partagé." }
      : { kind: "token", value: adding.value },
  ];
  write(sectionsBody(next));
  adding.value = "";
}
function editText(index, value) {
  const next = rows.value.map((row) => ({ ...row }));
  next[index].value = value;
  write(sectionsBody(next));
}
const hasLegacy = computed(
  () =>
    !props.template.body.trim() &&
    (props.template.intro ||
      props.template.outro ||
      props.template.slots.length),
);
function convertLegacy() {
  write(legacyDescriptionBody(props.template));
}
const preview = computed(() =>
  composePublication(
    {
      descriptionMode: "template",
      descriptionRecipe: {
        templateId: props.template.id,
        values: Object.fromEntries(
          props.template.slots.map((s) => [
            s.id,
            s.defaultBlockId
              ? { blockId: s.defaultBlockId }
              : { custom: "Contenu propre à la vidéo." },
          ]),
        ),
      },
      details: {
        introduction: "Une introduction pour présenter votre vidéo.",
        programme: "Premier objectif\nDeuxième objectif",
        technical: [
          {
            id: "demo",
            topic: "Notion abordée",
            notes: "Une précision sur le contenu.",
          },
        ],
        hashtags: "#VotreSujet",
      },
      chapters: [
        { time: "00:00", title: "Introduction" },
        { time: "01:00", title: "Comprendre le sujet" },
        { time: "02:00", title: "Mise en pratique" },
      ],
      comment: "",
    },
    { ...props.library, templates: [props.template] },
    [],
    {},
  ),
);
</script>
<template>
  <div class="description-builder">
    <div v-if="hasLegacy" class="description-legacy-notice">
      <p>
        Ce modèle utilise l’ancien format. Reprends son contenu en sections pour
        le réorganiser visuellement ; ses textes d’origine restent conservés.
      </p>
      <button v-if="!disabled" class="btn" type="button" @click="convertLegacy">
        Organiser l’ancien contenu
      </button>
    </div>
    <div class="description-builder-columns">
      <section class="description-sections" aria-label="Ordre des sections">
        <div class="description-builder-title">
          <Layers :size="16" />
          <h3>Ordre des sections</h3>
          <span>{{ rows.length }}</span>
        </div>
        <p class="field-help">
          Glisse une poignée pour déplacer une section. Cet ordre s’applique aux
          vidéos utilisant ce modèle.
        </p>
        <ol
          @drop.prevent.stop="drop"
          @dragover.prevent
          @dragleave="
            (event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                target = -1;
            }
          "
        >
          <li
            v-for="(row, index) in rows"
            :key="index"
            :class="{
              'is-dragged': dragged === index,
              'drop-before': target === index,
              'drop-after': target === rows.length && index === rows.length - 1,
            }"
            @dragover="over($event, index)"
          >
            <div class="description-section-line">
              <button
                type="button"
                class="description-section-grip"
                :disabled="disabled"
                :draggable="!disabled"
                :aria-label="'Déplacer ' + info(row).label"
                title="Glisser pour réorganiser · Alt + flèche haut ou bas"
                @dragstart="start($event, index)"
                @dragend="clear"
                @keydown.alt.up.prevent="move(index, index - 1)"
                @keydown.alt.down.prevent="move(index, index + 2)"
              >
                <GripVertical :size="16" />
              </button>
              <span class="description-section-number">{{
                String(index + 1).padStart(2, "0")
              }}</span>
              <div class="description-section-name">
                <strong>{{ info(row).label }}</strong
                ><small v-if="row.kind !== 'text'">{{
                  info(row).detail
                }}</small>
              </div>
              <div v-if="!disabled" class="description-section-actions">
                <button
                  type="button"
                  class="icon-btn"
                  data-reorder-arrow
                  :aria-label="'Monter ' + info(row).label"
                  :disabled="index === 0"
                  @click="move(index, index - 1)"
                >
                  <ArrowUp :size="13" /></button
                ><button
                  type="button"
                  class="icon-btn"
                  data-reorder-arrow
                  :aria-label="'Descendre ' + info(row).label"
                  :disabled="index === rows.length - 1"
                  @click="move(index, index + 2)"
                >
                  <ArrowDown :size="13" /></button
                ><button
                  type="button"
                  class="icon-btn"
                  :aria-label="'Retirer ' + info(row).label + ' du modèle'"
                  @click="remove(index)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
            <textarea
              v-if="row.kind === 'text'"
              :value="row.value"
              :disabled="disabled"
              :aria-label="'Texte libre de la section ' + (index + 1)"
              rows="3"
              @change="editText(index, $event.target.value)"
            />
          </li>
        </ol>
        <p v-if="!rows.length" class="description-builder-empty">
          Ajoute une première section à ce modèle.
        </p>
        <div v-if="!disabled" class="description-section-add">
          <select v-model="adding" aria-label="Section à ajouter">
            <option value="">Ajouter une section…</option>
            <option
              v-for="option in options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option></select
          ><button type="button" class="btn" :disabled="!adding" @click="add">
            <Plus :size="15" />Ajouter
          </button>
        </div>
        <p v-if="error" role="alert">{{ error }}</p>
      </section>
      <aside class="description-example" aria-label="Exemple de description">
        <div class="description-builder-title">
          <Eye :size="16" />
          <h3>Exemple de rendu</h3>
        </div>
        <p class="field-help">
          Données d’illustration · les rubriques vides sont masquées dans tes
          vidéos.
        </p>
        <div class="description-example-paper">
          {{
            preview.description || "Le modèle ne contient pas encore de texte."
          }}
        </div>
        <p v-if="preview.warnings.length" class="field-help">
          {{ preview.warnings.join(" ") }}
        </p>
      </aside>
    </div>
    <details class="description-source">
      <summary><Code2 :size="15" />Structure texte · avancé</summary>
      <p class="field-help">
        Les sections correspondent aux balises. Leur déplacement sépare les
        sections par une ligne vide ; les textes existants restent conservés.
      </p>
      <DescriptionTokenEditor
        :model-value="template.body"
        :library="library"
        :slots="template.slots"
        label="Structure de la description"
        @update:model-value="write"
      />
    </details>
  </div>
</template>
