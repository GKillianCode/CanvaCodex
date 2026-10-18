const images = new Map();
export function imageAsset(src) {
  if (!images.has(src)) {
    const image = new Image(),
      entry = { image, ready: false, promise: null };
    entry.promise = new Promise((resolve) => {
      image.onload = () => {
        entry.ready = true;
        window.dispatchEvent(new Event("frame-images-ready"));
        resolve();
      };
      image.onerror = () => resolve();
    });
    image.src = src;
    images.set(src, entry);
    if (images.size > 100) images.delete(images.keys().next().value);
  }
  return images.get(src);
}
