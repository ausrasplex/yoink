# Yoink themes

A theme changes how Yoink looks and talks for everyone: colours, images, a font, a falling effect and the wording of
bids, alerts and emails. Make one for Christmas, Halloween, your club's anniversary…

Themes are managed by the **Server Admin** on the **Server** page → **Themes**:

- **When to show:** *Automatic* switches themes on by their dates each year, or pick one theme to always show.
- **Preview** shows a theme in your browser only, so you can check it before anyone else sees it.
- **Install** a theme from a `.zip`, **Download** any theme as a `.zip` to edit it, **Delete** installed ones.
- **Starter template** downloads a theme with every wording key already filled in with the default text, plus these
  guides.

**Using ChatGPT, Claude or another AI?** Paste [AI-THEME-GUIDE.md](AI-THEME-GUIDE.md) into it and describe the theme
you want; it explains every rule so the AI can write a valid theme (including SVG images). The exact rules are also in
[theme.schema.json](theme.schema.json).

## What's in a theme

A folder (zipped up to install) with a `theme.json` and any images and font it uses, all side by side, no sub-folders:

```
my-theme/
  theme.json        required
  heading.woff2     optional font
  icon.png          optional images
  logo.svg
  background.webp
```

The folder's name becomes the theme's id (letters, numbers and dashes). Installing a theme with the same name as an
existing one replaces it — including the built-in themes (delete your copy to get the built-in one back).

Files allowed: images (PNG, JPEG, WebP, SVG), fonts (WOFF2, WOFF, TTF, OTF), plus notes (`.md` / `.txt` files and
`theme.schema.json`), which are kept but never served. Up to 40 files, 8 MB each, 30 MB in total. Every file is checked by its contents and SVGs are cleaned up, just
like logo uploads. Themes can't contain scripts or CSS.

## theme.json

```json
{
  "name": "Christmas",
  "description": "Snow, festive colours and a little Christmas cheer.",
  "active": { "from": "12-01", "to": "12-26" },
  "colours": { "ink": "#1d3b2c", "lilac": "#f2a7a3", "peach": "#fde4dc", "lime": "#f4c94a", "canvas": "#f4f1ea" },
  "images": { "icon": "icon.png", "logo": "logo.svg", "background": "background.webp" },
  "font": { "file": "heading.woff2", "use": "headings" },
  "effect": "snow",
  "copy": {
    "placeBid": "Bid for it 🎁",
    "outbidTitle": ["Someone snuck down the chimney!", "A rival elf just outbid you!"],
    "welcomeBack": "Merry bidding, {first}!"
  }
}
```

Only `name` is required. Everything else is optional — leave something out and the default is used.

| Field | What it does |
| --- | --- |
| `name` | Shown on the Server page. |
| `description` | A line about the theme, shown on the Server page. |
| `active` | `from` / `to` as `MM-DD`. In *Automatic* mode the theme switches on between those dates every year (in the venue's time zone). Can wrap past New Year (`12-20` → `01-05`). If two dated themes overlap, the shorter window wins. No `active` = only shows when chosen. |
| `colours` | Any of `ink` (text and dark surfaces), `lilac`, `peach`, `lime` (accents and main buttons) and `canvas` (page background), as `#rrggbb`. Keep `ink` dark: it's the text colour. |
| `images` | `icon` (square: browser tab and next to the name), `logo` (landscape, replaces icon + name), `background` (behind the whole app). Theme images win over the Branding uploads while the theme is on. |
| `font` | `file` in the folder, and `use`: `"headings"` (titles only — good for decorative fonts) or `"all"`. Check the font's licence allows it (Google Fonts' are fine). |
| `effect` | `none`, `snow`, `leaves`, `bats` or `confetti`. Off automatically for people whose device asks for reduced motion. |
| `copy` | Wording. Each key is a piece of text, or a list of options — one is picked per day, so it varies without changing mid-visit. |

## Wording keys

`{placeholders}` are filled in automatically. Unknown keys are rejected so typos don't go unnoticed.

| Key | Default | Placeholders |
| --- | --- | --- |
| `welcomeBack` | Hi, {first}! | `{first}` `{name}` — dashboard greeting |
| `signInHeadline` | Scan it. Love it. Bid on it. | big headline on the sign-in screens (beats the Branding slogan while the theme is on) |
| `signInTagline` | Browse every item, place a bid in seconds, and get told the moment someone outbids you. | |
| `placeBid` | Place bid | the bid button |
| `bidDialogTitle` | Nice bid! | `{amount}` `{lot}` `{title}` `{first}` — title of the dialog after a bid that puts you in the lead |
| `bidPlaced` | Bid of {amount} placed | same as above — the line under that dialog's title |
| `bidDialogBody` | You're now the highest bidder on Lot {lot}: {title}. We'll let you know if someone outbids you. | same as above |
| `bidDialogButton` | Got it | same as above — the dialog's button |
| `leadingTitle` | You're the highest bidder | `{lot}` |
| `leadingBody` | We'll email you if someone outbids you. | `{lot}` |
| `outbidTitle` | You've been outbid | `{lot}` |
| `outbidBody` | Place a higher bid to take the lead. | `{lot}` `{minBid}` |
| `endedTitle` | Bidding has ended | |
| `wonBody` | Congratulations, you won this item! | `{lot}` |
| `lostBody` | Someone else won this one. Thanks for bidding. | `{lot}` |
| `notifyHeading` | Notifications | the bell dropdown's heading |
| `notifyOutbid` | You were outbid on Lot {lot}: {title} | `{lot}` `{title}` `{amount}` (the new top bid) — bell notification |
| `notifyWon` | You won Lot {lot}: {title}! | `{lot}` `{title}` `{amount}` (winning bid) |
| `notifyLost` | Lot {lot} ended: {title} went to another bidder | `{lot}` `{title}` `{amount}` |
| `notifyEndingSoon` | Lot {lot} ends within the hour: {title} | `{lot}` `{title}` `{amount}` — sent to everyone who's bid on it |
| `notifyNewItem` | New: Lot {lot}: {title} | `{lot}` `{title}` — one new listing |
| `notifyNewItems` | {count} new items just added | `{count}` `{titles}` (the first few names) — several new listings at once |
| `notifyEmpty` | You're all caught up. | bell dropdown with nothing in it |
| `notifyMarkAll` | Mark all as read | |
| `outbidEmailSubject` | You've been outbid on Lot {lot}: {title} | `{lot}` `{title}` `{amount}` `{minBid}` `{name}` |
| `outbidEmailBody` | Someone has bid {amount} on Lot {lot} ({title}), so you're no longer the highest bidder. | same as above |
| `digestEmailSubject` | {items} in {auction} | `{items}` ("3 new items") `{count}` `{auction}` `{name}` — daily new-items email |
| `digestEmailIntro` | Here's what's been added since the last update: | `{count}` `{name}` |

## Built-in themes

Christmas (1–26 Dec, snow), Halloween (20 Oct – 1 Nov, bats), Autumn (Mar–May, leaves) and Britney (no dates,
confetti). Download one from the Server page to use as a starting point.
