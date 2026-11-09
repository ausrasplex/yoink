import { CELEBRATIONS, type Celebration } from "@/lib/theme/effects";
import { drawShape, drawSpark, fireworkColours, HEART_COLOURS, LEAF_COLOURS, partyColours, type Shape } from "./particles";

/**
 * One-off celebrations: a burst when a bid makes you the highest bidder, a bigger one when you win an item.
 * The look is the active theme's `celebration` (the root layout puts it on <html data-celebration>). Drawn on a
 * temporary canvas above everything (it never takes clicks) that removes itself when the last particle is gone.
 * Nothing happens for people who ask their device for reduced motion.
 */

type Bit = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; t: number; life: number; fade: number; shape: Shape; delay: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function style(): Celebration {
  const v = document.documentElement.dataset.celebration as Celebration | undefined;
  return v && (CELEBRATIONS as readonly string[]).includes(v) ? v : "confetti";
}

const LOOK: Record<Exclude<Celebration, "none">, { shape: Shape; colours: () => string[]; size: [number, number] }> = {
  confetti: { shape: "confetti", colours: partyColours, size: [6, 11] },
  hearts: { shape: "heart", colours: () => HEART_COLOURS, size: [6, 11] },
  stars: { shape: "star", colours: () => ["#f4c94a", "#ffe27a", ...partyColours().slice(0, 2)], size: [5, 9] },
  snow: { shape: "dot", colours: () => ["#ffffff", "#eaf4ff"], size: [2.5, 5] },
  leaves: { shape: "leaf", colours: () => LEAF_COLOURS, size: [7, 11] },
  fireworks: { shape: "dot", colours: fireworkColours, size: [2, 3.4] },
};

/** `from`: where a "bid" burst starts (e.g. the dialog's icon); defaults to the middle of the screen. */
export function celebrate(kind: "bid" | "win", from?: { x: number; y: number }) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const s = style();
  if (s === "none") return;
  const look = LOOK[s];
  const colours = look.colours();

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bits: Bit[] = [];
  const add = (x: number, y: number, angle: number, spread: number, speed: [number, number], n: number, delay = 0, colour?: string) => {
    for (let i = 0; i < n; i++) {
      const ang = angle + rand(-spread, spread), sp = rand(...speed);
      bits.push({
        x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: rand(...look.size), a: rand(0, Math.PI * 2), va: rand(-0.2, 0.2),
        c: colour ?? pick(colours), t: rand(0, 10), life: 1, fade: rand(0.006, 0.011), shape: look.shape, delay,
      });
    }
  };
  const small = w < 640;
  const up = -Math.PI / 2;

  if (s === "fireworks") {
    // a few round bursts, one after another
    const bursts = kind === "bid" ? 1 : small ? 4 : 6;
    for (let b = 0; b < bursts; b++) {
      const x = kind === "bid" && from ? from.x : rand(0.15, 0.85) * w, y = kind === "bid" && from ? from.y : rand(0.15, 0.45) * h;
      add(x, y, 0, Math.PI, [1.5, 4.5], small ? 40 : 60, b * 22, pick(colours));
    }
  } else if (kind === "bid") {
    const o = from ?? { x: w / 2, y: h / 2 };
    add(o.x, o.y, up, 1.1, [4, 9], small ? 60 : 90);
  } else {
    // two cannons from the bottom corners, then a second volley
    const n = small ? 70 : 120;
    for (const volley of [0, 25]) {
      add(0, h, up + 0.55, 0.35, [9, 17], n / 2, volley);
      add(w, h, up - 0.55, 0.35, [9, 17], n / 2, volley);
    }
  }

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(3, (now - last) / 16.7);
    last = now;
    ctx.clearRect(0, 0, w, h);
    let alive = 0;
    for (const b of bits) {
      if (b.delay > 0) { b.delay -= dt; alive++; continue; }
      if (b.life <= 0) continue;
      b.t += 0.016 * dt;
      const floaty = b.shape === "heart" || (b.shape === "dot" && s === "snow");
      b.vx *= Math.pow(0.985, dt);
      b.vy = b.vy * Math.pow(0.985, dt) + (floaty ? 0.06 : s === "fireworks" ? 0.04 : 0.16) * dt; // gravity
      b.x += (b.vx + (b.shape === "leaf" ? Math.sin(b.t * 3) * 0.6 : 0)) * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      b.life -= b.fade * dt * (s === "fireworks" ? 1.6 : 1);
      if (b.life <= 0 || b.y > h + 40) { b.life = 0; continue; }
      alive++;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = Math.min(1, b.life * 2);
      if (s === "fireworks") drawSpark(ctx, b.r, b.c);
      else {
        if (b.shape === "dot" || b.shape === "star") { ctx.shadowColor = "rgba(30, 30, 60, 0.25)"; ctx.shadowBlur = 3; }
        drawShape(ctx, b.shape, b.r, b.c, b.a, Math.cos(b.t * 5));
      }
      ctx.restore();
    }
    if (alive) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/**
 * Celebrate each won lot once per browser: remembers the lots already celebrated (a per-device nicety, so it can
 * be lost with site data; at worst someone sees the confetti twice).
 */
export function celebrateWins(lots: number[]) {
  if (!lots.length) return;
  const KEY = "yoink-celebrated-wins";
  let seen: number[] = [];
  try { seen = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch {}
  if (!Array.isArray(seen)) seen = [];
  const fresh = lots.filter((l) => !seen.includes(l));
  if (!fresh.length) return;
  try { localStorage.setItem(KEY, JSON.stringify([...seen, ...fresh].slice(-500))); } catch {}
  celebrate("win");
}
