<script setup>
import { computed, ref, reactive } from "vue";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Box,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  Share2,
  Link,
} from "lucide-vue-next";
import ComponentPreview from "./ComponentPreview.vue";
import { componentStates } from "../componentInstances.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  query = ref(""),
  creating = ref(false);
const filtered = computed(() =>
  s.libraryComponents.filter((c) =>
    c.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase()),
  ),
);
async function create() {
  await s.createComponent();
  creating.value = false;
  query.value = "";
}
</script>
<template>
  <section class="components-library">
    <div class="library-heading">
      <div>
        <h3>Composants</h3>
        <p>{{ s.libraryComponents.length }} modèle(s) réutilisables</p>
      </div>
      <Box :size="22" />
    </div>
    <div class="library-scope">
      <button
        class="btn"
        :class="{ active: s.libraryScope === 'shared' }"
        @click="s.libraryScope = 'shared'"
      >
        Tous les ateliers</button
      ><button
        class="btn"
        :class="{ active: s.libraryScope === 'project' }"
        @click="s.libraryScope = 'project'"
      >
        Ce document
      </button>
    </div>
    <p class="field-help">
      Les nouvelles insertions sont liées au modèle. Édite-le dans un autre
      onglet pour mettre à jour ses instances.
    </p>
    <p v-if="s.sharedError" role="status" class="library-error">
      {{ s.sharedError }}
    </p>
    <p v-else class="field-help" :title="s.sharedFileName">
      Enregistrés sur cet ordinateur · components.json
    </p>
    <div class="library-file-actions">
      <button
        class="btn"
        title="Relire le fichier local"
        @click="s.refreshSharedLibrary()"
      >
        <RefreshCw :size="14" /></button
      ><button class="btn" @click="s.exportComponents">
        <Download :size="14" />Exporter</button
      ><label class="btn"
        ><Upload :size="14" />Importer<input
          type="file"
          accept="application/json,.json"
          hidden
          @change="s.importComponents"
      /></label>
    </div>
    <button
      class="btn primary full"
      :disabled="!s.selectedKeys.length || s.sharedBusy"
      @click="creating = !creating"
    >
      <Plus :size="15" />Créer avec la sélection
    </button>
    <form v-if="creating" class="component-create" @submit.prevent="create">
      <label
        >Nom<input
          v-model="s.componentName"
          maxlength="60"
          required
          aria-label="Nom du composant" /></label
      ><button class="btn primary" :disabled="s.sharedBusy">Créer</button>
    </form>
    <label class="library-search"
      ><Search :size="15" /><input
        v-model="query"
        aria-label="Rechercher un composant"
        placeholder="Rechercher…"
    /></label>
    <p v-if="!filtered.length" class="field-help">
      Aucun composant à afficher.
    </p>
    <article v-for="c in filtered" :key="c.id" class="component-card">
      <button
        class="component-insert-preview"
        :aria-label="'Insérer ' + c.name"
        @click="s.useComponent(c)"
      >
        <ComponentPreview :component="c" :theme="s.theme" /><span
          ><Plus :size="15" />Insérer</span
        >
      </button>
      <div class="component-card-info">
        <div>
          <strong>{{ c.name }}</strong
          ><small
            >{{ c.items.length }} objets ·
            {{ componentStates(c).length }} état(s)</small
          >
        </div>
        <a
          class="icon-btn"
          :href="'#/composants/' + encodeURIComponent(c.id)"
          target="_blank"
          rel="noopener"
          :aria-label="'Éditer ' + c.name"
          title="Éditer dans un nouvel onglet"
          ><ExternalLink :size="15" /></a
        ><button
          class="icon-btn"
          :disabled="s.selectedKeys.length !== c.items.length"
          :aria-label="'Lier la sélection à ' + c.name"
          title="Lier une ancienne copie sélectionnée à ce modèle"
          @click="s.linkComponent(c)"
        >
          <Link :size="14" /></button
        ><button
          class="icon-btn"
          :aria-label="'Supprimer ' + c.name"
          @click="s.deleteComponent(c.id)"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </article>
  </section>
</template>
