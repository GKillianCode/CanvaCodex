<script setup>
import NumberRange from "./NumberRange.vue";
defineProps({ element: Object, theme: Object });
const emit = defineEmits(["upload", "play", "video"]);
</script>
<template>
  <template v-if="element.mediaKind === 'video'"
    ><label class="menu-file"
      >Remplacer la vidéo<input
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,.mov"
        @change="emit('video', $event)" /></label
    ><label class="checkbox-label"
      ><input type="checkbox" v-model="element.autoplay" />Lecture
      automatique</label
    ><label class="checkbox-label"
      ><input type="checkbox" v-model="element.videoLoop" />Lire en
      boucle</label
    ><label
      >Début · secondes<input
        type="number"
        min="0"
        step=".1"
        v-model.number="element.videoStart" /></label
    ><button class="btn full" @click="emit('play')">
      Lire / mettre en pause
    </button>
    <p class="field-help">
      Lecture visuelle sans son dans les exports Canvas. Le codec doit être pris
      en charge par le navigateur.
    </p></template
  ><label v-else class="image-upload"
    >{{ element.src ? "Remplacer l’image" : "Importer une image"
    }}<input
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
      @change="emit('upload', $event)" /></label
  ><label
    >Cadrage<select v-model="element.fit">
      <option value="contain">Image entière</option>
      <option value="cover">Remplir le cadre</option>
    </select></label
  ><label class="checkbox-label"
    ><input type="checkbox" v-model="element.roundedCorners" />Bords
    arrondis</label
  ><NumberRange
    v-if="element.roundedCorners"
    label="Arrondi de l’image"
    unit="%"
    :max="50"
    :model-value="element.cornerRadius ?? 10"
    @update:model-value="element.cornerRadius = $event"
  /><label class="checkbox-label"
    ><input type="checkbox" v-model="element.background" />Fond du thème
    derrière le média</label
  >
</template>
