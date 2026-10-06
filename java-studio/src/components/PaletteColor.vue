<script setup>
import { themeColors } from '../themes.js';
import { boundColor } from '../colors.js';
const props=defineProps({element:Object,field:String,label:String,theme:Object});
function custom(value){if(/^#[\da-f]{6}$/i.test(value)){props.element[props.field]=value;props.element[props.field+'Role']=null;}}
</script>
<template><div class="palette-color"><label>{{label}}<select :aria-label="label+' · palette du thème'" :value="element[field+'Role']||''" @change="element[field+'Role']=$event.target.value||null"><option value="">Couleur personnalisée</option><option v-for="c in themeColors(theme)" :key="c.id" :value="c.id">{{c.name}}</option></select></label><div class="shape-color"><input type="color" :aria-label="label+' personnalisée'" :value="boundColor(element,field,theme)" @input="custom($event.target.value)"><input :aria-label="label+' hexadécimale'" maxlength="7" :value="boundColor(element,field,theme)" @change="custom($event.target.value)"></div></div></template>
