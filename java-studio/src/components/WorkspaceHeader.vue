<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import WorkspaceLauncher from "./WorkspaceLauncher.vue";
const props = defineProps({
  title: String,
  backLabel: { type: String, default: "Accueil" },
});
const emit = defineEmits(["back"]);
const root = ref(null),
  active = ref(null);
function fileAction(event) {
  if (event.target.closest("button")) active.value = null;
}
function outside(event) {
  if (!root.value?.contains(event.target)) active.value = null;
}
let headerObserver;
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  headerObserver = new ResizeObserver(() =>
    document.documentElement.style.setProperty(
      "--frame-header-height",
      root.value.getBoundingClientRect().height + "px",
    ),
  );
  headerObserver.observe(root.value);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", outside);
  headerObserver?.disconnect();
});
</script>
<template>
  <header
    ref="root"
    class="app-header workspace-header"
    @keydown.esc="active = null"
  >
    <slot>
      <div class="app-header-left">
        <a href="#/" class="brand header-brand" @click.prevent="emit('back')"
          ><span class="brand-icon">f</span
          ><span class="brand-name"
            >frame<span class="brand-dot">.</span></span
          ></a
        >
        <button v-if="backLabel" class="btn home-return" @click="emit('back')">
          {{ backLabel }}
        </button>
        <span v-if="title" class="application-name">{{ title }}</span>
        <nav class="app-menus" aria-label="Menus de l’application">
          <div v-if="$slots.file" class="app-menu">
            <button
              class="app-menu-trigger"
              :aria-expanded="active === 'file'"
              @click="active = active === 'file' ? null : 'file'"
            >
              Fichier
            </button>
            <div
              v-if="active === 'file'"
              class="app-menu-popover"
              @click="fileAction"
              @change="active = null"
            >
              <slot name="file" />
            </div>
          </div>
          <div v-if="$slots.view" class="app-menu">
            <button
              class="app-menu-trigger"
              :aria-expanded="active === 'view'"
              @click="active = active === 'view' ? null : 'view'"
            >
              Affichage
            </button>
            <div v-if="active === 'view'" class="app-menu-popover">
              <slot name="view" />
            </div>
          </div>
        </nav>
        <slot name="context" />
      </div>
      <div class="app-header-right"><slot name="actions" /></div>
    </slot>
    <WorkspaceLauncher />
  </header>
</template>
