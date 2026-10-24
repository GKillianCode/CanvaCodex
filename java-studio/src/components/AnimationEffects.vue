<script setup>
import AnimationWorkbench from "./AnimationWorkbench.vue";
import AnimationContacts from "./AnimationContacts.vue";
import AnimationProperties from "./AnimationProperties.vue";
import AnimationVectorBridge from "./AnimationVectorBridge.vue";
import InspectorDrawer from "./InspectorDrawer.vue";
import NumberRange from "./NumberRange.vue";
import PaletteColor from "./PaletteColor.vue";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import EffectPreview from "./EffectPreview.vue";
import { reactive, computed, ref, watch, nextTick } from "vue";
import {
  Plus,
  Trash2,
  Waves,
  Wind,
  ArrowDown,
  Copy,
  Scissors,
  Combine,
  Move,
  Route,
  Box,
  SlidersHorizontal,
  GripVertical,
  RotateCcw,
  Bookmark,
  Layers,
  Search,
  Sparkles,
  Play,
  X,
} from "lucide-vue-next";
import {
  effectCatalog,
  effectField,
  timedEffectKinds,
  visualEffectKinds,
} from "../animationEffectCatalog.js";
import { normalizeEffect } from "../animationEffects.js";
import { captureEffect, applyMotion } from "../animationPresets.js";
import { localAssets, upsertAsset } from "../localAssets.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const legacy = [
  ["oscillate", "Oscillation", "Mouvement", Waves],
  ["turbulence", "Tourbillon 2D", "Mouvement", Wind],
  ["stretch", "Étirement", "Déformer", Move],
  ["skew", "Inclinaison", "Déformer", Move],
  ["array", "Répétition", "Génération", Copy],
  ["subtract", "Découpe", "Génération", Scissors],
  ["intersect", "Intersection", "Génération", Combine],
  ["gravity", "Gravité", "Physique 2D", ArrowDown],
  ["wind", "Vent", "Physique 2D", Wind],
  ["collider", "Obstacle", "Physique 2D", Box],
].map(([id, name, group, icon]) => ({
  id,
  name,
  group,
  icon,
  description: name,
}));
const catalog = [
    ...effectCatalog.map((e) => ({ ...e, icon: Sparkles })),
    ...legacy,
  ],
  names = Object.fromEntries(catalog.map((e) => [e.id, e]));
const collection=ref("effects"),previewKind=ref(null),previewClose=ref(null);
watch(()=>a.inspectedEffect,()=>{collection.value="effects";});
watch(previewKind,async kind=>{if(kind){await nextTick();previewClose.value?.focus();}});
const previewSample=computed(()=>{const key=s.selectedKeys[0],scene=a.editorScene;return key&&scene.elements[key]?{element:scene.elements[key],position:scene.positions[key]}:null;});
const query = ref(""),
  group = ref("Révéler"),
  dragged = ref(""),
  drop = ref(""),
  dropAfter = ref(false),
  saving = ref(false);
