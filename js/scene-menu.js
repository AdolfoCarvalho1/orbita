'use strict';
class MenuScene extends Phaser.Scene {
  constructor(){ super('Menu'); }

  init(){
    this.mode = 'title';
    this.shipSel = 0;
    this.shipSpec = 'A';
    this.stageSel = 0;
    this.keys = null;
    this.cursors = null;
    this._errTags = null;
  }

  create(){
    this.mode = 'title';
    this._errTags = {};
    this.W = (typeof HDATA !== 'undefined' && HDATA && HDATA.W) ? HDATA.W : 450;
    this.H = (typeof HDATA !== 'undefined' && HDATA && HDATA.H) ? HDATA.H : 800;
    this.C = (typeof HDATA !== 'undefined' && HDATA && HDATA.COLORS) ? HDATA.COLORS : {
      bg: '#050914', panel: '#0d1526', text: '#e8eefc', cyan: '#38bdf8',
      red: '#f43f5e', gold: '#fbbf24', green: '#34d399', orange: '#fb923c',
      steel: '#e2e8f0'
    };
    this.shipSel = this.shipIndexFromSave();
    this.stageSel = this.firstUnlocked();
    this.sndMusic('menu');
    try {
      if (this.input.keyboard) this.input.keyboard.once('keydown', () => { this.sndUnlock(); });
    } catch (e) {}
    try { this.input.once('pointerdown', () => { this.sndUnlock(); }); } catch (e) {}
    try {
      if (this.input.keyboard) {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,Z,M,ESC,ENTER,Q,E');
      }
    } catch (e) {
      this.cursors = null;
      this.keys = null;
      this.err('keys', e);
    }
    this.build();
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

  toggleMute(){
    try { if (typeof SND !== 'undefined' && SND && SND.setMuted) SND.setMuted(!SND.muted); } catch (e) {}
  }

  highScore(){
    try { if (typeof Progress !== 'undefined' && Progress && Progress.getHigh) return Progress.getHigh() | 0; } catch (e) {}
    return 0;
  }

  shipList(){
    try { if (typeof HDATA !== 'undefined' && HDATA && HDATA.SHIPS) return HDATA.SHIPS; } catch (e) {}
    return [];
  }

  campList(){
    try { if (typeof HDATA !== 'undefined' && HDATA && HDATA.CAMPAIGNS) return HDATA.CAMPAIGNS; } catch (e) {}
    return [];
  }

  isUnlocked(idx){
    try {
      if (typeof Progress !== 'undefined' && Progress && Progress.isUnlocked) return !!Progress.isUnlocked(Math.floor(idx / 5), idx % 5);
    } catch (e) {}
    return true;
  }

  shipIndexFromSave(){
    const list = this.shipList();
    try {
      if (typeof Progress !== 'undefined' && Progress && Progress.getLastShip) {
        const id = Progress.getLastShip();
        for (let i = 0; i < list.length; i++) if (list[i].id === id) return i;
      }
    } catch (e) {}
    return 0;
  }

  firstUnlocked(){
    for (let i = 0; i < 25; i++) if (this.isUnlocked(i)) return i;
    return 0;
  }

  rgb(hex){
    try {
      if (typeof hex === 'number') return hex & 0xffffff;
      if (typeof hex === 'string' && hex.charAt(0) !== '#' && /^[0-9]+$/.test(hex)) return parseInt(hex, 10) & 0xffffff;
      return parseInt(String(hex).replace('#', ''), 16);
    } catch (e) { return 0xffffff; }
  }

  build(){
    try { if (this.tweens) this.tweens.killAll(); } catch (e) {}
    this.children.removeAll(true);
    this.addStars();
    if (this.mode === 'ship') this.buildShip();
    else if (this.mode === 'stage') this.buildStage();
    else this.buildTitle();
  }

  addStars(){
    try {
      const c = this.rgb(this.C.text);
      for (let i = 0; i < 34; i++){
        const r = Math.random() < 0.25 ? 1.7 : 1;
        this.add.circle(Phaser.Math.Between(6, this.W - 6), Phaser.Math.Between(6, this.H - 6), r, c)
          .setAlpha(0.1 + Math.random() * 0.42);
      }
    } catch (e) { this.err('stars', e); }
  }

  buildTitle(){
    const C = this.C, cx = this.W / 2;
    this.add.text(cx, 200, 'NAVINHA', {
      fontFamily: 'Orbitron', fontSize: '62px', color: C.gold, fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(cx, 260, 'CAMPANHA ORBITAL', {
      fontFamily: 'Rajdhani', fontSize: '24px', color: C.cyan
    }).setOrigin(0.5);
    const blink = this.add.text(cx, 560, 'PRESSIONE ENTER', {
      fontFamily: 'Rajdhani', fontSize: '24px', color: C.text
    }).setOrigin(0.5);
    this.tweens.add({
      targets: blink, alpha: { start: 1, end: 0.12 },
      duration: 560, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
    this.add.text(this.W - 12, 14, 'RECORDE ' + String(Math.max(0, this.highScore())).padStart(5, '0'), {
      fontFamily: 'JetBrains Mono', fontSize: '14px', color: C.gold
    }).setOrigin(1, 0);
    this.add.text(cx, 768, 'ENTER confirma · ESC volta · M mute', {
      fontFamily: 'Rajdhani', fontSize: '14px', color: C.text
    }).setOrigin(0.5).setAlpha(0.55);
  }

  buildShip(){
    const C = this.C, list = this.shipList();
    if (!list.length){
      this.add.text(this.W / 2, 400, 'NAVES INDISPONIVEIS', {
        fontFamily: 'Orbitron', fontSize: '18px', color: C.red
      }).setOrigin(0.5);
      return;
    }
    if (this.shipSel >= list.length) this.shipSel = 0;
    this.add.text(16, 20, 'ESCOLHA SUA NAVE (1 das 10)', {
      fontFamily: 'Orbitron', fontSize: '15px', color: C.cyan
    });
    const sel = this.shipSel;
    for (let i = 0; i < list.length && i < 10; i++){
      const col = i % 2;
      const row = (i - col) / 2;
      const x = col === 0 ? 70 : 190;
      const y = 100 + row * 116;
      const on = i === sel;
      const key = 'tur_' + list[i].id;
      try {
        if (this.textures.exists(key)) this.add.image(x, y, key).setScale(on ? 2.2 : 2);
        else this.add.rectangle(x, y, 26, 26, this.rgb(list[i].color || C.steel));
      } catch (e) { this.err('shipart', e); }
      if (on) this.add.rectangle(x, y + 6, 110, 96).setStrokeStyle(2, this.rgb(C.cyan));
      this.add.text(x, y + 42, list[i].name, {
        fontFamily: 'Rajdhani', fontSize: '12px', color: on ? C.cyan : C.text,
        align: 'center', wordWrap: { width: 112 }
      }).setOrigin(0.5, 0).setAlpha(on ? 1 : 0.75);
    }
    const s = list[sel];
    const px = 351;
    this.add.rectangle(px, 355, 176, 574, this.rgb(C.panel), 0.96)
      .setStrokeStyle(1, this.rgb(C.cyan), 0.55);
    try {
      if (this.textures.exists('tur_' + s.id)) this.add.image(px, 132, 'tur_' + s.id).setScale(4);
      else this.add.rectangle(px, 132, 60, 60, this.rgb(s.color || C.steel));
    } catch (e) { this.err('bigship', e); }
    this.add.text(px, 210, s.name || '', {
      fontFamily: 'Orbitron', fontSize: '14px', color: C.gold,
      align: 'center', wordWrap: { width: 160 }
    }).setOrigin(0.5, 0);
    this.add.text(px, 258, s.desc || '', {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.text,
      align: 'center', wordWrap: { width: 158 }, lineSpacing: 3
    }).setOrigin(0.5, 0).setAlpha(0.85);
    const aOn = this.shipSpec !== 'B';
    const bOn = !aOn;
    this.add.text(px, 400, (aOn ? '> ' : '') + ((s.specA && s.specA.name) || ''), {
      fontFamily: 'Orbitron', fontSize: '12px', color: aOn ? '#38bdf8' : '#556',
      align: 'center', wordWrap: { width: 158 }
    }).setOrigin(0.5, 0);
    this.add.text(px, 428, (s.specA && s.specA.desc) || '', {
      fontFamily: 'Rajdhani', fontSize: aOn ? '12px' : '11px', color: C.text,
      align: 'center', wordWrap: { width: 158 }, lineSpacing: 2
    }).setOrigin(0.5, 0).setAlpha(aOn ? 1 : 0.45);
    this.add.text(px, 506, (bOn ? '> ' : '') + ((s.specB && s.specB.name) || ''), {
      fontFamily: 'Orbitron', fontSize: '12px', color: bOn ? '#f43f5e' : '#556',
      align: 'center', wordWrap: { width: 158 }
    }).setOrigin(0.5, 0);
    this.add.text(px, 534, (s.specB && s.specB.desc) || '', {
      fontFamily: 'Rajdhani', fontSize: bOn ? '12px' : '11px', color: C.text,
      align: 'center', wordWrap: { width: 158 }, lineSpacing: 2
    }).setOrigin(0.5, 0).setAlpha(bOn ? 1 : 0.45);
    this.add.text(px, 658, 'Q/E: TROCAR ESPECIALIDADE', {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.text,
      align: 'center', wordWrap: { width: 170 }
    }).setOrigin(0.5, 0).setAlpha(0.5);
    this.add.text(this.W / 2, 772, 'ENTER seleciona · ESC volta · Q/E espec · M mute', {
      fontFamily: 'Rajdhani', fontSize: '14px', color: C.text
    }).setOrigin(0.5).setAlpha(0.55);
  }

  buildStage(){
    const C = this.C;
    const camps = this.campList();
    const letters = 'ABCDE';
    this.add.text(16, 20, 'SELECIONE A FASE', {
      fontFamily: 'Orbitron', fontSize: '15px', color: C.cyan
    });
    for (let r = 0; r < 5; r++){
      const camp = camps[r];
      const accent = (camp && camp.accent) ? camp.accent : C.cyan;
      const y = 96 + r * 104;
      this.add.text(14, y, (camp && camp.name) ? camp.name : letters[r], {
        fontFamily: 'Orbitron', fontSize: '11px', color: accent,
        align: 'left', wordWrap: { width: 104 }, lineSpacing: 2
      }).setOrigin(0, 0.5).setAlpha(0.9);
      for (let ci = 0; ci < 5; ci++){
        const idx = r * 5 + ci;
        const x = 152 + ci * 60;
        const unlocked = this.isUnlocked(idx);
        const on = idx === this.stageSel;
        let fill, txtCol;
        if (on){ fill = this.rgb(C.cyan); txtCol = '#050914'; }
        else if (unlocked){ fill = this.rgb(C.panel); txtCol = C.text; }
        else { fill = this.rgb(C.panel); txtCol = '#556677'; }
        const rect = this.add.rectangle(x, y, 54, 54, fill, on ? 1 : 0.9);
        if (on || unlocked) rect.setStrokeStyle(on ? 2 : 1.5, this.rgb(C.cyan), on ? 1 : 0.7);
        this.add.text(x, y + 6, String(idx + 1), {
          fontFamily: 'Orbitron', fontSize: '18px', color: txtCol, fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(x, y - 14, letters[r], {
          fontFamily: 'Rajdhani', fontSize: '9px',
          color: on ? '#050914' : (unlocked ? C.cyan : '#556677')
        }).setOrigin(0.5);
      }
    }
    const idx = this.stageSel;
    const camp = camps[Math.floor(idx / 5)];
    const phase = (camp && camp.phases) ? camp.phases[idx % 5] : null;
    this.add.rectangle(225, 646, 418, 150, this.rgb(C.panel), 0.85)
      .setStrokeStyle(1, this.rgb(C.cyan), 0.4);
    const campName = camp ? (camp.name || '') : '';
    const campAccent = (camp && camp.accent) ? camp.accent : C.cyan;
    this.add.text(225, 585, campName, {
      fontFamily: 'Orbitron', fontSize: '13px', color: campAccent
    }).setOrigin(0.5);
    this.add.text(225, 612, (phase && phase.name) || '', {
      fontFamily: 'Orbitron', fontSize: '16px', color: C.gold
    }).setOrigin(0.5);
    this.add.text(225, 642, (phase && phase.desc) || '', {
      fontFamily: 'Rajdhani', fontSize: '14px', color: C.text,
      align: 'center', wordWrap: { width: 396 }, lineSpacing: 3
    }).setOrigin(0.5, 0).setAlpha(0.85);
    this.add.text(225, 716, this.objLabel(idx), {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.cyan
    }).setOrigin(0.5);
    this.add.text(225, 776, 'ENTER inicia · ESC volta · M mute', {
      fontFamily: 'Rajdhani', fontSize: '14px', color: C.text
    }).setOrigin(0.5).setAlpha(0.55);
  }

  objLabel(idx){
    try {
      const camps = this.campList();
      const camp = camps[Math.floor(idx / 5)];
      const phase = (camp && camp.phases) ? camp.phases[idx % 5] : null;
      if (!phase) return '';
      if (phase.obj === 'survive') return 'SOBREVIVA ' + (phase.dur || 0) + 's';
      if (phase.obj === 'boss'){
        if (phase.boss && typeof HDATA !== 'undefined' && HDATA.ENEMIES && HDATA.ENEMIES[phase.boss]) {
          return 'CHEFE: ' + HDATA.ENEMIES[phase.boss].label;
        }
        return 'CHEFE';
      }
      return 'ALVO: ' + (phase.kill || 0) + ' ABATES';
    } catch (e) { return ''; }
  }

  refreshShipSpec(){
    this.shipSpec = 'A';
    const list = this.shipList();
    const s = list[this.shipSel];
    try {
      if (s && typeof Progress !== 'undefined' && Progress && Progress.getSpec) {
        this.shipSpec = Progress.getSpec(s.id);
      }
    } catch (e) { this.err('getspec', e); }
  }

  saveShipSpec(id){
    try {
      if (typeof Progress !== 'undefined' && Progress && Progress.setSpec) {
        Progress.setSpec(id, this.shipSpec === 'B' ? 'B' : 'A');
      }
    } catch (e) { this.err('setspec', e); }
  }

  moveShip(dx, dy){
    const n = this.shipList().length || 10;
    let s = this.shipSel;
    if (dx) s = ((s + dx) % n + n) % n;
    if (dy) s = ((s + dy * 2) % n + n) % n;
    if (s !== this.shipSel){
      this.shipSel = s;
      this.refreshShipSpec();
      this.uiMove();
      this.build();
    }
  }

  stepStage(dr, dc){
    let row = Math.floor(this.stageSel / 5);
    let col = this.stageSel % 5;
    for (let k = 0; k < 25; k++){
      if (dc) col = (col + dc + 5) % 5;
      if (dr) row = (row + dr + 5) % 5;
      const ni = row * 5 + col;
      if (this.isUnlocked(ni)){
        if (ni !== this.stageSel){
          this.stageSel = ni;
          this.uiMove();
          this.build();
        }
        return;
      }
    }
  }

  startStage(idx){
    const list = this.shipList();
    const ship = list[this.shipSel] || list[0] || { id: 'cannon' };
    try {
      if (typeof Progress !== 'undefined' && Progress && Progress.setLastShip) Progress.setLastShip(ship.id);
    } catch (e) { this.err('setship', e); }
    this.saveShipSpec(ship.id);
    this.scene.start('Stage', { c: Math.floor(idx / 5), p: idx % 5, shipId: ship.id });
  }

  update(){
    const K = this.keys, CU = this.cursors;
    if (!K) return;
    const jd = (k) => { try { return !!(k && Phaser.Input.Keyboard.JustDown(k)); } catch (e) { return false; } };
    if (jd(K.M)) this.toggleMute();
    const confirm = jd(K.ENTER) || jd(K.SPACE) || jd(K.Z);
    const esc = jd(K.ESC);
    if (this.mode === 'title'){
      if (confirm){
        this.uiConfirm();
        this.mode = 'ship';
        this.refreshShipSpec();
        this.build();
      }
      return;
    }
    if (this.mode === 'ship'){
      if (jd(K.Q) || jd(K.E)){
        this.shipSpec = this.shipSpec === 'A' ? 'B' : 'A';
        this.uiMove();
        this.build();
      }
      if (jd(K.A) || jd(CU.left)) this.moveShip(-1, 0);
      else if (jd(K.D) || jd(CU.right)) this.moveShip(1, 0);
      if (jd(K.W) || jd(CU.up)) this.moveShip(0, -1);
      else if (jd(K.S) || jd(CU.down)) this.moveShip(0, 1);
      if (confirm){
        this.uiConfirm();
        const ship = this.shipList()[this.shipSel];
        if (ship) this.saveShipSpec(ship.id);
        this.mode = 'stage';
        this.build();
      } else if (esc){
        this.uiConfirm();
        this.mode = 'title';
        this.build();
      }
      return;
    }
    if (this.mode === 'stage'){
      if (jd(K.A) || jd(CU.left)) this.stepStage(0, -1);
      else if (jd(K.D) || jd(CU.right)) this.stepStage(0, 1);
      if (jd(K.W) || jd(CU.up)) this.stepStage(-1, 0);
      else if (jd(K.S) || jd(CU.down)) this.stepStage(1, 0);
      if (confirm){
        if (this.isUnlocked(this.stageSel)){
          this.uiConfirm();
          this.startStage(this.stageSel);
        }
      } else if (esc){
        this.uiConfirm();
        this.mode = 'ship';
        this.refreshShipSpec();
        this.build();
      }
    }
  }
}
