/* Defesa Orbital v3 — Áudio 100% procedural (Web Audio API, sem assets externos) */
'use strict';
(function () {
  const AudioSys = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    muted: false, musicTimer: null, musicMode: 'menu', intensity: 0.35,
    _beams: {}, _noiseBuf: null, _step: 0, _unlocked: false,
    lastPlay: {}, _voices: 0, _maxVoices: 12, _comp: null,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
        // Aplica o mute pendente assim que o contexto nasce/retorna
        try { this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.02); } catch (e) {}
        return true;
      }
      const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.55;
        try {
          this._comp = this.ctx.createDynamicsCompressor();
          this._comp.threshold.value = -18;
          this._comp.ratio.value = 6;
          this.master.connect(this._comp);
          this._comp.connect(this.ctx.destination);
        } catch (e) { this._comp = null; this.master.connect(this.ctx.destination); }
        this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.34; this.musicGain.connect(this.master);
        this._startMusic();
        return true;
      } catch (e) { this.ctx = null; return false; }
    },

    unlock() {
      if (this._unlocked) { this.ensure(); return; }
      this._unlocked = true;
      // Cria o contexto só no primeiro gesto real (política de autoplay do Chrome)
      if (typeof document !== 'undefined') {
        const kick = () => { this.ensure(); };
        document.addEventListener('pointerdown', kick, { passive: true });
        document.addEventListener('keydown', kick, { passive: true });
      }
    },

    setMuted(v) {
      this.muted = !!v;
      // sempre persiste, mesmo sem ctx
      try{ localStorage.setItem('defesa_orbital_v3_muted', this.muted?'1':'0'); }catch(e){}
      try{ if(typeof D!=="undefined" && D.Save && D.Save.data) { D.Save.data.muted=this.muted; D.Save.save(); } }catch(e){}
      if (!this.ctx || !this.master) return;
      try {
        const t = this.ctx.currentTime;
        // mute imediato + cancelamento de ramps pendentes
        try{ this.master.gain.cancelScheduledValues(t); }catch(e){}
        try{ if(this.musicGain) this.musicGain.gain.cancelScheduledValues(t); }catch(e){}
        try{ if(this.sfxGain) this.sfxGain.gain.cancelScheduledValues(t); }catch(e){}
        if(this.muted){
          this.master.gain.setValueAtTime(0, t);
          if(this.musicGain) this.musicGain.gain.setValueAtTime(0, t);
          if(this.sfxGain) this.sfxGain.gain.setValueAtTime(0, t);
          this.laserStopAll();
          // para drones imediatamente
          if(this._drones) this._drones.forEach(d=>{ try{ d.g.gain.setValueAtTime(0,t); }catch(e){} });
        } else {
          this.master.gain.setValueAtTime(0.55, t);
          if(this.musicGain) this.musicGain.gain.setValueAtTime(0.34, t);
          if(this.sfxGain) this.sfxGain.gain.setValueAtTime(0.9, t);
          // ONDA 5: restaura o ganho BASE do drone (d.g.gain.value já foi zerado no mute; antes o som sumia)
          if(this._drones) this._drones.forEach(d=>{ try{ d.g.gain.setValueAtTime(d.base != null ? d.base : 0.16, t); }catch(e){} });
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
      if (this._voices >= (this._maxVoices || 12)) return false;
      this._voices++;
      return true;
    },

    _releaseVoice() {
      if (this._voices > 0) this._voices--;
    },

    tone(freq, dur, type, vol, slideTo, when) {
      if (!this.ensure() || this.muted) return;
      if (!this._tryAllocVoice()) return;
      const t = this.ctx.currentTime + (when || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.15), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.sfxGain);
      let _released = false;
      const _rel = () => { if (_released) return; _released = true; this._releaseVoice(); };
      try { o.onended = _rel; } catch (e) {}
      o.start(t); o.stop(t + dur + 0.05);
      setTimeout(_rel, (dur || 0) * 1000 + ((when || 0) * 1000) + 250);
    },

    noiseHit(dur, vol, filterFreq, filterType, slideTo) {
      if (!this.ensure() || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noise(); src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = filterType || 'lowpass';
      f.frequency.setValueAtTime(filterFreq || 1000, t);
      if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.sfxGain);
      src.start(t); src.stop(t + dur + 0.05);
    },

    /* ---- SFX de tiro por tipo de torre ---- */
    shoot(kind, specBranch) {
      if (this._throttled('shoot', 45)) return;
      switch (kind) {
        case 'bullet':
          if (specBranch === 'B') { this.tone(520, 0.05, 'square', 0.06, 240); }
          else this.tone(150, 0.14, 'sawtooth', 0.16, 55), this.noiseHit(0.08, 0.1, 900);
          break;
        case 'splash': this.noiseHit(0.28, 0.12, 500, 'bandpass', 2200); this.tone(340, 0.2, 'triangle', 0.08, 90); break;
        case 'slow': this.tone(340, 0.16, 'triangle', 0.1, 180); this.tone(680, 0.1, 'sine', 0.05, 300); break;
        case 'chain': this.noiseHit(0.1, 0.14, 3200, 'highpass'); this.tone(1700, 0.08, 'square', 0.07, 220); break;
        case 'snipe': this.tone(1250, 0.1, 'square', 0.14, 90); this.noiseHit(0.06, 0.1, 4200, 'highpass'); break;
        case 'dot': this.tone(210, 0.16, 'sawtooth', 0.07, 160); break;
        case 'pierce': this.tone(90, 0.2, 'square', 0.18, 900); this.noiseHit(0.14, 0.14, 2600, 'highpass'); break;
        default: this.tone(400, 0.06, 'square', 0.08);
      }
    },
    gatlingTick() { this.tone(700 + Math.random() * 200, 0.03, 'square', 0.045, 300); },
    laserStart(key) {
      if (!this.ensure() || this.muted || this._beams[key]) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 82;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.05);
      o.connect(f); f.connect(g); g.connect(this.sfxGain); o.start();
      this._beams[key] = { o, g };
    },
    laserStop(key) {
      const b = this._beams[key];
      if (!b) return;
      delete this._beams[key];
      try {
        b.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
        b.o.stop(this.ctx.currentTime + 0.15);
      } catch (e) {}
    },
    laserStopAll() { Object.keys(this._beams).forEach(k => this.laserStop(k)); },

    explosion(size) {
      if (this._throttled('explosion', 80)) return;
      const s = size || 1;
      this.tone(110, 0.42 * s, 'sine', Math.min(0.5, 0.34 * s), 32);
      this.tone(48, 0.6 * s, 'sine', Math.min(0.45, 0.28 * s), 18);
      this.noiseHit(0.5 * s, Math.min(0.55, 0.30 * s), 1600 * s + 500, 'lowpass', 70);
      if(s>1.2){ this.noiseHit(0.35, 0.18, 4200, 'highpass'); this.tone(1800, 0.08, 'square', 0.08, 400); }
    },
    combo(n){
      if (this._throttled('combo', 35)) return;
      const base = 440 + Math.min(24, n) * 28;
      this.tone(base, 0.14, 'sine', 0.11, base*1.35);
      if(n>=5) this.tone(base*1.5, 0.10, 'triangle', 0.07);
      if(n>=10) this.tone(base*2, 0.08, 'square', 0.05, base*1.8);
      if(n>=15) { this.noiseHit(0.06, 0.08, 3000, 'highpass'); }
    },
    comboBreak(){ this.tone(320, 0.18, 'sawtooth', 0.13, 140); this.tone(180, 0.22, 'sine', 0.10, 90); },
    mutation(){ [523,659,784,1046,1318].forEach((f,i)=> this.tone(f, 0.18, 'triangle', 0.13, undefined, i*0.09)); this.noiseHit(0.4, 0.07, 6000, 'highpass'); },
    mutPick(){ this.tone(880, 0.12, 'sine', 0.16); this.tone(1320, 0.20, 'triangle', 0.14, undefined, 0.07); this.tone(1760, 0.28, 'sine', 0.12, undefined, 0.14); },
    ui() { this.tone(1900, 0.035, 'square', 0.05, 1400); },
    uiBack() { this.tone(900, 0.05, 'square', 0.05, 500); },
    buy() { this.tone(660, 0.07, 'triangle', 0.12); this.tone(990, 0.1, 'triangle', 0.12, undefined, 0.07); },
    upgrade() { this.tone(520, 0.08, 'triangle', 0.13); this.tone(780, 0.08, 'triangle', 0.13, undefined, 0.08); this.tone(1170, 0.14, 'triangle', 0.13, undefined, 0.16); this.noiseHit(0.12, 0.06, 4000, 'highpass'); },
    error() { this.tone(140, 0.16, 'sawtooth', 0.14, 90); },
    coin() { this.tone(1320, 0.06, 'sine', 0.09); this.tone(1760, 0.09, 'sine', 0.09, undefined, 0.05); },
    coinBig(){ this.tone(1320, 0.07, 'sine', 0.12); this.tone(1760, 0.10, 'sine', 0.12, undefined, 0.05); this.tone(2200, 0.14, 'triangle', 0.10, undefined, 0.10); },
    lifeLost() { this.tone(220, 0.3, 'sawtooth', 0.2, 70); this.tone(330, 0.25, 'square', 0.1, 110, 0.05); this.noiseHit(0.3, 0.14, 600, 'lowpass', 40); },
    leak() { this.tone(180, 0.35, 'sawtooth', 0.22, 50); this.tone(110, 0.4, 'square', 0.14, 35); },
    waveStart() { this.tone(392, 0.12, 'triangle', 0.14); this.tone(523, 0.14, 'triangle', 0.14, undefined, 0.1); this.tone(659, 0.10, 'sine', 0.08, undefined, 0.18); },
    waveClear(){ this.tone(659, 0.12, 'triangle', 0.15); this.tone(784, 0.12, 'triangle', 0.15, undefined, 0.08); this.tone(1046, 0.22, 'sine', 0.16, undefined, 0.16); this.noiseHit(0.15, 0.08, 5000, 'highpass'); },
    bossAlert() {
      for (let i = 0; i < 3; i++) this.tone(440, 0.24, 'sawtooth', 0.18, 700, i * 0.28);
      this.tone(110, 0.9, 'sawtooth', 0.22, 55);
      this.noiseHit(1.2, 0.13, 280, 'lowpass', 50);
    },
    bossDeath(){ this.tone(180, 0.5, 'sawtooth', 0.26, 480); this.tone(90, 0.8, 'sine', 0.30, 28); this.noiseHit(0.9, 0.28, 1200, 'lowpass', 60); for(let i=0;i<3;i++) this.tone(900+i*300, 0.12, 'square', 0.07, 300, i*0.11); },
    superFire() { this.tone(120, 0.5, 'sawtooth', 0.24, 480); this.noiseHit(0.5, 0.2, 2400, 'bandpass', 300); },
    superIon(){ this.tone(55, 1.2, 'sawtooth', 0.30, 480); this.tone(110, 0.9, 'square', 0.18, 700); this.noiseHit(0.9, 0.22, 3000, 'bandpass', 80); for(let i=0;i<4;i++) this.tone(1200+i*400, 0.08, 'square', 0.06, 600, i*0.07); },
    superEmp(){ this.tone(180, 0.7, 'sine', 0.22, 40); this.noiseHit(0.8, 0.26, 800, 'lowpass', 30); this.tone(2400, 0.25, 'square', 0.09, 200, 0.3); },
    superVortex(){ this.tone(70, 1.0, 'sawtooth', 0.20, 22); this.tone(140, 0.8, 'square', 0.12, 35); this.noiseHit(1.0, 0.10, 400, 'lowpass', 120); },
    overdriveOn(){ this.tone(440, 0.18, 'square', 0.14, 880); this.tone(660, 0.22, 'triangle', 0.14, undefined, 0.08); this.noiseHit(0.4, 0.12, 5000, 'highpass'); },
    victory() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.16, undefined, i * 0.13)); this.tone(1318, 0.5, 'sine', 0.15, undefined, 0.55); },
    defeat() { [392, 311, 261, 174].forEach((f, i) => this.tone(f, 0.4, 'sawtooth', 0.14, undefined, i * 0.22)); this.noiseHit(0.8, 0.12, 400, 'lowpass', 40); },
    achievement() { this.tone(880, 0.1, 'sine', 0.13); this.tone(1318, 0.16, 'sine', 0.13, undefined, 0.09); this.tone(1760, 0.20, 'triangle', 0.08, undefined, 0.18); },
    star(i) { this.tone(660 + i * 220, 0.22, 'triangle', 0.17); this.tone(990 + i * 220, 0.3, 'sine', 0.1, undefined, 0.05); },
    build() { this.tone(300, 0.08, 'square', 0.1, 500); this.noiseHit(0.06, 0.06, 1800, 'highpass'); },
    sell() { this.tone(500, 0.1, 'triangle', 0.1, 250); this.coin(); },

    /* ---- Música procedural: drone + arpejo pentatônico ---- */
    _startMusic() {
      if (this.musicTimer) return;
      const c = this.ctx;
      const mkDrone = (freq, detune, gainV) => {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = detune;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 0.8;
        const g = c.createGain(); g.gain.value = gainV;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05;
        const lg = c.createGain(); lg.gain.value = 60;
        lfo.connect(lg); lg.connect(f.frequency);
        o.connect(f); f.connect(g); g.connect(this.musicGain);
        o.start(); lfo.start();
        return { f, g, base: gainV };
      };
      this._drones = [mkDrone(55, -6, 0.16), mkDrone(55, 7, 0.14), mkDrone(82.4, 3, 0.08)];
      this._arpFilter = c.createBiquadFilter();
      this._arpFilter.type = 'lowpass'; this._arpFilter.frequency.value = 600;
      this._arpGain = c.createGain(); this._arpGain.gain.value = 0.5;
      this._arpFilter.connect(this._arpGain); this._arpGain.connect(this.musicGain);
      const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
      this.musicTimer = setInterval(() => {
        if (!this.ctx || this.muted) return;
        if (this.ctx.state === 'suspended') return;
        if (this.musicMode === 'paused' || this.musicMode === 'menu') return;
        this._step++;
        const inten = this.intensity;
        this._drones.forEach(d => { d.f.frequency.setTargetAtTime(180 + inten * 500, c.currentTime, 0.8); });
        const density = inten > 0.8 ? 1 : (inten > 0.55 ? 2 : 4);
        if (this._step % density !== 0) return;
        if (Math.random() > 0.35 + inten * 0.5) return;
        if (!this._tryAllocVoice()) return;
        const idx = (Math.floor(Math.random() * 4) + [0, 2, 4, 1][this._step % 4]) % SCALE.length;
        const oct = Math.random() < 0.22 ? 2 : 1;
        const o = c.createOscillator(); o.type = 'triangle';
        o.frequency.value = SCALE[idx] * oct;
        const g = c.createGain();
        const t = c.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05 + inten * 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(this._arpFilter); o.connect(g); g.connect(this._arpFilter);
        let _arpReleased = false;
        const _arpRel = () => { if (_arpReleased) return; _arpReleased = true; this._releaseVoice(); };
        try { o.onended = _arpRel; } catch (e) {}
        o.start(t); o.stop(t + 1);
        setTimeout(_arpRel, 1250);
      }, 250);
    },

    setMode(mode, wave, isBoss) {
      const ok = ['menu', 'combat', 'boss', 'paused', 'victory', 'defeat'];
      if (ok.indexOf(mode) === -1) return;
      if (mode === 'boss') return this.musicTick('boss', wave, true);
      return this.musicTick(mode, wave, isBoss);
    },

    musicTick(mode, wave, isBoss) {
      if (typeof mode === 'string' && mode) this.musicMode = mode;
      if (isBoss) this.musicMode = 'boss';
      let inten = 0.35;
      if (mode === 'combat') inten = 0.5 + Math.min(0.35, (wave || 0) * 0.02);
      if (mode === 'menu') inten = 0.3;
      if (mode === 'boss' || isBoss) inten = 0.95;
      if (mode === 'paused') inten = 0.15;
      if (mode === 'victory') inten = 0.6;
      if (mode === 'defeat') inten = 0.2; // Brief 07 A11: derrota acalma a trilha
      this.intensity = inten;
    }
  };

  if (typeof window !== 'undefined') window.AudioSys = AudioSys;
  if (typeof module !== 'undefined' && module.exports) module.exports = AudioSys;
})();
