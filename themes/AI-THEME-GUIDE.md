# Creating a Yoink theme: instructions for AI assistants

> **For people:** paste this whole file into ChatGPT, Claude, Gemini or another assistant, then ask for the theme you
> want, e.g. *"Make a Yoink theme for our school's 50th anniversary: navy and gold, confetti, proud but playful
> wording."* Zip up the folder it gives you and install it on the **Server** page → **Themes** → **Install**.
>
> **For AI assistants:** everything you need is below. Follow it exactly: the app validates every theme and rejects
> anything that breaks these rules, telling the user which field is wrong. The exact rules are also in
> `theme.schema.json` (JSON Schema, next to this file in the Yoink repository); validate against it if you can.

## What Yoink is

Yoink is a self-hosted silent-auction web app. Guests scan an item's QR code, sign in and bid from their phone. Each
item ("lot") has its own bidding window. Bidders get alerts when they're outbid, win or lose, and emails. A **theme**
changes the app's colours, images, font, a decorative falling effect, and the wording of those messages, for everyone,
for an occasion (Christmas, Halloween, a club anniversary…).

Themes are **data only**: a `theme.json` file plus optional image and font files. No code, no CSS.

## What to produce

Give the user a folder named after the theme (lowercase letters, numbers and dashes, e.g. `school-anniversary`)
containing:

