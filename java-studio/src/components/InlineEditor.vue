<script setup>
import { ref, watch, nextTick } from 'vue';
import { Check, Code2 } from 'lucide-vue-next';
import { highlightedHtml } from '../code.js';
const props = defineProps({ value: String, code: Boolean, label: String, scale: Number, size: Number });
const emit = defineEmits(['update', 'label', 'close', 'format']);
const input = ref(null), root = ref(null), draft = ref(props.value), scroll = ref({ x: 0, y: 0 });
watch(() => props.value, v => { draft.value = v; });
function update() { emit('update', draft.value); }
function insert(value) {
  const el = input.value, start = el.selectionStart, end = el.selectionEnd;
  draft.value = draft.value.slice(0, start) + value + draft.value.slice(end);
  update(); nextTick(() => { el.selectionStart = el.selectionEnd = start + value.length; });
}
function paste(event) { if (!props.code) return; event.preventDefault(); insert(event.clipboardData.getData('text/plain')); emit('format', draft.value); }
function key(event) {
  if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) { event.preventDefault(); event.stopPropagation(); emit('close'); }
  if (event.key === 'Tab') { event.preventDefault(); insert('    '); }
}
function blur(event) { if (event.relatedTarget && root.value?.contains(event.relatedTarget)) return; emit('close'); }
nextTick(() => { input.value?.focus(); });
</script>
<template>
  <div ref="root" class="inline-editor" :class="{ 'inline-code': code }" :style="{ fontSize: `${size * scale}px`, fontWeight: label !== undefined ? 700 : 400, lineHeight: code ? 1.6 : 1.35 }" @focusout="blur" @pointerdown.stop @dblclick.stop>
    <div class="inline-tools">
      <input v-if="!code && label !== undefined" :value="label" @input="emit('label', $event.target.value)" aria-label="Surtitre du bloc" placeholder="Surtitre facultatif">
      <button v-if="code" @click="emit('format', draft)" title="Formater le code Java"><Code2 :size="15"/>Formater</button>
      <button @click="emit('close')" title="Terminer l’édition"><Check :size="16"/>Terminer</button>
    </div>
    <pre v-if="code" aria-hidden="true"><code :style="{ transform: `translate(${-scroll.x}px, ${-scroll.y}px)` }" v-html="highlightedHtml(draft) + '\n'"></code></pre>
    <textarea ref="input" v-model="draft" :aria-label="code ? 'Code Java sur la diapo' : 'Texte sur la diapo'" :spellcheck="!code" @input="update" @paste="paste" @keydown="key" @scroll="scroll={x:$event.target.scrollLeft,y:$event.target.scrollTop}"/>
  </div>
</template>
