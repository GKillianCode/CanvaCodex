import { effectWorkingBounds } from "./animationEffectBounds.js";
import { rotatePoint } from "./editor.js";
import { splinePoint, splineAngle, splineParameter } from "./splines.js";
// Object pixels always come from renderSlide: fonts, SVG colours, masks and media stay shared.
import { renderSlide, blockBounds, textEffectRegions } from "./render.js";
import { shapePath, shapeGeometry, isOpenShape } from "./shapes.js";
import { boundColor } from "./colors.js";
import {
  effectProgress,
  effectRandom,
  fragmentPose,
  visualEffectKinds,
} from "./animationEffectCatalog.js";
import { animationScene } from "./animationModel.js";
const neutralKinds = new Set([
  "glitch",
  "blur",
  "grayscale",
  "hue",
  "shadow",
  "glow",
  "wave",
  "bend",
  "twist",
  "sway",
  "pulse",
  "trail",
  "flicker",
  "shine",
]);
const pool = [];
function surface(i, w, h) {
  const c = pool[i] || (pool[i] = document.createElement("canvas"));
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  const x = c.getContext("2d");
  x.resetTransform();
  x.clearRect(0, 0, w, h);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  x.filter = "none";
  x.shadowBlur = 0;
  return [c, x];
}
const sampleCache = new Map();
function contour(e, includeEnd = false) {
  const d = shapePath(e),
    cacheKey = d + (includeEnd ? "-open" : "");
  if (sampleCache.has(cacheKey)) return sampleCache.get(cacheKey);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  const length = p.getTotalLength();
  if (!length) return null;
  const points = Array.from({ length: includeEnd ? 129 : 128 }, (_, i) => {
    const q = p.getPointAtLength((length * i) / 128);
    return { x: q.x, y: q.y };
  });
  if (sampleCache.size >= 100)
    sampleCache.delete(sampleCache.keys().next().value);
  sampleCache.set(cacheKey, points);
  return points;
}
function morph(x, scene, key, target, u, theme) {
  const a = scene.elements[key],
    b = scene.elements[target],
    p = scene.positions[key];
  if (
    a?.type !== "shape" ||
    b?.type !== "shape" ||
    isOpenShape(a) ||
    isOpenShape(b) ||
    a.imageSrc ||
    b.imageSrc
  )
    return false;
  const A = contour(a),
    B = contour(b);
  if (!A || !B) return false;
  x.save();
  x.globalAlpha = (p.opacity ?? a.opacity ?? 100) / 100;
  x.translate(p.x + p.w / 2, p.y + p.h / 2);
  x.rotate(((p.rotation || 0) * Math.PI) / 180);
  x.translate(-p.w / 2, -p.h / 2);
  const path = new Path2D();
  A.forEach((v, i) => {
    const xx = ((v.x + (B[i].x - v.x) * u) * p.w) / 100,
      yy = ((v.y + (B[i].y - v.y) * u) * p.h) / 100;
    i ? path.lineTo(xx, yy) : path.moveTo(xx, yy);
  });
  path.closePath();
  const mix = (a, b) =>
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(a.slice(i, i + 2), 16) * (1 - u) +
            parseInt(b.slice(i, i + 2), 16) * u,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  if (a.filled || b.filled) {
    x.fillStyle = mix(
      boundColor(a, "fill", theme),
      boundColor(b, "fill", theme),
    );
    x.fill(path);
  }
  if (a.outlined || b.outlined) {
    x.strokeStyle = mix(
      boundColor(a, "stroke", theme),
      boundColor(b, "stroke", theme),
    );
    x.lineWidth = a.strokeWidth * (1 - u) + b.strokeWidth * u;
    x.stroke(path);
  }
  x.restore();
  return true;
}
function tileMask(x, src, e, u, b) {
  const count = e.cells,
    cols = count,
    rows = Math.max(1, Math.min(40, Math.round((count * b.h) / b.w))),
    cw = b.w / cols,
    ch = b.h / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c,
        threshold = effectRandom(e.seed, i),
        v = Math.max(0, Math.min(1, (u - threshold * 0.85) / 0.15));
      if (!v) continue;
      const xx = b.x + c * cw,
        yy = b.y + r * ch;
      x.save();
      x.globalAlpha = v;
      if (e.kind === "mosaic") {
        x.translate(xx + cw / 2, yy + ch / 2);
        x.scale(v, v);
        x.translate(-xx - cw / 2, -yy - ch / 2);
      }
      x.drawImage(src, xx, yy, cw, ch, xx, yy, cw, ch);
      x.restore();
    }
}
function fragments(x, src, e, u, b) {
  if (e.kind === "rebuild") u = 1 - u;
  const n = e.cells,
    rows = Math.max(1, Math.min(40, Math.round((n * b.h) / b.w))),
    cw = b.w / n,
    ch = b.h / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < n; c++)
      for (let tri = 0; tri < (e.pieces === "triangles" ? 2 : 1); tri++) {
        const i = r * n + c,
          delay = effectRandom(e.seed, i) * e.stagger,
          t = Math.max(0, Math.min(1, (u - delay) / (1 - e.stagger))),
          f = fragmentPose(e, i * 2 + tri, t),
          xx = b.x + c * cw,
          yy = b.y + r * ch;
        x.save();
        x.globalAlpha = f.alpha;
        x.translate(xx + cw / 2 + f.x, yy + ch / 2 + f.y);
        x.rotate((f.rotation * Math.PI) / 180);
        x.scale(f.scale, f.scale);
        x.translate(-xx - cw / 2, -yy - ch / 2);
        x.beginPath();
        if (e.pieces === "triangles") {
          x.moveTo(xx, yy);
          x.lineTo(xx + cw, tri ? yy + ch : yy);
          x.lineTo(tri ? xx : xx + cw, yy + ch);
          x.closePath();
        } else x.rect(xx, yy, cw + 0.25, ch + 0.25);
        x.clip();
        x.drawImage(src, 0, 0);
        x.restore();
      }
}
function textReveal(x, src, regions, e, u, box, ratio) {
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i],
      delay = (i / Math.max(1, regions.length - 1)) * e.stagger,
      v = Math.max(0, Math.min(1, (u - delay) / (1 - e.stagger))),
      xx = (r.x - box.x) * ratio,
      yy = (r.y - box.y) * ratio,
      w = r.w * ratio,
      h = r.h * ratio;
    x.save();
    x.globalAlpha = v;
    const shift = e.disperse ? (1 - v) * e.amount * ratio : 0;
    x.drawImage(
      src,
      xx,
      yy,
      w,
      h,
      xx + Math.sin(i * 7) * shift,
      yy + shift,
      w,
      h,
    );
    x.restore();
  }
}
export function createVisualEffectRenderer(
  state,
  rawScene,
  rawConfig,
  time,
  theme,
) {
  return (ctx, scene, key, _theme, options) => {
    const effects = state.config.effects.filter(
      (e) =>
        e.enabled &&
        e.key === key &&
        visualEffectKinds.includes(e.kind) &&
        !(neutralKinds.has(e.kind) && e.amount === 0),
    );
    if (!effects.length) return false;
    const p = scene.positions[key],
      bb = blockBounds(ctx, scene, key),
      h = p.h || bb.h,
      w = p.w,
      trailStates = new Map();
    for (const e of effects.filter((e) => e.kind === "trail")) {
      const n = Math.min(8, e.count);
      trailStates.set(
        e.id,
        Array.from(
          { length: n },
          (_, i) =>
            animationScene(
              rawScene,
              rawConfig,
              Math.max(0, time - ((i + 1) * Math.max(1, e.amount)) / 1000),
            ).scene,
        ),
      );
    }
    const box = effectWorkingBounds(
      { ...p, h },
      effects,
      state.config.paths,
      [...trailStates.values()].flatMap((states) =>
        states.map((s) => s.positions[key]).filter(Boolean),
      ),
    );
    const ratio = Math.min(1, 2048 / box.w, 2048 / box.h),
      W = Math.max(1, Math.ceil(box.w * ratio)),
      H = Math.max(1, Math.ceil(box.h * ratio));
    let [src, sx] = surface(0, W, H),
      [dst, dx] = surface(1, W, H);
    const b = {
      x: (p.x - box.x) * ratio,
      y: (p.y - box.y) * ratio,
      w: w * ratio,
      h: h * ratio,
    };
    if (p.rotation) {
      const corners = [
          { x: p.x, y: p.y },
          { x: p.x + w, y: p.y },
          { x: p.x + w, y: p.y + h },
          { x: p.x, y: p.y + h },
        ].map((q) => rotatePoint(q, { ...p, h })),
        xs = corners.map((q) => q.x),
        ys = corners.map((q) => q.y);
      Object.assign(b, {
        x: (Math.min(...xs) - box.x) * ratio,
        y: (Math.min(...ys) - box.y) * ratio,
        w: (Math.max(...xs) - Math.min(...xs)) * ratio,
        h: (Math.max(...ys) - Math.min(...ys)) * ratio,
      });
    }
    const paint = (x, ss, k) => {
      x.save();
      x.scale(ratio, ratio);
      x.translate(-box.x, -box.y);
      renderSlide(
        x,
        { ...ss, blockKeys: [k], elements: { [k]: ss.elements[k] } },
        theme,
        {
          ...options,
          renderObject: null,
          omitBackground: true,
          transparent: true,
          omit: null,
          showHidden: true,
        },
      );
      x.restore();
    };
    paint(sx, scene, key);
    for (const e of effects) {
      if (
        time < e.start &&
        ![
          "fade",
          "wipe",
          "radial",
          "dissolve",
          "mosaic",
          "revealText",
          "drawPath",
          "rebuild",
        ].includes(e.kind)
      )
        continue;
      const u = effectProgress(e, time),
        local = Math.max(
          0,
          Math.min(e.loop ? 120 : e.duration, time - e.start),
        ),
        phase = local * e.frequency * Math.PI * 2;
      dx.resetTransform();
      dx.clearRect(0, 0, W, H);
      dx.save();
      const color = boundColor(e, "color", theme),
        color2 = boundColor(e, "color2", theme),
        amount = e.amount * ratio;
      if (e.kind === "fade") {
        dx.globalAlpha = u;
        dx.drawImage(src, 0, 0);
      } else if (["transition", "morph"].includes(e.kind)) {
        let morphed = false;
        if (e.kind === "morph") {
          dx.save();
          dx.scale(ratio, ratio);
          dx.translate(-box.x, -box.y);
          morphed = morph(dx, scene, key, e.target, u, theme);
          dx.restore();
        }
        const target = scene.elements[e.target];
        if (!morphed && target) {
          const [tc, tx] = surface(2, W, H);
          paint(
            tx,
            {
              ...scene,
              positions: { ...scene.positions, [e.target]: { ...p } },
              hiddenKeys: [],
            },
            e.target,
          );
          dx.globalAlpha = 1 - u;
          dx.drawImage(src, 0, 0);
          dx.globalAlpha = u;
          dx.globalCompositeOperation = "lighter";
          dx.drawImage(tc, 0, 0);
        } else if (!morphed) dx.drawImage(src, 0, 0);
      } else if (["wipe", "radial"].includes(e.kind)) {
        dx.beginPath();
        if (e.kind === "radial")
          dx.arc(
            b.x + b.w / 2,
            b.y + b.h / 2,
            (Math.hypot(b.w, b.h) / 2) * u,
            0,
            Math.PI * 2,
          );
        else {
          const vertical = ["up", "down"].includes(e.direction);
          dx.rect(
            b.x + (e.direction === "left" ? b.w * (1 - u) : 0),
            b.y + (e.direction === "up" ? b.h * (1 - u) : 0),
            vertical ? b.w : b.w * u,
            vertical ? b.h * u : b.h,
          );
        }
        dx.clip();
        dx.drawImage(src, 0, 0);
      } else if (["dissolve", "mosaic"].includes(e.kind))
        tileMask(dx, src, e, u, b);
      else if (["shatter", "scatter", "collapse", "rebuild"].includes(e.kind))
        fragments(
          dx,
          src,
          {
            ...e,
            amount: amount * (e.kind === "collapse" ? 0.1 : 1),
            gravity: e.gravity * ratio,
            wind: e.wind * ratio,
          },
          u,
          b,
        );
      else if (e.kind === "drawPath" || e.kind === "dashFlow") {
        const e0 = scene.elements[key];
        if (e0?.type === "shape") {
          dx.scale(ratio, ratio);
          dx.translate(-box.x, -box.y);
          dx.translate(p.x + p.w / 2, p.y + p.h / 2);
          dx.rotate(((p.rotation || 0) * Math.PI) / 180);
          dx.translate(-p.x - p.w / 2, -p.y - p.h / 2);
          const path = shapeGeometry(e0, p),
            points = contour(e0, isOpenShape(e0));
          let length = 0;
          if (points)
            for (let i = 1; i < points.length + (isOpenShape(e0) ? 0 : 1); i++)
              length += Math.hypot(
                ((points[i % points.length].x - points[i - 1].x) * p.w) / 100,
                ((points[i % points.length].y - points[i - 1].y) * p.h) / 100,
              );
          dx.globalAlpha = (p.opacity ?? e0.opacity ?? 100) / 100;
          dx.strokeStyle = boundColor(e0, "stroke", theme);
          dx.lineWidth = e0.strokeWidth;
          dx.lineCap = "round";
          if (e.kind === "drawPath") {
            dx.setLineDash([length * u, Math.max(0.01, length * (1 - u))]);
          } else {
            dx.setLineDash([e0.strokeWidth * 3, e0.strokeWidth * 2]);
            dx.lineDashOffset = -local * e.amount;
          }
          if (e.kind === "dashFlow" && e0.filled) {
            dx.fillStyle = boundColor(e0, "fill", theme);
            dx.fill(path);
          }
          if (u > 0 || e.kind === "dashFlow") dx.stroke(path);
        } else dx.drawImage(src, 0, 0);
      } else if (e.kind === "pathDeform") {
        const path = state.config.paths.find((p) => p.id === e.pathId);
        if (path) {
          const strips = 80,
            sw = b.w / strips;
          for (let i = 0; i < strips; i++) {
            const t = (i + 0.5) / strips,
              parameter = splineParameter(path.points, t, path.closed),
              point = splinePoint(path.points, parameter, path.closed),
              angle = splineAngle(path.points, parameter, path.closed),
              left = splinePoint(
                path.points,
                splineParameter(path.points, i / strips, path.closed),
                path.closed,
              ),
              right = splinePoint(
                path.points,
                splineParameter(path.points, (i + 1) / strips, path.closed),
                path.closed,
              ),
              span = Math.hypot(right.x - left.x, right.y - left.y) * ratio;
            dx.save();
            dx.translate(
              ((p.x + t * w) * (1 - u) + point.x * u - box.x) * ratio,
              ((p.y + h / 2) * (1 - u) + point.y * u - box.y) * ratio,
            );
            dx.rotate((angle * u * Math.PI) / 180);
            dx.drawImage(
              src,
              b.x + i * sw,
              b.y,
              sw,
              b.h,
              -(span * u + sw * (1 - u)) / 2,
              -b.h / 2,
              span * u + sw * (1 - u) + 1,
              b.h,
            );
            dx.restore();
          }
        } else dx.drawImage(src, 0, 0);
      } else if (["wave", "bend", "twist"].includes(e.kind)) {
        const step = 2;
        for (let yy = 0; yy < H; yy += step) {
          const rel = (yy - b.y) / Math.max(1, b.h),
            v =
              e.kind === "wave"
                ? Math.sin(phase + rel * 6) * amount
                : e.kind === "bend"
                  ? amount * u * (1 - rel) ** 2
                  : Math.sin(rel * Math.PI) * amount * Math.sin(phase);
          dx.save();
          if (e.kind === "twist") {
            const factor = Math.max(0.15, Math.cos((v * Math.PI) / 180)),
              center = b.x + b.w / 2;
            dx.drawImage(
              src,
              0,
              yy,
              W,
              Math.min(step, H - yy),
              center * (1 - factor),
              yy,
              W * factor,
              Math.min(step, H - yy),
            );
          } else
            dx.drawImage(
              src,
              0,
              yy,
              W,
              Math.min(step, H - yy),
              v,
              yy,
              W,
              Math.min(step, H - yy),
            );
          dx.restore();
        }
      } else if (["sway", "pulse"].includes(e.kind)) {
        const px = b.x + b.w * e.pivotX,
          py = b.y + b.h * e.pivotY;
        dx.translate(px, py);
        if (e.kind === "sway")
          dx.rotate((Math.sin(phase) * e.amount * Math.PI) / 180);
        else {
          const s = Math.max(0.05, 1 + (Math.sin(phase) * e.amount) / 100);
          dx.scale(s, s);
        }
        dx.translate(-px, -py);
        dx.drawImage(src, 0, 0);
      } else if (e.kind === "glitch") {
        const tick = Math.floor(local * Math.max(0, e.frequency) * 12);
        for (let y = 0, i = 0; y < H; y += 8, i++) {
          const shift = (effectRandom(e.seed + tick, i) - 0.5) * amount * 2;
          dx.drawImage(
            src,
            0,
            y,
            W,
            Math.min(8, H - y),
            shift,
            y,
            W,
            Math.min(8, H - y),
          );
        }
        dx.globalCompositeOperation = "screen";
        dx.globalAlpha = 0.22;
        dx.filter = "sepia(1) saturate(5) hue-rotate(140deg)";
        dx.drawImage(src, amount * 0.3, 0);
      } else if (["blur", "grayscale", "hue"].includes(e.kind)) {
        dx.filter =
          e.kind === "blur"
            ? `blur(${Math.max(0, amount)}px)`
            : e.kind === "grayscale"
              ? `grayscale(${Math.max(0, Math.min(100, e.amount))}%)`
              : `hue-rotate(${e.amount}deg)`;
        dx.drawImage(src, 0, 0);
      } else if (["shadow", "glow", "neon"].includes(e.kind)) {
        dx.shadowColor = color;
        dx.shadowBlur = Math.abs(amount);
        if (e.kind === "shadow") {
          dx.shadowOffsetX = amount * 0.4;
          dx.shadowOffsetY = amount * 0.6;
        }
        if (e.kind === "neon")
          dx.globalAlpha = 0.85 + 0.15 * Math.sin(phase * 3);
        dx.drawImage(src, 0, 0);
        if (e.kind !== "shadow") {
          dx.drawImage(src, 0, 0);
          dx.shadowBlur = 0;
          dx.drawImage(src, 0, 0);
        }
      } else if (e.kind === "flicker") {
        dx.globalAlpha =
          1 -
          effectRandom(
            e.seed,
            Math.floor(local * Math.max(0, e.frequency) * 12),
          ) *
            Math.min(1, Math.abs(e.amount) / 100);
        dx.drawImage(src, 0, 0);
      } else if (e.kind === "metallic" || e.kind === "shine") {
        dx.drawImage(src, 0, 0);
        dx.globalCompositeOperation = "source-atop";
        const start = e.kind === "shine" ? b.x - b.w + u * b.w * 3 : b.x,
          g = dx.createLinearGradient(start, b.y, start + b.w, b.y + b.h);
        if (e.kind === "metallic") {
          g.addColorStop(0, color2);
          g.addColorStop(0.3, color);
          g.addColorStop(0.47, "#fff5cc");
          g.addColorStop(0.55, color2);
          g.addColorStop(0.8, color);
          g.addColorStop(1, color2);
        } else {
          g.addColorStop(0, "#ffffff00");
          g.addColorStop(0.4, "#ffffff00");
          g.addColorStop(0.5, "#ffffff");
          g.addColorStop(0.6, "#ffffff00");
          g.addColorStop(1, "#ffffff00");
          dx.globalAlpha = Math.min(1, Math.abs(e.amount) / 100);
        }
        dx.fillStyle = g;
        dx.fillRect(0, 0, W, H);
      } else if (e.kind === "trail") {
        const n = Math.min(8, e.count);
        for (let i = n; i >= 1; i--) {
          const past = trailStates.get(e.id)[i - 1];
          dx.globalAlpha = (1 - i / (n + 1)) * 0.25;
          paint(dx, past, key);
        }
        dx.globalAlpha = 1;
        dx.drawImage(src, 0, 0);
      } else if (e.kind === "revealText")
        textReveal(
          dx,
          src,
          textEffectRegions(ctx, scene, key, e.unit),
          e,
          u,
          box,
          ratio,
        );
      else dx.drawImage(src, 0, 0);
      dx.restore();
      [src, dst] = [dst, src];
      [sx, dx] = [dx, sx];
    }
    ctx.drawImage(src, box.x, box.y, box.w, box.h);
    return true;
  };
}
