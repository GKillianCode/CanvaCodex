import { fontCss, usedFonts } from './fonts.js';
import { prepareFonts } from './fontAssets.js';
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';
import { themes, presets, blocks, visibleBlocks, makeSlide, normalizeSlides, neighbor, nextFreeGrid, fragmentOrders, transitionDirection, memorySlides, positionsFor, applyLayout, blockType, blockText, setBlockText, reorderSlides, WIDTH, HEIGHT, normalizeResolution } from './model.js';
import { renderSlide, renderBanner, blockBounds, prepareImages } from './render.js';

import { duplicateElement, nudgePosition, resizeRotated, rotatePoint, rotationFromPointer, normalizeAngle } from './editor.js';
import { shapes, normalizeShape } from './shapes.js';
import { spatialRoute, tracedRoute, connectRoute } from './route.js';
import { normalizeThemes, themeDraft } from './themes.js';
import { LaserTrail } from './laser.js';

export function useStudio() {
  const sample = [
    Object.assign(makeSlide('split', { x: 0, y: 0 }), { title: 'Tout commence\npar le bytecode.', body: 'Le compilateur traduit votre code Java en instructions que la JVM sait exécuter.\n\nUn même fichier .class.\nPlusieurs systèmes d’exploitation.', code: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}' }),
    Object.assign(makeSlide('split', { x: 1, y: 0 }), { title: 'Du source\nà l’exécution.', body: 'Le fichier .java contient votre code.\njavac génère le bytecode .class.\nLa JVM charge et exécute ce bytecode.', code: '// Compiler, puis exécuter\n// javac HelloWorld.java\n// java HelloWorld' }),
    Object.assign(makeSlide('split', { x: 2, y: 0 }), { title: 'La JVM,\nune machine à part.', body: 'Chargement des classes, vérification du bytecode, gestion de la mémoire : la JVM fait bien plus qu’exécuter des instructions.', code: '// ClassLoader\n// Bytecode verifier\n// Interpreter + JIT compiler' }),
    Object.assign(makeSlide('title', { x: 3, y: 0 }), { title: 'Comprendre\navant d’automatiser.', body: 'Le bytecode est exécuté par la JVM.\nLe JIT peut compiler le code fréquemment exécuté en instructions natives.' }),
  ];
  let initial;
  try { const data = JSON.parse(localStorage.getItem('frame-project') || 'null'); if (data) initial = { ...data, slides: normalizeSlides(data.slides) }; } catch { /* Preserve malformed storage until the next explicit edit or import. */ }
  let library;try{library=JSON.parse(localStorage.getItem('frame-themes'));}catch{}
  const palette=ref(normalizeThemes(initial?.themes||library)),themeEditor=ref(null),themeUndo=ref(null);
  let preferences;try{preferences=JSON.parse(localStorage.getItem('frame-workspace'));}catch{}
  const panels=ref({rail:true,collapsed:false,properties:true,slides:true,toolbar:true,inspectorWidth:286,slidesWidth:185,...preferences}),displayMenu=ref(false),selectedKeys=ref([]),selectedSlides=ref([]),selectionScope=ref('elements'),countdown=ref(0),previewVisible=ref(true);
  watch(panels,()=>{try{localStorage.setItem('frame-workspace',JSON.stringify(panels.value));}catch{}},{deep:true});
  const slides = ref(initial?.slides || sample), project = ref(initial?.project || 'Java, sous le capot');
  const themeId = ref(palette.value.some(t=>t.id===initial?.themeId)?initial.themeId:palette.value[0].id), frame = ref({ header: initial?.frame?.header === true, footer: initial?.frame?.footer === true });
  const banner = ref(initial?.banner || { title: 'Le bytecode, expliqué.', subtitle: 'JAVA · SOUS LE CAPOT', type: 'lower' });
  const index = ref(0), view = ref('slides'), tab = ref('layout'), selected = ref(null), presenting = ref(false), canvas = ref(null), stage = ref(null), stageWidth = ref(900);
  const toast = ref(''), saved = ref(true), zoom = ref(100), recording = ref(false), elapsed = ref(0), laser = ref('#ff756d'), laserSize = ref(12), tool = ref('laser');
  const fontLoading=ref(false);
  const lastExport = ref(null), videoPreview = ref(false), videoMeta = ref(''), finalizing = ref(false), shapeGallery=ref(false), gallery = ref(false), editing = ref(null), formatting = ref(false);
  const resolution = ref(normalizeResolution(initial?.resolution)), formatOpen = ref(false), formatWidth = ref(resolution.value.width);
  const trail = new LaserTrail(), layoutBackup=ref(null);
  const canUndoLayout=computed(()=>layoutBackup.value?.id===current.value?.id);
  const altHeld=ref(false), contextMenu=ref(null), transformPreview=shallowRef(null);
  const codeCaption=computed({get:()=>selected.value==='code'?current.value.codeTitle||'':current.value.elements[selected.value]?.caption||'',set:value=>{if(selected.value==='code')current.value.codeTitle=value;else if(current.value.elements[selected.value])current.value.elements[selected.value].caption=value;}});
  const selectedBounds=computed(()=>{let s=current.value;const draft=transformPreview.value;if(draft?.id===s.id&&draft.key===selected.value)s={...s,positions:{...s.positions,[draft.key]:draft.position}};const p=s.positions[selected.value];if(!p||!visibleBlocks(s).includes(selected.value))return null;const b=blockBounds(measurement,s,selected.value);return {...b,h:p.h||b.h};});
  const handles=computed(()=>{const b=selectedBounds.value;if(!b)return [];return [['nw',b.x,b.y],['n',b.x+b.w/2,b.y],['ne',b.x+b.w,b.y],['w',b.x,b.y+b.h/2],['e',b.x+b.w,b.y+b.h/2],['sw',b.x,b.y+b.h],['s',b.x+b.w/2,b.y+b.h],['se',b.x+b.w,b.y+b.h]].map(([corner,x,y])=>{const p=rotatePoint({x,y},b);return {corner,style:{left:p.x/WIDTH*100+'%',top:p.y/HEIGHT*100+'%'}}});});
  const rotationHandle=computed(()=>{const b=selectedBounds.value;if(!b)return {};const d=28*WIDTH/Math.max(1,stageWidth.value),p=rotatePoint({x:b.x+b.w+d,y:b.y-d},b);return {left:p.x/WIDTH*100+'%',top:p.y/HEIGHT*100+'%'};});
  const routeMode=ref(['spatial','manual'].includes(initial?.routeMode)?initial.routeMode:'spatial'),routeStart=ref(slides.value.some(s=>s.id===initial?.routeStart)?initial.routeStart:''),routeBackup=ref(null);
  const workspace = ref('canvas'), listDrag = ref(null), listTarget = ref(null);
  const thumbs = shallowRef({}), step = ref(0), transitionMs = ref(initial?.transitionMs ?? 650), moving = ref(false), gridDraft = ref({ x: 0, y: 0 });
  const current = computed(() => slides.value[index.value]), theme = computed(() => palette.value.find(t => t.id === themeId.value) || palette.value[0]);
  const position = computed(() => current.value.positions[selected.value] || current.value.positions.title);
  const selectedType = computed(()=>blockType(current.value,selected.value));
  const editedText = computed(()=>blockText(current.value,editing.value));
  const exitLabel = computed(()=>{ if(current.value.exitDirection!=='auto') return ({left:'← Vers la gauche',right:'→ Vers la droite',up:'↑ Vers le haut',down:'↓ Vers le bas'})[current.value.exitDirection]; const next=slides.value[index.value+1];if(!next)return 'Fin du diaporama'; const d=transitionDirection(current.value,next);return d.x>0?'← Vers la gauche':d.x<0?'→ Vers la droite':d.y>0?'↑ Vers le haut':'↓ Vers le bas'; });
  const orders = computed(() => fragmentOrders(current.value));
  const measurement = document.createElement('canvas').getContext('2d');
  const editSize=computed(()=>selected.value?blockBounds(measurement,current.value,selected.value).size:42);
  const editStyle = computed(() => {
    if (!editing.value) return {};
    const k = editing.value, measured = blockBounds(measurement, current.value, k), b={...measured,h:current.value.positions[k].h||measured.h};
    return { transform:`rotate(${b.rotation||0}deg)`,transformOrigin:`${(b.w/2-(blockType(current.value,k)==='code'?80:0))*stageWidth.value/WIDTH}px ${(b.h/2-(blockType(current.value,k)==='code'?103:0))*stageWidth.value/WIDTH}px`, left: `${(b.x + (blockType(current.value,k)==='code' ? 80 : 0)) / WIDTH * 100}%`, top: `${(b.y + (blockType(current.value,k)==='code' ? 103 : 0)) / HEIGHT * 100}%`, width: `${(b.w - (blockType(current.value,k)==='code' ? 110 : 0)) / WIDTH * 100}%`, height: `${Math.max(blockType(current.value,k)==='code' ? b.h - 120 : b.h + 25, 85) / HEIGHT * 100}%` };
  });
  let toastTimer, saveTimer, thumbTimer, raf = 0, drag = null, pointer = null, pointerDown = null, strokes = [], activeStroke = null, slideMotion = null, revealMotion = null;
  let recorder, stream, timer, started = 0, observer, worker, workerCounter = 0;
  const modelController = new AbortController();
  const thumbnailKeys = new Map(), formatRequests = new Map();
  const metrics = { frames: 0, thumbnails: 0, dragCommits: 0 };
  const snapshot = () => ({ version: 9, routeMode:routeMode.value,routeStart:routeStart.value, themes:palette.value, resolution: resolution.value, project: project.value, slides: slides.value, themeId: themeId.value, banner: banner.value, frame: frame.value, transitionMs: transitionMs.value });
  const renderOptions = (s, n, order = Infinity) => ({ ...frame.value, project: project.value, n, total: slides.value.length, order });
  function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3500); }
  function queueSave() {
    saved.value = false; clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem('frame-project', JSON.stringify(snapshot())); localStorage.setItem('frame-themes',JSON.stringify(palette.value)); saved.value = true; } catch { notify('Sauvegarde locale impossible. Exporte ton projet.'); } }, 450);
  }
  function updateThumbnails() {
    const result = { ...thumbs.value };
    for (const [n, s] of slides.value.entries()) {
      const key = JSON.stringify([s, theme.value, frame.value, project.value, n, slides.value.length]);
      if (thumbnailKeys.get(s.id) === key) continue;
      const c = document.createElement('canvas'); c.width = 384; c.height = 216;
      const ctx = c.getContext('2d'); ctx.scale(.2, .2); renderSlide(ctx, s, theme.value, renderOptions(s, n));
      result[s.id] = c.toDataURL('image/jpeg', .65); thumbnailKeys.set(s.id, key); metrics.thumbnails++;
    }
    const alive = new Set(slides.value.map(s => s.id));
    for (const id of Object.keys(result)) if (!alive.has(id)) { delete result[id]; thumbnailKeys.delete(id); }
    thumbs.value = result;
  }
  function queueThumbnails() { clearTimeout(thumbTimer); thumbTimer = setTimeout(updateThumbnails, 220); }
  watch([routeMode,routeStart,palette, slides, project, themeId, banner, frame, transitionMs, resolution], () => { queueSave(); queueThumbnails(); requestDraw(); }, { deep: true });
  watch([view, selected, presenting, zoom, editing, workspace], async () => { await nextTick(); observeStage(); requestDraw(); });
  watch(current, s => { gridDraft.value = { ...s.grid }; selected.value=null;selectedKeys.value=[]; });
  watch(selected,key=>{if(key)selectedKeys.value=[key];});
  watch(workspace,value=>{selectionScope.value=value==='canvas'?'slides':'elements';deselect();});
  watch([laser, laserSize, tool, altHeld], requestDraw);
  let fontGeneration=0;
  watch(()=>usedFonts(slides.value).sort().join(','),async()=>{const generation=++fontGeneration;fontLoading.value=true;try{await prepareFonts(slides.value);if(generation===fontGeneration){thumbnailKeys.clear();queueThumbnails();requestDraw();}}catch{notify('Police non chargée. Réessaie avant d’exporter.');}finally{if(generation===fontGeneration)fontLoading.value=false;}},{immediate:true});
  async function ensureFonts(){try{await prepareFonts(slides.value);return true;}catch{notify('Impossible de charger les polices. Réessaie avant de présenter ou d’exporter.');return false;}}
  function observeStage() { if (!stage.value) return; observer?.disconnect(); observer = new ResizeObserver(entries => { stageWidth.value = entries[0].contentRect.width; }); observer.observe(stage.value); }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0; draw(now);
    if (trail.prune(now) || recording.value || slideMotion || (revealMotion && now - revealMotion.started < 360)) requestDraw();
    else revealMotion = null;
  }
  function snapshotCanvas(s, n, order) {
    const c = document.createElement('canvas'); c.width = resolution.value.width; c.height = resolution.value.height;
    const g=c.getContext('2d');g.scale(c.width/WIDTH,c.height/HEIGHT);
    renderSlide(g, s, theme.value, renderOptions(s, n, order)); return c;
  }
  function currentOrder() { return step.value > 0 ? orders.value[step.value - 1] : 0; }
  function draw(now = performance.now()) {
    if (!canvas.value || !current.value) return;
    metrics.frames++;
    const ctx = canvas.value.getContext('2d'); ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); ctx.save();ctx.scale(canvas.value.width/WIDTH,canvas.value.height/HEIGHT);
    if (view.value === 'banners') renderBanner(ctx, banner.value, theme.value);
    else if (slideMotion && presenting.value) {
      const p = Math.min(1, (now - slideMotion.started) / slideMotion.duration), ease = p * p * (3 - 2 * p), { from, to, direction } = slideMotion;
      ctx.drawImage(from, -direction.x * WIDTH * ease, -direction.y * HEIGHT * ease, WIDTH, HEIGHT);
      ctx.drawImage(to, direction.x * WIDTH * (1 - ease), direction.y * HEIGHT * (1 - ease), WIDTH, HEIGHT);
      if (p === 1) { slideMotion = null; moving.value = false; }
    } else {
      let s = current.value;
      if (drag) s = { ...toRaw(s), positions: { ...s.positions, [drag.key]: drag.position } };
      renderSlide(ctx, s, theme.value, { ...renderOptions(s, index.value, presenting.value ? currentOrder() : Infinity), motion: presenting.value ? revealMotion : null, now, omit: editing.value });
      if (!presenting.value && !editing.value && (selectedKeys.value.length||visibleBlocks(s).includes(selected.value))) {
        for(const key of selectedKeys.value.length?selectedKeys.value:[selected.value]){
        const measured=blockBounds(ctx,s,key), b={...measured,h:s.positions[key].h||measured.h}; ctx.save();if(b.rotation){ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.rotation*Math.PI/180);ctx.translate(-b.x-b.w/2,-b.y-b.h/2);}ctx.strokeStyle = `${theme.value.accent}90`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);ctx.restore();if(altHeld.value)drawDistances(ctx,b);}
      }
    }
    if (presenting.value) { trail.draw(ctx,now); drawPointer(ctx); } ctx.restore();
  }
  function drawPointer(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) { ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.beginPath(); stroke.points.forEach((p, n) => n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
    if (pointer && tool.value === 'laser') { ctx.fillStyle = laser.value; ctx.shadowColor = laser.value; ctx.shadowBlur = 22; ctx.beginPath(); ctx.globalAlpha=.75;ctx.arc(pointer.x, pointer.y, Math.max(2,laserSize.value*.3), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;ctx.globalAlpha=1; }
  }
  function drawDistances(ctx,b) {
    const scale=WIDTH/Math.max(1,stageWidth.value),f=resolution.value.width/WIDTH;ctx.save();ctx.strokeStyle='#76dfff';ctx.fillStyle='#76dfff';ctx.lineWidth=scale;ctx.setLineDash([4*scale,4*scale]);ctx.beginPath();ctx.moveTo(0,b.y);ctx.lineTo(b.x,b.y);ctx.moveTo(b.x,0);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);ctx.font=`600 ${12*scale}px Arial`;ctx.textBaseline='top';
    const label=(value,x,y)=>{const text=`${Math.round(value*f)} px`,w=ctx.measureText(text).width;ctx.fillStyle='#071c29';ctx.fillRect(Math.min(WIDTH-w-8*scale,Math.max(0,x)),Math.max(0,y),w+8*scale,20*scale);ctx.fillStyle='#76dfff';ctx.fillText(text,Math.min(WIDTH-w-4*scale,Math.max(0,x))+4*scale,Math.max(0,y)+3*scale);};
    label(b.x,Math.max(0,b.x/2-25*scale),b.y-24*scale);label(b.y,b.x+8*scale,Math.max(0,b.y/2-10*scale));ctx.restore();
  }
  function resizeDown(e,corner){if(e.button!==0)return;e.preventDefault();closeEdit();contextMenu.value=null;const b=selectedBounds.value;if(!b)return;drag={key:selected.value,slideId:current.value.id,origin:{...position.value,h:b.h},position:{...position.value,h:b.h},start:coords(e),corner,type:selectedType.value,moved:false};e.currentTarget.setPointerCapture(e.pointerId);requestDraw();}
  function rotateDown(e){if(e.button!==0)return;e.preventDefault();closeEdit();contextMenu.value=null;const b=selectedBounds.value;if(!b)return;drag={key:selected.value,slideId:current.value.id,origin:{...position.value,h:b.h},position:{...position.value,h:b.h},start:coords(e),rotating:true,moved:false};e.currentTarget.setPointerCapture(e.pointerId);requestDraw();}
  function setRotation(e){position.value.rotation=normalizeAngle(e.target.value);e.target.value=Math.round(position.value.rotation*100)/100;}
  function duplicateSelected(){closeEdit();const key=duplicateElement(current.value,selected.value);contextMenu.value=null;if(key){selected.value=key;selectedKeys.value=[key];}else notify('Limite de 40 éléments ajoutés atteinte.');}
  function openContext(e){e.preventDefault();if(presenting.value||view.value!=='slides')return;closeEdit();const hit=hitBlock(coords(e));if(hit){selected.value=hit;selectedKeys.value=[hit];selectionScope.value='elements';}else deselect();contextMenu.value={x:Math.max(8,Math.min(window.innerWidth-224,e.clientX)),y:Math.max(8,Math.min(window.innerHeight-280,e.clientY)),element:!!hit};}
  function contextOutside(e){if(!e.target.closest?.('.element-context'))dismissContext();}
  function dismissContext(){contextMenu.value=null;}
  function keyup(e){if(e.key==='Alt')altHeld.value=false;}
  function resetKeys(){altHeld.value=false;contextMenu.value=null;}
  function clearAnnotations() { strokes = []; trail.clear(); requestDraw(); }
  function coords(e) { const r = canvas.value.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * WIDTH, y: (e.clientY - r.top) / r.height * HEIGHT }; }
  function hitBlock(p) {
    const ctx = canvas.value.getContext('2d');
    return [...visibleBlocks(current.value)].reverse().find(k => { const measured=blockBounds(ctx,current.value,k),b={...measured,h:current.value.positions[k].h||measured.h}; const local=rotatePoint(p,b,-(b.rotation||0));return local.x >= b.x - 12 && local.x <= b.x + b.w + 12 && local.y >= b.y - (k === 'title' && current.value.label ? 58 : 12) && local.y <= b.y + b.h + 12; });
  }
  function down(e) {
    if (e.button !== 0 || view.value === 'banners' || videoPreview.value) return;
    closeEdit();contextMenu.value=null;if(!presenting.value)selectionScope.value='elements';const p = coords(e); canvas.value.setPointerCapture(e.pointerId);
    if (presenting.value) { pointer = p; pointerDown = { ...p, moved: false }; if(tool.value==='laser')trail.begin(p,performance.now(),laser.value,laserSize.value); if (tool.value === 'pen') { activeStroke = { color: laser.value, size: laserSize.value / 2, points: [p] }; strokes.push(activeStroke); } }
    else { const hit = hitBlock(p); if (!hit) {deselect();requestDraw();return;} selectionScope.value='elements'; if(e.ctrlKey||e.metaKey){selectedKeys.value=selectedKeys.value.includes(hit)?selectedKeys.value.filter(k=>k!==hit):[...selectedKeys.value,hit];selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;requestDraw();return;} selectedKeys.value=[hit];selected.value = hit; drag = { key: hit, slideId: current.value.id, origin: { ...current.value.positions[hit] }, start: p, position: { ...current.value.positions[hit] }, moved: false }; }
    requestDraw();
  }
  function move(e) {
    const p = coords(e);
    if (presenting.value) { pointer = p; if (pointerDown && Math.hypot(p.x - pointerDown.x, p.y - pointerDown.y) > 12) pointerDown.moved = true; if (pointerDown && (e.buttons & 1) && tool.value==='laser') {const now=performance.now(),samples=e.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[e])trail.append(coords(sample),now-Math.max(0,Math.min(50,e.timeStamp-sample.timeStamp)));} else if (!(e.buttons & 1)) trail.end(); if (activeStroke && (e.buttons & 1)) activeStroke.points.push(p); requestDraw(); }
    else if(drag?.rotating){drag.moved=true;drag.position={...drag.origin,rotation:rotationFromPointer(drag.origin,drag.start,p,e.shiftKey)};transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position};requestDraw();}
    else if (drag?.corner) {const dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.moved=true;drag.position=resizeRotated(drag.origin,drag.corner,dx,dy,drag.type);transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position};requestDraw();}
    else if (drag) { const dx = p.x - drag.start.x, dy = p.y - drag.start.y; if (Math.hypot(dx, dy) > 2) drag.moved = true; drag.position = { ...drag.origin, x: Math.round(Math.max(0, Math.min(WIDTH - 40, drag.origin.x + dx))), y: Math.round(Math.max(0, Math.min(HEIGHT - 40, drag.origin.y + dy))) };transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position}; requestDraw(); }
  }
  function up(e) {
    if (drag) { if (e?.type!=='pointercancel' && drag.moved && drag.slideId === current.value.id) { current.value.positions[drag.key] = { ...drag.position }; metrics.dragCommits++; } drag = null; }
    transformPreview.value=null;trail.end();
    pointerDown = null; activeStroke = null; requestDraw();
  }
  function leave() { pointer = null; requestDraw(); }
  function doubleClick(e) { if (presenting.value || view.value !== 'slides') return; const hit = hitBlock(coords(e)); if (!hit) return; drag = null; selected.value = hit;selectedKeys.value=[hit];selectionScope.value='elements'; if(!['image','shape'].includes(blockType(current.value,hit))) editing.value = hit; requestDraw(); }
  function closeEdit() { editing.value = null; requestDraw(); }
  function editSelected() { if (!visibleBlocks(current.value).includes(selected.value))return; if(!['image','shape'].includes(selectedType.value)) editing.value = selected.value; }
  function chooseSlide(n) {
    if (n < 0 || n >= slides.value.length || n === index.value || moving.value) return;
    closeEdit(); drag = null; transformPreview.value=null;pointer = null; strokes = []; trail.clear();
    if (presenting.value) {
      const old = current.value, oldIndex = index.value, oldOrder = currentOrder(), next = slides.value[n];
      const from = snapshotCanvas(old, oldIndex, oldOrder), to = snapshotCanvas(next, n, 0);
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : transitionMs.value;
      if (duration > 0) { slideMotion = { from, to, started: performance.now(), duration, direction: n < oldIndex ? (()=>{const d=transitionDirection(next,old);return {x:-d.x,y:-d.y};})() : transitionDirection(old, next) }; moving.value = true; }
    }
    revealMotion = null; index.value = n; step.value = 0; gridDraft.value = { ...current.value.grid }; requestDraw();
  }
  function navigate(delta) { if (presenting.value) delta > 0 ? advance() : retreat(); else chooseSlide(index.value + delta); }
  function advance() { if (moving.value) return; if (step.value < orders.value.length) { step.value++; revealMotion = { order: currentOrder(), started: performance.now() }; requestDraw(); } else chooseSlide(index.value + 1); }
  function retreat() { if (moving.value) return; if (step.value > 0) { step.value--; revealMotion = null; requestDraw(); } else chooseSlide(index.value - 1); }
  function goDirection(direction) { if (moving.value) return; const target = neighbor(slides.value, index.value, direction); if (target >= 0) chooseSlide(target); }
  function canGo(direction) { return neighbor(slides.value, index.value, direction) >= 0 && !moving.value; }
  function add() { closeEdit(); gallery.value = true; }
  function chooseLayout(layout) { if(slides.value.length>=100){notify('Le projet contient déjà 100 diapos.');return;} const s = makeSlide(layout, nextFreeGrid(slides.value, current.value.grid, 'right')); slides.value.push(s); gallery.value = false; chooseSlide(slides.value.length - 1); selected.value = 'title';if(routeMode.value==='spatial')rebuildRoute(); }
  function addMemory() {
    if(slides.value.length>96){notify('Il faut quatre places libres dans ce projet de 100 diapos maximum.');return;}
    let x = current.value.grid.x + 1;
    while (slides.value.some(s => s.grid.x === x)) x++;
    const first = slides.value.length; slides.value.push(...memorySlides({ x, y: 0 })); gallery.value = false; chooseSlide(first);if(routeMode.value==='spatial')rebuildRoute(); notify('Parcours mémoire ajouté : descends avec ↓, révèle avec Espace.');
  }
  function applyFormat() { const width=Number(formatWidth.value); const next=normalizeResolution({width,height:width*9/16}); if(next.width!==width){notify('Largeur entre 640 et 3840, multiple de 16.');return;}resolution.value=next;formatOpen.value=false;nextTick(requestDraw); }
  function undoLayout(){if(!canUndoLayout.value)return;closeEdit();const old=layoutBackup.value,added=Object.fromEntries(Object.entries(current.value.positions).filter(([k])=>!old.positions[k]));for(const key of ['layout','positions','blockKeys','designVersion'])current.value[key]=JSON.parse(JSON.stringify(old[key]));Object.assign(current.value.positions,added);current.value.blockKeys=current.value.blockKeys.filter(k=>blocks.includes(k)||current.value.elements[k]);layoutBackup.value=null;if(!visibleBlocks(current.value).includes(selected.value))selected.value=visibleBlocks(current.value)[0]||'title';requestDraw();}
  function applyPreset(id) { layoutBackup.value=JSON.parse(JSON.stringify(current.value));closeEdit(); applyLayout(current.value,id); if (!visibleBlocks(current.value).includes(selected.value)) selected.value = 'title'; }
  function changeText(value) { setBlockText(current.value,editing.value,value); }
  function openShapes(){closeEdit();contextMenu.value=null;shapeGallery.value=true;}
  function addShape(id){const spec=shapes.find(s=>s.id===id);if(!spec)return;if(Object.keys(current.value.elements).length>=40){notify('Cette diapo contient déjà 40 éléments ajoutés.');return;}workspace.value='editor';closeEdit();const key='shape'+crypto.randomUUID().replaceAll('-','').slice(0,8);current.value.elements[key]=normalizeShape({shape:id,fill:theme.value.accent,stroke:theme.value.accent});current.value.positions[key]={x:(WIDTH-spec.w)/2,y:(HEIGHT-spec.h)/2,w:spec.w,h:spec.h,size:38};current.value.fragments[key]={order:0,animation:'fade'};shapeGallery.value=false;selectionScope.value='elements';nextTick(()=>{selected.value=key;selectedKeys.value=[key];requestDraw();});}
  function moveLayer(front){const keys=visibleBlocks(current.value).filter(k=>k!==selected.value);current.value.blockKeys=front?[...keys,selected.value]:[selected.value,...keys];requestDraw();}
  function addBlock(type) {
    if(Object.keys(current.value.elements).length>=40){notify('Cette diapo contient déjà 40 éléments ajoutés.');return;}
    closeEdit(); const key=type+crypto.randomUUID().replaceAll('-','').slice(0,8), s=current.value;
    const count=type==='text'?visibleBlocks(s).filter(k=>k!=='title'&&blockType(s,k)==='text').length+1:Object.values(s.elements).filter(e=>e.type===type).length+1;
    s.elements[key]=type==='code'?{type,custom:true,name:'Code '+count,text:'// Ton extrait Java',caption:''}:type==='text'?{type,custom:true,name:'Texte '+count,text:'Ton nouveau texte.'}:{type,custom:true,name:'Image '+count,src:'',fit:'contain'};
    const bottom=Math.max(250,...visibleBlocks(s).filter(k=>k!==key&&blockType(s,k)==='text').map(k=>{const b=blockBounds(measurement,s,k);return b.y+b.h;}));
    const y=type==='text'?Math.min(900,Math.round(bottom+55)):Math.min(640,300+count*120);
    s.positions[key]={x:200,y,w:type==='text'?(visibleBlocks(s).includes('code')?650:1200):700,h:Math.min(400,HEIGHT-y-40),size:type==='code'?28:42};
    s.fragments[key]={order:Math.min(20,Math.max(0,...Object.values(s.fragments).map(f=>f.order))+1),animation:'up'};
    selectedKeys.value=[key];selectionScope.value='elements';selected.value=key;if(type==='text')editing.value=key;
  }
  function removeBlock() { const keys=selectedKeys.value.length?selectedKeys.value:[selected.value];contextMenu.value=null;closeEdit();for(const k of keys){if(!k)continue;delete current.value.elements[k];delete current.value.positions[k];delete current.value.fragments[k];current.value.blockKeys=current.value.blockKeys.filter(key=>key!==k);}deselect();requestDraw(); }
  async function uploadImage(event) {
    const file=event.target.files?.[0], s=current.value, key=selected.value; event.target.value='';
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){notify('Choisis un PNG, JPEG ou WebP de moins de 20 Mo.');return;}
    try {
      const image=await createImageBitmap(file), ratio=Math.min(1,1600/Math.max(image.width,image.height));
      const c=document.createElement('canvas');c.width=Math.round(image.width*ratio);c.height=Math.round(image.height*ratio);c.getContext('2d').drawImage(image,0,0,c.width,c.height);image.close();
      const src=c.toDataURL('image/webp',.85);if(src.length>=3000000)throw Error();
      if(s.elements[key]?.type==='image')s.elements[key].src=src;
      await prepareImages([s]);notify('Image ajoutée et intégrée au projet.');
    }catch{notify('Cette image n’a pas pu être chargée.');}
  }
  function reorder(from,to) { routeMode.value='manual'; const id=current.value.id;slides.value=reorderSlides(slides.value,from,to);routeStart.value=slides.value[0].id;index.value=slides.value.findIndex(s=>s.id===id);requestDraw(); }
  function listDown(event,n) {
    if(event.button!==0)return;
    event.preventDefault();let moved=false;
    const move=e=>{
      if(Math.hypot(e.clientX-event.clientX,e.clientY-event.clientY)>5)moved=true;
      if(!moved)return;
      listDrag.value=n;
      const list=document.querySelector('.slide-list'),rect=list?.getBoundingClientRect();
      if(rect){if(e.clientY<rect.top+20)list.scrollTop-=12;else if(e.clientY>rect.bottom-20)list.scrollTop+=12;if(e.clientX<rect.left+20)list.scrollLeft-=12;else if(e.clientX>rect.right-20)list.scrollLeft+=12;}
      const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slide-index]');if(el)listTarget.value=Number(el.dataset.slideIndex);
    };
    const end=()=>{if(moved&&listTarget.value!==null)reorder(n,listTarget.value);listDrag.value=null;listTarget.value=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);};
    const cancel=()=>{moved=false;end();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);
  }
  function applyRoute(route,mode='manual'){if(presenting.value)return;const id=current.value.id;routeBackup.value={ids:slides.value.map(s=>s.id),mode:routeMode.value,start:routeStart.value,exits:Object.fromEntries(slides.value.map(s=>[s.id,s.exitDirection]))};slides.value=route;routeMode.value=mode;if(mode==='manual')routeStart.value=route[0]?.id||'';for(const s of route)s.exitDirection='auto';index.value=Math.max(0,route.findIndex(s=>s.id===id));step.value=0;requestDraw();}
  function rebuildRoute(){if(!slides.value.some(s=>s.id===routeStart.value))routeStart.value='';applyRoute(spatialRoute(slides.value,routeStart.value),'spatial');}
  function setRouteMode(mode){if(mode==='spatial')rebuildRoute();else{routeMode.value='manual';routeStart.value=slides.value[0].id;}}
  function setRouteStart(id){const previous=routeStart.value;routeStart.value=slides.value.some(s=>s.id===id)?id:'';if(routeMode.value==='spatial')rebuildRoute();else if(routeStart.value)applyRoute(tracedRoute(slides.value,[routeStart.value]));if(routeBackup.value)routeBackup.value.start=previous;}
  function traceRoute(ids){applyRoute(tracedRoute(slides.value,ids));routeStart.value=slides.value[0].id;notify('Parcours défini. Espace suivra ce fil.');}
  function connectSlides(from,to){if(from===to||!slides.value.some(s=>s.id===from)||!slides.value.some(s=>s.id===to))return;applyRoute(connectRoute(slides.value,from,to));notify('Lien ajouté au parcours.');}
  function undoRoute(){const backup=routeBackup.value;if(!backup)return;const id=current.value.id;slides.value=tracedRoute(slides.value,backup.ids);routeMode.value=backup.mode;routeStart.value=backup.start;for(const s of slides.value)if(backup.exits[s.id])s.exitDirection=backup.exits[s.id];index.value=Math.max(0,slides.value.findIndex(s=>s.id===id));routeBackup.value=null;requestDraw();}
  function moveGrid(id,x,y) { if(!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>10000||Math.abs(y)>10000)return; const s=slides.value.find(s=>s.id===id);if(!s)return;const occupant=slides.value.find(other=>other.id!==id&&other.grid.x===x&&other.grid.y===y);if(occupant){occupant.grid={...s.grid};notify('Positions des deux diapos interverties.');}s.grid={x,y};if(routeMode.value==='spatial')rebuildRoute(); }
  function imagesReady() {thumbnailKeys.clear();queueThumbnails();requestDraw();}
  function duplicate() { if(slides.value.length>=100){notify('Le projet contient déjà 100 diapos.');return;} const s = JSON.parse(JSON.stringify(current.value)); s.id = crypto.randomUUID(); s.grid = nextFreeGrid(slides.value, current.value.grid, 'right'); slides.value.splice(index.value + 1, 0, s); chooseSlide(index.value + 1);if(routeMode.value==='spatial')rebuildRoute(); }
  function remove() { if (slides.value.length <= 1) return; closeEdit(); slides.value.splice(index.value, 1); index.value = Math.min(index.value, slides.value.length - 1); gridDraft.value = { ...current.value.grid };if(routeMode.value==='spatial')rebuildRoute(); requestDraw(); }
  function applyGrid() {
    const { x, y } = gridDraft.value;
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000 || slides.value.some(s => s.id !== current.value.id && s.grid.x === x && s.grid.y === y)) { gridDraft.value = { ...current.value.grid }; notify('Cette case est occupée ou sa position est invalide.'); return; }
    current.value.grid = { x, y };if(routeMode.value==='spatial')rebuildRoute();
  }
  function setPosition(key, event) { const value = Number(event.target.value)*WIDTH/resolution.value.width; const min = key==='w'?(selectedType.value==='code'?240:selectedType.value==='shape'?8:80):key==='h'?(selectedType.value==='code'?180:selectedType.value==='shape'?8:40):key==='size'?10:0, max = key === 'y' || key === 'h' ? HEIGHT : key === 'size' ? 260 : WIDTH; position.value[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : position.value[key]; event.target.value = Math.round(position.value[key]*resolution.value.width/WIDTH); }
  function updateFragment(event) { current.value.fragments[selected.value].order = Math.max(0, Math.min(20, Math.round(Number(event.target.value) || 0))); }
  function formatCode(source = blockText(current.value,selected.value)) {
    const slideId = current.value.id, key=selected.value;
    if (!worker) {
      worker = new Worker(new URL('./formatter.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => { const job = formatRequests.get(data.id); formatRequests.delete(data.id); formatting.value = formatRequests.size > 0; if (!job) return; const s = slides.value.find(s => s.id === job.slideId); if (!s || blockText(s,job.key) !== job.source) return; if (data.ok) { setBlockText(s,job.key,data.code); notify('Code Java formaté.'); } else notify('Extrait incomplet ou non Java : texte conservé sans modification.'); };
      worker.onerror = () => { formatRequests.clear(); formatting.value = false; worker?.terminate(); worker = null; notify('Formatage indisponible : ton code est conservé.'); };
    }
    const id = ++workerCounter; formatRequests.set(id, { slideId, key, source }); formatting.value = true; worker.postMessage({ id, code: source });
  }
  function download(blob, name) {
    if (lastExport.value) URL.revokeObjectURL(lastExport.value.url);
    const url = URL.createObjectURL(blob); lastExport.value = { url, name, size: Math.max(1, Math.round(blob.size / 1024)), video: blob.type.startsWith('video/') };
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    if (lastExport.value.video) { videoMeta.value = ''; videoPreview.value = true; }
  }
  function exportProject() { download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), 'frame-projet.json'); }
  async function importProject(event) {
    try {
      const data = JSON.parse(await event.target.files[0].text()), normalized = normalizeSlides(data.slides);
      closeEdit();layoutBackup.value=null;contextMenu.value=null; slides.value = normalized; project.value = String(data.project || 'Projet importé'); if(data.themes)palette.value=normalizeThemes(data.themes);themeId.value=palette.value.some(t=>t.id===data.themeId)?data.themeId:palette.value[0].id;deselect();selectedSlides.value=[];
      if (data.banner && typeof data.banner.title === 'string' && typeof data.banner.subtitle === 'string' && ['lower', 'chapter', 'tip'].includes(data.banner.type)) banner.value = data.banner;
      routeMode.value=['spatial','manual'].includes(data.routeMode)?data.routeMode:'spatial';routeStart.value=normalized.some(s=>s.id===data.routeStart)?data.routeStart:'';routeBackup.value=null;resolution.value=normalizeResolution(data.resolution);
      frame.value = { header: data.frame?.header === true, footer: data.frame?.footer === true }; transitionMs.value = Number.isFinite(data.transitionMs) ? Math.min(2000, Math.max(0, data.transitionMs)) : 650;
      index.value = 0; step.value = 0; gridDraft.value = { ...current.value.grid }; updateThumbnails(); requestDraw(); notify('Projet importé.');
    } catch { notify('Ce fichier n’est pas un projet Frame valide.'); }
    event.target.value = '';
  }
  async function png() { if(!await ensureFonts())return;await prepareImages([current.value]); const c = document.createElement('canvas'); c.width = resolution.value.width; c.height = resolution.value.height; const ctx = c.getContext('2d');ctx.scale(c.width/WIDTH,c.height/HEIGHT); if (view.value === 'banners') renderBanner(ctx, banner.value, theme.value); else renderSlide(ctx, current.value, theme.value, renderOptions(current.value, index.value)); c.toBlob(blob => { if (blob) download(blob, view.value === 'banners' ? 'frame-bandeau.png' : `frame-diapo-${index.value + 1}.png`); }, 'image/png'); }
  async function startPresentation(fromStart=true) { if(!await ensureFonts())return;await prepareImages(slides.value); closeEdit(); if(fromStart)index.value=0; view.value = 'slides'; presenting.value = true; step.value = 0; revealMotion = null; strokes = []; trail.clear(); await nextTick(); observeStage(); requestDraw(); }
  function exit() { cancelCountdown(); if (recording.value) stopRecord(); slideMotion = null; moving.value = false; presenting.value = false; strokes = []; trail.clear(); requestDraw(); }
  let countdownTimer;
  function cancelCountdown(){clearInterval(countdownTimer);countdown.value=0;}
  async function startRecord(){if(countdown.value){cancelCountdown();return;}if(recording.value||finalizing.value)return;if(!await ensureFonts())return;countdown.value=5;const deadline=performance.now()+5000;countdownTimer=setInterval(()=>{countdown.value=Math.max(0,Math.ceil((deadline-performance.now())/1000));if(!countdown.value){cancelCountdown();recordNow();}},100);}
  function recordNow() {
    if (finalizing.value||recording.value||!presenting.value) return;
    if (!canvas.value?.captureStream || !window.MediaRecorder) { notify('Enregistrement indisponible dans ce navigateur.'); return; }
    try {
      const chunks = []; stream = canvas.value.captureStream(30); const recordingStream = stream;
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); if (!mime) throw Error();
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: Math.round(10000000*resolution.value.width/1920) });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => { recording.value = false; finalizing.value = false; clearInterval(timer); recordingStream.getTracks().forEach(t => t.stop()); notify('L’enregistrement a rencontré une erreur.'); };
      recorder.onstop = () => { download(new Blob(chunks, { type: mime }), 'frame-presentation.webm'); recordingStream.getTracks().forEach(t => t.stop()); finalizing.value = false; };
      recorder.start(1000); recording.value = true; started = Date.now(); elapsed.value = 0; timer = setInterval(() => elapsed.value = Math.floor((Date.now() - started) / 1000), 1000); requestDraw();
    } catch { stream?.getTracks().forEach(t => t.stop()); notify('Impossible de lancer l’enregistrement.'); }
  }
  function stopRecord() { if (!recording.value) return; recording.value = false; finalizing.value = true; clearInterval(timer); recorder.stop(); }
  function deselect(){selected.value=null;selectedKeys.value=[];selectedSlides.value=[];closeEdit();}
  function selectSlide(n,event){chooseSlide(n);selectionScope.value='slides';selected.value=null;selectedKeys.value=[];const id=slides.value[n]?.id;if(!id)return;selectedSlides.value=event&&(event.ctrlKey||event.metaKey)?(selectedSlides.value.includes(id)?selectedSlides.value.filter(k=>k!==id):[...selectedSlides.value,id]):[id];}
  function deleteSlides(){const ids=new Set(selectedSlides.value);if(!ids.size)return;const remaining=slides.value.filter(s=>!ids.has(s.id));if(!remaining.length){notify('Conserve au moins une diapo dans le projet.');return;}closeEdit();slides.value=remaining;index.value=Math.min(index.value,remaining.length-1);deselect();if(routeMode.value==='spatial')rebuildRoute();requestDraw();}
  function openTheme(source,copy=false){themeEditor.value=source&&!copy?structuredClone(toRaw(source)):themeDraft(source);}
  function saveTheme(){const draft=themeEditor.value;if(!draft?.name.trim())return;const normalized=normalizeThemes([draft])[0];if(normalized.id!==draft.id)return;const n=palette.value.findIndex(t=>t.id===draft.id);if(n<0){if(palette.value.length>=100){notify('Limite de 100 thèmes atteinte.');return;}palette.value.push(normalized);}else palette.value[n]=normalized;themeId.value=draft.id;themeEditor.value=null;notify('Thème sauvegardé.');}
  function deleteTheme(id){if(palette.value.length===1){notify('Conserve au moins un thème.');return;}const n=palette.value.findIndex(t=>t.id===id);if(n<0)return;themeUndo.value={theme:structuredClone(toRaw(palette.value[n])),index:n,id:themeId.value};palette.value=palette.value.filter(t=>t.id!==id);if(themeId.value===id)themeId.value=palette.value[0].id;notify('Thème supprimé. Tu peux annuler.');}
  function undoTheme(){if(!themeUndo.value)return;if(!palette.value.some(t=>t.id===themeUndo.value.theme.id))palette.value.splice(themeUndo.value.index,0,themeUndo.value.theme);if(palette.value.some(t=>t.id===themeUndo.value.id))themeId.value=themeUndo.value.id;themeUndo.value=null;}
  function resizePanel(e,key){e.preventDefault();const origin=panels.value[key],start=e.clientX,direction=key==='inspectorWidth'?-1:1;const move=event=>panels.value[key]=Math.max(key==='inspectorWidth'?220:140,Math.min(key==='inspectorWidth'?520:360,origin+(event.clientX-start)*direction));const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);}
  function keys(e) {
    if(e.key==='Alt'&&!presenting.value&&!editing.value&&view.value==='slides'&&workspace.value==='editor'){altHeld.value=true;e.preventDefault();}
    if(e.target.isContentEditable)return;
    if (e.key === 'Escape') {if(shapeGallery.value){shapeGallery.value=false;return;}if(themeEditor.value){themeEditor.value=null;return;}displayMenu.value=false;contextMenu.value=null; if (videoPreview.value) videoPreview.value = false; else if(formatOpen.value)formatOpen.value=false;else if (gallery.value) gallery.value = false; else if (presenting.value) exit(); else closeEdit(); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO'].includes(e.target.tagName)) return;
    if(!presenting.value&&view.value==='slides'&&!editing.value&&!shapeGallery.value&&!gallery.value&&!formatOpen.value&&!themeEditor.value){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();if(workspace.value==='canvas'||selectionScope.value==='slides'){selectedSlides.value=slides.value.map(s=>s.id);selectionScope.value='slides';}else{selectedKeys.value=visibleBlocks(current.value);selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;}requestDraw();return;}if(e.key==='Delete'){e.preventDefault();selectionScope.value==='slides'?deleteSlides():removeBlock();return;}}
    if (!presenting.value && view.value==='slides' && workspace.value==='editor' && !themeEditor.value && !editing.value && !shapeGallery.value && !gallery.value && !formatOpen.value && visibleBlocks(current.value).includes(selected.value)) {
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();if(!e.repeat)duplicateSelected();return;}
      const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();const amount=e.shiftKey?10:1;current.value.positions[selected.value]=nudgePosition(position.value,d[0]*amount,d[1]*amount,resolution.value.width);return;}
    }
    if (!presenting.value || videoPreview.value) return;
    const direction = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[e.key];
    if (direction) { e.preventDefault(); goDirection(direction); }
    else if ([' ', 'Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); advance(); }
    else if (['Backspace', 'PageUp'].includes(e.key)) { e.preventDefault(); retreat(); }
  }
  function beforeUnload(e) { if (recording.value || finalizing.value) { e.preventDefault(); e.returnValue = ''; } }
  onMounted(() => {
    gridDraft.value = { ...current.value.grid }; updateThumbnails(); observeStage(); requestDraw(); window.addEventListener('frame-images-ready',imagesReady); window.addEventListener('keydown', keys);window.addEventListener('keyup',keyup);window.addEventListener('blur',resetKeys);window.addEventListener('pointerdown',contextOutside); window.addEventListener('beforeunload', beforeUnload);
    if (document.modelContext?.registerTool) try { Promise.resolve(document.modelContext.registerTool({ name: 'read_frame_project', description: 'Read the current slide project and presentation state', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: input => { if (!input || typeof input !== 'object' || Object.keys(input).length) throw Error('Expected an empty object'); return { ...JSON.parse(JSON.stringify(snapshot())), index: index.value, step: step.value, selected:selected.value, selectedKeys:selectedKeys.value,selectedSlides:selectedSlides.value,countdown:countdown.value,recording:recording.value, altHeld:altHeld.value, diagnostics: { ...metrics, trailPoints:trail.points.length, trailActive:trail.active } }; } }, { signal: modelController.signal })).catch(() => {}); } catch { /* Browser support is optional. */ }
  });
  onUnmounted(() => { modelController.abort(); clearTimeout(saveTimer); clearTimeout(thumbTimer); clearTimeout(toastTimer); clearInterval(timer);cancelCountdown(); cancelAnimationFrame(raf); observer?.disconnect(); worker?.terminate(); stream?.getTracks().forEach(t => t.stop()); if (lastExport.value) URL.revokeObjectURL(lastExport.value.url); window.removeEventListener('frame-images-ready',imagesReady); window.removeEventListener('keydown', keys);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',resetKeys);window.removeEventListener('pointerdown',contextOutside); window.removeEventListener('beforeunload', beforeUnload); });
  return { fontLoading,fontCss, rotationHandle,rotateDown,setRotation, shapeGallery,openShapes,addShape,moveLayer, routeMode,routeStart,routeBackup,setRouteMode,setRouteStart,traceRoute,connectSlides,undoRoute, palette,themeEditor,themeUndo,openTheme,saveTheme,deleteTheme,undoTheme,panels,displayMenu,resizePanel,selectedKeys,selectedSlides,selectionScope,selectSlide,deselect,countdown,previewVisible, selectedBounds, altHeld, contextMenu, codeCaption, handles, resizeDown, duplicateSelected, openContext, dismissContext, resolution, formatOpen, formatWidth, applyFormat, editSize, undoLayout, canUndoLayout, workspace, listDrag, listTarget, selectedType, editedText, exitLabel, changeText, addBlock, removeBlock, uploadImage, reorder, listDown, moveGrid, slides, project, themeId, frame, banner, index, view, tab, selected, presenting, canvas, stage, stageWidth, toast, saved, zoom, recording, elapsed, laser, laserSize, tool, lastExport, videoPreview, videoMeta, finalizing, gallery, editing, formatting, thumbs, step, transitionMs, moving, gridDraft, current, theme, position, orders, editStyle, notify, add, chooseLayout, addMemory, applyPreset, duplicate, remove, applyGrid, setPosition, updateFragment, formatCode, exportProject, importProject, png, startPresentation, exit, startRecord, stopRecord, navigate, advance, retreat, goDirection, canGo, chooseSlide, down, move, up, leave, doubleClick, closeEdit, editSelected, clearAnnotations };
}
