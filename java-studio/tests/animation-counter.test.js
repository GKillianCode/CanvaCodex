import test from "node:test";
import assert from "node:assert/strict";
import { counterText, counterScroll, counterTiming, normalizeCounter } from "../src/animationCounter.js";
import { animationScene, normalizeAnimation } from "../src/animationModel.js";
const scene = {
  id: "counter-test",
  blockKeys: ["textCount"],
  positions: {
    textCount: {
      x: 100,
      y: 100,
      w: 500,
      h: 120,
      size: 96,
      font: "jetbrains-mono",
    },
  },
  elements: { textCount: { type: "text", custom: true, text: "000" } },
  fragments: { textCount: { order: 0, animation: "none" } },
};
test("numeric counters retain character count, automatic leading zeros, decimals and custom separators", () => {
  assert.equal(counterText({ from: 0, to: 100 }, 0), "000");
  assert.equal(counterText({ from: 0, to: 100 }, 9), "009");
  assert.equal(counterText({ from: 0, to: 1000000 }, 0), "0000000");
  assert.equal(counterText({ from: 0, to: 1000 }, 1000), "1000");
  assert.equal(counterText({ from: 0, to: 1000, pad: false }, 2), "2");
  assert.equal(
    counterText(
      {
        from: 0,
        to: 1000,
        grouping: true,
        separator: " ",
        prefix: "Total : ",
        suffix: " pts",
      },
      12,
    ),
    "Total : 0 012 pts",
  );
  assert.equal(
    counterText(
      { from: 0, to: 100, decimals: 2, decimalSeparator: "," },
      9.256,
    ),
    "009,26",
  );
});
test("clock counters carry at sixty seconds/minutes and format custom separators", () => {
  const config = { mode: "time", from: 0, to: 4000 };
  assert.equal(counterText(config, 59), "00:00:59");
  assert.equal(counterText(config, 60), "00:01:00");
  assert.equal(counterText(config, 3599), "00:59:59");
  assert.equal(counterText(config, 3600), "01:00:00");
  assert.equal(counterText({ ...config, separator: "." }, 3661), "01.01.01");
  assert.equal(
    counterText({ ...config, separator: ",", format: "ms" }, 61),
    "01,01",
  );
});
test("counter interpolation shares the clip evaluator but is independent of clips and begins with presence", () => {
  const cfg = normalizeAnimation({
    duration: 20,
    presences: { textCount: { start: 5, end: 18 } },
    counters: { textCount: { from: 0, to: 100, duration: 10 } },
  });
  for (const [time, text] of [
    [0, "000"],
    [5, "000"],
    [10, "038"],
    [15, "077"],
    [17, "092"],
    [18-1/30, "100"],
  ])
    assert.equal(
      animationScene(scene, cfg, time).scene.elements.textCount.text,
      text,
    );
  assert.equal(scene.elements.textCount.text, "000");
  assert.equal(cfg.clips.length, 0);
  assert.equal(
    animationScene(scene, cfg, 18).presence.textCount.visible,
    false,
  );
  const restored = normalizeAnimation(JSON.parse(JSON.stringify(cfg)));
  assert.deepEqual(restored.counters, cfg.counters);
  assert.equal(
    animationScene(scene, restored, 10).scene.elements.textCount.text,
    "038",
  );
});
test("countdown and progressive rates are deterministic under seeking", () => {
  const cfg = normalizeAnimation({
    duration: 10,
    counters: { textCount: { from: 100, to: 0, duration: 10 } },
  });
  assert.equal(
    animationScene(scene, cfg, 0).scene.elements.textCount.text,
    "100",
  );
  assert.equal(
    animationScene(scene, cfg, 5).scene.elements.textCount.text,
    "050",
  );
  assert.equal(
    animationScene(scene, cfg, 10).scene.elements.textCount.text,
    "000",
  );
  cfg.counters.textCount.easing = "easeIn";
  assert(
    Number(animationScene(scene, cfg, 5).scene.elements.textCount.text) > 50,
  );
  const first = animationScene(scene, cfg, 3);
  animationScene(scene, cfg, 8);
  assert.deepEqual(animationScene(scene, cfg, 3), first);
  assert.equal('duration' in normalizeCounter({duration:100}),false);
});

