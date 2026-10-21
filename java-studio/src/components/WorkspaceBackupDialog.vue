<script setup>
import { appearance } from "../appearance.js";
import { ref, shallowRef, onMounted, onBeforeUnmount, nextTick } from "vue";
import { X, Download, Upload, ShieldCheck, HardDrive } from "lucide-vue-next";
import {
  createBackup,
  restoreBackup,
  validateBackup,
  backupInventory,
} from "../workspaceBackup.js";
import { downloadText } from "../useVideoWorkflow.js";
const props = defineProps({ repository: Object });
const emit = defineEmits(["close", "restored"]);
const dialog = ref(null),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  incoming = shallowRef(null),
  inventory = ref(null),
  fileName = ref("");
let previous;
const labels = {
  videos: "Vidéos",
  creations: "Supports",
  notes: "Notes libres",
  components: "Composants",
  themes: "Thèmes",
  motions: "Animations réutilisables",
};
async function exportAll() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    const data = await createBackup(props.repository);
    downloadText(
      "frame-sauvegarde-" +
        new Date().toISOString().replace(/[:.]/g, "-") +
        ".json",
      JSON.stringify(data),
      "application/json",
    );
    notice.value =
      "Sauvegarde préparée. Conserve le fichier téléchargé dans un dossier sûr.";
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function choose(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  incoming.value = null;
  inventory.value = null;
  error.value = "";
  notice.value = "";
  busy.value = true;
  try {
    if (file.size > 256 * 1024 * 1024)
      throw Error("La sauvegarde dépasse 256 Mo.");
    const data = validateBackup(JSON.parse(await file.text()));
    await props.repository.checkSnapshot(data.database);
    incoming.value = data;
    inventory.value = backupInventory(data);
    fileName.value = file.name;
  } catch (e) {
    error.value =
      e instanceof SyntaxError ? "Ce fichier JSON est illisible." : e.message;
  } finally {
    busy.value = false;
  }
}
async function restore() {
  if (busy.value || !incoming.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await restoreBackup(incoming.value, props.repository);
    incoming.value = null;
    notice.value =
      "Sauvegarde restaurée. Les données déjà présentes ont été conservées.";
    emit("restored");
  } catch (e) {
    error.value = e.message + " Les données existantes sont conservées.";
  } finally {
    busy.value = false;
  }
}
function close() {
  if (!busy.value) emit("close");
}
function keyboard(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
  if (event.key === "Tab") {
    const items = [
        ...dialog.value.querySelectorAll(
          "button:not(:disabled),input:not(:disabled)",
        ),
      ].filter((el) => el.getClientRects().length),
      first = items[0],
      last = items.at(-1);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === dialog.value)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
onMounted(async () => {
  previous = document.activeElement;
  await nextTick();
  dialog.value?.focus();
});
onBeforeUnmount(() => previous?.isConnected && previous.focus());
</script>
<template>
  <Teleport to="body"
    ><div class="backup-backdrop" @pointerdown.self="close">
      <section
        ref="dialog"
        tabindex="-1"
        class="backup-dialog"
        :data-mode="appearance"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-title"
        :aria-busy="busy"
        @keydown="keyboard"
      >
        <header>
          <div>
            <span class="eyebrow">DONNÉES LOCALES</span>
            <h2 id="backup-title">
              <ShieldCheck :size="23" />Sauvegarde de Frame
            </h2>
          </div>
          <button
            class="icon-btn"
            :disabled="busy"
            aria-label="Fermer la sauvegarde"
            title="Fermer"
            @click="close"
          >
            <X :size="20" />
          </button>
        </header>
        <p class="backup-intro">
          Un fichier pour tes vidéos, supports, notes, parcours et bibliothèques
          partagées. Les documents autonomes et préférences de ce navigateur
          sont inclus.
        </p>
        <div class="backup-actions">
          <section>
            <HardDrive :size="22" />
            <h3>Garder une copie</h3>
            <p>
              Télécharge une sauvegarde complète avant une modification
              importante, ou pour changer de navigateur.
            </p>
            <button class="btn primary" :disabled="busy" @click="exportAll">
              <Download :size="16" />{{
                busy ? "Traitement…" : "Télécharger la sauvegarde"
              }}
            </button>
          </section>
          <section>
            <Upload :size="22" />
            <h3>Retrouver son travail</h3>
            <p>
              Importe une sauvegarde dans un espace vide. Les éléments
              identiques sont conservés ; un conflit bloque l’import sans
              remplacer tes documents.
            </p>
            <label class="btn" :class="{ disabled: busy }"
              ><Upload :size="16" />Choisir une sauvegarde<input
                type="file"
                accept="application/json,.json"
                :disabled="busy"
                @change="choose"
            /></label>
          </section>
        </div>
        <section v-if="inventory" class="backup-inventory">
          <h3>{{ fileName }}</h3>
          <dl>
            <div v-for="(value, key) in inventory" :key="key">
              <dt>{{ labels[key] }}</dt>
              <dd>{{ value }}</dd>
            </div>
          </dl>
          <button
            class="btn primary"
            :disabled="busy || !incoming"
            @click="restore"
          >
            Restaurer cette sauvegarde
          </button>
        </section>
        <p v-if="error" class="video-alert" role="alert">{{ error }}</p>
        <p v-if="notice" class="backup-notice" role="status">{{ notice }}</p>
        <footer>
          Les autorisations des dossiers et fichiers liés ne sont pas
          transférées : il faudra les choisir à nouveau. Les vidéos exportées et
          fichiers externes d’origine ne sont pas inclus.
        </footer>
      </section>
    </div></Teleport
  >
</template>
<style scoped>
.backup-backdrop {
  position: fixed;
  inset: var(--frame-header-height, 64px) 0 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.36);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 32px 20px;
  overflow: auto;
}
.backup-dialog {
  width: min(880px, 100%);
  color: #e4e8ec;
  background: #191c22;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 20px 70px #0003;
  outline: none;
}
.backup-dialog header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}
.backup-dialog h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  font-size: 23px;
}
.backup-intro {
  color: var(--muted);
  line-height: 1.7;
  margin: 18px 0 24px;
}
.backup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.backup-actions section {
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 12px;
}
.backup-actions h3 {
  font-size: 16px;
}
.backup-actions p {
  color: var(--muted);
  line-height: 1.65;
  min-height: 85px;
}
.backup-actions label {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.backup-actions input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.backup-actions .disabled {
  pointer-events: none;
  opacity: 0.5;
}
.backup-inventory {
  margin-top: 24px;
  border-top: 1px solid var(--border);
  padding-top: 18px;
}
.backup-inventory h3 {
  overflow-wrap: anywhere;
  font-size: 14px;
}
.backup-inventory dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.backup-inventory dt {
  font-size: 12px;
  color: var(--muted);
}
.backup-inventory dd {
  margin: 5px 0;
  font-size: 24px;
}
.backup-notice {
  color: var(--mint);
  line-height: 1.6;
}
.backup-dialog footer {
  margin-top: 24px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.65;
}
@media (max-width: 650px) {
  .backup-actions {
    grid-template-columns: 1fr;
  }
  .backup-dialog {
    padding: 20px;
  }
  .backup-inventory dl {
    grid-template-columns: repeat(2, 1fr);
  }
}
.backup-dialog[data-mode="light"] {
  color: #253039;
  background: #fff;
  --muted: #60716d;
  --border: #d5ddda;
  --mint: #18794e;
}
.backup-dialog[data-mode] header {
  background: transparent;
  color: inherit;
  height: auto;
  padding: 0;
  border: 0;
}
.backup-dialog[data-mode="light"] .btn.primary {
  background: #18794e !important;
  color: #fff !important;
}
.backup-dialog[data-mode="light"] .backup-notice {
  color: #18794e;
}
</style>
