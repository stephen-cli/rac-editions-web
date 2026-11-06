import { mount } from '@vue/test-utils';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { RacButton, RacChip, RacHeading, RacIcon, RacPanel } from '../src';

// Mounted into the document, since axe and focus need attached elements.
const attachTo = document.body;

async function violations(element: Element): Promise<string[]> {
  const result = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.help}`);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RacButton', () => {
  it('is a button that submits nothing by default', async () => {
    const wrapper = mount(RacButton, { attachTo, slots: { default: 'Next: discs' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.text()).toBe('Next: discs');
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('emits click, and none when disabled', async () => {
    const wrapper = mount(RacButton, { attachTo, props: { disabled: true }, slots: { default: 'Build' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
    await wrapper.setProps({ disabled: false });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('throws sparks from a pointer click on a primary button only', async () => {
    // jsdom draws nothing on a canvas; the sparks' overlay canvas appearing is what shows a burst.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const primary = mount(RacButton, { attachTo, props: { variant: 'primary' }, slots: { default: 'Build' } });
    await primary.trigger('click', { clientX: 0, clientY: 0 });
    const secondary = mount(RacButton, { attachTo, slots: { default: 'Back' } });
    await secondary.trigger('click', { clientX: 40, clientY: 20 });
    expect(document.querySelector('canvas.rac-sparks')).toBeNull();

    await primary.trigger('click', { clientX: 40, clientY: 20 });
    expect(document.querySelector('canvas.rac-sparks')).toHaveProperty('ariaHidden', 'true');
    vi.restoreAllMocks();
  });
});

describe('RacHeading', () => {
  it('renders its level with the real text', async () => {
    const wrapper = mount(RacHeading, { attachTo, props: { level: 3 }, slots: { default: 'Add your discs' } });
    expect(wrapper.element.tagName).toBe('H3');
    expect(wrapper.text()).toBe('Add your discs');
    expect(await violations(wrapper.element)).toEqual([]);
  });

  it('gives each heading its own fuzz filter', () => {
    const page = mount(() => [h(RacHeading, () => 'One'), h(RacHeading, () => 'Two')], { attachTo });
    const [a, b] = page.findAll('filter').map((filter) => filter.attributes('id'));
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});

describe('RacIcon', () => {
  it('is hidden from screen readers unless labelled', () => {
    expect(mount(RacIcon, { attachTo, props: { name: 'disc' } }).attributes('aria-hidden')).toBe('true');
    const labelled = mount(RacIcon, { attachTo, props: { name: 'disc', label: 'Disc' } });
    expect(labelled.attributes('aria-hidden')).toBeUndefined();
    expect(labelled.attributes('role')).toBe('img');
    expect(labelled.attributes('aria-label')).toBe('Disc');
  });
});

describe('RacPanel and RacChip', () => {
  it('render their tone and content as the given element', async () => {
    const wrapper = mount(RacPanel, {
      attachTo,
      props: { as: 'section', tone: 'hazard' },
      slots: { default: () => [h('p', 'Update in place'), h(RacChip, { tone: 'bolt' }, () => 'Customised')] },
    });
    expect(wrapper.element.tagName).toBe('SECTION');
    expect(wrapper.classes()).toContain('rac-panel--hazard');
    expect(wrapper.find('.rac-chip--bolt').text()).toBe('Customised');
    expect(await violations(wrapper.element)).toEqual([]);
  });
});
