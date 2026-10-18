<script setup>
import { reactive } from "vue";
import { themeColors } from "../themes.js";
import AnimationKeyButton from "./AnimationKeyButton.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
</script>
<template>
  <label
    >Fond<select v-model="a.config.background">
      <option value="transparent">Transparent</option>
      <option value="solid">Couleur unie</option>
      <option value="gradient">Dégradé</option>
    </select></label
  >
  <template v-if="a.config.background !== 'transparent'">
    <label
      v-for="[field, label] in a.config.background === 'gradient'
        ? [
            ['backgroundColor', 'Couleur 1'],
            ['backgroundColor2', 'Couleur 2'],
          ]
        : [['backgroundColor', 'Couleur du fond']]"
      :key="field"
      >{{ label }}<AnimationKeyButton :studio="s" :field="field" /><input
        type="color"
        :aria-label="label + ' du fond'"
        :value="a.propertyValue(field)"
        @input="a.setProperty(field, $event.target.value)"
      /><select
        :aria-label="label + ' · palette du thème'"
        value=""
        @change="
          a.setProperty(field, $event.target.value);
          $event.target.value = '';
        "
      >
        <option value="" disabled>Palette du thème</option>
        <option v-for="c in themeColors(s.theme)" :key="c.id" :value="c.color">
          {{ c.name }}
        </option>
      </select></label
    >
    <label v-if="a.config.background === 'gradient'"
      >Angle · degrés<AnimationKeyButton
        :studio="s"
        field="backgroundAngle" /><input
        type="number"
        :value="a.propertyValue('backgroundAngle')"
        min="-360"
        max="360"
        @change="a.setProperty('backgroundAngle', $event.target.value)"
    /></label>
    <p class="field-help">
      Déplace la tête de lecture puis modifie une couleur : sa clé est créée
      dans la piste Fond de scène.
    </p>
  </template>
  <label
    >Objet continu entre scènes<select v-model="a.config.actorKey">
      <option value="">Aucun</option>
      <option
        v-for="key in s.current.blockKeys.filter(
          (k) => !s.current.elements[k]?.engineKind,
        )"
        :key="key"
        :value="key"
      >
        {{ s.current.elements[key]?.name || key }}
      </option>
    </select></label
  ><label v-if="a.config.actorKey"
    >Identifiant partagé<input
      v-model="a.config.actorId"
      placeholder="personnage"
      maxlength="100"
  /></label>
  <label
    >Transition vers la scène suivante · s<input
      type="number"
      v-model.number="a.config.transition"
      min="0"
      max="2"
      step=".1"
  /></label>
</template>
