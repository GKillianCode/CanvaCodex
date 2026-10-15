<script setup>
import {
  NotebookPen,
  PanelsTopLeft,
  Send,
  ArrowUpRight,
} from "lucide-vue-next";
defineProps({ project: Object });
const emit = defineEmits(["workshop", "assets"]);
</script>
<template>
  <section class="video-workflow-overview" aria-label="Parcours de production">
    <header>
      <span class="eyebrow">TON ESPACE DE PRODUCTION</span>
      <p>Un seul projet, de la préparation à la mise en ligne.</p>
    </header>
    <div class="production-stages">
      <button @click="emit('workshop', 'conductor')">
        <span class="production-stage-number">01</span
        ><NotebookPen :size="25" /><strong>Préparer</strong>
        <p>
          Organise le script, les supports et tes repères dans le Conducteur.
        </p>
        <span class="production-stage-action"
          >Ouvrir le Conducteur<ArrowUpRight :size="15"
        /></span></button
      ><button @click="emit('assets')">
        <span class="production-stage-number">02</span
        ><PanelsTopLeft :size="25" /><strong>Créer les supports</strong>
        <p>Diaporamas, incrustations et miniatures réunis dans cette vidéo.</p>
        <span class="production-stage-action"
          >{{ project.creations?.length || 0 }} création{{
            project.creations?.length > 1 ? "s" : ""
          }}
          · Voir les supports<ArrowUpRight :size="15"
        /></span></button
      ><button @click="emit('workshop', 'publication')">
        <span class="production-stage-number">03</span
        ><Send :size="25" /><strong>Publier</strong>
        <p>Retrouve la miniature et prépare les textes à copier sur YouTube.</p>
        <span class="production-stage-action"
          >Ouvrir Publication<ArrowUpRight :size="15"
        /></span>
      </button>
    </div>
  </section>
</template>
