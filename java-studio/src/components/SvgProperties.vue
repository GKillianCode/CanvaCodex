<script setup>
import {computed} from 'vue';
import PaletteColor from './PaletteColor.vue';
import {svgColors} from '../svgColors.js';
const props=defineProps({image:Object,theme:Object});
function originalHex(color){if(color==='currentcolor')return '#000000';const ctx=document.createElement('canvas').getContext('2d');ctx.fillStyle='#000000';ctx.fillStyle=color;const v=ctx.fillStyle;if(/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(v))return v.slice(0,7);const channels=v.match(/[\d.]+/g);return channels?.length>=3?'#'+channels.slice(0,3).map(v=>Math.round(Number(v)).toString(16).padStart(2,'0')).join(''):'#000000';}
const rows=computed(()=>svgColors(props.image.src).map((key,n)=>({key,label:'Couleur '+(n+1)+' · '+key,element:new Proxy({}, {get(_,field){return props.image.svgColors?.[key]?.[field]??(field==='color'?originalHex(key):null);},set(_,field,value){props.image.svgColors={...props.image.svgColors,[key]:{color:originalHex(key),colorRole:null,...props.image.svgColors?.[key],[field]:value}};return true;}})})));
</script>
<template><div><p class="field-help">Une couleur remplace toutes ses occurrences dans les remplissages, contours ou dégradés. Le fichier source est conservé.</p><PaletteColor v-for="row in rows" :key="row.key" :element="row.element" field="color" :label="row.label" :theme="theme"/><p v-if="!rows.length" class="field-help">Ce SVG ne contient pas de couleur modifiable explicite.</p><button class="btn full" :disabled="!Object.keys(image.svgColors||{}).length" @click="image.svgColors={}">Restaurer les couleurs du SVG</button><p class="field-help">La transparence globale se règle dans le tiroir Opacité.</p></div></template>
