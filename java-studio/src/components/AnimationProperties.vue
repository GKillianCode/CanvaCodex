<script setup>
import { reactive } from "vue";
import InspectorDrawer from "./InspectorDrawer.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
</script>
<template>
  <InspectorDrawer id="animation-clip" title="Séquence et mouvement"
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
  <InspectorDrawer v-if="a.clip" id="animation-path" title="Trajectoire spline"
    ><label
      >Chemin<select v-model="a.clip.pathId">
        <option value="">Aucun</option>
        <option v-for="p in a.config.paths" :value="p.id" :key="p.id">
          {{ p.name }}
        </option>
      </select></label
    ><label class="checkbox-label"
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
  <InspectorDrawer v-if="a.clip" id="animation-modifier" title="Modifieur"
    ><label
      >Mouvement<select v-model="a.clip.modifier">
        <option value="none">Aucun</option>
        <option value="oscillate">Oscillation</option>
        <option value="gravity">Gravité</option>
        <option value="stretch">Écrasement / étirement</option>
      </select></label
    ><label v-if="a.clip.modifier === 'gravity'"
      >Accélération · px/s²<input
        type="number"
        v-model.number="a.clip.gravity"
        min="-2000"
        max="2000" /></label
    ><template v-if="['oscillate', 'stretch'].includes(a.clip.modifier)"
      ><label
        >Amplitude<input
          type="number"
          v-model.number="a.clip.amplitude"
          min="0"
          max="1000" /></label
      ><label
        >Fréquence · Hz<input
          type="number"
          v-model.number="a.clip.frequency"
          min="0"
          max="20"
          step="0.1" /></label
    ></template>
    <div class="position-grid">
      <label
        >Pivot X · 0 à 1<input
          type="number"
          v-model.number="a.clip.pivotX"
          min="0"
          max="1"
          step="0.1" /></label
      ><label
        >Pivot Y<input
          type="number"
          v-model.number="a.clip.pivotY"
          min="0"
          max="1"
          step="0.1"
      /></label></div
  ></InspectorDrawer>
  <InspectorDrawer v-if="a.clip" id="animation-particles" title="Particules"
    ><label class="checkbox-label"
      ><input type="checkbox" v-model="a.clip.particles.enabled" />Émetteur sur
      le premier objet</label
    ><template v-if="a.clip.particles.enabled"
      ><label
        >Nombre maximal<input
          type="number"
          v-model.number="a.clip.particles.count"
          min="1"
          max="200" /></label
      ><label
        >Graine reproductible<input
          type="number"
          v-model.number="a.clip.particles.seed"
          min="0"
          max="100000" /></label
      ><label
        >Durée de vie · s<input
          type="number"
          v-model.number="a.clip.particles.life"
          min="0.1"
          max="10"
          step="0.1" /></label
      ><label
        >Vitesse · px/s<input
          type="number"
          v-model.number="a.clip.particles.speed"
          min="0"
          max="1000" /></label
      ><label
        >Taille · px<input
          type="number"
          v-model.number="a.clip.particles.size"
          min="1"
          max="100" /></label
      ><label
        >Couleur<input type="color" v-model="a.clip.particles.color" /></label
      ><label
        >Gravité · px/s²<input
          type="number"
          v-model.number="a.clip.gravity"
          min="-2000"
          max="2000"
      /></label>
      <p class="field-help">
        Dispersion circulaire, diminution de taille et d’opacité. Résultat
        identique après un retour en arrière.
      </p></template
    ></InspectorDrawer
  >
  <InspectorDrawer id="animation-links" title="Références attachées"
    ><button class="btn full" @click="a.addLink()">
      Relier les deux objets sélectionnés
    </button>
    <div v-for="link in a.config.links" :key="link.id">
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
