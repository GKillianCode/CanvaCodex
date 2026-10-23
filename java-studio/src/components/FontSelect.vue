<script setup>
import { fonts } from "../fonts.js";
defineProps({
  modelValue: String,
  type: String,
  label: { type: String, default: "Police" },
  ariaLabel: { type: String, default: "Police de l’élément" },
});
const emit = defineEmits(["update:modelValue"]);
</script>
<template>
  <label
    >{{ label
    }}<select
      :aria-label="ariaLabel"
      :value="modelValue || 'inter'"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <optgroup
        v-for="local in [false, true]"
        :key="String(local)"
        :label="local ? 'Polices système' : 'Polices incluses'"
      >
        <option
          v-for="f in fonts.filter(
            (f) => !!f.local === local && (type !== 'code' || f.mono),
          )"
          :key="f.id"
          :value="f.id"
        >
          {{ f.name }}
        </option>
      </optgroup>
    </select></label
  >
</template>
