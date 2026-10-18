<script setup>
import { reactive, ref, onMounted, onUnmounted } from "vue";
import { Trash2, X } from "lucide-vue-next";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  root = ref(null);
let previous;
function key(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopImmediatePropagation();
    s.animation.pendingDelete = null;
  }
  if (e.key === "Tab") {
    const buttons = [...root.value.querySelectorAll("button")],
      i = buttons.indexOf(document.activeElement);
    e.preventDefault();
    buttons[
      (i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length
    ].focus();
  }
}
onMounted(() => {
  previous = document.activeElement;
  root.value.querySelector("button").focus();
  window.addEventListener("keydown", key, true);
});
onUnmounted(() => {
  window.removeEventListener("keydown", key, true);
  previous?.focus?.({ preventScroll: true });
});
</script>
<template>
  <div class="animation-confirm-backdrop" @pointerdown.stop>
    <section
      ref="root"
      class="animation-confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmer la suppression"
    >
      <Trash2 :size="24" />
      <h2>Confirmer la suppression</h2>
      <p>Supprimer {{ s.animation.pendingDelete.label }} ?</p>
      <div>
        <button class="btn" @click="s.animation.pendingDelete = null">
          Annuler</button
        ><button class="btn danger" @click="s.animation.confirmDelete()">
          Supprimer
        </button>
      </div>
    </section>
  </div>
</template>
