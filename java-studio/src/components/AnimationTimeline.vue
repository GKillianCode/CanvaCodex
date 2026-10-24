<script setup>
import {setBlockName} from '../model.js';
import {patternLabels} from "../sceneBackground.js";
import { normalizePresence, presenceTiming } from "../animationPresence.js";
import TimecodeInput from "./TimecodeInput.vue";
import {audioTimeLabel} from "../animationAudioModel.js";
import AnimationAudioTrack from "./AnimationAudioTrack.vue";
import {effectCatalog,effectFieldLabel,visualEffectKinds} from "../animationEffectCatalog.js";
import {moveKeySelection} from "../animationEditing.js";
import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  ClipboardPaste,
  Diamond,
  AudioLines,
  Route,
  Repeat2,
  Eye,
  EyeOff,
  Power,
  ChevronDown,
} from "lucide-vue-next";
import {
  animationFields,
  animationEasings,
  discreteAnimationFields,
} from "../animationModel.js";
import { timelineView, timelineTime } from "../animationTimelineView.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation,
  height = ref(260),
  timelinePanel = ref("keys"),
  zoom = ref(100),
  tracks = ref(null),
  world = ref(null),
  menu = ref(null),
  renaming = ref(null), renameInput = ref(null),
  draggingKey = ref(null),
  showHidden = ref(false), selectedOnly=ref(false), nearPlayhead=ref(true), draggedGroup=ref(null);
