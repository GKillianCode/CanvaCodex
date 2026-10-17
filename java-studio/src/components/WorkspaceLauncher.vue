<script setup>
import {
  inject,
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { LayoutGrid, Search, ArrowUpRight, X, Film } from "lucide-vue-next";
import { useModalScroll } from "../modalScroll.js";
import {
  workflowNavigation,
  workspaceTools,
  videoDestinations,
  searchDestinations,
} from "../workflowNavigation.js";
const context = inject(workflowNavigation, null),
  opened = ref(false),
  query = ref(""),
  recent = ref([]),
  error = ref(""),
  busy = ref(false),
  input = ref(null),
  trigger = ref(null),
  position = ref(0);
useModalScroll(() => opened.value);
const rows = computed(() =>
  searchDestinations(
    [
      {
        id: "home",
        name: "Toutes les vidéos",
        description: "Bibliothèque, playlists, états et archives.",
        hash: "#/",
        stage: "Bibliothèque",
      },
      ...videoDestinations(context?.project.value).filter(
        (row) => row.stage !== "Créer",
      ),
      ...workspaceTools.map((row) => ({ ...row, stage: "Ateliers autonomes" })),
      ...videoDestinations(context?.project.value).filter(
        (row) => row.stage === "Créer",
      ),
      ...recent.value.map((row) => ({
        id: "video:" + row.id,
        name: row.name,
        description: row.playlist || "Sans playlist",
        hash: "#/videos/" + row.id,
        stage: "Vidéos",
      })),
    ],
    query.value,
  ),
);
async function open() {
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
  opened.value = true;
  query.value = "";
  position.value = 0;
  error.value = "";
  await nextTick();
  input.value?.focus();
  try {
    recent.value = await context.repository.list();
  } catch {
    error.value =
      "La liste des vidéos est indisponible. Les ateliers restent accessibles.";
  }
}
function close() {
  opened.value = false;
  nextTick(() => trigger.value?.focus());
}
async function go(row) {
  if (!row || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await context.navigate(row.hash);
    close();
  } catch (e) {
    error.value =
      e.message || "Enregistre ton travail avant de changer de vue.";
  } finally {
    busy.value = false;
  }
}
function keys(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    event.stopPropagation();
    opened.value ? close() : open();
  }
  if (!opened.value) return;
  if (event.key === "Tab") {
    const controls = Array.from(
      document.querySelectorAll(
        ".workspace-launcher button:not(:disabled),.workspace-launcher input",
      ),
    );
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    event.stopPropagation();
    close();
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    position.value =
      (position.value +
        (event.key === "ArrowDown" ? 1 : -1) +
        Math.max(1, rows.value.length)) %
      Math.max(1, rows.value.length);
    nextTick(() =>
      document
        .getElementById("workspace-result-" + position.value)
        ?.scrollIntoView({ block: "nearest" }),
    );
  }
  if (event.key === "Enter" && event.target === input.value) {
    event.preventDefault();
    event.stopPropagation();
    go(rows.value[position.value]);
  }
}
onMounted(() => window.addEventListener("keydown", keys, true));
onBeforeUnmount(() => window.removeEventListener("keydown", keys, true));
</script>
<template>
  <button
    v-if="context"
    ref="trigger"
    class="workspace-launcher-trigger"
    aria-label="Ouvrir les ateliers · Ctrl K"
    title="Ateliers et vidéos · Ctrl K"
    @click="open"
  >
    <LayoutGrid :size="17" /><span>Ateliers</span><kbd>⌃ K</kbd>
  </button>
  <Teleport to="body"
    ><div v-if="opened" class="workspace-launcher-backdrop" @click.self="close">
      <section
        class="workspace-launcher"
        role="dialog"
        aria-modal="true"
        aria-label="Ateliers et navigation"
      >
        <header>
          <span class="eyebrow">{{
            context.project.value?.name || "TON ESPACE FRAME"
          }}</span
          ><button
            class="icon-btn"
            aria-label="Fermer les ateliers"
            @click="close"
          >
            <X :size="18" />
          </button>
        </header>
        <label class="workspace-quick-search"
          ><Search :size="20" /><input
            ref="input"
            v-model="query"
            aria-label="Rechercher un atelier ou une vidéo"
            placeholder="Un atelier, un support ou une vidéo…"
            @input="position = 0"
          /><kbd>Échap</kbd></label
        >
        <p v-if="error" class="workspace-launcher-error" role="alert">
          {{ error }}
        </p>
        <div class="workspace-results">
          <button
            v-for="(row, i) in rows"
            :id="'workspace-result-' + i"
            :key="row.hash"
            :class="{
              chosen: i === position,
              current: row.hash === context.hash.value,
            }"
            :disabled="busy"
            :aria-current="row.hash === context.hash.value ? 'page' : undefined"
            @click="go(row)"
          >
            <span class="workspace-result-symbol"
              ><Film v-if="row.stage === 'Vidéos'" :size="20" /><LayoutGrid
                v-else
                :size="20" /></span
            ><span
              ><small>{{ row.stage }}</small
              ><strong>{{ row.name }}</strong
              ><em>{{ row.description }}</em></span
            ><ArrowUpRight :size="16" />
          </button>
          <p v-if="!rows.length" class="workspace-no-results">
            Aucun résultat. Essaie un autre nom.
          </p>
        </div>
        <footer>
          <span>↑ ↓ naviguer · Entrée ouvrir</span
          ><span
            >Le travail en cours est enregistré avant de changer
            d’atelier.</span
          >
        </footer>
      </section>
    </div></Teleport
  >
</template>
