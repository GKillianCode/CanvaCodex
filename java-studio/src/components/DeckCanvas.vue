<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { transitionDirection } from '../model.js';
import { routePath } from '../route.js';
import { Plus, Minus, Maximize2, MousePointer2 } from 'lucide-vue-next';
const props=defineProps({slides:Array,thumbs:Object,index:Number,selection:Array,routeMode:String,routeStart:String,canUndo:Boolean});
const emit=defineEmits(['mode','start','trace','connect','undo','deselect','select','edit','move','add']);
const surface=ref(null), pan=ref({x:60,y:60}), scale=ref(.85), gesture=ref(null);
const tracing=ref(false),traceIds=ref([]),linkGesture=ref(null);
const CELL_X=300,CELL_Y=215;
const positions=computed(()=>Object.fromEntries(props.slides.map(s=>[s.id,gesture.value?.id===s.id?{x:gesture.value.x,y:gesture.value.y}:{x:s.grid.x*CELL_X,y:s.grid.y*CELL_Y}])));
const ordered=computed(()=>tracing.value?traceIds.value.map(id=>props.slides.find(s=>s.id===id)).filter(Boolean):props.slides);
const routes=computed(()=>ordered.value.slice(0,-1).map((s,n)=>({from:positions.value[s.id],to:positions.value[ordered.value[n+1].id],direction:transitionDirection(s,ordered.value[n+1])})));
function fit() {
 const rect=surface.value?.getBoundingClientRect();if(!rect)return;
 const xs=props.slides.map(s=>s.grid.x*CELL_X),ys=props.slides.map(s=>s.grid.y*CELL_Y);
 const minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX+240,h=Math.max(...ys)-minY+170;
 scale.value=Math.max(.12,Math.min(1,(rect.width-100)/w,(rect.height-100)/h));
 pan.value={x:(rect.width-w*scale.value)/2-minX*scale.value,y:(rect.height-h*scale.value)/2-minY*scale.value};
}
function zoom(next,point) {
 const r=surface.value.getBoundingClientRect(),cx=point?.x??r.width/2,cy=point?.y??r.height/2;
 next=Math.min(2,Math.max(.12,next));const ratio=next/scale.value;
 pan.value={x:cx-(cx-pan.value.x)*ratio,y:cy-(cy-pan.value.y)*ratio};scale.value=next;
}
function wheel(e){e.preventDefault();if(e.ctrlKey||e.metaKey){const r=surface.value.getBoundingClientRect();zoom(scale.value*Math.exp(-e.deltaY*.005),{x:e.clientX-r.left,y:e.clientY-r.top});}else pan.value={x:pan.value.x-e.deltaX,y:pan.value.y-e.deltaY};}
function traceNode(s){if(!traceIds.value.includes(s.id))traceIds.value.push(s.id);}
function finishTrace(){emit('trace',traceIds.value);tracing.value=false;traceIds.value=[];}
function portDown(e,s){e.preventDefault();e.stopPropagation();surface.value.setPointerCapture(e.pointerId);const p=positions.value[s.id];linkGesture.value={from:s.id,x:p.x+240,y:p.y+85};}
function down(e,s,n){if(tracing.value){if(s){e.preventDefault();traceNode(s);}return;}if(e.button!==0&&e.button!==1)return;e.preventDefault();surface.value.setPointerCapture(e.pointerId);if(s)emit('select',n,e);else emit('deselect');gesture.value={id:s?.id,startX:e.clientX,startY:e.clientY,origin:s?{x:s.grid.x*CELL_X,y:s.grid.y*CELL_Y}:{...pan.value},x:s?.grid.x*CELL_X,y:s?.grid.y*CELL_Y,moved:false};}
function move(e){if(linkGesture.value){const r=surface.value.getBoundingClientRect();linkGesture.value.x=(e.clientX-r.left-pan.value.x)/scale.value;linkGesture.value.y=(e.clientY-r.top-pan.value.y)/scale.value;return;}const g=gesture.value;if(!g)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY;g.moved ||=Math.hypot(dx,dy)>5;if(g.id){g.x=g.origin.x+dx/scale.value;g.y=g.origin.y+dy/scale.value;}else pan.value={x:g.origin.x+dx,y:g.origin.y+dy};}
function up(e){if(linkGesture.value){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-route-id]')?.dataset.routeId;if(target&&e.type!=='pointercancel')emit('connect',linkGesture.value.from,target);linkGesture.value=null;return;}const g=gesture.value;if(g?.id&&g.moved&&e.type!=='pointercancel')emit('move',g.id,Math.round(g.x/CELL_X),Math.round(g.y/CELL_Y));gesture.value=null;}
watch(()=>props.index,async()=>{await nextTick();const r=surface.value?.getBoundingClientRect(),s=props.slides[props.index];if(!r||!s)return;const x=pan.value.x+s.grid.x*CELL_X*scale.value,y=pan.value.y+s.grid.y*CELL_Y*scale.value;if(x<20||y<20||x+240*scale.value>r.width-20||y+175*scale.value>r.height-20)pan.value={x:r.width/2-(s.grid.x*CELL_X+120)*scale.value,y:r.height/2-(s.grid.y*CELL_Y+85)*scale.value};});
onMounted(fit);
</script>
<template>
 <section class="deck-workspace">
  <div class="deck-toolbar"><div><span class="eyebrow">CANVAS DU DIAPORAMA</span><strong>Construis ton parcours.</strong></div><button class="btn" @click="emit('add')"><Plus :size="16"/>Nouvelle diapo</button></div>
  <div class="route-toolbar"><label>Parcours<select :value="routeMode" @change="emit('mode',$event.target.value)" :disabled="tracing"><option value="spatial">Automatique · positions</option><option value="manual">Manuel · fil dessiné</option></select></label><label>Départ<select :value="routeStart" @change="emit('start',$event.target.value)" :disabled="tracing"><option value="">Automatique · haut gauche</option><option v-for="s in slides" :key="s.id" :value="s.id">{{s.title.replaceAll('\n',' ')}}</option></select></label><button v-if="!tracing" class="btn" @click="tracing=true;traceIds=[]">Tracer le parcours</button><template v-else><button class="btn primary" @click="finishTrace" :disabled="!traceIds.length">Valider · {{traceIds.length}} / {{slides.length}}</button><button class="btn" @click="tracing=false;traceIds=[]">Annuler</button></template><button v-if="canUndo&&!tracing" class="btn" @click="emit('undo')">Annuler le parcours</button></div><p class="route-help">{{tracing?'Clique les diapos dans l’ordre voulu, puis valide. Les diapos restantes seront ajoutées à la fin.':routeMode==='spatial'?'Déplace les diapos : le fil et la lecture suivent les positions. En cas d’ambiguïté, trace ton parcours.':'Glisse le point de liaison vers une diapo pour la lire juste après. Les positions donnent le sens de la transition.'}}</p>
  <div ref="surface" class="deck-surface" :class="{panning:gesture&&!gesture.id}" :style="{backgroundSize:30*scale+'px '+30*scale+'px',backgroundPosition:pan.x+'px '+pan.y+'px'}" @wheel="wheel" @pointerdown.self="down($event)" @pointermove="move" @pointerup="up" @pointercancel="up" aria-label="Canvas spatial des diapos">
   <div class="deck-world" :style="{transform:`translate(${pan.x}px,${pan.y}px) scale(${scale})`}">
    <svg class="deck-connections" aria-hidden="true"><defs><marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#729b8c"/></marker></defs><path v-for="(r,n) in routes" :key="n" :d="routePath(r.from,r.to,r.direction)" stroke="#729b8c" stroke-width="3" fill="none" marker-end="url(#route-arrow)"/><path v-if="linkGesture" :d="`M ${positions[linkGesture.from].x+240} ${positions[linkGesture.from].y+85} L ${linkGesture.x} ${linkGesture.y}`" stroke="#a5f3cf" stroke-width="3" stroke-dasharray="5 5" fill="none"/></svg>
    <button v-for="(s,n) in slides" :key="s.id" :data-route-id="s.id" :class="['deck-node',{chosen:selection?.includes(s.id),traced:tracing&&traceIds.includes(s.id),untraced:tracing&&!traceIds.includes(s.id),dragging:gesture?.id===s.id&&gesture.moved}]" :style="{transform:`translate(${positions[s.id].x}px,${positions[s.id].y}px)`}" @pointerdown.stop="down($event,s,n)" @dblclick="!tracing&&emit('edit',n)" @keydown.enter.prevent="emit('edit',n)" @click="$event.detail===0 && (tracing?traceNode(s):emit('select',n,$event))" :aria-label="`Diapo ${n+1} : ${s.title.replaceAll('\n',' ')}`">
     <span class="deck-node-top"><b>{{tracing?(traceIds.includes(s.id)?String(traceIds.indexOf(s.id)+1).padStart(2,'0'):'—'):String(n+1).padStart(2,'0')}}</b><span v-if="tracing?traceIds[0]===s.id:n===0">DÉPART</span><span v-else>{{s.grid.x}}, {{s.grid.y}}</span></span><img :src="thumbs[s.id]" alt="" draggable="false"><span class="deck-node-title">{{s.title.replaceAll('\n',' ')}}</span>
    </button>
    <button v-for="s in !tracing?slides:[]" :key="'port-'+s.id" class="route-port" :style="{left:positions[s.id].x+240+'px',top:positions[s.id].y+85+'px'}" :aria-label="'Relier depuis '+s.title.replaceAll('\n',' ')" title="Glisser vers la diapo suivante" @pointerdown="portDown($event,s)"></button>
   </div>
   <div v-if="!slides.length" class="deck-empty">Ajoute ta première diapo.</div>
  </div>
  <div class="deck-bottom"><span><MousePointer2 :size="14"/>Glisser une diapo · fond pour déplacer la vue · double-clic pour éditer</span><div><button class="icon-btn" @click="zoom(scale/1.2)" title="Dézoomer le canvas"><Minus :size="17"/></button><span>{{Math.round(scale*100)}} %</span><button class="icon-btn" @click="zoom(scale*1.2)" title="Zoomer le canvas"><Plus :size="17"/></button><button class="icon-btn" @click="fit" title="Voir toutes les diapos"><Maximize2 :size="17"/></button></div></div>
 </section>
</template>
