<script setup>
import {imageEffects} from "../imageEffects.js";
import NumberRange from "./NumberRange.vue";
defineProps({shape:Object,studio:Object});
</script>
<template>
  <div class="shape-image-options">
    <label class="menu-file">{{shape.imageSrc?'Remplacer l’image de fond':'Importer une image de fond'}}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" aria-label="Importer une image dans la forme" @change="studio.uploadShapeImage($event)"></label>
    <template v-if="shape.imageSrc">
      <img :src="shape.imageSrc" alt="Image de fond" class="shape-image-preview">
      <label>Ajustement de l’image<select v-model="shape.imageFit"><option value="cover">Remplir la forme</option><option value="contain">Afficher l’image entière</option></select></label>
      <NumberRange label="Décalage horizontal" unit="%" :min="-100" :model-value="shape.imageOffsetX??0" @update:model-value="shape.imageOffsetX=$event"/>
      <NumberRange label="Décalage vertical" unit="%" :min="-100" :model-value="shape.imageOffsetY??0" @update:model-value="shape.imageOffsetY=$event"/>
      <button class="btn" @click="shape.imageOffsetX=0;shape.imageOffsetY=0">Recentrer l’image</button>
      <p class="field-help">Déplace la partie visible de l’image, sans déplacer la forme. En mode Remplir, le décalage utilise le débordement disponible sans laisser de vide.</p>
      <NumberRange label="Opacité de l’image" unit="%" :model-value="shape.imageOpacity??100" @update:model-value="shape.imageOpacity=$event"/>
      <NumberRange v-for="effect in imageEffects" :key="effect.id" :label="effect.label" unit="%" :max="effect.max" :model-value="shape.imageEffects?.[effect.id]??effect.default" @update:model-value="shape.imageEffects={...shape.imageEffects,[effect.id]:$event}"/>
      <button class="btn" @click="shape.imageSrc=''">Retirer l’image de fond</button>
      <p class="field-help">L’image suit le contour de la forme ; sa bordure reste indépendante.</p>
    </template>
  </div>
</template>
<style scoped>.shape-image-preview{width:100%;max-height:130px;object-fit:contain;border-radius:6px;margin:8px 0}</style>
