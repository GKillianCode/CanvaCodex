<script setup>
import { ref, onMounted } from "vue";
import VideoCanvas from "./VideoCanvas.vue";
const props = defineProps({ repository: Object });
const emit = defineEmits(["home", "open"]);
const loaded = ref(false);
const videos = ref([]),
  canvas = ref(null),
  error = ref("");
async function load() {
  try {
    error.value = "";
    videos.value = await props.repository.list();
    loaded.value = true;
  } catch (e) {
    error.value = e.message;
  }
}
onMounted(load);
defineExpose({ flush: async () => canvas.value?.flush() });
</script>
<template>
  <main class="canvas-app">
    <p v-if="error" class="video-alert" role="alert">
      {{ error }}<button class="btn" @click="load">Réessayer</button>
    </p>
    <p v-else-if="!loaded" class="video-loading">Ouverture du parcours…</p>
    <VideoCanvas
      v-else
      ref="canvas"
      :repository="repository"
      :videos="videos"
      @close="emit('home')"
      @open="emit('open', $event)"
    />
  </main>
</template>
