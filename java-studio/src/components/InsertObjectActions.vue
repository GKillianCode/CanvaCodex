<script setup>
import { reactive } from "vue";
import { Plus } from "lucide-vue-next";
import { VIDEO_FILE_ACCEPT } from "../videoMedia.js";
const props = defineProps({ studio: Object, contextual: Boolean });
const s = reactive(props.studio),
  emit = defineEmits(["done"]);
// Both insertion menus invoke the same existing studio actions.
const objects = [
  ["text", "Texte", "Ajouter un texte"],
  ["title", "Titre", "Ajouter un titre"],
  ["subtitle", "Sous-titre", "Ajouter un sous-titre"],
  ["list", "Liste", "Ajouter une liste"],
  ["image", "Image", "Ajouter une image"],
  ["code", "Code Java", "Ajouter du code"],
  ["table", "Tableau", "Ajouter un tableau"],
  ["bits", "Octets et bits", "Ajouter des octets et bits"],
];
function add(type) {
  s.workspace = "editor";
  s.addBlock(type);
  emit("done");
}
function shapes() {
  s.workspace = "editor";
  s.openShapes();
  emit("done");
}
function video(event) {
  s.uploadVideo(event);
  emit("done");
}
</script>
<template>
  <button
    v-for="[type, label, context] in objects"
    :key="type"
    :role="contextual ? 'menuitem' : undefined"
    :data-insert="type"
    @click="add(type)"
  >
    <Plus v-if="!contextual" :size="14" />{{ contextual ? context : label }}
  </button>
  <button
    v-if="s.isAnimation"
    :role="contextual ? 'menuitem' : undefined"
    data-insert="counter"
    @click="add('counter')"
  >
    <Plus v-if="!contextual" :size="14" />{{
      contextual ? "Ajouter un compteur animé" : "Compteur animé"
    }}
  </button>
  <button
    :role="contextual ? 'menuitem' : undefined"
    data-insert="shape"
    @click="shapes"
  >
    <Plus v-if="!contextual" :size="14" />{{
      contextual ? "Ajouter une forme" : "Formes"
    }}
  </button>
  <label
    v-if="!s.isThumbnail"
    class="menu-file"
    :role="contextual ? 'menuitem' : undefined"
    data-insert="video"
    >Importer une vidéo<input
      type="file"
      :accept="VIDEO_FILE_ACCEPT"
      aria-label="Importer une vidéo"
      @change="video"
  /></label>
</template>
