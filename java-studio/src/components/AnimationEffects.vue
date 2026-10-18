<script setup>
import { reactive, computed, ref } from "vue";
import {
  Plus,
  Trash2,
  Waves,
  Wind,
  ArrowDown,
  Copy,
  Scissors,
  Combine,
  Move,
  Route,
  Box,
  SlidersHorizontal,
} from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import AnimationProperties from "./AnimationProperties.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const groups = [
  [
    "Mouvement",
    Move,
    [
      ["oscillate", "Oscillation", Waves],
      ["turbulence", "Tourbillon 2D", Waves],
    ],
  ],
  [
    "Déformation",
    SlidersHorizontal,
    [
      ["stretch", "Étirement", Move],
      ["skew", "Inclinaison", Move],
    ],
  ],
  [
    "Génération",
    Copy,
    [
      ["array", "Répétition", Copy],
      ["subtract", "Découpe", Scissors],
      ["intersect", "Combineion", Combine],
    ],
  ],
  [
    "Physique 2D",
    ArrowDown,
    [
      ["gravity", "Gravité", ArrowDown],
      ["wind", "Vent", Wind],
      ["collider", "Obstacle", Box],
    ],
  ],
];
const names = Object.fromEntries(
  groups.flatMap((g) => g[2].map(([id, name, icon]) => [id, { name, icon }])),
);
const effects = computed(() =>
  a.config.effects.filter((e) => s.selectedKeys.includes(e.key)),
);
const candidates = computed(() =>
  s.current.blockKeys.filter(
    (k) =>
      !s.current.elements[k]?.engineKind &&
      s.current.elements[k]?.type === "shape",
  ),
);
</script>
<template>
  <p v-if="!s.selectedKeys.length" class="field-help">
    Sélectionne un objet pour lui ajouter un effet.
  </p>
  <template v-else
    ><InspectorDrawer
      id="add-animation-effect"
      title="Ajouter un effet"
      :icon="Plus"
      ><details
        v-for="[name, icon, items] in groups"
        :key="name"
        class="effect-group"
      >
        <summary><component :is="icon" :size="14" />{{ name }}</summary>
        <button
          v-for="[id, label, itemIcon] in items"
          :key="id"
          class="btn full"
          @click="a.addEffect(id)"
        >
          <component :is="itemIcon" :size="14" />{{ label }}
        </button>
      </details>
      <button
        class="btn full"
        @click="
          a.addClip();
          a.addPath();
        "
      >
        <Route :size="14" />Suivre une spline
      </button></InspectorDrawer
    >
    <InspectorDrawer
      v-for="effect in effects"
      :key="effect.id"
      :id="'effect-' + effect.id"
      :title="names[effect.kind].name"
      :icon="names[effect.kind].icon"
      ><label class="checkbox-label"
        ><input type="checkbox" v-model="effect.enabled" />Actif</label
      >
      <template v-if="['subtract', 'intersect'].includes(effect.kind)"
        ><label
          >Forme de découpe<select v-model="effect.target">
            <option value="">Choisir une forme</option>
            <option
              v-for="key in candidates.filter((k) => k !== effect.key)"
              :key="key"
              :value="key"
            >
              {{ s.current.elements[key]?.name || key }}
            </option>
          </select></label
        ></template
      >
      <template v-else-if="effect.kind === 'array'"
        ><label
          >Nombre<input
            type="number"
            min="1"
            max="30"
            v-model.number="effect.count" /></label
        ><label
          >Décalage X<input type="number" v-model.number="effect.dx" /></label
        ><label
          >Décalage Y<input type="number" v-model.number="effect.dy" /></label
      ></template>
      <template v-else-if="['gravity', 'wind'].includes(effect.kind)"
        ><label
          >{{
            effect.kind === "gravity"
              ? "Force de gravité · px/s²"
              : "Force du vent · px/s²"
          }}<input
            type="number"
            min="-2000"
            max="2000"
            v-model.number="
              effect[effect.kind === 'gravity' ? 'gravity' : 'amount']
            " /></label
        ><label
          >Résistance de l’air<input
            type="number"
            min="0"
            max="10"
            step=".05"
            v-model.number="effect.drag" /></label
        ><label
          >Rebond · 0 à 1<input
            type="number"
            min="0"
            max="1"
            step=".05"
            v-model.number="effect.bounce" /></label
        ><label
          >Frottement · 0 à 1<input
            type="number"
            min="0"
            max="1"
            step=".05"
            v-model.number="effect.friction"
        /></label>
        <p class="field-help">
          Ajoute « Obstacle » au rectangle qui servira de sol. Collisions sur
          les cadres rectangulaires.
        </p></template
      >
      <p v-else-if="effect.kind === 'collider'" class="field-help">
        Le cadre de cet objet arrête les corps soumis à la gravité ou au vent.
      </p>
      <template v-else
        ><label
          >Amplitude<input
            type="number"
            v-model.number="effect.amount" /></label
        ><label
          >Fréquence · Hz<input
            type="number"
            min="0"
            max="20"
            step=".1"
            v-model.number="effect.frequency" /></label></template
      ><button class="btn full" @click="a.removeEffect(effect.id)">
        <Trash2 :size="14" />Retirer cet effet
      </button></InspectorDrawer
    >
    <AnimationProperties :studio="s"
  /></template>
</template>
