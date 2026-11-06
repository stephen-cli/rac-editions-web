import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fizzPanel } from '../src/effects/fizz';

describe('fizzPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows static for about a second, then leaves the panel clean', () => {
    const panel = document.createElement('div');
    fizzPanel(panel, ['url(a)', 'url(b)', 'url(c)', 'url(d)']);

    let shown = 0;
    for (let at = 0; at < 800; at += 55) {
      vi.advanceTimersByTime(55);
      if (panel.style.getPropertyValue('--rac-fizz').startsWith('url(')) shown++;
    }
    expect(shown).toBeGreaterThan(5);

    vi.advanceTimersByTime(600);
    expect(panel.style.getPropertyValue('--rac-fizz')).toBe('');
  });

  it('stops at once when asked', () => {
    const panel = document.createElement('div');
    const stop = fizzPanel(panel, ['url(a)']);
    vi.advanceTimersByTime(300);
    stop();
    expect(panel.style.getPropertyValue('--rac-fizz')).toBe('');
  });
});
