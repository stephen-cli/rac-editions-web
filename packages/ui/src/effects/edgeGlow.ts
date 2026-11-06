/**
 * The edge glow's pointer tracking: on the element that holds a RacEdgeGlow, sets --rac-glow-x and
 * --rac-glow-y (the pointer, in px from the element's top left), which the pool of light on the edge
 * centres on, and --rac-glow-on (1 while the pointer is over the element, 0 once it leaves).
 */

export function trackEdgeGlow(event: PointerEvent): void {
  const element = event.currentTarget as HTMLElement;
  const box = element.getBoundingClientRect();
  element.style.setProperty('--rac-glow-x', `${(event.clientX - box.left).toFixed(1)}px`);
  element.style.setProperty('--rac-glow-y', `${(event.clientY - box.top).toFixed(1)}px`);
  element.style.setProperty('--rac-glow-on', '1');
}

export function clearEdgeGlow(event: PointerEvent): void {
  (event.currentTarget as HTMLElement).style.setProperty('--rac-glow-on', '0');
}
