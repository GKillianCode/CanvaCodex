import { writeFile } from "node:fs/promises";
import { makeSlimeDemo } from "../src/animationSlimeDemo.js";
await writeFile(
  new URL("../../animation-slime-trois-scenes.json", import.meta.url),
  JSON.stringify(makeSlimeDemo(), null, 2) + "\n",
);
console.log("animation-slime-trois-scenes.json créé à la racine du dépôt.");
