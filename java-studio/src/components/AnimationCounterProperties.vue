<script setup>
import { counterTiming } from "../animationCounter.js";
import { computed, reactive } from "vue";
import { Timer } from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import TimecodeInput from "./TimecodeInput.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const counter = computed(() => a.config.counters[s.selected]);
const timing = computed(() => counterTiming(a.config.presences[s.selected],a.config.duration,a.config.fps));
function update(field, value) {
  a.setCounter(s.selected, field, value);
}
</script>
<template>
  <InspectorDrawer id="animation-counter" title="Compteur animé" :icon="Timer">
    <p class="field-help">
      Le compteur parcourt toute sa plage de présence : valeur de départ à
      l’apparition, valeur d’arrivée sur la dernière image avant disparition.
      Le style se règle avec les outils de texte habituels.
    </p>
    <label
      >Type de compteur<select
        aria-label="Type de compteur"
        :value="counter.mode"
        @input="update('mode', $event.target.value)"
      >
        <option value="number">Nombre</option>
        <option value="time">Temps</option>
      </select></label
    >
    <template v-if="counter.mode === 'time'">
      <TimecodeInput
        label="Valeur de départ"
        :frame-rate="a.audio.frameRate"
        :model-value="counter.from"
        @update:model-value="update('from', $event)"
      />
      <TimecodeInput
        label="Valeur d’arrivée"
        :frame-rate="a.audio.frameRate"
        :model-value="counter.to"
        @update:model-value="update('to', $event)"
      />
      <label
        >Format du temps<select
          aria-label="Format du temps"
          :value="counter.format"
          @input="update('format', $event.target.value)"
        >
          <option value="hms">Heures · minutes · secondes</option>
          <option value="ms">Minutes · secondes</option>
        </select></label
      >
    </template>
    <div v-else class="position-grid">
      <label
        >Valeur de départ<input
          type="number"
          :value="counter.from"
          @input="update('from', $event.target.value)"
      /></label>
      <label
        >Valeur d’arrivée<input
          type="number"
          :value="counter.to"
          @input="update('to', $event.target.value)"
      /></label>
    </div>
    <p class="field-help">Le compteur monte ou descend selon les valeurs de départ et d’arrivée.</p>
    <label>Affichage du compteur<select aria-label="Affichage du compteur" :value="counter.display" @input="update('display',$event.target.value)">
      <option value="replace">Chiffres remplacés</option><option value="scroll">Défilement des valeurs</option>
    </select></label>
    <label v-if="counter.display === 'scroll'">Sens du défilement<select aria-label="Sens du défilement" :value="counter.direction" @input="update('direction',$event.target.value)">
      <option value="right">De gauche à droite</option><option value="left">De droite à gauche</option>
      <option value="down">Du haut vers le bas</option><option value="up">Du bas vers le haut</option>
    </select></label>
    <TimecodeInput
      label="Durée de présence calculée"
      :frame-rate="a.config.fps"
      :model-value="timing.end-timing.start"
      disabled
    />
    <label
      >Rythme<select
        aria-label="Rythme du compteur"
        :value="counter.easing"
        @input="update('easing', $event.target.value)"
      >
        <option value="linear">Vitesse constante</option>
        <option value="smooth">Progressif</option>
        <option value="easeIn">Accélération</option>
        <option value="easeOut">Décélération</option>
      </select></label
    >
    <template v-if="counter.mode === 'number'">
      <label class="counter-check"
        ><input
          type="checkbox"
          :checked="counter.pad"
          @input="update('pad', $event.target.checked)"
        />Compléter avec des zéros</label
      >
      <label
        >Décimales<input
          type="number"
          min="0"
          max="6"
          :value="counter.decimals"
          @input="update('decimals', $event.target.value)"
      /></label>
      <label v-if="counter.decimals"
        >Séparateur décimal<input
          maxlength="1"
          :value="counter.decimalSeparator"
          @input="update('decimalSeparator', $event.target.value)"
      /></label>
      <label class="counter-check"
        ><input
          type="checkbox"
          :checked="counter.grouping"
          @input="update('grouping', $event.target.checked)"
        />Séparer les milliers</label
      >
    </template>
    <label v-if="counter.mode === 'time' || counter.grouping"
      >Séparateur<input
        maxlength="3"
        :value="counter.separator"
        @input="update('separator', $event.target.value)"
    /></label>
    <label
      >Texte avant<input
        maxlength="60"
        :value="counter.prefix"
        @input="update('prefix', $event.target.value)"
    /></label>
    <label
      >Texte après<input
        maxlength="60"
        :value="counter.suffix"
        @input="update('suffix', $event.target.value)"
    /></label>
  </InspectorDrawer>
</template>
<style scoped>
.counter-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
}
.counter-check input {
  width: auto;
  margin: 0;
}
</style>
