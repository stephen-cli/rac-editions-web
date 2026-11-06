import { h, type Component, type FunctionalComponent } from 'vue';

/**
 * A story render that passes the `default` arg as the component's default slot and the other args as props,
 * so the slot text is a control. Storybook only does this by itself when its docgen has marked `default` as a
 * slot, which doesn't happen when the stories run as tests.
 */
export function slotted(component: Component) {
  return <TArgs extends object>(args: TArgs): FunctionalComponent =>
    () => {
      const { default: content, ...props } = args as Record<string, unknown>;
      return h(component, props, () => content as string);
    };
}
