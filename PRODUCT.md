# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing codebase answers the stack; recorded because the store is dual-runtime and the split is load-bearing.

- Store: React 18 + Vite 5 + `react-router-dom` 6 (`HashRouter`), plain JavaScript/JSX, no TypeScript.
- Navinha: custom Canvas 2D engine (`game/engine.js`, a Phaser-shaped API), wrapped by React screens in `src/screens/`.
- Defesa da Terra: Phaser 3.87, vendored locally as a 1.19 MB `phaser.min.js`, loaded as ordered classic `<script>` tags exposing globals (`window.DO3`, `window.AudioSys`, `window.__game`). Lives in a separate repository and is consumed as a static copy inside an `<iframe>`.
- No test framework in the Navinha repo. The Defesa da Terra repo has headless `smoke-v3.js` and Playwright `playwright-test.js`, which must keep passing against the original repository.

## Users

Primary: **a portfolio showcase**. The author presents the work to prospective clients, evaluators, and recruiters; the goal is to impress, not to convert. The person landing on the page is being shown the work, usually arriving from a link and giving it a short, evaluative look.

Secondary: players. Someone who came to play one of the two games. They must be able to get into a game from any page with one click and no account, no download, and no external service.

## Product Purpose

ÓRBITA is a storefront for two self-made games that run entirely in the browser: **Navinha — Campanha Orbital** (vertical shoot'em up, 10 ships, 16 enemies, 4 bosses, 25 stages) and **Defesa da Terra — ULTRA** (space tower defense, 15 maps, 3 difficulties, 10 tower types).

The store exists so the work can be evaluated as a body of work rather than as two unexplained repositories. Success means a visitor understands what exists, judges the craft from real screenshots rather than promises, and can start playing immediately.

## Positioning

**Zero friction.** No download, no launcher, no store account, no DRM, no install. Both games run from a link. The store sells nothing and fakes nothing; there is no cart and no checkout.

A second, unusual property: both games are 100% procedural — every sprite is drawn from code at runtime and all audio is synthesized with the Web Audio API. There is not a single PNG or MP3 in either game's source.

## Operating Context

Single-author project. The store, both games, and their copy are in Portuguese (Brazil) and stay that way. The author develops on Windows and runs the site with `npm run dev` (Vite, 127.0.0.1:5173).

Support is voluntary and goes through PIX. The PIX key is currently the literal placeholder `COLE_SUA_CHAVE_PIX_AQUI` and the copy-to-clipboard control is hidden while it is a placeholder.

## Capabilities and Constraints

- The store must not modify, re-host as a fork, or break the separate Defesa da Terra repository. Its copy is byte-for-byte; load order of its classic scripts is critical and preserved.
- Each game keeps its own `localStorage` save under its own key (`navinha_orbital_v1`, `defesa_orbital_v3`). The store must not merge, migrate, or reset either save.
- Both games are keyboard-and-touch playable on mobile. The Navinha canvas is portrait (450×800); the Defesa da Terra board is landscape.
- All artwork in the games is generated at runtime, so there are no shipping art files to reuse for marketing. Store imagery must be produced by capturing the running games.
- Interface copy is PT-BR.
- Support is the only monetization. There is no purchase flow of any kind.
- Undecided: whether the store gains a third game later. The "em breve" card is present but has no target.

## Brand Commitments

- The store is named **ÓRBITA**. Confirmed by the author; treat as binding.
- The two game names are fixed: **Navinha — Campanha Orbital** and **Defesa da Terra — ULTRA**.
- The PIX block must stay honest: while the key is a placeholder, the store must not present itself as able to take payment. Do not fabricate a revenue total, a supporter count, or a payment link.

## Evidence on Hand

- Real gameplay is the primary evidence: both games are runnable locally, so screenshots can be captured from actual play rather than mocked up.
- Verified content counts exist in the code: Navinha's 10 ships / 16 enemies / 4 bosses / 25 stages (`game/game-data.js`), and Defesa da Terra's 15 maps / 3 difficulties / 10 tower types (`assets/data.js`).
- Both repositories are on GitHub and are self-contained.
- **Absent, and must not be fabricated:** player counts, sales or revenue figures, reviews or ratings, awards, press mentions, playtime data, testimonials, or a launch date. There is no store listing, no wishlist count, and no live payment link.

## Product Principles

1. **Show, don't claim.** Every capability on a page is backed by something a visitor can verify — a real screenshot, a real count from the code, or a link to play.
2. **One click to play.** From any page, the path to a running game is one action. No account, no download, no interstitial.
3. **Never fake a transaction.** No cart, no "add to library", no purchase button, no invented social proof. The only money is the PIX support block, and it tells the truth about its own state.
4. **Two games, one reading experience.** The store presents the portfolio as a single body of work, so a visitor moving between the two titles should feel one storefront, not two sites.
5. **Respect the boundaries of the source.** The separate game repository is a dependency to be copied and framed, never rewritten. Games ship with their saves and their own behavior intact.

## Accessibility & Inclusion

Keyboard navigation and touch controls are the established baseline inside the games and must be preserved. The store itself must remain usable by keyboard and legible at mobile widths.
