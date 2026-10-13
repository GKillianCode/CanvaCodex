<script setup>
import { ref, onBeforeUnmount, onMounted } from "vue";
import {
  GripVertical,
  X,
  ArrowUpRight,
  ListOrdered,
  Archive,
  ArrowLeft,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-vue-next";
import { videoStatuses, playlistDropPosition } from "../videoProjects.js";
const props = defineProps({
    name: String,
    rows: Array,
    busy: Boolean,
    error: String,
  }),
  emit = defineEmits([
    "move",
    "open",
    "close",
    "back",
    "rename",
    "remove",
    "archive-video",
    "rename-video",
    "remove-video",
  ]);
const dragged = ref(null),
  target = ref(null),
  after = ref(false),
  feedback = ref(""),
  localError = ref(""),
  list = ref(null),
  panel = ref(null);
let scrollFrame = null,
  scrollSpeed = 0,
  pending = null,
  lastPoint = null;
const status = (id) =>
  videoStatuses.find(([key]) => key === id)?.[1] || "Création";
function stopScroll() {
  scrollSpeed = 0;
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
  scrollFrame = null;
}
function clearDrag() {
  dragged.value = null;
  target.value = null;
  pending = null;
  lastPoint = null;
  stopScroll();
  window.removeEventListener("pointermove", pointerMove);
  window.removeEventListener("pointerup", pointerUp);
  window.removeEventListener("pointercancel", clearDrag);
}
function updateTarget() {
  if (!lastPoint || !dragged.value) return;
  const node = document
    .elementFromPoint(lastPoint.x, lastPoint.y)
    ?.closest(".playlist-order-row");
  if (node && list.value?.contains(node)) {
    const box = node.getBoundingClientRect();
    target.value = node.dataset.videoId;
    after.value = lastPoint.y > box.top + box.height / 2;
  } else target.value = null;
}
function scrollStep() {
  if (!scrollSpeed || !list.value) {
    scrollFrame = null;
    return;
  }
  list.value.scrollTop += scrollSpeed;
  updateTarget();
  scrollFrame = requestAnimationFrame(scrollStep);
}
function startPointer(event, row) {
  if (props.busy || event.button !== 0) return;
  event.preventDefault();
  pending = { id: row.id, x: event.clientX, y: event.clientY };
  localError.value = "";
  event.currentTarget.focus();
  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerup", pointerUp);
  window.addEventListener("pointercancel", clearDrag);
}
function pointerMove(event) {
  if (!pending) return;
  if (
    !dragged.value &&
    Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 5
  )
    return;
  dragged.value = pending.id;
  lastPoint = { x: event.clientX, y: event.clientY };
  event.preventDefault();
  updateTarget();
  const box = list.value.getBoundingClientRect();
  const within = event.clientX >= box.left && event.clientX <= box.right;
  scrollSpeed =
    within && event.clientY >= box.top - 20 && event.clientY < box.top + 50
      ? -10
      : within &&
          event.clientY <= box.bottom + 20 &&
          event.clientY > box.bottom - 50
        ? 10
        : 0;
  if (scrollSpeed && scrollFrame === null)
    scrollFrame = requestAnimationFrame(scrollStep);
  else if (!scrollSpeed) stopScroll();
}
function pointerUp() {
  const source = props.rows.find((row) => row.id === dragged.value),
    targetId = target.value;
  if (source && targetId) {
    const position = playlistDropPosition(
      props.rows,
      source.id,
      targetId,
      after.value,
    );
    move(source, position);
  }
  clearDrag();
}
function move(row, position) {
  if (props.busy || position === row.playlistPosition) return;
  localError.value = "";
  feedback.value = row.name + " : déplacement vers la position " + position;
  emit("move", row.id, position);
}
function numberChanged(event, row) {
  const value = Number(event.target.value);
  event.target.value = String(row.playlistPosition);
  if (!Number.isInteger(value) || value < 1 || value > props.rows.length) {
    localError.value =
      "Saisis une position entre 1 et " + props.rows.length + ".";
    return;
  }
  move(row, value);
}
function keyboardMove(row, delta) {
  const position = row.playlistPosition + delta;
  if (position >= 1 && position <= props.rows.length) move(row, position);
}
function trapTab(event) {
  const fields = [
    ...panel.value.querySelectorAll(
      "button:not([disabled]),input:not([disabled]),summary",
    ),
  ].filter((element) => element.getClientRects().length);
  const first = fields[0],
    last = fields.at(-1);
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || document.activeElement === panel.value)
  ) {
    event.preventDefault();
    first?.focus();
  }
}
onMounted(() => panel.value?.focus());
onBeforeUnmount(clearDrag);
</script>
<template>
  <section
    ref="panel"
    tabindex="-1"
    class="playlist-order-panel"
    @keydown.tab="trapTab"
    role="dialog"
    aria-modal="true"
    :aria-label="'Playlist ' + (name || 'Sans playlist')"
    @keydown.esc="emit('close')"
  >
    <div class="playlist-order-navigation">
      <button
        class="icon-btn"
        aria-label="Fermer la playlist"
        @click="emit('close')"
      >
        <X :size="21" />
      </button>
    </div>
    <header class="playlist-order-header">
      <div>
        <span class="eyebrow"
          ><ListOrdered :size="15" />PARCOURS DE VISIONNAGE</span
        >
        <h2>{{ name || "Sans playlist" }}</h2>
        <p>
          {{ rows.length }} vidéo{{ rows.length > 1 ? "s" : "" }} · Glisse les
          vidéos ou saisis leur position.
        </p>
      </div>
      <div v-if="name" class="playlist-management-actions">
        <button
          class="btn"
          :disabled="busy"
          aria-label="Renommer cette playlist"
          @click="emit('rename')"
        >
          <Pencil :size="15" />Renommer</button
        ><button
          class="btn"
          :disabled="busy"
          aria-label="Supprimer cette playlist"
          @click="emit('remove')"
        >
          <Trash2 :size="15" />Supprimer la playlist
        </button>
      </div>
    </header>
    <div class="playlist-order-columns" aria-hidden="true">
      <span>POSITION</span><span>VIDÉO</span><span>PROCESSUS</span>
    </div>
    <div ref="list" class="playlist-order-scroll">
      <ol class="playlist-order-list" aria-label="Vidéos de la playlist">
        <li
          v-for="row in rows"
          :key="row.id"
          class="playlist-order-row"
          :class="{
            'is-dragging': dragged === row.id,
            'drop-before': target === row.id && !after && dragged !== row.id,
            'drop-after': target === row.id && after && dragged !== row.id,
          }"
          :data-video-id="row.id"
        >
          <button
            class="playlist-grip"
            :disabled="busy"
            :aria-label="'Déplacer ' + row.name"
            title="Glisser pour déplacer · Flèches haut/bas au clavier"
            @pointerdown="(event) => startPointer(event, row)"
            @keydown.up.prevent="keyboardMove(row, -1)"
            @keydown.down.prevent="keyboardMove(row, 1)"
          >
            <GripVertical :size="19" /></button
          ><input
            class="playlist-position-input"
            type="number"
            :value="row.playlistPosition"
            min="1"
            :max="rows.length"
            step="1"
            :disabled="busy"
            :aria-label="'Position de ' + row.name"
            @blur="(event) => numberChanged(event, row)"
            @keydown.enter.prevent="$event.target.blur()"
          /><button
            class="playlist-video-title"
            :disabled="busy"
            :aria-label="'Ouvrir la vidéo ' + row.name"
            @click="emit('open', row.id)"
          >
            <strong>{{ row.name }}</strong
            ><small
              >{{ row.total }} création{{ row.total > 1 ? "s" : ""
              }}<span v-if="row.archived">
                · <Archive :size="12" />Archivée</span
              ></small
            ></button
          ><span class="video-status" :data-status="row.status">{{
            status(row.status)
          }}</span>
          <details class="playlist-video-menu">
            <summary class="icon-btn" :aria-label="'Actions pour ' + row.name">
              <MoreHorizontal :size="18" />
            </summary>
            <div>
              <button :disabled="busy" @click="emit('open', row.id)">
                Ouvrir la vidéo</button
              ><button :disabled="busy" @click="emit('rename-video', row)">
                Renommer la vidéo</button
              ><button
                :disabled="busy"
                @click="
                  emit('archive-video', row);
                  $event.target.closest('details').open = false;
                "
              >
                {{
                  row.archived ? "Restaurer la vidéo" : "Archiver la vidéo"
                }}</button
              ><button
                v-if="name"
                :disabled="busy"
                @click="
                  emit('remove-video', row);
                  $event.target.closest('details').open = false;
                "
              >
                Retirer de cette playlist
              </button>
            </div>
          </details>
        </li>
      </ol>
      <div v-if="!rows.length" class="video-empty">
        Aucune vidéo dans cette playlist pour le moment.
      </div>
    </div>
    <footer class="playlist-order-footer">
      <span role="status" aria-live="polite">{{
        busy
          ? "Enregistrement…"
          : error ||
            localError ||
            feedback ||
            "Chaque déplacement est enregistré automatiquement."
      }}</span
      ><small
        >Les archives gardent leur place. Le statut de production est
        indépendant de cet ordre.</small
      >
    </footer>
  </section>
</template>
