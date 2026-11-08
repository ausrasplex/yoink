/**
 * Themeable wording. Every string here can be replaced by a theme's theme.json ("copy": { key: "text" | ["option", …] }).
 * Keys a theme leaves out use these defaults. {placeholders} are filled from the variables passed in.
 * Client-safe (no server imports): the server resolves the active theme's copy and hands it to client components.
 *
 * To make another string themeable: add a key here with its default, then use it via copyFor()/useCopy().
 * THEMES.md lists the keys and their variables for theme authors.
 */
export const DEFAULT_COPY = {
  // Greetings
  welcomeBack: "Hi, {first}!", // dashboard greeting · {first} {name}
  signInHeadline: "Scan it. Love it. Bid on it.", // big headline on the sign-in screens (a Branding slogan overrides it unless the theme sets one)
  signInTagline: "Browse every item, place a bid in seconds, and get told the moment someone outbids you.",

  // Bidding
  placeBid: "Place bid",
  bidPlaced: "Bid of {amount} placed", // line under the bid dialog's title · {amount} {lot} {title} {first}
  bidDialogTitle: "Nice bid!", // dialog after a bid that makes you the highest bidder · {amount} {lot} {title} {first}
  bidDialogBody: "You're now the highest bidder on Lot {lot}: {title}. We'll let you know if someone outbids you.",
  bidDialogButton: "Got it",
  leadingTitle: "You're the highest bidder",
  leadingBody: "We'll email you if someone outbids you.",
  outbidTitle: "You've been outbid",
  outbidBody: "Place a higher bid to take the lead.",
  endedTitle: "Bidding has ended",
  wonBody: "Congratulations, you won this item!",
  lostBody: "Someone else won this one. Thanks for bidding.",

  // Bell notifications (header dropdown) · {lot} {title} {amount}
  notifyHeading: "Notifications",
  notifyOutbid: "You were outbid on Lot {lot}: {title}",
  notifyWon: "You won Lot {lot}: {title}!",
  notifyLost: "Lot {lot} ended: {title} went to another bidder",
  notifyEndingSoon: "Lot {lot} ends within the hour: {title}", // you've bid on it · {lot} {title} {amount}
  notifyNewItem: "New: Lot {lot}: {title}", // one new listing · {lot} {title}
  notifyNewItems: "{count} new items just added", // several at once · {count} {titles} (the first few names)
  notifyEmpty: "You're all caught up.",
  notifyMarkAll: "Mark all as read",

  // Emails
  outbidEmailSubject: "You've been outbid on Lot {lot}: {title}", // {lot} {title} {amount} {minBid} {name}
  outbidEmailBody: "Someone has bid {amount} on Lot {lot} ({title}), so you're no longer the highest bidder.",
  digestEmailSubject: "{items} in {auction}", // {items} = "3 new items" · {count} {auction}
  digestEmailIntro: "Here's what's been added since the last update:",
} as const;

export type CopyKey = keyof typeof DEFAULT_COPY;
export const COPY_KEYS = Object.keys(DEFAULT_COPY) as CopyKey[];
/** A theme's overrides, already validated: each key → one or more options. */
export type CopyTable = Partial<Record<CopyKey, string[]>>;
export type CopyVars = Record<string, string | number>;

/** Small stable hash, so "random" variants are the same for everyone on a given day (and on server + client). */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const fill = (text: string, vars: CopyVars) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** The text for `key` from a theme's copy table (falling back to the default), with {placeholders} filled. */
export function copyFor(table: CopyTable | undefined, key: CopyKey, vars: CopyVars = {}, day = new Date().toISOString().slice(0, 10)): string {
  const options = table?.[key];
  const text = options?.length ? options[hash(`${key}|${day}|${JSON.stringify(vars)}`) % options.length] : DEFAULT_COPY[key];
  return fill(text, vars);
}
