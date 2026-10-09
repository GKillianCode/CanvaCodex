<script setup>
import NumberRange from './NumberRange.vue';
import TextSpacing from './TextSpacing.vue';
import InspectorDrawer from './InspectorDrawer.vue';
import { inject,reactive } from 'vue';
import { resizeTable,headerPositions,tableStyles,applyTableStyle,setTableRowHeight,tableTracks } from '../tables.js';
import { fonts } from '../fonts.js';
import PaletteColor from './PaletteColor.vue';
const props=defineProps({table:Object,position:Object,theme:Object,scale:Number,mode:{type:String,default:'style'},multiple:Boolean});const emit=defineEmits(['edit']);
function resize(field,value){if(value==='')return;resizeTable(props.table,field==='rows'?value:props.table.rows,field==='columns'?value:props.table.columns);}
function pixels(field,value,min,max){if(value==='')return;const n=Number(value)/props.scale;if(Number.isFinite(n))props.table[field]=Math.max(min,Math.min(max,n));}
function header(position){props.table.headerPosition=position;props.table.header=position!=='none';props.table.headerCount=Math.min(props.table.headerCount,['left','right'].includes(position)?props.table.columns:position==='top-left'?Math.min(props.table.rows,props.table.columns):props.table.rows);}
function commonHeight(){const heights=tableTracks(props.table,props.position).rows.map(row=>row.size);return heights.every(h=>Math.abs(h-heights[0])<.01)?Math.round(heights[0]*props.scale):undefined;}
function weight(axis,index,value){if(value==='')return;const n=Number(value);if(Number.isFinite(n))props.table[axis][index]=Math.max(.1,Math.min(20,n));}
const inspector=inject('inspectorDrawers',reactive({}));
const colorGroups={header:[['headerFill','Fond de l’en-tête'],['headerText','Texte de l’en-tête']],body:[['fill','Fond du corps'],['textColor','Texte du corps'],['stripeFill','Bandes alternées']],lines:[['border','Traits'],['headerBorder','Séparateur de l’en-tête']]};
</script>
<template>
 <InspectorDrawer v-if="mode==='style'&&!multiple" id="table-0" title="Tableau · contenu">
  <div class="position-grid"><label>Lignes<input type="number" min="1" max="20" aria-label="Nombre de lignes" :value="table.rows" @input="resize('rows',$event.target.value)"></label><label>Colonnes<input type="number" min="1" max="10" aria-label="Nombre de colonnes" :value="table.columns" @input="resize('columns',$event.target.value)"></label></div>
  <button class="btn full" @click="emit('edit')">Modifier les cellules</button><p class="field-help">20 lignes et 10 colonnes maximum. Ctrl Z annule une réduction.</p>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='style'" id="table-1" title="Style du tableau">
  <div class="table-style-grid"><button v-for="style in tableStyles" :key="style.id" class="btn" @click="applyTableStyle(table,style.id)" :aria-label="'Style de tableau '+style.name">{{style.name}}</button></div>
  <label>Arrondi des coins · px<input type="number" min="0" :max="120*scale" :value="Math.round(table.cornerRadius*scale)" aria-label="Arrondi du tableau" @input="pixels('cornerRadius',$event.target.value,0,120)"></label>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='style'" id="table-2" title="En-tête">
  <label>Position de l’en-tête<select :value="table.headerPosition" @change="header($event.target.value)" aria-label="Position de l’en-tête"><option v-for="[id,name] in headerPositions" :key="id" :value="id">{{name}}</option></select></label>
  <template v-if="table.headerPosition!=='none'">
   <label>Nombre de lignes / colonnes d’en-tête<input type="number" min="1" :max="['left','right'].includes(table.headerPosition)?table.columns:table.headerPosition==='top-left'?Math.min(table.rows,table.columns):table.rows" :value="table.headerCount" aria-label="Nombre de rangées d’en-tête" @input="table.headerCount=Math.max(1,Math.min(['left','right'].includes(table.headerPosition)?table.columns:table.headerPosition==='top-left'?Math.min(table.rows,table.columns):table.rows,Math.round(Number($event.target.value)||1)))"></label>
   <p class="field-help">Les cellules du bord choisi deviennent l’en-tête ; leur contenu reste à sa place.</p>
   <label class="checkbox-label"><input type="checkbox" v-model="table.headerFilled">Fond de l’en-tête</label>

   <label>Taille de l’en-tête · px<input type="number" :min="10*scale" :max="120*scale" :value="Math.round(table.headerFontSize*scale)" aria-label="Taille du texte de l’en-tête" @input="pixels('headerFontSize',$event.target.value,10,120)"></label>
   <label class="checkbox-label"><input type="checkbox" v-model="table.headerBold">En-tête en gras</label>
  </template>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='style'" id="table-3" title="Corps et alternance">
  <label class="checkbox-label"><input type="checkbox" v-model="table.bodyFilled">Fond du corps du tableau</label>
  <label class="checkbox-label"><input type="checkbox" v-model="table.striped">Bandes alternées</label>
  <template v-if="table.striped"><label>Alternance<select v-model="table.stripeAxis" aria-label="Sens des bandes alternées"><option value="rows">Lignes</option><option value="columns">Colonnes</option></select></label><NumberRange label="Intensité des bandes" unit="%" v-model="table.stripeOpacity"/></template>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='style'" id="table-4" title="Bordures et traits">
  <label>Bordures visibles<select v-model="table.borderMode" aria-label="Bordures du tableau"><option value="all">Toutes</option><option value="horizontal">Horizontales + contour</option><option value="vertical">Verticales + contour</option><option value="outer">Contour uniquement</option><option value="none">Aucune</option></select></label>
  <label>Style des traits<select v-model="table.lineStyle" aria-label="Style des traits du tableau"><option value="solid">Continu</option><option value="dashed">Tirets</option><option value="dotted">Pointillés</option></select></label>
  <label>Épaisseur des traits · px<input type="number" step="any" min="0" :max="12*scale" :value="Math.round(table.borderWidth*scale*100)/100" aria-label="Épaisseur des traits du tableau" @input="pixels('borderWidth',$event.target.value,0,12)"></label>
  <template v-if="table.headerPosition!=='none'"><label>Séparateur de l’en-tête · px<input type="number" step="any" min="0" :max="12*scale" :value="Math.round(table.headerSeparatorWidth*scale*100)/100" aria-label="Épaisseur du séparateur de l’en-tête" @input="pixels('headerSeparatorWidth',$event.target.value,0,12)"></label></template>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='style'" id="table-5" title="Typographie et alignement">
  <label>Police<select v-model="table.font" aria-label="Police du tableau"><option v-for="f in fonts" :key="f.id" :value="f.id">{{f.name}}</option></select></label>
  <label>Taille du corps · px<input type="number" :min="10*scale" :max="120*scale" :value="Math.round(table.fontSize*scale)" aria-label="Taille du texte du tableau" @input="pixels('fontSize',$event.target.value,10,120)"></label>
  <label class="checkbox-label"><input type="checkbox" v-model="table.autoFitText">Adapter le texte aux petites cellules</label><TextSpacing :value="table" @change="(key,v)=>table[key]=v"/><label class="checkbox-label"><input type="checkbox" v-model="table.bodyBold">Corps en gras</label>
  <div class="position-grid"><label>Horizontal<select v-model="table.align" aria-label="Alignement horizontal des cellules"><option value="left">Gauche</option><option value="center">Centre</option><option value="right">Droite</option></select></label><label>Vertical<select v-model="table.verticalAlign" aria-label="Alignement vertical des cellules"><option value="top">Haut</option><option value="middle">Centre</option><option value="bottom">Bas</option></select></label></div>
  <label>Marge des cellules · px<input type="number" min="0" :max="80*scale" :value="Math.round(table.padding*scale)" aria-label="Marge intérieure des cellules" @input="pixels('padding',$event.target.value,0,80)"></label>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='layout'" id="table-heights" title="Hauteur des cellules"><template v-if="position"><label>Hauteur commune · px<input type="number" min="1" :max="10000*scale/table.rows" :value="commonHeight()??''" placeholder="Mixte" aria-label="Hauteur commune des cellules" @input="setTableRowHeight(table,position,null,Number($event.target.value)/scale)"></label><label v-for="(row,r) in tableTracks(table,position).rows" :key="r">Ligne {{r+1}} · px<input type="number" min="1" :max="10000*scale" :value="Math.round(row.size*scale)" :aria-label="'Hauteur de la ligne '+(r+1)" @input="setTableRowHeight(table,position,r,Number($event.target.value)/scale)"></label></template><p v-else class="field-help">Sélectionne un seul tableau pour définir la hauteur de chaque ligne.</p></InspectorDrawer><InspectorDrawer v-if="mode==='layout'" id="table-6" title="Proportions des lignes et colonnes"><p class="field-help">Poids relatif : 2 donne deux fois plus d’espace que 1. Le tableau conserve ses dimensions.</p>
  <div class="position-grid"><label v-for="(w,c) in table.columnWeights" :key="'c'+c">Colonne {{c+1}}<input type="number" min="0.1" max="20" step="0.1" :aria-label="'Poids colonne '+(c+1)" :value="w" @input="weight('columnWeights',c,$event.target.value)"></label></div>
  <div class="position-grid"><label v-for="(w,r) in table.rowWeights" :key="'r'+r">Ligne {{r+1}}<input type="number" min="0.1" max="20" step="0.1" :aria-label="'Poids ligne '+(r+1)" :value="w" @input="weight('rowWeights',r,$event.target.value)"></label></div>
 </InspectorDrawer>
 <InspectorDrawer v-if="mode==='colors'" id="colors" title="Couleurs du tableau"><div class="table-color-tabs"><button v-for="[id,name] in [['header','En-tête'],['body','Corps'],['lines','Traits']]" :key="id" :class="{active:(inspector.tableColorGroup||'header')===id}" :aria-pressed="(inspector.tableColorGroup||'header')===id" @click="inspector.tableColorGroup=id">{{name}}</button></div><PaletteColor v-for="[field,label] in colorGroups[inspector.tableColorGroup||'header']" :key="field" :element="table" :field="field" :label="label" :theme="theme"/></InspectorDrawer>

</template>
