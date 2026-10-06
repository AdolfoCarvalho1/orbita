/* Defesa Orbital v3 — pacote extra de SFX pixel/8-bit (aditivo).
   Estende window.SND / window.AudioSys sem substituir nenhum som existente.
   Wiring: inserir <script src="assets/sfx-extra.js"></script> DEPOIS de assets/audio.js
   (ver docs/SFX-WIRING.md). Sem este script carregado após audio.js, nada acontece. */
'use strict';
(function () {
  if (typeof window === 'undefined') return;
  const S = window.SND || window.AudioSys;
  if (!S || typeof S.tone !== 'function' || typeof S.noiseHit !== 'function') return;
  window.SND = S; // garante o alias global usado pela tarefa

  // Aditivo: só define se ainda não existe (nunca substitui som do audio.js)
  const add = (name, fn) => { if (typeof S[name] === 'undefined') S[name] = fn; };

  // noiseHit com agendamento por offset (o noiseHit original não aceita "when")
  const nz = (dur, vol, freq, type, slideTo, when) => {
    if (!S.ensure() || S.muted) return;
    const t = S.ctx.currentTime + (when || 0);
    const src = S.ctx.createBufferSource(); src.buffer = S._noise(); src.loop = true;
    const f = S.ctx.createBiquadFilter(); f.type = type || 'lowpass';
    f.frequency.setValueAtTime(Math.max(40, freq || 1000), t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    const g = S.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(S.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  };

  /* Tier up / merge de torres: fanfarra curta em quadrada, arpejo rápido ascendente */
  add('tierUp', () => {
    [523, 659, 784, 1046].forEach((f, i) => S.tone(f, 0.09, 'square', 0.09, undefined, i * 0.06));
    S.tone(1568, 0.16, 'triangle', 0.07, undefined, 0.24);
    nz(0.08, 0.04, 5000, 'highpass', undefined, 0.24);
  });

  /* Merge: sucção (ruído fechando + tom subindo) seguida de impacto grave */
  add('merge', () => {
    nz(0.18, 0.10, 400, 'bandpass', 2600);            // sucção
    S.tone(220, 0.16, 'square', 0.07, 880);           // puxa pra cima
    S.tone(110, 0.22, 'square', 0.14, 45, 0.18);      // impacto
    nz(0.14, 0.12, 1200, 'lowpass', 80, 0.18);
    S.tone(440, 0.06, 'square', 0.05, undefined, 0.20);
  });

  /* Super pronta: chime cristalino curto */
  add('superReady', () => {
    S.tone(1318, 0.12, 'sine', 0.11);
    S.tone(1760, 0.14, 'sine', 0.11, undefined, 0.08);
    S.tone(2093, 0.26, 'sine', 0.09, undefined, 0.16);
    S.tone(2637, 0.20, 'triangle', 0.05, undefined, 0.16);
  });

  /* Super disparada: impacto dramático (grave descendo + varredura de ruído + zap) */
  add('superFireX', () => {
    S.tone(160, 0.45, 'sawtooth', 0.16, 30);
    S.tone(65, 0.55, 'sine', 0.20, 24);
    nz(0.5, 0.14, 3000, 'bandpass', 200);
    S.tone(1800, 0.10, 'square', 0.06, 300, 0.05);
  });

  /* Fábrica: martelo industrial — duas batidas metálicas curtas */
  add('factory', () => {
    const hit = (w) => {
      nz(0.05, 0.10, 3800, 'highpass', undefined, w);
      S.tone(240, 0.07, 'square', 0.08, 120, w);
      S.tone(1900, 0.04, 'square', 0.03, 1500, w);
    };
    hit(0); hit(0.11);
  });

  /* Laboratório: bolha científica — blips senoidais escorregando pra cima */
  add('lab', () => {
    S.tone(320, 0.10, 'sine', 0.10, 720);
    S.tone(520, 0.09, 'sine', 0.08, 980, 0.09);
    S.tone(760, 0.14, 'sine', 0.07, 1400, 0.17);
  });
})();
