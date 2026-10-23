import { audioPeaks, validAudioReference } from "./animationAudioModel.js";
const maxBytes = 128 * 1024 * 1024;
const mimePattern = "(mpeg|mp3|wav|x-wav|ogg|mp4|aac|flac|x-flac|webm)";
const validData = (value) =>
  typeof value === "string" &&
  value.length <= Math.ceil((maxBytes * 4) / 3) + 100 &&
  new RegExp("^data:audio/" + mimePattern + ";base64,[A-Za-z0-9+/=]+$").test(
    value,
  );
let repository;
const store = async () =>
  (repository ||= (await import("./videoProjects.js")).videoRepository());
export function validAudioAsset(asset) {
  return (
    validData(asset?.src) &&
    typeof asset.name === "string" &&
    asset.name.length <= 200 &&
    Number.isFinite(asset.duration) &&
    asset.duration > 0 &&
    asset.duration <= 3600 &&
    asset.peakRate === 100 &&
    Array.isArray(asset.peaks) &&
    asset.peaks.length === Math.ceil(asset.duration * 100) * 2 &&
    asset.peaks.every((v) => Number.isFinite(v) && v >= -1 && v <= 1)
  );
}
export async function loadAudioAsset(src) {
  const asset = await (await store()).getSetting(src);
  if (!validAudioReference(src) || !validAudioAsset(asset))
    throw Error(
      "Audio introuvable dans le stockage local. Réimporte ton fichier.",
    );
  return asset;
}
export async function importAnimationAudio(file) {
  const types = {
    mp3: "mpeg",
    wav: "wav",
    ogg: "ogg",
    m4a: "mp4",
    aac: "aac",
    flac: "flac",
    webm: "webm",
  };
  const subtype = types[file?.name?.split(".").at(-1)?.toLowerCase()];
  if (!file || !subtype)
    throw Error("Choisis un audio MP3, WAV, Ogg, M4A, AAC, FLAC ou WebM.");
  if (file.size > maxBytes)
    throw Error(
      "Cet audio dépasse 128 Mo. Utilise une version compressée du même enregistrement.",
    );
  const Decoder =
    globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Decoder)
    throw Error("Le décodage audio n’est pas disponible dans ce navigateur.");
  let buffer;
  try {
    buffer = await new Decoder(1, 1, 8000).decodeAudioData(
      await file.arrayBuffer(),
    );
  } catch {
    throw Error(
      "Ce fichier audio ne peut pas être décodé. Essaie une version MP3 ou WAV.",
    );
  }
  if (!(buffer.duration > 0) || buffer.duration > 3600)
    throw Error("Choisis un audio de moins d’une heure.");
  const peaks = audioPeaks(buffer),
    duration = buffer.duration;
  buffer = null;
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(Error("Lecture du fichier audio impossible."));
    reader.readAsDataURL(file.slice(0, file.size, "audio/" + subtype));
  });
  const id = "frame-audio:" + crypto.randomUUID();
  const asset = {
    src,
    name: file.name.slice(0, 200),
    duration,
    peaks,
    peakRate: 100,
  };
  await (await store()).setSetting(id, asset);
  return { id, asset };
}
function audioReferences(project) {
  const refs = new Set();
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (validAudioReference(value.audio?.src)) refs.add(value.audio.src);
    for (const [key, child] of Object.entries(value))
      if (key !== "audioMedia") walk(child);
  }
  walk(project);
  return refs;
}
// Extend the existing portable-media pipeline: embed each shared audio only once.
export async function portableAudioProject(project) {
  const refs = audioReferences(project);
  if (refs.size) {
    project.audioMedia = {};
    for (const ref of refs) project.audioMedia[ref] = await loadAudioAsset(ref);
  }
  return project;
}
export async function restoreAudioProject(project) {
  if (!project?.audioMedia) return project;
  const entries = Object.entries(project.audioMedia);
  if (entries.length > 100 || Array.isArray(project.audioMedia))
    throw Error("Bibliothèque audio invalide.");
  const refs = audioReferences(project);
  for (const [id, asset] of entries) {
    if (!refs.has(id) || !validAudioAsset(asset))
      throw Error("Média audio invalide.");
    const old = await (await store()).getSetting(id);
    if (old && old.src !== asset.src)
      throw Error(
        "Un audio différent porte déjà cet identifiant. Le fichier existant est conservé.",
      );
  }
  for (const [id, asset] of entries)
    await (await store()).setSetting(id, asset);
  return project;
}
