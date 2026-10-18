<script setup>
import { reactive } from "vue";
import { Sparkles, ArrowDown } from "lucide-vue-next";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio);
</script>
<template>
  <div class="engine-guides">
    <span
      v-for="engine in s.animation.config.engines.filter(
        (e) => s.current.positions[e.key],
      )"
      :key="engine.id"
      class="engine-guide-icon"
      @pointerdown.stop.prevent="
        s.animation.selectEngine(engine.id);
        s.down($event);
      "
      @pointermove="s.move"
      @pointerup="s.up"
      @pointercancel="s.up"
      :title="
        s.current.elements[engine.key]?.name ||
        (engine.kind === 'particles' ? 'Émetteur à particules' : 'Gravité')
      "
      :style="{
        left:
          ((s.current.positions[engine.key].x +
            s.current.positions[engine.key].w / 2 +
            320) /
            2560) *
            100 +
          '%',
        top:
          ((s.current.positions[engine.key].y +
            s.current.positions[engine.key].h / 2 +
            180) /
            1440) *
            100 +
          '%',
      }"
      ><component
        :is="engine.kind === 'particles' ? Sparkles : ArrowDown"
        :size="18"
    /></span>
  </div>
</template>
