<script setup>
import { ref, computed, onMounted, watch, inject } from "vue";
import { FileText, Settings2, RotateCcw } from "lucide-vue-next";
import {
  descriptionLibraryKey,
  normalizeDescriptionLibrary,
  composeDescription,
} from "../publicationTemplates.js";
import { workflowNavigation } from "../workflowNavigation.js";
const props = defineProps({
  repository: Object,
  playlist: String,
  modelValue: String,
  selection: Object,
});
const emit = defineEmits(["update:modelValue", "update:selection"]);
const navigation = inject(workflowNavigation, null),
  library = ref({ templates: [], blocks: [] }),
  selected = ref(""),
  values = ref({}),
  previous = ref(null),
  expanded = ref(false),
  loading = ref(true),
  error = ref(""),
  legacy = ref("");
const current = computed(() =>
    library.value.templates.find((row) => row.id === selected.value),
  ),
  preview = computed(() =>
    composeDescription(current.value, library.value, values.value),
  );
onMounted(async () => {
  try {
    library.value = normalizeDescriptionLibrary(
      await props.repository.getSetting(descriptionLibraryKey),
    );
    const old = await props.repository.getSetting(
      "frame-publication-template:" + (props.playlist || "sans-playlist"),
    );
    legacy.value = old?.description || "";
    selected.value =
      props.selection?.templateId ||
      library.value.templates.find(
        (row) => row.playlist && row.playlist === props.playlist,
      )?.id ||
      library.value.templates.find((row) => !row.playlist)?.id ||
      "";
    values.value = JSON.parse(JSON.stringify(props.selection?.values || {}));
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
watch(
  [selected, values],
  () => {
    if (!loading.value)
      emit("update:selection", {
        templateId: selected.value,
        values: JSON.parse(JSON.stringify(values.value)),
      });
  },
  { deep: true },
);
function choice(slot) {
  return values.value[slot.id]?.custom !== undefined
    ? "custom"
    : (values.value[slot.id]?.blockId ?? slot.defaultBlockId ?? "");
}
function setChoice(slot, value) {
  values.value[slot.id] =
    value === "custom" ? { custom: "" } : { blockId: value };
}
function apply(text) {
  if (
    props.modelValue?.trim() &&
    !window.confirm("Remplacer la description actuelle par cette composition ?")
  )
    return;
  previous.value = props.modelValue;
  emit("update:modelValue", text);
}
async function manage() {
  sessionStorage.setItem("frame-publication-library-return", location.hash);
  await navigation?.navigate("#/modeles-description");
}
</script>
<template>
  <section class="description-composer">
    <div class="description-composer-heading">
      <button
        class="text-action"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <FileText :size="15" />Composer avec un modèle</button
      ><button
        class="icon-btn"
        title="Gérer les modèles de description"
        aria-label="Gérer les modèles de description"
        @click="manage"
      >
        <Settings2 :size="16" />
      </button>
    </div>
    <div v-if="expanded" class="description-composer-body">
      <p v-if="loading">Chargement…</p>
      <template v-else
        ><label
          >Modèle<select
            v-model="selected"
            aria-label="Modèle de description"
            @change="values = {}"
          >
            <option value="">Choisir un modèle</option>
            <option
              v-for="template in library.templates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.name
              }}{{ template.playlist ? " · " + template.playlist : "" }}
            </option>
          </select></label
        >
        <p v-if="!library.templates.length" class="field-help">
          Crée un socle fixe et des parties interchangeables dans la
          bibliothèque des modèles.
        </p>
        <div v-if="current" class="description-composer-slots">
          <label v-for="slot in current.slots" :key="slot.id"
            >{{ slot.label
            }}<select
              :value="choice(slot)"
              :aria-label="'Bloc pour ' + slot.label"
              @change="setChoice(slot, $event.target.value)"
            >
              <option value="">Ne pas inclure</option>
              <option
                v-for="block in library.blocks"
                :key="block.id"
                :value="block.id"
              >
                {{ block.name }}
              </option>
              <option value="custom">Texte propre à cette vidéo</option></select
            ><textarea
              v-if="choice(slot) === 'custom'"
              v-model="values[slot.id].custom"
              maxlength="20000"
              rows="3"
              :aria-label="'Texte pour ' + slot.label"
            />
          </label>
        </div>
        <details v-if="current" class="description-composer-preview">
          <summary>
            Aperçu de la composition · {{ preview.length }} caractères
          </summary>
          <pre>{{ preview }}</pre>
        </details>
        <div class="production-actions">
          <button
            v-if="current"
            class="btn"
            :disabled="!preview.trim()"
            @click="apply(preview)"
          >
            Appliquer à cette vidéo</button
          ><button v-if="legacy" class="text-action" @click="apply(legacy)">
            Reprendre l’ancien modèle de la playlist</button
          ><button class="text-action" @click="manage">
            Gérer les modèles et les blocs
          </button>
        </div></template
      >
    </div>
    <button
      v-if="previous !== null"
      class="text-action"
      @click="
        emit('update:modelValue', previous);
        previous = null;
      "
    >
      <RotateCcw :size="13" />Annuler le remplacement
    </button>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
