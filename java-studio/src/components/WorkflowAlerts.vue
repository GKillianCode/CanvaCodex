<script setup>
defineProps({error:String,storageError:String,recovery:Boolean});defineEmits(['retry','reload','export','recover']);
</script>
<template>
 <div v-if="error" class="production-alert" role="alert">{{error}}<div class="production-actions"><button class="btn" @click="$emit('retry')">Réessayer</button><button class="btn" @click="$emit('export')">Exporter mon brouillon</button><button class="btn" @click="$emit('reload')">Recharger la version enregistrée</button></div></div>
 <p v-if="storageError" class="production-alert" role="alert">{{storageError}}</p>
 <div v-if="recovery" class="production-alert" role="status">Un brouillon de cet onglet est disponible.<button class="btn" @click="$emit('recover')">Restaurer mon brouillon</button></div>
</template>
