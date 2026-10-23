<script setup>
import { fontWeights, weightNames } from "../textStyles.js";
defineProps({ modelValue: Number, font: String, type: String });
const emit = defineEmits(["update:modelValue"]);
</script>
<template>
  <label
    >Graisse<select
      :value="modelValue || 400"
      aria-label="Graisse du texte"
      @change="emit('update:modelValue', Number($event.target.value))"
    >
      <option
        v-for="weight in fontWeights(font, type)"
        :key="weight"
        :value="weight"
      >
        {{ weight }} · {{ weightNames[weight] }}
      </option>
    </select></label
  >
</template>
