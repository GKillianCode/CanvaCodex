import { normalizeAnimation } from './animationModel.js';
import { normalizeShape } from './shapes.js';
import { builtinMotions, applyMotion } from './animationPresets.js';

// Enrich the existing worlds without changing their physical routes.
export function enrichSlimeWorkflow(scenes) {
  const finale = structuredClone(scenes[1]);
  Object.assign(finale, { id: 'slime-scene-4', title: 'Observatoire · le relais des mondes', grid: { x: 3, y: 1 } });
  // Match the previous world's exit exactly at the next canvas boundary.
  for (const [key, p] of Object.entries(finale.positions)) if (key !== 'textScene') { p.x -= 40; p.y += 80; }
  for (const path of finale.animation.paths) for (const p of path.points) { p.x -= 40; p.y += 80; }
  for (const clip of finale.animation.clips) for (const f of clip.frames) {
    if (f.field === 'x') f.value -= 40;
    if (f.field === 'y') f.value += 80;
  }
  finale.elements.shapeSlime.shape = 'star';
  finale.animation.color = '#263744';
  finale.animation.color2 = '#55445d';
  const background = finale.animation.clips.find(c => c.id === 'scene-background');
  for (const f of background.frames) {
    if (f.field === 'backgroundColor') f.value = f.time ? '#42655e' : '#263744';
    if (f.field === 'backgroundColor2') f.value = f.time ? '#a58d70' : '#55445d';
  }
  for (const [key, e] of Object.entries(finale.elements)) {
    if (e.type === 'shape' && key !== 'shapeSlime' && !e.engineKind) {
      e.fill = key.includes('Ground') ? '#566b70' : '#657281';
      e.stroke = '#a5b9ba';
    }
  }
  if (finale.elements.textScene) { finale.elements.textScene.text = '05  OBSERVATOIRE DES MONDES'; finale.positions.textScene.textStyle.color = '#e5e4db'; }
  scenes.push(finale);
  const names = ['Prairie', 'Canyon', 'Atelier nocturne', 'Monde inversé', 'Observatoire'];
  for (const [i, scene] of scenes.entries()) {
    const a = scene.animation, duration = a.duration;
    function add(key, name, shape, x, y, w, h, fill) {
      scene.blockKeys.push(key);
      scene.elements[key] = normalizeShape({ name, shape, fill, outlined: true, stroke: '#e6dfcf', strokeWidth: 2 });
      scene.positions[key] = { x, y, w, h, size: 30 };
      scene.fragments[key] = { order: 0, animation: 'none' };
    }
    // A small travelling satellite remains attached to the physical character,
    // including during squash/stretch, falling and gravity inversion.
    add('shapeCompanion', 'Satellite attaché au Slime', 'diamond', 0, 0, 22, 22, '#eee0ad');
    add('shapeRelay', 'Relais · mouvement réutilisable', 'rounded', 1470, 180, 100, 100, '#9bb8b5');
    add('shapeSignal', 'Signal de fin de séquence', 'star', 1495, 205, 50, 50, '#dfbf88');
    a.attachments = [
      { id: 'slime-satellite', child: 'shapeCompanion', parent: 'shapeSlime', parentY: 0, offsetY: -30 },
      { id: 'relay-signal', child: 'shapeSignal', parent: 'shapeRelay', rotate: true },
    ];
    a.links = [{ id: 'relay-link', from: 'shapeCompanion', to: 'shapeRelay', color: '#c8b995', width: 3, visible: false }];
    // This is the actual preset applicator used by the library, baked as editable
    // native keys so importing never writes to the user's personal library.
    const { clip } = applyMotion(builtinMotions.find(p => p.id === 'builtin-pulse'), scene.positions.shapeRelay, 'shapeRelay', 0, 2);
    clip.id = 'relay-preset';
    clip.name = 'Préréglage réutilisé · pulsation du relais';
    for (const f of clip.frames) if (f.time === 0) { f.ease = 'bezier'; f.curve = [0.22, 0.05, 0.3, 1]; }
    a.clips.push(clip, {
      id: 'relay-rotation', name: 'Relais · activation orchestrée', keys: ['shapeRelay'], duration: 2,
      frames: [{ field: 'rotation', time: 0, value: 0, ease: 'bezier', curve: [0.3, 0, 0.25, 1] }, { field: 'rotation', time: 2, value: 90 }],
    }, {
      id: 'camera-tour', name: 'Caméra · observer puis retrouver le cadre', keys: [], duration,
      frames: [
        { field: 'cameraZoom', time: 0, value: 100, ease: 'smooth' },
        { field: 'cameraZoom', time: duration * 0.45, value: i === 4 ? 112 : 106, ease: 'smooth' },
        { field: 'cameraZoom', time: duration, value: 100 },
        { field: 'cameraX', time: 0, value: 960, ease: 'smooth' },
        { field: 'cameraX', time: duration * 0.6, value: 1010, ease: 'smooth' },
        { field: 'cameraX', time: duration, value: 960 },
      ],
    });
    a.events = [
      { id: 'relay-reveal', name: `${names[i]} · connexion au relais`, trigger: 'time', time: 1, action: 'show', target: 'relay-link' },
      { id: 'relay-signal', name: 'Signal après pulsation', trigger: 'clipEnd', source: clip.id, action: 'show', target: 'shapeSignal' },
      { id: 'relay-start', name: 'Enchaîner la rotation', trigger: 'clipEnd', source: clip.id, action: 'startClip', target: 'relay-rotation' },
      { id: 'relay-color', name: 'Relais chargé', trigger: 'time', time: 4.2, action: 'color', target: 'shapeRelay', value: '#c4ad85' },
    ];
    if (i === 3) a.events.push({ id: 'contact-signal', name: 'Premier bloc touché · satellite étoilé', trigger: 'contact', source: 'lucky-0', action: 'shape', target: 'shapeCompanion', value: 'star' });
    if (i === 4) {
      add('shapeProbe', 'Sonde de l’observatoire · boucle spline', 'circle', 0, 0, 38, 38, '#c6b4d0');
      a.paths.push({ id: 'observatory-orbit', name: 'Orbite fermée de la sonde', visible: false, closed: true,
        points: [{x:1450,y:340},{x:1250,y:180},{x:1650,y:100},{x:1720,y:320},{x:1800,y:540},{x:1500,y:560},{x:1450,y:340}] });
      a.clips.push({ id: 'probe-orbit', name: 'Sonde · trajectoire orbitale', keys: ['shapeProbe'], pathId: 'observatory-orbit', duration,
        frames: [{ field: 'progress', time: 0, value: 0, ease: 'linear' }, { field: 'progress', time: duration, value: 1 }] });
      a.events.push({ id: 'finale-shape', name: 'Le relais devient une étoile', trigger: 'time', time: 7, action: 'shape', target: 'shapeRelay', value: 'star' });
      a.clips.push({ id: 'satellite-glow', name: 'Satellite · scintillement', keys: ['shapeCompanion'], duration,
        frames: [0, 2, 4, 6, 8, 10].map((time,j) => ({ field: 'opacity', time, value: j % 2 ? 45 : 100, ease: 'smooth' })) });
    }
    scene.animation = normalizeAnimation(a);
  }
  return scenes;
}
