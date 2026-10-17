<script setup>
import { ArrowUpRight } from "lucide-vue-next";
const emit = defineEmits(["workshop"]);
</script>
<template>
  <section class="video-workflow-overview" aria-label="Ateliers de la vidéo">
    <div class="video-production-cards">
      <button @click="emit('workshop', 'conductor')">
        <div class="production-card-art">
          <img src="/illustrations/conductor-script.svg" alt="" />
        </div>
        <div class="production-card-description">
          <strong>Préparer</strong>
          <p>
            Construis le fil de ta vidéo et garde ton conducteur sous les yeux.
          </p>
          <span>Ouvrir le Conducteur<ArrowUpRight :size="16" /></span>
        </div>
      </button>
      <button @click="emit('workshop', 'publication')">
        <div class="production-card-art">
          <img src="/illustrations/publication.svg" alt="" />
        </div>
        <div class="production-card-description">
          <strong>Publier</strong>
          <p>
            Prépare ton titre, ta description et les informations de
            publication.
          </p>
          <span>Ouvrir Publication<ArrowUpRight :size="16" /></span>
        </div>
      </button>
    </div>
  </section>
</template>
