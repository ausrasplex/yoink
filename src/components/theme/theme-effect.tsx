"use client";

import { useEffect, useRef } from "react";
import type { Effect } from "@/lib/theme/schema";

/**
 * A theme's decorative effect: snow, leaves, bats or confetti, drawn on one full-screen canvas behind nothing —
 * it never takes clicks (pointer-events: none). Kept light: few particles (fewer on phones), paused while the tab is
 * hidden, and off entirely for people who ask their device for reduced motion.
 */

type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; va: number; c: string; t: number };

const LEAF_COLOURS = ["#d9772b", "#b8461c", "#e0a526", "#8f3a1a", "#c9682f"];

function colourVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function ThemeEffect({ effect }: { effect: Effect }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (effect === "none" || !ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const small = w < 640;
    const count = { snow: small ? 40 : 80, leaves: small ? 12 : 22, bats: small ? 5 : 9, confetti: small ? 40 : 80 }[effect];
    const confettiColours = [colourVar("--lime", "#e9f94c"), colourVar("--lilac", "#b9a4fa"), colourVar("--peach", "#fddfba"), "#ff7aa2", "#5ec8f2"];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (initial: boolean): P => {
      switch (effect) {
        case "bats":
          return { x: rand(-0.3, 1) * w, y: rand(0.05, 0.7) * h, vx: rand(0.6, 1.6), vy: rand(-0.2, 0.2), r: rand(10, 20), a: 0, va: rand(0.18, 0.3), c: "#1d1a2e", t: Math.random() * 10 };
        case "leaves":
          return { x: rand(0, w), y: initial ? rand(-h, h) : rand(-60, -20), vx: rand(-0.4, 0.4), vy: rand(0.5, 1.2), r: rand(7, 12), a: rand(0, Math.PI * 2), va: rand(-0.03, 0.03), c: LEAF_COLOURS[Math.floor(Math.random() * LEAF_COLOURS.length)], t: Math.random() * 10 };
        case "confetti":
          return { x: rand(0, w), y: initial ? rand(-h, h) : rand(-40, -10), vx: rand(-0.6, 0.6), vy: rand(1, 2.2), r: rand(4, 8), a: rand(0, Math.PI * 2), va: rand(-0.12, 0.12), c: confettiColours[Math.floor(Math.random() * confettiColours.length)], t: Math.random() * 10 };
        default: // snow
          return { x: rand(0, w), y: initial ? rand(-h, h) : rand(-20, -5), vx: rand(-0.3, 0.3), vy: rand(0.4, 1.3), r: rand(1.5, 4), a: 0, va: 0, c: "#ffffff", t: Math.random() * 10 };
      }
    };
    const ps: P[] = Array.from({ length: count }, () => spawn(true));

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

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7); // frames since last tick, capped (tab switches)
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.t += 0.016 * dt;
        if (effect === "bats") {
          p.x += p.vx * dt; p.y += (p.vy + Math.sin(p.t * 2) * 0.4) * dt;
          if (p.x > w + 40) ps[i] = { ...spawn(false), x: -40 };
          drawBat(p);
          continue;
        }
        p.x += (p.vx + Math.sin(p.t * 1.5) * (effect === "leaves" ? 0.8 : 0.3)) * dt;
        p.y += p.vy * dt;
        p.a += p.va * dt;
        if (p.y > h + 30) ps[i] = spawn(false);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (effect === "snow") {
          ctx.shadowColor = "rgba(30, 30, 60, 0.18)"; ctx.shadowBlur = 3; // visible on light backgrounds too
          ctx.fillStyle = p.c; ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
        } else if (effect === "leaves") {
          ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(60, 25, 10, 0.5)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-p.r * 1.25, 0); ctx.lineTo(p.r, 0); ctx.stroke(); // stem + vein
        } else {
          ctx.rotate(p.a); ctx.scale(1, Math.cos(p.t * 4)); // tumbling
          ctx.fillStyle = p.c; ctx.globalAlpha = 0.9;
          ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        }
        ctx.restore();
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
