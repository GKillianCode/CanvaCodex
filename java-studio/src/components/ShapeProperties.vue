<script setup>
import { shapes } from '../shapes.js';
const props=defineProps({shape:Object,scale:Number});
function color(event,key,commit=false){const value=event.target.value;if(/^#[\da-f]{6}$/i.test(value))props.shape[key]=value;else if(commit)event.target.value=props.shape[key];}
</script>
<template>
 <div class="shape-properties"><label>Forme<select v-model="shape.shape" aria-label="Type de forme"><option v-for="item in shapes" :key="item.id" :value="item.id">{{item.name}}</option></select></label>
 <label v-if="shape.shape==='line'">Orientation<select v-model="shape.direction"><option value="horizontal">Horizontale</option><option value="vertical">Verticale</option><option value="down">Diagonale ↘</option><option value="up">Diagonale ↗</option></select></label>
 <label v-if="!['line','curve'].includes(shape.shape)" class="checkbox-label"><input type="checkbox" v-model="shape.filled">Remplissage</label><div v-if="shape.filled&&!['line','curve'].includes(shape.shape)" class="shape-color"><input type="color" v-model="shape.fill" aria-label="Couleur de remplissage"><input type="text" :value="shape.fill" aria-label="Remplissage hexadécimal" maxlength="7" @input="color($event,'fill')" @change="color($event,'fill',true)"></div>
 <label v-if="!['line','curve'].includes(shape.shape)" class="checkbox-label"><input type="checkbox" v-model="shape.outlined">Contour</label><template v-if="shape.outlined||['line','curve'].includes(shape.shape)"><div class="shape-color"><input type="color" v-model="shape.stroke" aria-label="Couleur du contour"><input type="text" :value="shape.stroke" aria-label="Contour hexadécimal" maxlength="7" @input="color($event,'stroke')" @change="color($event,'stroke',true)"></div><label>Épaisseur · px<input type="number" aria-label="Épaisseur du contour" :value="Math.round(shape.strokeWidth*scale*100)/100" :min="scale" :max="60*scale" step="1" @change="shape.strokeWidth=Math.max(1,Math.min(60,Number($event.target.value)/scale||1))"></label><label class="checkbox-label"><input type="checkbox" v-model="shape.dashed">Pointillés</label></template>
 <label>Opacité · {{shape.opacity}} %<input type="range" min="0" max="100" v-model.number="shape.opacity" aria-label="Opacité de la forme"></label>
 <label v-if="shape.shape==='rounded'">Arrondi · {{shape.radius}} %<input type="range" min="0" max="45" v-model.number="shape.radius" aria-label="Arrondi des coins"></label>
 <template v-if="shape.shape==='star'"><label>Branches<input type="number" min="3" max="12" :value="shape.points" @change="shape.points=Math.max(3,Math.min(12,Math.round(Number($event.target.value)||5)))"></label><label>Profondeur des branches<input type="range" min="0.15" max="0.8" step="0.01" v-model.number="shape.innerRatio"></label></template>
 </div>
</template>
