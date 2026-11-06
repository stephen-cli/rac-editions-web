/**
 * The starfield: stars in 3D drifting slowly towards the viewer and twinkling. Each star is a soft glow, a
 * bright core in a halo, added onto the sky; the brightest few carry a cross-shaped flare. setWarp(1) runs
 * them past at speed, drawn as streaks, for the builder's warp during a build. With reduced motion it draws
 * one still frame.
 */

export interface Starfield {
  /** 0 is the idle drift, 1 full warp; the speed eases towards it. */
  setWarp(amount: number): void;
  destroy(): void;
}

interface Star {
  x: number;
  y: number;
  z: number;
  colour: number;
  size: number;
  flare: number;
  twinkle: number;
  phase: number;
}

const IDLE_SPEED = 0.004;
const WARP_SPEED = 1.15;
const SPACE = '#070B13';
// Star colours as rgb triples, with how often each is picked: mostly white and cool white, some holo
// cyan, a few bolt gold and warm white.
const COLOURS: [rgb: string, weight: number][] = [
  ['232,238,247', 0.5],
  ['196,220,255', 0.22],
  ['63,215,230', 0.13],
  ['242,181,58', 0.07],
  ['255,214,190', 0.08],
];
// The share of stars that carry a flare, and how bright a flare is at most.
const FLARE_SHARE = 0.06;
// A glow sprite is drawn at this many times the star's core radius.
const GLOW_SCALE = 9;
const SPRITE_SIZE = 64;

function pickColour(): number {
  let pick = Math.random();
  for (let i = 0; i < COLOURS.length; i++) {
    pick -= COLOURS[i]![1];
    if (pick <= 0) return i;
  }
  return 0;
}

/** A glow for each colour: a small bright core, then a halo falling off quickly, as light does. */
function makeGlowSprites(): HTMLCanvasElement[] {
  return COLOURS.map(([rgb]) => {
    const sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const ctx = sprite.getContext('2d');
    if (!ctx) return sprite;
    const half = SPRITE_SIZE / 2;
    const glow = ctx.createRadialGradient(half, half, 0, half, half, half);
    glow.addColorStop(0, `rgba(${rgb},1)`);
    glow.addColorStop(0.1, `rgba(${rgb},0.85)`);
    glow.addColorStop(0.2, `rgba(${rgb},0.3)`);
    glow.addColorStop(0.45, `rgba(${rgb},0.07)`);
    glow.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    return sprite;
  });
}