test('scroll counters evaluate adjacent full values in all directions without enumerating the range', () => {
  for(const direction of ['up','down','left','right']) {
    const c={display:'scroll',direction,from:2026,to:2022,duration:4};
    assert.deepEqual(counterScroll(c,2025.5),{current:'2026',next:'2025',progress:.5,direction});
    assert.equal(counterScroll(c,2022).progress,0);
    assert.equal(counterScroll(c,2022).current,'2022');
    const increasing=counterScroll({...c,from:2022,to:2026},2022.25);
    assert.equal(increasing.current,'2022');assert.equal(increasing.next,'2023');
    assert.equal(increasing.progress,.25);
  }
  assert.equal(counterScroll({from:0,to:100},1),null);
  assert.equal(counterScroll({display:'scroll',from:5,to:5},5),null);
  assert.equal(counterScroll({display:'scroll',from:0,to:1e12},1000000.5).current,'0000001000000');
  const clock=counterScroll({display:'scroll',mode:'time',from:61,to:59},60.5);
  assert.equal(clock.current,'00:01:01');assert.equal(clock.next,'00:01:00');
  const decimal=counterScroll({display:'scroll',from:0,to:1,decimals:1},.15);
  assert.equal(decimal.current,'0.1');assert.equal(decimal.next,'0.2');
  assert(Math.abs(decimal.progress-.5)<1e-6);
});
test('scroll state uses presence and rate interpolation and survives JSON normalization',()=>{
  const cfg=normalizeAnimation({duration:10,presences:{textCount:{start:2,end:6+1/30}},counters:{textCount:{display:'scroll',direction:'right',from:2026,to:2022,duration:4}}});
  const sample=t=>animationScene(scene,cfg,t).scene.counterFrames.textCount;
  assert.equal(sample(2).current,'2026');assert.equal(sample(2).progress,0);
  assert.equal(sample(2.5).next,'2025');assert.equal(sample(2.5).progress,.5);
  assert.equal(sample(6).current,'2022');assert.equal(sample(6).progress,0);
  assert.deepEqual(normalizeAnimation(JSON.parse(JSON.stringify(cfg))).counters,cfg.counters);
  const first=sample(3.5);sample(8);assert.deepEqual(sample(3.5),first);
  assert.equal(scene.counterFrames,undefined);
});

test('every counter rhythm reaches both bounds on the visible frame interval',()=>{
  for(const fps of [24,30,60]) for(const easing of ['linear','smooth','easeIn','easeOut'])
    for(const mode of ['number','time']) for(const display of ['replace','scroll']) for(const [from,to] of [[0,100],[2026,1900]]) {
      const cfg=normalizeAnimation({duration:20,fps,presences:{textCount:{start:5,end:10}},
        counters:{textCount:{from,to,mode,display,easing,duration:120}}});
      const sample=t=>animationScene(scene,cfg,t);
      assert.equal(sample(5).scene.elements.textCount.text,counterText(cfg.counters.textCount,from));
      const last=sample(10-1/fps);
      assert.equal(last.presence.textCount.visible,true);
      assert.equal(last.scene.elements.textCount.text,counterText(cfg.counters.textCount,to));
      if(display==='scroll')assert.equal(last.scene.counterFrames.textCount.progress,0);
      assert.equal(sample(10).presence.textCount.visible,false);
      const mid=Number(mode==='number'?sample(7).scene.elements.textCount.text:from);
      if(mode==='number')assert(mid>Math.min(from,to)&&mid<Math.max(from,to));
      cfg.presences.textCount.end=15;
      assert.equal(sample(15-1/fps).scene.elements.textCount.text,counterText(cfg.counters.textCount,to));
      cfg.presences.textCount.end=null;
      assert.equal(sample(20-1/fps).scene.elements.textCount.text,counterText(cfg.counters.textCount,to));
    }
});
test('counter timing handles fractional boundaries, a single visible frame and long spans',()=>{
  const t=counterTiming({start:2,end:7.15},10,30);
  assert(Math.abs(t.finish-214/30)<1e-9);
  assert.equal(counterTiming({start:0},10800,30).finish,10800-1/30);
  const cfg=normalizeAnimation({duration:10,fps:30,presences:{textCount:{start:5,end:5+1/30}},counters:{textCount:{to:999,easing:'easeIn'}}});
  assert.equal(animationScene(scene,cfg,5).scene.elements.textCount.text,'999');
  assert.equal(animationScene(scene,cfg,5).presence.textCount.visible,true);
});

test('counters reach their target before the final hold and exit for every rhythm and display',()=>{
  for(const fps of [24,30,60]) for(const easing of ['linear','smooth','easeIn','easeOut'])
    for(const display of ['replace','scroll']) for(const mode of ['number','time']) for(const [from,to] of [[0,38000],[38000,0]]) {
      const cfg=normalizeAnimation({duration:20,fps,presences:{textCount:{start:5,end:15,exit:'fade',exitDuration:1,holdDuration:2}},
        counters:{textCount:{from,to,easing,display,mode}}});
      const timing=counterTiming(cfg.presences.textCount,20,fps);
      assert.equal(timing.finish,12);assert.equal(timing.duration,7);
      for(const t of [12,13,14,14.5,15-1/fps]){
        const state=animationScene(scene,cfg,t);
        assert.equal(state.scene.elements.textCount.text,counterText(cfg.counters.textCount,to));
        assert.equal(state.presence.textCount.visible,true);
        if(t<=14)assert.equal(state.presence.textCount.alpha,1);
        if(display==='scroll')assert.equal(state.scene.counterFrames.textCount.progress,0);
      }
      assert.equal(animationScene(scene,cfg,15).presence.textCount.visible,false);
      cfg.presences.textCount.holdDuration=0;
      assert.equal(counterTiming(cfg.presences.textCount,20,fps).finish,14,
        'Even without a hold, the target must be reached before exit');
      cfg.presences.textCount.end=null;
      assert.equal(counterTiming(cfg.presences.textCount,20,fps).finish,19);
    }
});
