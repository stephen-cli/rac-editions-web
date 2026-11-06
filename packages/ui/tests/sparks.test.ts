import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { burstSparks } from '../src/effects/sparks';

/** The far end of every line drawn since the last clear, as distances from the click. */
function recorder(click: { x: number; y: number }) {
  const reach: number[] = [];
  let moveTo: [number, number] = [0, 0];
  const context = {
    clearRect: () => reach.splice(0),
    beginPath() {},
    moveTo: (x: number, y: number) => (moveTo = [x, y]),
    lineTo: (x: number, y: number) => {
      reach.push(Math.hypot(x - click.x, y - click.y), Math.hypot(moveTo[0] - click.x, moveTo[1] - click.y));
    },
    stroke() {},
  };
  return { context, reach };
}

describe('burstSparks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    vi.stubGlobal('devicePixelRatio', 1);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('flies out from the click, about 28 px, and is gone after its life', () => {
    const click = { x: 200, y: 100 };
    const { context, reach } = recorder(click);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);

    burstSparks(new MouseEvent('click', { clientX: click.x, clientY: click.y }));
    vi.advanceTimersByTime(16);
    expect(reach.length).toBe(18);
    expect(Math.max(...reach)).toBeLessThan(12);

    vi.advanceTimersByTime(300);
    expect(Math.min(...reach)).toBeGreaterThan(20);
    expect(Math.max(...reach)).toBeLessThanOrEqual(29);

    vi.advanceTimersByTime(200);
    expect(reach).toEqual([]);
  });

  it('throws none from a keyboard click, which has no position', () => {
    burstSparks(new MouseEvent('click', { clientX: 0, clientY: 0 }));
    expect(document.querySelector('canvas.rac-sparks')).toBeNull();
  });
});
