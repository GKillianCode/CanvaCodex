<script setup>
import { inject, computed } from "vue";
import { Settings2, Blocks } from "lucide-vue-next";
import { formatPublicationHeading } from "../publicationTemplates.js";
import { workflowNavigation } from "../workflowNavigation.js";
const props = defineProps({
  publication: Object,
  templates: Array,
  library: Object,
  ready: Boolean,
});
const emit = defineEmits(["preview"]);
const navigation = inject(workflowNavigation, null);
const current = computed(() =>
  props.templates.find(
    (t) => t.id === props.publication.descriptionRecipe.templateId,
  ),
);
const drafts = new Map();
function choose(event) {
  const previous = props.publication.descriptionRecipe;
  if (previous.templateId)
    drafts.set(
      previous.templateId,
      JSON.parse(JSON.stringify(previous.values)),
    );
  const id = event.target.value;
  props.publication.descriptionMode = id ? "template" : "manual";
  if (id)
    props.publication.descriptionRecipe = {
      templateId: id,
      values:
        props.publication.descriptionRecipe.templateId === id
          ? props.publication.descriptionRecipe.values
          : drafts.get(id) || {},
    };
}
function manage() {
  sessionStorage.setItem("frame-publication-library-return", location.hash);
  navigation?.navigate("#/modeles-description").catch(() => {});
}
function setChoice(slot, event) {
  props.publication.descriptionRecipe.values[slot.id] =
    event.target.value === "custom"
      ? { custom: "" }
      : { blockId: event.target.value };
}
function choice(slot) {
  const value = props.publication.descriptionRecipe.values[slot.id];
  return value?.custom !== undefined
    ? "custom"
    : (value?.blockId ?? slot.defaultBlockId);
}
</script>
<template>
  <article class="production-card publication-template-form">
    <div class="publication-field-label">
      <label for="publication-template"><Blocks :size="16" /> Description</label
      ><button class="text-action" @click="manage">
        <Settings2 :size="15" />Gérer les modèles et blocs
      </button>
    </div>
    <select
      id="publication-template"
      aria-label="Modèle de description"
      :disabled="!ready"
      :value="
        publication.descriptionMode === 'template'
          ? publication.descriptionRecipe.templateId
          : ''
      "
      @change="choose"
    >
      <option value="">Rédaction libre · conserver mon texte</option>
      <option
        v-if="publication.descriptionMode === 'template' && !current"
        :value="publication.descriptionRecipe.templateId"
      >
        Modèle introuvable · dernier rendu conservé
      </option>
      <option
        v-for="template in templates"
        :key="template.id"
        :value="template.id"
      >
        {{ template.name
        }}{{ template.playlist ? " · " + template.playlist : "" }}
      </option>
    </select>
    <p class="field-help" v-if="publication.descriptionMode === 'template'">
      Les balises du modèle se remplissent avec les rubriques ci-dessous. Les
      textes communs se mettent à jour pour toutes les vidéos qui utilisent un
      modèle. Ta rédaction libre est conservée.
    </p>
    <p class="field-help" v-else>
      Ton texte existant reste inchangé. Choisis un modèle pour composer la
      description automatiquement.
    </p>
    <div
      v-if="publication.descriptionMode === 'template'"
      class="publication-heading-packs"
    >
      <div class="publication-pack-heading">
        <span>Style des titres</span
        ><button
          class="text-action"
          @click="publication.details.headingPackId = ''"
          :disabled="!publication.details.headingPackId"
        >
          Suivre le style par défaut
        </button>
      </div>
      <div class="publication-pack-options">
        <button
          v-for="pack in library.settings.headingPacks"
          :key="pack.id"
          type="button"
          :aria-label="'Style ' + pack.name"
          :aria-pressed="
            (publication.details.headingPackId ||
              library.settings.defaultHeadingPack) === pack.id
          "
          :class="{
            active:
              (publication.details.headingPackId ||
                library.settings.defaultHeadingPack) === pack.id,
          }"
          @click="publication.details.headingPackId = pack.id"
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
    </div>
    <template
      v-if="
        publication.descriptionMode === 'template' && current?.slots?.length
      "
      ><div class="publication-custom-slots">
        <section v-for="slot in current.slots" :key="slot.id">
          <label
            >{{ slot.label
            }}<select
              :aria-label="'Source de ' + slot.label"
              :value="choice(slot)"
              @change="setChoice(slot, $event)"
            >
              <option value="">Ne pas afficher</option>
              <option value="custom">Texte propre à cette vidéo</option>
              <option
                v-for="block in library.blocks"
                :key="block.id"
                :value="block.id"
              >
                {{ block.name }}
              </option>
            </select></label
          ><textarea
            v-if="choice(slot) === 'custom'"
            v-model="publication.descriptionRecipe.values[slot.id].custom"
            :aria-label="slot.label"
            rows="4"
            maxlength="20000"
            :placeholder="
              slot.kind === 'list'
                ? 'Un point par ligne…'
                : 'Contenu de cette partie…'
            "
          />
        </section></div
    ></template>
  </article>
</template>
