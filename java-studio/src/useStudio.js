import {normalizeClip} from './overlayAnimation.js';
import {exportTransparentMovie,exportChromaMovie} from './overlayVideo.js';
import {normalizeBits} from './bits.js';
import { selectionOpacity,setObjectOpacity } from './objectOpacity.js';
import { sceneAt,presentationSequence,addPedagogicalStep,movePedagogicalStep,removePedagogicalStep,allScenes } from './pedagogicalSteps.js';
import { usePresenterWindow } from './usePresenterWindow.js';
import { scaleObjects,scaleFromHandle } from './scaleObjects.js';
import { useComponentSharing } from './useComponentSharing.js';
import { serializeObjects,parseObjects,TRANSFER_MIME,serializeLibrary,parseLibrary,appendComponents } from './frameTransfer.js';
import { overlayFormats, makeOverlay, normalizeOverlay } from './overlays.js';
import { applyTextRole,textRole } from './textRoles.js';
import { normalizeProjectColors,projectTheme } from './projectTheme.js';
import { snapTranslation } from './alignmentSnapping.js';
import { separateLabels, restoreTemplateLayout } from './editableTemplates.js';
import { frameMargins } from './interiorMargins.js';
import { measurementTarget,measurementMargins } from './measurementGuides.js';
import { normalizeTable,normalizeCellStyles } from './tables.js';
import { setAppearance } from './appearances.js';
import { placeOnSlide } from './slidePlacement.js';
import { MAX_ELEMENTS } from './limits.js';
import { marqueeRect,marqueeKeys } from './marquee.js';
import { selectionType,commonValue,copyObjects,pasteObjects } from './objectSelection.js';
import { insertDroppedImages } from './imageDrop.js';
import { ProjectHistory } from './history.js';
import { drawSlideTransition } from './slideTransition.js';
import { ProjectFile, canonical } from './projectFile.js';
import { imageSource, imageImportError, IMAGE_TYPES } from './imageImport.js';
import { clampZoom,wheelZoom } from './zoom.js';
import { reorderLayers } from './layers.js';
import { captureComponent, normalizeComponents, insertComponent } from './componentsLibrary.js';
import { selectionUnits,arrangeUnits,layoutUnits,arrangeSelection, enclosingBounds, axisDistance, normalizeGroups, selectionFor, groupSelection, ungroupSelection, translateSelection } from './selection.js';
import { getTextStyle, usedFontFaces } from './textStyles.js';
import { fontCss } from './fonts.js';
import { prepareFonts } from './fontAssets.js';
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick, toRaw } from 'vue';
import { themes, presets, blocks, visibleBlocks, makeSlide, normalizeSlides, neighbor, nextFreeGrid, fragmentOrders, transitionDirection, memorySlides, positionsFor, applyLayout, blockType, blockText, setBlockName, setBlockText, reorderSlides, WIDTH, HEIGHT, normalizeResolution, normalizeFrame } from './model.js';
import { renderSlide, blockBounds, autoTextBounds, prepareImages } from './render.js';