const groups = [...new Set(catalog.map((e) => e.group))];
const shown = computed(() =>
  catalog.filter((e) =>
    query.value
      ? `${e.name} ${e.description}`
          .toLocaleLowerCase()
          .includes(query.value.toLocaleLowerCase())
      : e.group === group.value,
  ),
);
const effects = computed(() =>
  a.config.effects.filter((e) => s.selectedKeys.includes(e.key)),
);
const objects = computed(() =>
  s.current.blockKeys.filter((k) => !s.current.elements[k]?.engineKind),
);
const presets = computed(() =>
  localAssets.motions.filter((p) => p.effects?.length),
);
const label = (k) => s.current.elements[k]?.name || k;
function add(kind) {
  a.addEffect(kind);
  a.preview = true;
}
function moved(id) {
  if (dragged.value) a.moveEffect(dragged.value, id, dropAfter.value);
  dragged.value = "";
  drop.value = "";
}
async function save(effect) {
  saving.value = true;
  try {
    const preset = captureEffect(
      effect,
      s.current.positions[effect.key],
      a.config.clips,
      effect.name || names[effect.kind]?.name,
    );
    await upsertAsset("motions", preset);
    s.notify("Préréglage enregistré dans la bibliothèque locale.");
  } catch (e) {
    s.notify(e.message);
  } finally {
    saving.value = false;
  }
}
function apply(p) {
  if (
    a.config.effects.length + p.effects.length * s.selectedKeys.length >
    100
  ) {
    s.notify("Limite de 100 effets.");
    return;
  }
  if (
    a.time + p.clip.duration > 120 ||
    (p.clip.frames.length &&
      a.config.clips.length + s.selectedKeys.length > 100)
  ) {
    s.notify("Le préréglage dépasserait les limites de la scène.");
    return;
  }
  a.beginGesture();
  try {
    for (const key of s.selectedKeys) {
      const r = applyMotion(
        p,
        s.current.positions[key],
        key,
        a.time,
        p.clip.duration,
      );
      a.config.effects.push(...r.effects);
      if (r.clip.frames.length) a.config.clips.push(r.clip);
    }
    a.config.duration = Math.max(a.config.duration, a.time + p.clip.duration);
    a.preview = true;
  } catch (e) {
    s.notify(e.message);
  } finally {
    a.endGesture();
  }
}
function fields(e) {
  if (
    ["gravity", "wind", "collider", "array", "subtract", "intersect"].includes(
      e.kind,
    )
  )
    return [];
  const list = [];
  if (
    ![
      "fade",
      "transition",
      "morph",
      "wipe",
      "radial",
      "dissolve",
      "mosaic",
      "metallic",
      "pathDeform",
      "drawPath",
    ].includes(e.kind)
  )
    list.push([
      "amount",
      e.kind === "blur"
        ? "Flou"
        : e.kind === "sway"
          ? "Angle"
          : e.kind === "trail"
            ? "Espacement · ms"
            : e.kind === "dashFlow"
              ? "Vitesse du contour"
              : "Intensité",
      e.kind === "sway" ? -90 : 0,
      e.kind === "sway" ? 90 : e.kind === "hue" ? 360 : 500,
      1,
    ]);
  if (
    ["sway", "wave", "twist", "glitch", "pulse", "flicker", "neon"].includes(
      e.kind,
    )
  )
    list.push(["frequency", "Fréquence · Hz", 0, 10, 0.1]);
  return list;
}
</script>
<template>
  <div class="animation-collections inspector-categories" style="grid-template-columns:repeat(3,minmax(0,1fr))"><button v-for="[id,name] in [['effects','Effets'],['motion','Mouvement'],['relations','Relations']]" :key="id" :class="{active:collection===id}" @click="collection=id">{{name}}</button></div>
  <p v-if="!s.selectedKeys.length" class="field-help">
    Sélectionne un objet, puis ajoute un effet. Les originaux restent
    modifiables.
  </p>
  <template v-else-if="collection==='effects'">
    <InspectorDrawer
      id="add-animation-effect"
      title="Ajouter un effet"
      :icon="Plus"
    >
      <label class="effect-search"
        ><Search :size="14" /><input
          v-model="query"
          type="search"
          placeholder="Rechercher un effet"
          aria-label="Rechercher un effet"
      /></label>
      <label v-if="!query"
        >Catégorie<select v-model="group">
          <option v-for="g in groups" :key="g">{{ g }}</option>
        </select></label
      >
      <div class="effect-gallery">
        <button
          v-for="item in shown"
          :key="item.id"
          type="button"
          class="effect-card"
          :title="item.description"
          @click="previewKind=item.id"
        >
          <EffectPreview
            v-if="visualEffectKinds.includes(item.id)"
            :kind="item.id"
            :theme="s.theme"
          /><component v-else :is="item.icon" :size="28" /><span>{{
            item.name
          }}</span>
        </button>
      </div>
      <p v-if="!shown.length" class="field-help">
        Aucun effet pour cette recherche.
      </p>
      <button
        class="btn full"
        @click="
          a.addClip();
          a.addPath();
        "
      >
        <Route :size="14" />Suivre une spline
      </button>
      <template v-if="presets.length"
        ><p class="field-help">Mes préréglages</p>
        <button
          v-for="p in presets"
          class="btn full"
          :key="p.id"
          @click="apply(p)"
        >
          <Bookmark :size="14" />{{ p.name }}
        </button></template
      >
    </InspectorDrawer>
    <p v-if="effects.length" class="field-help">
      {{ effects.length }} effet(s) · glisse une poignée pour changer l’ordre.
    </p>
    <div
      v-for="effect in effects"
      :key="effect.id"
      class="effect-stack-item"
      :class="{
        'effect-drop': drop === effect.id,
        'effect-drop-after': drop === effect.id && dropAfter,
      }"
      @dragover.prevent="
        drop = effect.id;
        dropAfter =
          $event.clientY >
          $event.currentTarget.getBoundingClientRect().top +
            $event.currentTarget.getBoundingClientRect().height / 2;
      "
      @dragleave="drop = ''"
      @drop.prevent="moved(effect.id)"
    >
      <div class="effect-stack-tools">
        <button
          class="icon-btn"
          draggable="true"
          aria-label="Déplacer l’effet"
          title="Glisser pour réorganiser"
          @dragstart="
            dragged = effect.id;
            $event.dataTransfer.setData('text/plain', effect.id);
          "
          @dragend="
            dragged = '';
            drop = '';
          "
        >
          <GripVertical :size="14" /></button
        ><input
          type="checkbox"
          v-model="effect.enabled"
          :aria-label="'Activer ' + (effect.name || names[effect.kind]?.name)"
        /><span>{{ label(effect.key) }}</span
        ><button
          class="icon-btn"
          title="Dupliquer l’effet"
          aria-label="Dupliquer l’effet"
          @click="a.duplicateEffect(effect.id)"
        >
          <Copy :size="13" /></button
        ><button
          class="icon-btn"
          title="Retirer l’effet"
          aria-label="Retirer l’effet"
          @click="a.removeEffect(effect.id)"
        >
          <Trash2 :size="13" />
        </button>
      </div>
      <InspectorDrawer
        :id="'effect-' + effect.id"
        :title="effect.name || names[effect.kind]?.name || 'Effet'"
        :icon="names[effect.kind]?.icon || Sparkles"
      >
        <p class="field-help">{{ names[effect.kind]?.description }}</p>
        <template
          v-if="
            ['transition', 'morph', 'subtract', 'intersect'].includes(
              effect.kind,
            )
          "
          ><label
            >{{
              ["subtract", "intersect"].includes(effect.kind)
                ? "Forme de découpe"
                : "Objet d’arrivée"
            }}<select v-model="effect.target">
              <option value="">Choisir un objet</option>
              <option
                v-for="key in objects.filter(
                  (k) =>
                    k !== effect.key &&
                    (!['subtract', 'intersect', 'morph'].includes(
                      effect.kind,
                    ) ||
                      s.current.elements[k]?.type === 'shape'),
                )"
                :key="key"
                :value="key"
              >
                {{ label(key) }}
              </option>
            </select></label
          ><label
            v-if="['transition', 'morph'].includes(effect.kind)"
            class="checkbox-label"
            ><input type="checkbox" v-model="effect.hideTarget" />Masquer
            l’original d’arrivée</label
          >
          <p v-if="effect.kind === 'morph'" class="field-help">
            Deux formes fermées simples : interpolation des contours. Les autres
            objets utilisent un fondu.
          </p></template
        >
        <template v-if="visualEffectKinds.includes(effect.kind)">
          <template v-if="true"
            ><div class="position-grid">
              <label
                >Début · s<input
                  type="number"
                  v-model.number="effect.start"
                  min="0"
                  :max="a.config.duration"
                  step=".1" /></label
              ><label
                >Durée · s<input
                  type="number"
                  v-model.number="effect.duration"
                  min=".05"
                  max="120"
                  step=".1"
              /></label>
            </div>
            <label
              v-if="timedEffectKinds.includes(effect.kind)"
              class="checkbox-label"
              ><input type="checkbox" v-model="effect.reverse" />Inverser</label
            ><label class="checkbox-label"
              ><input type="checkbox" v-model="effect.loop" />Répéter
              l’effet</label
            ><NumberRange
              v-if="timedEffectKinds.includes(effect.kind)"
              label="Progression"
              unit="%"
              :min="0"
              :max="100"
              :model-value="
                a.propertyValue(effectField(effect.id, 'progress')) * 100
              "
              @update:model-value="
                a.setProperty(effectField(effect.id, 'progress'), $event / 100)
              "
              ><template #actions
                ><AnimationKeyButton
                  :studio="s"
                  :field="effectField(effect.id, 'progress')" /></template
            ></NumberRange>
            <p class="field-help">
              Le temps pilote la progression. Un losange permet de la piloter
              par clés.
            </p></template
          >
          <NumberRange
            v-for="[field, title, min, max, step] in fields(effect)"
            :key="field"
            :label="title"
            :min="min"
            :max="max"
            :step="step"
            :model-value="a.propertyValue(effectField(effect.id, field))"
            @update:model-value="
              a.setProperty(effectField(effect.id, field), $event)
            "
            ><template #actions
              ><AnimationKeyButton
                :studio="s"
                :field="effectField(effect.id, field)" /></template
          ></NumberRange>
          <label v-if="effect.kind === 'wipe'"
            >Direction<select v-model="effect.direction">
              <option value="right">Vers la droite</option>
              <option value="left">Vers la gauche</option>
              <option value="up">Vers le haut</option>
              <option value="down">Vers le bas</option>
            </select></label
          >
          <template
            v-if="['shadow', 'glow', 'neon', 'metallic'].includes(effect.kind)"
            ><PaletteColor
              :element="effect"
              field="color"
              label="Couleur"
              :theme="s.theme" /><PaletteColor
              v-if="effect.kind === 'metallic'"
              :element="effect"
              field="color2"
              label="Reflets sombres"
              :theme="s.theme"
          /></template>
          <template
            v-if="
              [
                'shatter',
                'scatter',
                'collapse',
                'rebuild',
                'dissolve',
                'mosaic',
              ].includes(effect.kind)
            "
            ><NumberRange
              label="Finesse des fragments"
              :min="2"
              :max="40"
              :model-value="effect.cells"
              @update:model-value="effect.cells = $event"
            /><label
              v-if="['shatter', 'collapse', 'rebuild'].includes(effect.kind)"
              >Forme des morceaux<select v-model="effect.pieces">
                <option value="squares">Carrés</option>
                <option value="triangles">Triangles</option>
              </select></label
            ></template
          >
          <label v-if="effect.kind === 'pathDeform'"
            >Spline<select v-model="effect.pathId">
              <option value="">Choisir un chemin</option>
              <option
                v-for="path in a.config.paths"
                :key="path.id"
                :value="path.id"
              >
                {{ path.name }}
              </option>
            </select></label
          >
          <p
            v-if="effect.kind === 'pathDeform' && !a.config.paths.length"
            class="field-help"
          >
            Ajoute d’abord une spline à la scène.
          </p>
          <template v-if="effect.kind === 'revealText'"
            ><label
              >Découpage<select v-model="effect.unit">
                <option value="letter">Par lettre</option>
                <option value="word">Par mot</option>
                <option value="line">Par ligne</option>
              </select></label
            ><label class="checkbox-label"
              ><input type="checkbox" v-model="effect.disperse" />Disperser les
              éléments</label
            ></template
          >
          <details class="effect-advanced">
            <summary>Réglages avancés</summary>
            <label>Nom<input v-model="effect.name" maxlength="80" /></label
            ><template
              v-if="
                ['shatter', 'scatter', 'collapse', 'rebuild'].includes(
                  effect.kind,
                )
              "
              ><NumberRange
                label="Gravité"
                :min="-2000"
                :max="2000"
                :model-value="
                  a.propertyValue(effectField(effect.id, 'gravity'))
                "
                @update:model-value="
                  a.setProperty(effectField(effect.id, 'gravity'), $event)
                "
                ><template #actions
                  ><AnimationKeyButton
                    :studio="s"
                    :field="
                      effectField(effect.id, 'gravity')
                    " /></template></NumberRange
              ><NumberRange
                label="Vent"
                :min="-2000"
                :max="2000"
                :model-value="effect.wind"
                @update:model-value="effect.wind = $event" /><NumberRange
                label="Rotation des fragments"
                :min="-720"
                :max="720"
                :model-value="effect.rotation"
                @update:model-value="effect.rotation = $event" /></template
            ><template v-if="['sway', 'pulse'].includes(effect.kind)"
              ><NumberRange
                label="Pivot horizontal"
                :min="0"
                :max="1"
                :step="0.01"
                :model-value="effect.pivotX"
                @update:model-value="effect.pivotX = $event" /><NumberRange
                label="Pivot vertical"
                :min="0"
                :max="1"
                :step="0.01"
                :model-value="effect.pivotY"
                @update:model-value="effect.pivotY = $event" /></template
            ><NumberRange
              v-if="
                [
                  'revealText',
                  'shatter',
                  'scatter',
                  'collapse',
                  'rebuild',
                ].includes(effect.kind)
              "
              label="Décalage entre éléments"
              :min="0"
              :max="0.95"
              :step="0.01"
              :model-value="effect.stagger"
              @update:model-value="effect.stagger = $event"
            /><label
              >Variante aléatoire<input
                type="number"
                v-model.number="effect.seed"
                min="0"
                max="1000000" /></label
            ><button
              class="btn full"
              @click="effect.seed = Math.floor(Math.random() * 1000000)"
            >
              Nouvelle variante
            </button>
          </details>
        </template>
        <template v-else-if="effect.kind === 'array'"
          ><NumberRange
            label="Nombre"
            :min="1"
            :max="30"
            :model-value="effect.count"
            @update:model-value="effect.count = $event" /><label
            >Décalage X<input type="number" v-model.number="effect.dx" /></label
          ><label
            >Décalage Y<input type="number" v-model.number="effect.dy" /></label
        ></template>
        <template v-else-if="['gravity', 'wind'].includes(effect.kind)"
          ><NumberRange
            :label="
              effect.kind === 'gravity' ? 'Force de gravité' : 'Force du vent'
            "
            :min="-2000"
            :max="2000"
            :model-value="
              effect[effect.kind === 'gravity' ? 'gravity' : 'amount']
            "
            @update:model-value="
              effect[effect.kind === 'gravity' ? 'gravity' : 'amount'] = $event
            "
          /><NumberRange
            label="Résistance de l’air"
            :min="0"
            :max="10"
            :step="0.05"
            :model-value="effect.drag"
            @update:model-value="effect.drag = $event"
          /><NumberRange
            label="Rebond"
            :min="0"
            :max="1"
            :step="0.05"
            :model-value="effect.bounce"
            @update:model-value="effect.bounce = $event"
          /><NumberRange
            label="Frottement"
            :min="0"
            :max="1"
            :step="0.05"
            :model-value="effect.friction"
            @update:model-value="effect.friction = $event"
          />
          <p class="field-help">
            Ajoute « Obstacle » à un rectangle pour arrêter la chute.
          </p></template
        >
        <p v-else-if="effect.kind === 'collider'" class="field-help">
          Le cadre de cet objet arrête les objets soumis à la gravité ou au
          vent.
        </p>
        <template v-else-if="!['subtract', 'intersect'].includes(effect.kind)"
          ><NumberRange
            label="Amplitude"
            :min="0"
            :max="500"
            :model-value="effect.amount"
            @update:model-value="effect.amount = $event" /><NumberRange
            label="Fréquence · Hz"
            :min="0"
            :max="20"
            :step="0.1"
            :model-value="effect.frequency"
            @update:model-value="effect.frequency = $event"
        /></template>
        <div class="effect-actions">
          <button
            class="btn"
            :disabled="saving"
            @click="save(effect)"
            title="Enregistrer les réglages comme préréglage"
          >
            <Bookmark :size="13" />Mémoriser</button
          ><button
            class="icon-btn"
            aria-label="Réinitialiser l’effet"
            title="Réinitialiser les réglages"
            @click="a.resetEffect(effect.id)"
          >
            <RotateCcw :size="14" />
          </button>
        </div>
      </InspectorDrawer>
    </div>

  </template>
  <Teleport to="body"><div v-if="previewKind" class="modal-backdrop effect-preview-backdrop" @click.self="previewKind=null"><section class="effect-preview-dialog" role="dialog" aria-modal="true" aria-label="Aperçu de l’effet" @keydown.esc="previewKind=null"><div class="export-heading"><h2>{{names[previewKind]?.name}}</h2><button ref="previewClose" class="icon-btn" aria-label="Fermer l’aperçu" @click="previewKind=null"><X :size="18"/></button></div><EffectPreview :key="previewKind" :kind="previewKind" :theme="s.theme" :sample="previewSample" autoplay/><p class="field-help">{{names[previewKind]?.description}}</p><div class="key-actions"><button class="btn" @click="previewKind=null">Annuler</button><button class="btn primary" @click="add(previewKind);previewKind=null">Appliquer à la sélection</button></div></section></div></Teleport>
  <template v-if="collection==='motion'"><AnimationProperties :studio="s"/><AnimationWorkbench :studio="s" context="motion"/><AnimationVectorBridge :studio="s"/></template>
  <template v-if="collection==='relations'"><AnimationContacts :studio="s"/><AnimationWorkbench :studio="s" context="relations"/></template>
</template>
<style scoped>
.effect-preview-dialog{width:min(620px,calc(100vw - 40px));padding:24px;background:var(--panel,#172125);border:1px solid var(--border);border-radius:12px}
.effect-preview-dialog :deep(canvas){height:280px;width:100%}

.effect-search {
  display: flex;
  align-items: center;
  gap: 8px;
}
.effect-search input {
  min-width: 0;
  flex: 1;
}
.effect-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}
.effect-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  min-height: 76px;
}
.effect-card:hover {
  border-color: var(--mint);
}
.effect-stack-tools {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: var(--muted);
}
.effect-stack-tools span {
  font-size: 10px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.effect-stack-tools input {
  width: 14px;
  height: 14px;
  margin: 0;
}
.effect-stack-tools [draggable] {
  cursor: grab;
}
.effect-drop {
  box-shadow: 0 -2px var(--mint);
}
.effect-drop-after {
  box-shadow: 0 2px var(--mint);
}
.effect-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 0;
}
.effect-advanced > summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 11px;
  padding: 12px 0;
}
.effect-advanced[open] {
  padding-bottom: 8px;
}
</style>
