# ÓRBITA Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Navinha landing page into ÓRBITA, a two-game storefront, and add the Defesa da Terra (Phaser) game as a second playable title inside the same Vite/React app.

**Architecture:** The existing React 18 + Vite + `HashRouter` app in `navinha-mvp/` becomes the store. The store is a set of new files under `src/store/`. The Defesa da Terra game is copied byte-for-byte into `public/defesa/` and runs in an `<iframe>`, which keeps its Phaser globals isolated from React. Store imagery is real screenshots of both games captured with Playwright.

**Tech Stack:** React 18, `react-router-dom` 6 (HashRouter), Vite 5, plain JavaScript/JSX (no TypeScript), Playwright (devDependency, screenshot capture only).

## Global Constraints

- Copy is PT-BR (Brazilian Portuguese). All store UI text is PT-BR. Do not write English UI copy.
- Visual world: ground `#0d0d0d`, ink `#f2f0e9`, signal red `#d81f1f` and **no other color**. Three colors only.
- `border-radius: 0` everywhere. No `box-shadow`. No CSS gradients as decoration.
- Borders/rules are 3px (`--rule: 3px`).
- Display typeface: Archivo Black. Monospace for every label, figure, and metadata: JetBrains Mono. Both self-hosted from `public/assets/fonts/`.
- Routes: `/`, `/navinha`, `/defesa`, `/jogar/navinha`, `/jogar/defesa`, `/em-breve`. HashRouter, so real URLs are `/#/…`.
- The store has **no cart, no checkout, no purchase button, no "add to library"**, and no invented social proof (no player counts, ratings, reviews, awards, or press).
- The PIX support block appears **only** in the home footer. It keeps the literal placeholder key `COLE_SUA_CHAVE_PIX_AQUI` and the copy button stays hidden while the key is a placeholder.
- `public/defesa/` is a byte-for-byte copy of `C:\Users\adolf\Desktop\hermes`. **Never edit** any file there and never edit the source repository.
- Each game keeps its own `localStorage` key: `navinha_orbital_v1` and `defesa_orbital_v3`. The store never writes, migrates, or resets either.
- Counts displayed are these verified values, read from the game sources. Do not invent others.

  | Navinha | Defesa da Terra |
  |---|---|
  | 10 naves, 16 inimigos, 4 chefes | 10 torres, 16 **tipos** de inimigo, 15 mapas |
  | 5 campanhas, 25 fases | 3 dificuldades |

  The Defesa da Terra menu claims "50 NÍVEIS · 100 ALIENS" as a subtitle. That is
  marketing copy inside the game, not a value readable from its data, so the
  store does not repeat it. Its `ENEMIES_DATA` holds 16 distinct enemy types.

- This directory is **not a git repository** (`git rev-parse` fails). Tasks that say "commit" instead use the verification step described in each task.
- Dev server is `npm run dev` on `127.0.0.1:5173` (already configured in `vite.config.js`).

---

## File Structure

```
navinha-mvp/
├── index.html                          MODIFY  add store font preloads, retitle
├── public/
│   ├── fonts/                          existing TTF files
│   ├── store/                          NEW  real screenshots (created by Task 6)
│   │   ├── navinha/{capsula,1,2,3}.png
│   │   └── defesa/{capsula,1,2,3}.png
│   └── defesa/                         DONE  Hermes copy, already verified 13/13 hashes
├── src/
│   ├── App.jsx                         MODIFY  new routes
│   ├── store/
│   │   ├── catalogo.js                 NEW  single source of truth for both games
│   │   ├── store.css                   NEW  the whole visual world
│   │   ├── StoreHome.jsx               NEW  home = instrument readout
│   │   ├── GameDetail.jsx              NEW  detail = oscilloscope channel
│   │   ├── PlayPage.jsx                NEW  dispatches to navinha canvas or defense iframe
│   │   ├── SupportBand.jsx             NEW  the PIX footer block
│   │   └── SoonPage.jsx                NEW  the "em breve" page
│   └── pages/
│       ├── LandingPage.jsx             DELETE old landing, content moved to GameDetail
│       └── GamePage.jsx                MODIFY  back link only
└── tools/
    └── capturas.mjs                    NEW  Playwright screenshot capture
```

Component responsibility, one concern each:

- `catalogo.js` — data only. No JSX. Both the home and the detail page read from it, so text edits happen in one place.
- `store.css` — all styling. No inline styles anywhere in the store components.
- `StoreHome.jsx` — the readout band and the channel rows.
- `GameDetail.jsx` — one game's detail page, parameterized by `:id`.
- `PlayPage.jsx` — decides which game runtime to mount, and owns the iframe timeout.
- `SupportBand.jsx` — PIX only.
- `SoonPage.jsx` — the "em breve" destination.

---

## Task 1: Font faces and store entry HTML

**Files:**
- Create: `public/css/store-fonts.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: CSS custom properties available to every later task — `--store-ground`, `--store-ink`, `--store-red`, `--store-rule`, `--store-display`, `--store-mono` — and the font families `Archivo Black` and `JetBrains Mono`.

- [ ] **Step 1: Verify the Archivo Black file is not present yet**

Run:
```powershell
Get-ChildItem public\assets\fonts -Filter *.ttf | Select-Object Name
```
Expected: ten `.ttf` files named `f0.ttf`, `f1.ttf`, `g100.ttf`–`g107.ttf`. No Archivo Black file.

- [ ] **Step 2: Download Archivo Black into the fonts directory**

Run:
```powershell
$css = Invoke-WebRequest -Uri "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap" -UseBasicParsing
$url = ([regex]::Match($css.Content, 'url\((https://[^)]+\.woff2)\)')).Groups[1].Value
"woff2: $url"
Invoke-WebRequest -Uri $url -OutFile public\assets\fonts\g108.woff2 -UseBasicParsing
(Get-Item public\assets\fonts\g108.woff2).Length
```
Expected: a positive byte count, printed. If `$url` is empty the stylesheet request was blocked; ask the user rather than guessing a font URL.

- [ ] **Step 3: Write `public/css/store-fonts.css`**

Create the file with exactly this content:

```css
/* Self-hosted store faces. Archivo Black for display figures, JetBrains Mono for
   every label, figure and measurement. No external font request at runtime. */