import { duplicateElement, resizeRotated, rotatePoint, rotationFromPointer, normalizeAngle } from './editor.js';
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
  const components=ref(normalizeComponents(initial?.components)),componentName=ref('Mon composant'),spacing=ref(24);
  const projectColors=ref(normalizeProjectColors(initial?.projectColors));
  const sharing=useComponentSharing(notify);
  const libraryComponents=computed(()=>sharing.libraryScope.value==='shared'?sharing.sharedComponents.value:components.value);
  const palette=ref(normalizeThemes(initial?.themes||library)),themeEditor=ref(null),themeUndo=ref(null);
  let preferences;try{preferences=JSON.parse(localStorage.getItem('frame-workspace'));}catch{}
  const panels=ref({rail:true,collapsed:false,properties:true,slides:true,toolbar:true,inspectorWidth:286,slidesWidth:185,snapping:true,...preferences}),displayMenu=ref(false),selectedKeys=ref([]),selectedSlides=ref([]),selectionScope=ref('elements'),countdown=ref(0),previewVisible=ref(true);
  watch(panels,()=>{try{localStorage.setItem('frame-workspace',JSON.stringify(panels.value));}catch{}},{deep:true});
  const slides = ref(initial?.slides || sample), project = ref(initial?.project || 'Java, sous le capot');
  const themeId = ref(palette.value.some(t=>t.id===initial?.themeId)?initial.themeId:palette.value[0].id), frame = ref(normalizeFrame(initial?.frame));
  const banner = ref(normalizeOverlay(initial?.banner || { title: 'Le bytecode, expliqué.', subtitle: 'JAVA · SOUS LE CAPOT', type: 'lower' }));
  let session;try{session=JSON.parse(localStorage.getItem('frame-session'));}catch{}
  const projectId=ref(initial?.projectId||crypto.randomUUID()),fileStore=new ProjectFile(),fileName=ref(''),fileDirty=ref(false),fileBusy=ref(false);
  const index = ref(Math.max(0,slides.value.findIndex(s=>s.id===session?.slideId))), view = ref(['slides','banners','themes'].includes(session?.view)?session.view:'slides'), tab = ref('layout'), selected = ref(null), presenting = ref(false), canvas = ref(null), stage = ref(null), stageWidth = ref(900);
  const toast = ref(''), saved = ref(true), zoom = ref(100), recording = ref(false), elapsed = ref(0), laser = ref('#ff756d'), laserSize = ref(12), tool = ref('laser');
  const fontLoading=ref(false);
  const overlayVideoOpen=ref(false),overlayVideoBusy=ref(false),overlayVideoProgress=ref(0);let overlayVideoController;
  const lastExport = ref(null), videoPreview = ref(false), videoMeta = ref(''), finalizing = ref(false), shapeGallery=ref(false), gallery = ref(false), editing = ref(null), formatting = ref(false);
  const resolution = ref(normalizeResolution(initial?.resolution)), formatOpen = ref(false), formatWidth = ref(resolution.value.width);
  const trail = new LaserTrail(), layoutBackup=ref(null);
  const canUndoLayout=computed(()=>layoutBackup.value?.id===current.value?.id);
  let guidePoint=null;
  const snapGuides=shallowRef([]);
  watch(()=>panels.value.snapping,()=>{snapGuides.value=[];requestDraw();});
  const hovered=ref(null),altHeld=ref(false), contextMenu=ref(null), transformPreview=shallowRef(null);
  const selectedName=computed({get:()=>current.value.elements[selected.value]?.name||current.value.blockNames?.[selected.value]||'',set:value=>setBlockName(current.value,selected.value,value)});
  const codeCaption=computed({get:()=>selected.value==='code'?current.value.codeTitle||'':current.value.elements[selected.value]?.caption||'',set:value=>{if(selected.value==='code')current.value.codeTitle=value;else if(current.value.elements[selected.value])current.value.elements[selected.value].caption=value;}});
  const selectedBounds=computed(()=>{let s=current.value;const draft=transformPreview.value;if(draft?.id===s.id&&draft.positions)s={...s,positions:{...s.positions,...draft.positions}};if(draft?.id===s.id&&draft.key===selected.value)s={...s,positions:{...s.positions,[draft.key]:draft.position}};if(draft?.id===s.id&&Number.isFinite(draft.strokeWidth))s={...s,elements:{...s.elements,[draft.key]:{...s.elements[draft.key],strokeWidth:draft.strokeWidth}}};const p=s.positions[selected.value];if(!p||!visibleBlocks(s).includes(selected.value))return null;const b=blockBounds(measurement,s,selected.value);return blockType(s,selected.value)==='shape'?b:{...b,h:p.h||b.h};});
  const scaleMode=ref(false),scalePercent=ref(100);
  const handles=computed(()=>{const b=(scaleMode.value||selectedKeys.value.length>1)?enclosingBounds(selectedKeys.value.map(k=>elementBounds(measurement,{...current.value,positions:{...current.value.positions,...transformPreview.value?.positions}},k))):selectedBounds.value;if(!b)return [];return [['nw',b.x,b.y],['n',b.x+b.w/2,b.y],['ne',b.x+b.w,b.y],['w',b.x,b.y+b.h/2],['e',b.x+b.w,b.y+b.h/2],['sw',b.x,b.y+b.h],['s',b.x+b.w/2,b.y+b.h],['se',b.x+b.w,b.y+b.h]].filter(([corner])=>!(scaleMode.value||selectedKeys.value.length>1)||corner.length===2).map(([corner,x,y])=>{const p=rotatePoint({x,y},b);return {corner,style:{left:p.x/WIDTH*100+'%',top:p.y/HEIGHT*100+'%'}}});});
  const rotationHandle=computed(()=>{const b=selectedBounds.value;if(!b)return {};const d=28*WIDTH/Math.max(1,stageWidth.value),p=rotatePoint({x:b.x+b.w+d,y:b.y-d},b);return {left:p.x/WIDTH*100+'%',top:p.y/HEIGHT*100+'%'};});
  const routeMode=ref(['spatial','manual'].includes(initial?.routeMode)?initial.routeMode:'spatial'),routeStart=ref(slides.value.some(s=>s.id===initial?.routeStart)?initial.routeStart:''),routeBackup=ref(null);
  const workspace = ref(view.value==='banners'||session?.workspace==='editor'?'editor':'canvas'), listDrag = ref(null), listTarget = ref(null);
  const notesVisible=ref(true);
  const thumbs = shallowRef({}), step = ref(0), transitionMs = ref(initial?.transitionMs ?? 650), moving = ref(false), gridDraft = ref({ x: 0, y: 0 });
  const editStep=ref(0),baseSlide=computed(()=>slides.value[index.value]);
  const sequence=computed(()=>presentationSequence(baseSlide.value,fragmentOrders));
  const activeState=computed(()=>presenting.value?sequence.value[step.value]?.scene||0:editStep.value);
  const current = computed(() => view.value==='banners'?banner.value.slide:(baseSlide.value.pedagogicalSteps?.[activeState.value-1]?.scene||baseSlide.value)), baseTheme = computed(() => palette.value.find(t => t.id === themeId.value) || palette.value[0]),theme=computed(()=>projectTheme(baseTheme.value,projectColors.value));
  watch(()=>[baseSlide.value?.id,baseSlide.value?.grid?.x,baseSlide.value?.grid?.y,baseSlide.value?.exitDirection],()=>{if(!baseSlide.value)return;for(const item of baseSlide.value.pedagogicalSteps||[])Object.assign(item.scene,{id:baseSlide.value.id,grid:{...baseSlide.value.grid},exitDirection:baseSlide.value.exitDirection});},{flush:'sync'});
  const position = computed(() => current.value.positions[selected.value] || current.value.positions.title);
  const selectedType = computed(()=>blockType(current.value,selected.value));
  let objectClipboard=null,pasteCount=0,lastPasteSlide=null;
  const canPasteObjects=ref(false);
  const multiType=computed(()=>selectionType(current.value,selectedKeys.value));
  function commonProperty(scope,key){const values=selectedKeys.value.map(k=>scope==='element'?current.value.elements[k]?.[key]:scope==='style'?getTextStyle(current.value,k)[key]:scope==='fragment'?current.value.fragments[k]?.[key]:current.value.positions[k]?.[key]);if(scope==='style'&&key==='list'){const result=commonValue(values.map(v=>JSON.stringify(v)));return result===undefined?undefined:JSON.parse(result);}return commonValue(values);}
  function updateCommon(scope,key,value,patchList=false){if(!multiType.value)return;for(const k of selectedKeys.value){if(scope==='element'){current.value.elements[k][key]=value;if(['fill','stroke'].includes(key))current.value.elements[k][key+'Role']=null;if(current.value.elements[k].type==='table')Object.assign(current.value.elements[k],normalizeTable(current.value.elements[k]));}else if(scope==='style'){const p=current.value.positions[k];p.textStyle={...getTextStyle(current.value,k),[key]:key==='list'&&patchList?{...getTextStyle(current.value,k).list,...value}:value};p.textStyle=getTextStyle(current.value,k);fitAuto(k);}else if(scope==='fragment')current.value.fragments[k][key]=value;else {current.value.positions[k][key]=value;if(['w','h'].includes(key))current.value.positions[k].autoSize=false;if(['font','size'].includes(key))fitAuto(k);}}requestDraw();}
  const clipboardStatus=ref('');
  function prepareCopy(){const value=copyObjects(current.value,selectedKeys.value);if(value){value.slideId=current.value.id;objectClipboard=value;pasteCount=0;lastPasteSlide=null;canPasteObjects.value=true;}return value;}
  async function writeCopy(value,kind='selection'){if(!value)return;try{const text=serializeObjects(value,kind);if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(text);clipboardStatus.value='Copié pour les autres instances';notify('Copié. Ouvre une autre instance puis Ctrl V.');}catch{clipboardStatus.value='Copie système indisponible';notify('Utilise Ctrl C sur la sélection pour copier entre navigateurs.');}}
  function copySelection(system=true){const value=prepareCopy();if(system)writeCopy(value);return value;}
  function copyComponent(c){const component=JSON.parse(JSON.stringify(c)),value={component,groups:c.items.length>1?[c.items.map((_,i)=>i)]:[],kind:'component'};objectClipboard=value;canPasteObjects.value=true;pasteCount=0;lastPasteSlide=null;writeCopy(value,'component');}
  function pasteSelection(incoming=null){const clipboard=incoming||objectClipboard;if(!clipboard)return;closeEdit();if(incoming){if(canonical(incoming)!==canonical(objectClipboard)){pasteCount=0;lastPasteSlide=null;}objectClipboard=incoming;canPasteObjects.value=true;}if(lastPasteSlide!==current.value.id)pasteCount=0;const offset=(clipboard.kind==='component'?128:0)+24*(pasteCount+(clipboard.slideId===current.value.id?1:0));const keys=pasteObjects(current.value,clipboard,offset);if(!keys.length){notify('La composition dépasserait 100 éléments.');return;}pasteCount++;lastPasteSlide=current.value.id;workspace.value='editor';selectionScope.value='elements';selectedKeys.value=keys;selected.value=keys.length===1?keys[0]:null;prepareImages([current.value]);requestDraw();notify('Sélection collée.');}
  async function pasteFromSystem(){try{if(!navigator.clipboard?.readText)throw Error('unavailable');const value=parseObjects(await navigator.clipboard.readText());if(!value){notify('Le presse-papiers ne contient pas d’objets Frame.');return;}pasteSelection(value);}catch{notify('Utilise Ctrl V sur la composition pour coller depuis une autre instance.');}}
  const selectedOpacity=computed(()=>selectionOpacity(current.value,selectedKeys.value));
  function updateOpacity(value){setObjectOpacity(current.value,selectedKeys.value,Number(value));requestDraw();}
  const selectedTextStyle=computed(()=>getTextStyle(current.value,selected.value));
  function updateTextStyle(key,value){if(key==='reset'){const style=selectedTextStyle.value;position.value.textStyle={lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,align:style.align,color:style.color,colorRole:style.colorRole,list:style.list,weight:selectedType.value==='code'?400:textRole(current.value,selected.value).weight};fitAuto(selected.value);return;}position.value.textStyle={...selectedTextStyle.value,[key]:value};position.value.textStyle=getTextStyle(current.value,selected.value);fitAuto(selected.value);}
  function setTextRole(id){for(const key of selectedKeys.value.length?selectedKeys.value:[selected.value])if(blockType(current.value,key)==='text'){applyTextRole(current.value,key,id);fitAuto(key);}requestDraw();}
  function setProjectColor(key,color){if(/^#[\da-f]{6}$/i.test(color))projectColors.value={...projectColors.value,[key]:color};}
  function selectTheme(id){if(id!==themeId.value&&palette.value.some(t=>t.id===id)){themeId.value=id;projectColors.value={};}}
  function refreshTextStyle(){if(position.value.textStyle)position.value.textStyle=getTextStyle(current.value,selected.value);fitAuto(selected.value);}
  const editedText = computed(()=>blockText(current.value,editing.value));
  const exitLabel = computed(()=>{ if(current.value.exitDirection!=='auto') return ({left:'← Vers la gauche',right:'→ Vers la droite',up:'↑ Vers le haut',down:'↓ Vers le bas'})[current.value.exitDirection]; const next=slides.value[index.value+1];if(!next)return 'Fin du diaporama'; const d=transitionDirection(current.value,next);return d.x>0?'← Vers la gauche':d.x<0?'→ Vers la droite':d.y>0?'↑ Vers le haut':'↓ Vers le bas'; });
  const orders = computed(() => sequence.value.slice(1));
  const stepLabel=computed(()=>sequence.value[step.value]?.name||'État initial');
  function selectPedagogicalStep(n){closeEdit();editStep.value=Math.max(0,Math.min(n,baseSlide.value.pedagogicalSteps?.length||0));workspace.value='editor';requestDraw();}
  function addPedagogical(){closeEdit();const n=addPedagogicalStep(baseSlide.value,editStep.value);if(n!==null){selectPedagogicalStep(n);notify('Étape créée. Modifie les objets dans ce nouvel état.');}}
  function movePedagogical(n,delta){selectPedagogicalStep(movePedagogicalStep(baseSlide.value,n,delta));}
  function removePedagogical(n){if(!Number.isInteger(n)||n<1||n>baseSlide.value.pedagogicalSteps.length)return;closeEdit();selectPedagogicalStep(removePedagogicalStep(baseSlide.value,n,editStep.value));notify('Étape supprimée · Ctrl Z pour annuler.');}
  const measurement = document.createElement('canvas').getContext('2d');
  const editSize=computed(()=>selected.value?blockBounds(measurement,current.value,selected.value).size:42);
  const editStyle = computed(() => {
    if (!editing.value) return {};
    const k = editing.value, measured = blockBounds(measurement, current.value, k), b={...measured,h:current.value.positions[k].h||measured.h};
    return { transform:`rotate(${b.rotation||0}deg)`,transformOrigin:`${(b.w/2-(blockType(current.value,k)==='code'?80:0))*stageWidth.value/WIDTH}px ${(b.h/2-(blockType(current.value,k)==='code'?103:0))*stageWidth.value/WIDTH}px`, left: `${(b.x + (blockType(current.value,k)==='code' ? 80 : 0)) / WIDTH * 100}%`, top: `${(b.y + (blockType(current.value,k)==='code' ? 103 : -(b.inkOffset||0))) / HEIGHT * 100}%`, width: `${(b.w - (blockType(current.value,k)==='code' ? 110 : 0)) / WIDTH * 100}%`, height: `${Math.max(blockType(current.value,k)==='code' ? b.h - 120 : current.value.positions[k].autoSize?b.h+Math.max(0,b.inkOffset||0)+b.size*1.4:b.h + b.size*1.4, current.value.positions[k].autoSize?b.size*1.4:85) / HEIGHT * 100}%` };
  });
  let marquee=null;
  function cancelMarquee(){if(!marquee)return;selectedKeys.value=marquee.previous;selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;marquee=null;requestDraw();}
  let toastTimer, saveTimer, thumbTimer, raf = 0, drag = null, pointer = null, pointerDown = null, strokes = [], activeStroke = null, slideMotion = null, revealMotion = null, stateMotion=null;
  let recorder, stream, timer, started = 0, observer, worker, workerCounter = 0;
  const modelController = new AbortController();
  const thumbnailKeys = new Map(), formatRequests = new Map();
  const metrics = { frames: 0, thumbnails: 0, dragCommits: 0 };
  const snapshot = () => ({ version: 20, projectColors:projectColors.value,components:components.value, projectId:projectId.value, routeMode:routeMode.value,routeStart:routeStart.value, themes:palette.value, resolution: resolution.value, project: project.value, slides: slides.value, themeId: themeId.value, banner: banner.value, frame: frame.value, transitionMs: transitionMs.value });
  let history = new ProjectHistory(snapshot()), historyGesture=null, gestureId=0;
  const historyVersion=ref(0), canUndo=computed(()=>{historyVersion.value;return history.index>0;}), canRedo=computed(()=>{historyVersion.value;return history.index<history.states.length-1;});
  function historyGroup(){return historyGesture||(editing.value?'text:'+current.value.id+':'+activeState.value+':'+editing.value:null);}
  function recordHistory(){history.record(snapshot(),historyGroup());historyVersion.value++;}
  watch(()=>JSON.stringify(snapshot()),recordHistory);
  function restoreHistory(data){
    if(!data)return;const id=slides.value[index.value].id,keys=selectedKeys.value.slice();closeEdit();contextMenu.value=null;layoutBackup.value=null;routeBackup.value=null;
    projectColors.value=normalizeProjectColors(data.projectColors);components.value=normalizeComponents(data.components);slides.value=data.slides;project.value=data.project;palette.value=data.themes;themeId.value=data.themeId;banner.value=normalizeOverlay(data.banner);frame.value=data.frame;resolution.value=data.resolution;transitionMs.value=data.transitionMs;routeMode.value=data.routeMode;routeStart.value=data.routeStart;
    index.value=Math.max(0,slides.value.findIndex(s=>s.id===id));editStep.value=Math.min(editStep.value,baseSlide.value.pedagogicalSteps?.length||0);selectedKeys.value=keys.filter(k=>visibleBlocks(current.value).includes(k));selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;selectedSlides.value=[];
    nextTick(()=>{selectedKeys.value=keys.filter(k=>visibleBlocks(current.value).includes(k));selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;});
    historyVersion.value++;flushLocal();queueThumbnails();requestDraw();
  }
  function undo(){recordHistory();restoreHistory(history.undo());}
  function redo(){restoreHistory(history.redo());}
  function dragImages(e){if(presenting.value||!['slides','banners'].includes(view.value))return;if([...e.dataTransfer.types].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}}
  async function dropImages(e){
    if(presenting.value||!['slides','banners'].includes(view.value))return;e.preventDefault();const files=[...e.dataTransfer.files].filter(f=>IMAGE_TYPES.includes(f.type));if(!files.length){notify('Dépose un PNG, JPEG, WebP ou SVG.');return;}
    const slide=current.value,point=coords(e);historyGesture='drop:'+(++gestureId);
    try{let importError;const result=await insertDroppedImages(slide,files,point,async file=>{try{return await imageSource(file);}catch(error){importError=error;throw error;}},()=>slides.value.includes(slide));
      if(result.keys.length){workspace.value='editor';closeEdit();const key=result.keys.at(-1);selected.value=key;selectedKeys.value=[key];await prepareImages([slide]);notify(result.keys.length+' image(s) ajoutée(s).');}
      if(result.failed)notify(imageImportError(importError));else if(result.keys.length<files.length)notify('Limite de 100 éléments ajoutés atteinte.');
    }finally{await nextTick();recordHistory();historyGesture=null;canvas.value?.focus({preventScroll:true});}
  }
  const renderOptions = (s, n, order = Infinity) => ({ ...frame.value, ...(view.value==='banners'&&s.id===banner.value.slide.id?{transparent:true,header:false,footer:false}:{}), project: project.value, n, total: slides.value.length, order });
  function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3500); }
  function flushLocal(){try{localStorage.setItem('frame-project',JSON.stringify(snapshot()));localStorage.setItem('frame-themes',JSON.stringify(palette.value));localStorage.setItem('frame-session',JSON.stringify({slideId:slides.value[index.value].id,view:view.value,workspace:workspace.value}));saved.value=true;}catch{saved.value=false;notify('Sauvegarde locale impossible. Enregistre le fichier.');}}
  function visibilitySave(){if(document.visibilityState==='hidden')flushLocal();}
  watch([index,view],()=>{editStep.value=0;});
  watch([index,view,workspace],()=>{try{localStorage.setItem('frame-session',JSON.stringify({slideId:slides.value[index.value].id,view:view.value,workspace:workspace.value}));}catch{}});
  function queueSave() {
    saved.value = false;fileDirty.value=true; clearTimeout(saveTimer);
    saveTimer = setTimeout(flushLocal, 450);
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
  watch([projectColors,components,routeMode,routeStart,palette, slides, project, themeId, banner, frame, transitionMs, resolution], () => { queueSave(); queueThumbnails(); requestDraw(); }, { deep: true });
  watch([view, selected, presenting, zoom, editing, workspace], async () => { await nextTick(); observeStage(); requestDraw(); });
  watch(view,value=>{closeEdit();deselect();if(value==='banners')workspace.value='editor';selectionScope.value='elements';});
  watch(current, s => { gridDraft.value = { ...s.grid }; selected.value=null;selectedKeys.value=[]; });
  watch(selected,key=>{if(key)selectedKeys.value=[key];});
  watch(workspace,value=>{selectionScope.value=value==='canvas'?'slides':'elements';deselect();});
  watch([altHeld,selectedKeys,index,workspace],()=>refreshMeasurementTarget(),{deep:true,flush:'sync'});
  watch([laser, laserSize, tool, altHeld, hovered,selectedKeys,snapGuides], requestDraw,{deep:true});
  let fontGeneration=0;
  watch(()=>JSON.stringify(usedFontFaces([...allScenes(slides.value),banner.value.slide])),async()=>{const generation=++fontGeneration;fontLoading.value=true;try{await prepareFonts([...allScenes(slides.value),banner.value.slide]);if(generation===fontGeneration){const pristine=history.states.length===1&&JSON.stringify(snapshot())===history.states[0];for(const slide of [...allScenes(slides.value),banner.value.slide])for(const key of visibleBlocks(slide))if(slide.positions[key]?.autoSize){const b=autoTextBounds(measurement,slide,key);Object.assign(slide.positions[key],{w:b.w,h:b.h});}if(pristine){history=new ProjectHistory(snapshot());historyVersion.value++;}thumbnailKeys.clear();queueThumbnails();requestDraw();}}catch{notify('Police non chargée. Réessaie avant d’exporter.');}finally{if(generation===fontGeneration)fontLoading.value=false;}},{immediate:true});
  async function ensureFonts(){try{await prepareFonts([...allScenes(slides.value),banner.value.slide]);return true;}catch{notify('Impossible de charger les polices. Réessaie avant de présenter ou d’exporter.');return false;}}
  function observeStage() { if (!stage.value) return; observer?.disconnect(); observer = new ResizeObserver(entries => { stageWidth.value = entries[0].contentRect.width; }); observer.observe(stage.value); }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0; draw(now);
    if (trail.prune(now) || recording.value || slideMotion || stateMotion || (revealMotion && now - revealMotion.started < 420)) requestDraw();
    else if(revealMotion){if(revealMotion.exit)step.value=Math.max(0,step.value-1);revealMotion=null;requestDraw();}
  }
  function snapshotCanvas(s, n, order) {
    const c = document.createElement('canvas'); c.width = resolution.value.width; c.height = resolution.value.height;
    const g=c.getContext('2d');g.scale(c.width/WIDTH,c.height/HEIGHT);
    renderSlide(g, s, theme.value, renderOptions(s, n, order)); return c;
  }
  function currentOrder() { return sequence.value[step.value]?.order||0; }
  function draw(now = performance.now()) {
    if (!canvas.value || !current.value) return;
    metrics.frames++;
    const ctx = canvas.value.getContext('2d'); ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); ctx.save();ctx.scale(canvas.value.width/WIDTH,canvas.value.height/HEIGHT);
    if (slideMotion && presenting.value) {
      const p = Math.min(1, (now - slideMotion.started) / slideMotion.duration), ease = p * p * (3 - 2 * p), { from, to, direction } = slideMotion;
      drawSlideTransition(ctx, from, to, direction, ease);
      if (p === 1) { slideMotion = null; moving.value = false; }
    } else {
      let s = current.value;
      if(tablePreview.value?.id===s.id&&tablePreview.value.key===selected.value)s={...s,elements:{...s.elements,[selected.value]:tablePreview.value.table}};
      if (drag) s = { ...toRaw(s), positions: { ...s.positions, ...(drag.positions||(drag.position?{[drag.key]:drag.position}:{})) } };
      if(drag?.corner&&!drag.scaling){const e=s.elements[drag.key];if(e?.shape==='line'&&['horizontal','vertical'].includes(e.direction))s={...s,elements:{...s.elements,[drag.key]:{...e,strokeWidth:Math.max(1,Math.min(60,drag.position[e.direction==='horizontal'?'h':'w']))}}};}
      renderSlide(ctx, s, theme.value, { ...renderOptions(s, index.value, presenting.value ? currentOrder() : Infinity), motion: presenting.value ? revealMotion : null, showHidden:!presenting.value, now, omit: editing.value&&blockType(s,editing.value)==='code'?editing.value:null });
      if (!presenting.value && !editing.value && (selectedKeys.value.length||visibleBlocks(s).includes(selected.value))) {
        for(const key of selectedKeys.value.length?selectedKeys.value:[selected.value]){
        const measured=blockBounds(ctx,s,key), b=blockType(s,key)==='shape'?measured:{...measured,h:s.positions[key].h||measured.h}; ctx.save();if(b.rotation){ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.rotation*Math.PI/180);ctx.translate(-b.x-b.w/2,-b.y-b.h/2);}ctx.strokeStyle = `${theme.value.accent}90`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);ctx.restore();}
        const keys=selectedKeys.value.length?selectedKeys.value:[selected.value],all=enclosingBounds(keys.map(k=>elementBounds(ctx,s,k)));if(keys.length>1){ctx.save();ctx.strokeStyle=theme.value.accent;ctx.lineWidth=2;ctx.strokeRect(all.x,all.y,all.w,all.h);ctx.restore();}if(altHeld.value){const k=hovered.value,outer=k&&s.positions[k]?elementBounds(ctx,s,k):null,inner=keys.length===1?elementBounds(ctx,s,keys[0]):all;if(outer){const relation=measurementMargins(inner,outer);if(relation)drawInteriorMargins(ctx,relation.outer,relation.margins);else drawObjectDistances(ctx,all,enclosingBounds([outer]));}else drawDistances(ctx,all);}

      }
    }
    if(!presenting.value&&['slides','banners'].includes(view.value)&&panels.value.snapping&&snapGuides.value.length){ctx.save();ctx.strokeStyle='#ff76d5';ctx.lineWidth=WIDTH/Math.max(1,stageWidth.value);ctx.setLineDash([5*ctx.lineWidth,4*ctx.lineWidth]);for(const guide of snapGuides.value){ctx.beginPath();if(guide.axis==='x'){ctx.moveTo(guide.value,0);ctx.lineTo(guide.value,HEIGHT);}else{ctx.moveTo(0,guide.value);ctx.lineTo(WIDTH,guide.value);}ctx.stroke();}ctx.restore();}
    if(marquee?.rect&&!presenting.value&&['slides','banners'].includes(view.value)){const b=marquee.rect;ctx.save();ctx.fillStyle='#76dfff22';ctx.strokeStyle='#76dfff';ctx.lineWidth=1.5*WIDTH/Math.max(1,stageWidth.value);ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.restore();}
    if(stateMotion&&presenting.value){const progress=Math.min(1,(now-stateMotion.started)/300);ctx.save();ctx.globalAlpha=1-progress;ctx.drawImage(stateMotion.from,0,0,WIDTH,HEIGHT);ctx.restore();if(progress===1)stateMotion=null;}
    if (presenting.value) { trail.draw(ctx,now); drawPointer(ctx); } ctx.restore();
    if(presenting.value)presenter.mirror(canvas.value,now);
  }
  function drawPointer(ctx) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) { ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.size; ctx.beginPath(); stroke.points.forEach((p, n) => n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
    if (pointer && tool.value === 'laser') { ctx.fillStyle = laser.value; ctx.shadowColor = laser.value; ctx.shadowBlur = 22; ctx.beginPath(); ctx.globalAlpha=.75;ctx.arc(pointer.x, pointer.y, Math.max(2,laserSize.value*.3), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;ctx.globalAlpha=1; }
  }
  function drawDistances(ctx,b){const outer={x:0,y:0,w:WIDTH,h:HEIGHT};drawInteriorMargins(ctx,outer,frameMargins(b,outer));}
  function refreshMeasurementTarget(){if(!altHeld.value||!guidePoint||workspace.value!=='editor'){hovered.value=null;return;}const s=current.value,order=visibleBlocks(s),bounds=Object.fromEntries(order.map(k=>[k,elementBounds(measurement,s,k)]));hovered.value=measurementTarget(guidePoint,order,bounds,selectedKeys.value.length?selectedKeys.value:[selected.value]);}
  function elementBounds(ctx,s,key){const b=blockBounds(ctx,s,key);return blockType(s,key)==='shape'?b:{...b,h:s.positions[key].h||b.h};}
  function drawObjectDistances(ctx,a,b){
    const scale=WIDTH/Math.max(1,stageWidth.value),f=resolution.value.width/WIDTH,x=axisDistance(a,b,'x'),y=axisDistance(a,b,'y');ctx.save();ctx.strokeStyle='#ffb86b';ctx.lineWidth=scale;ctx.setLineDash([4*scale,4*scale]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);ctx.font=`600 ${12*scale}px Arial`;ctx.textBaseline='top';
    const mark=(start,end,horizontal,label)=>{const cross=horizontal?Math.min(a.y,b.y)-14*scale:Math.max(a.x+a.w,b.x+b.w)+14*scale;ctx.beginPath();horizontal?(ctx.moveTo(start,cross),ctx.lineTo(end,cross)):(ctx.moveTo(cross,start),ctx.lineTo(cross,end));ctx.stroke();const lx=Math.max(0,Math.min(WIDTH-115*scale,horizontal?(start+end)/2:cross+5*scale)),ly=Math.max(0,Math.min(HEIGHT-22*scale,horizontal?cross-22*scale:(start+end)/2));ctx.fillStyle='#251708';ctx.fillRect(lx,ly,ctx.measureText(label).width+8*scale,20*scale);ctx.fillStyle='#ffb86b';ctx.fillText(label,lx+4*scale,ly+3*scale);};mark(x.from,x.to,true,`ΔX ${Math.round(x.gap*f)} px`);mark(y.from,y.to,false,`ΔY ${Math.round(y.gap*f)} px`);ctx.restore();
  }
  function drawInteriorMargins(ctx,outer,m){
    const scale=WIDTH/Math.max(1,stageWidth.value),f=resolution.value.width/WIDTH,a=m.inner;ctx.save();if(outer.rotation){ctx.translate(outer.x+outer.w/2,outer.y+outer.h/2);ctx.rotate(outer.rotation*Math.PI/180);ctx.translate(-outer.x-outer.w/2,-outer.y-outer.h/2);}ctx.strokeStyle='#ffb86b';ctx.fillStyle='#ffb86b';ctx.lineWidth=scale;ctx.font=`600 ${12*scale}px Arial`;ctx.textBaseline='top';ctx.strokeRect(outer.x,outer.y,outer.w,outer.h);
    const mark=(x,y,ex,ey,value,name)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();const label=`${name} ${Math.round(value*f)} px`,lx=(x+ex)/2+4*scale,ly=(y+ey)/2+4*scale;ctx.fillStyle='#251708';ctx.fillRect(lx,ly,ctx.measureText(label).width+8*scale,20*scale);ctx.fillStyle='#ffb86b';ctx.fillText(label,lx+4*scale,ly+3*scale);};
    mark(outer.x,a.y+a.h/2,a.x,a.y+a.h/2,m.left,'G');mark(a.x+a.w,a.y+a.h/2,outer.x+outer.w,a.y+a.h/2,m.right,'D');mark(a.x+a.w/2,outer.y,a.x+a.w/2,a.y,m.top,'H');mark(a.x+a.w/2,a.y+a.h,a.x+a.w/2,outer.y+outer.h,m.bottom,'B');ctx.restore();
  }
  const selectionBounds=computed(()=>enclosingBounds(selectedKeys.value.filter(k=>visibleBlocks(current.value).includes(k)).map(k=>elementBounds(measurement,current.value,k))));
  const canUngroup=computed(()=>(current.value.groups||[]).some(g=>g.keys.some(k=>selectedKeys.value.includes(k))));
  function arrangeObjects(axis,mode){closeEdit();const bounds=Object.fromEntries(visibleBlocks(current.value).map(k=>[k,elementBounds(measurement,current.value,k)])),units=selectionUnits(current.value.groups,selectedKeys.value,bounds),gap=Math.max(0,Number(spacing.value)||0)*WIDTH/resolution.value.width;if(units.length<2){notify('Sélectionne au moins deux objets ou composants distincts.');return;}Object.assign(current.value.positions,mode==='line'?layoutUnits(current.value.positions,units,axis,gap):arrangeUnits(current.value.positions,units,axis,mode,gap));requestDraw();}
  const placementMargin=ref(0);
  function placeObjects(x,y){cancelMarquee();closeEdit();const keys=selectedKeys.value.length?selectedKeys.value:[selected.value].filter(Boolean);const bounds=Object.fromEntries(visibleBlocks(current.value).map(k=>[k,elementBounds(measurement,current.value,k)]));Object.assign(current.value.positions,placeOnSlide(current.value.positions,bounds,current.value.groups,keys,x,y,Math.max(0,Number(placementMargin.value)||0)*WIDTH/resolution.value.width));requestDraw();}
  function centerObjects(axis){closeEdit();const bounds=Object.fromEntries(visibleBlocks(current.value).map(k=>[k,elementBounds(measurement,current.value,k)])),units=selectionUnits(current.value.groups,selectedKeys.value,bounds),b=enclosingBounds(units.map(u=>u.bounds));if(!b)return;const delta=(axis==='x'?WIDTH-b.w:HEIGHT-b.h)/2-b[axis];for(const k of units.flatMap(u=>u.keys))current.value.positions[k][axis]+=delta;requestDraw();}
  function createComponent(){if(sharing.libraryScope.value==='shared'&&sharing.sharedBusy.value)return;const keys=selectedKeys.value;if(!keys.length||!componentName.value.trim())return;if(libraryComponents.value.length>=100){notify('Limite de 100 composants atteinte.');return;}libraryComponents.value.push(JSON.parse(JSON.stringify(captureComponent(current.value,visibleBlocks(current.value).filter(k=>keys.includes(k)),selectionBounds.value,componentName.value))));notify(sharing.libraryScope.value==='shared'?'Composant ajouté : enregistre la bibliothèque partagée.':'Composant créé dans la bibliothèque du projet.');}
  function useComponent(c){closeEdit();const keys=insertComponent(current.value,c);if(!keys.length){notify('La diapo dépasserait 100 éléments.');return;}if(keys.length>1)groupSelection(current.value,keys);workspace.value='editor';selectionScope.value='elements';selected.value=keys.length===1?keys[0]:null;selectedKeys.value=keys;prepareImages([current.value]);requestDraw();notify('Copie insérée : textes, couleurs et dimensions personnalisables.');}
  function deleteComponent(id){if(sharing.libraryScope.value==='shared'&&sharing.sharedBusy.value)return;if(sharing.libraryScope.value==='shared')sharing.sharedComponents.value=sharing.sharedComponents.value.filter(c=>c.id!==id);else components.value=components.value.filter(c=>c.id!==id);}
  function renameComponent(c,name){if(sharing.libraryScope.value==='shared'&&sharing.sharedBusy.value)return;if(name.trim())c.name=name.trim().slice(0,60);}
  function shareComponent(c){try{sharing.importLibrary([c]);notify('Composant ajouté à la bibliothèque partagée. Enregistre le fichier.');}catch{notify('Limite de 100 composants atteinte.');}}
  function exportComponents(){try{download(new Blob([serializeLibrary(libraryComponents.value)],{type:'application/json'}),'frame-composants.json');}catch{notify('Bibliothèque trop volumineuse ou invalide.');}}
  async function importComponents(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;try{if(file.size>64000000)throw Error('size');const items=parseLibrary(await file.text());if(sharing.libraryScope.value==='shared')sharing.importLibrary(items);else components.value=appendComponents(components.value,items);notify('Composants importés sans remplacer les éléments existants.');}catch{notify('Bibliothèque invalide, trop volumineuse ou limite de 100 composants dépassée.');}}
  function groupObjects(){closeEdit();groupSelection(current.value,selectedKeys.value);requestDraw();}
  function ungroupObjects(){ungroupSelection(current.value,selectedKeys.value);requestDraw();}
  function selectObject(key,event){const members=selectionFor(current.value,key);if(event?.ctrlKey||event?.metaKey){selectedKeys.value=members.every(k=>selectedKeys.value.includes(k))?selectedKeys.value.filter(k=>!members.includes(k)):[...new Set([...selectedKeys.value,...members])];}else if(!selectedKeys.value.includes(key))selectedKeys.value=members;selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;}
  function scalingOrigins(){return Object.fromEntries(selectedKeys.value.map(k=>[k,JSON.parse(JSON.stringify(current.value.positions[k]))]));}
  function applySelectionScale(){if(!selectedKeys.value.length)return;closeEdit();const b=selectionBounds.value,result=scaleObjects(scalingOrigins(),b,Number(scalePercent.value)/100,{x:b.x+b.w/2,y:b.y+b.h/2});if(!result)return;Object.assign(current.value.positions,result.positions);scalePercent.value=100;requestDraw();}
  function resizeDown(e,corner){if(e.button!==0)return;e.preventDefault();closeEdit();contextMenu.value=null;if(scaleMode.value||selectedKeys.value.length>1){const b=selectionBounds.value;if(!b)return;drag={key:selectedKeys.value[0],slideId:current.value.id,origins:scalingOrigins(),bounds:b,start:coords(e),scaling:true,corner,moved:false};historyGesture='scale:'+(++gestureId);e.currentTarget.setPointerCapture(e.pointerId);requestDraw();return;}const b=selectedBounds.value;if(!b)return;drag={key:selected.value,slideId:current.value.id,origin:{...position.value,x:b.x,y:b.y,w:b.w,h:b.h},position:{...position.value,x:b.x,y:b.y,w:b.w,h:b.h},start:coords(e),corner,type:selectedType.value,moved:false};e.currentTarget.setPointerCapture(e.pointerId);requestDraw();}
  function rotateDown(e){if(e.button!==0)return;e.preventDefault();closeEdit();contextMenu.value=null;const b=selectedBounds.value;if(!b)return;drag={key:selected.value,slideId:current.value.id,origin:{...position.value,x:b.x,y:b.y,w:b.w,h:b.h},position:{...position.value,x:b.x,y:b.y,w:b.w,h:b.h},start:coords(e),rotating:true,moved:false};e.currentTarget.setPointerCapture(e.pointerId);requestDraw();}
  function setRotation(e){position.value.rotation=normalizeAngle(e.target.value);e.target.value=Math.round(position.value.rotation*100)/100;}
  function duplicateSelected(){closeEdit();const keys=selectedKeys.value.length?selectedKeys.value:[selected.value];if(Object.keys(current.value.elements).length+keys.length>MAX_ELEMENTS){notify('Limite de 100 éléments ajoutés atteinte.');return;}const map=new Map(keys.map(k=>[k,duplicateElement(current.value,k)]).filter(([,v])=>v));for(const g of [...current.value.groups||[]])if(g.keys.every(k=>map.has(k)))groupSelection(current.value,g.keys.map(k=>map.get(k)));selectedKeys.value=[...map.values()];selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;contextMenu.value=null;requestDraw();}
  function openContext(e){e.preventDefault();if(presenting.value||!['slides','banners'].includes(view.value))return;closeEdit();const hit=hitBlock(coords(e));if(hit){selectObject(hit,e);selectionScope.value='elements';}else deselect();contextMenu.value={x:Math.max(8,Math.min(window.innerWidth-224,e.clientX)),y:Math.max(8,Math.min(window.innerHeight-280,e.clientY)),element:!!hit};}
  function endHistoryGesture(){if(historyGesture?.startsWith('range:')){recordHistory();historyGesture=null;}}
  function contextOutside(e){if(e.target.matches?.('input[type=range]'))historyGesture='range:'+(++gestureId);if(!e.target.closest?.('.element-context'))dismissContext();}
  function dismissContext(){contextMenu.value=null;}
  function keyup(e){if(e.key.startsWith('Arrow')){recordHistory();historyGesture=null;}if(['Alt','AltGraph'].includes(e.key))altHeld.value=false;}
  function resetKeys(){snapGuides.value=[];guidePoint=null;hovered.value=null;cancelMarquee();historyGesture=null;altHeld.value=false;contextMenu.value=null;}
  function clearAnnotations() { strokes = []; trail.clear(); requestDraw(); }
  function coords(e) { const r = canvas.value.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * WIDTH, y: (e.clientY - r.top) / r.height * HEIGHT }; }
  function hitBlock(p) {
    const ctx = canvas.value.getContext('2d');
    return [...visibleBlocks(current.value)].reverse().find(k => { const measured=blockBounds(ctx,current.value,k),b=blockType(current.value,k)==='shape'?measured:{...measured,h:current.value.positions[k].h||measured.h};const margin=blockType(current.value,k)==='shape'?0:12; const local=rotatePoint(p,b,-(b.rotation||0));return local.x >= b.x - margin && local.x <= b.x + b.w + margin && local.y >= b.y - (k === 'title' && current.value.label ? 58 : margin) && local.y <= b.y + b.h + margin; });
  }
  function down(e) {
    if(!canvas.value)return;
    if (e.button !== 0 || videoPreview.value) return;
    if(!presenting.value)canvas.value.focus({preventScroll:true});
    closeEdit();contextMenu.value=null;if(!presenting.value)selectionScope.value='elements';const p = coords(e);if(!presenting.value)guidePoint=p; canvas.value.setPointerCapture(e.pointerId);
    if (presenting.value) { pointer = p; pointerDown = { ...p, moved: false }; if(tool.value==='laser')trail.begin(p,performance.now(),laser.value,laserSize.value); if (tool.value === 'pen') { activeStroke = { color: laser.value, size: laserSize.value / 2, points: [p] }; strokes.push(activeStroke); } }
    else {const hit=hitBlock(p);if(!hit){const previous=selectedKeys.value.slice(),add=e.ctrlKey||e.metaKey||e.shiftKey;marquee={slideId:current.value.id,start:p,previous,base:add?previous:[],bounds:Object.fromEntries(visibleBlocks(current.value).map(k=>[k,elementBounds(measurement,current.value,k)])),pointerId:e.pointerId};selectedKeys.value=marquee.base.slice();selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;requestDraw();return;}selectionScope.value='elements';selectObject(hit,e);if(e.ctrlKey||e.metaKey){requestDraw();return;}const origins=Object.fromEntries(selectedKeys.value.map(k=>[k,{...current.value.positions[k]}])),b=enclosingBounds(selectedKeys.value.map(k=>elementBounds(measurement,current.value,k)));drag={key:hit,slideId:current.value.id,origin:origins[hit],position:origins[hit],origins,positions:origins,bounds:b,targets:visibleBlocks(current.value).filter(k=>!selectedKeys.value.includes(k)).map(k=>enclosingBounds([elementBounds(measurement,current.value,k)])),start:p,moved:false};}

    requestDraw();
  }
  function move(e) {
    if(!canvas.value)return;
    const p = coords(e);if(!presenting.value)guidePoint=p;
    if(marquee){if(marquee.slideId!==current.value.id){cancelMarquee();return;}if(Math.hypot(p.x-marquee.start.x,p.y-marquee.start.y)*stageWidth.value/WIDTH>=4||marquee.rect){marquee.rect=marqueeRect(marquee.start,p);selectedKeys.value=marqueeKeys(marquee.bounds,current.value.groups,marquee.rect,marquee.base);selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;requestDraw();}return;}
    if(!presenting.value&&!drag){if(e.altKey)altHeld.value=true;if(altHeld.value)refreshMeasurementTarget();}
    if (presenting.value) { pointer = p; if (pointerDown && Math.hypot(p.x - pointerDown.x, p.y - pointerDown.y) > 12) pointerDown.moved = true; if (pointerDown && (e.buttons & 1) && tool.value==='laser') {const now=performance.now(),samples=e.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[e])trail.append(coords(sample),now-Math.max(0,Math.min(50,e.timeStamp-sample.timeStamp)));} else if (!(e.buttons & 1)) trail.end(); if (activeStroke && (e.buttons & 1)) activeStroke.points.push(p); requestDraw(); }
    else if(drag?.scaling){const plan=scaleFromHandle(drag.bounds,drag.corner,p.x-drag.start.x,p.y-drag.start.y),result=scaleObjects(drag.origins,drag.bounds,plan.factor,plan.anchor);drag.moved=true;drag.positions=result.positions;transformPreview.value={id:drag.slideId,positions:drag.positions};requestDraw();}
    else if(drag?.rotating){drag.moved=true;drag.position={...drag.origin,rotation:rotationFromPointer(drag.origin,drag.start,p,e.shiftKey)};transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position};requestDraw();}
    else if (drag?.corner) {const dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.moved=true;drag.position=resizeRotated(drag.origin,drag.corner,dx,dy,drag.type);const e=current.value.elements[drag.key],strokeWidth=e?.shape==='line'&&['horizontal','vertical'].includes(e.direction)?Math.max(1,Math.min(60,drag.position[e.direction==='horizontal'?'h':'w'])):undefined;transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position,strokeWidth};requestDraw();}
    else if(drag){const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(Math.hypot(dx,dy)>2)drag.moved=true;if(panels.value.snapping){const snapped=snapTranslation(drag.origins,drag.bounds,drag.targets,dx,dy,6*WIDTH/Math.max(1,stageWidth.value));drag.positions=snapped.positions;snapGuides.value=snapped.guides;}else{drag.positions=translateSelection(drag.origins,drag.bounds,dx,dy);snapGuides.value=[];}drag.position=drag.positions[drag.key];transformPreview.value={id:drag.slideId,key:drag.key,position:drag.position};requestDraw();}

  }
  function up(e) {
    snapGuides.value=[];
    if(e?.type==='pointerup'&&!presenting.value)guidePoint=coords(e);
    if(marquee){if(e?.type==='pointercancel'||e?.type==='lostpointercapture')cancelMarquee();else {move(e);marquee=null;requestDraw();}return;}
    if (drag) { if (e?.type!=='pointercancel' && drag.moved && drag.slideId === current.value.id) { if(drag.corner&&!drag.scaling&&current.value.elements[drag.key]?.shape==='line'){const e=current.value.elements[drag.key];if(['horizontal','vertical'].includes(e.direction))e.strokeWidth=Math.max(1,Math.min(60,drag.position[e.direction==='horizontal'?'h':'w']));}Object.assign(current.value.positions,drag.positions||{[drag.key]:{...drag.position,autoSize:drag.corner?false:drag.position.autoSize}}); metrics.dragCommits++; } drag = null; }
    if(historyGesture?.startsWith('scale:')){recordHistory();historyGesture=null;}transformPreview.value=null;trail.end();if(altHeld.value)refreshMeasurementTarget();
    pointerDown = null; activeStroke = null; requestDraw();
  }
  function leave() { pointer = null;guidePoint=null;hovered.value=null; requestDraw(); }
  function doubleClick(e) { if (!canvas.value || presenting.value || !['slides','banners'].includes(view.value)) return; const hit = hitBlock(coords(e)); if (!hit) return; drag = null; selected.value = hit;selectedKeys.value=[hit];selectionScope.value='elements'; if(!['image','shape','bits'].includes(blockType(current.value,hit))) editing.value = hit; requestDraw(); }
  function closeEdit() { if(editing.value)history.group=null;editing.value = null; requestDraw(); }
  function editSelected() { if (!visibleBlocks(current.value).includes(selected.value))return; if(!['image','shape','bits'].includes(selectedType.value)) editing.value = selected.value; }
  function chooseSlide(n) {
    if (n < 0 || n >= slides.value.length || n === index.value || moving.value) return;
    cancelMarquee();closeEdit(); drag = null; transformPreview.value=null;pointer = null; strokes = []; trail.clear();
    if (presenting.value) {
      const old = current.value, oldIndex = index.value, oldOrder = currentOrder(), next = slides.value[n];
      const from = snapshotCanvas(old, oldIndex, oldOrder), to = snapshotCanvas(next, n, 0);
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : transitionMs.value;
      if (duration > 0) { slideMotion = { from, to, started: performance.now(), duration, direction: n < oldIndex ? (()=>{const d=transitionDirection(next,old);return {x:-d.x,y:-d.y};})() : transitionDirection(old, next) }; moving.value = true; }
    }
    revealMotion = null; stateMotion=null; index.value = n; step.value = 0;editStep.value=0; gridDraft.value = { ...current.value.grid }; requestDraw();
  }
  function navigate(delta) { if (presenting.value) delta > 0 ? advance() : retreat(); else chooseSlide(index.value + delta); }
  function jumpStep(n){if(moving.value||n<0||n>=sequence.value.length||n===step.value)return;const previous=sequence.value[step.value],next=sequence.value[n],reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(next.scene!==previous.scene){const from=snapshotCanvas(current.value,index.value,currentOrder());stateMotion=reduced?null:{from,started:performance.now()};revealMotion=null;strokes=[];trail.clear();pointer=null;}
    step.value=n;if(next.scene===previous.scene)revealMotion=!reduced&&n>0?{order:currentOrder(),started:performance.now()}:null;requestDraw();}
  function advance() { if (moving.value||revealMotion?.exit) return; if(step.value<orders.value.length)jumpStep(step.value+1);else chooseSlide(index.value+1); }
  function retreat() { if (moving.value||revealMotion?.exit) return;if(step.value>0){const now=sequence.value[step.value],previous=sequence.value[step.value-1],order=currentOrder(),animated=now.scene===previous.scene&&visibleBlocks(current.value).some(k=>current.value.fragments[k].order===order&&current.value.fragments[k].exitAnimation&&current.value.fragments[k].exitAnimation!=='none');if(animated&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){revealMotion={order,exit:true,started:performance.now()};requestDraw();}else jumpStep(step.value-1);}else chooseSlide(index.value-1); }
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
  function undoLayout(){if(!canUndoLayout.value)return;closeEdit();const old=layoutBackup.value;restoreTemplateLayout(current.value,old);current.value.blockKeys=current.value.blockKeys.filter(k=>blocks.includes(k)||current.value.elements[k]);layoutBackup.value=null;if(!visibleBlocks(current.value).includes(selected.value))selected.value=visibleBlocks(current.value)[0]||'title';requestDraw();}
  function applyPreset(id) { layoutBackup.value=JSON.parse(JSON.stringify(current.value));closeEdit(); applyLayout(current.value,id);current.value.groups=normalizeGroups(current.value.groups,visibleBlocks(current.value)); if (!visibleBlocks(current.value).includes(selected.value)) selected.value = 'title'; }
  function fitAuto(key){if(current.value.positions[key]?.autoSize){const b=autoTextBounds(measurement,current.value,key);Object.assign(current.value.positions[key],{w:b.w,h:b.h});}}
  function fitSelection(){fitAuto(selected.value);}
  const tablePreview=ref(null);
  function previewTable(table){tablePreview.value=table?{key:selected.value,id:current.value.id,table}:null;requestDraw();}
  function commitTableTracks(weights){if(selectedType.value!=='table'||!weights)return;Object.assign(current.value.elements[selected.value],weights);previewTable(null);}
  function commitTable(cells,styles){const key=editing.value;if(!key||blockType(current.value,key)!=='table')return;if(styles)current.value.elements[key].cellStyles=normalizeCellStyles(styles,current.value.elements[key].rows,current.value.elements[key].columns);current.value.elements[key].cells=cells.map(row=>row.map(value=>String(value).slice(0,2000)));closeEdit();}
  function commitText(value){const key=editing.value;if(!key||blockType(current.value,key)!=='text')return;changeText(value.text);if(key==='title')current.value.label=value.label;else if(current.value.elements[key]?.weight===700)current.value.elements[key].label=value.label;separateLabels(current.value);closeEdit();}
  function setZoom(value,anchor=null){const next=clampZoom(value),viewport=stage.value?.parentElement;if(!viewport){zoom.value=next;return;}const rect=viewport.getBoundingClientRect(),point=anchor||{x:rect.left+rect.width/2,y:rect.top+rect.height/2},before=stage.value.getBoundingClientRect(),logical={x:(point.x-before.left)/before.width,y:(point.y-before.top)/before.height};zoom.value=next;nextTick(()=>{if(!stage.value)return;const after=stage.value.getBoundingClientRect();viewport.scrollLeft+=after.left+logical.x*after.width-point.x;viewport.scrollTop+=after.top+logical.y*after.height-point.y;});}
  function zoomWheel(event){if(!(event.ctrlKey||event.metaKey)||presenting.value||editing.value)return;event.preventDefault();setZoom(wheelZoom(zoom.value,event),{x:event.clientX,y:event.clientY});}
  function changeText(value) { setBlockText(current.value,editing.value,value);fitAuto(editing.value); }
  function openShapes(){closeEdit();contextMenu.value=null;shapeGallery.value=true;}
  function addShape(id){const spec=shapes.find(s=>s.id===id);if(!spec)return;if(Object.keys(current.value.elements).length>=MAX_ELEMENTS){notify('Cette diapo contient déjà 100 éléments ajoutés.');return;}workspace.value='editor';closeEdit();const key='shape'+crypto.randomUUID().replaceAll('-','').slice(0,8);current.value.elements[key]=normalizeShape({shape:id,fill:theme.value.accent,stroke:theme.value.accent});current.value.positions[key]={x:(WIDTH-spec.w)/2,y:(HEIGHT-spec.h)/2,w:spec.w,h:spec.h,size:38};current.value.fragments[key]={order:0,animation:'fade'};shapeGallery.value=false;selectionScope.value='elements';nextTick(()=>{selected.value=key;selectedKeys.value=[key];requestDraw();});}
  function setLayer(action,rank){closeEdit();const order=visibleBlocks(current.value),keys=selectedKeys.value.length?selectedKeys.value:[selected.value];current.value.blockKeys=reorderLayers(order,keys,action,rank);requestDraw();}
  function moveLayer(front){setLayer(front?'front':'back');}
  function selectLayer(key,event){closeEdit();workspace.value='editor';selectionScope.value='elements';if(event?.ctrlKey||event?.metaKey)selectObject(key,event);else {selected.value=null;selectedKeys.value=[key];selected.value=key;}requestDraw();}

  function addBlock(type) {
    const variant=type; if(['title','subtitle','list'].includes(type))type='text';
    if(Object.keys(current.value.elements).length>=MAX_ELEMENTS){notify('Cette diapo contient déjà 100 éléments ajoutés.');return;}
    closeEdit(); const key=type+crypto.randomUUID().replaceAll('-','').slice(0,8), s=current.value;
    const count=type==='text'?visibleBlocks(s).filter(k=>k!=='title'&&blockType(s,k)==='text').length+1:Object.values(s.elements).filter(e=>e.type===type).length+1;
    s.elements[key]=type==='bits'?normalizeBits({name:'Octets et bits '+count}):type==='table'?normalizeTable({name:'Tableau '+count}):type==='code'?{type,custom:true,name:'Code '+count,text:'// Ton extrait Java',caption:''}:type==='text'?{type,custom:true,name:'Texte '+count,text:'Ton nouveau texte.'}:{type,custom:true,name:'Image '+count,src:'',fit:'contain'};
    const bottom=Math.max(250,...visibleBlocks(s).filter(k=>k!==key&&blockType(s,k)==='text').map(k=>{const b=blockBounds(measurement,s,k);return b.y+b.h;}));
    const y=type==='text'?Math.min(900,Math.round(bottom+55)):Math.min(640,300+count*120);
    s.positions[key]={x:200,y,w:type==='bits'?1100:type==='table'?1200:type==='text'?(visibleBlocks(s).includes('code')?650:1200):700,h:type==='bits'?260:Math.min(400,HEIGHT-y-40),size:type==='code'?28:42,font:type==='code'?'monospace':type==='text'?'montserrat':'inter',...(type==='text'?{textRole:'body'}:{})};
    if(type==='text'&&['title','subtitle'].includes(variant)){applyTextRole(s,key,variant);s.elements[key].text=variant==='title'?'Ton titre.':'Ton sous-titre.';s.elements[key].name=variant==='title'?'Titre':'Sous-titre';}
    if(variant==='list'){s.elements[key].text='Première idée\nDeuxième idée\nTroisième idée';s.elements[key].name='Liste';s.positions[key].textStyle={list:{type:'bullet'}};}
    if(type==='text'){s.positions[key].autoSize=true;s.positions[key].wrapWidth=s.positions[key].w;fitAuto(key);}
    s.fragments[key]={order:Math.min(20,Math.max(0,...Object.values(s.fragments).map(f=>f.order))+1),animation:'up'};
    selectedKeys.value=[key];selectionScope.value='elements';selected.value=key;if(type==='text')editing.value=key;
  }
  function removeBlock() { const keys=selectedKeys.value.length?selectedKeys.value:[selected.value];contextMenu.value=null;closeEdit();for(const k of keys){if(!k)continue;delete current.value.elements[k];delete current.value.positions[k];delete current.value.fragments[k];current.value.blockKeys=current.value.blockKeys.filter(key=>key!==k);}current.value.groups=normalizeGroups(current.value.groups,visibleBlocks(current.value));deselect();requestDraw(); }
  async function uploadImage(event) {
    const file=event.target.files?.[0],slide=current.value,key=selected.value;event.target.value='';if(!file)return;
    try{const src=await imageSource(file);if(slide.elements[key]?.type==='image')slide.elements[key].src=src;await prepareImages([slide]);notify('Image intégrée, transparence conservée.');}
    catch(error){notify(imageImportError(error));}
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
  function duplicate() { if(slides.value.length>=100){notify('Le projet contient déjà 100 diapos.');return;} const s = JSON.parse(JSON.stringify(baseSlide.value)); s.id = crypto.randomUUID(); s.grid = nextFreeGrid(slides.value, current.value.grid, 'right'); slides.value.splice(index.value + 1, 0, s); chooseSlide(index.value + 1);if(routeMode.value==='spatial')rebuildRoute(); }
  function remove() { if (slides.value.length <= 1) return; closeEdit(); slides.value.splice(index.value, 1);editStep.value=0; index.value = Math.min(index.value, slides.value.length - 1); gridDraft.value = { ...current.value.grid };if(routeMode.value==='spatial')rebuildRoute(); requestDraw(); }
  function applyGrid() {
    const { x, y } = gridDraft.value;
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000 || slides.value.some(s => s.id !== current.value.id && s.grid.x === x && s.grid.y === y)) { gridDraft.value = { ...current.value.grid }; notify('Cette case est occupée ou sa position est invalide.'); return; }
    current.value.grid = { x, y };if(routeMode.value==='spatial')rebuildRoute();
  }
  function setPosition(key, event) { const value = Number(event.target.value)*WIDTH/resolution.value.width;const shape=current.value.elements[selected.value];if(shape?.shape==='line'&&['horizontal','vertical'].includes(shape.direction)&&['x','y','w','h'].includes(key)&&Number.isFinite(value)){const minor=shape.direction==='horizontal'?'h':'w';Object.assign(position.value,selectedBounds.value);if(key===minor){shape.strokeWidth=Math.max(1,Math.min(60,value));position.value[key]=shape.strokeWidth;}else position.value[key]=Math.max(key==='w'||key==='h'?8:0,Math.min(key==='y'||key==='h'?HEIGHT:WIDTH,value));event.target.value=Math.round(position.value[key]*resolution.value.width/WIDTH);return;}if(['w','h'].includes(key))position.value.autoSize=false; const min = key==='w'?(selectedType.value==='code'?240:selectedType.value==='shape'?8:80):key==='h'?(selectedType.value==='code'?180:selectedType.value==='shape'?8:40):key==='size'?10:0, max = key === 'y' || key === 'h' ? HEIGHT : key === 'size' ? 260 : WIDTH; position.value[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : position.value[key]; if(key==='size')fitAuto(selected.value);event.target.value = Math.round(position.value[key]*resolution.value.width/WIDTH); }
  function updateAppearance(keys,field,value){setAppearance(current.value,keys,field,value);requestDraw();}
  function updateFragment(event){updateAppearance([selected.value],'order',event.target.value);}
  function formatCode(source = blockText(current.value,selected.value)) {
    const slideId = current.value.id, stateId=activeState.value?baseSlide.value.pedagogicalSteps[activeState.value-1]?.id:null, key=selected.value;
    if (!worker) {
      worker = new Worker(new URL('./formatter.worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => { const job = formatRequests.get(data.id); formatRequests.delete(data.id); formatting.value = formatRequests.size > 0; if (!job) return; const base = [...slides.value,banner.value.slide].find(s => s.id === job.slideId);const s=job.stateId?base?.pedagogicalSteps?.find(item=>item.id===job.stateId)?.scene:base; if (!s || blockText(s,job.key) !== job.source) return; if (data.ok) { setBlockText(s,job.key,data.code); notify('Code Java formaté.'); } else notify('Extrait incomplet ou non Java : texte conservé sans modification.'); };
      worker.onerror = () => { formatRequests.clear(); formatting.value = false; worker?.terminate(); worker = null; notify('Formatage indisponible : ton code est conservé.'); };
    }
    const id = ++workerCounter; formatRequests.set(id, { slideId, stateId, key, source }); formatting.value = true; worker.postMessage({ id, code: source });
  }
  function download(blob, name,preview=true) {
    if (lastExport.value) URL.revokeObjectURL(lastExport.value.url);
    const url = URL.createObjectURL(blob); lastExport.value = { url, name, size: Math.max(1, Math.round(blob.size / 1024)), video: blob.type.startsWith('video/webm') };
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    if (lastExport.value.video&&preview) { videoMeta.value = ''; videoPreview.value = true; }
  }
  function exportProject() { download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' }), 'frame-projet.json'); }
  function applyProject(data){
      const normalized = normalizeSlides(data.slides);projectColors.value=normalizeProjectColors(data.projectColors);components.value=normalizeComponents(data.components);
      closeEdit();layoutBackup.value=null;contextMenu.value=null; slides.value = normalized; project.value = String(data.project || 'Projet importé'); if(data.themes)palette.value=normalizeThemes(data.themes);themeId.value=palette.value.some(t=>t.id===data.themeId)?data.themeId:palette.value[0].id;deselect();selectedSlides.value=[];
      banner.value = normalizeOverlay(data.banner);
      routeMode.value=['spatial','manual'].includes(data.routeMode)?data.routeMode:'spatial';routeStart.value=normalized.some(s=>s.id===data.routeStart)?data.routeStart:'';routeBackup.value=null;resolution.value=normalizeResolution(data.resolution);
      frame.value = normalizeFrame(data.frame); transitionMs.value = Number.isFinite(data.transitionMs) ? Math.min(2000, Math.max(0, data.transitionMs)) : 650;
      index.value = 0; step.value = 0;editStep.value=0; gridDraft.value = { ...current.value.grid }; updateThumbnails(); requestDraw(); projectId.value=crypto.randomUUID();history=new ProjectHistory(snapshot());historyVersion.value++;flushLocal();
  }
  async function importProject(event){try{applyProject(JSON.parse(await event.target.files[0].text()));await fileStore.detach();fileName.value='';fileDirty.value=true;notify('Projet importé. Utilise Enregistrer sous pour le lier à un fichier.');}catch{notify('Ce fichier n’est pas un projet Frame valide.');}event.target.value='';}
  async function openProject(){if(fileBusy.value)return;fileBusy.value=true;try{const r=await fileStore.open();applyProject(JSON.parse(r.text));await fileStore.link(r.handle,projectId.value);fileName.value=r.handle.name;fileDirty.value=false;notify('Fichier ouvert et lié.');}catch(error){if(error.name!=='AbortError')notify('Impossible d’ouvrir ce projet.');}finally{fileBusy.value=false;}}
  async function saveProject(saveAs=false){flushLocal();if(fileBusy.value)return;if(!fileStore.supported){exportProject();notify('Copie locale sauvegardée et JSON téléchargé. Ce navigateur ne peut pas écrire directement dans un fichier.');return;}fileBusy.value=true;const text=JSON.stringify(snapshot(),null,2);try{await fileStore.save(text,projectId.value,saveAs);fileName.value=fileStore.handle.name;fileDirty.value=JSON.stringify(snapshot(),null,2)!==text;notify('Fichier enregistré.');}catch(error){if(error.name!=='AbortError')notify(error.message==='conflict'?'Le fichier a changé en dehors de Frame. Utilise Enregistrer sous pour conserver tes modifications.':'Écriture impossible. Ta session reste sauvegardée localement.');}finally{fileBusy.value=false;}}
  const fileSupported=fileStore.supported,openSupported=!!window.showOpenFilePicker;
  async function openOverlayVideo(){if(view.value!=='banners')return;closeEdit();if(!await ensureFonts())return;await prepareImages([banner.value.slide]);overlayVideoOpen.value=true;}
  function cancelOverlayVideo(){overlayVideoController?.abort();}
  async function exportOverlayVideo(){
    if(overlayVideoBusy.value)return;
    const overlay=normalizeOverlay(structuredClone(toRaw(banner.value))),colors=structuredClone(toRaw(theme.value)),size={...resolution.value};
    overlayVideoBusy.value=true;overlayVideoProgress.value=0;const controller=new AbortController();overlayVideoController=controller;
    try{await prepareFonts([overlay.slide]);await prepareImages([overlay.slide]);if(controller.signal.aborted)return;
      const c=document.createElement('canvas');c.width=size.width;c.height=size.height;const clip=normalizeClip(overlay.clip,visibleBlocks(overlay.slide));
      const blob=await (clip.background==='transparent'?exportTransparentMovie:exportChromaMovie)({canvas:c,slide:overlay.slide,theme:colors,clip,signal:controller.signal,onProgress:value=>overlayVideoProgress.value=Math.round(value*100)});
      if(controller.signal.aborted)return;download(blob,clip.background==='transparent'?'frame-incrustation-alpha.mov':'frame-incrustation-chroma.webm',false);notify('Incrustation animée prête à télécharger.');
    }catch(error){if(error.name!=='AbortError')notify(error.message||'Impossible d’exporter la vidéo.');else notify('Export annulé.');}
    finally{overlayVideoBusy.value=false;overlayVideoController=null;}
  }
  async function png() { if(!await ensureFonts())return;await prepareImages([current.value]); const c = document.createElement('canvas'); c.width = resolution.value.width; c.height = resolution.value.height; const ctx = c.getContext('2d');ctx.scale(c.width/WIDTH,c.height/HEIGHT); renderSlide(ctx, current.value, theme.value, renderOptions(current.value, index.value)); c.toBlob(blob => { if (blob) download(blob, view.value === 'banners' ? 'frame-bandeau.png' : `frame-diapo-${index.value + 1}.png`); }, 'image/png'); }
  async function startPresentation(fromStart=true) { cancelMarquee(); if(!await ensureFonts())return;await prepareImages(allScenes(slides.value)); closeEdit(); if(fromStart)index.value=0; view.value = 'slides'; notesVisible.value=true;presenting.value = true; step.value = 0; revealMotion = null; stateMotion=null;presentationStarted.value=Date.now();presentationSeconds.value=0;strokes = []; trail.clear(); await nextTick(); observeStage(); requestDraw(); }
  function exit() { cancelCountdown(); if (recording.value) stopRecord(); slideMotion = null; moving.value = false; presenting.value = false;presenter.close(); stateMotion=null; strokes = []; trail.clear(); requestDraw(); }
  const presentationStarted=ref(0),presentationSeconds=ref(0);
  const presenter=usePresenterWindow({notify,command(action){if(!presenting.value)return;if(action==='advance')advance();else if(action==='retreat')retreat();else if(action==='exit')exit();else if(action==='ready')requestDraw();}});
  function startPresenter(fromStart=true){if(!presenter.open())return;startPresentation(fromStart).then(()=>{if(!presenting.value)presenter.close();});}
  function nextPreview(){const next=sequence.value[step.value+1];return next?snapshotCanvas(sceneAt(baseSlide.value,next.scene),index.value,next.order).toDataURL('image/jpeg',.75):slides.value[index.value+1]?snapshotCanvas(slides.value[index.value+1],index.value+1,0).toDataURL('image/jpeg',.75):'';}
  const nextPreviewUrl=ref('');
  watch([index,step,presenting,thumbs],()=>{if(presenting.value)nextPreviewUrl.value=nextPreview();});
  let presenterClock;
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
  function saveTheme(){const draft=themeEditor.value;if(!draft?.name.trim())return;const normalized=normalizeThemes([draft])[0];if(normalized.id!==draft.id)return;const n=palette.value.findIndex(t=>t.id===draft.id);if(n<0){if(palette.value.length>=100){notify('Limite de 100 thèmes atteinte.');return;}palette.value.push(normalized);}else palette.value[n]=normalized;selectTheme(draft.id);themeEditor.value=null;notify('Thème sauvegardé.');}
  function deleteTheme(id){if(palette.value.length===1){notify('Conserve au moins un thème.');return;}const n=palette.value.findIndex(t=>t.id===id);if(n<0)return;themeUndo.value={theme:structuredClone(toRaw(palette.value[n])),index:n,id:themeId.value,colors:{...projectColors.value}};palette.value=palette.value.filter(t=>t.id!==id);if(themeId.value===id){themeId.value=palette.value[0].id;projectColors.value={};}notify('Thème supprimé. Tu peux annuler.');}
  function undoTheme(){if(!themeUndo.value)return;if(!palette.value.some(t=>t.id===themeUndo.value.theme.id))palette.value.splice(themeUndo.value.index,0,themeUndo.value.theme);if(palette.value.some(t=>t.id===themeUndo.value.id)){themeId.value=themeUndo.value.id;projectColors.value=normalizeProjectColors(themeUndo.value.colors);}themeUndo.value=null;}
  function resizePanel(e,key){e.preventDefault();const origin=panels.value[key],start=e.clientX,direction=key==='inspectorWidth'?-1:1;const move=event=>panels.value[key]=Math.max(key==='inspectorWidth'?220:140,Math.min(key==='inspectorWidth'?520:360,origin+(event.clientX-start)*direction));const end=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);};window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);}
  function clipboardEvent(e){if(presenting.value||!['slides','banners'].includes(view.value)||editing.value||overlayGallery.value||gallery.value||shapeGallery.value||themeEditor.value||formatOpen.value||overlayVideoOpen.value||videoPreview.value||e.target.isContentEditable||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
    if(e.type==='copy'&&selectionScope.value==='elements'&&selectedKeys.value.length&&e.clipboardData){try{const value=copySelection(false),text=serializeObjects(value);e.clipboardData.setData('text/plain',text);try{e.clipboardData.setData(TRANSFER_MIME,text);}catch{}e.preventDefault();clipboardStatus.value='Copié pour les autres instances';notify('Copié. Ouvre une autre instance puis Ctrl V.');}catch{notify('Sélection trop volumineuse pour le presse-papiers.');}}
    else if(e.type==='paste'&&e.clipboardData){const text=e.clipboardData.getData(TRANSFER_MIME)||e.clipboardData.getData('text/plain');try{const value=parseObjects(text);if(value){e.preventDefault();pasteSelection(value);}}catch{e.preventDefault();notify('Les objets Frame du presse-papiers sont invalides ou trop volumineux.');}}
  }
  function presentationShortcut(e){if(e.key!=='F12'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;e.preventDefault();e.stopPropagation();if(e.repeat||presenting.value)return;if(overlayVideoOpen.value||editing.value||overlayGallery.value||gallery.value||shapeGallery.value||themeEditor.value||formatOpen.value||videoPreview.value)return;startPresenter();}
  function keys(e) {
    if(overlayVideoOpen.value)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'&&!presenting.value){e.preventDefault();if(!e.repeat)saveProject(e.shiftKey);return;}
    if(['Alt','AltGraph'].includes(e.key)&&!presenting.value&&!editing.value&&['slides','banners'].includes(view.value)&&workspace.value==='editor'){altHeld.value=true;refreshMeasurementTarget();e.preventDefault();}
    if(e.target.isContentEditable)return;
    if (e.key === 'Escape') {if(overlayGallery.value){overlayGallery.value=false;return;}if(marquee){cancelMarquee();return;}if(shapeGallery.value){shapeGallery.value=false;return;}if(themeEditor.value){themeEditor.value=null;return;}displayMenu.value=false;contextMenu.value=null; if(overlayVideoOpen.value){if(!overlayVideoBusy.value)overlayVideoOpen.value=false;return;}if (videoPreview.value) videoPreview.value = false; else if(formatOpen.value)formatOpen.value=false;else if (gallery.value) gallery.value = false; else if (presenting.value) exit(); else closeEdit(); return; }
    if(!presenting.value&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'&&['text','search','email','url','password','number'].includes(e.target.type))){e.preventDefault();if(!e.repeat)e.shiftKey?redo():undo();return;}
    if (['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO'].includes(e.target.tagName)) return;

    if(!presenting.value&&['slides','banners'].includes(view.value)&&!editing.value&&!overlayGallery.value&&!shapeGallery.value&&!gallery.value&&!formatOpen.value&&!themeEditor.value){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();if(view.value==='slides'&&(workspace.value==='canvas'||selectionScope.value==='slides')){selectedSlides.value=slides.value.map(s=>s.id);selectionScope.value='slides';}else{selectedKeys.value=visibleBlocks(current.value);selected.value=selectedKeys.value.length===1?selectedKeys.value[0]:null;}requestDraw();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='g'&&workspace.value==='editor'){e.preventDefault();e.shiftKey?ungroupObjects():groupObjects();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'&&workspace.value==='editor'&&selectedKeys.value.length){e.preventDefault();if(!e.repeat)duplicateSelected();return;}if(e.key==='Delete'){e.preventDefault();view.value==='slides'&&selectionScope.value==='slides'?deleteSlides():removeBlock();return;}}
    if (!presenting.value && ['slides','banners'].includes(view.value) && workspace.value==='editor' && !themeEditor.value && !editing.value && !shapeGallery.value && !gallery.value && !formatOpen.value && selectedKeys.value.length) {
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();if(!e.repeat)duplicateSelected();return;}
      const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();if(!e.repeat)historyGesture='arrows:'+(++gestureId);const amount=e.shiftKey?10:1;const b=selectionBounds.value,origins=Object.fromEntries(selectedKeys.value.map(k=>[k,current.value.positions[k]]));Object.assign(current.value.positions,translateSelection(origins,b,d[0]*amount*WIDTH/resolution.value.width,d[1]*amount*WIDTH/resolution.value.width));return;}
    }
    if (!presenting.value || videoPreview.value) return;
    const direction = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' }[e.key];
    if (direction) { e.preventDefault(); goDirection(direction); }
    else if ([' ', 'Enter', 'PageDown'].includes(e.key)) { e.preventDefault(); advance(); }
    else if (['Backspace', 'PageUp'].includes(e.key)) { e.preventDefault(); retreat(); }
  }
  function beforeUnload(e) { flushLocal();if (recording.value || finalizing.value || overlayVideoBusy.value) { e.preventDefault(); e.returnValue = ''; } }
  onMounted(() => {
    presenterClock=setInterval(()=>{if(presenting.value)presentationSeconds.value=Math.floor((Date.now()-presentationStarted.value)/1000);},1000);
    fileBusy.value=true;fileStore.restore(projectId.value).then(()=>{fileName.value=fileStore.handle?.name||'';if(fileName.value)try{const disk=JSON.parse(fileStore.baseline);fileDirty.value=canonical({...disk,slides:normalizeSlides(disk.slides)})!==canonical({...snapshot(),slides:normalizeSlides(slides.value)});}catch{fileDirty.value=true;}}).finally(()=>fileBusy.value=false);window.addEventListener('pagehide',flushLocal);document.addEventListener('visibilitychange',visibilitySave);
    gridDraft.value = { ...current.value.grid }; updateThumbnails(); observeStage(); requestDraw(); window.addEventListener('frame-images-ready',imagesReady); window.addEventListener('copy',clipboardEvent);window.addEventListener('paste',clipboardEvent);window.addEventListener('keydown', keys);window.addEventListener('keydown',presentationShortcut,true);window.addEventListener('keyup',keyup);window.addEventListener('blur',resetKeys);window.addEventListener('pointerdown',contextOutside);window.addEventListener('pointerup',endHistoryGesture);window.addEventListener('pointercancel',endHistoryGesture); window.addEventListener('beforeunload', beforeUnload);
    if (document.modelContext?.registerTool) try { Promise.resolve(document.modelContext.registerTool({ name: 'read_frame_project', description: 'Read the current slide project and presentation state', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: input => { if (!input || typeof input !== 'object' || Object.keys(input).length) throw Error('Expected an empty object'); return { ...JSON.parse(JSON.stringify(snapshot())), index: index.value, step: step.value,editStep:editStep.value,activeState:activeState.value,presenter:presenter.diagnostics(), selected:selected.value, selectedKeys:selectedKeys.value,selectedSlides:selectedSlides.value,countdown:countdown.value,recording:recording.value, altHeld:altHeld.value, diagnostics: { ...metrics, trailPoints:trail.points.length, trailActive:trail.active } }; } }, { signal: modelController.signal })).catch(() => {}); } catch { /* Browser support is optional. */ }
  });
  onUnmounted(() => {cancelOverlayVideo();clearInterval(presenterClock);presenter.close(); if(!presenting.value)flushLocal();window.removeEventListener('pagehide',flushLocal);document.removeEventListener('visibilitychange',visibilitySave);modelController.abort(); clearTimeout(saveTimer); clearTimeout(thumbTimer); clearTimeout(toastTimer); clearInterval(timer);cancelCountdown(); cancelAnimationFrame(raf); observer?.disconnect(); worker?.terminate(); stream?.getTracks().forEach(t => t.stop()); if (lastExport.value) URL.revokeObjectURL(lastExport.value.url); window.removeEventListener('frame-images-ready',imagesReady); window.removeEventListener('copy',clipboardEvent);window.removeEventListener('paste',clipboardEvent);window.removeEventListener('keydown', keys);window.removeEventListener('keydown',presentationShortcut,true);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',resetKeys);window.removeEventListener('pointerdown',contextOutside);window.removeEventListener('pointerup',endHistoryGesture);window.removeEventListener('pointercancel',endHistoryGesture); window.removeEventListener('beforeunload', beforeUnload); });
  function commonCorner(key){return commonValue(selectedKeys.value.map(k=>normalizeShape(current.value.elements[k]).cornerRadii[key]));}
  function updateCorner(key,value){for(const k of selectedKeys.value){const e=current.value.elements[k];if(e?.type==='shape')e.cornerRadii={...normalizeShape(e).cornerRadii,[key]:value};}requestDraw();}
  function chooseOverlay(id){if(!overlayFormats.some(f=>f.id===id))return;closeEdit();banner.value=normalizeOverlay({type:id,slide:makeOverlay(id),clip:{...banner.value.clip,tracks:{}}});overlayGallery.value=false;deselect();selectionScope.value='elements';requestDraw();}
  const overlayGallery=ref(false);
  return { overlayVideoOpen,overlayVideoBusy,overlayVideoProgress,openOverlayVideo,exportOverlayVideo,cancelOverlayVideo,previewTable,commitTableTracks,commitTable,selectedOpacity,updateOpacity,presenter,startPresenter,presentationSeconds,nextPreviewUrl,sequence,stepLabel,jumpStep,baseSlide,editStep,activeState,selectPedagogicalStep,addPedagogical,movePedagogical,removePedagogical, notesVisible,scaleMode,scalePercent,applySelectionScale,...sharing,libraryComponents,renameComponent,shareComponent,exportComponents,importComponents,copyComponent,clipboardStatus,pasteFromSystem,commonCorner,updateCorner,overlayGallery,chooseOverlay,overlayFormats,projectColors,baseTheme,setProjectColor,selectTheme,setTextRole,textRole,snapGuides,updateAppearance,placementMargin,placeObjects,canPasteObjects,multiType,commonProperty,updateCommon,copySelection,pasteSelection,selectedName,commitText,setZoom,zoomWheel,setLayer,selectLayer,components,componentName,spacing,createComponent,useComponent,deleteComponent,arrangeObjects,centerObjects,undo,redo,canUndo,canRedo,dragImages,dropImages,fileName,fileDirty,fileBusy,fileSupported,openSupported,openProject,saveProject,selectionBounds,canUngroup,groupObjects,ungroupObjects,fitSelection, selectedTextStyle,updateTextStyle,refreshTextStyle, fontLoading,fontCss, rotationHandle,rotateDown,setRotation, shapeGallery,openShapes,addShape,moveLayer, routeMode,routeStart,routeBackup,setRouteMode,setRouteStart,traceRoute,connectSlides,undoRoute, palette,themeEditor,themeUndo,openTheme,saveTheme,deleteTheme,undoTheme,panels,displayMenu,resizePanel,selectedKeys,selectedSlides,selectionScope,selectSlide,deselect,countdown,previewVisible, selectedBounds, altHeld, contextMenu, codeCaption, handles, resizeDown, duplicateSelected, openContext, dismissContext, resolution, formatOpen, formatWidth, applyFormat, editSize, undoLayout, canUndoLayout, workspace, listDrag, listTarget, selectedType, editedText, exitLabel, changeText, addBlock, removeBlock, uploadImage, reorder, listDown, moveGrid, slides, project, themeId, frame, banner, index, view, tab, selected, presenting, canvas, stage, stageWidth, toast, saved, zoom, recording, elapsed, laser, laserSize, tool, lastExport, videoPreview, videoMeta, finalizing, gallery, editing, formatting, thumbs, step, transitionMs, moving, gridDraft, current, theme, position, orders, editStyle, notify, add, chooseLayout, addMemory, applyPreset, duplicate, remove, applyGrid, setPosition, updateFragment, formatCode, exportProject, importProject, png, startPresentation, exit, startRecord, stopRecord, navigate, advance, retreat, goDirection, canGo, chooseSlide, down, move, up, leave, doubleClick, closeEdit, editSelected, clearAnnotations };
}
