<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Film } from "lucide-vue-next";
import CreationPreview from "./CreationPreview.vue";
const props = defineProps({
    repository: Object,
    projectId: String,
    creation: Object,
  }),
  emit = defineEmits(["preview"]);
const root = ref(null),
  image = ref(null),
  row = ref(null),
  loading = ref(false),
  failed = ref(false);
let observer,
  alive = true,
  visible = false;
async function load() {
  if (loading.value || !visible) return;
  loading.value = true;
  failed.value = false;
  try {
    const cached = props.creation?.preview;
    if (cached) image.value = cached;
    else if (props.creation) {
      const data = await props.repository.creation(props.creation.id);
      if (alive && visible) row.value = data;
    } else {
      const data = await props.repository.cover(props.projectId);
      if (alive && visible) image.value = data;
    }
  } catch {
    failed.value = true;
  } finally {
    if (alive) loading.value = false;
  }
}
function drawn(value) {
  image.value = value;
  row.value = null;
  emit("preview", value);
}
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) load();
      else {
        image.value = null;
        row.value = null;
      }
    },
    { rootMargin: "100px" },
  );
  observer.observe(root.value);
});
onBeforeUnmount(() => {
  alive = false;
  observer?.disconnect();
});
</script>
<template>
  <div ref="root" class="library-preview">
    <img
      v-if="image"
      :src="image"
      alt="Aperçu de la création"
    /><CreationPreview
      v-else-if="row"
      :creation="row"
      @preview="drawn"
    /><button v-else-if="failed" class="btn" @click.stop="load">
      Réessayer l’aperçu</button
    ><Film v-else :size="38" />
  </div>
</template>
