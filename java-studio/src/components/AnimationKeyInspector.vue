<script setup>
import { reactive, computed } from "vue";
import {
  animationEasings,
  discreteAnimationFields,
} from "../animationModel.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const frames = computed(() =>
  a.clip && a.activeKey
    ? a.clip.frames.filter((f) => Math.abs(f.time - a.activeKey.time) < 0.0001)
    : [],
);
const labels = {
  backgroundColor:"Fond · couleur 1",backgroundColor2:"Fond · couleur 2",backgroundAngle:"Fond · angle",
  fillEnabled: "Remplissage activé",
  strokeEnabled: "Contour activé",
  dashed: "Pointillés",
  strokeWidth: "Épaisseur du contour",
  radius: "Arrondi",
  points: "Branches",
  innerRatio: "Profondeur",
  strokeColor: "Couleur du contour",
  engineGravity: "Force de gravité",
  particleForce: "Force d’émission",
  particleSpeed: "Vitesse des particules",
  particleSize: "Taille des particules",
  particleCount: "Quantité de particules",
  particleLife: "Vie des particules",
  x: "Position X",
  y: "Position Y",
  w: "Largeur",
  h: "Hauteur",
  rotation: "Rotation",
  skewX: "Inclinaison X",
  skewY: "Inclinaison Y",
  opacity: "Opacité",
  size: "Taille du texte",
  contentScale: "Échelle",
  progress: "Progression de la spline",
  color: "Couleur du remplissage",
};
</script>
<template>
  <section
    v-if="a.clip && (a.activeKey || a.activeFrame?.clipId === a.clip.id)"
    class="animation-key-inspector"
  >
    <div>
      <strong>Image clé</strong
      ><button
        class="icon-btn"
        aria-label="Fermer les paramètres de la clé"
        @click="
          a.activeKey = null;
          a.activeFrame = null;
        "
      >
        ×
      </button>
    </div>
    <small
      >{{ a.clip.name }} ·
      {{
        (a.clip.start + (a.activeKey?.time ?? a.activeFrame.time)).toFixed(2)
      }}
      s</small
    >
    <p v-if="!a.activeKey" class="field-help">
      Image clé vide. Choisis les propriétés avec leurs losanges dans le panneau
      à droite.
    </p>
    <template v-if="a.activeKey"
      ><label
        >Temps local · s<input
          type="number"
          v-model.number="a.activeKey.time"
          min="0"
          :max="a.clip.duration"
          step="0.01"
          @change="
            a.clip.frames.sort((x, y) => x.time - y.time);
            a.seek(a.clip.start + a.activeKey.time);
          "
      /></label>
      <p v-if="a.clip.pathId" class="field-help">
        X et Y sont pilotés par la spline.
      </p>
      <div v-for="f in frames" :key="f.field" class="key-property">
        <label
          >{{ labels[f.field]
          }}<input
            v-if="discreteAnimationFields.includes(f.field)"
            type="checkbox"
            :checked="f.value >= 0.5"
            @change="f.value = $event.target.checked ? 1 : 0" /><input
            v-else
            :type="
              ['color', 'strokeColor', 'backgroundColor', 'backgroundColor2'].includes(f.field) ? 'color' : 'number'
            "
            :disabled="!!a.clip.pathId && ['x', 'y'].includes(f.field)"
            :value="f.value"
            step="0.1"
            @input="
              f.value = ['color', 'strokeColor', 'backgroundColor', 'backgroundColor2'].includes(f.field)
                ? $event.target.value
                : Number($event.target.value)
            " /></label
        ><span
          v-if="discreteAnimationFields.includes(f.field)"
          class="field-help"
          >Changement instantané</span
        ><label v-else
          >Interpolation<select v-model="f.ease">
            <option v-for="e in animationEasings" :key="e" :value="e">
              {{
                {
                  linear: "Linéaire",
                  smooth: "Progressive",
                  easeIn: "Accélération",
                  easeOut: "Décélération",
                  hold: "Instantanée",
                  bezier: "Bézier",
                }[e]
              }}
            </option>
          </select></label
        >
        <div v-if="f.ease === 'bezier'" class="position-grid">
          <label v-for="(name, i) in ['X1', 'Y1', 'X2', 'Y2']" :key="i"
            >{{ name
            }}<input
              type="number"
              v-model.number="f.curve[i]"
              :min="i % 2 ? -2 : 0"
              :max="i % 2 ? 3 : 1"
              step=".05"
          /></label>
        </div>
      </div>
      <div class="key-actions">
        <button class="btn" @click="a.duplicateKey(a.clip, a.activeKey)">
          Dupliquer</button
        ><button class="btn" @click="a.deleteKey(a.clip, a.activeKey)">
          Supprimer
        </button>
      </div>
    </template>
  </section>
</template>
