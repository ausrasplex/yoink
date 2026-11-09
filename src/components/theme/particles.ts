/**
 * Canvas shapes shared by the background effects (theme-effect.tsx) and the one-off celebration bursts (celebrate.ts).
 * Each draws one particle centred on 0,0 of an already-translated context, `r` being its rough radius in CSS px.
 */

export type Shape = "dot" | "confetti" | "leaf" | "heart" | "star" | "spark" | "bubble";

export function colourVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** The theme's accent colours plus two bright extras: what confetti, fireworks and bursts are made of. */
export function partyColours() {
  return [colourVar("--lime", "#e9f94c"), colourVar("--lilac", "#b9a4fa"), colourVar("--peach", "#fddfba"), "#ff7aa2", "#5ec8f2"];
}

/** Fireworks: the theme's two strongest accents plus saturated extras (pale colours wash out on light pages). */
export function fireworkColours() {
  return [colourVar("--lime", "#e9f94c"), colourVar("--lilac", "#b9a4fa"), "#ff4f86", "#2f9bf0", "#ff9a1f", "#ffcc33"];
}

/** A firework spark: a solid core with a soft halo (no drop shadow, which turns tiny dots muddy). */
export function drawSpark(ctx: CanvasRenderingContext2D, r: number, colour: string) {
  ctx.fillStyle = colour;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.25;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
}

export const LEAF_COLOURS = ["#d9772b", "#b8461c", "#e0a526", "#8f3a1a", "#c9682f"];
export const HEART_COLOURS = ["#ff5c8a", "#ff7aa2", "#ff9ec0", "#e63e6d"];

function heartPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.9);
  ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.4, -r * 0.1, 0, r * 0.9);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, r: number, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? r * inner : r;
    const a = (Math.PI * i) / points - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
}

/** `spin` rotates; `tumble` (−1…1) squashes vertically for a flipping look (confetti). */
export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, r: number, colour: string, spin = 0, tumble = 1) {
  ctx.rotate(spin);
  ctx.fillStyle = colour;
  switch (shape) {
    case "dot":
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      break;
    case "confetti":
      ctx.scale(1, tumble);
      ctx.fillRect(-r / 2, -r / 4, r, r / 2);
      break;
    case "leaf":
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(60, 25, 10, 0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r * 1.25, 0); ctx.lineTo(r, 0); ctx.stroke(); // stem + vein
      break;
    case "heart":
      ctx.scale(tumble === 1 ? 1 : 0.85 + 0.15 * Math.abs(tumble), 1);
      heartPath(ctx, r); ctx.fill();
      break;
    case "star":
      starPath(ctx, r); ctx.fill();
      break;
    case "spark": // four-point glint
      starPath(ctx, r, 4, 0.25); ctx.fill();
      break;
    case "bubble":
      ctx.strokeStyle = colour; ctx.lineWidth = Math.max(1, r / 9);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha *= 0.18; ctx.fill();
      ctx.globalAlpha /= 0.18;
      ctx.fillStyle = "rgba(255,255,255,0.8)"; // highlight
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, Math.PI * 2); ctx.fill();
      break;
  }
}
