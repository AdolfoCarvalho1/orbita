'use strict';
const SND = (function () {
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const ARP_STEPS = [0, 2, 4, 1];
  const S = {
    ctx: null,
    master: null,
    comp: null,
    sfxGain: null,
    musicGain: null,
    muted: false,
    lastPlay: {},
    musicMode: null,
    intensity: 0.3,
    _unlocked: false,
    _gestures: false,
    _noiseBuf: null,
    _voices: 0,
    _maxVoices: 12,
    _musicRunning: false,
    _musicTimer: null,
    _drones: null,
    _arpFilter: null,
    _arpGain: null,
    _step: 0,
    _pendingMusic: null,

    unlock() {
      try {
        if (this.ctx) {
          this._resume();
          this._attachGestures();
          this._applyPendingMusic();
          return;
        }
        const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        try {
          this.comp = this.ctx.createDynamicsCompressor();
          this.comp.threshold.value = -18;
          this.comp.ratio.value = 6;
          this.master.connect(this.comp);
          this.comp.connect(this.ctx.destination);
        } catch (e) {
          this.comp = null;
          this.master.connect(this.ctx.destination);
        }
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.muted ? 0 : 0.9;
        this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.muted ? 0 : 0.34;
        this.musicGain.connect(this.master);
        this._unlocked = true;
        this._attachGestures();
        this._applyPendingMusic();
      } catch (e) {
        this.ctx = null;
        this.master = null;
        this.comp = null;
        this.sfxGain = null;
        this.musicGain = null;
        this._unlocked = false;
      }
    },

    _resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (e) {}
      }
    },

    _attachGestures() {
      if (this._gestures || typeof document === 'undefined') return;
      this._gestures = true;
      const kick = () => { this._resume(); };
      try {
        document.addEventListener('pointerdown', kick, { passive: true });
        document.addEventListener('keydown', kick, { passive: true });
      } catch (e) {}
    },

    _applyPendingMusic() {
      this._resume();
      const m = this._pendingMusic || this.musicMode;
      this._pendingMusic = null;
      if (m && !this._musicRunning) this._startMusic();
    },

    setMuted(v) {
      this.muted = !!v;
      if (!this.ctx || !this.master) return;
      try {
        const t = this.ctx.currentTime;
        try { this.master.gain.cancelScheduledValues(t); } catch (e) {}
        try { if (this.musicGain) this.musicGain.gain.cancelScheduledValues(t); } catch (e) {}
        try { if (this.sfxGain) this.sfxGain.gain.cancelScheduledValues(t); } catch (e) {}
        if (this.muted) {
          this.master.gain.setValueAtTime(0, t);
          if (this.musicGain) this.musicGain.gain.setValueAtTime(0, t);
          if (this.sfxGain) this.sfxGain.gain.setValueAtTime(0, t);
          if (this._drones) this._drones.forEach(d => { try { d.g.gain.setValueAtTime(0, t); } catch (e) {} });
        } else {
          this.master.gain.setValueAtTime(0.55, t);
          if (this.musicGain) this.musicGain.gain.setValueAtTime(0.34, t);
          if (this.sfxGain) this.sfxGain.gain.setValueAtTime(0.9, t);
          if (this._drones) this._drones.forEach(d => { try { d.g.gain.setValueAtTime(d.base, t); } catch (e) {} });
        }
      } catch (e) {}
    },

    _noise() {
      if (this._noiseBuf) return this._noiseBuf;
      const len = this.ctx.sampleRate * 1.2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
      return buf;
    },

    _now() {
      try {
        if (typeof performance !== 'undefined' && performance.now) return performance.now();
      } catch (e) {}
      return Date.now();
    },

    _throttled(name, ms) {
      const n = this._now();
      const last = this.lastPlay[name] || 0;
      if (n - last < ms) return true;
      this.lastPlay[name] = n;
      return false;
    },

    _tryAllocVoice() {
      if (this._voices >= this._maxVoices) return false;
      this._voices++;
      return true;
    },

    _releaseVoice() {
      if (this._voices > 0) this._voices--;
    },

    tone(freq, dur, type, vol, slideTo, when) {
      if (!this.ctx || this.muted) return;
      if (!this._tryAllocVoice()) return;
      let released = false;
      const rel = () => { if (released) return; released = true; this._releaseVoice(); };
      try {
        const t = this.ctx.currentTime + (when || 0);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(Math.max(20, freq), t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.15), t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this.sfxGain);
        try { o.onended = rel; } catch (e) {}
        o.start(t);
        o.stop(t + dur + 0.05);
        setTimeout(rel, (dur || 0) * 1000 + ((when || 0) * 1000) + 250);
      } catch (e) {
        rel();
      }
    },

    noiseHit(dur, vol, filterFreq, filterType, slideTo, when) {
      if (!this.ctx || this.muted) return;
      try {
        const t = this.ctx.currentTime + (when || 0);
        const src = this.ctx.createBufferSource();
        src.buffer = this._noise();
        src.loop = true;
        const f = this.ctx.createBiquadFilter();
        f.type = filterType || 'lowpass';
        f.frequency.setValueAtTime(Math.max(40, filterFreq || 1000), t);
        if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.2, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.sfxGain);
        src.start(t);
        src.stop(t + dur + 0.05);
      } catch (e) {}
    },

    _explosion(size) {
      if (this._throttled('explosion', 80)) return;
      const s = size || 1;
      this.tone(110, 0.42 * s, 'sine', Math.min(0.5, 0.34 * s), 32);
      this.tone(48, 0.6 * s, 'sine', Math.min(0.45, 0.28 * s), 18);
      this.noiseHit(0.5 * s, Math.min(0.55, 0.30 * s), 1600 * s + 500, 'lowpass', 70);
      if (s > 1.2) {
        this.noiseHit(0.35, 0.18, 4200, 'highpass');
        this.tone(1800, 0.08, 'square', 0.08, 400);
      }
    },

    play(cue) {
      if (!this.ctx || this.muted) return;
      switch (cue) {
        case 'explosion':
          this._explosion(1);
          break;
        case 'explosion_big':
          this._explosion(2.4);
          break;
        case 'hit':
          if (this._throttled('hit', 40)) break;
          this.tone(920, 0.04, 'square', 0.07, 460);
          this.noiseHit(0.05, 0.07, 3400, 'highpass');
          break;
        case 'powerup':
          if (this._throttled('powerup', 90)) break;
          this.tone(660, 0.07, 'triangle', 0.12);
          this.tone(990, 0.1, 'triangle', 0.12, undefined, 0.07);
          break;
        case 'bomb':
          if (this._throttled('bomb', 250)) break;
          this.tone(120, 0.5, 'sawtooth', 0.24, 480);
          this.noiseHit(0.5, 0.2, 2400, 'bandpass', 300);
          this.tone(110, 0.45, 'sine', 0.34, 32);
          this.noiseHit(0.5, 0.3, 2100, 'lowpass', 70);
          break;
        case 'bossAlert':
          if (this._throttled('bossAlert', 700)) break;
          for (let i = 0; i < 3; i++) this.tone(440, 0.24, 'sawtooth', 0.18, 700, i * 0.28);
          this.tone(110, 0.9, 'sawtooth', 0.22, 55);
          this.noiseHit(1.2, 0.13, 280, 'lowpass', 50);
          break;
        case 'bossDeath':
          if (this._throttled('bossDeath', 400)) break;
          this.tone(180, 0.5, 'sawtooth', 0.26, 480);
          this.tone(90, 0.8, 'sine', 0.30, 28);
          this.noiseHit(0.9, 0.28, 1200, 'lowpass', 60);
          for (let i = 0; i < 3; i++) this.tone(900 + i * 300, 0.12, 'square', 0.07, 300, i * 0.11);
          break;
        case 'phaseStart':
          if (this._throttled('phaseStart', 300)) break;
          this.tone(392, 0.12, 'triangle', 0.14);
          this.tone(523, 0.14, 'triangle', 0.14, undefined, 0.1);
          this.tone(659, 0.1, 'sine', 0.08, undefined, 0.18);
          break;
        case 'victory':
          if (this._throttled('victory', 800)) break;
          [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.16, undefined, i * 0.13));
          this.tone(1318, 0.5, 'sine', 0.15, undefined, 0.55);
          break;
        case 'defeat':
          if (this._throttled('defeat', 800)) break;
          [392, 311, 261, 174].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.14, undefined, i * 0.22));
          this.noiseHit(0.8, 0.12, 400, 'lowpass', 40);
          break;
        case 'lifeLost':
          if (this._throttled('lifeLost', 350)) break;
          this.tone(220, 0.3, 'sawtooth', 0.2, 70);
          this.tone(330, 0.25, 'square', 0.1, 110, 0.05);
          this.noiseHit(0.3, 0.14, 600, 'lowpass', 40);
          break;
        case 'uiMove':
          if (this._throttled('uiMove', 35)) break;
          this.tone(1900, 0.035, 'square', 0.05, 1400);
          break;
        case 'uiConfirm':
          if (this._throttled('uiConfirm', 70)) break;
          this.tone(660, 0.07, 'triangle', 0.12);
          this.tone(990, 0.1, 'triangle', 0.12, undefined, 0.07);
          break;
        default:
          break;
      }
    },

    shoot(kind) {
      if (!this.ctx || this.muted) return;
      if (this._throttled('shoot', 45)) return;
      switch (kind) {
        case 'cannon':
          this.tone(150, 0.14, 'sawtooth', 0.16, 55);
          this.noiseHit(0.08, 0.1, 900);
          break;
        case 'gatling':
          this.tone(700 + Math.random() * 200, 0.03, 'square', 0.045, 300);
          break;
        case 'beam':
          this.tone(160, 0.2, 'sawtooth', 0.12, 700);
          this.noiseHit(0.14, 0.08, 2600, 'bandpass', 5200);
          break;
        case 'splash':
          this.noiseHit(0.28, 0.12, 500, 'bandpass', 2200);
          this.tone(340, 0.2, 'triangle', 0.08, 90);
          break;
        case 'slow':
          this.tone(340, 0.16, 'triangle', 0.1, 180);
          this.tone(680, 0.1, 'sine', 0.05, 300);
          break;
        case 'chain':
          this.noiseHit(0.1, 0.14, 3200, 'highpass');
          this.tone(1700, 0.08, 'square', 0.07, 220);
          break;
        case 'snipe':
          this.tone(1250, 0.1, 'square', 0.14, 90);
          this.noiseHit(0.06, 0.1, 4200, 'highpass');
          break;
        case 'dot':
          this.tone(210, 0.16, 'sawtooth', 0.07, 160);
          break;
        case 'amp':
          this.tone(880, 0.09, 'sine', 0.05, 1320);
          break;
        case 'pierce':
          this.tone(90, 0.2, 'square', 0.18, 900);
          this.noiseHit(0.14, 0.14, 2600, 'highpass');
          break;
        default:
          this.tone(400, 0.06, 'square', 0.08);
          break;
      }
    },

    startMusic(mode) {
      if (mode !== 'menu' && mode !== 'combat' && mode !== 'boss') return;
      if (this.musicMode === mode && this._musicRunning) return;
      this.musicMode = mode;
      this.intensity = mode === 'menu' ? 0.3 : (mode === 'combat' ? 0.5 : 0.95);
      this._pendingMusic = mode;
      if (!this.ctx) return;
      this._pendingMusic = null;
      if (!this._musicRunning) this._startMusic();
      else this._glideIntensity();
    },

    stopMusic() {
      this._pendingMusic = null;
      this.musicMode = null;
      this._step = 0;
      if (this._musicTimer) {
        clearInterval(this._musicTimer);
        this._musicTimer = null;
      }
      const drones = this._drones;
      this._drones = null;
      const arpF = this._arpFilter;
      const arpG = this._arpGain;
      this._arpFilter = null;
      this._arpGain = null;
      this._musicRunning = false;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      try {
        if (this.musicGain) {
          this.musicGain.gain.cancelScheduledValues(t);
          this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
          this.musicGain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
        }
      } catch (e) {}
      if (drones) {
        setTimeout(() => {
          drones.forEach(d => {
            try { d.o.stop(); } catch (e) {}
            try { d.lfo.stop(); } catch (e) {}
            try { d.g.disconnect(); } catch (e) {}
          });
        }, 550);
      }
      setTimeout(() => {
        try { if (arpF) arpF.disconnect(); } catch (e) {}
        try { if (arpG) arpG.disconnect(); } catch (e) {}
      }, 550);
    },

    _glideIntensity() {
      if (!this.ctx || !this._drones) return;
      const inten = this.intensity;
      this._drones.forEach(d => {
        try { d.f.frequency.setTargetAtTime(180 + inten * 500, this.ctx.currentTime, 0.8); } catch (e) {}
      });
    },

    _startMusic() {
      if (this._musicRunning || !this.ctx) return;
      const c = this.ctx;
      const mkDrone = (freq, detune, gainV) => {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = freq;
        o.detune.value = detune;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 220;
        f.Q.value = 0.8;
        const g = c.createGain();
        g.gain.value = this.muted ? 0 : gainV;
        const lfo = c.createOscillator();
        lfo.frequency.value = 0.07 + Math.random() * 0.05;
        const lg = c.createGain();
        lg.gain.value = 60;
        lfo.connect(lg);
        lg.connect(f.frequency);
        o.connect(f);
        f.connect(g);
        g.connect(this.musicGain);
        o.start();
        lfo.start();
        return { o, lfo, f, g, base: gainV };
      };
      this._drones = [mkDrone(55, -6, 0.16), mkDrone(55, 7, 0.14), mkDrone(82.4, 3, 0.08)];
      this._arpFilter = c.createBiquadFilter();
      this._arpFilter.type = 'lowpass';
      this._arpFilter.frequency.value = 600;
      this._arpGain = c.createGain();
      this._arpGain.gain.value = 0.5;
      this._arpFilter.connect(this._arpGain);
      this._arpGain.connect(this.musicGain);
      try {
        this.musicGain.gain.cancelScheduledValues(c.currentTime);
        this.musicGain.gain.setValueAtTime(0.0001, c.currentTime);
        this.musicGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.34, c.currentTime + 0.5);
      } catch (e) {}
      this._step = 0;
      this._musicRunning = true;
      this._glideIntensity();
      this._musicTimer = setInterval(() => {
        try {
          if (!this.ctx || this.muted) return;
          if (this.ctx.state === 'suspended') return;
          this._step++;
          const inten = this.intensity;
          if (this._drones) {
            this._drones.forEach(d => {
              try { d.f.frequency.setTargetAtTime(180 + inten * 500, c.currentTime, 0.8); } catch (e) {}
            });
          }
          const density = inten > 0.8 ? 1 : (inten > 0.55 ? 2 : 4);
          if (this._step % density !== 0) return;
          if (Math.random() > 0.35 + inten * 0.5) return;
          if (!this._tryAllocVoice()) return;
          const idx = (Math.floor(Math.random() * 4) + ARP_STEPS[this._step % 4]) % SCALE.length;
          const oct = Math.random() < 0.22 ? 2 : 1;
          const o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.value = SCALE[idx] * oct;
          const g = c.createGain();
          const t = c.currentTime;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.05 + inten * 0.05, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
          o.connect(g);
          g.connect(this._arpFilter);
          let released = false;
          const rel = () => { if (released) return; released = true; this._releaseVoice(); };
          try { o.onended = rel; } catch (e) {}
          o.start(t);
          o.stop(t + 1);
          setTimeout(rel, 1250);
        } catch (e) {}
      }, 250);
    }
  };
  return S;
})();
