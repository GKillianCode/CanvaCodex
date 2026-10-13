<script setup>
import { inject,reactive } from 'vue';
const props=defineProps({id:String,title:String});
const state=inject('inspectorDrawers',reactive({}));
function toggle(event){if(event.target.open){for(const key of Object.keys(state))state[key]=key===props.id;state[props.id]=true;}else if(state[props.id])state[props.id]=false;}
</script>
<template><details class="property-details" :data-drawer="id" :open="state[id]===true" @toggle="toggle"><summary>{{title}}</summary><slot/></details></template>
