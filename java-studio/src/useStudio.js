import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';
import { themes, presets, blocks, visibleBlocks, makeSlide, normalizeSlides, neighbor, nextFreeGrid, fragmentOrders, transitionDirection, memorySlides, positionsFor, applyLayout, blockType, blockText, setBlockText, reorderSlides, WIDTH, HEIGHT } from './model.js';
import { renderSlide, renderBanner, blockBounds, prepareImages } from './render.js';

export function useStudio() {
  const sample = [
    Object.assign(makeSlide('split', { x: 0, y: 0 }), { title: 'Tout commence\npar le bytecode.', body: 'Le compilateur traduit votre code Java en instructions que la JVM sait exécuter.\n\nUn même fichier .class.\nPlusieurs systèmes d’exploitation.', code: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}' }),
    Object.assign(makeSlide('split', { x: 1, y: 0 }), { title: 'Du source\nà l’exécution.', body: 'Le fichier .java contient votre code.\njavac génère le bytecode .class.\nLa JVM charge et exécute ce bytecode.', code: '// Compiler, puis exécuter\n// javac HelloWorld.java\n// java HelloWorld' }),
    Object.assign(makeSlide('split', { x: 2, y: 0 }), { title: 'La JVM,\nune machine à part.', body: 'Chargement des classes, vérification du bytecode, gestion de la mémoire : la JVM fait bien plus qu’exécuter des instructions.', code: '// ClassLoader\n// Bytecode verifier\n// Interpreter + JIT compiler' }),
    Object.assign(makeSlide('title', { x: 3, y: 0 }), { title: 'Comprendre\navant d’automatiser.', body: 'Le bytecode est exécuté par la JVM.\nLe JIT peut compiler le code fréquemment exécuté en instructions natives.' }),
  ];
  let initial;
  try { const data = JSON.parse(localStorage.getItem('frame-project') || 'null'); if (data) initial = { ...data, slides: normalizeSlides(data.slides) }; } catch { /* Preserve malformed storage until the next explicit edit or import. */ }
  const slides = ref(initial?.slides || sample), project = ref(initial?.project || 'Java, sous le capot');
  const themeId = ref(initial?.themeId || 'mint'), frame = ref({ header: initial?.frame?.header === true, footer: initial?.frame?.footer === true });
  const banner = ref(initial?.banner || { title: 'Le bytecode, expliqué.', subtitle: 'JAVA · SOUS LE CAPOT', type: 'lower' });
  const index = ref(0), view = ref('slides'), tab = ref('layout'), selected = ref('title'), presenting = ref(false), canvas = ref(null), stage = ref(null), stageWidth = ref(900);
  const toast = ref(''), saved = ref(true), zoom = ref(100), recording = ref(false), elapsed = ref(0), laser = ref('#ff756d'), laserSize = ref(12), tool = ref('laser');
  const lastExport = ref(null), videoPreview = ref(false), videoMeta = ref(''), finalizing = ref(false), gallery = ref(false), editing = ref(null), formatting = ref(false);
  const workspace = ref('canvas'), listDrag = ref(null), listTarget = ref(null);
  const thumbs = shallowRef({}), step = ref(0), transitionMs = ref(initial?.transitionMs ?? 650), moving = ref(false), gridDraft = ref({ x: 0, y: 0 });
  const current = computed(() => slides.value[index.value]), theme = computed(() => themes.find(t => t.id === themeId.value) || themes[0]);
  const position = computed(() => current.value.positions[selected.value] || current.value.positions.title);
  const selectedType = computed(()=>blockType(current.value,selected.value));
  const editedText = computed(()=>blockText(current.value,editing.value));
  const exitLabel = computed(()=>{ if(current.value.exitDirection!=='auto') return ({left:'← Vers la gauche',right:'→ Vers la droite',up:'↑ Vers le haut',down:'↓ Vers le bas'})[current.value.exitDirection]; const next=slides.value[index.value+1];if(!next)return 'Fin du diaporama'; const d=transitionDirection(current.value,next);return d.x>0?'← Vers la gauche':d.x<0?'→ Vers la droite':d.y>0?'↑ Vers le haut':'↓ Vers le bas'; });
  const orders = computed(() => fragmentOrders(current.value));
  const measurement = document.createElement('canvas').getContext('2d');
  const editStyle = computed(() => {
    if (!editing.value) return {};
    const k = editing.value, b = blockBounds(measurement, current.value, k);
    return { left: `${(b.x + (k === 'code' ? 80 : 0)) / WIDTH * 100}%`, top: `${(b.y + (k === 'code' ? 103 : 0)) / HEIGHT * 100}%`, width: `${(b.w - (k === 'code' ? 110 : 0)) / WIDTH * 100}%`, height: `${Math.max(k === 'code' ? b.h - 120 : b.h + 25, 85) / HEIGHT * 100}%` };
  });
  let toastTimer, saveTimer, thumbTimer, raf = 0, drag = null, pointer = null, pointerDown = null, strokes = [], activeStroke = null, slideMotion = null, revealMotion = null;
  let recorder, stream, timer, started = 0, observer, worker, workerCounter = 0;
  const modelController = new AbortController();
  const thumbnailKeys = new Map(), formatRequests = new Map();
  const metrics = { frames: 0, thumbnails: 0, dragCommits: 0 };
  const snapshot = () => ({ version: 3, project: project.value, slides: slides.value, themeId: themeId.value, banner: banner.value, frame: frame.value, transitionMs: transitionMs.value });
  const renderOptions = (s, n, order = Infinity) => ({ ...frame.value, project: project.value, n, total: slides.value.length, order });
  function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3500); }
  function queueSave() {
    saved.value = false; clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem('frame-project', JSON.stringify(snapshot())); saved.value = true; } catch { notify('Sauvegarde locale impossible. Exporte ton projet.'); } }, 450);
  }
  function updateThumbnails() {
    const result = { ...thumbs.value };
    for (const [n, s] of slides.value.entries()) {
      const key = JSON.stringify([s, themeId.value, frame.value, project.value, n, slides.value.length]);
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
  watch([slides, project, themeId, banner, frame, transitionMs], () => { queueSave(); queueThumbnails(); requestDraw(); }, { deep: true });
  watch([view, selected, presenting, zoom, editing, workspace], async () => { await nextTick(); observeStage(); requestDraw(); });
  watch(current, s => { gridDraft.value = { ...s.grid }; if(!visibleBlocks(s).includes(selected.value))selected.value='title'; });
  watch([laser, laserSize, tool], requestDraw);
  function observeStage() { if (!stage.value) return; observer?.disconnect(); observer = new ResizeObserver(entries => { stageWidth.value = entries[0].contentRect.width; }); observer.observe(stage.value); }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0; draw(now);
    if (recording.value || slideMotion || (revealMotion && now - revealMotion.started < 360)) requestDraw();
    else revealMotion = null;
  }
  function snapshotCanvas(s, n, order) {
    const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT;
    renderSlide(c.getContext('2d'), s, theme.value, renderOptions(s, n, order)); return c;
  }
  function currentOrder() { return step.value > 0 ? orders.value[step.value - 1] : 0; }
  function draw(now = performance.now()) {
    if (!canvas.value || !current.value) return;
    metrics.frames++;
    const ctx = canvas.value.getContext('2d'); ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (view.value === 'banners') renderBanner(ctx, banner.value, theme.value);
    else if (slideMotion && presenting.value) {
      const p = Math.min(1, (now - slideMotion.started) / slideMotion.duration), ease = p * p * (3 - 2 * p), { from, to, direction } = slideMotion;
      ctx.drawImage(from, -direction.x * WIDTH * ease, -direction.y * HEIGHT * ease);
      ctx.drawImage(to, direction.x * WIDTH * (1 - ease), direction.y * HEIGHT * (1 - ease));
      if (p === 1) { slideMotion = null; moving.value = false; }
    } else {
      let s = current.value;
      if (drag) s = { ...toRaw(s), positions: { ...s.positions, [drag.key]: drag.position } };
      renderSlide(ctx, s, theme.value, { ...renderOptions(s, index.value, presenting.value ? currentOrder() : Infinity), motion: presenting.value ? revealMotion : null, now, omit: editing.value });
      if (!presenting.value && !editing.value && visibleBlocks(s).includes(selected.value)) {
        const b = blockBounds(ctx, s, selected.value); ctx.strokeStyle = `${theme.value.accent}90`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.strokeRect(b.x - 12, b.y - 12, b.w + 24, b.h + 24); ctx.setLineDash([]);
      }
    }
    if (presenting.value) drawPointer(ctx);
  }
  function drawPointer(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) { ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.beginPath(); stroke.points.forEach((p, n) => n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
    if (pointer && tool.value === 'laser') { ctx.fillStyle = laser.value; ctx.shadowColor = laser.value; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, laserSize.value, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  }
  function clearAnnotations() { strokes = []; requestDraw(); }
  function coords(e) { const r = canvas.value.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * WIDTH, y: (e.clientY - r.top) / r.height * HEIGHT }; }
  function hitBlock(p) {
    const ctx = canvas.value.getContext('2d');
    return [...visibleBlocks(current.value)].reverse().find(k => { const b = blockBounds(ctx, current.value, k); return p.x >= b.x - 12 && p.x <= b.x + b.w + 12 && p.y >= b.y - (k === 'title' && current.value.label ? 58 : 12) && p.y <= b.y + b.h + 12; });
  }
  function down(e) {
    if (editing.value || view.value === 'banners' || videoPreview.value) return;
    const p = coords(e); canvas.value.setPointerCapture(e.pointerId);
    if (presenting.value) { pointer = p; pointerDown = { ...p, moved: false }; if (tool.value === 'pen') { activeStroke = { color: laser.value, size: laserSize.value / 2, points: [p] }; strokes.push(activeStroke); } }
    else { const hit = hitBlock(p); if (!hit) return; selected.value = hit; drag = { key: hit, slideId: current.value.id, origin: { ...current.value.positions[hit] }, start: p, position: { ...current.value.positions[hit] }, moved: false }; }
    requestDraw();
  }
  function move(e) {
    const p = coords(e);
    if (presenting.value) { pointer = p; if (pointerDown && Math.hypot(p.x - pointerDown.x, p.y - pointerDown.y) > 12) pointerDown.moved = true; if (activeStroke) activeStroke.points.push(p); requestDraw(); }
    else if (drag) { const dx = p.x - drag.start.x, dy = p.y - drag.start.y; if (Math.hypot(dx, dy) > 2) drag.moved = true; drag.position = { ...drag.origin, x: Math.round(Math.max(0, Math.min(WIDTH - 40, drag.origin.x + dx))), y: Math.round(Math.max(0, Math.min(HEIGHT - 40, drag.origin.y + dy))) }; requestDraw(); }
  }
  function up(e) {
    if (drag) { if (drag.moved && drag.slideId === current.value.id) { current.value.positions[drag.key] = { ...drag.position }; metrics.dragCommits++; } drag = null; }
    if (presenting.value && pointerDown && !pointerDown.moved && tool.value === 'laser' && e?.type !== 'pointercancel') advance();
    pointerDown = null; activeStroke = null; requestDraw();
  }
  function leave() { pointer = null; requestDraw(); }
  function doubleClick(e) { if (presenting.value || view.value !== 'slides') return; const hit = hitBlock(coords(e)); if (!hit) return; drag = null; selected.value = hit; if(blockType(current.value,hit)!=='image') editing.value = hit; requestDraw(); }
  function closeEdit() { editing.value = null; requestDraw(); }
  function editSelected() { if (!visibleBlocks(current.value).includes(selected.value)) selected.value = 'title'; if(selectedType.value!=='image') editing.value = selected.value; }
  function chooseSlide(n) {
    if (n < 0 || n >= slides.value.length || n === index.value || moving.value) return;
    closeEdit(); drag = null; pointer = null; strokes = [];
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
  function chooseLayout(layout) { if(slides.value.length>=100){notify('Le projet contient déjà 100 diapos.');return;} const s = makeSlide(layout, nextFreeGrid(slides.value, current.value.grid, 'right')); slides.value.push(s); gallery.value = false; chooseSlide(slides.value.length - 1); selected.value = 'title'; }
  function addMemory() {
    if(slides.value.length>96){notify('Il faut quatre places libres dans ce projet de 100 diapos maximum.');return;}
    let x = current.value.grid.x + 1;
    while (slides.value.some(s => s.grid.x === x)) x++;
    const first = slides.value.length; slides.value.push(...memorySlides({ x, y: 0 })); gallery.value = false; chooseSlide(first); notify('Parcours mémoire ajouté : descends avec ↓, révèle avec Espace.');
  }
  function applyPreset(id) { closeEdit(); applyLayout(current.value,id); if (!visibleBlocks(current.value).includes(selected.value)) selected.value = 'title'; }
  function changeText(value) { setBlockText(current.value,editing.value,value); }
  function addBlock(type) {
    if(Object.keys(current.value.elements).length>=40){notify('Cette diapo contient déjà 40 éléments ajoutés.');return;}
    closeEdit(); const key=type+crypto.randomUUID().replaceAll('-','').slice(0,8), s=current.value;
    const count=type==='text'?visibleBlocks(s).filter(k=>k!=='title'&&blockType(s,k)==='text').length+1:Object.values(s.elements).filter(e=>e.type===type).length+1;
    s.elements[key]=type==='text'?{type,custom:true,name:'Texte '+count,text:'Ton nouveau texte.'}:{type,custom:true,name:'Image '+count,src:'',fit:'contain'};
    const bottom=Math.max(250,...visibleBlocks(s).filter(k=>k!==key&&blockType(s,k)==='text').map(k=>{const b=blockBounds(measurement,s,k);return b.y+b.h;}));
    s.positions[key]={x:200,y:type==='text'?Math.min(900,Math.round(bottom+55)):Math.min(820,300+count*120),w:type==='text'?(visibleBlocks(s).includes('code')?650:1200):700,h:400,size:42};
    s.fragments[key]={order:Math.min(20,Math.max(0,...Object.values(s.fragments).map(f=>f.order))+1),animation:'up'};
    selected.value=key;if(type==='text')editing.value=key;
  }
  function removeBlock() { const k=selected.value;if(!current.value.elements[k])return;closeEdit();delete current.value.elements[k];delete current.value.positions[k];delete current.value.fragments[k];current.value.blockKeys=current.value.blockKeys.filter(key=>key!==k);selected.value='title'; }
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
  function reorder(from,to) { const id=current.value.id;slides.value=reorderSlides(slides.value,from,to);index.value=slides.value.findIndex(s=>s.id===id);requestDraw(); }
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
  function moveGrid(id,x,y) { if(!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>10000||Math.abs(y)>10000)return; const s=slides.value.find(s=>s.id===id);if(!s)return;if(slides.value.some(other=>other.id!==id&&other.grid.x===x&&other.grid.y===y)){notify('Cette case est occupée. Dépose la diapo sur une case libre.');return;}s.grid={x,y}; }
  function imagesReady() {thumbnailKeys.clear();queueThumbnails();requestDraw();}
  function duplicate() { if(slides.value.length>=100){notify('Le projet contient déjà 100 diapos.');return;} const s = JSON.parse(JSON.stringify(current.value)); s.id = crypto.randomUUID(); s.grid = nextFreeGrid(slides.value, current.value.grid, 'right'); slides.value.splice(index.value + 1, 0, s); chooseSlide(index.value + 1); }
  function remove() { if (slides.value.length <= 1) return; closeEdit(); slides.value.splice(index.value, 1); index.value = Math.min(index.value, slides.value.length - 1); gridDraft.value = { ...current.value.grid }; requestDraw(); }
  function applyGrid() {
    const { x, y } = gridDraft.value;
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000 || slides.value.some(s => s.id !== current.value.id && s.grid.x === x && s.grid.y === y)) { gridDraft.value = { ...current.value.grid }; notify('Cette case est occupée ou sa position est invalide.'); return; }
    current.value.grid = { x, y };
  }
  function setPosition(key, event) { const value = Number(event.target.value); const min = key === 'w' || key === 'h' ? 80 : key === 'size' ? 10 : 0, max = key === 'y' || key === 'h' ? HEIGHT : key === 'size' ? 260 : WIDTH; position.value[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : position.value[key]; event.target.value = position.value[key]; }
  function updateFragment(event) { current.value.fragments[selected.value].order = Math.max(0, Math.min(20, Math.round(Number(event.target.value) || 0))); }
  function formatCode(source = current.value.code) {
    const slideId = current.value.id;
    if (!worker) {
      worker = new Worker(new URL('./formatter.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => { const job = formatRequests.get(data.id); formatRequests.delete(data.id); formatting.value = formatRequests.size > 0; if (!job) return; const s = slides.value.find(s => s.id === job.slideId); if (!s || s.code !== job.source) return; if (data.ok) { s.code = data.code; notify('Code Java formaté.'); } else notify('Extrait incomplet ou non Java : texte conservé sans modification.'); };
      worker.onerror = () => { formatRequests.clear(); formatting.value = false; worker?.terminate(); worker = null; notify('Formatage indisponible : ton code est conservé.'); };
    }
    const id = ++workerCounter; formatRequests.set(id, { slideId, source }); formatting.value = true; worker.postMessage({ id, code: source });
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
      closeEdit(); slides.value = normalized; project.value = String(data.project || 'Projet importé'); themeId.value = themes.some(t => t.id === data.themeId) ? data.themeId : 'mint';
      if (data.banner && typeof data.banner.title === 'string' && typeof data.banner.subtitle === 'string' && ['lower', 'chapter', 'tip'].includes(data.banner.type)) banner.value = data.banner;
      frame.value = { header: data.frame?.header === true, footer: data.frame?.footer === true }; transitionMs.value = Number.isFinite(data.transitionMs) ? Math.min(2000, Math.max(0, data.transitionMs)) : 650;
      index.value = 0; step.value = 0; gridDraft.value = { ...current.value.grid }; updateThumbnails(); requestDraw(); notify('Projet importé.');
    } catch { notify('Ce fichier n’est pas un projet Frame valide.'); }
    event.target.value = '';
  }
  async function png() { await prepareImages([current.value]); const c = document.createElement('canvas'); c.width = WIDTH; c.height = HEIGHT; const ctx = c.getContext('2d'); if (view.value === 'banners') renderBanner(ctx, banner.value, theme.value); else renderSlide(ctx, current.value, theme.value, renderOptions(current.value, index.value)); c.toBlob(blob => { if (blob) download(blob, view.value === 'banners' ? 'frame-bandeau.png' : `frame-diapo-${index.value + 1}.png`); }, 'image/png'); }
  async function startPresentation(fromStart=true) { await prepareImages(slides.value); closeEdit(); if(fromStart)index.value=0; view.value = 'slides'; presenting.value = true; step.value = 0; revealMotion = null; strokes = []; await nextTick(); observeStage(); requestDraw(); }
  function exit() { if (recording.value) stopRecord(); slideMotion = null; moving.value = false; presenting.value = false; strokes = []; requestDraw(); }
  function startRecord() {
    if (finalizing.value) return;
    if (!canvas.value?.captureStream || !window.MediaRecorder) { notify('Enregistrement indisponible dans ce navigateur.'); return; }
    try {
      const chunks = []; stream = canvas.value.captureStream(30); const recordingStream = stream;
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); if (!mime) throw Error();
      recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10000000 });
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => { recording.value = false; finalizing.value = false; clearInterval(timer); recordingStream.getTracks().forEach(t => t.stop()); notify('L’enregistrement a rencontré une erreur.'); };
      recorder.onstop = () => { download(new Blob(chunks, { type: mime }), 'frame-presentation.webm'); recordingStream.getTracks().forEach(t => t.stop()); finalizing.value = false; };
      recorder.start(1000); recording.value = true; started = Date.now(); elapsed.value = 0; timer = setInterval(() => elapsed.value = Math.floor((Date.now() - started) / 1000), 1000); requestDraw();
    } catch { stream?.getTracks().forEach(t => t.stop()); notify('Impossible de lancer l’enregistrement.'); }
  }
  function stopRecord() { if (!recording.value) return; recording.value = false; finalizing.value = true; clearInterval(timer); recorder.stop(); }
  function keys(e) {
    if (['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO'].includes(e.target.tagName)) return;
    if (e.key === 'Escape') { if (videoPreview.value) videoPreview.value = false; else if (gallery.value) gallery.value = false; else if (presenting.value) exit(); else closeEdit(); return; }
    if (!presenting.value || videoPreview.value) return;
    const direction = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[e.key];
    if (direction) { e.preventDefault(); goDirection(direction); }
    else if ([' ', 'Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); advance(); }
    else if (['Backspace', 'PageUp'].includes(e.key)) { e.preventDefault(); retreat(); }
  }
  function beforeUnload(e) { if (recording.value || finalizing.value) { e.preventDefault(); e.returnValue = ''; } }
  onMounted(() => {
    gridDraft.value = { ...current.value.grid }; updateThumbnails(); observeStage(); requestDraw(); window.addEventListener('frame-images-ready',imagesReady); window.addEventListener('keydown', keys); window.addEventListener('beforeunload', beforeUnload);
    if (document.modelContext?.registerTool) try { Promise.resolve(document.modelContext.registerTool({ name: 'read_frame_project', description: 'Read the current slide project and presentation state', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: input => { if (!input || typeof input !== 'object' || Object.keys(input).length) throw Error('Expected an empty object'); return { ...JSON.parse(JSON.stringify(snapshot())), index: index.value, step: step.value, diagnostics: { ...metrics } }; } }, { signal: modelController.signal })).catch(() => {}); } catch { /* Browser support is optional. */ }
  });
  onUnmounted(() => { modelController.abort(); clearTimeout(saveTimer); clearTimeout(thumbTimer); clearTimeout(toastTimer); clearInterval(timer); cancelAnimationFrame(raf); observer?.disconnect(); worker?.terminate(); stream?.getTracks().forEach(t => t.stop()); if (lastExport.value) URL.revokeObjectURL(lastExport.value.url); window.removeEventListener('frame-images-ready',imagesReady); window.removeEventListener('keydown', keys); window.removeEventListener('beforeunload', beforeUnload); });
  return { workspace, listDrag, listTarget, selectedType, editedText, exitLabel, changeText, addBlock, removeBlock, uploadImage, reorder, listDown, moveGrid, slides, project, themeId, frame, banner, index, view, tab, selected, presenting, canvas, stage, stageWidth, toast, saved, zoom, recording, elapsed, laser, laserSize, tool, lastExport, videoPreview, videoMeta, finalizing, gallery, editing, formatting, thumbs, step, transitionMs, moving, gridDraft, current, theme, position, orders, editStyle, notify, add, chooseLayout, addMemory, applyPreset, duplicate, remove, applyGrid, setPosition, updateFragment, formatCode, exportProject, importProject, png, startPresentation, exit, startRecord, stopRecord, navigate, advance, retreat, goDirection, canGo, chooseSlide, down, move, up, leave, doubleClick, closeEdit, editSelected, clearAnnotations };
}
