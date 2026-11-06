/**
 * Bolt-gold sparks bursting from a click, for primary buttons: short lines shoot out from the pointer and
 * shrink to nothing as they go. They are drawn on one canvas laid over the whole page (fixed, aria-hidden,
 * taking no pointer events), so they fly past the button's edge; it animates only while sparks are alive.
 * A keyboard click (clientX and clientY 0) has no point to burst from, so it throws none.
 */

interface Spark {
  x: number;
  y: number;
  angle: number;
  /** The first frame's time; frames are timed from their start, which can come before the click. */
  born: number | null;
}

const COUNT = 9;
const REACH = 28;
const LENGTH = 10;
const DURATION = 420;
const CLASS = 'rac-sparks';

let canvas: HTMLCanvasElement | null = null;
let sparks: Spark[] = [];
let raf = 0;

function overlay(): HTMLCanvasElement {
  if (canvas?.isConnected) return canvas;
  canvas = document.createElement('canvas');
  canvas.className = CLASS;
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  return canvas;
}

/** Fits the canvas to the window at the screen's pixel density, so the lines stay sharp. */
function fit(target: HTMLCanvasElement): number {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(window.innerWidth * dpr);
  const height = Math.round(window.innerHeight * dpr);
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  return dpr;
}

function frame(now: number): void {
  const target = overlay();
  const ctx = target.getContext('2d');
  if (!ctx) {
    sparks = [];
    return;
  }
  const dpr = fit(target);
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.strokeStyle = getComputedStyle(target).color;
  ctx.lineWidth = 2 * dpr;
  ctx.lineCap = 'round';
  sparks = sparks.filter((spark) => {
    spark.born ??= now;
    const t = (now - spark.born) / DURATION;
    if (t >= 1) return false;
    // Fast out, slowing as it goes; the line shortens as it travels.
    const eased = t * (2 - t);
    const from = eased * REACH;
    const to = from + LENGTH * (1 - eased);
    const cos = Math.cos(spark.angle);
    const sin = Math.sin(spark.angle);
    ctx.beginPath();
    ctx.moveTo((spark.x + from * cos) * dpr, (spark.y + from * sin) * dpr);
    ctx.lineTo((spark.x + to * cos) * dpr, (spark.y + to * sin) * dpr);
    ctx.stroke();
    return true;
  });
  raf = sparks.length ? requestAnimationFrame(frame) : 0;
}

export function burstSparks(event: MouseEvent): void {
  if (event.clientX === 0 && event.clientY === 0) return;
  overlay();
  // A small random turn, so bursts don't all share one star shape.
  const turn = Math.random() * Math.PI;
  for (let i = 0; i < COUNT; i++) {
    sparks.push({ x: event.clientX, y: event.clientY, angle: turn + (i / COUNT) * Math.PI * 2, born: null });
  }
  if (!raf) raf = requestAnimationFrame(frame);
}
