<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Plus, Minus, Maximize2, MousePointer2 } from 'lucide-vue-next';
const props=defineProps({slides:Array,thumbs:Object,index:Number});
const emit=defineEmits(['select','edit','move','add']);
const surface=ref(null), pan=ref({x:60,y:60}), scale=ref(.85), gesture=ref(null);
const CELL_X=300,CELL_Y=215;
const positions=computed(()=>Object.fromEntries(props.slides.map(s=>[s.id,gesture.value?.id===s.id?{x:gesture.value.x,y:gesture.value.y}:{x:s.grid.x*CELL_X,y:s.grid.y*CELL_Y}])));
const routes=computed(()=>props.slides.slice(0,-1).map((s,n)=>({from:positions.value[s.id],to:positions.value[props.slides[n+1].id]})));
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
function down(e,s,n){if(e.button!==0&&e.button!==1)return;e.preventDefault();surface.value.setPointerCapture(e.pointerId);if(s)emit('select',n);gesture.value={id:s?.id,startX:e.clientX,startY:e.clientY,origin:s?{x:s.grid.x*CELL_X,y:s.grid.y*CELL_Y}:{...pan.value},x:s?.grid.x*CELL_X,y:s?.grid.y*CELL_Y,moved:false};}
function move(e){const g=gesture.value;if(!g)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY;g.moved ||=Math.hypot(dx,dy)>5;if(g.id){g.x=g.origin.x+dx/scale.value;g.y=g.origin.y+dy/scale.value;}else pan.value={x:g.origin.x+dx,y:g.origin.y+dy};}
function up(e){const g=gesture.value;if(g?.id&&g.moved&&e.type!=='pointercancel')emit('move',g.id,Math.round(g.x/CELL_X),Math.round(g.y/CELL_Y));gesture.value=null;}
watch(()=>props.index,async()=>{await nextTick();const r=surface.value?.getBoundingClientRect(),s=props.slides[props.index];if(!r||!s)return;const x=pan.value.x+s.grid.x*CELL_X*scale.value,y=pan.value.y+s.grid.y*CELL_Y*scale.value;if(x<20||y<20||x+240*scale.value>r.width-20||y+175*scale.value>r.height-20)pan.value={x:r.width/2-(s.grid.x*CELL_X+120)*scale.value,y:r.height/2-(s.grid.y*CELL_Y+85)*scale.value};});
onMounted(fit);
</script>
<template>
 <section class="deck-workspace">
  <div class="deck-toolbar"><div><span class="eyebrow">CANVAS DU DIAPORAMA</span><strong>Construis ton parcours.</strong></div><button class="btn" @click="emit('add')"><Plus :size="16"/>Nouvelle diapo</button></div>
  <div ref="surface" class="deck-surface" :class="{panning:gesture&&!gesture.id}" :style="{backgroundSize:30*scale+'px '+30*scale+'px',backgroundPosition:pan.x+'px '+pan.y+'px'}" @wheel="wheel" @pointerdown.self="down($event)" @pointermove="move" @pointerup="up" @pointercancel="up" aria-label="Canvas spatial des diapos">
   <div class="deck-world" :style="{transform:`translate(${pan.x}px,${pan.y}px) scale(${scale})`}">
    <svg class="deck-connections" aria-hidden="true"><defs><marker id="route-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#729b8c"/></marker></defs><path v-for="(r,n) in routes" :key="n" :d="`M ${r.from.x+120} ${r.from.y+75} L ${r.to.x+120} ${r.to.y+75}`" stroke="#729b8c" stroke-width="2" stroke-dasharray="6 7" fill="none" marker-end="url(#route-arrow)"/></svg>
    <button v-for="(s,n) in slides" :key="s.id" :class="['deck-node',{chosen:n===index,dragging:gesture?.id===s.id&&gesture.moved}]" :style="{transform:`translate(${positions[s.id].x}px,${positions[s.id].y}px)`}" @pointerdown.stop="down($event,s,n)" @dblclick="emit('edit',n)" @keydown.enter.prevent="emit('edit',n)" @click="emit('select',n)" :aria-label="`Diapo ${n+1} : ${s.title.replaceAll('\n',' ')}`">
     <span class="deck-node-top"><b>{{String(n+1).padStart(2,'0')}}</b><span v-if="n===0">DÉPART</span><span v-else>{{s.grid.x}}, {{s.grid.y}}</span></span><img :src="thumbs[s.id]" alt="" draggable="false"><span class="deck-node-title">{{s.title.replaceAll('\n',' ')}}</span>
    </button>
   </div>
   <div v-if="!slides.length" class="deck-empty">Ajoute ta première diapo.</div>
  </div>
  <div class="deck-bottom"><span><MousePointer2 :size="14"/>Glisser une diapo · fond pour déplacer la vue · double-clic pour éditer</span><div><button class="icon-btn" @click="zoom(scale/1.2)" title="Dézoomer le canvas"><Minus :size="17"/></button><span>{{Math.round(scale*100)}} %</span><button class="icon-btn" @click="zoom(scale*1.2)" title="Zoomer le canvas"><Plus :size="17"/></button><button class="icon-btn" @click="fit" title="Voir toutes les diapos"><Maximize2 :size="17"/></button></div></div>
 </section>
</template>
