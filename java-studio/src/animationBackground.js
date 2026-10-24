import {backgroundModes,normalizeBackground,patternChannels,drawSceneBackground} from './sceneBackground.js';
import { boundColor } from "./colors.js";
export function drawAnimationBackground(ctx, config, theme) {
  if (config.background === "transparent") return;
  if (config.background === "gradient") {
    const a = ((config.gradientAngle || 0) * Math.PI) / 180,
      dx = Math.cos(a),
      dy = Math.sin(a),
      extent = (Math.abs(dx) * 1920 + Math.abs(dy) * 1080) / 2;
    const gradient = ctx.createLinearGradient(
      960 - dx * extent,
      540 - dy * extent,
      960 + dx * extent,
      540 + dy * extent,
    );
    gradient.addColorStop(0, boundColor(config, "color", theme));
    gradient.addColorStop(1, config.color2 || "#223c57");
    ctx.fillStyle = gradient;
  } else ctx.fillStyle = boundColor(config, "color", theme);
  ctx.fillRect(0, 0, 1920, 1080);
}

export function evaluatePatternBackground(raw, frames, time, valueAt, ease) {
  const background=normalizeBackground(raw);
  for(const [field,[prop]] of Object.entries(patternChannels)) {
    if(prop==='mode'||!frames.some(f=>f.field===field))continue;
    const value=valueAt(frames,field,time,prop==='stagger'?Number(background[prop]):background[prop]);
    background[prop]=prop==='stagger'?!!value:value;
    if(['base','color','color2'].includes(prop))background[prop+'Role']=null;
  }
  const keys=frames.filter(f=>f.field==='patternMode').sort((a,b)=>a.time-b.time);
  let blend=null;
  const mode=value=>backgroundModes[Math.max(0,Math.min(backgroundModes.length-1,Math.round(value)))]?.[0]||'inherit';
  if(keys.length){
    const before=keys.filter(f=>f.time<=time).at(-1)||keys[0],after=keys.find(f=>f.time>time);
    background.mode=mode(before.value);
    if(after&&time>=before.time){
      const progress=Math.max(0,Math.min(1,ease((time-before.time)/(after.time-before.time),before.ease,before.curve)));
      if(mode(after.value)!==background.mode)blend={background:{...background,mode:mode(after.value)},progress};
    }
  }
  return {background:normalizeBackground(background),blend};
}
let blendCanvas;
export function drawAnimationSceneBackground(ctx,scene,config,theme){
  const paint=(target,b)=>b?.mode&&b.mode!=='inherit'?drawSceneBackground(target,b,theme):drawAnimationBackground(target,config,theme);
  const blend=scene.backgroundBlend;
  if(!blend){paint(ctx,scene.background);return;}
  blendCanvas ||= typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1920,1080):Object.assign(document.createElement('canvas'),{width:1920,height:1080});
  const g=blendCanvas.getContext('2d');g.clearRect(0,0,1920,1080);g.save();
  g.globalAlpha=1-blend.progress;paint(g,scene.background);
  g.globalCompositeOperation='lighter';g.globalAlpha=blend.progress;paint(g,blend.background);
  g.restore();ctx.drawImage(blendCanvas,0,0);
}
