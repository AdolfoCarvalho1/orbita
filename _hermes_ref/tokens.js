'use strict';
/* Defesa da Terra — TOKENS: identidade visual unificada (pixel militar)
   Fonte única da verdade: paleta 6-mãe, tipografia, efeitos, pixel grid.
   Carregado ANTES de data.js / pixelart.js / scenes.js. Exposto em window.TOKENS e window.DO3.TOKENS */
(function(){
  // Paleta 6-mãe fechada (A/A)
  const PALETTE = {
    // Neutra
    bg: '#050914', bg2: '#0a1128', bg3: '#0a1430',
    panel: '#0d1526', panel2: '#111e3a', panel3: '#162649',
    text: '#e8eefc', muted: '#8fa3c4', muted2: '#5a6d93',
    // Humanas (torres)
    steel: '#e2e8f0', steelDark: '#8b95a8', // M metal base
    gold: '#fbbf24', gold2: '#f59e0b',
    cyan: '#38bdf8', cyan2: '#0ea5e9', cyanLine: 'rgba(56,189,248,.18)', cyanLine2: 'rgba(56,189,248,.35)',
    // Hivemind (inimigos)
    bioOrange: '#f97316', bioOrange2: '#fb923c',
    acid: '#a3e635', acid2: '#84cc16',
    shieldBlue: '#60a5fa', shieldBlue2: '#3b82f6',
    // Alertas
    red: '#f43f5e', red2: '#fb7185',
    green: '#34d399',
    purple: '#a3e635', // alias legado: a identidade atual usa verde ácido, nunca roxo
    orange: '#fb923c'
  };

  // S1.1 — Paleta SUNSET (pôr-do-sol cinematográfico; PROIBIDO ROXO)
  const SUNSET = {
    ink: '#0d1220', skyDeep: '#1c2b4d', skyDusk: '#33456b',
    cream: '#f6e7cb', moon: '#ffe9bd',
    amber: '#f5a83d', ember: '#e0512b', flower: '#c93a2e'
  };

  // Família por ID (silhueta manda, cor obedece — 1 detalhe)
  const FAMILY = {
    // torres — aço base + 1 acento
    cannon:  { base: 'steel', accent: 'steel',   accentHex: '#e2e8f0' },
    gatling: { base: 'steel', accent: 'gold',    accentHex: '#fbbf24' },
    laser:   { base: 'steel', accent: 'red',     accentHex: '#f43f5e' },
    missile: { base: 'steel', accent: 'orange',  accentHex: '#fb923c' },
    cryo:    { base: 'steel', accent: 'cyan',    accentHex: '#38bdf8' },
    tesla:   { base: 'steel', accent: 'green',   accentHex: '#34d399' },
    sniper:  { base: 'steel', accent: 'cyan',    accentHex: '#67e8f9' },
    venom:   { base: 'steel', accent: 'acid',    accentHex: '#a3e635' },
    amp:     { base: 'steel', accent: 'gold',    accentHex: '#fde047' },
    rail:    { base: 'steel', accent: 'steel',   accentHex: '#ffffff' },
    // inimigos — 3 mães Hivemind
    drone: '#f97316', runner: '#fbbf24', tank: '#94a3b8', swarm: '#fb923c',
    healer: '#34d399', phase: '#38bdf8', bomber: '#f43f5e', shielded: '#60a5fa',
    splitter: '#fde047', colossus: '#64748b', mini: '#fde047', wasp: '#facc15',
    boss1: '#f43f5e', boss2: '#fb923c', boss3: '#22d3ee'
  };

  const TYPOGRAPHY = {
    title: "'Orbitron','Rajdhani',sans-serif",
    body: "'Rajdhani',sans-serif",
    mono: "'JetBrains Mono',monospace",
    weights: { body: 600, bold: 700, black: 900 }
  };

  const EFFECTS = {
    chamf: 'polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)',
    line: 'rgba(56,189,248,.18)',
    line2: 'rgba(56,189,248,.35)',
    glowCyan: '0 0 18px rgba(56,189,248,.5), 0 0 40px rgba(56,189,248,.15)',
    glowGold: '0 0 18px rgba(251,191,36,.5)',
    cardShadow: '0 4px 12px rgba(0,0,0,.3)',
    cardShadowHover: '0 10px 24px rgba(0,0,0,.5), 0 0 20px rgba(56,189,248,.2)',
    border: '1px solid rgba(56,189,248,.18)',
    borderBottom: '2px solid',
    topLine: 'linear-gradient(90deg, transparent, var(--cyan), transparent)'
  };

  const PIXEL = {
    PX: 3,
    K: '#000000', // contorno obrigatório
    W: '#ffffff', // brilho
    M: '#8b95a8', // metal aço base
    G: '#bfe3ff', // vidro cockpit
    DARK_FACTOR: -0.55,
    LIGHT_FACTOR: 0.35
  };

  const TOKENS = { PALETTE, SUNSET, FAMILY, TYPOGRAPHY, EFFECTS, PIXEL };

  // helper tint (mesma lógica de pixelart.js mas centralizada)
  TOKENS.tint = function(hexStr, f){
    const n = parseInt(hexStr.slice(1),16);
    let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    if(f>=0){ r+=(255-r)*f; g+=(255-g)*f; b+=(255-b)*f; }
    else{ r*=1+f; g*=1+f; b*=1+f; }
    const hx=v=>('0'+Math.max(0,Math.min(255,Math.round(v))).toString(16)).slice(-2);
    return '#'+hx(r)+hx(g)+hx(b);
  };

  // Expondo global — data.js e pixelart.js leem window.TOKENS diretamente
  if(typeof window!=='undefined'){
    window.TOKENS = TOKENS;
    // se DO3 já existe (ordem de carga alternativa), injeta também
    if(window.DO3) window.DO3.TOKENS = TOKENS;
  }
  if(typeof module!=='undefined' && module.exports) module.exports = TOKENS;
})();
