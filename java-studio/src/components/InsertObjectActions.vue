<script setup>
import { reactive, computed } from "vue";
import { Plus, Type, Image, Shapes, ChevronRight } from "lucide-vue-next";
import { VIDEO_FILE_ACCEPT } from "../videoMedia.js";
const props = defineProps({ studio: Object, contextual: Boolean }),
  s = reactive(props.studio),
  emit = defineEmits(["done"]);
const categories = computed(() => [
  {
    name: "Texte",
    icon: Type,
    items: [
      ["text", "Texte"],
      ["title", "Titre"],
      ["subtitle", "Sous-titre"],
      ["list", "Liste"],
      ...(s.isAnimation ? [["counter", "Compteur animé"]] : []),
    ],
  },
  {
    name: "Médias et données",
    icon: Image,
    items: [
      ["image", "Image / SVG"],
      ...(!s.isThumbnail ? [["video", "Vidéo"]] : []),
      ["code", "Code Java"],
      ["table", "Tableau"],
      ["bits", "Octets et bits"],
    ],
  },
  { name: "Formes", icon: Shapes, items: [["shape", "Galerie de formes"]] },
]);
function add(type) {
  s.workspace = "editor";
  if (type === "shape") s.openShapes();
  else s.addBlock(type);
  emit("done");
}
function video(event) {
  s.uploadVideo(event);
  emit("done");
}
</script>
<template>
  <template v-for="category in categories" :key="category.name">
    <details v-if="contextual" class="insert-submenu">
      <summary>
        <component :is="category.icon" :size="15" /><span>{{
          category.name
        }}</span
        ><ChevronRight :size="14" />
      </summary>
      <div role="menu" :aria-label="category.name">
        <template v-for="[type, label] in category.items" :key="type"
          ><label
            v-if="type === 'video'"
            class="menu-file"
            role="menuitem"
            data-insert="video"
            >Importer une vidéo<input
              type="file"
              :accept="VIDEO_FILE_ACCEPT"
              aria-label="Importer une vidéo"
              @change="video" /></label
          ><button
            v-else
            role="menuitem"
            :data-insert="type"
            @click="add(type)"
          >
            {{ label }}
          </button></template
        >
      </div>
    </details>
    <template v-else
      ><template v-for="[type, label] in category.items" :key="type"
        ><label v-if="type === 'video'" class="menu-file" data-insert="video"
          >Importer une vidéo<input
            type="file"
            :accept="VIDEO_FILE_ACCEPT"
            aria-label="Importer une vidéo"
            @change="video" /></label
        ><button v-else :data-insert="type" @click="add(type)">
          <Plus :size="14" />{{ label }}
        </button></template
      ></template
    >
  </template>
</template>
