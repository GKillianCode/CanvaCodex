<script setup>
import {
  ref,
  shallowRef,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import StudioApp from "../StudioApp.vue";
import {
  ensureAssets,
  localAssets,
  upsertAsset,
  refreshAssets,
} from "../localAssets.js";
import { componentStates } from "../componentInstances.js";
import { normalizeComponents } from "../componentsLibrary.js";
import { makeSlide, visibleBlocks } from "../model.js";
import { applicationFile } from "../applicationDocuments.js";
import { storageForDocument, memoryStorage } from "../videoProjects.js";
import { normalizeThemes } from "../themes.js";
const props = defineProps({ id: String }),
  workspace = ref(null),
  context = shallowRef(null),
  error = ref(""),
  saving = ref(false),
  dirty = ref(false),
  baseline = ref("");
const clone = (v) => JSON.parse(JSON.stringify(v));
let stopWatch = () => {},
  savedSource = "";
function source() {
  const studio = workspace.value?.getStudio();
  return studio
    ? JSON.stringify([studio.project.value, studio.slides.value])
    : "";
}
async function load() {
  if (
    context.value &&
    dirty.value &&
    !confirm("Recharger et abandonner les modifications non enregistrées ?")
  )
    return;
  error.value = "";
  try {
    await ensureAssets();
    await refreshAssets();
    const c = localAssets.components.find((c) => c.id === props.id);
    if (!c)
      throw Error("Ce composant est introuvable dans la bibliothèque locale.");
    baseline.value = JSON.stringify(c);
    const slides = componentStates(c).map((state) => {
      const scene = makeSlide("title");
      scene.id = state.id;
      scene.title = state.name;
      scene.label = "";
      scene.elements = {};
      scene.positions = {};
      scene.fragments = {};
      scene.blockKeys = state.items.map((item, i) => {
        const key = "textComponentItem" + (item.id || "item" + i);
        scene.elements[key] = clone(item.element);
        scene.positions[key] = clone(item.position);
        scene.fragments[key] = clone(item.fragment || { order: 0 });
        return key;
      });
      return scene;
    });
    const document = applicationFile(
        {
          projectId: c.id,
          project: c.name,
          slides,
          themes: normalizeThemes(),
          themeId: "mint",
          components: [],
          resolution: { width: 1920, height: 1080 },
          frame: { gradient: false, header: false, footer: false },
          routeMode: "manual",
        },
        "slides",
      ),
      status = ref("saved"),
      storage = memoryStorage(storageForDocument(document, "slides"));
    context.value = {
      storage: { ...storage, flush: async () => {} },
      fileSlot: "component-editor:" + c.id,
      status,
      componentEditor: {
        save,
        saving,
        discard: () => {
          if (
            !dirty.value ||
            confirm("Abandonner les modifications de ce composant ?")
          ) {
            dirty.value = false;
            window.close();
            window.location.hash = "#/";
          }
        },
      },
    };
    await nextTick();
    savedSource = source();
    stopWatch();
    stopWatch = watch(source, (value) => {
      dirty.value = value !== savedSource;
      status.value = dirty.value ? "changed" : "saved";
    });
    dirty.value = false;
  } catch (e) {
    error.value = e.message;
  }
}
async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const studio = workspace.value.getStudio(),
      savingSource = source();
    const states = studio.slides.value.map((scene) => ({
      id: scene.id,
      name: scene.title || "État",
      items: visibleBlocks(scene).map((key) => ({
        id: key.startsWith("textComponentItem") ? key.slice(17) : key,
        element: clone(
          scene.elements[key] || { type: "text", text: scene[key] || "" },
        ),
        position: clone(scene.positions[key]),
        fragment: clone(scene.fragments[key]),
      })),
    }));
    if (states.length > 20) throw Error("Un composant est limité à 20 états.");
    if (states.some((s) => !s.items.length))
      throw Error("Chaque état doit contenir au moins un élément.");
    const raw = JSON.parse(baseline.value),
      defaultState = states.some((s) => s.id === raw.defaultState)
        ? raw.defaultState
        : states[0].id,
      c = normalizeComponents([
        {
          id: props.id,
          name: studio.project.value,
          states,
          defaultState,
          items: states.find((s) => s.id === defaultState).items,
        },
      ])[0];
    if (!c) throw Error("Composant invalide.");
    await upsertAsset("components", c, baseline.value);
    baseline.value = JSON.stringify(c);
    savedSource = savingSource;
    dirty.value = source() !== savedSource;
    context.value.status.value = dirty.value ? "changed" : "saved";
    studio.notify(
      "Composant enregistré. Les instances liées seront actualisées.",
    );
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
function beforeLeave(e) {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}
onMounted(() => {
  load();
  window.addEventListener("beforeunload", beforeLeave);
});
onBeforeUnmount(() => {
  stopWatch();
  window.removeEventListener("beforeunload", beforeLeave);
});
defineExpose({
  flush: async () => {
    if (dirty.value)
      throw Error(
        "Enregistre le composant ou abandonne ses modifications avant de quitter.",
      );
  },
});
</script>
<template>
  <p v-if="error" class="video-route-alert" role="alert">
    {{ error }}<button class="btn" @click="load">Recharger</button>
  </p>
  <StudioApp
    v-if="context"
    ref="workspace"
    application="slides"
    :key="id"
    :creation-context="context"
    @home="context.componentEditor.discard()"
    @dashboard="context.componentEditor.discard()"
  />
  <p v-else class="video-loading">Ouverture du composant…</p>
</template>
