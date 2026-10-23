<script setup>
import { reactive, ref, watch, computed } from "vue";
import { timecodeParts, timecodeSeconds } from "../timecode.js";
const props = defineProps({
  modelValue: Number,
  label: { type: String, default: "Temps" },
  disabled: Boolean,
  compact: Boolean,
  dense: Boolean,
  hideLabel: Boolean,
  frameRate: { type: Number, default: 0 },
  showHours: { type: Boolean, default: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 86400 },
});
const emit = defineEmits(["update:modelValue"]);
const draft = reactive(timecodeParts(props.modelValue, props.frameRate)),
  invalid = ref(false);
const fields = computed(() => [
  ["hours", "heures", "h", 2],
  ["minutes", "minutes", "min", 2],
  ["seconds", "secondes", "s", 2],
  props.frameRate
    ? ["frames", "images", "im.", props.frameRate > 100 ? 3 : 2]
    : ["milliseconds", "millisecondes", "ms", 3],
].filter(([key]) => props.showHours || key !== "hours"));
watch(
  () => [props.modelValue, props.frameRate],
  ([value]) => {
    Object.assign(draft, timecodeParts(value, props.frameRate));
    invalid.value = false;
  },
);
function bounded(value) {
  const rate = props.frameRate || 1000;
  return Math.max(Math.ceil(props.min * rate) / rate,
    Math.min(Math.floor(props.max * rate) / rate, value));
}
function commit() {
  const value = timecodeSeconds(draft, props.frameRate);
  invalid.value = value === null;
  if (value === null) return;
  const next = bounded(value);
  Object.assign(draft, timecodeParts(next, props.frameRate));
  emit("update:modelValue", next);
}
function step(amount, key) {
  const value = timecodeSeconds(draft, props.frameRate);
  if (value === null) return;
  const unit = {
    hours: 3600,
    minutes: 60,
    seconds: 1,
    milliseconds: 0.001,
    frames: 1 / props.frameRate,
  }[key];
  const next = bounded(value + amount * unit);
  Object.assign(draft, timecodeParts(next, props.frameRate));
  invalid.value = false;
  emit("update:modelValue", next);
}
</script>
<template>
  <fieldset
    class="timecode-input"
    :class="{ compact, dense }"
    :disabled="disabled"
  >
    <legend :class="{ 'timecode-legend-hidden': hideLabel }">
      {{ label
      }}<template v-if="compact && frameRate"> · {{ frameRate }} i/s</template>
    </legend>
    <div class="timecode-segments">
      <template v-for="([key, name, unit, size], index) in fields" :key="key">
        <span v-if="index" class="timecode-separator" aria-hidden="true">{{
          key === "milliseconds" && !frameRate ? "." : ":"
        }}</span>
        <label
          ><input
            v-model="draft[key]"
            type="text"
            inputmode="numeric"
            :maxlength="size"
            :aria-label="label + ' · ' + name"
            :aria-invalid="invalid"
            @change="commit"
            @keydown.enter.prevent="commit"
            @keydown.up.prevent="step(1, key)"
            @keydown.down.prevent="step(-1, key)"
          /><span>{{ unit }}</span></label
        >
      </template>
    </div>
    <small v-if="invalid" role="alert"
      >Saisis des nombres entiers : minutes et secondes de 00 à 59,
      {{
        frameRate
          ? `images de 00 à ${frameRate - 1}.`
          : "millisecondes de 000 à 999."
      }}</small
    >
  </fieldset>
</template>
<style scoped>
.timecode-input {
  min-width: 0;
  border: 0;
  margin: 12px 0;
  padding: 0;
  color: inherit;
}
.timecode-input legend {
  padding: 0;
  font-size: 12px;
  margin-bottom: 8px;
}
.timecode-segments {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
.timecode-segments label {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.timecode-segments label:last-child {
  flex: 1.4;
}
.timecode-segments input {
  width: 100%;
  min-width: 0;
  padding: 8px 3px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.timecode-segments label span {
  color: var(--muted);
  font-size: 10px;
}
.timecode-separator {
  padding-top: 8px;
  opacity: 0.6;
}
.timecode-input small {
  display: block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--muted);
}
.compact {
  width: 192px;
  margin: 0;
  flex-shrink: 0;
}
.compact legend {
  font-size: 10px;
  margin-bottom: 3px;
  color: var(--muted);
}
.compact .timecode-segments {
  gap: 3px;
}
.compact .timecode-segments input {
  min-height: 26px;
  padding: 4px 2px;
  font-size: 12px;
}
.compact .timecode-separator {
  padding-top: 4px;
}
.compact .timecode-segments label span {
  display: none;
}
.dense {
  width: 128px;
}
.dense .timecode-segments input {
  min-height: 26px;
  font-size: 11px;
}
.timecode-legend-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
