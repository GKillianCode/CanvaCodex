<script setup>
import { ref, watch } from 'vue';
import { resizeTable,headerPositions,tableStyles,applyTableStyle,isHeaderCell } from '../tables.js';
import { fonts } from '../fonts.js';
import PaletteColor from './PaletteColor.vue';
const props=defineProps({table:Object,theme:Object,scale:Number});const editing=ref(false),draft=ref([]);
function open(){draft.value=props.table.cells.map(row=>row.slice());editing.value=true;}
function commit(){props.table.cells=draft.value.map(row=>row.slice());editing.value=false;}
watch(()=>props.table,()=>{editing.value=false;});
function resize(field,value){if(value==='')return;resizeTable(props.table,field==='rows'?value:props.table.rows,field==='columns'?value:props.table.columns);}
function pixels(field,value,min,max){if(value==='')return;const n=Number(value)/props.scale;if(Number.isFinite(n))props.table[field]=Math.max(min,Math.min(max,n));}
function header(position){props.table.headerPosition=position;props.table.header=position!=='none';props.table.headerCount=Math.min(props.table.headerCount,['left','right'].includes(position)?props.table.columns:position==='top-left'?Math.min(props.table.rows,props.table.columns):props.table.rows);}
function weight(axis,index,value){if(value==='')return;const n=Number(value);if(Number.isFinite(n))props.table[axis][index]=Math.max(.1,Math.min(20,n));}
</script>
<template>
 <details class="property-details" open><summary>Tableau · contenu</summary>
  <div class="position-grid"><label>Lignes<input type="number" min="1" max="20" aria-label="Nombre de lignes" :value="table.rows" @input="resize('rows',$event.target.value)"></label><label>Colonnes<input type="number" min="1" max="10" aria-label="Nombre de colonnes" :value="table.columns" @input="resize('columns',$event.target.value)"></label></div>
  <button class="btn full" @click="open">Modifier les cellules</button><p class="field-help">20 lignes et 10 colonnes maximum. Ctrl Z annule une réduction.</p>
 </details>
 <details class="property-details" open><summary>Style du tableau</summary>
  <div class="table-style-grid"><button v-for="style in tableStyles" :key="style.id" class="btn" @click="applyTableStyle(table,style.id)" :aria-label="'Style de tableau '+style.name">{{style.name}}</button></div>
  <label>Arrondi des coins · px<input type="number" min="0" :max="120*scale" :value="Math.round(table.cornerRadius*scale)" aria-label="Arrondi du tableau" @input="pixels('cornerRadius',$event.target.value,0,120)"></label>
  <label>Opacité · {{Math.round(table.opacity)}} %<input type="range" min="0" max="100" step="1" v-model.number="table.opacity" aria-label="Opacité du tableau"></label>
 </details>
 <details class="property-details" open><summary>En-tête</summary>
  <label>Position de l’en-tête<select :value="table.headerPosition" @change="header($event.target.value)" aria-label="Position de l’en-tête"><option v-for="[id,name] in headerPositions" :key="id" :value="id">{{name}}</option></select></label>
  <template v-if="table.headerPosition!=='none'">
   <label>Nombre de lignes / colonnes d’en-tête<input type="number" min="1" :max="['left','right'].includes(table.headerPosition)?table.columns:table.headerPosition==='top-left'?Math.min(table.rows,table.columns):table.rows" :value="table.headerCount" aria-label="Nombre de rangées d’en-tête" @input="table.headerCount=Math.max(1,Math.min(['left','right'].includes(table.headerPosition)?table.columns:table.headerPosition==='top-left'?Math.min(table.rows,table.columns):table.rows,Math.round(Number($event.target.value)||1)))"></label>
   <p class="field-help">Les cellules du bord choisi deviennent l’en-tête ; leur contenu reste à sa place.</p>
   <label class="checkbox-label"><input type="checkbox" v-model="table.headerFilled">Fond de l’en-tête</label><PaletteColor :element="table" field="headerFill" label="Fond de l’en-tête" :theme="theme"/>
   <PaletteColor :element="table" field="headerText" label="Texte de l’en-tête" :theme="theme"/>
   <label>Taille de l’en-tête · px<input type="number" :min="10*scale" :max="120*scale" :value="Math.round(table.headerFontSize*scale)" aria-label="Taille du texte de l’en-tête" @input="pixels('headerFontSize',$event.target.value,10,120)"></label>
   <label class="checkbox-label"><input type="checkbox" v-model="table.headerBold">En-tête en gras</label>
  </template>
 </details>
 <details class="property-details"><summary>Corps et alternance</summary>
  <label class="checkbox-label"><input type="checkbox" v-model="table.bodyFilled">Fond du corps du tableau</label><PaletteColor :element="table" field="fill" label="Fond du corps" :theme="theme"/><PaletteColor :element="table" field="textColor" label="Texte du corps" :theme="theme"/>
  <label class="checkbox-label"><input type="checkbox" v-model="table.striped">Bandes alternées</label>
  <template v-if="table.striped"><label>Alternance<select v-model="table.stripeAxis" aria-label="Sens des bandes alternées"><option value="rows">Lignes</option><option value="columns">Colonnes</option></select></label><PaletteColor :element="table" field="stripeFill" label="Couleur des bandes" :theme="theme"/><label>Intensité des bandes · {{Math.round(table.stripeOpacity)}} %<input type="range" min="0" max="100" v-model.number="table.stripeOpacity" aria-label="Intensité des bandes"></label></template>
 </details>
 <details class="property-details"><summary>Bordures et traits</summary>
  <label>Bordures visibles<select v-model="table.borderMode" aria-label="Bordures du tableau"><option value="all">Toutes</option><option value="horizontal">Horizontales + contour</option><option value="vertical">Verticales + contour</option><option value="outer">Contour uniquement</option><option value="none">Aucune</option></select></label>
  <label>Style des traits<select v-model="table.lineStyle" aria-label="Style des traits du tableau"><option value="solid">Continu</option><option value="dashed">Tirets</option><option value="dotted">Pointillés</option></select></label>
  <label>Épaisseur des traits · px<input type="number" step="any" min="0" :max="12*scale" :value="Math.round(table.borderWidth*scale*100)/100" aria-label="Épaisseur des traits du tableau" @input="pixels('borderWidth',$event.target.value,0,12)"></label><PaletteColor :element="table" field="border" label="Couleur des traits" :theme="theme"/>
  <template v-if="table.headerPosition!=='none'"><label>Séparateur de l’en-tête · px<input type="number" step="any" min="0" :max="12*scale" :value="Math.round(table.headerSeparatorWidth*scale*100)/100" aria-label="Épaisseur du séparateur de l’en-tête" @input="pixels('headerSeparatorWidth',$event.target.value,0,12)"></label><PaletteColor :element="table" field="headerBorder" label="Séparateur de l’en-tête" :theme="theme"/></template>
 </details>
 <details class="property-details"><summary>Typographie et alignement</summary>
  <label>Police<select v-model="table.font" aria-label="Police du tableau"><option v-for="f in fonts" :key="f.id" :value="f.id">{{f.name}}</option></select></label>
  <label>Taille du corps · px<input type="number" :min="10*scale" :max="120*scale" :value="Math.round(table.fontSize*scale)" aria-label="Taille du texte du tableau" @input="pixels('fontSize',$event.target.value,10,120)"></label>
  <label class="checkbox-label"><input type="checkbox" v-model="table.bodyBold">Corps en gras</label>
  <div class="position-grid"><label>Horizontal<select v-model="table.align" aria-label="Alignement horizontal des cellules"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label><label>Vertical<select v-model="table.verticalAlign" aria-label="Alignement vertical des cellules"><option value="top">Haut</option><option value="middle">Centre</option><option value="bottom">Bas</option></select></label></div>
  <label>Marge des cellules · px<input type="number" min="0" :max="80*scale" :value="Math.round(table.padding*scale)" aria-label="Marge intérieure des cellules" @input="pixels('padding',$event.target.value,0,80)"></label>
 </details>
 <details class="property-details"><summary>Proportions des lignes et colonnes</summary><p class="field-help">Poids relatif : 2 donne deux fois plus d’espace que 1. Le tableau conserve ses dimensions.</p>
  <div class="position-grid"><label v-for="(w,c) in table.columnWeights" :key="'c'+c">Colonne {{c+1}}<input type="number" min="0.1" max="20" step="0.1" :aria-label="'Poids colonne '+(c+1)" :value="w" @input="weight('columnWeights',c,$event.target.value)"></label></div>
  <div class="position-grid"><label v-for="(w,r) in table.rowWeights" :key="'r'+r">Ligne {{r+1}}<input type="number" min="0.1" max="20" step="0.1" :aria-label="'Poids ligne '+(r+1)" :value="w" @input="weight('rowWeights',r,$event.target.value)"></label></div>
 </details>
 <Teleport to="body"><div v-if="editing" class="gallery-backdrop" @keydown.esc.stop="editing=false" @click.self="editing=false"><section class="table-dialog" role="dialog" aria-modal="true" aria-label="Modifier les cellules du tableau"><div class="gallery-heading"><div><h2>Contenu du tableau</h2><p>{{table.rows}} lignes × {{table.columns}} colonnes · en-tête : {{headerPositions.find(([id])=>id===table.headerPosition)?.[1]}}</p></div><button class="btn" @click="editing=false">Annuler</button></div><div class="table-cell-scroll"><table><tbody><tr v-for="(row,r) in draft" :key="r"><td v-for="(_,c) in row" :key="c" :class="{headerCell:isHeaderCell(table,r,c)}"><label>L{{r+1}} · C{{c+1}} {{isHeaderCell(table,r,c)?'· En-tête':''}}<textarea :aria-label="'Cellule ligne '+(r+1)+' colonne '+(c+1)" v-model="draft[r][c]" maxlength="2000" rows="3"></textarea></label></td></tr></tbody></table></div><div class="dialog-actions"><button class="btn primary" @click="commit">Valider les cellules</button></div></section></div></Teleport>
</template>
