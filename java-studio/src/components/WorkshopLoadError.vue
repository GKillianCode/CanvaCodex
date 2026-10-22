<script setup>
import WorkspaceHeader from "./WorkspaceHeader.vue";
defineProps({ error: Object });
const reload = () => window.location.reload(),
  home = () => {
    window.location.hash = "#/";
  };
</script>
<template>
  <div class="workshop-load-error">
    <WorkspaceHeader title="Atelier" @back="home" />
    <main>
      <h1>L’atelier n’a pas pu être chargé.</h1>
      <p>
        Recharge la page pour retrouver ton document. Les données enregistrées
        sont conservées.
      </p>
      <div>
        <button class="btn primary" @click="reload">Réessayer</button
        ><button class="btn" @click="home">Accueil</button>
      </div>
    </main>
  </div>
</template>
<style>
.workshop-load-error {
  min-height: 100vh;
  background: #151d21;
  color: #e4e8ec;
}
.workshop-load-error main {
  max-width: 600px;
  margin: 100px auto;
  padding: 30px;
}
.workshop-load-error h1 {
  font-size: 25px;
}
.workshop-load-error p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
  margin: 20px 0 30px;
}
.workshop-load-error main > div {
  display: flex;
  gap: 10px;
}
:root[data-appearance="light"] .workshop-load-error{background:#f6f8f6;color:#25382e}
</style>
