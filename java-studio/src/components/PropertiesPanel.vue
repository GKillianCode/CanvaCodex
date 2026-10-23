<script setup>
import TimecodeInput from "./TimecodeInput.vue";
import AnimationCounterProperties from "./AnimationCounterProperties.vue";
import AnimationPresenceProperties from "./AnimationPresenceProperties.vue";
import TransformFields from "./TransformFields.vue";
import InspectorShell from "./InspectorShell.vue";
import FontSelect from "./FontSelect.vue";
import PlacementControls from "./PlacementControls.vue";
import MediaProperties from "./MediaProperties.vue";
import GroupLayoutControls from "./GroupLayoutControls.vue";
import BackgroundProperties from "./BackgroundProperties.vue";
import AnimationAudioProperties from "./AnimationAudioProperties.vue";
import AnimationBackground from "./AnimationBackground.vue";
import AnimationKeyInspector from "./AnimationKeyInspector.vue";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import AnimationEffects from "./AnimationEffects.vue";
import AnimationEngines from "./AnimationEngines.vue";
import PaletteColor from "./PaletteColor.vue";
import AnimationProperties from "./AnimationProperties.vue";
import { reactive, ref, watch, nextTick, provide, computed } from "vue";
import { fonts, fontCss } from "../fonts.js";
import { textRoles, textRole } from "../textRoles.js";
import { presets, visibleBlocks, blockLabel, blockType } from "../model.js";
import { slideAnchors } from "../slidePlacement.js";
import {
  Lock,
  LockOpen,
  Pencil,
  Copy,
  Trash2,
  Play,
  SlidersHorizontal,
  Palette,
  Move,
  Sparkles,
  Layers,
  Box,
  Square,
  Presentation,
} from "lucide-vue-next";
import PedagogicalSteps from "./PedagogicalSteps.vue";
import NotesEditor from "./NotesEditor.vue";
import MotionProperties from "./MotionProperties.vue";
import SvgProperties from "./SvgProperties.vue";
import { validSvgSource } from "../svg.js";
import { imageEffects } from "../imageEffects.js";
import NumberRange from "./NumberRange.vue";
import TypewriterProperties from "./TypewriterProperties.vue";
import InspectorDrawer from "./InspectorDrawer.vue";
import BitsProperties from "./BitsProperties.vue";
import { javaPrimitives, setPrimitive } from "../javaPrimitives.js";
import TableProperties from "./TableProperties.vue";
import ShapeProperties from "./ShapeProperties.vue";
import ShapeImageProperties from "./ShapeImageProperties.vue";
import { isOpenShape } from "../shapes.js";
import TextStyleProperties from "./TextStyleProperties.vue";
import ListProperties from "./ListProperties.vue";
import AppearanceOrder from "./AppearanceOrder.vue";
import ComponentsPanel from "./ComponentsPanel.vue";
import MultiProperties from "./MultiProperties.vue";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  section = ref("element"),
  category = ref("style"),
  panel = ref(null),
  scrolls = {};
const body = computed(() => panel.value?.body);
const drawers = reactive({});
provide("inspectorDrawers", drawers);
const tabs = computed(() => [
    ["element", "Objet", Square],
    [
      "slide",
      s.isAnimation
        ? "Scène"
        : s.view === "banners" || s.isThumbnail
          ? "Format"
          : "Diapo",
      Presentation,
    ],
    ...(s.isAnimation ? [["engines", "Animation", Sparkles]] : []),
    ["layers", "Calques", Layers],
    ["components", "Composants", Box],
  ]),
  categories = [
    ["style", "Style", SlidersHorizontal],
    ["colors", "Couleurs", Palette],
    ["layout", "Placement", Move],
    ["motion", "Animation", Sparkles],
  ];
