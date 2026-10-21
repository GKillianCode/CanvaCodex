<script setup>
import { ref, inject, onMounted, onBeforeUnmount } from "vue";
import { Sun, Moon, Home, Clapperboard, ArrowLeft } from "lucide-vue-next";
import { appearance, setAppearance } from "../appearance.js";
import { workflowNavigation } from "../workflowNavigation.js";
import WorkspaceQuickLinks from './WorkspaceQuickLinks.vue';
import ApplicationsMenu from './ApplicationsMenu.vue';
import WorkspaceLauncher from "./WorkspaceLauncher.vue";
const props = defineProps({
  title: String,
  backLabel: { type: String, default: "Accueil" },
});
const emit = defineEmits(["back", "home"]);
const navigation = inject(workflowNavigation, null);
function openPublicationLibrary(hash) {
  active.value=null;
  if(!['#/musiques','#/modeles-description'].includes(window.location.hash))sessionStorage.setItem('frame-publication-library-return',window.location.hash||'#/');
  if(navigation)navigation.navigate(hash).catch(()=>{});else window.location.hash=hash;
}
function openThemes() {
  active.value = null;
  if (navigation) navigation.navigate("#/themes").catch(() => {});
  else window.location.hash = "#/themes";
}
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
        <a href="#/" class="brand header-brand" @click.prevent="backLabel === 'Vidéo' ? emit('home') : emit('back')"
          ><span class="brand-icon">f</span
          ><span class="brand-name"
            >frame<span class="brand-dot">.</span></span
          ></a
        >
        <div class="workspace-nav-cluster"><button v-if="backLabel === 'Vidéo'" class="icon-btn navigation-return" aria-label="Accueil" title="Accueil" @click="emit('home')"><Home :size="18"/></button>
        <button v-if="backLabel" class="icon-btn navigation-return" :aria-label="backLabel" :title="backLabel" @click="emit('back')">
          <Clapperboard v-if="backLabel === 'Vidéo'" :size="18"/><Home v-else-if="backLabel === 'Accueil'" :size="18"/><ArrowLeft v-else :size="18"/>
        </button>
        <nav class="app-menus" aria-label="Menus de l’application">
          <div class="app-menu">
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
              <slot name="file" /><hr v-if="$slots.file"><button @click="openThemes">Thèmes</button><button @click="openPublicationLibrary('#/musiques')">Bibliothèque de musiques</button><button @click="openPublicationLibrary('#/modeles-description')">Modèles de description</button><hr><button @click="active=null; navigation?.openBackup()">Sauvegarde globale…</button><template v-if="$slots['file-bottom']"><hr><slot name="file-bottom"/></template>
            </div>
          </div>
          <ApplicationsMenu @open="active=null"/>
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
        </nav></div>
        <span v-if="title" class="application-name">{{ title }}</span>
        <slot name="context" />
      </div>
      <div class="app-header-right"><slot name="actions" /></div>
    </slot>
    <div class="workspace-utilities"><WorkspaceQuickLinks/>
      <slot name="utilities" />
      <button
        class="icon-btn appearance-toggle"
        :aria-label="
          appearance === 'dark'
            ? 'Activer le mode clair'
            : 'Activer le mode sombre'
        "
        :title="appearance === 'dark' ? 'Mode clair' : 'Mode sombre'"
        :aria-pressed="appearance === 'light'"
        @click="setAppearance(appearance === 'dark' ? 'light' : 'dark')"
      >
        <Sun v-if="appearance === 'dark'" :size="18" /><Moon
          v-else
          :size="18"
        />
      </button>
      <WorkspaceLauncher />
    </div>
  </header>
</template>
