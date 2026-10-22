const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await browser.newPage({
        viewport: { width: 1500, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/");
    await p.evaluate(async () => {
      const { createApp, h, ref, watch, reactive } =
          await import("/node_modules/.vite/deps/vue.js"),
        { useAnimationStudio } = await import("/src/useAnimationStudio.js"),
        { normalizeAnimation, animationScene } =
          await import("/src/animationModel.js"),
        { drawAnimationDiagnostics } =
          await import("/src/animationDiagnostics.js"),
        { makeSlide, themes } = await import("/src/model.js"),
        { default: Workbench } =
          await import("/src/components/AnimationWorkbench.vue");
      const node = document.createElement("div");
      node.style =
        "position:fixed;inset:0;z-index:99999;display:grid;grid-template-columns:1fr 340px;background:#15191e;color:white";
      document.body.append(node);
      const scene = makeSlide("title");
      scene.blockKeys = [];
      scene.elements = {};
      scene.positions = {};
      scene.fragments = {};
      scene.animation = normalizeAnimation({
        duration: 4,
        background: "color",
        color: "#ffffff",
      });
      window.cameraScene = scene;
      const canvas = document.createElement("canvas");
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.style = "width:100%;margin-top:80px";
      let a;
      const draw = () => {
        if (!a) return;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 1920, 1080);
        drawAnimationDiagnostics(
          ctx,
          animationScene(scene, scene.animation, a.time.value),
          a.diagnostics.value,
        );
      };
      const s = {
        current: ref(scene),
        selected: ref(""),
        selectedKeys: ref([]),
        slides: ref([scene]),
        index: ref(0),
        theme: ref(themes[0]),
        requestDraw: draw,
        beginGesture() {},
        endGesture() {},
        notify() {},
      };
      createApp({
        setup() {
          a = useAnimationStudio(s);
          s.animation = a;
          window.cameraTest = a;
          window.cameraDraw = draw;
          return () =>
            h("div", { style: "display:contents" }, [
              h("main", {
                ref: (el) => {
                  if (el && !el.contains(canvas)) el.append(canvas);
                },
              }),
              h(
                "aside",
                {
                  class: "inspector slim-inspector",
                  style: "width:340px;padding:20px;overflow:auto",
                },
                [h(Workbench, { studio: s })],
              ),
            ]);
        },
      }).mount(node);
      draw();
    });
    await p.getByText("Caméra", { exact: true }).click();
    await p
      .getByRole("button", { name: "Début de scène", exact: true })
      .click();
    await p
      .getByLabel("Zoom de la caméra · valeur", { exact: true })
      .fill("150");
    await p
      .getByLabel("Zoom de la caméra · valeur", { exact: true })
      .dispatchEvent("change");
    await p.getByRole("button", { name: "Fin de scène", exact: true }).click();
    await p
      .getByRole("button", { name: "100 % à cet instant", exact: true })
      .click();
    const result = await p.evaluate(async () => {
      const { animationScene } = await import("/src/animationModel.js");
      const { renderAnimation } = await import("/src/animationRender.js");
      const { themes } = await import("/src/model.js");
      const a = window.cameraTest,
        scene = window.cameraScene;
      let values = [0, 2, 4].map(
        (t) => animationScene(scene, scene.animation, t).config.camera.zoom,
      );
      a.seek(0);
      await new Promise((r) => setTimeout(r, 30));
      const c = document.querySelector('canvas[width="1920"]'),
        ctx = c.getContext("2d"),
        outside = Array.from(ctx.getImageData(20, 100, 1, 1).data),
        inside = Array.from(ctx.getImageData(960, 700, 1, 1).data);
      const output = document.createElement("canvas");
      output.width = 1920;
      output.height = 1080;
      const out = output.getContext("2d");
      out.fillStyle = "#fff";
      out.fillRect(0, 0, 1920, 1080);
      renderAnimation(out, scene, themes[0], scene.animation, 0);
      const exported = Array.from(out.getImageData(20, 100, 1, 1).data);
      return {
        exported,
        values,
        camera: a.diagnostics.value.camera,
        construction: a.construction.value,
        frames: JSON.parse(JSON.stringify(scene.animation.clips)),
        outside,
        inside,
      };
    });
    assert.deepEqual(result.values, [150, 125, 100]);
    assert.deepEqual(result.exported, [255, 255, 255, 255]);
    assert.ok(result.camera && result.construction);
    assert.ok(result.outside[0] < 230 && result.inside[0] === 255);
    await p.screenshot({ path: "/tmp/frame-camera-construction.png" });
    assert.deepEqual(errors, []);
    console.log(
      "OK camera 150 -> 125 -> 100 and live construction matte",
      result.values,
      result.outside,
      result.inside,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