const scrollKey = computed(
  () =>
    section.value + ":" + (section.value === "element" ? category.value : ""),
);
function switchTo(target) {
  if (body.value) scrolls[scrollKey.value] = body.value.scrollTop;
  section.value = target;
  nextTick(() => {
    if (body.value) body.value.scrollTop = scrolls[scrollKey.value] || 0;
  });
}
function chooseCategory(target) {
  if (body.value) scrolls[scrollKey.value] = body.value.scrollTop;
  category.value = target;
  nextTick(() => {
    if (body.value) body.value.scrollTop = scrolls[scrollKey.value] || 0;
  });
}
watch(
  () => s.animation?.inspectedEffect,
  async (request) => {
    if (!request) return;
    switchTo("engines");
    for (const key of Object.keys(drawers)) drawers[key] = false;
    drawers["effect-" + request.id] = true;
    await nextTick();
    body.value
      ?.querySelector('[data-drawer="effect-' + request.id + '"]')
      ?.scrollIntoView({ block: "nearest" });
  },
  { flush: "post" },
);
watch(
  () => s.selectionScope,
  (value) => {
    if (!["layers", "components"].includes(section.value))
      switchTo(value === "slides" ? "slide" : "element");
  },
);
watch(
  () => s.selectedKeys.join("|"),
  () => {
    if (s.isAnimation && s.selectedKeys.length) {
      switchTo("element");
    }
    if (s.isAnimation && section.value === "engines" && s.selectedKeys.length)
      switchTo("element");
    if (
      s.selectedKeys.length &&
      section.value === "slide" &&
      s.selectionScope === "elements"
    )
      switchTo("element");
    const top = body.value?.scrollTop || 0;
    nextTick(() => {
      if (body.value) body.value.scrollTop = top;
    });
  },
  { flush: "pre" },
);
const pixels = (v) => Math.round((v * s.resolution.width) / 1920),
  isText = computed(() => ["text", "code"].includes(s.selectedType)),
  object = computed(() => s.current.elements[s.selected]);
