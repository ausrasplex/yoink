"use client";

import { useEffect } from "react";
import { celebrateWins } from "./celebrate";

/** Plays the theme's win celebration the first time this browser sees any of these won lots. Renders nothing. */
export function WinCelebration({ lots }: { lots: number[] }) {
  const key = lots.join(",");
  useEffect(() => {
    if (!key) return;
    const id = setTimeout(() => celebrateWins(key.split(",").map(Number)), 400); // let the page settle first
    return () => clearTimeout(id);
  }, [key]);
  return null;
}
