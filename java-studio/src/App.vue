<script setup>
import {ref} from 'vue';
import {PanelsTopLeft,Clapperboard,Image,ArrowUpRight} from 'lucide-vue-next';
import StudioApp from './StudioApp.vue';
import {applications} from './applicationDocuments.js';
const active=ref(null),icons={slides:PanelsTopLeft,banners:Clapperboard,thumbnails:Image};
</script>
<template><StudioApp v-if="active" :key="active" :application="active" @home="active=null"/><main v-else class="frame-home"><header><span class="brand-name">frame<span class="brand-dot">.</span></span><span class="home-personal">TON STUDIO PERSONNEL</span></header><section class="home-intro"><span class="eyebrow">DE L’IDÉE À LA VIDÉO</span><h1>Un sujet. Trois façons<br>de lui donner vie.</h1><p>Choisis ton atelier et retrouve ta création. Chaque application garde ses fichiers, ses réglages et son espace de travail.</p></section><section class="home-apps" aria-label="Applications"><button v-for="app in applications" :key="app.id" :class="['home-app',app.id]" @click="active=app.id"><div class="home-app-art"><component :is="icons[app.id]" :size="64"/><span>{{app.tag}}</span><div class="home-art-lines"><i/><i/><i/></div></div><div class="home-app-caption"><component :is="icons[app.id]" :size="22"/><h2>{{app.name}}</h2><ArrowUpRight :size="20"/></div><p>{{app.description}}</p><span class="home-open">Ouvrir l’atelier →</span></button></section><footer>Sauvegarde automatique sur cet appareil · Un fichier par application</footer></main></template>
