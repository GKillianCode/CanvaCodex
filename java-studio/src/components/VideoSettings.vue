<script setup>
import {
  showReorderArrows,
  setReorderArrows,
} from "../interfacePreferences.js";
import { ref, computed, nextTick, onBeforeUnmount, watch } from "vue";
import {
  Plus,
  Trash2,
  X,
  GripVertical,
  ChevronDown,
  ListChecks,
  Tags,
  SlidersHorizontal,
} from "lucide-vue-next";
import {
  catalogSnapshot,
  normalizeCatalog,
  installCatalog,
  reorderCatalogRows,
} from "../videoCatalog.js";
const props = defineProps({ repository: Object });
const emit = defineEmits(["close", "saved"]);
const draft = ref(catalogSnapshot()),
  busy = ref(false),
  error = ref(""),
  message = ref("");
const opened = ref(""),
  root = ref(null),
  dragging = ref(null),
  savedDraft = ref(JSON.stringify(draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== savedDraft.value);
watch(dirty, (value) => {
  if (value) message.value = "";
});
const groups = [
  ["statuses", "Statuts", ListChecks],
  ["types", "Types de vidéos", Tags],
  ["defaults", "Valeurs par défaut", SlidersHorizontal],
];
let gesture = null,
  scrollFrame = 0;
function toggle(kind) {
  if (!busy.value) opened.value = opened.value === kind ? "" : kind;
}
function dropSlot() {
  if (!gesture) return;
  const rows = [
    ...root.value.querySelectorAll(`[data-sort-kind="${gesture.kind}"]`),
  ];
  const index = rows.findIndex(
    (el) =>
      gesture.y <
      el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
  );
  if (dragging.value)
    dragging.value = {
      ...dragging.value,
      slot: index < 0 ? rows.length : index,
    };
}
function scrollDrag() {
  if (!gesture || !dragging.value) return;
  const bounds = root.value.getBoundingClientRect(),
    amount =
      gesture.y < bounds.top + 80
        ? -12
        : gesture.y > bounds.bottom - 85
          ? 12
          : 0;
  if (amount) {
    root.value.scrollTop += amount;
    dropSlot();
  }
  scrollFrame = requestAnimationFrame(scrollDrag);
}
function endDrag(event, cancel = false) {
  if (
    !gesture ||
    (event?.pointerId != null && event.pointerId !== gesture.pointerId)
  )
    return;
  const previous = gesture,
    drop = dragging.value;
  gesture = null;
  dragging.value = null;
  cancelAnimationFrame(scrollFrame);
  window.removeEventListener("pointermove", moveDrag, true);
  window.removeEventListener("pointerup", finishDrag, true);
  window.removeEventListener("pointercancel", cancelDrag, true);
  window.removeEventListener("blur", cancelDrag);
  if (previous.target.hasPointerCapture?.(previous.pointerId))
    previous.target.releasePointerCapture(previous.pointerId);
  if (!cancel && drop) {
    draft.value[previous.kind] = reorderCatalogRows(
      draft.value[previous.kind],
      previous.id,
      drop.slot,
    );
    message.value = "";
  }
}
function finishDrag(event) {
  endDrag(event);
}
function cancelDrag(event) {
  endDrag(event, true);
}
function moveDrag(event) {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  event.preventDefault();
  gesture.y = event.clientY;
  if (
    !dragging.value &&
    Math.hypot(event.clientX - gesture.x, event.clientY - gesture.startY) > 4
  ) {
    dragging.value = { kind: gesture.kind, id: gesture.id, slot: 0 };
    scrollFrame = requestAnimationFrame(scrollDrag);
  }
  dropSlot();
}
function startDrag(event, kind, id) {
  if (event.button !== 0 || busy.value) return;
  event.preventDefault();
  gesture = {
    kind,
    id,
    pointerId: event.pointerId,
    x: event.clientX,
    startY: event.clientY,
    y: event.clientY,
    target: event.currentTarget,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", moveDrag, true);
  window.addEventListener("pointerup", finishDrag, true);
  window.addEventListener("pointercancel", cancelDrag, true);
  window.addEventListener("blur", cancelDrag);
}
function keyboardMove(event, kind, id) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const rows = draft.value[kind],
    index = rows.findIndex((row) => row[0] === id);
  const insertion =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? rows.length
        : event.key === "ArrowUp"
          ? Math.max(0, index - 1)
          : Math.min(rows.length, index + 2);
  draft.value[kind] = reorderCatalogRows(rows, id, insertion);
  message.value = "";
}
onBeforeUnmount(() => cancelDrag());
async function add(kind) {
  draft.value[kind].push(["custom-" + crypto.randomUUID(), ""]);
  message.value = "";
  await nextTick();
  root.value
    ?.querySelector(`[data-sort-kind="${kind}"]:last-child input`)
    ?.focus();
}
function remove(kind, id) {
  for (const field of ["from", "to"])
    if (replacements.value[kind][field] === id)
      replacements.value[kind][field] = null;
  draft.value[kind] = draft.value[kind].filter((row) => row[0] !== id);
  if (draft.value.defaultType === id) draft.value.defaultType = "";
  if (draft.value.fallbackStatus === id)
    draft.value.fallbackStatus = draft.value.statuses[0]?.[0] || "";
  message.value = "";
}
const replacements = ref({
  statuses: { from: null, to: null },
  types: { from: null, to: null },
});
function canReplace(kind) {
  const r = replacements.value[kind];
  return r.from !== null && r.to !== null && r.from !== r.to;
}
async function save(apply = false, kind = null) {
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
      kind
        ? {
            field: kind === "statuses" ? "status" : "videoType",
            ...replacements.value[kind],
          }
        : null,
    );
    installCatalog(result.catalog);
    draft.value = catalogSnapshot();
    savedDraft.value = JSON.stringify(draft.value);
    emit("saved", result);
    message.value = kind
      ? `${result.replaced} vidéo(s) mise(s) à jour · remplacement effectué.`
      : apply
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
    @keydown.esc="dragging ? cancelDrag() : !busy && emit('close')"
  >
    <section
      ref="root"
      class="video-modal video-settings"
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres des vidéos"
    >
      <div class="video-settings-heading">
        <div>
          <span class="eyebrow">BIBLIOTHÈQUE</span>
          <h2>Paramètres des vidéos</h2>
        </div>
        <button
          class="icon-btn"
          aria-label="Fermer les paramètres"
          :disabled="busy"
          @click="emit('close')"
        >
          <X :size="19" />
        </button>
      </div>
      <p class="video-settings-intro">
        Organise les étiquettes de tes vidéos et choisis les valeurs proposées à
        la création.
      </p>
      <label class="interface-preference"
        ><input
          type="checkbox"
          :checked="showReorderArrows"
          @change="setReorderArrows($event.target.checked)"
        />Afficher les flèches de réordonnancement
        <small>Dans toute l’application · désactivé par défaut</small></label
      >
      <fieldset :disabled="busy">
        <section
          v-for="[kind, title, icon] in groups"
          :key="kind"
          class="video-settings-group"
          :class="{ expanded: opened === kind }"
        >
          <button
            class="video-settings-group-trigger"
            :aria-expanded="opened === kind"
            :aria-controls="'video-settings-' + kind"
            @click="toggle(kind)"
          >
            <component :is="icon" :size="19" /><span
              ><strong>{{ title }}</strong
              ><small>{{
                kind === "statuses"
                  ? "Les étapes de ton processus de production"
                  : kind === "types"
                    ? "Les catégories de tes vidéos"
                    : "Valeurs proposées pour les nouvelles vidéos"
              }}</small></span
            ><span v-if="kind !== 'defaults'" class="video-settings-count">{{
              draft[kind].length
            }}</span
            ><ChevronDown :size="17" />
          </button>
          <div
            v-if="opened === kind"
            :id="'video-settings-' + kind"
            class="video-settings-group-body"
          >
            <template v-if="kind !== 'defaults'">
              <p class="field-help">
                Glisse la poignée pour réordonner la liste. Les flèches du
                clavier fonctionnent aussi sur la poignée.
              </p>
              <div
                class="video-settings-sort-list"
                :aria-label="
                  kind === 'statuses' ? 'Ordre des statuts' : 'Ordre des types'
                "
              >
                <div
                  v-for="(row, index) in draft[kind]"
                  :key="row[0]"
                  class="video-settings-row"
                  :data-sort-kind="kind"
                  :data-entry-id="row[0]"
                  :class="{
                    'is-dragging': dragging?.id === row[0],
                    'drop-before':
                      dragging?.kind === kind && dragging.slot === index,
                    'drop-after':
                      dragging?.kind === kind &&
                      dragging.slot === draft[kind].length &&
                      index === draft[kind].length - 1,
                  }"
                >
                  <button
                    class="icon-btn video-settings-grip"
                    :aria-label="'Déplacer ' + (row[1] || 'cet élément')"
                    title="Glisser pour réordonner · flèches ↑ ↓ · Début / Fin"
                    @pointerdown="startDrag($event, kind, row[0])"
                    @lostpointercapture="cancelDrag"
                    @keydown="keyboardMove($event, kind, row[0])"
                  >
                    <GripVertical :size="17" />
                  </button>
                  <input
                    v-model="row[1]"
                    maxlength="80"
                    :aria-label="
                      (kind === 'statuses'
                        ? 'Nom du statut '
                        : 'Nom du type ') + (row[1] || 'nouveau')
                    "
                    :placeholder="
                      kind === 'statuses' ? 'Nom du statut' : 'Nom du type'
                    "
                  />
                  <button
                    class="icon-btn"
                    :disabled="
                      kind === 'statuses' && draft.statuses.length === 1
                    "
                    :aria-label="'Supprimer ' + row[1]"
                    title="Supprimer"
                    @click="remove(kind, row[0])"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
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
              <div class="video-settings-note">
                <strong>{{
                  kind === "statuses"
                    ? "Remplacer un statut"
                    : "Remplacer un type de vidéo"
                }}</strong>
                <label
                  >{{
                    kind === "statuses"
                      ? "Statut à remplacer"
                      : "Type de vidéo à remplacer"
                  }}<select
                    v-model="replacements[kind].from"
                    :aria-label="
                      kind === 'statuses'
                        ? 'Statut à remplacer'
                        : 'Type de vidéo à remplacer'
                    "
                  >
                    <option :value="null" disabled>Choisir…</option>
                    <option v-if="kind === 'types'" value="">Non défini</option>
                    <option
                      v-for="[id, name] in draft[kind]"
                      :key="id"
                      :value="id"
                    >
                      {{ name }}
                    </option>
                  </select></label
                >
                <label
                  >{{
                    kind === "statuses"
                      ? "Remplacer par le statut"
                      : "Remplacer par le type"
                  }}<select
                    v-model="replacements[kind].to"
                    :aria-label="
                      kind === 'statuses'
                        ? 'Remplacer par le statut'
                        : 'Remplacer par le type'
                    "
                  >
                    <option :value="null" disabled>Choisir…</option>
                    <option v-if="kind === 'types'" value="">Non défini</option>
                    <option
                      v-for="[id, name] in draft[kind]"
                      :key="id"
                      :value="id"
                    >
                      {{ name }}
                    </option>
                  </select></label
                >
                <p class="field-help">
                  Seules les vidéos avec la valeur choisie seront modifiées,
                  archives comprises. Les autres restent inchangées.
                </p>
                <button
                  class="btn"
                  :disabled="!canReplace(kind)"
                  @click="save(false, kind)"
                >
                  {{
                    kind === "statuses"
                      ? "Remplacer ce statut"
                      : "Remplacer ce type"
                  }}
                </button>
                <small class="field-help"
                  >Cette action enregistre aussi les paramètres en cours. Elle
                  ne supprime aucune étiquette.</small
                >
              </div>
              <p class="field-help">
                {{
                  kind === "statuses"
                    ? "L’ordre de la liste sert au tri par processus. Supprimer un statut transfère ses vidéos vers le statut initial."
                    : "Supprimer un type remet ses vidéos en « Non défini »."
                }}
              </p>
            </template>
            <template v-else>
              <label
                >Statut initial<select
                  v-model="draft.fallbackStatus"
                  aria-label="Statut initial"
                >
                  <option
                    v-for="[id, name] in draft.statuses"
                    :key="id"
                    :value="id"
                  >
                    {{ name }}
                  </option>
                </select></label
              >
              <p class="field-help">
                Présélectionné pour les nouvelles vidéos et utilisé si un statut
                est supprimé.
              </p>
              <label
                >Type par défaut<select
                  v-model="draft.defaultType"
                  aria-label="Type par défaut"
                >
                  <option value="">Non défini</option>
                  <option
                    v-for="[id, name] in draft.types"
                    :key="id"
                    :value="id"
                  >
                    {{ name }}
                  </option>
                </select></label
              >
              <p class="field-help">
                Ce type est présélectionné pour les nouvelles vidéos.
              </p>
            </template>
          </div>
        </section>
        <p v-if="error" class="video-alert" role="alert">{{ error }}</p>
        <p v-if="message" class="video-settings-feedback" role="status">
          {{ message }}
        </p>
        <div class="video-settings-footer">
          <span>{{
            busy
              ? "Enregistrement…"
              : dirty
                ? "Modifications non enregistrées"
                : "Paramètres à jour"
          }}</span
          ><button class="btn primary" :disabled="!dirty" @click="save(false)">
            Enregistrer les paramètres
          </button>
        </div>
      </fieldset>
    </section>
  </div>
</template>
