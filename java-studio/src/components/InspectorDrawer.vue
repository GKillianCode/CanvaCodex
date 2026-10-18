<script setup>
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
      <component v-if="icon" :is="icon" :size="14" />{{ title }}
    </summary>
    <slot />
  </details>
</template>
