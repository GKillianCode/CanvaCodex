import { svgSource } from './svg.js';

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
export function imageImportError(error) {
  return error?.imageImport ? error.message : 'Impossible de lire cette image. Vérifie que le fichier est une image valide.';
}
function fail(message) { throw Object.assign(new Error(message), { imageImport: true }); }

export async function imageSource(file, runtime = {
  decode: file => createImageBitmap(file),
  canvas: () => document.createElement('canvas'),
}) {
  if (!IMAGE_TYPES.includes(file.type)) fail('Format non reconnu. Choisis un PNG, JPEG, WebP ou SVG.');
  if (file.size > 20 * 1024 * 1024) fail('Le fichier dépasse 20 Mo. Choisis une image plus légère.');
  if (file.type === 'image/svg+xml') {
    try { return svgSource(await file.text()); }
    catch { fail('SVG non accepté. Utilise un SVG autonome, sans script ni ressource externe.'); }
  }
  const image = await runtime.decode(file);
  try {
    if (!image.width || !image.height) fail('Cette image ne contient aucune dimension valide.');
    const canvas = runtime.canvas();
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    let ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    for (let attempt = 0; attempt < 12; attempt++) {
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL(type, 0.9);
      if (src.startsWith(`data:${type};base64,`) && src.length < 3000000) return src;
      ratio *= 0.8;
    }
    fail('Impossible de préparer cette image pour le projet. Essaie de la réexporter.');
  } finally { image.close(); }
}
