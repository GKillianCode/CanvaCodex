<script setup>
import { ref } from "vue";
import { Plus, Trash2, X } from "lucide-vue-next";
import {
  catalogSnapshot,
  normalizeCatalog,
  installCatalog,
} from "../videoCatalog.js";
const props = defineProps({ repository: Object });
const emit = defineEmits(["close", "saved"]);
const draft = ref(catalogSnapshot()),
  busy = ref(false),
  error = ref(""),
  message = ref("");
function add(kind) {
  draft.value[kind].push(["custom-" + crypto.randomUUID(), ""]);
  message.value = "";
}
function remove(kind, id) {
  draft.value[kind] = draft.value[kind].filter((row) => row[0] !== id);
  if (draft.value.defaultType === id) draft.value.defaultType = "";
  if (draft.value.fallbackStatus === id)
    draft.value.fallbackStatus = draft.value.statuses[0]?.[0] || "";
  message.value = "";
}
async function save(apply = false) {
  if (busy.value) return;
  error.value = "";
  message.value = "";
  try {
    for (const kind of ["statuses", "types"]) {
      const names = draft.value[kind].map(([, name]) =>
        name.trim().toLocaleLowerCase(),
      );
      if (names.some((name) => !name) || new Set(names).size !== names.length)
        throw Error(
          "Chaque statut ou type doit avoir un nom unique et non vide.",
        );
    }
    if (!draft.value.statuses.length)
      throw Error("Conserve au moins un statut.");
    if (apply && !draft.value.defaultType)
      throw Error("Choisis d’abord un type par défaut.");
    busy.value = true;
    const result = await props.repository.saveVideoCatalog(
      normalizeCatalog(draft.value),
      apply,
    );
    installCatalog(result.catalog);
    draft.value = catalogSnapshot();
    emit("saved", result);
    message.value = apply
      ? `Paramètres enregistrés · ${result.changed.length} vidéo(s) mise(s) à jour.`
      : "Paramètres enregistrés.";
  } catch (e) {
    error.value = e.message || "Enregistrement impossible.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div
    class="modal-backdrop"
    @click.self="!busy && emit('close')"
    @keydown.esc="!busy && emit('close')"
  >
    <section
      class="video-modal video-settings"
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres des vidéos"
    >
      <button
        class="icon-btn video-modal-close"
        aria-label="Fermer les paramètres"
        :disabled="busy"
        @click="emit('close')"
      >
        <X :size="19" />
      </button>
      <h2>Paramètres des vidéos</h2>
      <p>
        Les statuts et les types sont partagés par toute la bibliothèque, les
        playlists et les parcours.
      </p>
      <fieldset :disabled="busy">
        <section
          v-for="[kind, title] in [
            ['statuses', 'Statuts'],
            ['types', 'Types de vidéos'],
          ]"
          :key="kind"
          class="video-settings-section"
        >
          <h3>{{ title }}</h3>
          <div
            v-for="row in draft[kind]"
            :key="row[0]"
            class="video-settings-row"
          >
            <input
              v-model="row[1]"
              maxlength="80"
              :aria-label="
                (kind === 'statuses' ? 'Nom du statut ' : 'Nom du type ') +
                row[0]
              "
            /><button
              class="icon-btn"
              :disabled="kind === 'statuses' && draft.statuses.length === 1"
              :aria-label="'Supprimer ' + row[1]"
              @click="remove(kind, row[0])"
            >
              <Trash2 :size="16" />
            </button>
          </div>
          <button
            class="btn"
            :disabled="draft[kind].length >= 100"
            @click="add(kind)"
          >
            <Plus :size="15" />{{
              kind === "statuses" ? "Ajouter un statut" : "Ajouter un type"
            }}
          </button>
        </section>
        <label
          >Statut de remplacement<select
            v-model="draft.fallbackStatus"
            aria-label="Statut de remplacement"
          >
            <option v-for="[id, name] in draft.statuses" :key="id" :value="id">
              {{ name }}
            </option>
          </select></label
        >
        <p class="field-help">
          Lorsqu’un statut est supprimé, ses vidéos prennent ce statut. Il sert
          aussi aux nouvelles vidéos. Un type supprimé devient « Non défini ».
        </p>
        <label
          >Type par défaut<select
            v-model="draft.defaultType"
            aria-label="Type par défaut"
          >
            <option value="">Non défini</option>
            <option v-for="[id, name] in draft.types" :key="id" :value="id">
              {{ name }}
            </option>
          </select></label
        >
        <p class="field-help">
          Présélectionné pour les nouvelles vidéos. Appliquer à tous remplit
          uniquement les types « Non défini », y compris dans les archives, et
          conserve les types déjà attribués.
        </p>
        <button class="btn" :disabled="!draft.defaultType" @click="save(true)">
          Appliquer à tous les « Non défini »
        </button>
        <div class="video-modal-actions">
          <button class="btn" @click="emit('close')">Fermer</button
          ><button class="btn primary" @click="save(false)">
            Enregistrer les paramètres
          </button>
        </div>
      </fieldset>
      <p v-if="error" class="video-alert" role="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>
    </section>
  </div>
</template>
