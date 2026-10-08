<script setup>
import CornerProperties from './CornerProperties.vue';
import PaletteColor from './PaletteColor.vue';
import { shapes } from '../shapes.js';
defineProps({shape:Object,scale:Number,theme:Object,mode:{type:String,default:'style'}});
</script>
<template><div class="shape-properties">
 <template v-if="mode==='colors'"><PaletteColor v-if="!['line','curve'].includes(shape.shape)" :element="shape" field="fill" label="Remplissage" :theme="theme"/><PaletteColor :element="shape" field="stroke" label="Contour" :theme="theme"/></template>
 <template v-else><label>Forme<select v-model="shape.shape" aria-label="Type de forme"><option v-for="item in shapes" :key="item.id" :value="item.id">{{item.name}}</option></select></label>
 <label v-if="['line','curve'].includes(shape.shape)" class="checkbox-label"><input type="checkbox" :checked="shape.roundedEnds!==false" @change="shape.roundedEnds=$event.target.checked">Extrémités arrondies</label>
 <label v-if="shape.shape==='line'">Orientation<select v-model="shape.direction"><option value="horizontal">Horizontale</option><option value="vertical">Verticale</option><option value="down">Diagonale ↘</option><option value="up">Diagonale ↗</option></select></label>
 <label v-if="!['line','curve'].includes(shape.shape)" class="checkbox-label"><input type="checkbox" v-model="shape.filled">Remplissage</label><label v-if="!['line','curve'].includes(shape.shape)" class="checkbox-label"><input type="checkbox" v-model="shape.outlined">Contour</label>
 <template v-if="shape.outlined||['line','curve'].includes(shape.shape)"><label>Épaisseur · px<input type="number" aria-label="Épaisseur du contour" :value="Math.round(shape.strokeWidth*scale*100)/100" :min="scale" :max="60*scale" step="1" @change="shape.strokeWidth=Math.max(1,Math.min(60,Number($event.target.value)/scale||1))"></label><label class="checkbox-label"><input type="checkbox" v-model="shape.dashed">Pointillés</label></template>
 <label v-if="['rounded','rect','square'].includes(shape.shape)&&!shape.individualCorners">Arrondi · {{shape.radius}} %<input type="range" min="0" max="50" v-model.number="shape.radius" aria-label="Arrondi des coins"></label>
 <CornerProperties :value="shape" @change="(key,value)=>shape[key]=value" @corner="(key,value)=>{shape.cornerRadii||={};shape.cornerRadii[key]=value;}"/>
 <template v-if="shape.shape==='star'"><label>Branches<input type="number" min="3" max="12" :value="shape.points" @change="shape.points=Math.max(3,Math.min(12,Math.round(Number($event.target.value)||5)))"></label><label>Profondeur des branches<input type="range" min="0.15" max="0.8" step="0.01" v-model.number="shape.innerRatio"></label></template></template>
</div></template>
