/** Theme effect names (client-safe: used by theme.json validation and by the canvas code). See themes/THEMES.md. */

/** Background effect, running all the time. */
export const EFFECTS = ["none", "snow", "leaves", "bats", "confetti", "hearts", "bubbles", "stars", "fireworks"] as const;
export type Effect = (typeof EFFECTS)[number];

/** One-off burst when a bid makes you the highest bidder, and a bigger one when you win an item. */
export const CELEBRATIONS = ["none", "confetti", "hearts", "stars", "snow", "leaves", "fireworks"] as const;
export type Celebration = (typeof CELEBRATIONS)[number];
