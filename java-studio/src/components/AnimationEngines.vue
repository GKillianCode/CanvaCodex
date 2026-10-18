<script setup>
import { reactive } from "vue";
import { blockLabel } from "../model.js";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import ShapeProperties from "./ShapeProperties.vue";
import { Sparkles, Move, Palette, ArrowDown, Shapes } from "lucide-vue-next";
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
    <template v-if="a.engine"
      ><InspectorDrawer id="engine-main" title="Repère et émission" :icon="Move"
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
            >Position X<AnimationKeyButton :studio="s" field="x" /><input
              type="number"
              :value="a.propertyValue('x')"
              @change="
                a.clip?.frames.some((f) => f.field === 'x')
                  ? a.setProperty('x', $event.target.value)
                  : (s.current.positions[a.engine.key].x = Number(
                      $event.target.value,
                    ))
              "
              min="-10000"
              max="10000" /></label
          ><label
            >Position Y<AnimationKeyButton :studio="s" field="y" /><input
              type="number"
              :value="a.propertyValue('y')"
              @change="
                a.clip?.frames.some((f) => f.field === 'y')
                  ? a.setProperty('y', $event.target.value)
                  : (s.current.positions[a.engine.key].y = Number(
                      $event.target.value,
                    ))
              "
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
        :icon="Sparkles"
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
            }}<AnimationKeyButton
              v-if="['count', 'life', 'speed', 'size', 'force'].includes(key)"
              :studio="s"
              :field="'particle' + key[0].toUpperCase() + key.slice(1)" /><input
              type="number"
              :value="
                ['count', 'life', 'speed', 'size', 'force'].includes(key)
                  ? a.propertyValue(
                      'particle' + key[0].toUpperCase() + key.slice(1),
                    )
                  : a.engine.particles[key]
              "
              @change="
                ['count', 'life', 'speed', 'size', 'force'].includes(key) &&
                a.clip?.frames.some(
                  (f) =>
                    f.field ===
                    'particle' + key[0].toUpperCase() + key.slice(1),
                )
                  ? a.setProperty(
                      'particle' + key[0].toUpperCase() + key.slice(1),
                      $event.target.value,
                    )
                  : (a.engine.particles[key] = Number($event.target.value))
              "
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
              ['force', 'Force de l’émetteur', 0, 10, 0.1],
              ['size', 'Taille · px', 1, 100, 1],
              ['seed', 'Graine', 0, 100000, 1],
            ]"
            :key="key"
            >{{ label
            }}<AnimationKeyButton
              v-if="['count', 'life', 'speed', 'size', 'force'].includes(key)"
              :studio="s"
              :field="'particle' + key[0].toUpperCase() + key.slice(1)" /><input
              type="number"
              :value="
                ['count', 'life', 'speed', 'size', 'force'].includes(key)
                  ? a.propertyValue(
                      'particle' + key[0].toUpperCase() + key.slice(1),
                    )
                  : a.engine.particles[key]
              "
              @change="
                ['count', 'life', 'speed', 'size', 'force'].includes(key) &&
                a.clip?.frames.some(
                  (f) =>
                    f.field ===
                    'particle' + key[0].toUpperCase() + key.slice(1),
                )
                  ? a.setProperty(
                      'particle' + key[0].toUpperCase() + key.slice(1),
                      $event.target.value,
                    )
                  : (a.engine.particles[key] = Number($event.target.value))
              "
              :min="min"
              :max="max"
              :step="step"
          /></label>
        </div>
        <label
          >Gravité des particules · px/s²<input
            type="number"
            :value="a.propertyValue('engineGravity')"
            @change="
              a.clip?.frames.some((f) => f.field === 'engineGravity')
                ? a.setProperty('engineGravity', $event.target.value)
                : (a.engine.gravity = Number($event.target.value))
            "
            min="-2000"
            max="2000" /></label
      ></InspectorDrawer>
      <InspectorDrawer
        v-if="a.engine.kind === 'particles'"
        id="particle-shape"
        title="Forme des particules"
        :icon="Shapes"
        ><ShapeProperties
          :shape="a.engine.particles.shape"
          :theme="s.theme"
          :scale="1" /><label
          >Proportion largeur / hauteur<input
            type="number"
            min=".1"
            max="10"
            step=".1"
            v-model.number="a.engine.particles.aspect" /></label
        ><label
          >Rotation · degrés<input
            type="number"
            min="-360"
            max="360"
            v-model.number="a.engine.particles.rotation" /></label
      ></InspectorDrawer>
      <InspectorDrawer
        v-if="a.engine.kind === 'particles'"
        id="engine-colors"
        title="Couleur des particules"
        :icon="Palette"
        ><AnimationKeyButton :studio="s" field="color" /><PaletteColor
          :element="a.engine.particles"
          field="color"
          label="Couleur des particules"
          :theme="s.theme"
      /></InspectorDrawer>
      <InspectorDrawer
        v-if="a.engine.kind === 'gravity'"
        id="engine-gravity"
        title="Gravité et objets concernés"
        :icon="ArrowDown"
        ><label
          >Force de gravité · px/s²<AnimationKeyButton
            :studio="s"
            field="engineGravity" /><input
            type="number"
            :value="a.propertyValue('engineGravity')"
            @change="
              a.clip?.frames.some((f) => f.field === 'engineGravity')
                ? a.setProperty('engineGravity', $event.target.value)
                : (a.engine.gravity = Number($event.target.value))
            "
            min="-2000"
            max="2000" /></label
        ><label
          v-for="[key, label, min, max] in [
            ['drag', 'Résistance de l’air', 0, 10],
            ['bounce', 'Rebond', 0, 1],
            ['friction', 'Frottement', 0, 1],
            ['wind', 'Force du vent · px/s²', -2000, 2000],
          ]"
          :key="key"
          >{{ label
          }}<input
            type="number"
            :min="min"
            :max="max"
            step=".05"
            v-model.number="a.engine[key]" /></label
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
  </div>
</template>
