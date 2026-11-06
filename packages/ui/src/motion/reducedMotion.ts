import { onScopeDispose, readonly, ref, type Ref } from 'vue';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Whether the player asked for less motion; the effects then show a still state instead. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

/** prefersReducedMotion as a ref that follows the system setting while the component lives. */
export function useReducedMotion(): Readonly<Ref<boolean>> {
  const reduced = ref(prefersReducedMotion());
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const media = window.matchMedia(QUERY);
    const update = (): void => {
      reduced.value = media.matches;
    };
    media.addEventListener('change', update);
    onScopeDispose(() => media.removeEventListener('change', update));
  }
  return readonly(reduced);
}
