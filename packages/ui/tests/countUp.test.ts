import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { RacCountUp } from '../src';

/** The digits a sighted reader sees, and what a screen reader reads. */
function read(wrapper: ReturnType<typeof mount>): { shown: string; spoken: string } {
  return {
    shown: wrapper.find('.rac-count-up__shown').text(),
    spoken: wrapper.find('.rac-sr-only').text(),
  };
}

describe('RacCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows its value at once when it has no starting point', () => {
    const wrapper = mount(RacCountUp, { props: { value: 2058796 } });
    expect(read(wrapper)).toEqual({ shown: '2,058,796', spoken: '2,058,796' });
  });

  it('counts from its starting point, while screen readers get only the value', async () => {
    const wrapper = mount(RacCountUp, { props: { value: 1000, from: 0, duration: 500 } });
    await nextTick();
    expect(read(wrapper)).toEqual({ shown: '0', spoken: '1,000' });
    vi.advanceTimersByTime(250);
    await nextTick();
    const midway = Number(read(wrapper).shown.replace(/,/g, ''));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1000);
    vi.advanceTimersByTime(300);
    await nextTick();
    expect(read(wrapper).shown).toBe('1,000');
  });

  it('counts on from what it shows to each new value', async () => {
    const wrapper = mount(RacCountUp, { props: { value: 100, duration: 200 } });
    await wrapper.setProps({ value: 300 });
    vi.advanceTimersByTime(100);
    await nextTick();
    const midway = Number(read(wrapper).shown);
    expect(midway).toBeGreaterThan(100);
    expect(midway).toBeLessThan(300);
    vi.advanceTimersByTime(150);
    await nextTick();
    expect(read(wrapper).shown).toBe('300');
  });

  it('changes at once with reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('reduce'),
      addEventListener() {},
      removeEventListener() {},
    }));
    const wrapper = mount(RacCountUp, { props: { value: 100, from: 0 } });
    await nextTick();
    expect(read(wrapper).shown).toBe('100');
    await wrapper.setProps({ value: 5000 });
    expect(read(wrapper).shown).toBe('5,000');
  });

  it('keeps the room its largest value needs, and each digit the width of a 0', () => {
    const wrapper = mount(RacCountUp, { props: { value: 12, max: 2058796 } });
    expect(read(wrapper).shown).toBe('12');
    expect(wrapper.find('.rac-count-up__room').text()).toBe('2,058,796');
    expect(wrapper.findAll('.rac-count-up__shown .rac-count-up__digit')).toHaveLength(2);
  });
});