</script>
<template>
  <InspectorShell
    ref="panel"
    :tabs="tabs"
    :active="section"
    :count="s.selectedKeys.length"
    @select="switchTo"
    @resize="s.resizePanel($event, 'inspectorWidth')"
    ><template #context>
      <div
        v-if="section === 'element' && s.selectedKeys.length"
        class="inspector-object"
      >
        <div>
          <strong>{{
            s.selected
              ? blockLabel(s.current, s.selected)
              : "Sélection multiple"
          }}</strong
          ><small>{{
            {
              text: "Texte",
              code: "Code Java",
              shape: "Forme",
              image: "Image",
              table: "Tableau",
              bits: "Octets et bits",
            }[
              s.selectedKeys.length > 1
                ? s.multiType?.split(":")[0]
                : s.selectedType
            ] || "Groupe d’objets"
          }}</small>
        </div>
        <button
          v-if="s.selected && (isText || s.selectedType === 'table') && (!s.isAnimation || !s.animation.config.counters[s.selected])"
          class="icon-btn"
          aria-label="Éditer le contenu"
          title="Éditer le contenu"
          @click="
            s.workspace = 'editor';
            s.editSelected();
          "
        >
          <Pencil :size="15" /></button
        ><button
          class="icon-btn"
          @click="s.duplicateSelected"
          aria-label="Dupliquer la sélection"
          title="Dupliquer · Ctrl D"
        >
          <Copy :size="15" /></button
        ><button
          class="icon-btn"
          :aria-label="
            s.selectedKeys.every((k) => s.current.positions[k]?.locked)
              ? 'Déverrouiller la sélection'
              : 'Verrouiller la sélection'
          "
          :title="
            s.selectedKeys.every((k) => s.current.positions[k]?.locked)
              ? 'Déverrouiller'
              : 'Verrouiller le placement'
          "
          @click="s.toggleLock()"
        >
          <component
            :is="
              s.selectedKeys.every((k) => s.current.positions[k]?.locked)
                ? Lock
                : LockOpen
            "
            :size="15"
          /></button
        ><button
          class="icon-btn"
          @click="s.removeBlock"
          aria-label="Supprimer la sélection"
          title="Supprimer"
        >
          <Trash2 :size="15" />
        </button>
      </div>
      <div
        v-if="
          section === 'element' && s.selectedKeys.length && !s.animation?.engine
        "
        class="inspector-categories"
      >
        <button
          v-for="[id, label, icon] in categories"
          :key="id"
          :class="{ active: category === id }"
          :aria-pressed="category === id"
          @click="chooseCategory(id)"
        >
          <component :is="icon" :size="14" /><span>{{ label }}</span>
        </button>
      </div> </template
    ><AnimationKeyInspector v-if="s.isAnimation" :studio="s" /><InspectorDrawer
      v-if="section === 'element' && s.selectedInstance"
      id="component-instance"
      title="Composant lié"
      :icon="Box"
      ><p class="field-help">
        {{
          s.componentDefinition(s.selectedInstance)?.name ||
          "Source indisponible"
        }}
      </p>
      <label v-if="s.componentDefinition(s.selectedInstance)"
        >État<select
          :value="s.selectedInstance.stateId"
          @change="s.setComponentState($event.target.value)"
        >
          <option
            v-for="state in s.componentStates(
              s.componentDefinition(s.selectedInstance),
            )"
            :key="state.id"
            :value="state.id"
          >
            {{ state.name }}
          </option>
        </select></label
      ><a
        class="btn full"
        :href="
          '#/composants/' + encodeURIComponent(s.selectedInstance.componentId)
        "
        target="_blank"
        rel="noopener"
        >Éditer le composant</a
      ><button class="btn full" @click="s.detachComponent()">
        Détacher cette instance
      </button></InspectorDrawer
    >
    <AnimationEffects
      v-if="s.isAnimation && section === 'engines'"
      :studio="s"
    /><ComponentsPanel v-else-if="section === 'components'" :studio="s" />
    <section v-else-if="section === 'layers'" class="layers-panel">
      <p class="field-help">
        Premier plan en haut · {{ visibleBlocks(s.current).length }} objets
      </p>
      <InspectorDrawer
        v-if="s.selectedKeys.length"
        id="layers-order"
        title="Superposition"
        ><div class="layer-controls">
          <button
            v-for="[id, name] in [
              ['front', 'Premier plan'],
              ['back', 'Arrière-plan'],
              ['forward', 'Avancer'],
              ['backward', 'Reculer'],
            ]"
            :key="id"
            class="btn"
            @click="s.setLayer(id)"
          >
            {{ name }}
          </button>
        </div>
        <label
          >Rang · z-index<input
            type="number"
            min="1"
            :max="visibleBlocks(s.current).length"
            :value="
              Math.min(
                ...s.selectedKeys.map(
                  (k) => visibleBlocks(s.current).indexOf(k) + 1,
                ),
              )
            "
            aria-label="Rang de la sélection"
            @input="
              s.setLayer('rank', $event.target.value)
            " /></label></InspectorDrawer
      ><button
        v-for="(key, n) in visibleBlocks(s.current).slice().reverse()"
        :key="key"
        :class="['layer-row', { active: s.selectedKeys.includes(key) }]"
        :aria-pressed="s.selectedKeys.includes(key)"
        @click="s.selectLayer(key, $event)"
      >
        <span class="layer-rank">{{ visibleBlocks(s.current).length - n }}</span
        ><span
          ><strong>{{ blockLabel(s.current, key) }}</strong
          ><small>{{
            {
              text: "Texte",
              code: "Code Java",
              shape: "Forme",
              image: "Image",
              table: "Tableau",
              bits: "Octets et bits",
            }[blockType(s.current, key)]
          }}</small></span
        ><span
          role="button"
          tabindex="0"
          :aria-label="
            (s.current.positions[key]?.locked
              ? 'Déverrouiller '
              : 'Verrouiller ') + blockLabel(s.current, key)
          "
          :title="
            s.current.positions[key]?.locked
              ? 'Déverrouiller'
              : 'Verrouiller le placement'
          "
          @click.stop="s.toggleLock([key])"
          @keydown.enter.stop.prevent="s.toggleLock([key])"
          @keydown.space.stop.prevent="s.toggleLock([key])"
          ><component
            :is="s.current.positions[key]?.locked ? Lock : LockOpen"
            :size="14"
        /></span>
      </button>
      <p class="field-help">Ctrl + clic pour sélectionner plusieurs calques.</p>
    </section>
    <AnimationEngines
      v-else-if="
        s.isAnimation &&
        section === 'element' &&
        s.current.elements[s.selected]?.engineKind
      "
      :studio="s"
    /><template v-else-if="section === 'element'">
      <InspectorDrawer
        v-if="s.selectedKeys.length && category === 'colors'"
        id="object-opacity"
        title="Opacité"
        ><AnimationKeyButton :studio="s" field="opacity" /><NumberRange
          label="Opacité des éléments"
          unit="%"
          :model-value="
            s.isAnimation
              ? s.animation.propertyValue('opacity')
              : s.selectedOpacity
          "
          @update:model-value="
            s.isAnimation
              ? s.animation.setProperty('opacity', $event)
              : s.updateOpacity($event)
          "
        />
        <p v-if="s.selectedKeys.length > 1" class="field-help">
          Le curseur applique la même opacité à tous les objets sélectionnés.
        </p></InspectorDrawer
      >
      <p v-if="!s.selectedKeys.length" class="inspector-empty">
        Sélectionne un objet pour le personnaliser.
      </p>
      <InspectorDrawer
        v-if="
          s.selectedKeys.length > 1 && !s.multiType && category === 'layout'
        "
        id="selection-frame"
        title="Cadre de la sélection"
        ><div class="position-grid">
          <label
            v-for="[key, name] in [
              ['x', 'Position X'],
              ['y', 'Position Y'],
              ['w', 'Largeur'],
              ['h', 'Hauteur'],
            ]"
            :key="key"
            >{{ name
            }}<output
              >{{ pixels(s.selectionBounds?.[key] || 0) }} px</output
            ></label
          >
        </div></InspectorDrawer
      ><InspectorDrawer
        v-if="
          !s.isAnimation &&
          s.selectedKeys.length > 1 &&
          !s.multiType &&
          category === 'motion'
        "
        id="multi-motion"
        title="Apparition du groupe"
        ><label
          >Étape<input
            type="number"
            min="0"
            max="20"
            :value="s.commonProperty('fragment', 'order') ?? ''"
            placeholder="Mixte"
            @change="
              s.updateAppearance(s.selectedKeys, 'order', $event.target.value)
            " /></label
        ><MotionProperties
          :animation="s.commonProperty('fragment', 'animation')"
          :exit-animation="s.commonProperty('fragment', 'exitAnimation')"
          @change="
            (field, value) => s.updateAppearance(s.selectedKeys, field, value)
          " /></InspectorDrawer
      ><MultiProperties
        v-if="
          s.selectedKeys.length > 1 && (!s.isAnimation || category !== 'motion')
        "
        :studio="s"
        :mode="category"
      />
      <AnimationCounterProperties v-if="s.isAnimation && s.selected && s.animation.config.counters[s.selected] && category === 'style'" :studio="s" />
      <AnimationPresenceProperties v-if="s.isAnimation && section === 'element' && s.selectedKeys.length && category === 'style'" :studio="s" />
      <AnimationProperties
        v-if="s.isAnimation && category === 'motion'"
        :studio="s"
      /><InspectorDrawer
        v-if="
          category === 'motion' &&
          s.selectedKeys.length &&
          s.selectedKeys.every((k) =>
            ['text', 'code'].includes(blockType(s.current, k)),
          )
        "
        id="typewriter"
        title="Écriture progressive"
        ><TypewriterProperties
          :value="s.current.positions[s.selectedKeys[0]].typewriter"
          @change="s.updateTypewriter"
        />
        <p v-if="s.selectedKeys.length > 1" class="field-help">
          Les réglages modifiés s’appliquent à tous les textes sélectionnés.
        </p></InspectorDrawer
      >
      <InspectorDrawer
        v-if="
          ['slides', 'banners'].includes(s.application) &&
          s.selectedKeys.length &&
          category === 'motion'
        "
        id="step-interpolation"
        title="Transition entre étapes"
        ><label class="checkbox-label"
          ><input
            type="checkbox"
            :checked="s.selectedInterpolation"
            @change="s.setInterpolation($event.target.checked)"
          />Interpoler la position et la taille</label
        >
        <p class="field-help">
          Mouvement fluide de 0,5 s entre les étapes pédagogiques. Activé pour
          cet objet dans tous les états de la composition. Modifie sa position
          ou sa taille à l’étape suivante, puis teste en présentation ou avec
          Animer.
        </p></InspectorDrawer
      >
      <template v-if="s.selected && s.selectedKeys.length === 1">
        <div v-show="category === 'style'">
          <InspectorDrawer id="identity" title="Nom de l’objet"
            ><label
              >Nom<input
                v-model="s.selectedName"
                :placeholder="blockLabel(s.current, s.selected)"
                maxlength="100"
                aria-label="Nom de l’élément" /></label
          ></InspectorDrawer>
          <InspectorDrawer v-if="isText" id="typography" title="Typographie"
            ><label v-if="s.selectedType === 'text'"
              >Style de texte<select
                :value="textRole(s.current, s.selected).id"
                aria-label="Style de texte"
                @change="s.setTextRole($event.target.value)"
              >
                <option
                  v-for="role in textRoles"
                  :key="role.id"
                  :value="role.id"
                >
                  {{ role.name }} ·
                  {{ role.font === "inter" ? "Inter" : "Montserrat" }}
                </option>
              </select></label
            ><label class="checkbox-label"
              ><input type="checkbox" v-model="s.position.fitFont" />Réduire la
              police pour tenir dans le cadre</label
            ><label
              >Taille · px<AnimationKeyButton :studio="s" field="size" /><input
                type="number"
                aria-label="Taille du texte"
                :value="
                  pixels(
                    s.isAnimation
                      ? s.animation.propertyValue('size')
                      : s.position.size,
                  )
                "
                min="10"
                :max="pixels(260)"
                @change="
                  s.isAnimation
                    ? s.animation.setProperty(
                        'size',
                        (Number($event.target.value) * 1920) /
                          s.resolution.width,
                      )
                    : s.setPosition('size', $event)
                " /></label
            ><FontSelect
              v-model="s.position.font"
              :type="s.selectedType"
              @update:model-value="
                s.refreshTextStyle();
                s.fitSelection();
              " />
            <p v-if="s.fontLoading" class="field-help">
              Chargement de la police…
            </p>
            <TextStyleProperties
              :value="s.selectedTextStyle"
              :font="s.position.font"
              :type="s.selectedType"
              :theme="s.theme"
              @change="s.updateTextStyle"
          /></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'text'"
            id="lists"
            title="Listes"
            ><ListProperties
              :value="s.selectedTextStyle.list"
              :theme="s.theme"
              :scale="s.resolution.width / 1920"
              @change="s.updateTextStyle"
          /></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'text'"
            id="text-frame"
            title="Cadre du texte"
            ><label class="checkbox-label"
              ><input
                type="checkbox"
                v-model="s.position.autoSize"
                @change="
                  s.position.wrapWidth ||= s.position.w;
                  s.fitSelection();
                "
              />Ajuster au contenu</label
            ><label v-if="s.position.autoSize"
              >Largeur maximale · px<input
                type="number"
                aria-label="Largeur maximale du texte"
                :value="pixels(s.position.wrapWidth)"
                min="80"
                :max="s.resolution.width"
                @change="
                  s.position.wrapWidth = Math.max(
                    80,
                    Math.min(
                      1920,
                      (Number($event.target.value) * 1920) / s.resolution.width,
                    ),
                  );
                  s.fitSelection();
                " /></label
          ></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'code'"
            id="code-caption"
            title="Titre du code"
            ><label
              >Nom de fichier<input
                v-model="s.codeCaption"
                maxlength="200"
                placeholder="HelloWorld.java"
                aria-label="Titre de l’extrait de code" /></label
          ></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'shape'"
            id="shape-style"
            title="Forme et contour"
            ><ShapeProperties
              :studio="s"
              :theme="s.theme"
              :shape="object"
              :scale="s.resolution.width / 1920" /><template
              v-if="object.topGap && object.shape === 'rect'"
              ><NumberRange
                label="Début de la découpe"
                unit="%"
                :max="object.topGap[1]"
                :model-value="object.topGap[0]"
                @update:model-value="
                  object.topGap = [$event, object.topGap[1]]
                " /><NumberRange
                label="Fin de la découpe"
                unit="%"
                :min="object.topGap[0]"
                :max="100"
                :model-value="object.topGap[1]"
                @update:model-value="
                  object.topGap = [object.topGap[0], $event]
                " /></template
          ></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'shape' && !isOpenShape(object)"
            id="shape-image"
            title="Image de fond"
            ><ShapeImageProperties :studio="s" :shape="object"
          /></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'image'"
            id="image-style"
            title="Image et cadrage"
            ><MediaProperties
              :element="object"
              :theme="s.theme"
              @upload="s.uploadImage"
              @play="s.playSelectedVideo"
              @video="(e) => s.uploadVideo(e, true)"
            /><button
              v-if="object.mediaKind !== 'video'"
              class="btn full"
              @click="s.imageAsBackground()"
            >
              Utiliser comme image de fond
            </button></InspectorDrawer
          >
        </div>
        <div v-show="category === 'colors'">
          <InspectorDrawer
            v-if="isText || s.selectedType === 'shape'"
            id="colors"
            title="Couleurs"
            ><AnimationKeyButton
              v-if="isText"
              :studio="s"
              field="color" /><TextStyleProperties
              v-if="isText"
              mode="colors"
              :value="
                s.isAnimation
                  ? {
                      ...s.selectedTextStyle,
                      color: s.animation.propertyValue('color'),
                      colorRole: null,
                    }
                  : s.selectedTextStyle
              "
              :font="s.position.font"
              :type="s.selectedType"
              :theme="s.theme"
              @change="s.updateTextStyle" /><ShapeProperties
              v-else
              :studio="s"
              mode="colors"
              :theme="s.theme"
              :shape="object"
              :scale="s.resolution.width / 1920"
          /></InspectorDrawer>
          <InspectorDrawer
            v-if="s.selectedType === 'image' && validSvgSource(object.src)"
            id="svg-colors"
            title="Couleurs du SVG"
            ><SvgProperties :image="object" :theme="s.theme" /></InspectorDrawer
          ><InspectorDrawer
            v-if="s.selectedType === 'image'"
            id="image-effects"
            title="Effets de l’image"
            ><NumberRange
              v-for="effect in imageEffects"
              :key="effect.id"
              :label="effect.label"
              unit="%"
              :max="effect.max"
              :model-value="object.effects?.[effect.id] ?? effect.default"
              @update:model-value="
                object.effects = { ...object.effects, [effect.id]: $event }
              "
            /><button class="btn full" @click="object.effects = {}">
              Réinitialiser les effets
            </button>
            <p class="field-help">
              Flou : 100 % correspond à 40 px sur le canevas.
            </p></InspectorDrawer
          >
          <InspectorDrawer
            v-if="s.selectedType === 'image'"
            id="colors"
            title="Fond de l’image"
            ><label class="checkbox-label"
              ><input type="checkbox" v-model="object.background" />Fond du
              thème derrière l’image</label
            >
            <p class="field-help">
              Les couleurs de la photo sont conservées. Le fond suit la palette
              du diaporama.
            </p></InspectorDrawer
          >
        </div>
        <BitsProperties
          v-if="s.selectedType === 'bits'"
          :mode="category"
          :element="object"
          :position="s.position"
          :theme="s.theme"
        /><TableProperties
          v-if="
            s.selectedType === 'table' &&
            ['style', 'colors', 'layout'].includes(category)
          "
          :mode="category"
          :table="object"
          :position="s.position"
          @edit="
            s.workspace = 'editor';
            s.editSelected();
          "
          :theme="s.theme"
          :scale="s.resolution.width / 1920"
        />
        <InspectorDrawer
          v-show="category === 'layout'"
          id="geometry"
          title="Position et dimensions"
          ><TransformFields
            :value="
              Object.fromEntries(
                ['x', 'y', 'w', 'h', 'rotation'].map((key) => [
                  key,
                  key === 'rotation'
                    ? Math.round(
                        (s.isAnimation
                          ? s.animation.propertyValue('rotation')
                          : s.position.rotation || 0) * 100,
                      ) / 100
                    : pixels(
                        s.isAnimation
                          ? s.animation.propertyValue(key)
                          : s.selectedType === 'shape'
                            ? s.selectedBounds?.[key] || 0
                            : (s.position[key] ??
                              (key === 'h' ? s.selectedBounds?.h || 0 : 0)),
                      ),
                ]),
              )
            "
            :limit="pixels(10000)"
            aria-suffix=" de l’élément"
            @change="
              (key, event) =>
                s.isAnimation
                  ? s.animation.setProperty(
                      key,
                      key === 'rotation'
                        ? Number(event.target.value)
                        : (Number(event.target.value) * 1920) /
                            s.resolution.width,
                    )
                  : key === 'rotation'
                    ? s.setRotation(event)
                    : s.setPosition(key, event)
            "
            ><template #key="{ field }"
              ><AnimationKeyButton
                :studio="s"
                :field="field" /></template></TransformFields
        ></InspectorDrawer>
        <InspectorDrawer
          v-if="!s.isAnimation"
          v-show="category === 'motion'"
          id="appearance"
          title="Apparition"
          ><label
            >Étape<input
              type="number"
              min="0"
              max="20"
              :value="s.current.fragments[s.selected].order"
              @input="s.updateFragment" /></label
          ><MotionProperties
            :animation="s.current.fragments[s.selected].animation"
            :exit-animation="s.current.fragments[s.selected].exitAnimation"
            @change="
              (field, value) => s.updateAppearance([s.selected], field, value)
            "
          />
          <p class="field-help">
            Étape 0 : visible au départ. Espace révèle chaque étape suivante.
          </p></InspectorDrawer
        >
      </template>
      <template v-if="s.selectedKeys.length && category === 'layout'">
        <InspectorDrawer
          v-if="s.selectedKeys.length > 1"
          id="group-layout"
          title="Alignement et espacement"
          ><GroupLayoutControls :studio="s"
        /></InspectorDrawer>
        <InspectorDrawer id="selection-scale" title="Mise à l’échelle">
          <NumberRange
            label="Échelle de la sélection"
            unit="%"
            :min="1"
            :max="1000"
            :step="1"
            :model-value="
              s.isAnimation
                ? s.animation.propertyValue('scale')
                : s.scalePercent
            "
            @update:model-value="
              s.isAnimation
                ? s.animation.setProperty('scale', $event)
                : s.applySelectionScale($event)
            "
            ><template v-if="s.isAnimation" #actions
              ><AnimationKeyButton :studio="s" field="scale" /></template
          ></NumberRange>
          <p class="field-help">
            Objets, texte, contours et espacements sont redimensionnés ensemble.
            Maj + poignée conserve les proportions.
          </p> </InspectorDrawer
        ><InspectorDrawer id="slide-placement" title="Placer sur la diapo"
          ><PlacementControls @place="(x, y) => s.placeObjects(x, y)" /><label
            >Marge · px<input
              type="number"
              min="0"
              :max="s.resolution.height / 2"
              v-model.number="s.placementMargin"
              aria-label="Marge de positionnement" /></label
        ></InspectorDrawer>
        <InspectorDrawer id="object-order" title="Superposition"
          ><div class="layer-controls">
            <button
              v-for="[id, name] in [
                ['front', 'Premier plan'],
                ['back', 'Arrière-plan'],
                ['forward', 'Avancer'],
                ['backward', 'Reculer'],
              ]"
              :key="id"
              class="btn"
              @click="s.setLayer(id)"
            >
              {{ name }}
            </button>
          </div>
          <label
            >Rang · z-index<input
              type="number"
              min="1"
              :max="visibleBlocks(s.current).length"
              :value="
                Math.min(
                  ...s.selectedKeys.map(
                    (k) => visibleBlocks(s.current).indexOf(k) + 1,
                  ),
                )
              "
              aria-label="Rang de la sélection"
              @input="s.setLayer('rank', $event.target.value)" /></label
        ></InspectorDrawer>
      </template>
    </template>
    <InspectorDrawer
      v-if="section === 'slide'"
      id="scene-background"
      title="Fond et motifs"
      ><BackgroundProperties :studio="s" /></InspectorDrawer
    ><template v-if="section === 'slide' && s.isAnimation"
      ><InspectorDrawer id="animation-scene" title="Scène"
        ><label>Nom<input v-model="s.current.title" maxlength="200" /></label
        ><TimecodeInput
          :model-value="s.animation.config.duration"
          label="Durée de la scène"
          :frame-rate="s.animation.config.fps"
          :show-hours="false"
          :min="0.1"
          :max="120"
          :disabled="s.animation.busy"
          @update:model-value="s.animation.beginGesture(); s.animation.config.duration = $event; s.animation.endGesture()"
        /><label
          >Fréquence<select v-model.number="s.animation.config.fps">
            <option v-for="n in [24, 30, 60]" :value="n" :key="n">
              {{ n }} images / seconde
            </option>
          </select></label
        ><AnimationBackground :studio="s" />
        <p class="field-help">
          Le cadre central est exporté. Les objets peuvent être placés à
          l’extérieur pour entrer dans l’image.
        </p></InspectorDrawer
      ><AnimationAudioProperties :studio="s" /></template
    ><template v-else-if="section === 'slide' && s.view === 'banners'"
      ><InspectorDrawer id="overlay-format" title="Composition"
        ><label v-if="s.banner.type === 'java-primitive'"
          >Type primitif<select
            :value="s.current.primitiveType || 'int'"
            aria-label="Type primitif de l’incrustation"
            @change="setPrimitive(s.current, $event.target.value)"
          >
            <option v-for="t in javaPrimitives" :key="t.id" :value="t.id">
              {{ t.id }}
            </option>
          </select></label
        ><label
          >Nom de l’incrustation<input
            v-model="s.current.overlayName"
            maxlength="100" /></label
        ><button class="btn full" @click="s.overlayGallery = true">
          Choisir un format
        </button>
        <p class="field-help">
          Tous les calques sont éditables. Le PNG conserve la transparence.
        </p></InspectorDrawer
      >
      <p v-if="s.banner.type === 'youtube-outro'" class="field-help">
        Gabarit 1920 × 1080 · vidéo et playlist : 640 × 360 · chaîne : cercle de
        294 px. Zones modifiables ; associe ensuite vidéo, playlist et
        abonnement dans YouTube Studio. Le fond vert est un calque verrouillé,
        déverrouillable dans Calques.
      </p>
      <InspectorDrawer id="overlay-steps" title="Étapes"
        ><PedagogicalSteps :studio="s" /></InspectorDrawer
      ><InspectorDrawer id="overlay-video" title="Vidéo animée"
        ><button class="btn primary full" @click="s.openOverlayVideo()">
          <Play :size="14" />Régler les entrées et sorties
        </button>
        <p class="field-help">
          Durée, animations par bloc ou groupe, aperçu et export MOV QTRLE ou
          MKV FFV1 avec transparence, ou WebM sur fond de chrominance.
        </p></InspectorDrawer
      ><InspectorDrawer id="overlay-appearances" title="Ordre des apparitions"
        ><AppearanceOrder
          :slide="s.current"
          @change="s.updateAppearance" /></InspectorDrawer></template
    ><template v-else-if="section === 'slide' && s.isThumbnail"
      ><InspectorDrawer id="thumbnail-composition" title="Composition"
        ><button class="btn full" @click="s.gallery = true">
          Identité de playlist
        </button>
        <p class="field-help">
          Format 16:9. Textes, images et formes restent entièrement modifiables.
        </p></InspectorDrawer
      ></template
    ><template v-else-if="section === 'slide'"
      ><button class="btn full" @click="s.startPresentation(false)">
        <Play :size="14" />Tester cette diapo</button
      ><InspectorDrawer id="pedagogical-steps" title="Étapes pédagogiques"
        ><PedagogicalSteps :studio="s" /></InspectorDrawer
      ><InspectorDrawer id="slide-composition" title="Composition"
        ><label
          >Disposition<select
            v-model="s.current.layout"
            @change="s.applyPreset(s.current.layout)"
          >
            <option v-for="p in presets" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        ><button class="btn full" @click="s.applyPreset(s.current.layout)">
          Réappliquer la disposition</button
        ><button v-if="s.canUndoLayout" class="btn full" @click="s.undoLayout">
          Annuler la recomposition
        </button></InspectorDrawer
      ><InspectorDrawer id="slide-transition" title="Transition"
        ><p class="field-help">{{ s.exitLabel }}</p>
        <label
          >Sortie vers<select
            v-model="s.current.exitDirection"
            aria-label="Direction de sortie"
          >
            <option value="auto">Automatique · canvas</option>
            <option value="left">← Gauche</option>
            <option value="right">→ Droite</option>
            <option value="up">↑ Haut</option>
            <option value="down">↓ Bas</option>
          </select></label
        ><label
          >Durée<select v-model.number="s.transitionMs">
            <option :value="0">Immédiate</option>
            <option :value="350">350 ms</option>
            <option :value="650">650 ms</option>
            <option :value="1000">1 seconde</option>
          </select></label
        ></InspectorDrawer
      ><InspectorDrawer id="slide-appearances" title="Ordre des apparitions"
        ><AppearanceOrder
          :slide="s.current"
          @change="s.updateAppearance" /></InspectorDrawer
      ><InspectorDrawer id="slide-notes" title="Notes de présentation"
        ><NotesEditor
          v-model="s.current.notes"
          :label="
            s.editStep ? 'Notes de cette étape' : 'Notes de l’état initial'
          " /></InspectorDrawer
    ></template>
  </InspectorShell>
</template>
