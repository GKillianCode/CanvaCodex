<script setup>
import { reactive } from "vue";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import { videoControls, normalizeVideoProperties } from "../videoProperties.js";
import { VIDEO_FILE_ACCEPT } from "../videoMedia.js";
import NumberRange from "./NumberRange.vue";
const props = defineProps({ element: Object, theme: Object, studio: Object });
const s = props.studio ? reactive(props.studio) : null;
function value(field) {
  return s?.animation
    ? s.animation.propertyValue(field, true)
    : normalizeVideoProperties(props.element)[field];
}
function update(field, value) {
  if (s?.animation?.shouldKey(field)) s.animation.setProperty(field, value);
  else props.element[field] = value;
}
const emit = defineEmits(["upload", "play", "video"]);
</script>
<template>
  <template v-if="element.mediaKind === 'video'"
    ><label class="menu-file"
      >Remplacer la vidéo<input
        type="file"
        :accept="VIDEO_FILE_ACCEPT"
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
    ><button class="btn full" :disabled="s?.animation?.busy||s?.overlayVideoBusy" @click="emit('play')">
      Lire / mettre en pause
    </button>
    <NumberRange
      v-for="control in videoControls"
      :key="control.field"
      :label="control.label"
      :unit="control.unit"
      :min="control.min"
      :max="control.max"
      :step="control.step"
      :model-value="value(control.field)"
      @update:model-value="update(control.field, $event)"
      ><template #actions
        ><AnimationKeyButton
          v-if="s"
          :studio="s"
          :field="control.field" /></template></NumberRange></template
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