export function createStarfield(canvas: HTMLCanvasElement, host: HTMLElement, still: boolean): Starfield {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { setWarp() {}, destroy() {} };
  const draw2d = ctx;
  const sprites = makeGlowSprites();

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars: Star[] = [];
  let speed = IDLE_SPEED;
  let targetSpeed = still ? 0 : IDLE_SPEED;
  let raf = 0;
  let last = performance.now();
  let clock = 0;

  function project(star: Star, z: number): { x: number; y: number } {
    const scale = Math.max(width, height) * 0.5;
    return { x: width / 2 + (star.x / z) * scale, y: height / 2 + (star.y / z) * scale };
  }

  function onScreen(point: { x: number; y: number }): boolean {
    return point.x > -40 && point.x < width + 40 && point.y > -40 && point.y < height + 40;
  }

  /** Places a star at random; `far` puts it at the back, where new stars appear as others pass. */
  function spawn(star: Star, far: boolean): Star {
    for (let tries = 0; tries < 8; tries++) {
      star.x = (Math.random() * 2 - 1) * 1.2;
      star.y = (Math.random() * 2 - 1) * 1.2;
      star.z = far ? 0.9 + Math.random() * 0.1 : 0.12 + Math.random() * 0.88;
      if (onScreen(project(star, star.z))) break;
    }
    star.colour = pickColour();
    // Most stars are faint points; a long tail of brighter ones.
    star.size = 0.45 + Math.random() ** 2 * 1.9;
    star.flare = Math.random() < FLARE_SHARE ? 0.6 + Math.random() * 0.4 : 0;
    star.twinkle = 0.4 + Math.random() * 1.2;
    star.phase = Math.random() * Math.PI * 2;
    return star;
  }

  function newStar(): Star {
    return spawn({ x: 0, y: 0, z: 1, colour: 0, size: 1, flare: 0, twinkle: 1, phase: 0 }, false);
  }

  function resize(): void {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = host.clientWidth * dpr;
    height = host.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    // Well populated: about one star per 1100 px² of window, 260 to 1100.
    const wanted = Math.max(260, Math.min(1100, Math.round((host.clientWidth * host.clientHeight) / 1100)));
    stars = Array.from({ length: wanted }, newStar);
    if (still) draw(0);
  }

  /** A flare: a thin cross of light through the star, fading out along each arm, and a fainter diagonal. */
  function drawFlare(x: number, y: number, length: number, rgb: string, alpha: number): void {
    for (const [angle, strength] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.3], [-Math.PI / 4, 0.3]] as const) {
      const dx = Math.cos(angle) * length * strength;
      const dy = Math.sin(angle) * length * strength;
      const arm = draw2d.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
      arm.addColorStop(0, `rgba(${rgb},0)`);
      arm.addColorStop(0.5, `rgba(${rgb},${alpha * strength})`);
      arm.addColorStop(1, `rgba(${rgb},0)`);
      draw2d.strokeStyle = arm;
      draw2d.lineWidth = dpr * 0.9;
      draw2d.beginPath();
      draw2d.moveTo(x - dx, y - dy);
      draw2d.lineTo(x + dx, y + dy);
      draw2d.stroke();
    }
  }

  function draw(dt: number): void {
    speed += (targetSpeed - speed) * Math.min(1, dt * 1.6);
    clock += dt;
    draw2d.globalCompositeOperation = 'source-over';
    draw2d.globalAlpha = 1;
    draw2d.fillStyle = SPACE;
    draw2d.fillRect(0, 0, width, height);
    const sky = draw2d.createRadialGradient(width * 0.72, 0, 0, width * 0.72, 0, Math.max(width, height) * 0.8);
    sky.addColorStop(0, 'rgba(26, 46, 82, 0.55)');
    sky.addColorStop(1, 'rgba(7, 11, 19, 0)');
    draw2d.fillStyle = sky;
    draw2d.fillRect(0, 0, width, height);

    // Light adds up, so overlapping glows brighten each other as on a photograph.
    draw2d.globalCompositeOperation = 'lighter';
    draw2d.lineCap = 'round';
    // Above the idle drift, stars stretch into streaks as the speed rises.
    const streak = Math.min(1, Math.max(0, (speed - 0.04) / 0.5));
    for (const star of stars) {
      star.z -= speed * dt;
      if (star.z <= 0.03) {
        spawn(star, true);
        continue;
      }
      const head = project(star, star.z);
      if (!onScreen(head)) {
        spawn(star, true);
        continue;
      }
      const rgb = COLOURS[star.colour]![0];
      const depth = 1 - star.z;
      // A gentle shimmer: each star's brightness swings between 64% and 100%, slowly.
      const twinkle = still ? 1 : 0.82 + 0.18 * Math.sin(clock * star.twinkle + star.phase);
      const alpha = Math.min(1, (0.4 + depth * 0.8) * (streak > 0 ? 1 : twinkle));
      const radius = star.size * (0.45 + depth * 1.3) * dpr;
      if (streak > 0.02) {
        const tail = project(star, Math.min(1.2, star.z + speed * 0.09 * streak));
        draw2d.globalAlpha = 1;
        draw2d.strokeStyle = `rgba(${rgb},${alpha})`;
        draw2d.lineWidth = radius * 1.1;
        draw2d.beginPath();
        draw2d.moveTo(tail.x, tail.y);
        draw2d.lineTo(head.x, head.y);
        draw2d.stroke();
        continue;
      }
      const glow = radius * GLOW_SCALE;
      draw2d.globalAlpha = alpha;
      draw2d.drawImage(sprites[star.colour]!, head.x - glow / 2, head.y - glow / 2, glow, glow);
      if (star.flare > 0) {
        draw2d.globalAlpha = 1;
        drawFlare(head.x, head.y, radius * 24 * star.flare, rgb, alpha * star.flare);
      }
    }
    draw2d.globalAlpha = 1;
    draw2d.globalCompositeOperation = 'source-over';
  }

  function frame(now: number): void {
    // A long gap (a hidden tab) counts as one short step, so stars don't jump.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) draw(dt);
    raf = requestAnimationFrame(frame);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  if (!still) raf = requestAnimationFrame(frame);

  return {
    setWarp(amount) {
      targetSpeed = still ? 0 : IDLE_SPEED + Math.max(0, Math.min(1, amount)) * WARP_SPEED;
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
    },
  };
}
