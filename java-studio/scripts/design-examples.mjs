// Regenerate committed previews and importable files against an isolated Frame server.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.FRAME_PLAYWRIGHT_MODULE || "playwright"),
  base = process.env.FRAME_TEST_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost):5289$/.test(base || ""))
  throw Error("Use an isolated server on port 5289, never the user workspace.");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.FRAME_CHROME || "/usr/bin/google-chrome",
});
try {
  const page = await browser.newPage();
  await page.goto(base);
  await mkdir(new URL("../public/examples/", import.meta.url), {
    recursive: true,
  });
  for (const [kind, name] of [
    ["vector", "atlas-jvm"],
    ["layout", "memoire-java"],
  ]) {
    const result = await page.evaluate(async (kind) => {
      await import("/src/fontAssets.js");
      const { advancedDesign } = await import("/src/designExamples.js"),
        { exportDesignSvg, embedDesignFonts, loadDesignFonts } =
          await import("/src/designExport.js");
      const doc = advancedDesign(kind);
      await loadDesignFonts(doc.pages[0].elements);
      return {
        svg: await embedDesignFonts(
          exportDesignSvg(doc),
          doc.pages[0].elements,
        ),
        json: JSON.stringify(doc, null, 2) + "\n",
      };
    }, kind);
    await writeFile(
      new URL("../public/examples/" + name + ".svg", import.meta.url),
      result.svg,
    );
    await writeFile(
      new URL("../public/examples/" + name + ".frame.json", import.meta.url),
      result.json,
    );
  }
  console.log("Generated previews and native Frame example projects.");
} finally {
  await browser.close();
}
