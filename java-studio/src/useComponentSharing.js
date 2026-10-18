import { ComponentLibraryFile } from "./componentLibraryFile.js";
import { ref, computed, onMounted } from "vue";
import {
  localAssets,
  ensureAssets,
  refreshAssets,
  updateAssets,
} from "./localAssets.js";
import { appendComponents, parseLibrary } from "./frameTransfer.js";
export function useComponentSharing(notify) {
  const libraryScope = ref("shared"),
    sharedComponents = computed(() => localAssets.components),
    sharedBusy = computed(() => localAssets.busy > 0),
    sharedError = computed(() => localAssets.error),
    sharedFileName = computed(
      () => localAssets.paths.components || "components.json",
    );
  async function run(fn) {
    try {
      return await fn();
    } catch (e) {
      notify(e.message);
      throw e;
    }
  }
  function importLibrary(items) {
    return run(() =>
      updateAssets("components", (data) => {
        data.components = appendComponents(data.components, items);
      }),
    );
  }
  async function openSharedLibrary() {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Bibliothèque Frame",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    return importLibrary(parseLibrary(await (await handle.getFile()).text()));
  }
  onMounted(async () => {
    try {
      await ensureAssets();
      const previous = new ComponentLibraryFile();
      await previous.restore();
      let text = previous.baseline;
      if (
        previous.handle &&
        (!previous.handle.queryPermission ||
          (await previous.handle.queryPermission({ mode: "read" })) ===
            "granted")
      )
        text = await (await previous.handle.getFile()).text();
      if (text) {
        const items = parseLibrary(text);
        if (
          !items.some((c) => !localAssets.components.some((v) => v.id === c.id))
        )
          return;
        await updateAssets("components", (data) => {
          for (const c of items)
            if (
              !data.components.some((v) => v.id === c.id) &&
              data.components.length < 100
            )
              data.components.push(c);
        });
      }
    } catch (e) {
      notify(e.message);
    }
  });
  return {
    libraryScope,
    sharedComponents,
    sharedBusy,
    sharedError,
    sharedFileName,
    sharedDirty: computed(() => false),
    sharedFileSupported: true,
    openSharedLibrary,
    saveSharedLibrary: () => run(() => refreshAssets()),
    refreshSharedLibrary: () => run(() => refreshAssets()),
    importLibrary,
  };
}
