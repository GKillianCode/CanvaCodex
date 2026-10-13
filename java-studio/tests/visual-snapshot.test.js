import test from "node:test";
import assert from "node:assert/strict";
import { reactive, watch, nextTick } from "vue";
import { visualSnapshot } from "../src/visualSnapshot.js";
test("private notes do not invalidate render dependencies while visual edits still do", async () => {
  const scene = reactive({
    title: "Titre",
    notes: "Initial",
    pedagogicalSteps: [{ scene: { title: "Étape", notes: "Notes" } }],
  });
  let renders = 0;
  const stop = watch(
    () => visualSnapshot(scene),
    () => renders++,
  );
  scene.notes = "Modification";
  scene.pedagogicalSteps[0].scene.notes = "Autres notes";
  await nextTick();
  assert.equal(renders, 0);
  scene.pedagogicalSteps[0].scene.title = "Titre modifié";
  await nextTick();
  assert.equal(renders, 1);
  assert.equal(scene.notes, "Modification");
  assert.equal(visualSnapshot(scene).notes, undefined);
  stop();
});

test("an object named notes retains its geometry as a visual dependency", async () => {
  const scene = reactive({
    title: "Diapo",
    notes: "Privées",
    positions: { title: { x: 0 }, notes: { x: 100 } },
  });
  let renders = 0;
  const stop = watch(
    () => visualSnapshot(scene),
    () => renders++,
  );
  scene.positions.notes.x = 200;
  await nextTick();
  assert.equal(renders, 1);
  assert.equal(visualSnapshot(scene).positions.notes.x, 200);
  stop();
});
