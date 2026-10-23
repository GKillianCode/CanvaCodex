<script setup>
import { reactive, ref, computed, toRefs } from "vue";
import {
  Link,
  GitBranch,
  Camera,
  Activity,
  Bookmark,
  Plus,
  Trash2,
} from "lucide-vue-next";
import InspectorDrawer from "./InspectorDrawer.vue";
import NumberRange from "./NumberRange.vue";
import AnimationKeyButton from "./AnimationKeyButton.vue";
import { attachmentCycle } from "../animationWorkflow.js";
import { shapes } from "../shapes.js";
import {
  builtinMotions,
  captureMotion,
  applyMotion,
} from "../animationPresets.js";
import { localAssets, upsertAsset, removeAsset } from "../localAssets.js";
const props = defineProps({ studio: Object }),
  s = reactive(props.studio),
  a = s.animation;
const { name, duration, motion } = toRefs(a.motionPrefs);
const objects = computed(() =>
  s.current.blockKeys.filter((k) => !s.current.elements[k]?.engineKind),
);
const label = (k) => s.current.elements[k]?.name || k;
const attachments = computed(() =>
  a.config.attachments.filter((r) => r.child === s.selected),
);
const motions = computed(() => [...builtinMotions, ...localAssets.motions]);
async function run(fn) {
  try {
    await fn();
    s.notify("Modification enregistrée.");
  } catch (e) {
    s.notify(e.message);
  }
}
function attach() {
  const parent = objects.value.find(
    (k) =>
      k !== s.selected && !attachmentCycle(a.config.attachments, s.selected, k),
  );
  if (!parent) return;
  s.animation.beginGesture();
  const scene = a.evaluate().scene,
    p = scene.positions[parent],
    c = scene.positions[s.selected],
    dx = c.x + c.w / 2 - p.x - p.w / 2,
    dy = c.y + c.h / 2 - p.y - p.h / 2,
    angle = (-(p.rotation || 0) * Math.PI) / 180;
  a.config.attachments = a.config.attachments.filter(
    (r) => r.child !== s.selected,
  );
  a.config.attachments.push({
    id: crypto.randomUUID(),
    enabled: true,
    parent,
    child: s.selected,
    parentX: 0.5,
    parentY: 0.5,
    childX: 0.5,
    childY: 0.5,
    offsetX: dx * Math.cos(angle) - dy * Math.sin(angle),
    offsetY: dx * Math.sin(angle) + dy * Math.cos(angle),
    rotate: false,
  });
  a.endGesture();
}
function event() {
  if (a.config.events.length >= 50) return;
  a.config.events.push({
    id: crypto.randomUUID(),
    name: "Nouvel événement",
    enabled: true,
    trigger: "time",
    time: a.time,
    source: "",
    action: "show",
    target: s.selected || objects.value[0] || "",
    value: "#a4c4b4",
  });
}
function apply() {
  const preset = motions.value.find((m) => m.id === motion.value),
    p = s.current.positions[s.selected];
  if (!preset || !p) return;
  if (a.config.clips.length >= 100) throw Error("Limite de 100 séquences.");
  if (preset.path && a.config.paths.length >= 50)
    throw Error("Limite de 50 trajectoires.");
  const result = applyMotion(
    preset,
    p,
    s.selected,
    a.time,
    Number(duration.value),
  );
  a.beginGesture();
  a.config.clips.push(result.clip);
  a.config.effects.push(...result.effects);
  if (result.path) a.config.paths.push(result.path);
  a.config.duration = Math.max(
    a.config.duration,
    a.time + Number(duration.value),
  );
  a.selectClip(result.clip.id);
  a.preview = true;
  a.endGesture();
}
function connector() {
  if (!s.selected || a.config.links.length >= 100) return;
  const to = objects.value.find((k) => k !== s.selected);
  if (to)
    a.config.links.push({
      id: crypto.randomUUID(),
      from: s.selected,
      to,
      color: s.theme.accent,
      width: 3,
    });
}
</script>
<template>
  <InspectorDrawer
    v-if="s.selected && !a.engine"
    id="workflow-attachments"
    title="Attaches et références"
    :icon="Link"
  >
    <p class="field-help">
      Un texte ou une forme peut suivre un parent. Les flèches restent reliées
      aux objets pendant leur mouvement.
    </p>
    <button class="btn full" :disabled="objects.length < 2" @click="attach">
      Attacher cet objet
    </button>
    <div v-for="r in attachments" :key="r.id">
      <label
        >Parent<select v-model="r.parent">
          <option
            v-for="key in objects.filter(
              (k) =>
                k !== s.selected &&
                !attachmentCycle(
                  a.config.attachments.filter((x) => x.id !== r.id),
                  s.selected,
                  k,
                ),
            )"
            :key="key"
            :value="key"
          >
            {{ label(key) }}
          </option>
        </select></label
      ><label
        v-for="[key, text] in [
          ['parentX', 'Ancre parent X'],
          ['parentY', 'Ancre parent Y'],
          ['childX', 'Ancre objet X'],
          ['childY', 'Ancre objet Y'],
        ]"
        :key="key"
        >{{ text
        }}<select v-model.number="r[key]">
          <option :value="0">Début</option>
          <option :value="0.5">Centre</option>
          <option :value="1">Fin</option>
        </select></label
      ><label v-for="key in ['offsetX', 'offsetY']" :key="key"
        >{{ key === "offsetX" ? "Décalage X" : "Décalage Y"
        }}<input type="number" v-model.number="r[key]" /></label
      ><label class="checkbox-label"
        ><input type="checkbox" v-model="r.rotate" />Suivre la rotation</label
      ><button
        class="btn"
        @click="
          a.config.attachments = a.config.attachments.filter(
            (x) => x.id !== r.id,
          )
        "
      >
        Détacher
      </button>
    </div>
    <button class="btn full" :disabled="objects.length < 2" @click="connector">
      Ajouter une flèche depuis cet objet
    </button>
    <div
      v-for="r in a.config.links.filter((r) => r.from === s.selected)"
      :key="r.id"
    >
      <label
        >Référence vers<select v-model="r.to">
          <option
            v-for="key in objects.filter((k) => k !== s.selected)"
            :key="key"
            :value="key"
          >
            {{ label(key) }}
          </option>
        </select></label
      ><label>Couleur<input type="color" v-model="r.color" /></label
      ><label
        >Épaisseur<input
          type="number"
          v-model.number="r.width"
          min="1"
          max="30" /></label
      ><button
        class="btn"
        @click="a.config.links = a.config.links.filter((x) => x.id !== r.id)"
      >
        Retirer la flèche
      </button>
    </div>
  </InspectorDrawer>
  <InspectorDrawer id="workflow-events" title="Événements" :icon="GitBranch"
    ><p class="field-help">
      Déclenche une action à un instant, à la fin d’une séquence ou au contact
      d’un bloc physique. Les boucles sont signalées et ne lancent pas de
      séquence.
    </p>
    <button class="btn full" @click="event">
      <Plus :size="14" />Ajouter un événement
    </button>
    <div v-for="e in a.config.events" :key="e.id" class="workflow-rule">
      <label>Nom<input v-model="e.name" maxlength="100" /></label
      ><label class="checkbox-label"
        ><input type="checkbox" v-model="e.enabled" />Actif</label
      ><label
        >Déclencheur<select v-model="e.trigger" @change="e.source = ''">
          <option value="time">À un instant</option>
          <option value="clipEnd">À l’arrivée · fin d’une séquence</option>
          <option value="contact">Au contact d’un bloc</option>
        </select></label
      ><label v-if="e.trigger === 'time'"
        >Instant · s<input
          type="number"
          v-model.number="e.time"
          min="0"
          :max="a.config.duration"
          step=".1" /></label
      ><label v-else
        >Source<select v-model="e.source">
          <option value="" disabled>Choisir</option>
          <template v-if="e.trigger === 'clipEnd'"
            ><option v-for="c in a.config.clips" :key="c.id" :value="c.id">
              {{ c.name }}
            </option></template
          ><template v-else
            ><option v-for="r in a.config.triggers" :key="r.id" :value="r.id">
              {{ label(r.actor) }} → {{ label(r.target) }}
            </option></template
          >
        </select></label
      >
      <label
        >Action<select v-model="e.action" @change="e.target = ''">
          <option value="show">Faire apparaître un objet ou une flèche</option>
          <option value="hide">Masquer un objet ou une flèche</option>
          <option value="color">Changer une couleur</option>
          <option value="shape">Changer une forme</option>
          <option value="startClip">Démarrer une séquence</option>
        </select></label
      ><label
        >Cible<select v-model="e.target">
          <option value="" disabled>Choisir</option>
          <template v-if="e.action === 'startClip'"
            ><option v-for="c in a.config.clips" :key="c.id" :value="c.id">
              {{ c.name }}
            </option></template
          ><template v-else
            ><option v-for="key in objects" :key="key" :value="key">
              {{ label(key) }}
            </option>
            <template v-if="e.action === 'show'"
              ><option
                v-for="link in a.config.links"
                :key="link.id"
                :value="link.id"
              >
                Flèche · {{ label(link.from) }} → {{ label(link.to) }}
              </option></template
            ></template
          >
        </select></label
      ><input
        v-if="e.action === 'color'"
        type="color"
        v-model="e.value"
        aria-label="Couleur après événement"
      /><select
        v-if="e.action === 'shape'"
        v-model="e.value"
        aria-label="Forme après événement"
      >
        <option
          v-for="shape in shapes.filter((x) => !x.open)"
          :key="shape.id"
          :value="shape.id"
        >
          {{ shape.name }}
        </option></select
      ><button
        class="btn"
        @click="
          a.requestDelete(
            'cet événement',
            () =>
              (a.config.events = a.config.events.filter((x) => x.id !== e.id)),
          )
        "
      >
        <Trash2 :size="14" />Supprimer
      </button>
    </div>
  </InspectorDrawer>
  <InspectorDrawer id="workflow-camera" title="Caméra" :icon="Camera"
    ><p class="field-help">
      Le cadre violet suit la caméra au temps courant. La zone assombrie reste
      hors champ ; les objets gardent leurs coordonnées de construction.
    </p>
    <div class="workspace-switch">
      <button @click="a.seek(0)">Début de scène</button
      ><button @click="a.seek(a.config.duration)">Fin de scène</button>
    </div>
    <NumberRange
      label="Zoom de la caméra"
      unit="%"
      :min="10"
      :max="800"
      :step="1"
      :model-value="a.propertyValue('cameraZoom')"
      @update:model-value="a.setProperty('cameraZoom', $event)"
      ><template #actions
        ><AnimationKeyButton :studio="s" field="cameraZoom" /></template
    ></NumberRange>
    <button class="btn" @click="a.setProperty('cameraZoom', 100)">
      100 % à cet instant
    </button>
    <p class="field-help">
      Par exemple : règle 150 % au début, puis 100 % à la fin. Les images clés
      et l’interpolation sont créées automatiquement.
    </p>
    <div class="position-grid">
      <label
        v-for="[field, text] in [
          ['cameraX', 'Centre X'],
          ['cameraY', 'Centre Y'],
          ['cameraRotation', 'Rotation · degrés'],
        ]"
        :key="field"
        >{{ text }}<AnimationKeyButton :studio="s" :field="field" /><input
          type="number"
          :aria-label="text + ' de la caméra'"
          :value="a.propertyValue(field)"
          :min="field === 'cameraRotation' ? -360 : -10000"
          :max="field === 'cameraRotation' ? 360 : 10000"
          @change="a.setProperty(field, $event.target.value)"
      /></label>
    </div>
    <button
      class="btn"
      :aria-pressed="a.diagnostics.camera"
      @click="a.diagnostics.camera = !a.diagnostics.camera"
    >
      {{
        a.diagnostics.camera
          ? "Masquer le cadre caméra"
          : "Afficher le cadre caméra"
      }}
    </button>
  </InspectorDrawer>
  <InspectorDrawer
    id="workflow-presets"
    title="Mouvements réutilisables"
    :icon="Bookmark"
    ><p class="field-help">
      Bibliothèque locale sur disque, partagée entre animations. Le mouvement
      est adapté à la position, à la taille et à la durée choisies.
    </p>
    <label
      >Mouvement<select v-model="motion">
        <option v-for="m in motions" :key="m.id" :value="m.id">
          {{ m.name }}
        </option>
      </select></label
    ><label
      >Durée · s<input
        type="number"
        v-model.number="duration"
        min=".1"
        max="120"
        step=".1" /></label
    ><button
      class="btn full"
      :disabled="!s.selected || !!a.engine"
      @click="run(apply)"
    >
      Appliquer à l’objet sélectionné</button
    ><label
      >Nom du mouvement à enregistrer<input
        v-model="name"
        maxlength="80" /></label
    ><button
      class="btn full"
      :disabled="!a.clip || a.clip.keys.length !== 1 || !!a.engine"
      @click="
        run(() =>
          upsertAsset(
            'motions',
            captureMotion(
              a.clip,
              s.current.positions[a.clip.keys[0]],
              a.config.paths.find((p) => p.id === a.clip.pathId),
              name,
              a.config.effects,
            ),
          ),
        )
      "
    >
      Enregistrer la séquence sélectionnée</button
    ><button
      v-if="localAssets.motions.some((m) => m.id === motion)"
      class="btn"
      @click="
        a.requestDelete('ce mouvement de la bibliothèque', () =>
          run(() => removeAsset('motions', motion)),
        )
      "
    >
      Supprimer de la bibliothèque
    </button>
    <p v-if="localAssets.error" class="field-help">
      {{ localAssets.error }}
    </p></InspectorDrawer
  >
  <InspectorDrawer
    id="workflow-diagnostics"
    title="Diagnostic visuel"
    :icon="Activity"
    ><p class="field-help">Repères réservés à l’éditeur, exclus de l’export.</p>
    <label
      v-for="[key, text] in [
        ['bounds', 'Cadres des objets'],
        ['collisions', 'Obstacles'],
        ['contacts', 'Contacts déclenchés'],
        ['attachments', 'Attaches'],
        ['forces', 'Forces de gravité'],
        ['paths', 'Trajectoires'],
        ['camera', 'Cadre caméra'],
      ]"
      :key="key"
      class="checkbox-label"
      ><input type="checkbox" v-model="a.diagnostics[key]" />{{ text }}</label
    >
    <p
      v-for="warning in a.evaluate().warnings"
      :key="warning"
      class="field-help"
    >
      {{ warning }}
    </p>
    <p v-if="a.evaluate().firedEvents.length" class="field-help">
      {{ a.evaluate().firedEvents.length }} événement(s) déclenché(s).
    </p></InspectorDrawer
  >
</template>
<style scoped>
.workflow-rule {
  padding: 12px 0;
  margin-top: 12px;
  border-top: 1px solid var(--border);
}
.workflow-rule .btn {
  margin-top: 8px;
}
</style>
