<script setup>
defineProps({
  value: Object,
  disabled: Boolean,
  unit: { type: String, default: "px" },
  limit: { type: Number, default: 10000 },
  ariaSuffix: { type: String, default: "" },
});
const emit = defineEmits(["change"]);
const fields = [
  ["x", "Position X"],
  ["y", "Position Y"],
  ["w", "Largeur"],
  ["h", "Hauteur"],
];
</script>
<template>
  <div class="position-grid">
    <label v-for="[key, name] in fields" :key="key"
      >{{ name }}<small v-if="unit"> · {{ unit }}</small
      ><slot name="key" :field="key" /><input
        type="number"
        :aria-label="name + ariaSuffix"
        :value="value[key]"
        :disabled="disabled"
        :min="['x', 'y'].includes(key) ? -limit : 0.1"
        :max="limit"
        step=".1"
        @change="emit('change', key, $event)"
    /></label>
  </div>
  <label
    >Rotation · degrés<slot name="key" field="rotation" /><input
      type="number"
      :aria-label="'Rotation' + ariaSuffix"
      :value="value.rotation || 0"
      :disabled="disabled"
      step=".1"
      @change="emit('change', 'rotation', $event)"
  /></label>
</template>
