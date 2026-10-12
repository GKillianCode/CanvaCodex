<script setup>
import {ref,onMounted,watch,onBeforeUnmount} from 'vue';
import {documentFromStorage} from '../videoProjects.js';
import {renderSlide,prepareImages} from '../render.js';
import {prepareFonts} from '../fontAssets.js';
import {projectTheme} from '../projectTheme.js';
import {normalizeThemes} from '../themes.js';
const props=defineProps({creation:Object}),emit=defineEmits(['preview']),canvas=ref(null);let generation=0;
async function draw(){const current=++generation;try{const doc=documentFromStorage(props.creation.storage,props.creation.app),slide=props.creation.app==='banners'?doc.banner.slide:doc.slides[0];await Promise.all([prepareImages([slide]),prepareFonts([slide])]);if(current!==generation||!canvas.value)return;const ctx=canvas.value.getContext('2d');ctx.clearRect(0,0,384,216);ctx.save();ctx.scale(.2,.2);const palette=normalizeThemes(doc.themes),theme=projectTheme(palette.find(t=>t.id===doc.themeId)||palette[0],doc.projectColors);renderSlide(ctx,slide,theme,{transparent:props.creation.app==='banners',gradient:doc.frame?.gradient});ctx.restore();emit('preview',canvas.value.toDataURL('image/jpeg',.7));}catch{}}
onMounted(draw);watch(()=>props.creation,draw);onBeforeUnmount(()=>generation++);
</script>
<template><canvas ref="canvas" width="384" height="216" role="img" :aria-label="'Aperçu de '+creation.name" class="creation-preview"/></template>
