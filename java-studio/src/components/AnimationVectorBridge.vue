<script setup>
import { ref, reactive } from "vue";
import { PenTool, Plus } from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import { designRepository } from "../designRepository.js";
import { videoRepository } from "../videoProjects.js";
import { designAnimationScene } from "../designAnimationBridge.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  rows = ref([]),
  documentId = ref(""),
  doc = ref(null),
  page = ref(0),
  error = ref(""),
  store = designRepository(videoRepository(), "vector");
async function load() {
  try {
    rows.value = await store.list();
  } catch (e) {
    error.value = e.message;
  }
}
async function choose() {
  doc.value = null;
  page.value = 0;
  error.value = "";
  if (documentId.value)
    try {
      doc.value = (await store.load(documentId.value)).document;
    } catch (e) {
      error.value = e.message;
    }
}
function add() {
  error.value = "";
  try {
    if (s.slides.length >= 100) throw Error("Limite de 100 scènes.");
    const scene = designAnimationScene(doc.value, page.value);
    s.animation.stop();
    s.animation.beginGesture();
    scene.grid = { x: Math.max(0, ...s.slides.map((v) => v.grid.x)) + 1, y: 0 };
    s.slides.push(scene);
    s.index = s.slides.length - 1;
    s.animation.endGesture();
    s.notify(
      "Plan copié dans une nouvelle scène. Chaque objet reste indépendant.",
    );
  } catch (e) {
    error.value = e.message;
  }
}
</script>
<template>
  <InspectorDrawer
    id="animation-vector-bridge"
    title="Depuis l’atelier vectoriel"
    :icon="PenTool"
    ><button class="btn full" @click="load">Charger mes illustrations</button
    ><label v-if="rows.length"
      >Illustration<select
        aria-label="Illustration"
        v-model="documentId"
        @change="choose"
      >
        <option value="">Choisir un document</option>
        <option v-for="r in rows" :key="r.id" :value="r.id">
          {{ r.name }}
        </option>
      </select></label
    >
    <p v-else class="field-help">
      Charge la liste des illustrations enregistrées. Tu peux aussi exporter un
      plan depuis Vectoriel → Fichier → Exporter pour Animation.
    </p>
    <template v-if="doc"
      ><label
        >Plan<select aria-label="Plan vectoriel" v-model.number="page">
          <option v-for="(p, i) in doc.pages" :key="p.id" :value="i">
            {{ p.name }}
          </option>
        </select></label
      ><button class="btn full" @click="add">
        <Plus :size="14" />Ajouter comme scène
      </button>
      <p class="field-help">
        Copie indépendante. Formes, textes, tracés et images restent
        modifiables. L’illustration d’origine est conservée.
      </p></template
    >
    <p v-if="error" role="alert">{{ error }}</p></InspectorDrawer
  >
</template>
