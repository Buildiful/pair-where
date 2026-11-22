# Pair Where?

**Match the pairs. Sort the numbers. Beat your best time.**

A lightweight, responsive browser-based puzzle game by Buildiful®. No account, installation, external game library, or server-side game logic required.

## Play

1. Press **Start game**. Flip two facedown cards at a time. Matched characters stay face up. The timer starts immediately and continues across both stages.
2. After all pairs have been found, arrange the cards in ascending order, from the top-left across each row to the bottom-right. Select one card, then select an *orthogonally adjacent* card (up, down, left or right) to exchange their positions. Diagonal swaps are not allowed.
3. The round finishes when all cards are ordered. Your elapsed time is recorded; fewer seconds is better. Swap count is shown as an additional stat. Personal best and muted state are saved locally when browser storage is available.

The front of every card shows a number. Cards `1–2` share a character, `3–4` share another, and so on through `35–36`.

## Deploy

Place the **contents of this directory** at the root of the `pair-where` GitHub Pages path (for example, the `pair-where` directory of your GitHub Pages repository), or serve locally using:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The gameplay uses local JavaScript and image files and does not require build tools. GA4 only loads on the configured official host, subject to regional privacy rules and browser controls.

## Replace character PNGs

The live images are located in `assets/characters/01.png` through `18.png`. Replace these **18 files** with your licensed illustrations, keeping the same names, and the game will use them without further code changes. Square transparent images around 512 × 512 work well.

This release ships with generic robot stand-ins rather than official Beebbot art. Fork-friendly originals are also stored in `assets/example-characters/` as reusable PNG files and editable SVGs. See the READMEs within each folder. Official Beebbot images, if later installed in `assets/characters/`, remain rights-reserved and are **not** included in the MIT grant, even though the public game must serve the artwork to browsers.

The 36 numeric labels are rendered by the app and **do not** need to be baked into the PNGs.

## Structure

- `index.html`, `styles.css`, `js/game.js` — standalone game and interface.
- `js/buildiful-analytics.js` — Buildiful Analytics v2.1.0 module (see `ANALYTICS.md`).
- `assets/characters/` — current image set, one numbered PNG per character.
- `assets/example-characters/` — MIT-licensed example artwork for forks.
- `assets/buildiful-logo-white.png` and favicon files — official reserved brand assets.
- `privacy.html` — privacy and analytics disclosure.

## Stopwatch and appearance

Elapsed time, personal best and the final time use `MM:SS.hh` with two digits of hundredths, like a digital stopwatch (and an hour prefix for exceptionally long sessions). Card fronts use a neutral light-gray background.

## Accessibility & audio

Cards are native buttons usable with Tab, Enter and Space. Swaps are performed by choosing one card and an adjacent card; no drag-and-drop is necessary. Audio feedback is synthesized locally through the Web Audio API after a user gesture. Sound can be turned off, and the preference is remembered when storage is available. Motion is reduced if the browser's reduced-motion setting is enabled.

## Privacy

Gameplay runs within the browser. No moves, character selections, player names, or gameplay arrangements are transmitted by the game. The best time and sound preference are stored only on the player's device. Official-site GA4 measurement is restricted to approved, parameter-free events: `game_started`, `tier_two_reached` and `game_completed`. See `privacy.html` and `ANALYTICS.md` for the network services and regional consent details.

## Licensing

Game source and generic example character artwork: [MIT License](./LICENSE). Buildiful® and official Beebbots character art, marks, logos and favicons: **rights reserved**, excluded from MIT. This also applies to any official artwork added to `assets/characters/`. See [TRADEMARKS.md](./TRADEMARKS.md) for details.
