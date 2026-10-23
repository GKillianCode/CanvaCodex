<script setup>
import { reactive, computed } from "vue";
import { Clock } from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import TimecodeInput from "./TimecodeInput.vue";
import MotionProperties from "./MotionProperties.vue";
import { normalizePresence } from "../animationPresence.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const range = computed(() =>
  normalizePresence(a.config.presences[s.selectedKeys[0]]),
);
function update(field, value) {
  a.setPresence(s.selectedKeys, field, value);
}
</script>
<template>
  <InspectorDrawer
    id="animation-presence"
    class="animation-presence-properties"
    title="Présence dans la scène"
    :icon="Clock"
  >
    <p class="field-help">
      Début et fin indépendants des séquences d’animation. Les réglages
      s’appliquent à la sélection.
    </p>
    <TimecodeInput
      label="Apparaît à"
      :frame-rate="a.audio.frameRate"
      :model-value="range.start"
      :disabled="a.busy"
      @update:model-value="update('start', $event)"
    />
    <button
      type="button"
      class="btn"
      :disabled="a.busy"
      @click="update('start', a.time)"
    >
      Commencer au curseur
    </button>
    <label class="presence-until-end"
      ><input
        type="checkbox"
        :checked="range.end == null"
        :disabled="a.busy"
        @change="
          update('end', $event.target.checked ? null : a.config.duration)
        "
      />Jusqu’à la fin de la scène</label
    >
    <TimecodeInput
      v-if="range.end != null"
      label="Disparaît à"
      :frame-rate="a.audio.frameRate"
      :model-value="range.end"
      :disabled="a.busy"
      @update:model-value="update('end', $event)"
    />
    <button
      type="button"
      class="btn"
      :disabled="a.busy || a.time <= range.start"
      @click="update('end', a.time)"
    >
      Terminer au curseur
    </button>
    <MotionProperties
      compact
      exit-label="Disparition"
      :animation="range.entrance"
      :exit-animation="range.exit"
      @change="
        (field, value) =>
          update(field === 'animation' ? 'entrance' : 'exit', value)
      "
    />
    <label v-if="range.entrance !== 'none'"
      >Durée d’apparition · s<input
        type="number"
        min="0"
        max="5"
        step=".05"
        :value="range.enterDuration"
        @input="update('enterDuration', $event.target.value)"
    /></label>
    <label v-if="range.exit !== 'none'"
      >Durée de disparition · s<input
        type="number"
        min="0"
        max="5"
        step=".05"
        :value="range.exitDuration"
        @input="update('exitDuration', $event.target.value)"
    /></label>
  </InspectorDrawer>
</template>
<style scoped>
.presence-until-end {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
}
.presence-until-end input {
  width: auto;
  margin: 0;
}
</style>
