<script setup>
import { computed } from "vue";
import PaletteColor from "./PaletteColor.vue";
import { svgColors, svgColorField, svgPaintHex } from "../svgColors.js";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import { reactive } from "vue";
const props = defineProps({
  image: Object,
  theme: Object,
  studio: Object,
  images: Array,
});
const s = props.studio ? reactive(props.studio) : null;
const rows = computed(() =>
  [
    ...new Set(
      (props.images || [props.image]).flatMap((image) => svgColors(image.src)),
    ),
  ].map((key, n) => ({
    key,
    label: "Couleur " + (n + 1) + " · " + key,
    element: new Proxy(
      {},
      {
        get(_, field) {
          if (field === "color" && s?.animation?.shouldKey(svgColorField(key)))
            return s.animation.propertyValue(svgColorField(key));
          return (
            props.image.svgColors?.[key]?.[field] ??
            (field === "color" ? svgPaintHex(key) : null)
          );
        },
        set(_, field, value) {
          if (s?.animation?.shouldKey(svgColorField(key))) {
            const color =
              field === "color"
                ? value
                : s.theme[value] ||
                  s.theme.swatches?.find((c) => c.id === value)?.color;
            if (color) s.animation.setProperty(svgColorField(key), color);
            return true;
          }
          for (const image of props.images || [props.image])
            if (svgColors(image.src).includes(key))
              image.svgColors = {
                ...image.svgColors,
                [key]: {
                  color: svgPaintHex(key),
                  colorRole: null,
                  ...image.svgColors?.[key],
                  [field]: value,
                },
              };
          return true;
        },
      },
    ),
  })),
);
</script>
<template>
  <div>
    <p class="field-help">
      Une couleur remplace toutes ses occurrences dans les remplissages,
      contours ou dégradés. Le fichier source est conservé.
    </p>
    <PaletteColor
      v-for="row in rows"
      :key="row.key"
      :element="row.element"
      field="color"
      :label="row.label"
      :theme="theme"
      ><template #actions
        ><AnimationKeyButton
          v-if="s"
          :studio="s"
          :field="svgColorField(row.key)" /></template
    ></PaletteColor>
    <p v-if="!rows.length" class="field-help">
      Ce SVG ne contient pas de couleur modifiable explicite.
    </p>
    <button
      class="btn full"
      :disabled="!Object.keys(image.svgColors || {}).length"
      @click="image.svgColors = {}"
    >
      Restaurer les couleurs du SVG
    </button>
    <p class="field-help">
      La transparence globale se règle dans le tiroir Opacité.
    </p>
  </div>
</template>
