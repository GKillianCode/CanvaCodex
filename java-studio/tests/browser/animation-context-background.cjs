const { chromium } = require(
  process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
);
const assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(async () => {
      const { createApp, h, ref, nextTick } =
        await import("/node_modules/.vite/deps/vue.js");
      const { default: Studio } = await import("/src/StudioApp.vue");
      const host = document.createElement("div");
      host.style = "position:fixed;inset:0;z-index:2000";
      document.body.append(host);
      const v = ref(null);
      createApp({
        render: () =>
          h(Studio, {
            ref: v,
            application: "animation",
            initialView: "slides",
          }),
      }).mount(host);
      await nextTick();
      window.live = () => v.value.getStudio();
      window.tick = nextTick;
      const s = live();
      s.workspace.value = "editor";
      await tick();
      const { makeSlide } = await import("/src/model.js");
      const { normalizeAnimation } = await import("/src/animationModel.js");
      const { normalizeShape } = await import("/src/shapes.js");
      const scene = makeSlide("title");
      Object.assign(scene, {
        elements: { shape: normalizeShape({ shape: "circle" }) },
        positions: { shape: { x: 100, y: 100, w: 200, h: 200 } },
        fragments: { shape: { order: 0, animation: "none" } },
        blockKeys: ["shape"],
        animation: normalizeAnimation({
          duration: 8,
          fps: 30,
          background: "gradient",
          color: "#224466",
          colorRole: "accent",
          color2: "#667788",
          gradientAngle: 45,
          clips: [
            {
              id: "movement",
              keys: ["shape"],
              start: 1,
              duration: 6,
              frames: [
                { field: "x", time: 1, value: 100 },
                { field: "x", time: 3, value: 500 },
                { field: "y", time: 1, value: 100 },
              ],
            },
          ],
        }),
      });
      s.slides.value = [scene];
      s.index.value = 0;
      await tick();
      s.animation.selectedClip.value = "movement";
    });

    page.setDefaultTimeout(8000);
    await page.evaluate(async()=>{
      const s=live(),{normalizeAnimation}=await import('/src/animationModel.js');
      s.current.value.elements.other={type:'text',text:'Groupe',name:'Texte'};
      s.current.value.positions.shape={x:100,y:100,w:100,h:100};
      s.current.value.positions.other={x:500,y:100,w:100,h:100,size:30,autoSize:false};
      s.current.value.fragments.other={order:0,animation:'none'};s.current.value.blockKeys.push('other');
      s.current.value.animation=normalizeAnimation({duration:20,presences:{shape:{start:3,end:5},other:{start:10,end:12}},clips:[{id:'movement',keys:['shape'],start:1,duration:19,frames:[{field:'x',time:1,value:100},{field:'x',time:3,value:400}]}]});
      for(let n=0;n<40;n++){const key='future'+n;s.current.value.elements[key]={...s.current.value.elements.shape,name:'Plus tard '+n};s.current.value.positions[key]={x:900+n*5,y:700,w:10,h:10};s.current.value.fragments[key]={order:0,animation:'none'};s.current.value.blockKeys.push(key);s.current.value.animation.presences[key]={start:18,end:19};}
      await tick();s.animation.seek(0);s.animation.selectedClip.value='movement';
    });
    const owner=page.locator('.animation-object-track[data-object="shape"]');
    assert.equal(await page.locator('.animation-object-track').count(),0);
    for(const [t,visible] of [[1,true],[7,true],[7+1/30,false],[2,true]]) {
      await page.evaluate(t=>live().animation.seek(t),t);
      assert.equal(await owner.count(),visible?1:0);
    }
    await page.evaluate(()=>live().animation.seek(8));
    assert.equal(await page.locator('.animation-object-track[data-object="other"]').count(),1);
    await page.getByLabel('Pistes autour du curseur',{exact:true}).uncheck();
    assert.equal(await page.locator('.animation-object-track').count(),42);
    assert.equal(await page.evaluate(()=>localStorage.getItem('frame-animation-near-playhead')),'false');
    await page.evaluate(()=>live().animation.seek(4));
    assert.equal(await page.locator('.animation-sequence-track .presence-aligned-sequence').count(),0,'No duplicate object sequence bar');
    const ownerToggle=owner.locator('button[aria-expanded]');
    if(await ownerToggle.getAttribute('aria-expanded')!=='true')await ownerToggle.click();
    assert(await page.locator('.direct-object-property').count()>0,'Properties are directly beneath the owner');
    const original=await page.evaluate(()=>JSON.stringify(live().animation.config.value.clips));
    // A presence dragged outside the temporal window stays mounted until pointer release.
    await page.getByLabel('Pistes autour du curseur',{exact:true}).check();
    await page.evaluate(()=>live().animation.seek(1));
    const presence=await owner.locator('.presence-span').boundingBox(),lane=await owner.locator('.track-lane').boundingBox();
    await page.mouse.move(presence.x+presence.width/2,presence.y+presence.height/2);await page.mouse.down();
    await page.mouse.move(presence.x+presence.width/2+lane.width/4,presence.y+presence.height/2,{steps:5});
    assert.equal(await owner.count(),1);await page.mouse.up();assert.equal(await owner.count(),0);
    await page.evaluate(()=>live().undo());
    assert.equal(await page.evaluate(()=>JSON.stringify(live().animation.config.value.clips)),original);
    await page.getByLabel('Pistes autour du curseur',{exact:true}).uncheck();
    // Animate all shared background controls in the actual inspector.
    await page.evaluate(()=>live().animation.seek(0));
    await page.getByRole('button',{name:'Scène · propriétés',exact:true}).click();
    await page.locator('[data-drawer="scene-background"] > summary').click();
    await page.getByLabel('Type de fond',{exact:true}).selectOption('dots');
    for(const [label,value] of [['Couleur du fond hexadécimale','#000000'],['Couleur du motif hexadécimale','#ff0000'],['Opacité du motif · valeur','20'],['Taille du motif · valeur','4'],['Espacement du motif · valeur','32']]) await page.getByLabel(label,{exact:true}).fill(value);
    await page.evaluate(()=>live().animation.seek(4));
    await page.getByLabel('Type de fond',{exact:true}).selectOption('hexagons');
    for(const [label,value] of [['Couleur du fond hexadécimale','#ffffff'],['Couleur du motif hexadécimale','#0000ff'],['Opacité du motif · valeur','80'],['Taille du motif · valeur','12'],['Espacement du motif · valeur','64'],['Épaisseur du motif · valeur','3'],['Rotation du fond · valeur','90'],['Décalage horizontal · valeur','80'],['Décalage vertical · valeur','40']])await page.getByLabel(label,{exact:true}).fill(value);
    await page.getByRole('checkbox',{name:/Disposition en quinconce/}).check();
    for(const field of ['patternMode','patternBase','patternColor','patternOpacity','patternSize','patternSpacing','patternThickness','patternRotation','patternOffsetX','patternOffsetY','patternStagger'])assert.equal(await page.getByLabel('Clé · '+field,{exact:true}).count(),1);
    const state=await page.evaluate(async()=>{
      const s=live(),{animationScene}=await import('/src/animationModel.js'),{renderAnimation}=await import('/src/animationRender.js');
      const v=animationScene(s.current.value,s.animation.config.value,2),c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');
      renderAnimation(ctx,s.current.value,s.theme.value,s.animation.config.value,2);
      return {b:v.scene.background,blend:v.scene.backgroundBlend,pixel:[...ctx.getImageData(1,1,1,1).data]};
    });
    assert.equal(state.b.base,'#808080');assert.equal(state.b.color,'#800080');assert.equal(state.b.opacity,50);
    assert.equal(state.b.size,8);assert.equal(state.b.spacing,48);assert.equal(state.b.thickness,2);assert.equal(state.b.rotation,45);assert.equal(state.b.offsetX,40);assert.equal(state.b.offsetY,20);
    assert.equal(state.blend.background.mode,'hexagons');assert.equal(state.blend.progress,.5);
    assert(state.pixel.slice(0,3).every(v=>Math.abs(v-128)<=1));assert.equal(state.pixel[3],255);
    await page.evaluate(()=>live().undo());
    assert.equal(await page.evaluate(()=>live().animation.config.value.clips.some(c=>c.frames.some(f=>f.field==='patternStagger'))),false);
    await page.evaluate(()=>live().redo());
    await page.getByRole('button',{name:'Scène · propriétés',exact:true}).click();
    if(!await page.locator('[data-drawer="scene-background"]').evaluate(el=>el.open))await page.locator('[data-drawer="scene-background"] > summary').click();
    const beforePreset=await page.evaluate(()=>JSON.stringify(live().current.value));
    await page.getByRole('button',{name:'Papier à points',exact:true}).click();
    await page.evaluate(()=>live().undo());
    assert.equal(await page.evaluate(()=>JSON.stringify(live().current.value)),beforePreset,'A background preset must be one undoable operation');
    await page.evaluate(()=>live().animation.seek(2));
    await page.screenshot({path:'/tmp/frame-pattern-keys-dark.png'});
    await page.evaluate(()=>document.documentElement.dataset.appearance='light');
    await page.screenshot({path:'/tmp/frame-pattern-keys-light.png'});
    // The shared transformation inspector and movement library accept a mixed group.
    await page.evaluate(async()=>{
      const s=live();s.animation.seek(0);s.animation.config.value.clips=s.animation.config.value.clips.filter(c=>!c.keys.length);
      s.selected.value=null;s.selectedKeys.value=['shape','other'];s.groupObjects();await tick();
    });
    await page.getByRole('button',{name:'Placement',exact:true}).click();
    await page.locator('[data-drawer="selection-frame"] > summary').click();
    assert.equal(await page.getByLabel('Position X du groupe',{exact:true}).isEnabled(),true);
    await page.getByLabel('Clé · x',{exact:true}).first().click();
    await page.getByLabel('Clé · w',{exact:true}).first().click();
    await page.evaluate(()=>live().animation.seek(4));
    await page.getByLabel('Largeur du groupe',{exact:true}).fill('1000');await page.getByLabel('Largeur du groupe',{exact:true}).press('Tab');
    await page.getByLabel('Position X du groupe',{exact:true}).fill('300');await page.getByLabel('Position X du groupe',{exact:true}).press('Tab');
    const groupState=await page.evaluate(async()=>{
      const s=live(),{animationScene}=await import('/src/animationModel.js');
      const p=animationScene(s.current.value,s.animation.config.value,2).scene.positions;
      return {x:p.shape.x,w:p.other.x+p.other.w-p.shape.x,childWidth:p.shape.w,clips:s.animation.config.value.clips.filter(c=>c.keys.length).map(c=>({keys:c.keys,group:c.groupTransform}))};
    });
    assert.equal(groupState.x,200);assert.equal(groupState.w,750);assert.equal(groupState.childWidth,150);
    assert.deepEqual(groupState.clips,[{keys:['shape','other'],group:true}]);
    await page.getByRole('button',{name:'Animation · propriétés',exact:true}).click();
    await page.locator('[data-drawer="workflow-presets"] > summary').click();
    assert.equal(await page.getByRole('button',{name:'Appliquer à la sélection',exact:true}).isEnabled(),true);
    assert.equal(await page.getByRole('button',{name:'Enregistrer la séquence sélectionnée',exact:true}).isEnabled(),true);
    await page.getByRole('button',{name:'Appliquer à la sélection',exact:true}).click();
    assert.equal(await page.evaluate(()=>live().animation.clip.value.keys.length),2);
    const legacyResult=await page.evaluate(async()=>{
      const s=live(),a=s.animation;
      const {normalizeAnimation}=await import('/src/animationModel.js');
      const old=normalizeAnimation({clips:[{id:'legacy-group',keys:['shape','other'],duration:4,frames:[{field:'x',time:0,value:100,ease:'linear'},{field:'x',time:4,value:300}]}]}).clips[0];
      a.config.value.clips=[old];a.selectClip(old.id);a.seek(2);
      const keys=JSON.stringify(old.frames),before=a.evaluate().scene.positions;
      a.recordProperty('x');await tick();
      const after=a.evaluate().scene.positions;
      return {unchanged:keys===JSON.stringify(a.config.value.clips[0].frames),start:a.clip.value.start,group:a.clip.value.groupTransform,
        before:[before.shape.x,before.other.x],after:[after.shape.x,after.other.x]};
    });
    assert.equal(legacyResult.unchanged,true);assert.equal(legacyResult.start,2);assert.equal(legacyResult.group,true);
    assert.deepEqual(legacyResult.after,legacyResult.before);
    await page.getByLabel('Pistes autour du curseur',{exact:true}).check();
    await page.evaluate(()=>live().animation.seek(10));
    assert.equal(await page.locator('.animation-object-track[data-object="shape"]').count(),1,'Shared tracks remain available while any of their objects is nearby');
    assert.deepEqual(errors,[]);
    console.log('Context timeline ±2s, one owner bar with direct properties, drag pin, pattern keyframes/crossfade/pixels/undo and mixed group controls/presets passed');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
