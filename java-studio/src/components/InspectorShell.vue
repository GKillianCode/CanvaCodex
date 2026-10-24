<script setup>
import { ref, computed } from "vue";
const props = defineProps({
  tabs: Array,
  active: String,
  count: { type: Number, default: 0 },
  bodyClass: String,
  bodyVisible: { type: Boolean, default: true },
});
const emit = defineEmits(["select", "resize"]);
const body = ref(null);
const contextId = computed(() =>
  props.count
    ? props.tabs.find((t) => ["element", "object"].includes(t[0]))?.[0]
    : props.tabs.find((t) => ["slide", "document"].includes(t[0]))?.[0],
);
const shownTabs = computed(() =>
  props.tabs.filter(
    (t) =>
      !["element", "object", "slide", "document"].includes(t[0]) ||
      t[0] === contextId.value,
  ),
);
defineExpose({ body });
</script>
<template>
  <aside class="inspector properties-panel slim-inspector">
    <button
      class="panel-resizer"
      @pointerdown="emit('resize', $event)"
      aria-label="Redimensionner les propriétés"
    />
    <div class="properties-heading">
      <strong>Propriétés</strong
      ><small>{{
        count ? count + " objet" + (count > 1 ? "s" : "") : ""
      }}</small>
    </div>
    <nav
      v-if="!count"
      class="inspector-navigation"
      :style="{
        gridTemplateColumns: 'repeat(' + shownTabs.length + ',minmax(0,1fr))',
      }"
      aria-label="Rubriques des propriétés"
    >
      <button
        v-for="[id, label, icon] in shownTabs"
        :key="id"
        :class="{ active: active === id }"
        :aria-label="label + ' · propriétés'"
        :aria-pressed="active === id"
        @click="emit('select', id)"
      >
        <component :is="icon" :size="16" /><span>{{ label }}</span>
      </button>
    </nav>
    <slot name="context" />
    <div
      v-show="bodyVisible"
      ref="body"
      class="inspector-body"
      :class="bodyClass"
    >
      <slot />
    </div>
  </aside>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.properties-heading,
.inspector-navigation {
  flex-shrink: 0;
}
.inspector-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
