<script setup>
import {ref,computed} from 'vue';
import {renderNotes,MAX_NOTES} from '../presentationNotes.js';
const props=defineProps({modelValue:String,label:{type:String,default:'Notes de cette diapo'}});const emit=defineEmits(['update:modelValue']);const preview=ref(false),html=computed(()=>renderNotes(props.modelValue));
</script>
<template><div class="notes-editor"><div class="notes-editor-tabs"><button class="btn" :class="{active:!preview}" :aria-pressed="!preview" @click="preview=false">Écrire</button><button class="btn" :class="{active:preview}" :aria-pressed="preview" @click="preview=true">Aperçu</button></div><label v-if="!preview" class="notes-input-label">{{label}}<textarea :value="modelValue" :maxlength="MAX_NOTES" rows="9" aria-label="Notes de présentation en Markdown" placeholder="## À expliquer&#10;- Premier point&#10;- **Idée importante**" @input="emit('update:modelValue',$event.target.value)"/></label><div v-else class="markdown-notes notes-preview" v-html="html||'<p>Aucune note pour cette diapo.</p>'"></div><p class="field-help">Markdown : titres, listes, **gras**, *italique*, `code`. Notes visibles en présentation, hors vidéo et PNG.</p></div></template>
