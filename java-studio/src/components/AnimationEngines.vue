<script setup>
import { reactive } from "vue";
import { blockLabel } from "../model.js";
import AnimationProperties from "./AnimationProperties.vue";
import InspectorDrawer from "./InspectorDrawer.vue";
import PaletteColor from "./PaletteColor.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
function direction(id) {
  const p = a.engine.particles;
  if (id === "radial") {
    p.direction = "radial";
    return;
  }
  p.direction = "axes";
  const ranges = {
    right: [0, 1, 0, 0],
    left: [-1, 0, 0, 0],
    up: [0, 0, -1, 0],
    down: [0, 0, 0, 1],
    all: [-1, 1, -1, 1],
  };
  [p.xMin, p.xMax, p.yMin, p.yMax] = ranges[id] || ranges.all;
}
</script>
<template>
  <div class="animation-engines">
    <div class="engine-add-actions">
      <button class="btn" @click="a.addEngine('particles')">+ Particules</button
      ><button class="btn" @click="a.addEngine('gravity')">+ Gravité</button>
    </div>
    <p class="field-help">
      Les moteurs ont leur propre repère déplaçable. Ce repère ne figure jamais
      dans la vidéo.
    </p>
    <button
      v-for="e in a.config.engines"
      :key="e.id"
      class="layer-row"
      :class="{ active: a.engine?.id === e.id }"
      @click="a.selectEngine(e.id)"
    >
      {{ s.current.elements[e.key]?.name || "Moteur"
      }}<small>{{
        e.kind === "particles" ? "Particules" : "Gravité"
      }}</small></button
    ><template
      v-for="c in a.config.clips.filter((c) => c.particles?.enabled)"
      :key="c.id"
      ><p class="field-help">Ancien émetteur attaché : {{ c.name }}</p>
      <button class="btn" @click="a.detachLegacy(c)">
        Détacher cet émetteur
      </button></template
    >
    <template v-if="a.engine"
      ><InspectorDrawer id="engine-main" title="Moteur sélectionné"
        ><label
          >Nom<input
            v-model="s.current.elements[a.engine.key].name"
            maxlength="100" /></label
        ><label class="checkbox-label"
          ><input type="checkbox" v-model="a.engine.enabled" />Activé</label
        >
        <div class="position-grid">
          <label
            >Début · s<input
              type="number"
              v-model.number="a.engine.start"
              min="0"
              max="120"
              step="0.1" /></label
          ><label
            >Durée · s<input
              type="number"
              v-model.number="a.engine.duration"
              min="0.1"
              max="120"
              step="0.1" /></label
          ><label
            >Position X<input
              type="number"
              v-model.number="s.current.positions[a.engine.key].x"
              min="-10000"
              max="10000" /></label
          ><label
            >Position Y<input
              type="number"
              v-model.number="s.current.positions[a.engine.key].y"
              min="-10000"
              max="10000"
          /></label>
        </div>
        <button class="btn" @click="a.removeEngine(a.engine.id)">
          Supprimer le moteur
        </button></InspectorDrawer
      >
      <InspectorDrawer
        v-if="a.engine.kind === 'particles'"
        id="engine-particles"
        title="Émission et direction"
        ><label
          >Répartition<select
            :value="
              a.engine.particles.direction === 'radial' ? 'radial' : 'custom'
            "
            @change="direction($event.target.value)"
          >
            <option value="radial">Circulaire</option>
            <option value="all">Tous les sens · axes X/Y</option>
            <option value="right">Vers la droite</option>
            <option value="left">Vers la gauche</option>
            <option value="up">Vers le haut</option>
            <option value="down">Vers le bas</option>
            <option value="custom">Axes personnalisés</option>
          </select></label
        >
        <div
          v-if="a.engine.particles.direction === 'axes'"
          class="position-grid"
        >
          <label
            v-for="[key, label] in [
              ['xMin', 'X minimum'],
              ['xMax', 'X maximum'],
              ['yMin', 'Y minimum'],
              ['yMax', 'Y maximum'],
            ]"
            :key="key"
            >{{ label
            }}<input
              type="number"
              v-model.number="a.engine.particles[key]"
              min="-1"
              max="1"
              step="0.1"
          /></label>
        </div>
        <p class="field-help">
          X positif : droite. Y positif : bas. Une plage [0, 0] coupe le
          mouvement sur cet axe.
        </p>
        <div class="position-grid">
          <label
            v-for="[key, label, min, max, step] in [
              ['count', 'Nombre maximal', 1, 200, 1],
              ['life', 'Durée de vie · s', 0.1, 10, 0.1],
              ['speed', 'Vitesse · px/s', 0, 1000, 1],
              ['size', 'Taille · px', 1, 100, 1],
              ['seed', 'Graine', 0, 100000, 1],
            ]"
            :key="key"
            >{{ label
            }}<input
              type="number"
              v-model.number="a.engine.particles[key]"
              :min="min"
              :max="max"
              :step="step"
          /></label>
        </div>
        <label
          >Gravité des particules · px/s²<input
            type="number"
            v-model.number="a.engine.gravity"
            min="-2000"
            max="2000" /></label
      ></InspectorDrawer>
      <InspectorDrawer
        v-if="a.engine.kind === 'particles'"
        id="engine-colors"
        title="Couleur des particules"
        ><PaletteColor
          :element="a.engine.particles"
          field="color"
          label="Couleur des particules"
          :theme="s.theme"
      /></InspectorDrawer>
      <InspectorDrawer
        v-if="a.engine.kind === 'gravity'"
        id="engine-gravity"
        title="Gravité et objets concernés"
        ><label
          >Accélération · px/s²<input
            type="number"
            v-model.number="a.engine.gravity"
            min="-2000"
            max="2000" /></label
        ><label
          v-for="key in s.current.blockKeys.filter(
            (k) => !s.current.elements[k]?.engineKind,
          )"
          :key="key"
          class="checkbox-label"
          ><input type="checkbox" v-model="a.engine.targets" :value="key" />{{
            blockLabel(s.current, key)
          }}</label
        >
        <p class="field-help">
          Choisis les objets affectés ; le moteur reste indépendant de leur
          géométrie.
        </p></InspectorDrawer
      ></template
    >
    <template v-if="a.engine"
      ><button
        v-if="!a.clip?.keys.includes(a.engine.key)"
        class="btn full"
        @click="a.addClip()"
      >
        Animer ce moteur</button
      ><AnimationProperties v-else :studio="s"
    /></template>
  </div>
</template>
