<script setup>
import {ref,computed,nextTick,onMounted,onUnmounted} from 'vue';
import {toSuperscript,powerText,replaceSelection} from '../powers.js';
import {normalizeRuns,applyInlineStyle,remapRuns,textSegments} from '../richText.js';
import {textColor,textMarkCss} from '../textStyles.js';
import {themeColors} from '../themes.js';
import {X,Check,Superscript,Bold,Italic,Underline,Strikethrough,Highlighter,RotateCcw} from 'lucide-vue-next';
const props=defineProps({value:String,label:String,runs:Array,theme:Object,textStyle:Object,font:String});
const emit=defineEmits(['confirm','close']);
const draft=ref(props.value),runs=ref(normalizeRuns(props.runs,props.value)),labelDraft=ref(props.label||''),input=ref(null),dialog=ref(null);
const powerOpen=ref(false),base=ref('2'),exponent=ref('23'),powerError=ref(''),selection=ref({start:0,end:0});let previous;
const hasSelection=computed(()=>selection.value.end>selection.value.start),chosen=computed(()=>draft.value.slice(selection.value.start,selection.value.end));
const baseStyle=computed(()=>props.textStyle||{weight:400}),colors=computed(()=>props.theme?themeColors(props.theme):[]);
const selectedParts=computed(()=>textSegments(draft.value,runs.value,selection.value.start,selection.value.end));
const common=key=>{const values=selectedParts.value.map(p=>({...baseStyle.value,...p.style})[key]);return values.length&&values.every(v=>v===values[0])?values[0]:undefined;};
const tools=[{key:'weight',label:'Gras',icon:Bold},{key:'italic',label:'Italique',icon:Italic},{key:'underline',label:'Souligné',icon:Underline},{key:'strike',label:'Barré',icon:Strikethrough},{key:'highlight',label:'Surligné',icon:Highlighter}];
const active=key=>key==='weight'?common(key)>=600:common(key)===true;
function rememberSelection(){if(input.value)selection.value={start:input.value.selectionStart,end:input.value.selectionEnd};}
function edit(value){runs.value=remapRuns(draft.value,value,runs.value);draft.value=value;}
function restoreSelection(){nextTick(()=>{input.value?.focus();input.value?.setSelectionRange(selection.value.start,selection.value.end);});}
function apply(patch,refocus=true){if(!hasSelection.value)return;try{runs.value=applyInlineStyle(draft.value,runs.value,selection.value.start,selection.value.end,patch);powerError.value='';if(refocus)restoreSelection();}catch(error){powerError.value=error.message;}}
function toggle(key){apply({[key]:key==='weight'?(active(key)?400:700):!active(key)});}
function insert(value){const result=replaceSelection(draft.value,selection.value.start,selection.value.end,value);if(!result){powerError.value='Le texte dépasse la limite de 100 000 caractères.';return;}edit(result.text);powerError.value='';powerOpen.value=false;selection.value={start:result.cursor,end:result.cursor};restoreSelection();}
function insertPower(){const value=powerText(base.value,exponent.value);if(!value){powerError.value='Exposant : chiffres, signes + − =, parenthèses, n ou i.';return;}insert(value);}
function superscriptSelection(){const value=toSuperscript(chosen.value);if(value)insert(value);else {powerOpen.value=true;powerError.value='Sélectionne des chiffres, ou insère une puissance ci-dessous.';}}
function confirm(){emit('confirm',{text:draft.value,label:labelDraft.value,runs:runs.value});}
const preview=computed(()=>textSegments(draft.value,runs.value));
function previewStyle(part){const style={...baseStyle.value,...part.style};return {...textMarkCss(style),fontFamily:props.font,fontWeight:style.weight,fontStyle:style.italic?'italic':'normal',color:textColor(style,props.theme||{ink:'#edf2f5'})};}
function key(e){
 if((e.ctrlKey||e.metaKey)&&e.target===input.value&&['b','i','u'].includes(e.key.toLowerCase())){e.preventDefault();rememberSelection();toggle({b:'weight',i:'italic',u:'underline'}[e.key.toLowerCase()]);}
 else if(e.key==='Escape'){e.preventDefault();emit('close');}
 else if(e.key==='Enter'&&e.target.closest('.power-form')&&!e.ctrlKey&&!e.metaKey){e.preventDefault();insertPower();}
 else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();confirm();}
 else if(e.key==='Tab'){const list=[...dialog.value.querySelectorAll('button,input,textarea,select')].filter(el=>!el.disabled),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
}
onMounted(()=>{previous=document.activeElement;nextTick(()=>input.value?.focus());});onUnmounted(()=>previous?.focus?.());
</script>
<template>
 <div class="modal-backdrop text-dialog-backdrop" @keydown.stop="key" @pointerdown.stop>
  <form ref="dialog" class="text-dialog" role="dialog" aria-modal="true" aria-labelledby="text-dialog-title" @submit.prevent="confirm">
   <div class="text-dialog-heading"><div><h2 id="text-dialog-title">Modifier le texte</h2><p>Sélectionne un mot ou un passage pour lui appliquer un style.</p></div><button type="button" class="icon-btn" aria-label="Fermer sans appliquer" @click="emit('close')"><X :size="20"/></button></div>
   <label v-if="label!==undefined">Surtitre<input v-model="labelDraft" maxlength="100" aria-label="Surtitre du bloc"></label>
   <div class="inline-text-tools" role="group" aria-label="Style de la sélection">
    <button v-for="tool in tools" :key="tool.key" type="button" class="icon-btn" :disabled="!hasSelection" :aria-label="tool.label+' de la sélection'" :title="tool.label" :aria-pressed="active(tool.key)" @mousedown.prevent @click="toggle(tool.key)"><component :is="tool.icon" :size="17"/></button>
    <select aria-label="Couleur du thème de la sélection" :disabled="!hasSelection" :value="common('colorRole')||''" @change="apply($event.target.value?{colorRole:$event.target.value,color:null}:{colorRole:undefined,color:undefined})"><option value="">Couleur du bloc</option><option v-for="c in colors" :key="c.id" :value="c.id">{{c.name}}</option></select>
    <label class="inline-color-label" title="Couleur personnalisée">Couleur<input type="color" aria-label="Couleur personnalisée de la sélection" :disabled="!hasSelection" :value="common('color')||'#a5f3cf'" @input="apply({color:$event.target.value,colorRole:null},false)" @change="restoreSelection"/></label>
    <button type="button" class="icon-btn" :disabled="!hasSelection" aria-label="Retirer le style de la sélection" title="Revenir au style du bloc" @mousedown.prevent @click="apply(null)"><RotateCcw :size="17"/></button>
   </div>
   <p class="inline-selection-status" role="status">{{hasSelection?'Sélection : « '+chosen.slice(0,80)+(chosen.length>80?'…':'')+' »':'Sélectionne du texte pour activer les outils.'}}</p>
   <label>Texte<textarea ref="input" :value="draft" aria-label="Texte à appliquer" @select="rememberSelection" @keyup="rememberSelection" @click="rememberSelection" @input="edit($event.target.value);rememberSelection()" rows="7" maxlength="100000" spellcheck="true"/></label>
   <details class="inline-text-preview" open><summary>Aperçu des styles</summary><div><span v-for="(part,i) in preview" :key="i" :style="previewStyle(part)">{{part.text}}</span></div></details>
   <div class="power-tools"><button type="button" class="btn" @click="powerOpen=!powerOpen;powerError=''" :aria-expanded="powerOpen"><Superscript :size="16"/>Insérer une puissance</button><button type="button" class="btn" @click="superscriptSelection">Sélection en exposant</button><span>2²³</span></div>
   <div v-if="powerOpen" class="power-form"><label>Base<input v-model="base" aria-label="Base de la puissance" maxlength="100"></label><label>Exposant<input v-model="exponent" aria-label="Exposant de la puissance" maxlength="100"></label><button type="button" class="btn primary" @click="insertPower">Insérer</button></div>
   <p v-if="powerError" class="power-error" role="status">{{powerError}}</p>
   <div class="text-dialog-actions"><small>Ctrl/⌘ B, I, U · Ctrl/⌘ + Entrée pour valider</small><button class="btn" type="button" @click="emit('close')">Annuler</button><button class="btn primary" type="submit"><Check :size="16"/>Appliquer</button></div>
  </form>
 </div>
</template>
