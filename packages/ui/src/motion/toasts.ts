import { readonly, reactive, type DeepReadonly } from 'vue';

export interface Toast {
  id: number;
  text: string;
}

/** How long a toast stays, in ms: long enough to read a sentence. */
const LIFETIME = 4000;

const toasts = reactive<Toast[]>([]);
let nextId = 1;

/**
 * Short notes that appear at the top right of the window and leave by themselves ("Ratchet & Clank (PAL)
 * recognised."). RacToaster shows them and announces each to screen readers.
 */
export function useToasts(): { toasts: DeepReadonly<Toast[]>; toast: (text: string) => void } {
  function toast(text: string): void {
    const id = nextId++;
    toasts.push({ id, text });
    setTimeout(() => {
      const at = toasts.findIndex((entry) => entry.id === id);
      if (at >= 0) toasts.splice(at, 1);
    }, LIFETIME);
  }
  return { toasts: readonly(toasts), toast };
}
