<script setup>
import { reactive } from "vue";
import { Diamond } from "lucide-vue-next";
const props = defineProps({ studio: Object, field: String });
const s = reactive(props.studio);
</script>
<template>
  <button
    v-if="s.animation"
    type="button"
    class="animation-property-key"
    :class="{
      keyed: s.animation.keyAt(field),
      animated: s.animation.clip?.frames.some((f) => f.field === field),
    }"
    :title="
      (s.animation.keyAt(field) ? 'Retirer' : 'Ajouter') +
      ' la clé à ' +
      s.animation.time.toFixed(2) +
      ' s'
    "
    :aria-label="'Clé · ' + field"
    :aria-pressed="!!s.animation.keyAt(field)"
    @click.prevent="s.animation.toggleProperty(field)"
  >
    <Diamond
      :size="13"
      :fill="s.animation.keyAt(field) ? 'currentColor' : 'none'"
    />
  </button>
</template>
