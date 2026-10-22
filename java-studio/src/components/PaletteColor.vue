<script setup>
import { themeColors } from "../themes.js";
import { boundColor } from "../colors.js";
const props = defineProps({
  element: Object,
  field: String,
  label: String,
  theme: Object,
  controlled: Boolean,
});
const emit = defineEmits(["change"]);
function set(value, role = null) {
  if (!/^#[\da-f]{6}$/i.test(value)) return;
  if (!props.controlled) {
    props.element[props.field] = value;
    props.element[props.field + "Role"] = role;
  }
  emit("change", value, role);
}
function choose(role) {
  const c = themeColors(props.theme).find((c) => c.id === role);
  if (c) set(c.color, role);
  else set(props.element[props.field]);
}
</script>
<template>
  <div class="palette-color">
    <label
      >{{ label
      }}<select
        :aria-label="label + ' · palette du thème'"
        :value="element[field + 'Role'] || ''"
        @change="choose($event.target.value)"
      >
        <option value="">Couleur personnalisée</option>
        <option v-for="c in themeColors(theme)" :key="c.id" :value="c.id">
          {{ c.name }}
        </option>
      </select></label
    >
    <div class="shape-color">
      <input
        type="color"
        :aria-label="label + ' personnalisée'"
        :value="boundColor(element, field, theme)"
        @input="set($event.target.value)"
      /><input
        type="text"
        :aria-label="label + ' hexadécimale'"
        maxlength="7"
        :value="boundColor(element, field, theme)"
        @input="set($event.target.value)"
      />
    </div>
  </div>
</template>
