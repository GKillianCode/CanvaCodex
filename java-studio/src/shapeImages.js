import { validSvgSource } from "./svg.js";
export function validShapeImage(src) {
  return (
    typeof src === "string" &&
    src.length < 3000000 &&
    (/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(src) ||
      validSvgSource(src))
  );
}
export function imageFitRect(p, image, fit = "cover") {
  const width = image.naturalWidth || image.width,
    height = image.naturalHeight || image.height;
  if (!width || !height) return null;
  const ratio =
    fit === "cover"
      ? Math.max(p.w / width, p.h / height)
      : Math.min(p.w / width, p.h / height);
  return {
    x: p.x + (p.w - width * ratio) / 2,
    y: p.y + (p.h - height * ratio) / 2,
    w: width * ratio,
    h: height * ratio,
  };
}
