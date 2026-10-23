<script setup>
import { Check } from "lucide-vue-next";
import ThemePreview from "./ThemePreview.vue";
defineProps({ themes: Array, selected: String });
const emit = defineEmits(["select"]);
</script>
<template>
  <div class="theme-grid">
    <article
      v-for="t in themes"
      :key="t.id"
      :class="['theme-card', { chosen: selected === t.id }]"
    >
      <button
        class="theme-select"
        @click="emit('select', t.id)"
        :aria-label="'Appliquer ' + t.name"
      >
        <ThemePreview :theme="t" />
        <div class="theme-caption">
          <div>
            {{ t.name }}<small class="theme-description">{{ t.desc }}</small>
          </div>
          <Check v-if="selected === t.id" :size="18" />
        </div>
      </button>
      <div v-if="$slots.actions" class="theme-card-actions">
        <slot name="actions" :theme="t" />
      </div>
    </article>
  </div>
</template>
