<script setup>
import { computed, reactive } from "vue";
import { Plus, Trash2, Zap } from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import { shapes } from "../shapes.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const contacts = computed(() =>
  a.config.triggers.filter((r) => r.actor === s.selected),
);
const targets = computed(() =>
  s.current.blockKeys.filter(
    (k) =>
      k !== s.selected &&
      s.current.elements[k]?.type === "shape" &&
      !s.current.elements[k]?.engineKind,
  ),
);
function add() {
  if (!s.selected || a.config.triggers.length >= 100) return;
  a.config.triggers.push({
    id: crypto.randomUUID(),
    actor: s.selected,
    target: targets.value[0] || "",
    enabled: true,
    shape: "",
    targetShape: "",
    color: "",
    targetColor: "",
    gravity: null,
    impulse: null,
  });
}
</script>
<template>
  <InspectorDrawer
    v-if="
      s.selected &&
      s.current.elements[s.selected]?.type === 'shape' &&
      !a.engine
    "
    id="animation-contacts"
    title="Au contact d’un bloc"
    :icon="Zap"
  >
    <p class="field-help">
      Avec un moteur Spline horizontale + saut physique, chaque contact se
      déclenche une fois par lecture. Le bloc peut rester non solide.
    </p>
    <button class="btn full" @click="add">
      <Plus :size="14" />Ajouter un contact
    </button>
    <div v-for="r in contacts" :key="r.id" class="animation-contact-rule">
      <label
        >Bloc touché<select v-model="r.target">
          <option v-for="key in targets" :key="key" :value="key">
            {{ s.current.elements[key].name || key }}
          </option>
        </select></label
      >
      <label class="checkbox-label"
        ><input type="checkbox" v-model="r.enabled" />Actif</label
      >
      <label
        v-for="[key, label] in [
          ['shape', 'Nouvelle forme du personnage'],
          ['targetShape', 'Nouvelle forme du bloc'],
        ]"
        :key="key"
        >{{ label
        }}<select v-model="r[key]">
          <option value="">Conserver</option>
          <option
            v-for="shape in shapes.filter((x) => !x.open)"
            :key="shape.id"
            :value="shape.id"
          >
            {{ shape.name }}
          </option>
        </select></label
      >
      <label
        v-for="[key, label] in [
          ['color', 'Couleur du personnage'],
          ['targetColor', 'Couleur du bloc'],
        ]"
        :key="key"
        ><span class="checkbox-label"
          ><input
            type="checkbox"
            :checked="!!r[key]"
            @change="r[key] = $event.target.checked ? '#e3b778' : ''"
          />{{ label }}</span
        ><input v-if="r[key]" type="color" v-model="r[key]"
      /></label>
      <label class="checkbox-label"
        ><input
          type="checkbox"
          :checked="r.gravity !== null"
          @change="r.gravity = $event.target.checked ? -900 : null"
        />Changer la gravité</label
      ><label v-if="r.gravity !== null"
        >Gravité après contact · px/s²<input
          type="number"
          v-model.number="r.gravity"
          min="-2000"
          max="2000"
      /></label>
      <label class="checkbox-label"
        ><input
          type="checkbox"
          :checked="r.impulse !== null"
          @change="r.impulse = $event.target.checked ? 0 : null"
        />Impulsion verticale au contact</label
      ><input
        v-if="r.impulse !== null"
        type="number"
        v-model.number="r.impulse"
        min="-3000"
        max="3000"
        aria-label="Impulsion au contact"
      />
      <button
        class="btn"
        @click="
          a.requestDelete(
            'ce contact',
            () =>
              (a.config.triggers = a.config.triggers.filter(
                (x) => x.id !== r.id,
              )),
          )
        "
      >
        <Trash2 :size="14" />Supprimer le contact
      </button>
    </div>
  </InspectorDrawer>
</template>
<style scoped>
.animation-contact-rule {
  padding: 12px 0;
  border-top: 1px solid var(--border);
  margin-top: 12px;
}
</style>
