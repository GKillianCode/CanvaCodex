import { watch, onBeforeUnmount, ref, onMounted } from "vue";
let locks = 0,
  previous = "";
export function useModalScroll(open) {
  let held = false;
  function release() {
    if (!held) return;
    held = false;
    if (--locks === 0) document.body.style.overflow = previous;
  }
  watch(
    open,
    (value) => {
      if (value && !held) {
        held = true;
        if (locks++ === 0) {
          previous = document.body.style.overflow;
          document.body.style.overflow = "hidden";
        }
      } else if (!value) release();
    },
    { immediate: true },
  );
  onBeforeUnmount(release);
}
export function useGlobalModalScroll() {
  const open = ref(false);
  useModalScroll(() => open.value);
  let observer;
  const update = () => {
    open.value = [
      ...document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
    ].some((el) => el.getClientRects().length);
  };
  onMounted(() => {
    observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    update();
  });
  onBeforeUnmount(() => observer?.disconnect());
}
