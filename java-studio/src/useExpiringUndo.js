import { watch, onScopeDispose } from "vue";
export function useExpiringUndo(
  state,
  { duration = 15000, schedule = setTimeout, cancel = clearTimeout } = {},
) {
  let timer;
  function clear() {
    if (timer !== undefined) {
      cancel(timer);
      timer = undefined;
    }
  }
  const stop = watch(
    state,
    (value) => {
      clear();
      if (value !== null && value !== undefined)
        timer = schedule(() => {
          if (state.value !== value) return;
          timer = undefined;
          state.value = null;
        }, duration);
    },
    { flush: "sync", immediate: true },
  );
  onScopeDispose(() => {
    clear();
    stop();
  });
}
