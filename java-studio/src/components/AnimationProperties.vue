<script setup>
import AnimationKeyButton from "./AnimationKeyButton.vue";
import { Diamond, Route, Link, Move } from "lucide-vue-next";
import { reactive } from "vue";
import InspectorDrawer from "./InspectorDrawer.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
</script>
<template>
  <InspectorDrawer
    id="animation-values"
    title="Propriétés animées"
    :icon="Diamond"
    ><p class="field-help">
      À l’instant du curseur, clique sur un losange pour poser ou retirer une
      clé. Modifier une valeur crée sa clé.
    </p>
    <label
      v-for="[field, label] in [
        ['x', 'Position X'],
        ['y', 'Position Y'],
        ['w', 'Largeur'],
        ['h', 'Hauteur'],
        ['rotation', 'Rotation'],
        ['opacity', 'Opacité'],
        ['skewX', 'Inclinaison X'],
        ['skewY', 'Inclinaison Y'],
        ['contentScale', 'Échelle du contenu'],
        ...(a.clip?.pathId ? [['progress', 'Progression du chemin']] : []),
      ]"
      :key="field"
      >{{ label }}<AnimationKeyButton :studio="s" :field="field" /><input
        type="number"
        :value="a.propertyValue(field)"
        :step="field === 'progress' || field === 'contentScale' ? 0.01 : 1"
        :disabled="!!a.clip?.pathId && ['x', 'y'].includes(field)"
        @change="a.setProperty(field, $event.target.value)" /></label
    ><label v-if="!a.engine"
      >Couleur<AnimationKeyButton :studio="s" field="color" /><input
        type="color"
        :value="a.propertyValue('color')"
        @input="a.setProperty('color', $event.target.value)" /></label
  ></InspectorDrawer>
  <InspectorDrawer
    id="animation-clip"
    title="Séquence et mouvement"
    :icon="Move"
    ><button class="btn full" @click="a.addClip()">Animer la sélection</button
    ><template v-if="a.clip"
      ><label>Nom<input v-model="a.clip.name" maxlength="100" /></label>
      <div class="position-grid">
        <label
          >Début · s<input
            type="number"
            v-model.number="a.clip.start"
            min="0"
            :max="a.config.duration"
            step="0.1" /></label
        ><label
          >Durée · s<input
            type="number"
            v-model.number="a.clip.duration"
            min="0.1"
            max="120"
            step="0.1"
        /></label>
      </div>
      <label
        ><input type="checkbox" v-model="a.clip.enabled" />Séquence
        active</label
      ><button class="btn" @click="a.clip.keys = [...s.selectedKeys]">
        Utiliser les objets sélectionnés
      </button>
      <p class="field-help">
        {{ a.clip.keys.length }} objets · transformations absolues ; les
        séquences sont évaluées de haut en bas.
      </p></template
    ></InspectorDrawer
  >
  <InspectorDrawer
    v-if="a.clip"
    id="animation-path"
    title="Trajectoire spline"
    :icon="Route"
    ><label
      >Chemin<select
        v-model="a.clip.pathId"
        @change="a.clip.pathId && (a.field = 'progress')"
      >
        <option value="">Aucun</option>
        <option v-for="p in a.config.paths" :value="p.id" :key="p.id">
          {{ p.name }}
        </option>
      </select></label
    >
    <p v-if="a.clip.pathId" class="field-help">
      La spline pilote X et Y. Retire le chemin pour retrouver les pistes de
      position.
    </p>
    <label class="checkbox-label"
      ><input type="checkbox" v-model="a.clip.constantSpeed" />Vitesse constante
      le long du chemin</label
    ><label class="checkbox-label"
      ><input type="checkbox" v-model="a.clip.orient" />Orienter selon le
      chemin</label
    ><button class="btn" @click="a.addPath()">Créer une spline</button
    ><label class="checkbox-label"
      ><input type="checkbox" v-model="a.pathEditing" />Afficher les
      poignées</label
    ><label v-if="a.config.paths.length"
      >Chemin à éditer<select v-model="a.activePath">
        <option v-for="p in a.config.paths" :value="p.id" :key="p.id">
          {{ p.name }}
        </option>
      </select></label
    ><template v-if="a.path"
      ><label>Nom<input v-model="a.path.name" maxlength="100" /></label
      ><label class="checkbox-label"
        ><input type="checkbox" v-model="a.path.visible" />Visible dans la
        vidéo</label
      >
      <div v-for="(p, i) in a.path.points" :key="i" class="position-grid">
        <label
          >{{ ["Départ", "Tangente 1", "Tangente 2", "Arrivée"][i] }} · X<input
            type="number"
            v-model.number="p.x"
            min="-10000"
            max="10000" /></label
        ><label
          >Y<input type="number" v-model.number="p.y" min="-10000" max="10000"
        /></label>
      </div>
      <button class="btn" @click="a.removePath()">
        Supprimer le chemin
      </button></template
    ></InspectorDrawer
  >
  <InspectorDrawer
    id="animation-links"
    title="Références attachées"
    :icon="Link"
    ><button class="btn full" @click="a.addLink()">
      Relier les deux objets sélectionnés
    </button>
    <div
      v-for="link in a.config.links.filter((l) =>
        s.selectedKeys.some((k) => l.from === k || l.to === k),
      )"
      :key="link.id"
    >
      <label>Couleur<input type="color" v-model="link.color" /></label
      ><label
        >Épaisseur<input
          type="number"
          v-model.number="link.width"
          min="1"
          max="30" /></label
      ><button
        class="btn"
        @click="a.config.links = a.config.links.filter((l) => l.id !== link.id)"
      >
        Supprimer la référence
      </button>
    </div>
    <p class="field-help">
      Les flèches suivent les objets dans l’aperçu et l’export.
    </p></InspectorDrawer
  >
</template>
