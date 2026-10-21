<script setup>
import { ref } from "vue";
import {
  ChevronRight,
  FileText,
  Type,
  Palette,
  ListOrdered,
  Music2,
  MessageSquare,
  Image,
  Code2,
  BookOpen,
  Link2,
  Hash,
  AlignLeft,
} from "lucide-vue-next";
const props = defineProps({
  title: String,
  sectionKey: String,
  count: [Number, String],
  initialOpen: { type: Boolean, default: false },
});
const icons = {
  title: Type,
  model: Palette,
  intro: FileText,
  programme: ListOrdered,
  description: AlignLeft,
  chapters: ListOrdered,
  technical: Code2,
  learning: BookOpen,
  resources: Link2,
  tags: Hash,
  music: Music2,
  comment: MessageSquare,
  thumbnail: Image,
};
const storageKey = "frame-publication-drawer:" + props.sectionKey;
function read() {
  try {
    const value = localStorage.getItem(storageKey);
    return value === null ? props.initialOpen : value === "true";
  } catch {
    return props.initialOpen;
  }
}
const opened = ref(read());
function toggle() {
  opened.value = !opened.value;
  try {
    localStorage.setItem(storageKey, String(opened.value));
  } catch {}
}
</script>
<template>
  <details class="publication-detail-card publication-drawer" :open="opened">
    <summary @click.prevent="toggle">
      <component
        :is="icons[sectionKey] || FileText"
        :size="16"
        class="publication-drawer-icon"
      /><span class="publication-drawer-title">{{ title }}</span
      ><span
        v-if="count !== undefined && count !== ''"
        class="publication-drawer-count"
        >{{ count }}</span
      ><ChevronRight :size="16" class="publication-drawer-chevron" />
    </summary>
    <div class="publication-drawer-body"><slot /></div>
  </details>
</template>
