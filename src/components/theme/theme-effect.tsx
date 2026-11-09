"use client";

import { useEffect, useRef } from "react";
import type { Effect } from "@/lib/theme/schema";
import { colourVar, drawShape, drawSpark, fireworkColours, HEART_COLOURS, LEAF_COLOURS, partyColours, type Shape } from "./particles";

/**
 * A theme's background effect, drawn on one full-screen canvas that never takes clicks (pointer-events: none).
 * Falling: snow, leaves, confetti. Rising: hearts, bubbles. In place: stars (twinkle), fireworks (bursts now and then).
 * Flying: bats. Kept light: few particles (fewer on phones), paused while the tab is hidden, and off entirely for
 * people who ask their device for reduced motion.
 */

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; t: number; life: number };

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

const COUNT: Record<Exclude<Effect, "none">, [phone: number, desktop: number]> = {
  snow: [40, 80], leaves: [12, 22], bats: [5, 9], confetti: [40, 80],
  hearts: [12, 22], bubbles: [12, 22], stars: [30, 55], fireworks: [0, 0], // fireworks spawn their own sparks
};

export function ThemeEffect({ effect }: { effect: Effect }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (effect === "none" || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const small = w < 640;
    const party = partyColours();
    const starColours = [colourVar("--lime", "#e9f94c"), "#f4c94a", "#ffffff"];
    const bubbleColour = colourVar("--lilac", "#b9a4fa");

    const spawn = (initial: boolean): P => {
      const base = { a: 0, va: 0, t: Math.random() * 10, life: 1 };
      switch (effect) {
        case "bats":
          return { ...base, x: rand(-0.3, 1) * w, y: rand(0.05, 0.7) * h, vx: rand(0.6, 1.6), vy: rand(-0.2, 0.2), r: rand(10, 20), va: rand(0.18, 0.3), c: "#1d1a2e" };
        case "leaves":
          return { ...base, x: rand(0, w), y: initial ? rand(-h, h) : rand(-60, -20), vx: rand(-0.4, 0.4), vy: rand(0.5, 1.2), r: rand(7, 12), a: rand(0, Math.PI * 2), va: rand(-0.03, 0.03), c: pick(LEAF_COLOURS) };
        case "confetti":
          return { ...base, x: rand(0, w), y: initial ? rand(-h, h) : rand(-40, -10), vx: rand(-0.6, 0.6), vy: rand(1, 2.2), r: rand(4, 8), a: rand(0, Math.PI * 2), va: rand(-0.12, 0.12), c: pick(party) };
        case "hearts": // drift upwards
          return { ...base, x: rand(0, w), y: initial ? rand(0, h * 2) : h + rand(10, 40), vx: rand(-0.2, 0.2), vy: -rand(0.4, 1), r: rand(6, 11), a: rand(-0.3, 0.3), c: pick(HEART_COLOURS) };
        case "bubbles": // rise, wobble, pop near the top
          return { ...base, x: rand(0, w), y: initial ? rand(0, h * 1.5) : h + rand(10, 40), vx: 0, vy: -rand(0.5, 1.2), r: rand(5, 14), c: bubbleColour, life: rand(0.05, 0.35) /* pops at this fraction of the height */ };
        case "stars": // stay put and twinkle; respawn somewhere else after a while
          return { ...base, x: rand(0, w), y: rand(0, h), vx: 0, vy: 0, r: rand(3.5, 8), a: rand(0, Math.PI), va: rand(0.5, 1.1), c: pick(starColours), t: initial ? rand(0, 6) : 0 };
        default: // snow
          return { ...base, x: rand(0, w), y: initial ? rand(-h, h) : rand(-20, -5), vx: rand(-0.3, 0.3), vy: rand(0.4, 1.3), r: rand(1.5, 4), c: "#ffffff" };
      }
    };
    const [phoneCount, deskCount] = COUNT[effect];
    const ps: P[] = Array.from({ length: small ? phoneCount : deskCount }, () => spawn(true));

    // Fireworks: a burst every ~1.5–3.5 s somewhere in the upper half; sparks fly out, fall a little and fade.
    const sparks: P[] = [];
    let nextBurst = 0.5;
    const burst = () => {
      const x = rand(0.1, 0.9) * w, y = rand(0.1, 0.5) * h, c = pick(fireworkColours()), n = small ? 26 : 40;
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + rand(-0.1, 0.1), sp = rand(1.2, 2.6);
        sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: rand(2, 3.4), a: 0, va: 0, c, t: 0, life: 1 });
      }
    };

    const drawBat = (p: P) => {
      const flap = Math.sin(p.t * 6) * 0.6; // wing beat
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 0.75;
      const s = p.r;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.22, s * 0.32, 0, 0, Math.PI * 2); // body
      for (const side of [-1, 1]) {
        ctx.moveTo(0, -s * 0.05);
        ctx.quadraticCurveTo(side * s * 0.6, -s * (0.55 + flap), side * s * 1.2, -s * (0.2 + flap * 0.8));
        ctx.quadraticCurveTo(side * s * 0.9, s * 0.05, side * s * 0.75, s * 0.15);
        ctx.quadraticCurveTo(side * s * 0.55, -s * 0.02, side * s * 0.4, s * 0.18);
        ctx.quadraticCurveTo(side * s * 0.25, s * 0.02, 0, s * 0.15);
      }
      ctx.fill();
      ctx.restore();
    };

    const draw = (p: P, shape: Shape, alpha: number, spin = 0, tumble = 1) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(30, 30, 60, 0.3)"; ctx.shadowBlur = shape === "dot" || shape === "star" || shape === "spark" ? 3 : 0; // light shapes stay visible on light backgrounds
      drawShape(ctx, shape, p.r, p.c, spin, tumble);
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7); // frames since last tick, capped (tab switches)
      last = now;
      ctx.clearRect(0, 0, w, h);

      if (effect === "fireworks") {
        nextBurst -= 0.016 * dt;
        if (nextBurst <= 0) { burst(); nextBurst = rand(0.9, 2.2); }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.025 * dt; // drag + a little gravity
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.life -= 0.012 * dt;
          if (s.life <= 0) { sparks.splice(i, 1); continue; }
          ctx.save(); ctx.translate(s.x, s.y); ctx.globalAlpha = Math.min(1, s.life * 1.4); drawSpark(ctx, s.r, s.c); ctx.restore();
        }
        raf = requestAnimationFrame(frame);
        return;
      }

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.t += 0.016 * dt;
        switch (effect) {
          case "bats":
            p.x += p.vx * dt; p.y += (p.vy + Math.sin(p.t * 2) * 0.4) * dt;
            if (p.x > w + 40) ps[i] = { ...spawn(false), x: -40 };
            drawBat(p);
            continue;
          case "stars": {
            const glow = Math.max(0, Math.sin(p.t * p.va * 2)); // 0 → 1 → 0, then dark for a while
            if (p.t * p.va * 2 > Math.PI * 2) { ps[i] = spawn(false); continue; }
            draw(p, p.r > 6 ? "star" : "spark", 0.95 * glow, p.a);
            continue;
          }
          case "hearts":
            p.x += (p.vx + Math.sin(p.t * 1.2) * 0.4) * dt; p.y += p.vy * dt;
            if (p.y < -30) ps[i] = spawn(false);
            draw(p, "heart", 0.8, p.a + Math.sin(p.t) * 0.2);
            continue;
          case "bubbles":
            p.x += Math.sin(p.t * 2) * 0.35 * dt; p.y += p.vy * dt;
            if (p.y < h * p.life) ps[i] = spawn(false); // popped
            draw(p, "bubble", 0.75);
            continue;
          default: {
            p.x += (p.vx + Math.sin(p.t * 1.5) * (effect === "leaves" ? 0.8 : 0.3)) * dt;
            p.y += p.vy * dt;
            p.a += p.va * dt;
            if (p.y > h + 30) ps[i] = spawn(false);
            if (effect === "snow") draw(p, "dot", 0.9);
            else if (effect === "leaves") draw(p, "leaf", 0.85, p.a);
            else draw(p, "confetti", 0.9, p.a, Math.cos(p.t * 4)); // tumbling
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
    const onVisible = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener("visibilitychange", onVisible);
    start();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [effect]);

  if (effect === "none") return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-40 h-full w-full print:hidden" />;
}
