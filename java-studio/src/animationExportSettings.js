import {backgroundModes} from './sceneBackground.js';
export function hasTransparentScenes(scenes) {
  return scenes.some(scene=>{
    const fallback=!["solid","gradient"].includes(scene.animation?.background);
    const transparent=mode=>!mode||mode==='inherit'?fallback:mode==='transparent';
    const tracks=(scene.animation?.clips||[]).filter(c=>c.enabled!==false&&c.frames?.some(f=>f.field==='patternMode'));
    if(tracks.some(c=>c.frames.some(f=>f.field==='patternMode'&&transparent(backgroundModes[Math.max(0,Math.min(backgroundModes.length-1,Math.round(f.value)))]?.[0]))))return true;
    return !tracks.some(c=>(c.start||0)<=0)&&transparent(scene.background?.mode);
  });
}
export function resolveAnimationFormat(format, scenes) {
  return format === "auto"
    ? hasTransparentScenes(scenes)
      ? "mkv"
      : "mp4"
    : format;
}
