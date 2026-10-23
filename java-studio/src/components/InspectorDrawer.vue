<script setup>
import { ChevronRight } from "lucide-vue-next";
import { inject, reactive } from "vue";
const props = defineProps({
  id: String,
  title: String,
  icon: [Object, Function],
  group: { type: String, default: "" },
});
const state = inject("inspectorDrawers", reactive({}));
function toggle(event) {
  if (event.target.open) {
    for (const key of Object.keys(state)) {
      if (!props.group || key.startsWith(props.group + ":"))
        state[key] = key === props.id;
    }
    state[props.id] = true;
  } else if (state[props.id]) state[props.id] = false;
}
</script>
<template>
  <details
    class="property-details"
    :data-drawer="id"
    :open="state[id] === true"
    @toggle="toggle"
  >
    <summary>
      <span class="drawer-title"
        ><component v-if="icon" :is="icon" :size="14" /><span>{{
          title
        }}</span></span
      ><ChevronRight class="drawer-chevron" :size="14" aria-hidden="true" />
    </summary>
    <slot />
  </details>
</template>

<style scoped>
.property-details > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  list-style: none;
  color: inherit;
  cursor: pointer;
  min-height: 42px;
  padding: 12px 0;
  font-size: 12px;
  font-weight: 600;
}
.property-details > summary::after {
  display: none !important;
}
.property-details > summary::-webkit-details-marker {
  display: none;
}
.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.drawer-title > svg {
  flex-shrink: 0;
  color: var(--muted);
}
.drawer-chevron {
  flex-shrink: 0;
  color: var(--muted);
  transition: transform 0.15s;
}
.property-details[open] > summary .drawer-chevron {
  transform: rotate(90deg);
}
</style>
