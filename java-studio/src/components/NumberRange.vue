<script setup>
import {boundedNumber} from '../numericControls.js';
const props=defineProps({modelValue:Number,min:{type:Number,default:0},max:{type:Number,default:100},step:{type:Number,default:1},label:String,unit:{type:String,default:''}});const emit=defineEmits(['update:modelValue']);
function input(event,commit=false){const raw=event.target.value,next=boundedNumber(raw,props.min,props.max);if(next===null)return;if(event.target.type==='number'&&!commit&&(Number(raw)<props.min||Number(raw)>props.max))return;emit('update:modelValue',next);if(commit)event.target.value=String(next);}
</script>
<template><div class="number-range"><label class="number-range-heading"><span>{{label}}</span><span class="number-unit"><input type="number" :aria-label="label+' · valeur'" :min="min" :max="max" :step="step" :value="modelValue??''" placeholder="Mixte" @input="input" @change="input($event,true)"><span>{{unit}}</span></span></label><input type="range" :aria-label="label" :min="min" :max="max" :step="step" :value="modelValue??max" @input="input"></div></template>