@font-face {
  font-family: 'Archivo Black';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(../assets/fonts/g108.woff2) format('woff2');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(../assets/fonts/g100.ttf) format('truetype');
}
@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(../assets/fonts/g101.ttf) format('truetype');
}
```

- [ ] **Step 4: Link the stylesheet and fix the missing pixel-font link in `index.html`**

Replace the whole file with:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ÓRBITA — dois jogos que rodam no navegador</title>
  <meta name="description" content="Navinha, um shoot'em up vertical de 25 fases, e Defesa da Terra, um tower defense de 15 mapas. Ambos grátis, sem download e sem conta.">
  <meta name="theme-color" content="#0d0d0d">
  <link rel="icon" type="image/png" href="/assets/ship_falcao.png">
  <link rel="preload" href="/assets/fonts/g108.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/store-fonts.css">
  <link rel="stylesheet" href="/css/fonts.css">
  <link rel="stylesheet" href="/css/game-fonts.css">
  <link rel="stylesheet" href="/css/venda.css">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

Note: `css/fonts.css` was previously never linked, which is why Press Start 2P fell back to a system mono on the old landing page. The games still use VT323, so the file is linked now.

- [ ] **Step 5: Verify the dev server serves the font and the HTML**

Run:
```powershell
npm run dev
```
Then in a second shell:
```powershell
(Invoke-WebRequest http://127.0.0.1:5173/css/store-fonts.css -UseBasicParsing).StatusCode
(Invoke-WebRequest http://127.0.0.1:5173/assets/fonts/g108.woff2 -UseBasicParsing).StatusCode
```
Expected: `200` and `200`. If the woff2 returns `404`, the download in Step 2 wrote to the wrong path.

---

## Task 2: The catalog data module

**Files:**
- Create: `src/store/catalogo.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `CATALOGO` (array of two game objects), `JOGOS` (object keyed by id), `soonEntry` (the third, unavailable entry), and `getJogo(id)` which returns a game object or `null`.

Each game object has exactly these fields, and later tasks rely on every one of them:

```
{
  id,            // 'navinha' | 'defesa'   — used in routes and image paths
  seq,           // 1 | 2                    — the channel number on the home
  canal,         // 'CH1' | 'CH2'
  titulo,        // display title, uppercase, no subtitle
  nome,          // full name for the detail page
  genero,        // short genre label for the home row
  generoLongo,   // full genre sentence for the detail page
  descricao,     // 2–3 sentences, factual, no adjectives that cannot be verified
  medidas: [     // the metered readings; each drives one segmented meter
    { rotulo, valor, total, alerta }   // valor/total drive the meter; alerta paints it red
  ],
  ficha: [ { rotulo, valor } ],        // the detail page's specification segments
  controles: [ { tecla, descricao } ], // the control chips
  screenshots: [ '1', '2', '3' ],      // file names without extension, under public/store/<id>/
  progresso: { chave, total, ler }     // localStorage key, stage total, progress reader name
}
```

`progresso.ler` names a function exported by `src/store/progresso.js` (Task 3), never a raw `localStorage` read.

- [ ] **Step 1: Create `src/store/catalogo.js` with both games**

Create the file with exactly this content:

```js
// Single source of truth for the store. Every count here was read from the game's
// own data file: game/game-data.js for Navinha, assets/data.js for Defesa da
// Terra. Nothing in this file is estimated, and nothing may be invented.
import { lerNavinha, lerDefesa } from './progresso.js';

export const CATALOGO = [
  {
    id: 'navinha',
    seq: 1,
    canal: 'CH1',
    titulo: 'NAVINHA',
    nome: 'Navinha — Campanha Orbital',
    genero: "SHOOT'EM UP VERTICAL",
    generoLongo: "Shoot'em up vertical, estilo PlayStation 1.",
    descricao:
      'Dez naves com duas especialidades cada, dezesseis inimigos, quatro chefes e vinte e cinco fases distribuídas em cinco campanhas. Durante a partida você coleta power-ups e escolhe entre quatro melhorias que sobem até o nível dez.',
    medidas: [
      { rotulo: 'FASES', valor: 25, total: 25 },
      { rotulo: 'NAVES', valor: 10, total: 10 },
      { rotulo: 'CHEFES', valor: 4, total: 10, alerta: true }
    ],
    ficha: [
      { rotulo: 'CLASSE', valor: "Shoot'em up vertical" },
      { rotulo: 'VOLUME', valor: '25 fases · 5 campanhas' },
      { rotulo: 'NAVES', valor: '10, com 2 especialidades cada' },
      { rotulo: 'INIMIGOS', valor: '16 tipos, 4 deles chefes' },
      { rotulo: 'PROGRESSÃO', valor: '4 melhorias, até o nível 10 por partida' },
      { rotulo: 'REQUISITOS', valor: 'Nenhum. Roda no navegador.' }
    ],
    controles: [
      { tecla: 'SETAS', descricao: 'mover a nave' },
      { tecla: 'WASD', descricao: 'mover a nave' },
      { tecla: 'TIRO', descricao: 'automático' },
      { tecla: 'X', descricao: 'bomba' },
      { tecla: 'M', descricao: 'silenciar' },
      { tecla: 'ESC', descricao: 'menu' },
      { tecla: 'TOQUE', descricao: 'controle na tela' }
    ],
    screenshots: ['1', '2', '3'],
    progresso: { chave: 'navinha_orbital_v1', total: 25, ler: lerNavinha }
  },
  {
    id: 'defesa',
    seq: 2,
    canal: 'CH2',
    titulo: 'DEFESA DA TERRA',
    nome: 'Defesa da Terra — ULTRA',
    genero: 'TOWER DEFENSE',
    generoLongo: 'Tower defense espacial num tabuleiro de 21 por 13 casas.',
    descricao:
      'Quinze mapas do sistema solar, três dificuldades, dez torres que fundem entre si ao subir de nível e um sistema de frota com combustível, bateria e munição. A horda anda por um caminho fixo; você decide onde gastar.',
    medidas: [
      { rotulo: 'MAPAS', valor: 15, total: 15 },
      { rotulo: 'TORRES', valor: 10, total: 10 },
      { rotulo: 'TIPOS DE INIMIGO', valor: 16, total: 20, alerta: true }
    ],
    ficha: [
      { rotulo: 'CLASSE', valor: 'Tower defense' },
      { rotulo: 'VOLUME', valor: '15 mapas do sistema solar' },
      { rotulo: 'TORRES', valor: '10, que fundem entre si ao evoluir' },
      { rotulo: 'INIMIGOS', valor: '16 tipos, com nível próprio cada' },
      { rotulo: 'DIFICULDADES', valor: '3' },
      { rotulo: 'FROTA', valor: 'Combustível, bateria e munição' },
      { rotulo: 'REQUISITOS', valor: 'Nenhum. Roda no navegador.' }
    ],
    controles: [
      { tecla: 'MOUSE', descricao: 'posicionar e melhorar torres' },
      { tecla: 'ARRastar', descricao: 'mover a vista do tabuleiro' },
      { tecla: 'M', descricao: 'silenciar' },
      { tecla: 'ESC', descricao: 'pausar' },
      { tecla: 'CELULAR', descricao: 'vira a tela na horizontal' }
    ],
    screenshots: ['1', '2', '3'],
    progresso: { chave: 'defesa_orbital_v3', total: 15, ler: lerDefesa }
  }
];

// The third row on the home. It has no game, no route and no images — it exists
// only to say the store is not finished. Keep it visibly unavailable.
export const soonEntry = {
  id: 'em-breve',
  titulo: 'EM BREVE',
  descricao: 'A vitrine ainda vai crescer.'
};

export const JOGOS = CATALOGO.reduce((acc, j) => {
  acc[j.id] = j;
  return acc;
}, {});

export function getJogo(id) {
  return Object.prototype.hasOwnProperty.call(JOGOS, id) ? JOGOS[id] : null;
}
```

- [ ] **Step 2: Verify the catalog parses and both games load**

Run:
```powershell
node --input-type=module -e "import('./src/store/catalogo.js').then(m=>console.log(m.CATALOGO.map(j=>j.id+':'+j.medidas.length).join(' ')))"
```
Expected: `navinha:3 defesa:3`. If this errors with a module-not-found for `./progresso.js`, that is expected until Task 3 — confirm the only error is that one, then continue.

---

## Task 3: Progress readers

**Files:**
- Create: `src/store/progresso.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `lerNavinha()` and `lerDefesa()`, each returning `{ feito, total }` with both values integers. Both are referenced by `catalogo.js`, which already exists.

These functions **read only**. Neither writes, migrates, or resets a save. A missing, malformed, or unreadable save yields `feito: 0` rather than throwing.

- [ ] **Step 1: Write a failing check for the read-only guarantee**

Create `tools/check-progresso.mjs` with exactly this content:

```js
import { lerNavinha, lerDefesa } from '../src/store/progresso.js';

function chave(k) { return 'PT' + k; }

let falhas = 0;
function ok(nome, cond) {
  if (cond) { console.log('ok   ' + nome); }
  else { console.log('FALHA ' + nome); falhas++; }
}

// Sem save nenhum, os dois devolvem zero e não explodem.
ok('navinha sem save', JSON.stringify(lerNavinha()) === '{"feito":0,"total":25}');
ok('defesa sem save', JSON.stringify(lerDefesa()) === '{"feito":0,"total":15}');

// Um save do Navinha: unlocked = 11 significa 11 fases liberadas de 25.
localStorage.setItem('navinha_orbital_v1', JSON.stringify({ unlocked: 11, high: 900 }));
ok('navinha com unlocked 11', JSON.stringify(lerNavinha()) === '{"feito":11,"total":25}');

// Um save da Defesa: o jogo grava `unlockedMap` com Math.max(1, ...) e padrão 1,
// então o valor JÁ É a contagem de mapas liberados. 4 = quatro de quinze.
localStorage.setItem('defesa_orbital_v3', JSON.stringify({ unlockedMap: 4, crystals: 12 }));
ok('defesa com unlockedMap 4', JSON.stringify(lerDefesa()) === '{"feito":4,"total":15}');

// Um jogador novo tem unlockedMap 1: um mapa liberado, o primeiro.
memoria.clear();
localStorage.setItem('defesa_orbital_v3', JSON.stringify({ unlockedMap: 1 }));
ok('defesa com jogador novo', JSON.stringify(lerDefesa()) === '{"feito":1,"total":15}');

// Lixo não pode virar progresso.
localStorage.setItem('navinha_orbital_v1', '{{{nao e json');
ok('navinha com lixo', JSON.stringify(lerNavinha()) === '{"feito":0,"total":25}');
localStorage.setItem('defesa_orbital_v3', '{"unlockedMap":"dez"}');
ok('defesa com tipo errado', JSON.stringify(lerDefesa()) === '{"feito":0,"total":15}');

// O save não pode ser reescrito pela leitura. Cada um dos dois é conferido
// contra o valor exato que foi gravado acima, porque o teste suja os dois com
// lixo na bloco anterior.
localStorage.setItem('navinha_orbital_v1', '{"unlocked":11,"high":900}');
localStorage.setItem('defesa_orbital_v3', '{"unlockedMap":4,"crystals":12}');
const antesNav = localStorage.getItem('navinha_orbital_v1');
const antesDef = localStorage.getItem('defesa_orbital_v3');
lerNavinha(); lerNavinha(); lerDefesa(); lerDefesa();
ok('save do navinha intacto apos leitura', localStorage.getItem('navinha_orbital_v1') === antesNav);
ok('save da defesa intacto apos leitura', localStorage.getItem('defesa_orbital_v3') === antesDef);

// E a leitura não pode inventar campos nem normalizar o que já existe.
ok('navinha preserva o save inteiro', localStorage.getItem('navinha_orbital_v1') === '{"unlocked":11,"high":900}');
ok('defesa preserva o save inteiro', localStorage.getItem('defesa_orbital_v3') === '{"unlockedMap":4,"crystals":12}');

console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' FALHA(S)');
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Add the test's storage stub before its imports run**

Prepend this shim to `tools/check-progresso.mjs`, immediately after the import on line 1 and before the `ok` helper:

```js
// Node has no localStorage; give the readers a Map-backed one.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k)
};
```

- [ ] **Step 3: Run the check and confirm it fails**

Run:
```powershell
node tools/check-progresso.mjs
```
Expected: the file resolves but every assertion fails, because `src/store/progresso.js` does not exist yet — Node reports the missing module on the first import. That is the failure we want before implementing.

- [ ] **Step 4: Implement `src/store/progresso.js`**

Create the file with exactly this content:

```js
// Leitura do progresso de cada jogo, direto do save que o próprio jogo gravou.
// Estas funções são SOMENTE LEITURA: nunca escrevem, nunca migram, nunca
// resetam. Um save ausente, corrompido ou de outro formato devolve zero.

const CHAVE_NAVINHA = 'navinha_orbital_v1';
const CHAVE_DEFESA = 'defesa_orbital_v3';
const TOTAL_NAVINHA = 25;
const TOTAL_DEFESA = 15;

function lerChave(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    return dados && typeof dados === 'object' ? dados : null;
  } catch (e) {
    return null;
  }
}

function inteiro(valor) {
  const n = Number(valor);
  return isFinite(n) ? Math.floor(n) : 0;
}

function limitado(valor, min, max) {
  return Math.max(min, Math.min(max, inteiro(valor)));
}

// Navinha grava `unlocked`: o índice linear da próxima fase ainda bloqueada,
// numeração de 0 a 24. 0 significa nada liberado.
export function lerNavinha() {
  const d = lerChave(CHAVE_NAVINHA);
  const feito = d ? limitado(d.unlocked, 0, TOTAL_NAVINHA) : 0;
  return { feito, total: TOTAL_NAVINHA };
}

// Defesa da Terra grava `unlockedMap`: o jogo faz `Math.max(1, ...)` com padrão 1
// e teto em MAPS_DATA.length, então o valor JÁ É a contagem de mapas liberados.
// Não subtraímos nada: unlockedMap 4 significa quatro mapas liberados.
export function lerDefesa() {
  const d = lerChave(CHAVE_DEFESA);
  const feito = d ? limitado(d.unlockedMap, 0, TOTAL_DEFESA) : 0;
  return { feito, total: TOTAL_DEFESA };
}
```

- [ ] **Step 5: Run the check and confirm it passes**

Run:
```powershell
node tools/check-progresso.mjs
```
Expected: ten `ok` lines, then `TUDO OK`, exit code 0.

---

## Task 4: The store stylesheet

**Files:**
- Create: `src/store/store.css`

**Interfaces:**
- Consumes: `--store-display` and `--store-mono` from Task 1's `store-fonts.css`.
- Produces: every class name used by Tasks 5–7. The full list is in the table below and is the contract for those tasks.

| Class | Used by |
|---|---|
| `.store` | wrapper, all pages |
| `.store-head`, `.store-mark`, `.store-tag`, `.store-nav` | home, detail |
| `.readout`, `.readout-ch`, `.readout-k`, `.readout-n`, `.readout-n--red`, `.readout-unit` | home |
| `.grat` | home (graticule ground) |
| `.grat-10` | home (10-division etched grid) |
| `.grat-in` | home (content sitting on the graticule) |
| `.chan` | home |
| `.chan-lb`, `.chan-name`, `.chan-sub`, `.chan-meter`, `.chan-fill`, `.chan-fill--red`, `.chan-fig`, `.chan-go` | home |
| `.chan--soon`, `.chan-soon` | home |
| `.hint` | home |
| `.ch` | detail (oscilloscope channel) |
| `.ch-head`, `.ch-lb`, `.ch-title`, `.ch-go` | detail |
| `.ch-screen`, `.ch-stripes` | detail |
| `.ch-seg` | detail |
| `.ch-seg-k`, `.ch-seg-v` | detail |
| `.ch-keys`, `.ch-key` | detail |
| `.ch-verdict`, `.ch-verdict-v` | detail |
| `.support`, `.support-k`, `.support-b` | SupportBand |
| `.soon`, `.soon-t`, `.soon-p` | SoonPage |
| `.soon-back` | detail, PlayPage, SoonPage |
| `.play`, `.play-back`, `.play-fail`, `.play-wait` | PlayPage |
| `.ib` | the iframe container |
| `.grow` | flex spacer inside the store header |
| `.game-page`, `.game-frame` | already in `src/ui.css`; the Navinha canvas keeps them |

- [ ] **Step 1: Create `src/store/store.css`**

Create the file with exactly this content:

```css
/* ÓRBITA — bench de sinais.
   Regra do mundo: três cores, nunca uma quarta. Sem raio, sem sombra, sem
   gradiente decorativo. Arquivo Black nas medidas, JetBrains Mono em tudo que
   é rótulo ou número. A régua vermelha é a espinha da página. */

:root {
  --store-ground: #0d0d0d;
  --store-ink: #f2f0e9;
  --store-red: #d81f1f;
  --store-rule: 3px;
  --store-display: 'Archivo Black', Impact, 'Arial Black', sans-serif;
  --store-mono: 'JetBrains Mono', ui-monospace, 'Courier New', monospace;
}

.store {
  background: var(--store-ground);
  color: var(--store-ink);
  font-family: var(--store-mono);
  min-height: 100vh;
  border-top: var(--store-rule) solid var(--store-red);
}

.store a { color: inherit; }

/* public/css/style.css trava o documento inteiro para caber o canvas do jogo:
   `overflow: hidden` em html/body e o body centralizado como flex. A loja é uma
   página que rola, então o wrapper precisa devolver o controle da rolagem sem
   tocar no estilo do jogo. */
body:has(.store),
body:has(.play) {
  display: block;
  overflow: auto;
  background: var(--store-ground);
}
body:has(.store) { height: auto; }
body:has(.play) { height: 100vh; overflow: hidden; }

/* ── cabeçalho ── */
.store-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid #2e2e2e;
}
.store-mark {
  font-family: var(--store-display);
  font-size: 20px;
  letter-spacing: -0.6px;
  text-transform: uppercase;
  text-decoration: none;
}
.store-mark::first-letter { color: var(--store-red); }
.store-tag {
  font-size: 10px;
  color: #8a8a85;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.grow { flex: 1; }
.store-nav {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  padding: 6px 10px;
  border: 1px solid transparent;
}
.store-nav:hover { border-color: var(--store-ink); }
.store-nav--on { border-color: var(--store-red); color: var(--store-red); }

/* ── faixa de leitura ── */
.readout {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  flex-wrap: wrap;
  padding: 22px 20px 18px;
  border-bottom: var(--store-rule) solid var(--store-ink);
}
.readout-ch { display: flex; align-items: baseline; gap: 8px; }
.readout-k {
  font-size: 10px;
  color: #8a8a85;
  letter-spacing: 2px;
}
.readout-n {
  font-family: var(--store-display);
  font-size: 56px;
  line-height: 0.85;
  letter-spacing: -3px;
}
.readout-n--red { color: var(--store-red); }
.readout-unit { font-size: 12px; color: #a8a8a0; letter-spacing: 1px; }

/* ── retícula gravada: dez divisões ── */
.grat {
  position: relative;
  border-bottom: var(--store-rule) solid var(--store-ink);
  overflow: hidden;
}
.grat-10 {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(242, 240, 233, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(242, 240, 233, 0.05) 1px, transparent 1px);
  background-size: 10% 25%;
}
.grat-in { position: relative; padding: 18px 20px; }

/* ── canais ── */
.chan {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 20px;
  background: none;
  border: 0;
  border-bottom: 1px solid #2a2a2a;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.chan:hover { background: #171717; }
.chan:focus-visible { outline: var(--store-rule) solid var(--store-red); outline-offset: -3px; }
.chan-lb { font-size: 11px; color: var(--store-red); flex: 0 0 34px; letter-spacing: 1px; }
.chan-name {
  font-family: var(--store-display);
  font-size: 17px;
  letter-spacing: -0.4px;
  flex: 0 0 210px;
  text-transform: uppercase;
}
/* linhas de continuacao: mesma medida, so que com o rotulo da leitura */
.chan-sub {
  font-size: 11px;
  color: #8a8a85;
  letter-spacing: 1px;
  flex: 0 0 210px;
}
.chan-meter {
  flex: 1;
  height: 18px;
  border: 1px solid #4a4a4a;
  display: flex;
  min-width: 60px;
}
.chan-fill { display: block; height: 100%; background: var(--store-ink); }
.chan-fill--red { background: var(--store-red); }
.chan-fig { font-size: 11px; color: #a8a8a0; flex: 0 0 96px; }
.chan-go {
  font-family: var(--store-display);
  font-size: 11px;
  background: var(--store-red);
  color: var(--store-ground);
  padding: 8px 14px;
  letter-spacing: 0.5px;
  flex: 0 0 auto;
}
.chan:hover .chan-go { background: var(--store-ink); }

/* linha indisponível: some, mas continua ocupando a grade */
.chan--soon { cursor: default; opacity: 0.42; }
.chan--soon:hover { background: none; }
.chan-soon {
  font-size: 10px;
  letter-spacing: 1px;
  border: 1px solid #555;
  padding: 7px 10px;
  color: #8a8a85;
}

/* ── linha de condição de operação ── */
.hint {
  font-size: 10px;
  color: #6a6a65;
  letter-spacing: 1px;
  padding: 12px 20px;
  border-bottom: 1px solid #2a2a2a;
}

/* ── página de detalhe: um canal de osciloscópio ── */
.ch { padding: 0 0 24px; }
.ch-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: var(--store-rule) solid var(--store-ink);
}
.ch-lb { font-size: 11px; color: var(--store-red); letter-spacing: 2px; }
.ch-title {
  font-family: var(--store-display);
  font-size: 26px;
  letter-spacing: -1px;
  text-transform: uppercase;
  flex: 1;
}
.ch-go {
  font-family: var(--store-display);
  font-size: 12px;
  background: var(--store-red);
  color: var(--store-ground);
  padding: 10px 18px;
  text-decoration: none;
  letter-spacing: 0.5px;
}
.ch-go:hover { background: var(--store-ink); }
.ch-screen {
  position: relative;
  border-bottom: var(--store-rule) solid var(--store-ink);
  background: #050914;
}
.ch-screen img { display: block; width: 100%; height: auto; }
.ch-stripes {
  height: 8px;
  background: repeating-linear-gradient(90deg, var(--store-ink) 0 3px, var(--store-ground) 3px 6px);
  opacity: 0.3;
}
.ch-seg {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid #2a2a2a;
}
.ch-seg-k { flex: 0 0 160px; font-size: 10px; color: #8a8a85; letter-spacing: 1.5px; }
.ch-seg-v { font-size: 12px; line-height: 1.5; }
.ch-keys { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 20px 12px; }
.ch-key {
  font-size: 10px;
  border: 1px solid var(--store-ink);
  padding: 4px 8px;
}
.ch-key + .ch-key::before { content: ' · '; color: #6a6a65; }
.ch-verdict {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 20px 0;
  padding: 12px 14px;
  border: 1px solid #3a3a3a;
}
.ch-verdict-v {
  margin-left: auto;
  font-family: var(--store-display);
  font-size: 13px;
  color: var(--store-ink);
  letter-spacing: 0.5px;
}

/* ── apoio via PIX ── */
.support {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 18px 20px;
  border-top: var(--store-rule) solid var(--store-ink);
}
.support-k { font-size: 10px; color: #8a8a85; letter-spacing: 1.5px; }
.support-b {
  margin-left: auto;
  font-family: var(--store-display);
  font-size: 12px;
  border: 2px solid var(--store-ink);
  padding: 9px 16px;
  background: none;
  color: inherit;
  text-decoration: none;
  letter-spacing: 0.5px;
  cursor: pointer;
}
.support-b:hover { background: var(--store-ink); color: var(--store-ground); }

/* ── em breve ── */
.soon { padding: 40px 20px; }
.soon-t {
  font-family: var(--store-display);
  font-size: 40px;
  letter-spacing: -2px;
  text-transform: uppercase;
  margin: 0 0 12px;
}
.soon-p { font-size: 12px; color: #a8a8a0; max-width: 46ch; line-height: 1.7; }
.soon-back { display: inline-block; margin-top: 22px; font-size: 11px; letter-spacing: 2px; }

/* ── rota de jogo ── */
.play { min-height: 100vh; background: var(--store-ground); }
.play-back {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 40;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: var(--store-ground);
  color: var(--store-ink);
  border: 2px solid var(--store-ink);
  padding: 8px 12px;
  text-decoration: none;
}
.play-back:hover { background: var(--store-ink); color: var(--store-ground); }
.ib { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; background: #050914; }
.play-fail {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}
.play-fail p { font-size: 12px; color: #a8a8a0; max-width: 44ch; line-height: 1.7; margin: 0; }
.play-fail a { font-size: 11px; letter-spacing: 2px; color: var(--store-red); }
/* o aviso de carregamento é uma faixa, não uma tela cheia: o iframe aparece
   embaixo assim que chega */
.play-wait {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  pointer-events: none;
}
.play-wait p {
  font-size: 11px;
  letter-spacing: 2px;
  color: #8a8a85;
  background: var(--store-ground);
  border: 1px solid #3a3a3a;
  padding: 10px 16px;
  margin: 0;
}

/* ── celular: as duas colunas viram uma ── */
@media (max-width: 860px) {
  .readout-n { font-size: 40px; letter-spacing: -2px; }
  .chan { flex-wrap: wrap; gap: 8px; padding: 14px 16px; }
  .chan-lb { flex: 0 0 30px; }
  .chan-name { flex: 1 1 100%; font-size: 15px; }
  .chan-sub { flex: 0 0 74px; }
  .chan-meter { flex: 1 1 60%; }
  .chan-fig { flex: 0 0 auto; }
  .ch-seg { flex-direction: column; gap: 4px; padding: 10px 16px; }
  .ch-seg-k { flex: none; }
  .store-head { flex-wrap: wrap; padding: 12px 16px; }
  .ch-title { font-size: 20px; }
  .soon-t { font-size: 30px; }
  .grat-in { padding: 14px 0; }
  .support-b { margin-left: 0; }
}
```

- [ ] **Step 2: Verify the stylesheet has no forbidden declarations**

Run:
```powershell
Select-String -Path src\store\store.css -Pattern "border-radius:|box-shadow:"
```
Expected: no output. Any hit means a rounded corner or a drop shadow slipped in, both of which the world forbids. (The words `border-radius` and `box-shadow` do appear once each, in the header comment, which is why the patterns end with the colon.)

Then confirm gradients appear only where they do real work — the etched graticule on `.grat-10` and the perforation stripes on `.ch-stripes`:
```powershell
Select-String -Path src\store\store.css -Pattern "linear-gradient"
```
Expected: three lines. Two inside the `.grat-10` rule (its two grid axes) and one inside `.ch-stripes`. A match anywhere else means a decorative gradient slipped in.

---

## Task 5: Store pages and routing

**Files:**
- Create: `src/store/StoreHome.jsx`
- Create: `src/store/GameDetail.jsx`
- Create: `src/store/PlayPage.jsx`
- Create: `src/store/SupportBand.jsx`
- Create: `src/store/SoonPage.jsx`
- Modify: `src/App.jsx`
- Delete: `src/pages/LandingPage.jsx`
- Modify: `src/pages/GamePage.jsx`

**Interfaces:**
- Consumes: `CATALOGO`, `soonEntry`, `getJogo` from Task 2; `store.css` from Task 4.
- Produces: three route components and the route table. `PlayPage` is the only component that knows which runtime a game uses.

- [ ] **Step 1: Create `src/store/SupportBand.jsx`**

```jsx
import React from 'react';

// A chave PIX ainda é um placeholder no código. Enquanto for, o botão de copiar
// fica escondido: a loja não pode parecer que recebe pagamento.
const PIX_KEY = 'COLE_SUA_CHAVE_PIX_AQUI';
const CHAVE_REAL = PIX_KEY.trim().length > 20;

export default function SupportBand() {
  return (
    <footer className="support">
      <span className="support-k">APOIO VOLUNTÁRIO VIA PIX</span>
      <span className="support-k">QUALQUER VALOR</span>
      {CHAVE_REAL ? (
        <button
          className="support-b"
          type="button"
          onClick={() => navigator.clipboard.writeText(PIX_KEY)}
        >
          COPIAR CHAVE
        </button>
      ) : (
        <a className="support-b" href="#/">EM BREVE</a>
      )}
    </footer>
  );
}
```

- [ ] **Step 2: Create `src/store/StoreHome.jsx`**

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { CATALOGO, soonEntry } from './catalogo.js';
import SupportBand from './SupportBand.jsx';
import '../ui.css';

const TOTAL_VOLUME = 40; // 25 fases + 15 mapas, somado dos dois jogos

function Medidor({ m }) {
  const pct = m.total > 0 ? Math.round((m.valor / m.total) * 100) : 0;
  return (
    <>
      <span className="chan-meter">
        <i
          className={m.alerta ? 'chan-fill chan-fill--red' : 'chan-fill'}
          style={{ width: pct + '%' }}
        />
      </span>
      <span className="chan-fig">
        {m.valor} {m.rotulo}
      </span>
    </>
  );
}

// Cada medida vira uma linha do painel. A primeira traz o botão JOGAR; as
// seguintes mostram o resto do volume medido mais o progresso real daquela
// pessoa, lido do save que o próprio jogo gravou.
function Medidas({ jogo }) {
  const prog = jogo.progresso.ler();
  return (
    <>
      {jogo.medidas.map((m, i) => (
        <div className="chan" key={jogo.id + m.rotulo} data-seq={jogo.seq}>
          <span className="chan-lb">{i === 0 ? jogo.canal : ''}</span>
          <span className={i === 0 ? 'chan-name' : 'chan-sub'}>{i === 0 ? jogo.titulo : m.rotulo}</span>
          <Medidor m={m} />
          {i === 0 ? (
            <Link className="chan-go" to={'/' + jogo.id}>
              JOGAR
            </Link>
          ) : (
            <span className="chan-fig">
              {prog.feito}/{prog.total} SUAS
            </span>
          )}
        </div>
      ))}
    </>
  );
}

export default function StoreHome() {
  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">dois jogos no navegador</span>
        <span className="grow" />
        <Link className="store-nav" to="/navinha">
          CH1
        </Link>
        <Link className="store-nav" to="/defesa">
          CH2
        </Link>
        <a className="store-nav" href="#apoio">
          APOIO
        </a>
      </header>

      <section className="readout">
        <div className="readout-ch">
          <span className="readout-k">CH1 · CATÁLOGO</span>
          <span className="readout-n">{CATALOGO.length}</span>
          <span className="readout-unit">JOGOS</span>
        </div>
        <div className="readout-ch">
          <span className="readout-k">CH2 · VOLUME</span>
          <span className="readout-n readout-n--red">{TOTAL_VOLUME}</span>
          <span className="readout-unit">FASES + MAPAS</span>
        </div>
        <div className="readout-ch">
          <span className="readout-k">CH3 · INSTALAÇÃO</span>
          <span className="readout-n readout-n--red">0</span>
          <span className="readout-unit">NENHUMA</span>
        </div>
      </section>

      <section className="grat">
        <span className="grat-10" />
        <div className="grat-in">
          {CATALOGO.map((j) => (
            <Medidas key={j.id} jogo={j} />
          ))}
          <div className="chan chan--soon">
            <span className="chan-lb">—</span>
            <span className="chan-name">{soonEntry.titulo}</span>
            <span className="chan-soon">SEM SINAL</span>
          </div>
        </div>
      </section>

      <p className="hint">
        DIVISÕES = 10 · SEM DOWNLOAD · SEM CONTA · SEM LOJA · ABRA E JOGUE
      </p>

      <div id="apoio">
        <SupportBand />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/store/GameDetail.jsx`**

```jsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJogo } from './catalogo.js';

export default function GameDetail() {
  const { id } = useParams();
  const jogo = getJogo(id);

  if (!jogo) {
    return (
      <div className="store">
        <header className="store-head">
          <Link className="store-mark" to="/">
            ÓRBITA
          </Link>
        </header>
        <div className="soon">
          <h1 className="soon-t">SINAL PERDIDO</h1>
          <p className="soon-p">Esse canal não existe no catálogo.</p>
          <Link className="store-nav soon-back" to="/">
            VOLTAR AO PAINEL
          </Link>
        </div>
      </div>
    );
  }

  const prog = jogo.progresso.ler();

  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">{jogo.canal}</span>
        <span className="grow" />
        <Link className="store-nav store-nav--on" to={'/jogar/' + jogo.id}>
          JOGAR
        </Link>
      </header>

      <article className="ch">
        <div className="ch-head">
          <span className="ch-lb">{jogo.canal}</span>
          <h1 className="ch-title">{jogo.nome}</h1>
          <Link className="ch-go" to={'/jogar/' + jogo.id}>
            JOGAR AGORA
          </Link>
        </div>

        <div className="ch-screen">
          <img
            src={'/store/' + jogo.id + '/' + jogo.screenshots[0] + '.png'}
            alt={'Captura de tela de ' + jogo.nome}
            width="1280"
            height="720"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="ch-stripes" />
        </div>

        <div className="ch-seg">
          <span className="ch-seg-k">DESCRIÇÃO</span>
          <span className="ch-seg-v">{jogo.descricao}</span>
        </div>

        {jogo.ficha.map((f) => (
          <div className="ch-seg" key={f.rotulo}>
            <span className="ch-seg-k">{f.rotulo}</span>
            <span className="ch-seg-v">{f.valor}</span>
          </div>
        ))}

        <div className="ch-seg">
          <span className="ch-seg-k">CONTROLES</span>
          <span className="ch-seg-v">
            <span className="ch-keys">
              {jogo.controles.map((c) => (
                <span className="ch-key" key={c.tecla}>
                  {c.tecla} — {c.descricao}
                </span>
              ))}
            </span>
          </span>
        </div>

        <div className="ch-verdict">
          <span className="ch-seg-k">SEU PROGRESSO</span>
          <span className="ch-seg-k">
            SAVE {jogo.progresso.chave}
          </span>
          <span className="ch-verdict-v">
            {prog.feito} DE {prog.total}
          </span>
        </div>
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/store/PlayPage.jsx`**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJogo } from './catalogo.js';
import GamePage from '../pages/GamePage.jsx';
import '../ui.css';

const TIMEOUT_MS = 8000;
const SRC_DEFESA = '/defesa/index.html';

export default function PlayPage() {
  const { id } = useParams();
  const jogo = getJogo(id);
  const [carregando, setCarregando] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    if (jogo && jogo.id !== 'defesa') return undefined;
    setCarregando(true);
    timer.current = setTimeout(() => setCarregando(false), TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [jogo]);

  if (!jogo) {
    return (
      <div className="store">
        <div className="soon">
          <h1 className="soon-t">SINAL PERDIDO</h1>
          <p className="soon-p">Esse jogo não está no catálogo.</p>
          <Link className="store-nav soon-back" to="/">
            VOLTAR AO PAINEL
          </Link>
        </div>
      </div>
    );
  }

  // O Navinha já é um app React com o próprio canvas: montamos o GamePage.
  if (jogo.id === 'navinha') {
    return (
      <div className="play">
        <Link className="play-back" to="/navinha">
          VOLTAR
        </Link>
        <GamePage />
      </div>
    );
  }

  // A Defesa da Terra é Phaser com globais próprios; o iframe mantém esse
  // código isolado do React.
  return (
    <div className="play">
      <Link className="play-back" to="/defesa">
        VOLTAR
      </Link>
      {carregando && (
        <div className="play-fail" style={{ position: 'static', minHeight: '60vh' }}>
          <p>CARREGANDO {jogo.titulo}…</p>
        </div>
      )}
      <iframe
        className="ib"
        src={SRC_DEFESA}
        title={jogo.nome}
        onLoad={() => {
          if (timer.current) clearTimeout(timer.current);
          setCarregando(false);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create `src/store/SoonPage.jsx`**

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { soonEntry } from './catalogo.js';

export default function SoonPage() {
  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">canal sem sinal</span>
      </header>
      <div className="soon">
        <h1 className="soon-t">{soonEntry.titulo}</h1>
        <p className="soon-p">{soonEntry.descricao} Dois jogos já estão no ar e rodam inteiros no navegador.</p>
        <Link className="store-nav soon-back" to="/">
          VOLTAR AO PAINEL
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire the routes in `src/App.jsx`**

Replace the file with:

```jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StoreHome from './store/StoreHome.jsx';
import GameDetail from './store/GameDetail.jsx';
import PlayPage from './store/PlayPage.jsx';
import SoonPage from './store/SoonPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreHome />} />
      <Route path="/navinha" element={<GameDetail />} />
      <Route path="/defesa" element={<GameDetail />} />
      <Route path="/jogar/:id" element={<PlayPage />} />
      <Route path="/em-breve" element={<SoonPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 7: Add a back link to `src/pages/GamePage.jsx` and delete the old landing page**

In `src/pages/GamePage.jsx`, add this import at the top with the others:

```jsx
import { Link } from 'react-router-dom';
```

Then replace the opening of the returned JSX so the back link is the first child of `.game-page`:

```jsx
  return (
    <div className="game-page">
      <Link className="play-back" to="/navinha">
        VOLTAR
      </Link>
      <div className="game-frame" id="frame">
```

Delete the old landing page, whose content now lives in `GameDetail.jsx`:

```powershell
Remove-Item src\pages\LandingPage.jsx
```

- [ ] **Step 8: Verify the build compiles and all routes resolve**

Run:
```powershell
npm run build
```
Expected: a successful Vite build with no unresolved imports and no reference to `LandingPage`. Then confirm the copy of the Defesa da Terra landed in the output:

```powershell
Test-Path dist\defesa\index.html
Test-Path dist\defesa\phaser.min.js
(Get-ChildItem dist\defesa\assets -Filter *.js).Count
```
Expected: `True`, `True`, `11`.

- [ ] **Step 9: Verify no stale import of the deleted landing page remains**

Run:
```powershell
Select-String -Path src\**\*.jsx, src\*.jsx -Pattern "LandingPage"
```
Expected: no output.

---

## Task 6: Capture real screenshots

**Files:**
- Create: `tools/capturas.mjs`
- Modify: `package.json` (add the script and the devDependency)
- Create: `public/store/navinha/{1,2,3}.png`
- Create: `public/store/defesa/{1,2,3}.png`

**Interfaces:**
- Consumes: the dev server from `vite.config.js`, the store routes from Task 5, and the games themselves.
- Produces: six PNGs at exactly `public/store/<id>/1.png`, `2.png`, `3.png`, each 1280×720. `GameDetail.jsx` already points at these paths.

The capture is real evidence, so it must be reproducible: `npm run capturas` overwrites them, and the script prints what it wrote.

- [ ] **Step 1: Install Playwright as a devDependency**

Run:
```powershell
npm install -D playwright
npx playwright install chromium
```
Expected: Playwright added to `devDependencies` and the Chromium download completing without error.

- [ ] **Step 2: Add the npm script**

In `package.json`, add this entry to `scripts`, after the existing `preview` line:

```json
"capturas": "node tools/capturas.mjs"
```

- [ ] **Step 3: Create `tools/capturas.mjs`**

```js
// Captura as telas reais dos dois jogos para a vitrine. Não há imagem de
// marketing em nenhum dos dois repositórios — todo pixel dos jogos é gerado por
// código em tempo de execução — então a única evidência honesta é fotografar o
// jogo rodando.
import { chromium } from 'playwright';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:5173';
const SAIDA = join(process.cwd(), 'public', 'store');
const TIMEOUT = 45000;

const erros = [];

function registrar(alvo, texto) {
  erros.push(alvo + ': ' + texto);
}

async function salvar(page, id, nome) {
  const dir = join(SAIDA, id);
  mkdirSync(dir, { recursive: true });
  const arquivo = join(dir, nome + '.png');
  await page.screenshot({ path: arquivo });
  const bytes = statSync(arquivo).size;
  console.log('  ' + id + '/' + nome + '.png  ' + bytes + ' bytes');
  if (bytes < 1000) registrar(id + '/' + nome, 'arquivo pequeno demais: ' + bytes);
}

async function navinha(page) {
  await page.goto(BASE + '/#/jogar/navinha', { waitUntil: 'load' });
  await page.waitForSelector('#game', { timeout: TIMEOUT });
  await page.waitForTimeout(2500);
  await salvar(page, 'navinha', '1');

  // Entra na seleção de naves e depois na de fases, que são as telas que
  // mostram o catálogo real do jogo.
  const entrar = page.locator('button, [role="button"]').filter({ hasText: /INICIAR|INICIAR CAMPANHA|JOGAR/i }).first();
  if (await entrar.count()) {
    await entrar.click();
    await page.waitForTimeout(1200);
    await salvar(page, 'navinha', '2');
  } else {
    registrar('navinha', 'botão de início não encontrado');
  }

  // Um fundo de fase em movimento é a melhor prova de que o jogo roda.
  const fase = page.locator('button, [role="button"]').filter({ hasText: /FASE|INICIAR|TOCAR/i }).first();
  if (await fase.count()) {
    await fase.click();
    await page.waitForTimeout(3000);
    await salvar(page, 'navinha', '3');
  } else {
    registrar('navinha', 'não foi possível entrar numa fase');
  }
}

async function defesa(page) {
  await page.goto(BASE + '/defesa/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await salvar(page, 'defesa', '1');

  const start = page.locator('#btn-start');
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(4000);
    await salvar(page, 'defesa', '2');

    const mapa = page.locator('.map-card').first();
    if (await mapa.count()) {
      await mapa.click();
      await page.waitForTimeout(3500);
      await salvar(page, 'defesa', '3');
    } else {
      registrar('defesa', 'nenhum .map-card encontrado');
    }
  } else {
    registrar('defesa', '#btn-start não encontrado');
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('pageerror', (e) => registrar('console', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') registrar('console', m.text());
});

console.log('capturando navinha…');
await navinha(page);
console.log('capturando defesa…');
await defesa(page);

await browser.close();

if (erros.length) {
  console.error('\nPROBLEMAS:');
  for (const e of erros) console.error('  ' + e);
  process.exit(1);
}
console.log('\n6 capturas escritas em public/store/');
```

- [ ] **Step 4: Start the dev server and run the capture**

In one shell:
```powershell
npm run dev
```
In another:
```powershell
npm run capturas
```
Expected output ends with `6 capturas escritas em public/store/` and six lines showing byte counts above 1000.

If the script exits 1, read the `PROBLEMAS:` list. The usual causes are a selector that does not exist in the current build or the dev server not being up yet. Fix the selector, do not lower the byte threshold.

- [ ] **Step 5: Confirm the six files exist and are real images**

Run:
```powershell
Get-ChildItem public\store -Recurse -Filter *.png | Select-Object FullName, Length
```
Expected: exactly six files, each over 1000 bytes. Zero-byte or 1×1 files mean the page rendered blank and must be recaptured.

---

## Task 7: Route smoke test

**Files:**
- Create: `tools/smoke-rotas.mjs`

**Interfaces:**
- Consumes: every route from Task 5 and the dev server.
- Produces: a pass/fail exit code. This is the project's only automated test; it must pass before the build is called done.

- [ ] **Step 1: Create `tools/smoke-rotas.mjs`**

```js
// Verifica que as seis rotas da loja respondem, que o texto real de cada jogo
// aparece e que nada estoura erro de console. Sem framework de teste no
// projeto: é um script com código de saída.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';

const CASOS = [
  { rota: '/#/', precisa: ['ÓRBITA', 'NAVINHA', 'DEFESA DA TERRA', 'EM BREVE'] },
  { rota: '/#/navinha', precisa: ['NAVINHA', 'JOGAR AGORA', '25 fases'] },
  { rota: '/#/defesa', precisa: ['DEFESA DA TERRA', '15 mapas'] },
  { rota: '/#/em-breve', precisa: ['EM BREVE'] },
  { rota: '/#/jogar/navinha', precisa: ['game'] },
  { rota: '/#/rota-que-nao-existe', precisa: ['ÓRBITA'] },
  // ODefense da Terra é servido de public/defesa/ e abre standalone. Se o
  // iframe está no lugar certo, o script do jogo inicializa.
  { rota: '/defesa/index.html', precisa: ['DEFESA'], fora: true }
];

let falhas = 0;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text());
});

for (const caso of CASOS) {
  erros.length = 0;
  await page.goto(BASE + caso.rota, { waitUntil: 'load' });
  await page.waitForTimeout(caso.fora ? 3000 : 900);

  // A rota standalone da Defesa nao passa pelo React: o texto esta nos nos
  //proprios do HTML dela.
  const corpo = caso.fora
    ? await page.evaluate(() => (document.body.innerText || document.title).toUpperCase())
    : await page.evaluate(() => document.body.innerText);

  const faltando = caso.precisa.filter((t) => !corpo.toUpperCase().includes(t.toUpperCase()));
  const problemas = [];
  if (faltando.length) problemas.push('faltou: ' + faltando.join(', '));
  if (erros.length) problemas.push('erro de console: ' + erros.join(' | '));
  if (problemas.length) {
    falhas++;
    console.log('FALHA ' + caso.rota + ' — ' + problemas.join('; '));
  } else {
    console.log('ok    ' + caso.rota);
  }
}

await browser.close();
console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' FALHA(S)');
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it against the dev server**

With `npm run dev` running:
```powershell
node tools/smoke-rotas.mjs
```
Expected: six `ok` lines and `TUDO OK`.

- [ ] **Step 3: Add the npm script**

In `package.json`, add to `scripts`:

```json
"smoke": "node tools/smoke-rotas.mjs"
```

- [ ] **Step 4: Confirm the Defesa da Terra still passes its own test suite in its own repository**

Run, in `C:\Users\adolf\Desktop\hermes`:
```powershell
npm run smoke
```
Expected: the same result it produced before this work began. This plan does not touch that repository, so any regression there means a file was modified and must be restored from git.

---

## Task 8: Finish pass

**Files:**
- Create: `.impeccable/review/desktop.png`
- Create: `.impeccable/review/mobile.png`
- Create: `DESIGN.md` (written by the documenter, not by hand)

**Interfaces:**
- Consumes: everything above.
- Produces: the evidence the finish review needs, and the design system record.

- [ ] **Step 1: Create the review directory**

Run:
```powershell
New-Item -ItemType Directory -Path .impeccable\review -Force
```

- [ ] **Step 2: Run the mechanical design detector over the store**

Run:
```powershell
& "$env:USERPROFILE\.config\opencode\skills\impeccable\scripts\impeccable.cmd" detect --json src\store
```
Expected: no primary findings. Fix whatever it reports mechanically — rounded corners, drop shadows, decorative gradients, low-contrast text — and re-run once. Do not loop; one fix round, then move on.

- [ ] **Step 3: Capture desktop and mobile**

With `npm run dev` running, add a small capture using the existing Playwright install:

```powershell
node --input-type=module -e "
import { chromium } from 'playwright';
const b = await chromium.launch();
for (const [nome, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://127.0.0.1:5173/#/', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: '.impeccable/review/' + nome + '.png', fullPage: true });
  console.log(nome + ' ' + w + 'x' + h);
  await p.close();
}
await b.close();
"
```
Expected: `desktop 1440x900` and `mobile 390x844`, and both files present under `.impeccable/review/`.

- [ ] **Step 4: Open both captures and confirm they are valid evidence**

Read each PNG. A capture with a blank region, a missing card, or a half-loaded image is not evidence — recapture it. This is the capture-validity rule, and an invalid capture costs the whole review round.

- [ ] **Step 5: Spawn the finish reviewer**

Hand it the original request, the confirmed answers, `src/store/StoreHome.jsx` and `src/store/GameDetail.jsx` as the artifacts, the two screenshot paths, the direction contract at `.impeccable/surfaces/src-store-storehome-jsx.md`, `PRODUCT.md`, the quality bar card for the oscilloscope world, and a line stating that the detector ran in Step 2. It returns one of four dispositions: `recapture`, `rebuild`, `fix`, or `ship`. Act on the word, not on your own impression.

- [ ] **Step 6: Have DESIGN.md written from the built world**

The documenter records the design system as it actually shipped, from the built code — not from this plan and not from the direction contract. A rulebook written before the build ends up defending a reality that does not exist.

---

## Out of Scope

Do not do any of the following. Each was considered and rejected.

- Do not edit anything in `C:\Users\adolf\Desktop\hermes`, including its tests.
- Do not convert the Defesa da Terra from classic scripts to ES modules.
- Do not add a cart, checkout, login, wishlist, or any purchase flow.
- Do not invent player counts, ratings, reviews, awards, press, or a launch date.
- Do not touch the dead code in `js/`, `_hermes_ref/`, `jogo.html`, `servidor.js`, or `iniciar.bat`. `servidor.js` is CommonJS in an ESM package and would throw if run; that is pre-existing and stays.
- Do not change gameplay, balance, or progression in either game.
- Do not reset or migrate either `localStorage` save.
- Do not commit anything: this directory is not a git repository.
