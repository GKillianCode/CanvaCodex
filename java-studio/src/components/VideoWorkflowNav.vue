<script setup>
defineProps({active:String});
const emit=defineEmits(['navigate']);
</script>
<template>
 <label class="workflow-view-switch"><span>Vue</span><select aria-label="Changer de vue" :value="active" @change="emit('navigate',$event.target.value)"><option value="conductor">Conducteur</option><option value="publication">Publication</option></select></label>
</template>
