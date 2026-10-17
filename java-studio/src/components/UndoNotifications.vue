<script setup>
import {X} from 'lucide-vue-next';
import {undoNotifications as notices} from '../undoNotifications.js';
</script>
<template><Teleport to="body"><TransitionGroup name="undo-notice" tag="div" class="undo-notifications" aria-label="Notifications de suppression" aria-live="polite" aria-relevant="additions"><section v-for="notice in notices.entries.value" :key="notice.id" class="undo-notification"><span>{{notice.message}}<small v-if="notice.error" role="alert">{{notice.error}}</small></span><button class="text-action" :disabled="notice.busy||!notice.canUndo()" @click="notices.undo(notice.id)">{{notice.busy?'Restauration…':'Annuler'}}</button><button class="icon-btn" :aria-label="'Fermer : '+notice.message" @click="notices.dismiss(notice.id)"><X :size="14"/></button></section></TransitionGroup></Teleport></template>