try { nearPlayhead.value=localStorage.getItem('frame-animation-near-playhead')!=='false'; } catch {}
watch(nearPlayhead,value=>{try{localStorage.setItem('frame-animation-near-playhead',String(value));}catch{}});
const visibleClips=computed(()=>a.config.clips.filter(c=>(!c.hidden||showHidden.value)&&(!selectedOnly.value||!s.selectedKeys.length||!c.keys.length||c.keys.some(k=>s.selectedKeys.includes(k)))));
const visibleEffects=computed(()=>a.config.effects.filter(e=>visualEffectKinds.includes(e.kind)&&(!selectedOnly.value||!s.selectedKeys.length||s.selectedKeys.includes(e.key))));
// Each sequence/effect belongs to one drawer, including sequences targeting several objects.
const expandedGroups = reactive(new Set());
const hiddenGroups = reactive(new Set());
const groupId = key => s.current.id + ':' + key;
function groupAnimations(key) {
  return [
    ...a.config.clips.filter(c => (c.keys[0] || '$scene') === key),
    ...a.config.effects.filter(e => visualEffectKinds.includes(e.kind) && e.key === key),
  ];
}
function groupIsNear(group) {
  if(!nearPlayhead.value || !group.range || draggedGroup.value===group.key)return true;
  const keys=new Set([group.key,...group.clips.flatMap(c=>c.keys)]);
  return [...keys].some(key=>{
    const timing=key===group.key?group.timing:presenceTiming(a.config.presences[key],a.config.duration);
    return a.time>=timing.start-2 && a.time<=timing.end+2;
  });
}
function toggleGroupHidden(key) {
  const id = groupId(key);
  if (hiddenGroups.has(id)) hiddenGroups.delete(id);
  else hiddenGroups.add(id);
}
function toggleGroupEnabled(key) {
  if (a.busy) return;
  const animations = groupAnimations(key), enabled = !animations.some(c => c.enabled);
  a.stop(); a.beginGesture();
  animations.forEach(c => c.enabled = enabled);
  a.endGesture();
}
function removeGroup(group) {
  const animations = groupAnimations(group.key);
  a.removeTracks(
    animations.filter(c => 'keys' in c).map(c => c.id),
    animations.filter(c => !('keys' in c)).map(c => c.id),
    'les animations de « ' + group.name + ' » (l’objet et sa présence seront conservés)',
  );
}
const trackGroups = computed(() => {
  const groups = new Map();
  function group(key) {
    if (!groups.has(key)) groups.set(key, {
      key, name: s.current.elements[key]?.name || s.current.blockNames?.[key] || (key === '$scene' ? 'Scène' : key),
      range: s.current.positions[key] ? normalizePresence(a.config.presences[key]) : null,
      timing: presenceTiming(a.config.presences[key],a.config.duration),
      clips: [], effects: [],
    });
    return groups.get(key);
  }
  const matches = key => !selectedOnly.value || !s.selectedKeys.length || s.selectedKeys.includes(key);
  for (const key of Object.keys(a.config.presences)) {
    if (s.current.positions[key] && matches(key)) group(key);
  }
  for (const c of visibleClips.value) group(c.keys[0] || '$scene').clips.push(c);
  for (const effect of visibleEffects.value) group(effect.key).effects.push(effect);
  return [...groups.values()].filter(g => (showHidden.value || !hiddenGroups.has(groupId(g.key))) &&
    groupIsNear(g));
});
watch(() => a.selectedClip, () => {
  const group = trackGroups.value.find(g => g.clips.some(c => c.id === a.selectedClip));
  if (group) expandedGroups.add(group.key);
}, {immediate:true});
function toggleGroup(key) {
  if (expandedGroups.has(key)) expandedGroups.delete(key);
  else expandedGroups.add(key);
}
function selectGroup(group) {
  if (s.current.positions[group.key]) selectPresence(group.key);
  else if (group.clips[0]) a.selectClip(group.clips[0].id);
}
function objectContext(event,group) {
  if(!group.range)return;
  event.preventDefault();event.stopPropagation();
  menu.value={group,x:Math.min(innerWidth-210,event.clientX),y:Math.min(innerHeight-100,event.clientY)};
}
function renameGroup(group) {
  if(a.busy)return;
  menu.value=null;renaming.value={key:group.key,name:group.name};
  nextTick(()=>{const input=Array.isArray(renameInput.value)?renameInput.value[0]:renameInput.value;input?.focus();input?.select();});
}
function commitName() {
  const value=renaming.value;renaming.value=null;
  if(!value||a.busy||!value.name.trim())return;
  const name=value.name.trim().slice(0,100);
  if(name===(s.current.elements[value.key]?.name||s.current.blockNames?.[value.key]||value.key))return;
  a.beginGesture();setBlockName(s.current,value.key,name);a.endGesture();
}
function objectMarkers(group) {
  return group.clips.flatMap(c=>frameTimes(c)
    .filter(t=>!expandedGroups.has(group.key)||!c.frames.some(f=>Math.abs(f.time-t)<.0001))
    .map(t=>({c,t})));
}
function selectPresence(key) { s.selectLayer(key); }
function dragPresence(event,key,edge) {
  if(event.button!==0 || a.busy) return;
  event.preventDefault(); event.stopPropagation(); a.stop(); selectPresence(key);
  const lane=event.currentTarget.closest('.track-lane').getBoundingClientRect(), x=event.clientX,
    original=normalizePresence(a.config.presences[key]), end=Math.min(a.config.duration,original.end??a.config.duration), span=end-original.start, frame=1/a.config.fps;
  gesture(e=>{
    const delta=Math.round((e.clientX-x)/lane.width*view.value.span*a.config.fps)/a.config.fps;
    const range={...original};
    if(edge==='start') range.start=Math.max(0,Math.min(end-frame,original.start+delta));
    else if(edge==='end') range.end=Math.max(original.start+frame,Math.min(a.config.duration,end+delta));
    else {range.start=Math.max(0,Math.min(a.config.duration-span,original.start+delta));range.end=range.start+span;}
    a.config.presences[key]=normalizePresence(range);
    const at=edge==='end'?range.end:range.start;
    draggingKey.value={time:at,frame:Math.round(at*a.config.fps),x:Math.max(8,Math.min(window.innerWidth-240,e.clientX+14)),y:Math.max(8,Math.min(window.innerHeight-64,e.clientY+22)),blocked:false};
  },key);
}
const view = computed(() => timelineView(a.config.duration, zoom.value));
watch(() => !!a.config.audio.src, present => { if (present) { timelinePanel.value = 'audio'; } }, {immediate:true});
const labels = {
  ...patternLabels,
  fillEnabled: "Remplissage activé",
  strokeEnabled: "Contour activé",
  dashed: "Pointillés",
  strokeWidth: "Épaisseur du contour",
  radius: "Arrondi",
  points: "Branches",
  innerRatio: "Profondeur",
  strokeColor: "Couleur du contour",
  engineGravity: "Force de gravité",
  particleForce: "Force d’émission",
  particleSpeed: "Vitesse des particules",
  particleSize: "Taille des particules",
  particleCount: "Quantité de particules",
  particleLife: "Vie des particules",
  x: "Position X",
  y: "Position Y",
  w: "Largeur",
  h: "Hauteur",
  rotation: "Rotation",
  skewX: "Inclinaison X",
  skewY: "Inclinaison Y",
  opacity: "Opacité",
  size: "Taille du texte",
  contentScale: "Échelle du contenu",
  scale: "Échelle · %",
  progress: "Progression du chemin",
  color: "Couleur du remplissage",
  cameraX:"Caméra · centre X",cameraY:"Caméra · centre Y",cameraZoom:"Caméra · zoom",cameraRotation:"Caméra · rotation",
  backgroundColor:"Fond · couleur 1",backgroundColor2:"Fond · couleur 2",backgroundAngle:"Fond · angle",
};
const easeLabels = {
  linear: "Linéaire",
  smooth: "Progressive",
  easeIn: "Accélération",
  easeOut: "Décélération",
  hold: "Instantanée",
  bezier: "Bézier",
};
let cleanup = () => {};
function gesture(move,owner=null) {
  cleanup();
  draggedGroup.value=owner;
  a.beginGesture();
  const end = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    window.removeEventListener("blur", end);
    draggingKey.value = null;
    draggedGroup.value=null;
    a.endGesture();
    cleanup = () => {};
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  window.addEventListener("blur", end);
  cleanup = end;
}
function dragKey(event, c, key) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.closest('.animation-timeline')?.focus({preventScroll:true});
  a.selectKey(c,key,event.ctrlKey||event.metaKey||event.shiftKey);
  const entries=a.keyEntries();if(!entries.length)return;
  const rect=event.currentTarget.parentElement.getBoundingClientRect(),x=event.clientX,origins=entries.map(r=>r.key.time);
  function indicate(e, blocked = false) {
    draggingKey.value = {
      time: c.start + key.time,
      frame: Math.round((c.start + key.time) * a.config.fps),
      x: Math.max(8, Math.min(window.innerWidth - 240, e.clientX + 14)),
      y: Math.max(8, Math.min(window.innerHeight - 64, e.clientY + 22)),
      blocked,
    };
  }
  gesture(e => {
    const delta = Math.round((e.clientX - x) / rect.width * view.value.span * a.config.fps) / a.config.fps;
    const moved = moveKeySelection(entries, delta, origins);
    indicate(e, !moved);
  },c.keys[0]||null);
  indicate(event);
}
function keyShortcuts(e){if(timelinePanel.value!=='keys')return;if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if((e.ctrlKey||e.metaKey)&&['c','v'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();if(e.key.toLowerCase()==='c')a.copyKeys();else a.pasteKeys();}if(e.key==='Delete'&&a.keyEntries().length){e.preventDefault();e.stopPropagation();a.deleteKeys();}}
function scrub(event) {
  event.preventDefault();
  const rect = (
    event.currentTarget.closest(".timeline-ruler") || event.currentTarget
  ).getBoundingClientRect();
  const update = (e) =>
    a.seek(timelineTime(e.clientX, rect.left, rect.width, view.value.span));
  update(event);
  gesture(update);
}
function resize(event) {
  const y = event.clientY,
    h = height.value;
  gesture(
    (e) => (height.value = Math.max(180, Math.min(650, h + y - e.clientY))),
  );
}
function dragClip(event, c) {
  event.preventDefault();
  if(c.key){s.selected=c.key;s.selectedKeys=[c.key];}else a.selectClip(c.id);
  const rect = event.currentTarget.parentElement.getBoundingClientRect(),
    x = event.clientX,
    start = c.start;
  gesture(
    (e) =>
      (c.start = Math.max(
        0,
        Math.min(
          a.config.duration - 0.1,
          Math.round(
            (start + ((e.clientX - x) / rect.width) * view.value.span) *
              a.config.fps,
          ) / a.config.fps,
        ),
      )),
  );
}
function resizeEffect(event,e){event.preventDefault();event.stopPropagation();const lane=event.currentTarget.closest('.track-lane').getBoundingClientRect(),x=event.clientX,duration=e.duration;gesture(ev=>{e.duration=Math.max(.05,Math.min(a.config.duration-e.start,duration+(ev.clientX-x)/lane.width*view.value.span));});}
async function zoomAt(value, event) {
  const el = tracks.value;
  if (!el) return;
  const rect = el.getBoundingClientRect(),
    pointer = event ? event.clientX - rect.left : rect.width / 2,
    oldWidth = world.value.getBoundingClientRect().width,
    time =
      ((el.scrollLeft + pointer - 280) / Math.max(1, oldWidth - 280)) *
      view.value.span;
  zoom.value = timelineView(a.config.duration, value).zoom;
  await nextTick();
  const width = world.value.getBoundingClientRect().width;
  el.scrollLeft = Math.max(
    0,
    280 + (time / view.value.span) * (width - 280) - pointer,
  );
}
function wheel(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  zoomAt(zoom.value * Math.exp(-event.deltaY * 0.002), event);
}
function context(event, c, key) {
  event.preventDefault();
  event.stopPropagation();
  a.selectClip(c.id);
  a.activeKey = key;
  menu.value = {
    c,
    key,
    x: Math.min(innerWidth - 210, event.clientX),
    y: Math.min(innerHeight - 130, event.clientY),
  };
}
function outside(event) {
  if (!event.target.closest(".animation-key-context")) menu.value = null;
}
function addObjectFrame(event, group) {
  if(!group.range||event.target.closest('button'))return;
  const c=group.clips.find(c=>c.id===a.selectedClip)||group.clips[0];
  if(!c)selectGroup(group);
  addFrameAt(event,c);
}
function addFrameAt(event, c) {
  if (event.target.closest("button")) return;
  const rect = event.currentTarget.getBoundingClientRect();
  if(c)a.selectClip(c.id);
  a.seek(timelineTime(event.clientX, rect.left, rect.width, view.value.span));
  a.addFrame();
}
function frameTimes(c) {
  return [
    ...new Set([...(c.markers || []), ...c.frames.map((f) => f.time)]),
  ].sort((a, b) => a - b);
}
function deleteEvent(event) {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
  event.preventDefault();
  if (a.clip && a.activeKey) a.deleteKey(a.clip, a.activeKey);
  else if (a.clip && a.activeFrame) a.removeFrame(a.clip, a.activeFrame.time);
  else if (a.clip) a.removeClip();
}
onMounted(() => {
  tracks.value.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("pointerdown", outside);
});
onUnmounted(() => {
  cleanup();
  tracks.value?.removeEventListener("wheel", wheel);
  window.removeEventListener("pointerdown", outside);
});
</script>
<template>
  <section
    class="animation-timeline" tabindex="0"
    @keydown="keyShortcuts"
    :style="{ height: height + 'px' }"
    aria-label="Timeline de l’animation"
    @keydown.delete.stop="timelinePanel === 'keys'&&!a.keyEntries().length&&deleteEvent($event)"
    @keydown.left.stop
    @keydown.right.stop
    @keydown.up.stop
    @keydown.down.stop
  >
    <button
      class="timeline-resizer"
      aria-label="Redimensionner la timeline"
      @pointerdown="resize"
    ></button>
    <div class="animation-timeline-header">
    <div class="animation-timeline-views">
      <div class="workspace-switch" role="group" aria-label="Vue de la timeline">
        <button type="button" :class="{active:timelinePanel === 'keys'}" :aria-pressed="timelinePanel === 'keys'" @click="timelinePanel = 'keys'; menu = null"><Diamond :size="14" />Images clés</button>
        <button type="button" :class="{active:timelinePanel === 'audio'}" :aria-pressed="timelinePanel === 'audio'" @click="timelinePanel = 'audio'; menu = null"><AudioLines :size="14" />Audio</button>
      </div>
    </div>
    <div class="animation-transport">
      <div class="bottom-tools">
        <button class="icon-btn" title="Début" @click="a.seek(0)">
          <SkipBack :size="16" /></button
        ><button
          class="icon-btn"
          title="Image précédente"
          @click="a.seek(a.time - 1 / a.config.fps)"
        >
          <ChevronLeft :size="16" /></button
        ><button
          class="icon-btn playback-toggle"
          :class="{active:a.playing}"
          :aria-label="a.playing ? 'Pause' : 'Lire'"
          title="Lire ou mettre en pause l’animation"
          @click="a.play()"
        >
          <component :is="a.playing ? Pause : Play" :size="16" /></button
        ><button
          class="icon-btn"
          title="Image suivante"
          @click="a.seek(a.time + 1 / a.config.fps)"
        >
          <ChevronRight :size="16" /></button
        >
        <div class="timeline-time" :title="a.config.audio.src ? 'Dans l’audio : ' + audioTimeLabel(a.audio.position,a.audio.frameRate) : 'Position dans la scène'">
          <TimecodeInput dense hide-label :frame-rate="a.audio.frameRate" compact label="Temps de la scène" :model-value="a.time"
            :disabled="a.busy" @focusin="a.stop()" @update:model-value="a.seek" />
        </div>
        <button type="button" class="icon-btn playback-loop" :class="{active:a.loop}" :aria-pressed="a.loop" aria-label="Boucle" :title="a.loop ? 'Désactiver la lecture en boucle' : 'Activer la lecture en boucle'" @click="a.loop=!a.loop"><Repeat2 :size="16"/></button>
        <div
          class="workspace-switch"
          title="Construction : état courant avec repères et éléments hors cadre. État animé : rendu cadré au même instant."
        >
          <button
            :class="{ active: a.construction }"
            @click="
              a.setConstruction(true);
            "
          >
            Construction</button
          ><button :class="{ active: !a.construction }" @click="a.setConstruction(false)">
            État animé
          </button>
        </div>
        <button
          type="button"
          class="btn"
          :class="{ active: a.autoKey }"
          :aria-pressed="a.autoKey"
          aria-label="Images clés automatiques"
          :disabled="a.busy"
          title="Clés auto : chaque modification d’une propriété animable est enregistrée à cet instant, avec une clé de départ si nécessaire. Les losanges restent disponibles."
          @click="a.setAutoKey(!a.autoKey)"
        ><Diamond :size="14" :fill="a.autoKey ? 'currentColor' : 'none'" />Clés auto</button>
      </div>
    </div>
    </div>
    <div v-if="a.busy" class="animation-export-progress" role="status">
      Export · {{ Math.round(a.progress * 100) }} %<progress
        :value="a.progress"
        max="1"
      ></progress
      ><button class="btn" @click="a.cancel()">Annuler</button>
    </div>
    <div v-if="timelinePanel === 'keys'" class="animation-key-tools">
      <button
        class="btn primary"
        title="Poser une image clé à cet instant, puis lui associer des propriétés avec les losanges"
        @click="a.addFrame()"
      >
        <Diamond :size="14" />Ajouter une image clé
      </button>
      <button
        class="btn"
        title="Créer une séquence commune : les objets sélectionnés se déplacent, tournent et changent d’échelle ensemble"
        @click="a.addClip()"
      >
        <Plus :size="14" />Animer la sélection</button
      ><button
        class="icon-btn"
        :disabled="!a.clip"
        title="Dupliquer la séquence"
        @click="a.duplicateClip()"
      >
        <Copy :size="14" /></button
      ><button
        class="icon-btn"
        :disabled="!a.clip"
        title="Supprimer la séquence"
        @click="a.removeClip()"
      >
        <Trash2 :size="14" /></button
      ><button
        class="btn"
        title="Relier les deux objets sélectionnés par une flèche"
        @click="a.addLink()"
      >
        Référence</button
      ><button
        class="btn"
        title="Créer une trajectoire pour la séquence sélectionnée"
        @click="a.addPath()"
      >
        <Route :size="14" />Spline</button
      ><label title="Réafficher les séquences masquées"
        ><input type="checkbox" v-model="showHidden" />Pistes masquées</label
      ><label title="Afficher les objets de 2 secondes avant leur apparition à 2 secondes après leur disparition"><input type="checkbox" v-model="nearPlayhead" aria-label="Pistes autour du curseur"/>Autour du curseur</label>
      <label title="Afficher uniquement les pistes de la sélection et les pistes de scène"><input type="checkbox" v-model="selectedOnly" aria-label="Pistes de la sélection"/>Sélection</label>
<div class="animation-key-selection-tools"><button class="icon-btn" :disabled="!a.keySelection.length" aria-label="Copier les clés sélectionnées" title="Copier les clés sélectionnées · Ctrl C" @click="a.copyKeys()"><Copy :size="14"/></button><button class="icon-btn" :disabled="!a.keyClipboard.length||!a.clip" aria-label="Coller les clés" title="Coller à la tête de lecture · Ctrl V" @click="a.pasteKeys()"><ClipboardPaste :size="14"/></button><button class="icon-btn" :disabled="!a.keySelection.length" aria-label="Supprimer les clés sélectionnées" @click="a.deleteKeys()"><Trash2 :size="14"/></button></div>    </div>

<div ref="tracks" class="animation-tracks">
      <div
        ref="world"
        class="animation-tracks-world"
        :style="{ width: view.widthPercent + '%' }"
      >
        <div class="animation-ruler">
          <span>{{ timelinePanel === 'audio' ? 'Temps dans le fichier' : 'Séquences' }}</span>
          <div class="timeline-ruler" @pointerdown="scrub">
            <span
              v-for="i in 9"
              :key="i"
              :style="{ left: ((i - 1) / 8) * 100 + '%', transform: timelinePanel === 'audio' ? (i === 1 ? 'none' : i === 9 ? 'translateX(-100%)' : undefined) : undefined }"
              >{{ timelinePanel === 'audio' ? audioTimeLabel(a.config.audio.start + ((i - 1) * view.span) / 8, a.audio.frameRate) : (((i - 1) * view.span) / 8).toFixed(1) }}</span
            ><button
              class="playhead-head"
              :style="{ left: (a.time / view.span) * 100 + '%' }"
              title="Glisser pour déplacer la tête de lecture"
              aria-label="Tête de lecture"
              @pointerdown.stop="scrub"
            ></button
            ><i :style="{ left: (a.time / view.span) * 100 + '%' }"></i>
          </div>
        </div>
        <AnimationAudioTrack v-if="timelinePanel === 'audio'" :studio="s" :span="view.span" @scrub="scrub" />
        <template v-for="group in timelinePanel === 'keys' ? trackGroups : []" :key="group.key">
          <div class="animation-track animation-object-track" :data-object="group.key" :class="{active:s.selectedKeys.includes(group.key), 'timeline-group-hidden':hiddenGroups.has(groupId(group.key))}">
            <div class="track-name object-track-name" @contextmenu="objectContext($event,group)">
              <button class="icon-btn" :aria-label="'Animations de '+group.name" :aria-expanded="expandedGroups.has(group.key)" :disabled="!group.clips.length&&!group.effects.length" @click="toggleGroup(group.key)">
                <ChevronDown :size="14" :style="{transform:expandedGroups.has(group.key)?'':'rotate(-90deg)'}"/>
              </button>
              <input v-if="renaming?.key===group.key" ref="renameInput" class="object-track-rename" v-model="renaming.name" maxlength="100" aria-label="Nom de l’objet" @pointerdown.stop @keydown.stop @keydown.enter.prevent="commitName" @keydown.esc.prevent="renaming=null" @blur="commitName"/>
              <button v-else class="object-track-title" @click="selectGroup(group)" :title="group.name">{{group.name}}</button>
              <button class="icon-btn" :disabled="a.busy || !groupAnimations(group.key).length"
                :aria-label="'Activer ou désactiver les animations de '+group.name"
                :title="groupAnimations(group.key).some(c=>c.enabled)?'Désactiver les animations':'Réactiver les animations'"
                :aria-pressed="groupAnimations(group.key).some(c=>c.enabled)"
                @click.stop="toggleGroupEnabled(group.key)"><Power :size="12"/></button>
              <button class="icon-btn" :disabled="a.busy"
                :aria-label="'Masquer ou réafficher la piste de '+group.name"
                :title="hiddenGroups.has(groupId(group.key))?'Réafficher la piste':'Masquer la piste (sans modifier le rendu)'"
                :aria-pressed="!hiddenGroups.has(groupId(group.key))"
                @click.stop="toggleGroupHidden(group.key)"><component :is="hiddenGroups.has(groupId(group.key))?EyeOff:Eye" :size="12"/></button>
              <button class="icon-btn" :disabled="a.busy || !groupAnimations(group.key).length"
                :aria-label="'Supprimer les animations de '+group.name"
                title="Supprimer les animations de cet objet…"
                @click.stop="removeGroup(group)"><Trash2 :size="12"/></button>
            </div>
            <div class="track-lane" @pointerdown.self="selectGroup(group)" @dblclick.stop.prevent="addObjectFrame($event,group)">
              <div v-if="group.range" class="presence-span" :style="{left:Math.min(group.range.start,a.config.duration)/view.span*100+'%',width:Math.max(0,Math.min(group.range.end??a.config.duration,a.config.duration)-group.range.start)/view.span*100+'%'}" @pointerdown="dragPresence($event,group.key,'move')" :title="'Présence · '+audioTimeLabel(group.range.start,a.audio.frameRate)+' → '+audioTimeLabel(group.range.end??a.config.duration,a.audio.frameRate)+(group.timing.holdDuration ? ' · Maintien : '+audioTimeLabel(group.timing.holdStart,a.audio.frameRate)+' → '+audioTimeLabel(group.timing.exitStart,a.audio.frameRate) : '')">
                <button class="presence-handle start" :aria-label="'Début de présence de '+group.key" title="Déplacer l’apparition" @pointerdown.stop="dragPresence($event,group.key,'start')"></button>
                <span v-if="group.timing.holdDuration > 0" class="presence-hold-zone"
                  :style="{left:(group.timing.holdStart-group.range.start)/(group.timing.end-group.range.start)*100+'%',width:group.timing.holdDuration/(group.timing.end-group.range.start)*100+'%'}"
                  :title="'Maintien final · '+audioTimeLabel(group.timing.holdStart,a.audio.frameRate)+' → '+audioTimeLabel(group.timing.exitStart,a.audio.frameRate)"></span>
                <span v-if="group.timing.exitDuration > 0" class="presence-exit-zone"
                  :style="{left:(group.timing.exitStart-group.range.start)/(group.timing.end-group.range.start)*100+'%',width:group.timing.exitDuration/(group.timing.end-group.range.start)*100+'%'}"
                  title="Transition de sortie"></span>
                <small>{{ audioTimeLabel(group.range.start,a.audio.frameRate) }} → {{ audioTimeLabel(group.range.end??a.config.duration,a.audio.frameRate) }}</small>
                <button class="presence-handle end" :aria-label="'Fin de présence de '+group.key" title="Déplacer la disparition" @pointerdown.stop="dragPresence($event,group.key,'end')"></button>
              </div>
              <button v-for="{c,t} in group.range ? objectMarkers(group) : []" :key="c.id+':'+t" class="frame-marker"
                :class="{empty:!c.frames.some(f=>Math.abs(f.time-t)<.0001)}"
                :style="{left:(c.start+t)/view.span*100+'%'}"
                :aria-label="'Image clé à '+t+' secondes'" :title="c.name+' · '+(c.start+t)+' s · double-clic : afficher cet état'"
                @pointerdown.stop @click.stop="a.focusFrame(c,t)" @dblclick.stop.prevent="a.focusFrame(c,t)"
                @contextmenu.prevent.stop="menu={c,frameTime:t,x:Math.min(innerWidth-210,$event.clientX),y:Math.min(innerHeight-180,$event.clientY)}">◆</button>
              <i class="track-cursor" :style="{left:a.time/view.span*100+'%'}"></i>
            </div>
          </div>
          <template v-if="expandedGroups.has(group.key)">
        <template
          v-for="c in group.clips"
          :key="c.id"
          ><div v-if="!group.range"
            :class="[
              'animation-track animation-sequence-track',
              { active: a.selectedClip === c.id, muted: !c.enabled },
            ]"
          >
            <div class="track-name" @click="a.selectClip(c.id)">
              <button
                class="icon-btn"
                :title="
                  c.collapsed
                    ? 'Déplier les propriétés'
                    : 'Replier les propriétés'
                "
                @click.stop="c.collapsed = !c.collapsed"
              >
                <ChevronDown
                  :size="12"
                  :style="{ transform: c.collapsed ? 'rotate(-90deg)' : '' }"
                /></button
              ><input
                :aria-label="'Nom de la séquence ' + c.name"
                v-model="c.name"
                maxlength="100"
                title="Renommer la séquence"
                @pointerdown.stop
              /><button
                class="icon-btn"
                :title="
                  c.enabled
                    ? 'Désactiver cette animation'
                    : 'Réactiver cette animation'
                "
                :aria-pressed="c.enabled"
                @click.stop="c.enabled = !c.enabled"
              >
                <Power
                  :size="12"
                  :style="{ opacity: c.enabled ? 1 : 0.35 }"
                /></button
              ><button
                class="icon-btn"
                :title="c.hidden ? 'Réafficher la piste' : 'Masquer la piste'"
                @click.stop="c.hidden = !c.hidden"
              >
                <component :is="c.hidden ? EyeOff : Eye" :size="12" /></button
              ><button
                class="icon-btn"
                title="Supprimer cette séquence"
                @click.stop="
                  a.selectClip(c.id);
                  a.removeClip();
                "
              >
                <Trash2 :size="12" />
              </button>
            </div>
            <div
              class="track-lane"
              @pointerdown.self="a.selectClip(c.id)"
              @dblclick.stop.prevent="addFrameAt($event, c)"
            >
              <span
                class="clip-span"
                :style="{
                  left: (c.start / view.span) * 100 + '%',
                  width: (c.duration / view.span) * 100 + '%',
                }"
                title="Glisser pour décaler la séquence"
                @pointerdown="dragClip($event, c)"
              ></span
              ><button
                v-for="t in c.collapsed ? frameTimes(c) : frameTimes(c).filter(t => !c.frames.some(f => Math.abs(f.time-t)<0.0001))"
                :key="t"
                class="frame-marker"
                :class="{
                  empty: !c.frames.some((f) => Math.abs(f.time - t) < 0.0001),
                }"
                :style="{ left: ((c.start + t) / view.span) * 100 + '%' }"
                :aria-label="'Image clé à ' + t + ' secondes'"
                :title="
                  'Image clé · ' + t + ' s · double-clic : afficher cet état'
                "
                @pointerdown.stop
                @click.stop="a.focusFrame(c, t)"
                @dblclick.stop.prevent="a.focusFrame(c, t)"
                @contextmenu.prevent.stop="
                  menu = {
                    c,
                    frameTime: t,
                    x: Math.min(innerWidth - 210, $event.clientX),
                    y: Math.min(innerHeight - 180, $event.clientY),
                  }
                "
              >
                ◆</button
              ><i
                class="track-cursor"
                :style="{ left: (a.time / view.span) * 100 + '%' }"
              ></i>
            </div>
          </div>
          <template v-if="group.range || !c.collapsed"
            ><div
              v-for="f in [...new Set([...animationFields,...c.frames.map(f=>f.field)])].filter((f) =>
                c.frames.some((k) => k.field === f),
              )"
              :key="f"
              class="animation-property-track" :class="{'direct-object-property':!!group.range,muted:!c.enabled}" :data-clip="c.id"
              @pointerdown="a.selectedClip=c.id"
            >
              <span class="property-track-label" :title="group.clips.length>1 ? c.name : undefined"
                ><small v-if="group.range && group.clips.length>1" class="property-sequence-name">{{c.name}}</small>{{ (labels[f]||effectFieldLabel(f,a.config.effects))
                }}<select
                  :aria-label="'Interpolation · ' + (labels[f]||effectFieldLabel(f,a.config.effects))"
                  :value="c.frames.find((k) => k.field === f)?.ease || c.easing"
                  title="Interpolation de cette propriété"
                  :disabled="discreteAnimationFields.includes(f)"
                  @change="
                    a.beginGesture();
                    c.frames
                      .filter((k) => k.field === f)
                      .forEach((k) => (k.ease = $event.target.value));
                    a.endGesture();
                  "
                >
                  <option
                    v-for="ease in animationEasings"
                    :key="ease"
                    :value="ease"
                  >
                    {{ easeLabels[ease] }}
                  </option>
                </select></span
              >
              <div class="track-lane">
                <button
                  v-for="(key, n) in c.frames.filter((k) => k.field === f)"
                  :key="n"
                  :class="['key-diamond', { selected: a.activeKey === key || a.keySelection.some(r=>r.key===key) }]"
                  :style="{
                    left: ((c.start + key.time) / view.span) * 100 + '%',
                    top: '6px',
                  }"
                  :aria-label="
                    (labels[key.field]||effectFieldLabel(key.field,a.config.effects)) + ' à ' + (c.start + key.time) + ' secondes'
                  "
                  :title="
                    (labels[key.field]||effectFieldLabel(key.field,a.config.effects)) + ' · ' + (c.start + key.time) + ' s · ' + key.value
                  "
                  @pointerdown="dragKey($event, c, key)"
                  @dblclick.stop.prevent="a.focusKey(c, key)"
                  @contextmenu="context($event, c, key)"
                >
                  ◆</button
                ><i
                  class="track-cursor"
                  :style="{ left: (a.time / view.span) * 100 + '%' }"
                ></i>
              </div></div></template
        ></template>
        <div v-for="effect in group.effects" :key="effect.id" class="animation-track effect-timeline-track">
         <div class="track-name"><button class="icon-btn" :title="effect.enabled?'Désactiver l’effet':'Activer l’effet'" @click="effect.enabled=!effect.enabled"><Power :size="12"/></button><button class="effect-track-owner" :aria-label="'Ouvrir les propriétés de '+(s.current.elements[effect.key]?.name||effect.key)" :title="'Ouvrir les propriétés de '+(s.current.elements[effect.key]?.name||effect.key)" @click="a.inspectEffect(effect.id)"><span>{{effect.name||effectCatalog.find(e=>e.id===effect.kind)?.name||effect.kind}}</span><small>{{s.current.elements[effect.key]?.name||effect.key}}</small></button><button class="icon-btn" title="Supprimer cet effet" :disabled="a.busy" @click="a.removeEffect(effect.id)"><Trash2 :size="12"/></button></div>
         <div class="track-lane"><span class="clip-span" :style="{left:effect.start/view.span*100+'%',width:effect.duration/view.span*100+'%',opacity:effect.enabled?1:.3}" title="Glisser pour déplacer l’effet" @pointerdown="dragClip($event,effect)"><button class="effect-duration-handle" aria-label="Ajuster la durée de l’effet" title="Glisser pour régler la durée" @pointerdown="resizeEffect($event,effect)"></button></span></div>
        </div>
          </template>
        </template>
        <p v-if="timelinePanel === 'keys'&&!trackGroups.length" class="animation-empty">
          Aucune piste visible. Vérifie les filtres, active « Pistes masquées »
          ou sélectionne un objet puis « Animer la sélection ».
        </p>
        <p v-if="timelinePanel === 'audio' && !a.config.audio.src" class="animation-empty">Importe un audio dans Scène → Audio de référence pour afficher l’extrait ici.</p>
      </div>
    </div>
    <output
      v-if="draggingKey"
      class="animation-key-drag-time"
      aria-label="Position de l’image clé"
      aria-live="off"
      :style="{ left: draggingKey.x + 'px', top: draggingKey.y + 'px' }"
    ><strong>{{ draggingKey.time.toLocaleString('fr-FR', {minimumFractionDigits: 3, maximumFractionDigits: 3}) }} s</strong>
      <span>Image {{ draggingKey.frame }}</span>
      <small v-if="draggingKey.blocked">Emplacement occupé</small>
    </output>
    <div
      v-if="menu"
      class="animation-key-context"
      role="menu"
      :style="{ left: menu.x + 'px', top: menu.y + 'px' }"
      @pointerdown.stop
    >
      <template v-if="menu.group"><button role="menuitem" :disabled="a.busy" @click="renameGroup(menu.group)">Renommer</button></template>
      <template v-else-if="menu.frameTime !== undefined"
        ><button
          role="menuitem"
          @click="
            a.focusFrame(menu.c, menu.frameTime);
            menu = null;
          "
        >
          Afficher cet état</button
        ><button
          role="menuitem"
          @click="
            a.removeFrame(menu.c, menu.frameTime);
            menu = null;
          "
        >
          Supprimer l’image clé
        </button></template
      ><template v-else
        ><button
          role="menuitem"
          @click="
            a.focusKey(menu.c, menu.key);
            menu = null;
          "
        >
          Afficher cet état</button
        ><button
          role="menuitem"
          @click="
            a.duplicateKey(menu.c, menu.key);
            menu = null;
          "
        >
          Dupliquer la clé</button
        ><button
          role="menuitem"
          @click="
            a.deleteKey(menu.c, menu.key);
            menu = null;
          "
        >
          Supprimer la clé
        </button></template
      >
    </div>
  </section>
</template>
