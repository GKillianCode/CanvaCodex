const { chromium } = require(
    process.env.FRAME_PLAYWRIGHT_MODULE || "playwright",
  ),
  fs = require("fs"),
  assert = require("node:assert/strict");
const url = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(url || ""))
  throw Error("Isolated server required");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
  });
  try {
    const p = await b.newPage();
    await p.goto(url + "/");
    const result = await p.evaluate(
      async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
          {
            importVideoFile,
            seekVideos,
            portableVideoProject,
            restoreVideoProject,
            videoAsset,
          } = await import("/src/videoMedia.js"),
          { makeSlide, normalizeSlide, themes } = await import("/src/model.js"),
          { prepareImages, renderSlide } = await import("/src/render.js");
        const src = await importVideoFile(
          new File([bytes], "sample.mp4", { type: "video/mp4" }),
        );
        let s = makeSlide();
        s.elements.imageVideo = {
          type: "image",
          mediaKind: "video",
          src,
          autoplay: true,
          fit: "cover",
          roundedCorners: true,
          cornerRadius: 20,
          background: true,
        };
        s.positions.imageVideo = { x: 0, y: 0, w: 1920, h: 1080, size: 30 };
        s.fragments.imageVideo = { order: 0, animation: "none" };
        s.blockKeys.push("imageVideo");
        s = normalizeSlide(s);
        await prepareImages([s], themes[0]);
        const c = document.createElement("canvas");
        c.width = 320;
        c.height = 180;
        const ctx = c.getContext("2d");
        ctx.scale(1 / 6, 1 / 6);
        await seekVideos([s], 0);
        renderSlide(ctx, s, themes[0], { videoTime: 0 });
        const first = c.toDataURL();
        await seekVideos([s], 1);
        renderSlide(ctx, s, themes[0], { videoTime: 1 });
        const second = c.toDataURL();
        const { exportAnimationFrames } =
          await import("/src/animationVideoExport.js");
        const movie = await exportAnimationFrames({
          canvas: c,
          draw: async (time) => {
            await seekVideos([s], time);
            renderSlide(ctx, s, themes[0], { videoTime: time });
          },
          duration: 0.5,
          fps: 10,
          format: "mp4",
        });
        if (movie.size < 1000) throw Error("Empty movie export");
        const portable = await portableVideoProject({ slides: [s] });
        await restoreVideoProject(portable);
        return {
          different: first !== second,
          ready: videoAsset(s.id, "imageVideo", src).ready,
          ref: s.elements.imageVideo.src,
          media: !!portable.videoMedia[src],
          auto: s.elements.imageVideo.autoplay,
        };
      },
      fs
        .readFileSync(
          process.env.FRAME_TEST_VIDEO_FILE || "/tmp/frame-video-sample.mp4",
        )
        .toString("base64"),
    );
    assert.equal(result.different, true);
    assert.equal(result.ready, true);
    assert.equal(result.media, true);
    console.log("OK video frames and portable storage", result);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
