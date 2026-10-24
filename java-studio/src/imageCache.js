// Retain recently used decoded images, with a memory budget as well as a count cap.
export function createImageCache({
  maxBytes = 32 * 1024 * 1024,
  maxEntries = 100,
  createImage = () => new Image(),
  notify = src => window.dispatchEvent(new CustomEvent("frame-images-ready",{detail:src})),
} = {}) {
  const images = new Map(),
    scopes = new Map();
  const bytes = () => [...images.values()].reduce((n, e) => n + e.bytes, 0);
  function trim() {
    const active = new Set([...scopes.values()].flatMap((set) => [...set]));
    // Active document/export resources must survive until rendering finishes.
    for (const key of images.keys()) {
      if (
        images.size <= 1 ||
        (images.size <= maxEntries && bytes() <= maxBytes)
      )
        break;
      if (!active.has(key)) images.delete(key);
    }
  }
  function reserve(scope, sources) {
    scopes.set(scope, new Set(sources));
    trim();
  }
  function release(scope) {
    scopes.delete(scope);
    trim();
  }
  function get(src) {
    if (images.has(src)) {
      const entry = images.get(src);
      images.delete(src);
      images.set(src, entry);
      return entry;
    }
    const image = createImage(),
      entry = { image, ready: false, promise: null, bytes: src.length * 2 };
    entry.promise = new Promise((resolve) => {
      image.onload = () => {
        entry.ready = true;
        entry.bytes =
          src.length * 2 +
          (image.naturalWidth || image.width || 0) *
            (image.naturalHeight || image.height || 0) *
            4;
        trim();
        notify(src);
        resolve();
      };
      image.onerror = () => resolve();
    });
    images.set(src, entry);
    image.src = src;
    trim();
    return entry;
  }
  return {
    get,
    reserve,
    release,
    get bytes() {
      return bytes();
    },
    get size() {
      return images.size;
    },
  };
}
const cache = createImageCache();
export const imageAsset = (src) => cache.get(src);

export const reserveImages = (scope, sources) => cache.reserve(scope, sources);
export const releaseImages = (scope = "studio") => cache.release(scope);
