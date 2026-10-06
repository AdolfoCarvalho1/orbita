'use strict';
class ResultScene extends Phaser.Scene {
  constructor(){ super('Result'); }

  init(d){
    d = d || {};
    this.victory = !!d.victory;
    this.score = d.score | 0;
    this.c = d.c | 0;
    this.p = d.p | 0;
    this.shipId = d.shipId || '';
    this.newRec = (d.newRec != null) ? !!d.newRec : null;
    this.sel = 0;
    this.keys = null;
    this.cursors = null;
    this.btns = [];
    this.actions = [];
    this._errTags = null;
  }

  create(){
    this.sel = 0;
    this.btns = [];
    this.actions = [];
    this._errTags = {};
    this.W = (typeof HDATA !== 'undefined' && HDATA && HDATA.W) ? HDATA.W : 450;
    this.H = (typeof HDATA !== 'undefined' && HDATA && HDATA.H) ? HDATA.H : 800;
    this.C = (typeof HDATA !== 'undefined' && HDATA && HDATA.COLORS) ? HDATA.COLORS : {
      bg: '#050914', panel: '#0d1526', text: '#e8eefc', cyan: '#38bdf8',
      red: '#f43f5e', gold: '#fbbf24', green: '#34d399', orange: '#fb923c',
      steel: '#e2e8f0'
    };
    this.sndMusic('menu');
    this.buildPanel();
    const idx = this.c * 5 + this.p;
    if (this.victory && idx + 1 <= 24){
      const n = idx + 1;
      this.actions.push({ label: 'PRÓXIMA', run: () => { this.goStage(Math.floor(n / 5), n % 5); } });
    }
    this.actions.push({ label: 'RETRY', run: () => { this.goStage(this.c, this.p); } });
    this.actions.push({ label: 'MENU', run: () => { this.scene.start('Menu'); } });
    this.buildButtons();
    try {
      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,Z,ENTER,ESC');
      }
    } catch (e) {
      this.cursors = null;
      this.keys = null;
      this.err('keys', e);
    }
    try { if (this.input.keyboard) this.input.keyboard.once('keydown', () => { this.sndUnlock(); }); } catch (e) {}
    try { this.input.once('pointerdown', () => { this.sndUnlock(); }); } catch (e) {}
    this.sndUnlock();
  }

  err(tag, e){
    try {
      if (!window.__errors || !e) return;
      if (!this._errTags) this._errTags = {};
      if (this._errTags[tag]) return;
      this._errTags[tag] = true;
      window.__errors.push(tag + ':' + e.message);
    } catch (_e) {}
  }

  sndUnlock(){
    try { if (typeof SND !== 'undefined' && SND && SND.unlock) SND.unlock(); } catch (e) {}
  }

  sndMusic(mode){
    try { if (typeof SND !== 'undefined' && SND && SND.startMusic) SND.startMusic(mode); } catch (e) {}
  }

  sndPlay(cue){
    try { if (typeof SND !== 'undefined' && SND && SND.play) SND.play(cue); } catch (e) {}
  }

  uiMove(){ this.sndPlay('uiMove'); }

  uiConfirm(){ this.sndPlay('uiConfirm'); }

  rgb(hex){
    try { return parseInt(String(hex).replace('#', ''), 16); } catch (e) { return 0xffffff; }
  }

  highScore(){
    try { if (typeof Progress !== 'undefined' && Progress && Progress.getHigh) return Progress.getHigh() | 0; } catch (e) {}
    return 0;
  }

  campName(){
    try {
      if (typeof HDATA !== 'undefined' && HDATA && HDATA.CAMPAIGNS && HDATA.CAMPAIGNS[this.c]) return HDATA.CAMPAIGNS[this.c].name || '';
    } catch (e) {}
    return '';
  }

  goStage(c, p){
    this.scene.start('Stage', { c: c, p: p, shipId: this.shipId });
  }

  buildPanel(){
    const C = this.C;
    const cx = this.W / 2;
    const idx = this.c * 5 + this.p;
    const letter = 'ABCDE'.charAt(this.c) || '';
    this.add.rectangle(cx, 400, 380, 420, this.rgb(C.panel), 0.95)
      .setStrokeStyle(2, this.rgb(C.cyan));
    this.add.text(cx, 228, this.victory ? 'FASE COMPLETA' : 'GAME OVER', {
      fontFamily: 'Orbitron', fontSize: '27px', fontStyle: 'bold',
      color: this.victory ? C.green : C.red
    }).setOrigin(0.5);
    this.add.text(cx, 272, 'FASE ' + (idx + 1) + (letter ? ' · ' + letter : ''), {
      fontFamily: 'Orbitron', fontSize: '16px', color: C.text
    }).setOrigin(0.5);
    this.add.text(cx, 298, this.campName(), {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.steel
    }).setOrigin(0.5).setAlpha(0.7);
    this.add.text(cx, 336, 'PONTOS', {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.steel
    }).setOrigin(0.5).setAlpha(0.7);
    this.add.text(cx, 386, String(Math.max(0, this.score)), {
      fontFamily: 'JetBrains Mono', fontSize: '40px', fontStyle: 'bold', color: C.gold
    }).setOrigin(0.5);
    const high = this.highScore();
    let newRec = this.newRec;
    if (newRec == null) newRec = this.score > 0 && this.score >= high;
    this.add.text(cx, 428, 'RECORDE ' + String(Math.max(0, high)).padStart(5, '0'), {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: newRec ? C.gold : C.steel
    }).setOrigin(0.5);
    if (newRec && this.score > 0){
      this.add.text(cx, 454, 'NOVO RECORDE!', {
        fontFamily: 'Orbitron', fontSize: '12px', color: C.green
      }).setOrigin(0.5);
    }
  }

  buildButtons(){
    const C = this.C;
    const n = this.actions.length;
    const bh = 40;
    const gap = 8;
    const blockH = n * bh + (n - 1) * gap;
    const top = 484 + (136 - blockH) / 2;
    this.btns = [];
    for (let i = 0; i < n; i++){
      const y = top + i * (bh + gap);
      const rect = this.add.rectangle(this.W / 2, y, 260, bh, this.rgb(C.panel), 1)
        .setStrokeStyle(1.5, this.rgb(C.cyan), 0.8)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(this.W / 2, y, this.actions[i].label, {
        fontFamily: 'Orbitron', fontSize: '15px', color: C.text
      }).setOrigin(0.5);
      const bi = i;
      rect.on('pointerover', () => { this.setSel(bi); });
      rect.on('pointerdown', () => { this.setSel(bi); this.activate(); });
      this.btns.push({ rect: rect, text: txt });
    }
    this.paintBtns();
  }

  paintBtns(){
    const C = this.C;
    for (let i = 0; i < this.btns.length; i++){
      const b = this.btns[i];
      const on = i === this.sel;
      b.rect.setFillStyle(this.rgb(on ? C.cyan : C.panel), 1);
      b.text.setColor(on ? '#050914' : C.text);
    }
  }

  setSel(i){
    if (i === this.sel){ this.paintBtns(); return; }
    this.sel = i;
    this.uiMove();
    this.paintBtns();
  }

  activate(){
    const a = this.actions[this.sel];
    if (!a) return;
    this.uiConfirm();
    try { a.run(); } catch (e) { this.err('act', e); }
  }

  update(){
    const K = this.keys;
    const CU = this.cursors;
    if (!K) return;
    const jd = (k) => { try { return !!(k && Phaser.Input.Keyboard.JustDown(k)); } catch (e) { return false; } };
    const n = this.actions.length;
    if (n > 0){
      if (jd(K.W) || jd(K.UP) || (CU && jd(CU.up))) this.setSel((this.sel - 1 + n) % n);
      if (jd(K.S) || jd(K.DOWN) || (CU && jd(CU.down))) this.setSel((this.sel + 1) % n);
    }
    if (jd(K.ENTER) || jd(K.SPACE) || jd(K.Z)) this.activate();
    if (jd(K.ESC)) this.scene.start('Menu');
  }
}
