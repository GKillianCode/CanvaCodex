import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import {
  descriptionLibraryKey,
  normalizeDescriptionLibrary,
  availableDescriptionTemplates,
} from "./publicationTemplates.js";
import { musicLibraryKey, normalizeMusicLibrary } from "./publicationMusic.js";
import {
  composePublication,
  publicationNeighbors,
} from "./publicationComposition.js";
export function usePublicationComposition(props, project, data) {
  const library = ref(normalizeDescriptionLibrary()),
    music = ref([]),
    videos = ref([]),
    related = ref({}),
    ready = ref(false),
    error = ref("");
  const templates = computed(() =>
    availableDescriptionTemplates(library.value),
  );
  const neighbors = computed(() =>
    publicationNeighbors(
      videos.value,
      project.value,
      data.value?.details || {},
    ),
  );
  const result = computed(() =>
    data.value
      ? composePublication(data.value, library.value, music.value, {
          ...related.value,
          playlist: project.value?.playlist,
        })
      : { description: "", comment: "", tags: "", warnings: [] },
  );
  const description = computed(() =>
    data.value?.descriptionMode === "template" && !ready.value
      ? data.value.generatedDescription || data.value.description
      : result.value.description,
  );
  let active = true,
    poll,
    loading,
    relatedGeneration = 0;
  async function refreshRelated() {
    const generation = ++relatedGeneration,
      keys = ["previous", "next"];
    const values = await Promise.all(
      keys.map(async (key) => {
        const id = neighbors.value[key]?.id;
        return [key, id ? await props.repository.get(id) : null];
      }),
    );
    if (active && generation === relatedGeneration)
      related.value = Object.fromEntries(values);
  }
  async function refresh() {
    if (loading) return loading;
    loading = (async () => {
      try {
        const [raw, tracks, rows] = await Promise.all([
          props.repository.getSetting(descriptionLibraryKey),
          props.repository.getSetting(musicLibraryKey),
          props.repository.list(),
        ]);
        if (!active) return;
        const normalized = normalizeDescriptionLibrary(raw),
          normalizedTracks = normalizeMusicLibrary(tracks);
        if (JSON.stringify(normalized) !== JSON.stringify(library.value))
          library.value = normalized;
        if (JSON.stringify(normalizedTracks) !== JSON.stringify(music.value))
          music.value = normalizedTracks;
        if (JSON.stringify(rows) !== JSON.stringify(videos.value))
          videos.value = rows;
        ready.value = true;
        error.value = "";
        await nextTick();
        await refreshRelated();
      } catch (e) {
        if (active)
          error.value = e.message || "Les modèles ne sont pas disponibles.";
      }
    })().finally(() => (loading = null));
    return loading;
  }
  watch(
    () => [neighbors.value.previous?.id, neighbors.value.next?.id].join("|"),
    () => refreshRelated().catch((e) => (error.value = e.message)),
  );
  watch(
    () => result.value.description,
    (value) => {
      if (
        ready.value &&
        data.value?.descriptionMode === "template" &&
        result.value.template &&
        value !== data.value.generatedDescription
      )
        data.value.generatedDescription = value.slice(0, 100000);
    },
  );
  function focus() {
    if (document.visibilityState !== "hidden") refresh();
  }
  onMounted(() => {
    refresh();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    poll = setInterval(focus, 3000);
  });
  onBeforeUnmount(() => {
    active = false;
    clearInterval(poll);
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", focus);
  });
  return {
    library,
    templates,
    videos,
    neighbors,
    result,
    description,
    ready,
    error,
    refresh,
  };
}
