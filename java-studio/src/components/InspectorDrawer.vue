<script setup>
import { inject,reactive } from 'vue';
defineProps({id:String,title:String});
const state=inject('inspectorDrawers',reactive({}));
</script>
<template><details class="property-details" :data-drawer="id" :open="state[id]===true" @toggle="state[id]=$event.target.open"><summary>{{title}}</summary><slot/></details></template>