1. **`theme.json`** (required). Valid JSON, UTF-8, no comments, no trailing commas.
2. **SVG files** you write yourself, *only if* the theme uses images (see "Images" for what's allowed).
3. A short list of anything the user must add themselves (a font file, or a PNG/JPEG they'd rather use).

Present each file in its own code block with its file name, then tell the user to put the files in one folder, zip the
**folder**, and install the zip from the Server page. Keep it to that: no build steps, no other files.

## theme.json

Only `name` is required. Leave out anything you don't need; the app's defaults fill the gaps.

```json
{
  "name": "Spring Fair",
  "description": "Pastel colours, falling petals and cheerful wording for the spring fair.",
  "active": { "from": "09-01", "to": "09-30" },
  "colours": { "ink": "#24324a", "lilac": "#c3b5f5", "peach": "#ffd9cf", "lime": "#9be38a", "canvas": "#f4f6f1" },
  "images": { "icon": "icon.svg", "logo": "logo.svg", "background": "background.svg" },
  "font": { "file": "heading.woff2", "use": "headings" },
  "effect": "leaves",
  "copy": {
    "welcomeBack": ["Happy spring, {first}!", "Welcome back, {first} 🌷"],
    "placeBid": "Bid & bloom"
  }
}
```

| Field | Type and rules |
| --- | --- |
| `name` | String, 1–60 characters. Shown to the Server Admin. |
| `description` | String, up to 200 characters. One sentence about the theme. |
| `active` | Object `{ "from": "MM-DD", "to": "MM-DD" }`, both required if present. Months `01`–`12`, days `01`–`31`, two digits each, joined by `-`. The theme switches itself on between those dates **every year** (in the venue's time zone) when the app is set to Automatic. The window may wrap past New Year (`"12-20"` → `"01-05"`). Leave `active` out for a theme that's only switched on by hand. The app is used in Australia by default (southern hemisphere: autumn is March–May, Christmas is in summer) unless the user says otherwise. |
| `colours` | Object with any of `ink`, `lilac`, `peach`, `lime`, `canvas`. Each exactly `#rrggbb` (six hex digits, no shorthand, no names, no alpha). See "Colours". |
| `images` | Object with any of `icon`, `iconDark`, `logo`, `logoDark`, `background`. Each is a **file name** in the same folder (no paths), matching `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.(png|jpg|jpeg|webp|svg)$`. Every file named here must be in the folder. |
| `font` | Object `{ "file": "…", "use": "headings" | "all" }`. `file` matches the same file-name rule but must end in `.woff2`, `.woff`, `.ttf` or `.otf`, and must be in the folder. `use` defaults to `"headings"`. |
| `effect` | One of `"none"` (default), `"snow"`, `"leaves"`, `"bats"`, `"confetti"`. Nothing else. |
| `copy` | Object of wording keys (below). Each value is a string (1–500 characters) or an array of 1–20 such strings. **Only the keys listed below are allowed**; any other key makes the whole theme invalid. |

No other top-level fields are allowed in spirit; unknown ones are ignored, so don't invent any.

## Colours

The app's look is built from five colours. A theme can replace any of them:

| Colour | Used for | Guidance |
| --- | --- | --- |
| `ink` | All body text, headings, dark panels (the bid panel, the dashboard hero), dark buttons | **Must be dark** (it's the text colour on light backgrounds, and white text sits on it). Aim for contrast ≥ 7:1 against `canvas` and white. Near-black navy, green, purple or brown work well. |
| `canvas` | Page background | **Must be light**, close to white (lightness ≥ 93%). Cards on top of it are white. |
| `lime` | Main accent: primary highlights, "winning" badges, the bid button on dark panels | A bright accent. Dark `ink` text sits on it, so keep it light-to-mid in brightness (contrast ≥ 4.5:1 with `ink`). |
| `lilac` | Secondary accent: avatars, tags, selected cards | A soft mid-light colour, readable with `ink` text on it. |
| `peach` | Tertiary accent: "outbid" alerts, notices | Soft and light, readable with `ink` text on it. |

Defaults (the original Yoink look): `ink #2a2742`, `lilac #b9a4fa`, `peach #fddfba`, `lime #e9f94c`, `canvas #f1f1f3`.

## Images

All optional. While the theme is on, theme images replace the app's Branding images. If your `icon` / `logo` is dark,
also provide `iconDark` / `logoDark` (light-coloured) so it shows up on dark areas; if it works on both, skip them.

| Key | What it is | Shape |
| --- | --- | --- |
| `icon` | Square app icon: browser tab, next to the app name | Square (1:1). Must read clearly at 32 px. |
| `logo` | Landscape logo that already includes the name; replaces icon + name in the sidebar, top bar and sign-in screens | Wide, about 4:1, shown 40–48 px high. |
| `iconDark` | Version of `icon` for dark backgrounds (the desktop sign-in panel is `ink`-coloured). Falls back to `icon`. | Square, light-coloured artwork. |
| `logoDark` | Version of `logo` for dark backgrounds. Falls back to `logo`. | Wide, light-coloured artwork. |
| `background` | Behind the whole app, covering the page (cards sit on top) | Subtle, light, low-contrast so text stays readable. A soft pattern or gentle gradient. |

**You can write SVG files yourself.** Uploaded SVGs are cleaned by the app; only these survive, so stick to them:

- Root `<svg xmlns="http://www.w3.org/2000/svg" viewBox="…">`. **Always include `viewBox`** (or numeric `width` and `height`); an SVG without a size is rejected.
- Elements: `g`, `defs`, `symbol`, `use`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `text`, `tspan`, `linearGradient`, `radialGradient`, `stop`, `pattern`, `clipPath`, `mask`, `filter` and `fe*` filter primitives, `title`, `desc`, `style`.
- `href` / `xlink:href` only to things inside the same file (`#id`). No external images, links or fonts.
- CSS (in `style` attributes or a `<style>` element) is fine, but `url()` may only point to `#id`. No `@import`.
- **Stripped:** `<script>`, event handlers (`onload`…), `<foreignObject>`, `<a>`, animation (`<animate>`, `<set>`…), external references. Don't use them; they'd just disappear.
- Text in SVG renders in the viewer's own fonts, so prefer shapes over text for logos, or keep text simple and bold.
- Keep files small (under 100 KB; the hard limit is 8 MB per file, 30 MB per theme).

Raster images (PNG, JPEG, WebP) are allowed too, but you can't produce them: if the user wants a photo or a raster
logo, tell them to add the file to the folder with the name used in `theme.json`.

## Font

A font file can't be written by an AI. If a font suits the theme, suggest one from **Google Fonts** (free, licensed for
this use) by name, and tell the user to download it, rename the file to the name you used (e.g. `heading.woff2`),
and put it in the folder. Use `"use": "headings"` for decorative or display fonts (titles only) and `"all"` only for
very readable text fonts. If the user can't add a font, **leave `font` out entirely**: naming a file that isn't in the
folder makes the theme invalid.

Allowed font files: `.woff2` (best), `.woff`, `.ttf`, `.otf`.

## Effect

One decorative animation drawn over the page (it never blocks clicks, and it's switched off for people who've asked
their device for reduced motion):

- `snow`: soft white flakes. Winter, Christmas.
- `leaves`: autumn-coloured leaves drifting and spinning. Autumn, harvest, nature.
- `bats`: dark bat silhouettes flapping across. Halloween, spooky.
- `confetti`: tumbling pieces in the theme's `lime`, `lilac` and `peach` plus pink and blue. Celebrations, parties, anniversaries.
- `none`: no animation.

## Wording (`copy`)

Each key below can be a single string or a list of options. With a list, one option is picked per day (the same for
everyone that day), so messages vary without changing mid-visit. Three to five options is plenty.

Use `{placeholders}` exactly as written (curly braces, case-sensitive). **Only the placeholders listed for a key are
filled in**; any other `{word}` is shown literally, so don't invent placeholders. You don't have to use any.

Emoji are fine (one per message is plenty; avoid them in `placeBid`, `bidDialogButton` and `notifyMarkAll` if the user
wants a tidy look).

| Key | Where it appears | Default | Placeholders | Keep it |
| --- | --- | --- | --- | --- |
| `welcomeBack` | Greeting at the top of the dashboard | Hi, {first}! | `{first}` first name, `{name}` full name | short, ≤ 40 chars |
| `signInHeadline` | Big headline on the sign-in screens | Scan it. Love it. Bid on it. | none | ≤ 40 chars |
| `signInTagline` | Line under that headline | Browse every item, place a bid in seconds, and get told the moment someone outbids you. | none | ≤ 120 chars |
| `placeBid` | The bid button | Place bid | none | **≤ 20 chars** |
| `bidDialogTitle` | Title of the pop-up after a bid that puts you in the lead | Nice bid! | `{amount}` `{lot}` `{title}` `{first}` | ≤ 40 chars |
| `bidPlaced` | Line under that pop-up's title | Bid of {amount} placed | `{amount}` `{lot}` `{title}` `{first}` | ≤ 60 chars |
| `bidDialogBody` | The pop-up's message | You're now the highest bidder on Lot {lot}: {title}. We'll let you know if someone outbids you. | `{amount}` `{lot}` `{title}` `{first}` | ≤ 160 chars |
| `bidDialogButton` | The pop-up's button | Got it | `{amount}` `{lot}` `{title}` `{first}` | **≤ 20 chars** |
| `leadingTitle` | Bid panel, while you're winning | You're the highest bidder | `{lot}` | ≤ 40 chars |
| `leadingBody` | Under that | We'll email you if someone outbids you. | `{lot}` | ≤ 80 chars |
| `outbidTitle` | Bid panel, after someone outbids you | You've been outbid | `{lot}` | ≤ 40 chars |
| `outbidBody` | Under that | Place a higher bid to take the lead. | `{lot}` `{minBid}` (lowest bid that would win it back) | ≤ 80 chars |
| `endedTitle` | Bid panel once the item has ended | Bidding has ended | none | ≤ 40 chars |
| `wonBody` | Under that, for the winner | Congratulations, you won this item! | `{lot}` | ≤ 80 chars |
| `lostBody` | Under that, for other bidders | Someone else won this one. Thanks for bidding. | `{lot}` | ≤ 80 chars |
| `notifyHeading` | Title of the notifications dropdown (bell) | Notifications | none | ≤ 25 chars |
| `notifyOutbid` | Notification: you were outbid | You were outbid on Lot {lot}: {title} | `{lot}` `{title}` `{amount}` (new top bid) | ≤ 90 chars |
| `notifyWon` | Notification: you won | You won Lot {lot}: {title}! | `{lot}` `{title}` `{amount}` (winning bid) | ≤ 90 chars |
| `notifyLost` | Notification: someone else won | Lot {lot} ended: {title} went to another bidder | `{lot}` `{title}` `{amount}` | ≤ 90 chars |
| `notifyEndingSoon` | Notification: an item you bid on ends within the hour | Lot {lot} ends within the hour: {title} | `{lot}` `{title}` `{amount}` (current top bid) | ≤ 90 chars |
| `notifyNewItem` | Notification: one new item was added | New: Lot {lot}: {title} | `{lot}` `{title}` | ≤ 90 chars |
| `notifyNewItems` | Notification: several new items were added | {count} new items just added | `{count}` `{titles}` (the first few names) | ≤ 90 chars |
| `notifyEmpty` | Dropdown with no notifications | You're all caught up. | none | ≤ 40 chars |
| `notifyMarkAll` | Dropdown button | Mark all as read | none | **≤ 20 chars** |
| `outbidEmailSubject` | Subject of the "you've been outbid" email | You've been outbid on Lot {lot}: {title} | `{lot}` `{title}` `{amount}` `{minBid}` `{name}` | ≤ 70 chars |
| `outbidEmailBody` | Opening line of that email (the app adds the link, closing time and sign-off) | Someone has bid {amount} on Lot {lot} ({title}), so you're no longer the highest bidder. | `{lot}` `{title}` `{amount}` `{minBid}` `{name}` | ≤ 250 chars, plain text |
| `digestEmailSubject` | Subject of the daily "new items" email | {items} in {auction} | `{items}` (e.g. "3 new items"), `{count}`, `{auction}` (the app's name), `{name}` | ≤ 70 chars |
| `digestEmailIntro` | Line before the list in that email | Here's what's been added since the last update: | `{count}` `{name}` | ≤ 120 chars, plain text |

### Writing the wording

- **Keep the meaning.** Every message still has to tell the person what happened (outbid, winning, won, ended, new item).
  Make it fun, never confusing. Someone skimming must still understand "you've been outbid".
- **Be kind.** Outbid and lost messages should nudge and encourage, never mock.
- **Stay inclusive.** Bidders are families, clubs and schools: no innuendo, swearing or anything that wouldn't suit a
  charity fundraiser.
- **Original text only.** You may reference song, film or book *titles* and well-known phrases, but don't quote song
  lyrics, scripts or other copyrighted text, and don't use trademarked logos or characters in images.
- **Emails are plain text.** No HTML or Markdown in `outbidEmailBody` / `digestEmailIntro`.
- Change as many or as few keys as suits the theme. Leaving a key out keeps the default.

## Example (complete)

Folder `retro-games/`:

`theme.json`

```json
{
  "name": "Retro Games",
  "description": "Pixel-arcade colours and wording for the gaming night fundraiser.",
  "colours": { "ink": "#1b1736", "lilac": "#a99cff", "peach": "#ffd2a6", "lime": "#7dffb0", "canvas": "#f2f1f8" },
  "images": { "icon": "icon.svg" },
  "effect": "confetti",
  "copy": {
    "welcomeBack": ["Player {first} has entered the game!", "Welcome back, {first}. Press start!"],
    "placeBid": "Insert bid",
    "bidDialogTitle": ["High score!", "Level up, {first}!"],
    "bidDialogButton": "Continue",
    "outbidTitle": "Game over… for now",
    "outbidBody": "Insert {minBid} to continue.",
    "wonBody": "Achievement unlocked: it's yours!",
    "notifyOutbid": "👾 New high score on Lot {lot}: {title}. Your turn!",
    "notifyWon": "🏆 Achievement unlocked: you won Lot {lot}: {title}!",
    "notifyEmpty": "No new messages, player one.",
    "outbidEmailSubject": "👾 Someone beat your score on Lot {lot}"
  }
}
```

`icon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1b1736"/>
  <path fill="#7dffb0" d="M16 24h8v-8h16v8h8v16h-8v8H24v-8h-8z"/>
  <rect x="24" y="28" width="6" height="6" fill="#1b1736"/>
  <rect x="34" y="28" width="6" height="6" fill="#1b1736"/>
</svg>
```

Then: put both files in a folder called `retro-games`, zip the folder, and install it from **Server → Themes → Install**.
Use **Preview** to check it before switching it on.

## Checklist before you answer

- [ ] `theme.json` is valid JSON with a `name` (≤ 60 chars).
- [ ] Every `copy` key is from the table above; no others. Every value is a string or a list of 1–20 strings.
- [ ] Only the listed placeholders are used for each key.
- [ ] Colours are `#rrggbb`. `ink` is dark, `canvas` is light, accents are readable with `ink` text.
- [ ] `active` dates (if any) are `MM-DD` and suit the occasion and hemisphere.
- [ ] `effect` is one of `none`, `snow`, `leaves`, `bats`, `confetti`.
- [ ] Every file named in `images` / `font` is provided (by you as SVG, or listed for the user to add). Otherwise
      remove that entry.
- [ ] SVGs have a `viewBox`, no scripts, links, animation or external references.
- [ ] Short labels (`placeBid`, `bidDialogButton`, `notifyMarkAll`) are ≤ 20 characters.
- [ ] Wording is original, kind, family-friendly, and still clearly says what happened.
- [ ] You told the user how to zip and install it.
