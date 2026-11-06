import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import { startFizzing } from '../effects/fizz';
import { useReducedMotion } from './reducedMotion';

/** Lets the panels under `root` fizz now and then (effects/fizz.ts), except with reduced motion. */
export function useFizz(root: Readonly<Ref<HTMLElement | null>>): void {
  const reduced = useReducedMotion();
  let stop: (() => void) | null = null;

  function update(): void {
    stop?.();
    stop = null;
    if (root.value && !reduced.value) stop = startFizzing(root.value);
  }

  onMounted(update);
  watch(reduced, update);
  onBeforeUnmount(() => stop?.());
}
