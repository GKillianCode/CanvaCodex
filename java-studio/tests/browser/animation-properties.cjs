const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  assert = require("node:assert/strict");
const base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Isolated server required");
(async () => {
  let b = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    let p = await b.newPage({ viewport: { width: 1500, height: 850 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "/");
    await p.evaluate(async () => {
      const { createApp, h, ref, nextTick } =
          await import("/node_modules/.vite/deps/vue.js"),
        { default: Studio } = await import("/src/StudioApp.vue"),
        { makeAnimationExample } = await import("/src/animationExamples.js");
      let node = document.createElement("div");
      node.id = "qa-full";
      node.style = "position:fixed;inset:0;z-index:9999";
      document.body.append(node);
      let app = createApp({
        setup() {
          let studio = ref(null);
          window.getLive = () => studio.value?.getStudio();
          return () =>
            h(Studio, {
              application: "animation",
              initialView: "slides",
              ref: studio,
            });
        },
      });
      app.mount(node);
      await nextTick();
      const s = window.getLive();
      s.slides.value = [makeAnimationExample("gc")];
      s.index.value = 0;
      s.workspace.value = "editor";
      await nextTick();
      s.selected.value = "shapeObject";
      s.selectedKeys.value = ["shapeObject"];
      s.selectionScope.value = "elements";
    });
    const root = p.locator("#qa-full");
    await root.getByRole("button", { name: "Placement", exact: true }).click();
    await root.getByText("Mise à l’échelle", { exact: true }).click();
    await root
      .getByLabel("Échelle de la sélection · valeur", { exact: true })
      .fill("150");
    await root.getByLabel("Clé · scale", { exact: true }).click();
    await root.getByLabel("Clé · scale", { exact: true }).click();
    let scale = await p.evaluate(() => {
      let s = getLive();
      return {
        value: s.animation.propertyValue("scale"),
        keys: s.animation.clip.value.frames.filter((f) => f.field === "scale")
          .length,
        popup: !!s.animation.activeKey.value,
      };
    });
    assert.deepEqual(scale, { value: 150, keys: 1, popup: false });
    assert.equal(
      await root.getByText("Appliquer l’échelle", { exact: true }).count(),
      0,
    );
    assert.equal(
      await root
        .getByText("Poignées proportionnelles", { exact: true })
        .count(),
      0,
    );
    await root
      .getByRole("button", { name: "Animation · propriétés", exact: true })
      .click();
    await root.getByText("Caméra", { exact: true }).click();
    await root
      .getByLabel("Zoom de la caméra · valeur", { exact: true })
      .fill("100");
    await root.getByLabel("Clé · cameraZoom", { exact: true }).click();
    await p.evaluate(() => getLive().animation.seek(1));
    await root
      .getByLabel("Zoom de la caméra · valeur", { exact: true })
      .fill("150");
    await root.getByLabel("Clé · cameraZoom", { exact: true }).click();
    const result = await p.evaluate(() => {
      const s = getLive(),
        panel = document.querySelector("#qa-full .inspector-body"),
        aside = document.querySelector("#qa-full .inspector"),
        line = document.querySelector("#qa-full .animation-timeline");
      return {
        zoom: s.animation.propertyValue("cameraZoom"),
        keys: s.animation.clip.value.frames.filter(
          (f) => f.field === "cameraZoom",
        ).length,
        body: panel.getBoundingClientRect().bottom,
        timeline: line.getBoundingClientRect().top,
        overflow: getComputedStyle(panel).overflowY,
        hidden: !!s.animation.activeKey.value,
      };
    });
    assert.equal(result.zoom, 150);
    assert.equal(result.keys, 2);
    assert.equal(result.hidden, false);
    assert.ok(result.body <= result.timeline + 1);
    assert.equal(result.overflow, "auto");
    await p.evaluate(() => {
      const a = getLive().animation;
      a.selectKey(a.clip.value, a.clip.value.frames[0]);
    });
    const details = root.locator('[data-drawer="animation-key-details"]');
    await details.waitFor();
    assert.equal(await details.getAttribute("open"), null);
    await details.locator("summary").click();
    assert.ok((await details.getAttribute("open")) !== null);
    await details.locator("summary").click();
    assert.equal(await details.getAttribute("open"), null);
    assert.deepEqual(errors, []);
    await p.screenshot({ path: "/tmp/frame-scale-camera-ui.png" });
    console.log(
      "OK full editor scale, idempotent diamonds, camera keys and bounded scroll",
      result,
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
