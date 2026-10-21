import { validSvgSource } from "./svg.js";
export function validShapeImage(src) {
  return (
    typeof src === "string" &&
    src.length < 3000000 &&
    (/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src) ||
      validSvgSource(src))
  );
}
export function imageOffset(value) {
  return Number.isFinite(Number(value)) ? Math.max(-100, Math.min(100, Number(value))) : 0;
}
export function imageFitRect(p, image, fit = "cover", offsetX = 0, offsetY = 0) {
  const width = image.naturalWidth || image.width,
    height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  const ratio =
    fit === "cover"
      ? Math.max(p.w / width, p.h / height)
      : Math.min(p.w / width, p.h / height);
  return {
    x: p.x + (p.w - width * ratio) / 2 + Math.abs(p.w - width * ratio) / 2 * imageOffset(offsetX) / 100,
    y: p.y + (p.h - height * ratio) / 2 + Math.abs(p.h - height * ratio) / 2 * imageOffset(offsetY) / 100,
    w: width * ratio,
    h: height * ratio,
  };
}
