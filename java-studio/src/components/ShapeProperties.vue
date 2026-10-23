<script setup>
import { computed } from "vue";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import NumberRange from "./NumberRange.vue";
import CornerProperties from "./CornerProperties.vue";
import PaletteColor from "./PaletteColor.vue";
import { shapes, isOpenShape } from "../shapes.js";
const props = defineProps({
  shape: Object,
  scale: Number,
  theme: Object,
  studio: Object,
  mode: { type: String, default: "style" },
});
const a = computed(() => props.studio?.animation),
  map = {
    fill: "color",
    stroke: "strokeColor",
    filled: "fillEnabled",
    outlined: "strokeEnabled",
    dashed: "dashed",
    strokeWidth: "strokeWidth",
    radius: "radius",
    points: "points",
    innerRatio: "innerRatio",
  };
function animated(key) {
  return !!a.value?.clip?.frames.some((f) => f.field === map[key]);
}
function frameEditing() {
  return (
    !!a.value?.activeFrame &&
    a.value.activeFrame.clipId === a.value.clip?.id &&
    Math.abs(a.value.time - a.value.clip.start - a.value.activeFrame.time) <
      0.0001
  );
}
function set(key, value) {
  if (a.value && map[key] && (animated(key) || frameEditing()))
    a.value.setProperty(
      map[key],
      typeof value === "boolean" ? Number(value) : value,
    );
  else props.shape[key] = value;
}
const shapeView = new Proxy(
  {},
  {
    get(_, key) {
      if (
        ["fillRole", "strokeRole"].includes(key) &&
        (animated(key === "fillRole" ? "fill" : "stroke") || frameEditing())
      )
        return null;
      if (animated(key)) {
        const v = a.value.propertyValue(map[key]);
        return ["filled", "outlined", "dashed"].includes(key) ? v >= 0.5 : v;
      }
      return props.shape[key];
    },
    set(_, key, value) {
      if (
        ["fillRole", "strokeRole"].includes(key) &&
        (animated(key === "fillRole" ? "fill" : "stroke") || frameEditing())
      ) {
        const field = key === "fillRole" ? "color" : "strokeColor",
          color =
            props.theme[value] ||
            props.theme.swatches?.find((s) => s.id === value)?.color;
        if (color) a.value.setProperty(field, color);
        return true;
      }
      set(key, value);
      return true;
    },
  },
);
</script>
<template>
  <div class="shape-properties">
    <template v-if="mode === 'colors'"
      ><div v-if="!isOpenShape(shape)" class="animated-color-field">
        <span
          >Couleur du remplissage<AnimationKeyButton
            v-if="studio"
            :studio="studio"
            field="color" /></span
        ><PaletteColor
          :element="shapeView"
          field="fill"
          label="Remplissage"
          :theme="theme"
        />
      </div>
      <label v-if="!isOpenShape(shape)" class="checkbox-label"
        ><input type="checkbox" v-model="shape.gradient" />Dégradé du
        remplissage</label
      >
      <PaletteColor
        v-if="shape.gradient"
        :element="shapeView"
        field="fill2"
        label="Deuxième couleur"
        :theme="theme" />
      <div class="animated-color-field">
        <span
          >Couleur du contour<AnimationKeyButton
            v-if="studio"
            :studio="studio"
            field="strokeColor" /></span
        ><PaletteColor
          :element="shapeView"
          field="stroke"
          label="Contour"
          :theme="theme"
        /></div
    ></template>
    <template v-else
      ><label
        >Forme<select v-model="shape.shape" aria-label="Type de forme">
          <option v-if="shape.shape === 'freeform'" value="freeform">
            Forme libre · plume
          </option>
          <option v-for="item in shapes" :key="item.id" :value="item.id">
            {{ item.name }}
          </option>
        </select></label
      >
      <label v-if="isOpenShape(shape)" class="checkbox-label"
        ><input
          type="checkbox"
          :checked="shape.roundedEnds !== false"
          @change="shape.roundedEnds = $event.target.checked"
        />Extrémités arrondies</label
      ><label v-if="shape.shape === 'line'"
        >Orientation<select v-model="shape.direction">
          <option value="horizontal">Horizontale</option>
          <option value="vertical">Verticale</option>
          <option value="down">Diagonale ↘</option>
          <option value="up">Diagonale ↗</option>
        </select></label
      >
      <label v-if="!isOpenShape(shape)" class="checkbox-label"
        ><input
          type="checkbox"
          aria-label="Remplissage"
          :checked="shapeView.filled"
          @change="
            set('filled', $event.target.checked)
          " />Remplissage<AnimationKeyButton
          v-if="studio"
          :studio="studio"
          field="fillEnabled" /></label
      ><label v-if="!isOpenShape(shape)" class="checkbox-label"
        ><input
          type="checkbox"
          aria-label="Contour"
          :checked="shapeView.outlined"
          @change="
            set('outlined', $event.target.checked)
          " />Contour<AnimationKeyButton
          v-if="studio"
          :studio="studio"
          field="strokeEnabled"
      /></label>
      <template v-if="shapeView.outlined || isOpenShape(shape)"
        ><label
          >Épaisseur · px<AnimationKeyButton
            v-if="studio"
            :studio="studio"
            field="strokeWidth" /><input
            type="number"
            aria-label="Épaisseur du contour"
            :value="Math.round(shapeView.strokeWidth * scale * 100) / 100"
            :min="scale"
            :max="60 * scale"
            step="1"
            @change="
              set(
                'strokeWidth',
                Math.max(
                  1,
                  Math.min(60, Number($event.target.value) / scale || 1),
                ),
              )
            " /></label
        ><label class="checkbox-label"
          ><input
            type="checkbox"
            aria-label="Pointillés"
            :checked="shapeView.dashed"
            @change="
              set('dashed', $event.target.checked)
            " />Pointillés<AnimationKeyButton
            v-if="studio"
            :studio="studio"
            field="dashed" /></label
      ></template>
      <template
        v-if="
          ['rounded', 'rect', 'square'].includes(shape.shape) &&
          !shape.individualCorners
        "
        ><AnimationKeyButton
          v-if="studio"
          :studio="studio"
          field="radius" /><NumberRange
          label="Arrondi des coins"
          unit="%"
          :max="50"
          :model-value="shapeView.radius"
          @update:model-value="set('radius', $event)" /></template
      ><CornerProperties
        :value="shape"
        @change="(key, value) => (shape[key] = value)"
        @corner="
          (key, value) => {
            shape.cornerRadii ||= {};
            shape.cornerRadii[key] = value;
          }
        " />
      <template v-if="shape.shape === 'star'"
        ><label
          >Branches<AnimationKeyButton
            v-if="studio"
            :studio="studio"
            field="points" /><input
            type="number"
            min="3"
            max="12"
            :value="shapeView.points"
            @change="
              set(
                'points',
                Math.max(
                  3,
                  Math.min(12, Math.round(Number($event.target.value) || 5)),
                ),
              )
            " /></label
        ><AnimationKeyButton
          v-if="studio"
          :studio="studio"
          field="innerRatio" /><NumberRange
          label="Profondeur des branches"
          :min="0.15"
          :max="0.8"
          :step="0.01"
          :model-value="shapeView.innerRatio"
          @update:model-value="set('innerRatio', $event)" /></template
    ></template>
  </div>
</template>
