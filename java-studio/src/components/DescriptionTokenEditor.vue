<script setup>
import { ref, nextTick } from "vue";
import { descriptionTokens } from "../publicationTemplates.js";
const props = defineProps({
  modelValue: String,
  library: Object,
  slots: Array,
  label: { type: String, default: "Contenu du modèle" },
});
const emit = defineEmits(["update:modelValue"]);
const field = ref(null),
  error = ref("");
async function insert(tag) {
  const el = field.value,
    start = el?.selectionStart ?? props.modelValue.length,
    end = el?.selectionEnd ?? start,
    value = props.modelValue || "",
    token = "{{" + tag + "}}";
  if (value.length - (end - start) + token.length > 20000) {
    error.value = "Le modèle dépasse 20 000 caractères.";
    return;
  }
  emit("update:modelValue", value.slice(0, start) + token + value.slice(end));
  await nextTick();
  el.focus();
  el.setSelectionRange(start + token.length, start + token.length);
}
</script>
<template>
  <div class="description-token-editor">
    <label
      >{{ label
      }}<textarea
        ref="field"
        :value="modelValue"
        :aria-label="label"
        maxlength="20000"
        rows="13"
        spellcheck="false"
        @input="emit('update:modelValue', $event.target.value)"
      />
    </label>
    <p class="field-help">
      Place le curseur puis insère une balise. Les rubriques vides disparaissent
      ; leurs titres se règlent dans « Rubriques et chaîne ».
    </p>
    <div class="description-token-list" aria-label="Insérer une balise">
      <button
        v-for="[tag, name] in descriptionTokens"
        :key="tag"
        type="button"
        class="btn"
        :title="'Insérer {{' + tag + '}}'"
        @click="insert(tag)"
      >
        {{ name }}</button
      ><button
        v-for="block in library?.blocks || []"
        :key="'block' + block.id"
        class="btn"
        type="button"
        :title="'Insérer {{bloc:' + block.id + '}}'"
        @click="insert('bloc:' + block.id)"
      >
        Bloc · {{ block.name }}</button
      ><button
        v-for="slot in slots || []"
        :key="'slot' + slot.id"
        class="btn"
        type="button"
        :title="'Insérer {{partie:' + slot.id + '}}'"
        @click="insert('partie:' + slot.id)"
      >
        Partie · {{ slot.label }}
      </button>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
