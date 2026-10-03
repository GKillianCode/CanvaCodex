<script setup>
import { ref, watch, onMounted } from 'vue';
import { makeSlide } from '../model.js';
import { renderSlide } from '../render.js';
const props=defineProps({theme:Object});const canvas=ref(null);
function draw(){if(!canvas.value)return;const g=canvas.value.getContext('2d');g.setTransform(.25,0,0,.25,0,0);const s=makeSlide('title');s.label='JAVA / SOUS LE CAPOT';s.title='Comprendre.\nConstruire.';s.body='Une idée claire. Un accent qui donne le ton.';renderSlide(g,s,props.theme);}
onMounted(draw);watch(()=>props.theme,draw,{deep:true});
</script>
<template><canvas ref="canvas" width="480" height="270" style="width:100%;display:block" aria-hidden="true"/></template>
