<script setup>
import { ref,watch,onMounted,onUnmounted } from 'vue';
import { makeSlide } from '../model.js';
import { enclosingBounds } from '../selection.js';
import { renderSlide,blockBounds,prepareImages } from '../render.js';
import { insertComponent } from '../componentsLibrary.js';
const props=defineProps({component:Object,theme:Object});const canvas=ref(null);let generation=0;
async function draw(){const token=++generation;if(!canvas.value)return;const s=makeSlide('title');s.elements={};s.blockKeys=[];const keys=insertComponent(s,props.component);s.blockKeys=keys;s.designVersion=1;await prepareImages([s]);if(token!==generation||!canvas.value)return;const ctx=canvas.value.getContext('2d'),bounds=enclosingBounds(keys.map(k=>blockBounds(ctx,s,k)));if(!bounds)return;const scale=Math.min(280/(bounds.w+80),140/(bounds.h+80));ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,320,180);ctx.fillStyle=props.theme.bg;ctx.fillRect(0,0,320,180);ctx.setTransform(scale,0,0,scale,160-scale*(bounds.x+bounds.w/2),90-scale*(bounds.y+bounds.h/2));renderSlide(ctx,s,props.theme,{gradient:false});}
onMounted(draw);watch(()=>[props.component,props.theme],draw,{deep:true});onUnmounted(()=>generation++);
</script>
<template><canvas ref="canvas" width="320" height="180" aria-hidden="true" class="component-preview"/></template>
