'use strict';
class StageScene extends Phaser.Scene {
  constructor(){ super('Stage'); }

  init(data){
    this.run = data || {};
  }

  create(){
    this._errTags = {};
    this.finished = false;
    this.victory = false;
    this._cueDefeat = false;
    this.W = (typeof HDATA !== 'undefined' && HDATA && HDATA.W) ? HDATA.W : 450;
    this.H = (typeof HDATA !== 'undefined' && HDATA && HDATA.H) ? HDATA.H : 800;
    this.C = (typeof HDATA !== 'undefined' && HDATA && HDATA.COLORS) ? HDATA.COLORS : {
      bg: '#050914', panel: '#0d1526', text: '#e8eefc', cyan: '#38bdf8',
      red: '#f43f5e', gold: '#fbbf24', green: '#34d399', orange: '#fb923c',
      steel: '#e2e8f0'
    };
    this.c = (this.run.c | 0);
    this.p = (this.run.p | 0);
    const ships = (typeof HDATA !== 'undefined' && HDATA && HDATA.SHIPS) ? HDATA.SHIPS : [];
    let ship = null;
    for (let i = 0; i < ships.length; i++) if (ships[i].id === this.run.shipId) ship = ships[i];
    this.ship = ship || ships[0] || { id: 'cannon', name: 'Corveta', speed: 220, fireDelay: 280, dmg: 7 };
    this.shipId = this.ship.id;
    this.shipSpec = (typeof Progress !== 'undefined' && Progress && Progress.getSpec) ? Progress.getSpec(this.ship.id) : 'A';
    this.superCharge = 0;
    this.superBusy = false;
    const old = ['enemies', 'playerBullets', 'enemyBullets', 'powerups'];
    for (let i = 0; i < old.length; i++){
      const g = this[old[i]];
      if (g && g.destroy){ try { g.destroy(); } catch (e) {} }
      this[old[i]] = null;
    }
    this.enemies = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.powerups = this.physics.add.group();
    const key = 'tur_' + this.shipId;
    this.player = this.physics.add.sprite(225, 720, key);
    try {
      const pb = this.player.body;
      if (pb && pb.setCircle){
        const bw = this.player.width || 32;
        const bh = this.player.height || 32;
        pb.setCircle(16, Math.round((bw - 32) / 2), Math.round((bh - 32) / 2));
      }
      this.player.setCollideWorldBounds(true);
      this.player.setDepth(6);
    } catch (e) { this.err('pbody', e); }
    this.aura = this.add.circle(225, 720, 30, 0x38bdf8, 0.15).setDepth(5);
    this.auraRing = this.add.circle(225, 720, 22, 0x38bdf8, 0).setStrokeStyle(2, 0x38bdf8, 0.55).setDepth(5);
    const D = (typeof HDATA !== 'undefined' && HDATA) ? HDATA : {};
    this.lives = D.LIVES != null ? D.LIVES : 3;
    this.bombs = D.BOMBS_START != null ? D.BOMBS_START : 2;
    this.iframe = 0;
    this.score = 0;
    this.fireT = 0;
    this.tier = 0;
    this.rapidT = 0;
    this.bombsUsed = 0;
    this.camp = { kills: 0, won: false, bossAlive: false };
    this.hud = null;
    try {
      if (typeof GameWeapons !== 'undefined' && GameWeapons){
        if (GameWeapons.setShip) GameWeapons.setShip(this.shipId, this.shipSpec);
        if (GameWeapons.reset) GameWeapons.reset(this);
        if (GameWeapons.setTier) GameWeapons.setTier(this.tier | 0);
      }
    } catch (e) { this.err('weainit', e); }
    this.sndMusic('combat');
    try {
      if (typeof GameCampaign !== 'undefined' && GameCampaign && GameCampaign.begin) GameCampaign.begin(this, this.c, this.p);
    } catch (e) { this.err('camp', e); }
    try {
      this.cursors = this.input.keyboard ? this.input.keyboard.createCursorKeys() : null;
      this.keys = this.input.keyboard ? this.input.keyboard.addKeys('W,A,S,D,X,Q,M,ESC,ENTER') : null;
    } catch (e) {
      this.cursors = null;
      this.keys = null;
      this.err('keys', e);
    }
    try { if (this.input.keyboard) this.input.keyboard.once('keydown', () => { this.sndUnlock(); }); } catch (e) {}
    try { this.input.once('pointerdown', () => { this.sndUnlock(); }); } catch (e) {}
    try { if (typeof SND !== 'undefined' && SND && SND.ctx) this.sndUnlock(); } catch (e) {}
    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) => { this.onBulletHit(b, e); });
    this.physics.add.overlap(this.enemyBullets, this.player, (b) => { this.onEnemyBulletHit(b); });
    this.physics.add.overlap(this.enemies, this.player, (e) => { this.onEnemyTouch(e); });
    this.physics.add.overlap(this.player, this.powerups, (_p, pu) => { this.onPowerupTouch(pu); });
    this.buildHud();
    this.refreshHud();
    try {
      const sp = (this.shipSpec === 'B' && this.ship.specB) ? this.ship.specB : this.ship.specA;
      if (sp && sp.name) this.banner(sp.name, 1500);
    } catch (e) {}
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

  toggleMute(){
    try { if (typeof SND !== 'undefined' && SND && SND.setMuted) SND.setMuted(!SND.muted); } catch (e) {}
  }

  rgb(hex){
    try {
      if (typeof hex === 'number') return hex & 0xffffff;
      if (typeof hex === 'string' && hex.charAt(0) !== '#' && /^[0-9]+$/.test(hex)) return parseInt(hex, 10) & 0xffffff;
      return parseInt(String(hex).replace('#', ''), 16);
    } catch (e) { return 0xffffff; }
  }

  rules(){
    try { if (typeof HDATA !== 'undefined' && HDATA && HDATA.POWERUP_RULES) return HDATA.POWERUP_RULES; } catch (e) {}
    return { chance: 0.05, everyKills: 11, rapidMul: 0.55, rapidDur: 8, tierMul: 0.82, tierMax: 4 };
  }

  spawnPlayerBullet(o){
    o = o || {};
    try {
      const w = o.w != null ? o.w : 6;
      const h = o.h != null ? o.h : 14;
      const color = o.color != null ? o.color : this.C.cyan;
      const px = o.x != null ? o.x : (this.player ? this.player.x : 225);
      const py = o.y != null ? o.y : (this.player ? this.player.y : 720);
      const rect = this.add.rectangle(px, py, w, h, this.rgb(color));
      this.physics.add.existing(rect);
      const body = rect.body;
      body.setAllowGravity(false);
      let vx = o.vx, vy = o.vy;
      if (vx == null && vy == null){
        if (o.speed != null && o.angle != null){
          vx = Math.cos(o.angle) * o.speed;
          vy = Math.sin(o.angle) * o.speed;
        } else if (o.speed != null){
          vx = 0;
          vy = -o.speed;
        } else {
          vx = 0;
          vy = -640;
        }
      } else {
        vx = vx || 0;
        vy = vy || 0;
      }
      rect.dmg = o.dmg != null ? o.dmg : 1;
      rect.pierce = o.pierce != null ? o.pierce : 1;
      rect.kind = o.kind || 'shot';
      rect.w = w;
      rect.h = h;
      if (o.poison) rect.poison = o.poison;
      if (o.splash != null) rect.splash = o.splash;
      if (o.burn != null) rect.burn = o.burn;
      this.playerBullets.add(rect);
      body.setVelocity(vx, vy);
      try { rect.setStrokeStyle(1, 0x38bdf8, 1); } catch (e) {}
      return rect;
    } catch (e) {
      this.err('pbullet', e);
      return null;
    }
  }

  spawnEnemyBullet(o){
    o = o || {};
    try {
      const w = o.w != null ? o.w : 5;
      const h = o.h != null ? o.h : 5;
      const color = o.color != null ? o.color : '#fbbf24';
      const px = o.x != null ? o.x : (this.player ? this.player.x : 225);
      const py = o.y != null ? o.y : 60;
      const rect = this.add.rectangle(px, py, w, h, this.rgb(color));
      this.physics.add.existing(rect);
      const body = rect.body;
      body.setAllowGravity(false);
      let vx = o.vx, vy = o.vy;
      if (vx == null && vy == null){
        if (o.speed != null && o.angle != null){
          vx = Math.cos(o.angle) * o.speed;
          vy = Math.sin(o.angle) * o.speed;
        } else {
          vx = 0;
          vy = o.speed != null ? o.speed : 220;
        }
      } else {
        vx = vx || 0;
        vy = vy || 0;
      }
      rect.dmg = o.dmg != null ? o.dmg : 1;
      rect.w = w;
      rect.h = h;
      this.enemyBullets.add(rect);
      body.setVelocity(vx, vy);
      return rect;
    } catch (e) {
      this.err('ebullet', e);
      return null;
    }
  }

  dealDamage(e, dmg, opts){
    if (!e || e.active === false) return false;
    try {
      if (typeof GameEnemies === 'undefined' || !GameEnemies || !GameEnemies.applyDamage) return false;
      if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.modifyDamage) dmg = GameWeapons.modifyDamage(this, e, dmg);
      const r = GameEnemies.applyDamage(this, e, dmg, opts) || {};
      if (r.died) this.onEnemyKilled(e, !!r.wasBoss);
      return !!r.died;
    } catch (e2) {
      this.err('dmg', e2);
      return false;
    }
  }

  triggerSuper(){
    if (this.superBusy) return;
    this.superBusy = true;
    this.superCharge = 0;
    let name = null;
    try {
      if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.super) name = GameWeapons.super(this, this.run.shipId, this.shipSpec);
    } catch (e) { this.err('super', e); }
    const sn = (this.ship && this.ship.super && this.ship.super.name) || null;
    this.banner('SUPER: ' + (name || sn || 'ULTIMO RECURSO'), 1600);
    try {
      const f = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xffffff)
        .setDepth(200).setAlpha(0.5);
      this.tweens.add({ targets: f, alpha: 0, duration: 180, onComplete: () => { f.destroy(); } });
    } catch (e) {}
    try { this.cameras.main.shake(200, 0.006); } catch (e) {}
    this.sndPlay('bomb');
    try {
      this.time.delayedCall(400, () => { this.superBusy = false; });
    } catch (e) { this.superBusy = false; }
  }

  nearestEnemy(x, y, maxDist){
    if (maxDist == null) maxDist = 9999;
    let best = null;
    let bd = maxDist * maxDist;
    try {
      const arr = this.enemies.getChildren();
      for (let i = 0; i < arr.length; i++){
        const e = arr[i];
        if (!e || e.active === false) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const d = dx * dx + dy * dy;
        if (d <= bd){ bd = d; best = e; }
      }
    } catch (e2) { this.err('near', e2); }
    return best;
  }

  startBoss(bossId, mul){
    try {
      if (typeof GameEnemies === 'undefined' || !GameEnemies || !GameEnemies.spawnBoss) return null;
      const b = GameEnemies.spawnBoss(this, bossId, { bossMul: mul });
      if (this.camp) this.camp.bossAlive = true;
      this.sndPlay('bossAlert');
      this.sndMusic('boss');
      return b;
    } catch (e) {
      this.err('boss', e);
      return null;
    }
  }

  onEnemyKilled(e, wasBoss){
    if (!e || e.counted) return;
    e.counted = true;
    try {
      const S = (typeof HDATA !== 'undefined' && HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
      const inc = wasBoss ? ((S && S.perBoss != null) ? S.perBoss : 15) : ((S && S.perKill != null) ? S.perKill : 1);
      this.superCharge = (this.superCharge || 0) + inc;
      let pts = e.pts;
      if (pts == null){
        const def = this.enemyDef(e);
        pts = def && def.pts != null ? def.pts : 0;
      }
      pts = pts | 0;
      this.score += pts;
      const R = this.rules();
      if (this.camp){
        this.camp.kills = (this.camp.kills | 0) + 1;
        if (wasBoss){
          this.camp.bossAlive = false;
          this.camp.won = true;
        }
      }
      const k = this.camp ? (this.camp.kills | 0) : 0;
      const every = R.everyKills | 0;
      if (Math.random() < (R.chance || 0) || (every > 0 && k % every === 0)){
        this.spawnRandomPowerup(e.x, e.y);
      }
      this.floatText(e.x, e.y - 8, '+' + pts, this.C.gold);
      this.burst(e.x, e.y, this.enemyColor(e));
      this.sndPlay(wasBoss ? 'bossDeath' : 'explosion');
      if (wasBoss){ try { this.cameras.main.shake(320, 0.012); } catch (e2) {} }
    } catch (e2) {
      this.err('kill', e2);
    }
  }

  spawnRandomPowerup(x, y){
    try {
      let keys = ['P', 'S', 'B', 'R'];
      if (typeof HDATA !== 'undefined' && HDATA && HDATA.POWERUPS){
        const k = Object.keys(HDATA.POWERUPS);
        if (k.length) keys = k;
      }
      this.spawnPowerup(x, y, keys[Phaser.Math.Between(0, keys.length - 1)]);
    } catch (e) { this.err('pur', e); }
  }

  spawnPowerup(x, y, type){
    try {
      const key = 'pu_' + type;
      let o = null;
      if (this.textures.exists(key)){
        o = this.physics.add.sprite(x, y, key);
      } else {
        o = this.add.rectangle(x, y, 16, 16, this.rgb(this.puColor(type)));
        this.physics.add.existing(o);
      }
      if (o.body){
        o.body.setAllowGravity(false);
        o.body.setVelocity(0, 64);
      }
      o.puType = type;
      this.powerups.add(o);
      return o;
    } catch (e) {
      this.err('pu', e);
      return null;
    }
  }

  puColor(t){
    const C = this.C;
    if (t === 'P') return C.cyan;
    if (t === 'S') return C.green;
    if (t === 'B') return C.orange;
    if (t === 'R') return C.acid || '#a3e635';
    return C.text;
  }

  enemyDef(e){
    try {
      if (typeof HDATA === 'undefined' || !HDATA || !HDATA.ENEMIES || !e) return null;
      if (e.def && typeof e.def === 'object') return e.def;
      const ids = [e.typeId, e.type, e.kind, e.enemyId, e.id];
      for (let i = 0; i < ids.length; i++){
        if (ids[i] && HDATA.ENEMIES[ids[i]]) return HDATA.ENEMIES[ids[i]];
      }
    } catch (e2) {}
    return null;
  }

  enemyColor(e){
    try {
      if (e && e.col) return e.col;
      if (e && e.def && typeof e.def === 'object' && e.def.col) return e.def.col;
      const def = this.enemyDef(e);
      if (def && def.col) return def.col;
    } catch (e2) {}
    return '#ffffff';
  }

  burst(x, y, hex){
    try {
      const c = this.add.circle(x, y, 14, this.rgb(hex)).setDepth(60);
      this.tweens.add({
        targets: c, scale: 2.6, alpha: 0, duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => { c.destroy(); }
      });
    } catch (e) { this.err('burst', e); }
  }

  floatText(x, y, str, color){
    try {
      const t = this.add.text(x, y, String(str), {
        fontFamily: 'JetBrains Mono', fontSize: '13px', color: color || this.C.gold
      }).setOrigin(0.5).setDepth(120);
      this.tweens.add({
        targets: t, y: y - 36, alpha: 0, duration: 650, ease: 'Cubic.easeOut',
        onComplete: () => { t.destroy(); }
      });
    } catch (e) { this.err('float', e); }
  }

  banner(text, ms){
    try {
      const t = this.add.text(this.W / 2, 400, String(text), {
        fontFamily: 'Orbitron', fontSize: '26px', color: this.C.gold,
        align: 'center', wordWrap: { width: 420 }
      }).setOrigin(0.5).setDepth(150).setAlpha(0);
      const hold = Math.max(400, (ms || 1400) - 450);
      this.tweens.add({
        targets: t, alpha: 1, duration: 150,
        onComplete: () => {
          this.tweens.add({
            targets: t, alpha: 0, delay: hold, duration: 300,
            onComplete: () => { t.destroy(); }
          });
        }
      });
    } catch (e) { this.err('banner', e); }
  }

  onBulletHit(b, e){
    if (this.finished) return;
    if (!b || b.active === false || !e || e.active === false) return;
    const died = this.dealDamage(e, b.dmg != null ? b.dmg : 1);
    if (b.splash && b.splash > 0){
      const sx = e.x, sy = e.y, sr = b.splash;
      try {
        const ring = this.add.circle(sx, sy, sr, 0xfb923c, 0.35).setDepth(70);
        this.tweens.add({ targets: ring, scale: 1.35, alpha: 0, duration: 180, onComplete: () => { try { ring.destroy(); } catch (err) {} } });
      } catch (err) {}
      const sdmg = (b.dmg != null ? b.dmg : 1) * 0.5;
      const near = this.enemies.getChildren().slice();
      for (let i = 0; i < near.length; i++){
        const t = near[i];
        if (!t || t === e || t.active === false) continue;
        const dx = t.x - sx, dy = t.y - sy;
        if (dx * dx + dy * dy <= sr * sr) this.dealDamage(t, sdmg);
      }
    }
    if (!died && b.poison && e.active !== false){
      const pz = b.poison;
      e.poisonT = pz.dur;
      e.poisonDps = pz.dps;
      if (pz.spreadCount){
        e.poisonSpread = pz.spreadCount;
        e.poisonSpreadRadius = pz.spreadRadius || 80;
      }
      if (pz.strip) e.armor = 0;
    }
    b.pierce = (b.pierce != null ? b.pierce : 1) - 1;
    if (b.pierce <= 0 && b.active !== false){
      b.active = false;
      try { b.destroy(); } catch (e2) {}
      try { this.playerBullets.remove(b); } catch (e2) {}
    }
  }

  onEnemyBulletHit(b){
    if (this.finished) return;
    if (!b || b.active === false) return;
    if (this.iframe > 0) return;
    b.active = false;
    try { b.destroy(); } catch (e) {}
    try { this.enemyBullets.remove(b); } catch (e) {}
    this.hurtPlayer();
  }

  onEnemyTouch(e){
    if (this.finished) return;
    if (!e || e.active === false) return;
    if (this.iframe > 0) return;
    const now = this.time.now;
    if (e.touchT != null && now < e.touchT) return;
    e.touchT = now + 400;
    this.hurtPlayer();
    if (!this.finished && e.active !== false) this.dealDamage(e, 2);
  }

  onPowerupTouch(pu){
    if (this.finished) return;
    if (!pu || pu.active === false) return;
    const t = pu.puType;
    pu.active = false;
    try { pu.destroy(); } catch (e) {}
    try { this.powerups.remove(pu); } catch (e) {}
    this.applyPowerup(t);
  }

  applyPowerup(t){
    const R = this.rules();
    if (t === 'P') {
      this.tier = Math.min(R.tierMax != null ? R.tierMax : 4, (this.tier | 0) + 1);
      try { if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.setTier) GameWeapons.setTier(this.tier); } catch (e) {}
    }
    else if (t === 'S') this.lives = Math.min(5, this.lives + 1);
    else if (t === 'B') this.bombs = (this.bombs | 0) + 1;
    else if (t === 'R') this.rapidT = R.rapidDur != null ? R.rapidDur : 8;
    this.sndPlay('powerup');
    let label = String(t);
    try {
      if (typeof HDATA !== 'undefined' && HDATA && HDATA.POWERUPS && HDATA.POWERUPS[t]) label = HDATA.POWERUPS[t].label;
    } catch (e) {}
    this.floatText(this.player ? this.player.x : 225, (this.player ? this.player.y : 720) - 30, '+' + label, this.puColor(t));
    this.refreshHud();
  }

  hurtPlayer(){
    if (this.finished || this.iframe > 0) return;
    this.lives--;
    if (this.lives > 0){
      this.sndPlay('lifeLost');
    } else {
      this.sndPlay('defeat');
      this._cueDefeat = true;
    }
    this.iframe = (typeof HDATA !== 'undefined' && HDATA && HDATA.IFRAME != null) ? HDATA.IFRAME : 1.7;
    if (this.lives <= 0){
      this.finish(false);
      return;
    }
    if (this.player) this.player.x = 225;
    try { this.tweens.killTweensOf(this.player); } catch (e) {}
    if (this.player){
      this.player.setAlpha(1);
      this.tweens.add({
        targets: this.player, alpha: 0.15, duration: 110,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
    this.refreshHud();
  }

  finish(victory){
    if (this.finished) return;
    this.finished = true;
    this.victory = !!victory;
    try { this.physics.pause(); } catch (e) {}
    if (victory) this.sndPlay('victory');
    else if (!this._cueDefeat) this.sndPlay('defeat');
    this._cueDefeat = true;
    let newRec = false;
    try {
      if (typeof Progress !== 'undefined' && Progress && Progress.getHigh && Progress.setHigh){
        const hi = Progress.getHigh() | 0;
        newRec = this.score > 0 && this.score > hi;
        Progress.setHigh(this.score);
      }
    } catch (e) { this.err('high', e); }
    const payload = {
      victory: this.victory, score: this.score,
      c: this.c, p: this.p, shipId: this.shipId, newRec: newRec
    };
    try {
      this.time.delayedCall(800, () => {
        try { this.scene.start('Result', payload); } catch (e) { this.err('result', e); }
      });
    } catch (e) {
      this.err('timer', e);
      try { this.scene.start('Result', payload); } catch (e2) {}
    }
  }

  useBomb(){
    if (this.finished || this.bombs <= 0) return;
    this.bombs--;
    this.bombsUsed = (this.bombsUsed | 0) + 1;
    this.sndPlay('bomb');
    try {
      const f = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xffffff)
        .setDepth(200).setAlpha(0.6);
      this.tweens.add({ targets: f, alpha: 0, duration: 140, onComplete: () => { f.destroy(); } });
    } catch (e) {}
    try { this.cameras.main.shake(150, 0.01); } catch (e) {}
    try {
      const ebs = this.enemyBullets.getChildren().slice();
      for (let i = 0; i < ebs.length; i++){
        const b = ebs[i];
        if (b && b.active !== false){
          b.active = false;
          try { b.destroy(); } catch (e2) {}
        }
      }
    } catch (e) { this.err('bombclr', e); }
    try {
      const es = this.enemies.getChildren().slice();
      for (let i = 0; i < es.length; i++){
        const en = es[i];
        if (!en || en.active === false) continue;
        const isBoss = !!(en.boss || en.isBoss);
        this.dealDamage(en, isBoss ? 10 : 9999);
      }
    } catch (e) { this.err('bombdmg', e); }
    this.refreshHud();
  }

  buildHud(){
    const C = this.C;
    this.barW = this.W - 30;
    const hud = {};
    hud.scoreText = this.add.text(12, 10, '000000', {
      fontFamily: 'JetBrains Mono', fontSize: '20px', color: C.gold
    }).setDepth(100);
    hud.objText = this.add.text(15, 40, '', {
      fontFamily: 'Rajdhani', fontSize: '15px', color: C.text
    }).setDepth(100);
    hud.barBg = this.add.rectangle(15, 64, this.barW, 7, this.rgb(C.panel), 1)
      .setOrigin(0, 0.5).setDepth(100);
    hud.barFill = this.add.rectangle(15, 64, this.barW, 7, this.rgb(C.cyan), 1)
      .setOrigin(0, 0.5).setDepth(100);
    hud.bombsText = this.add.text(300, 12, 'B×' + this.bombs, {
      fontFamily: 'JetBrains Mono', fontSize: '15px', color: C.orange
    }).setOrigin(1, 0).setDepth(100);
    hud.livesIcons = [];
    const key = 'tur_' + this.shipId;
    let texOK = false;
    try { texOK = this.textures.exists(key); } catch (e) {}
    if (texOK){
      const tint = this.rgb(C.cyan);
      for (let i = 0; i < 5; i++){
        const s = this.add.image(this.W - 14 - i * 24, 20, key)
          .setScale(0.5).setTint(tint).setDepth(100).setVisible(i < this.lives);
        hud.livesIcons.push(s);
      }
    } else {
      hud.livesText = this.add.text(this.W - 12, 12, 'V ' + this.lives, {
        fontFamily: 'JetBrains Mono', fontSize: '14px', color: C.cyan
      }).setOrigin(1, 0).setDepth(100);
    }
    hud.specText = this.add.text(this.W - 12, 32, this.shipSpec === 'B' ? 'B' : 'A', {
      fontFamily: 'Rajdhani', fontSize: '11px', color: this.shipSpec === 'B' ? C.red : C.cyan
    }).setOrigin(1, 0).setDepth(100);
    hud.superLabel = this.add.text(119, this.H - 14, 'SUPER', {
      fontFamily: 'Rajdhani', fontSize: '10px', color: C.gold
    }).setOrigin(1, 0.5).setDepth(100);
    hud.superBg = this.add.rectangle(125, this.H - 14, 200, 7, this.rgb(C.panel), 1)
      .setOrigin(0, 0.5).setDepth(100);
    hud.superFill = this.add.rectangle(125, this.H - 14, 200, 7, this.rgb('#fb9234'), 1)
      .setOrigin(0, 0.5).setDepth(100);
    const letter = 'ABCDE'.charAt(this.c) || '?';
    this.add.text(this.W / 2, this.H - 32, 'CAMPANHA ' + letter + ' · FASE ' + (this.p + 1), {
      fontFamily: 'Rajdhani', fontSize: '13px', color: C.steel
    }).setOrigin(0.5).setAlpha(0.45).setDepth(100);
    this.hud = hud;
  }

  findBoss(){
    try {
      const arr = this.enemies.getChildren();
      for (let i = 0; i < arr.length; i++){
        const e = arr[i];
        if (e && e.active !== false && (e.boss || e.isBoss)) return e;
      }
    } catch (e) {}
    return null;
  }

  bossPct(b){
    try {
      let max = 0;
      let cur = 0;
      const def = this.enemyDef(b);
      if (typeof b.hp === 'number'){
        let mh = null;
        if (b.maxHp != null) mh = b.maxHp;
        else if (b.hpMax != null) mh = b.hpMax;
        else if (def && def.hp != null) mh = def.hp;
        else mh = b.hp;
        max += mh;
        cur += b.hp;
      }
      if (typeof b.shield === 'number'){
        let ms = null;
        if (b.maxShield != null) ms = b.maxShield;
        else if (def && def.shield != null) ms = def.shield;
        else ms = b.shield;
        max += ms;
        cur += b.shield;
      }
      if (max <= 0) return 0;
      return Phaser.Math.Clamp(cur / max, 0, 1);
    } catch (e) { return 0; }
  }

  refreshHud(){
    const hud = this.hud;
    if (!hud) return;
    try {
      if (hud.scoreText) hud.scoreText.setText(String(Math.max(0, this.score | 0)).padStart(6, '0'));
      if (hud.livesIcons){
        for (let i = 0; i < hud.livesIcons.length; i++) hud.livesIcons[i].setVisible(i < this.lives);
      }
      if (hud.livesText) hud.livesText.setText('V ' + this.lives);
      if (hud.bombsText) hud.bombsText.setText('B×' + this.bombs);
      let info = null;
      try {
        if (typeof GameCampaign !== 'undefined' && GameCampaign && GameCampaign.progressInfo) info = GameCampaign.progressInfo(this);
      } catch (e) { this.err('info', e); }
      if (!info) info = {};
      const boss = (info.bossAlive || info.obj === 'boss') ? this.findBoss() : null;
      let label = '';
      let pct = 0;
      let colHex = this.C.cyan;
      if (info.obj === 'survive'){
        const dur = info.dur || 0;
        label = 'SOBREVIVA ' + Math.floor(info.t || 0) + '/' + dur + 's';
        pct = dur > 0 ? Phaser.Math.Clamp((info.t || 0) / dur, 0, 1) : 0;
        colHex = this.C.gold;
      } else if (info.obj === 'boss' || info.bossAlive || boss){
        colHex = this.C.red;
        if (boss){
          label = boss.label ? ('CHEFE: ' + boss.label) : 'CHEFE';
          pct = this.bossPct(boss);
        } else {
          let bl = null;
          try {
            if (typeof info.boss === 'string' && typeof HDATA !== 'undefined' && HDATA.ENEMIES && HDATA.ENEMIES[info.boss]) bl = HDATA.ENEMIES[info.boss].label;
          } catch (e) {}
          label = bl ? ('CHEFE: ' + bl) : 'CHEFE A CAMINHO';
          pct = 1;
        }
      } else {
        const quota = info.quota || 0;
        const kills = info.kills || 0;
        label = 'ABATES ' + kills + '/' + quota;
        pct = quota > 0 ? Phaser.Math.Clamp(kills / quota, 0, 1) : 0;
        colHex = this.C.cyan;
      }
      if (hud.objText) hud.objText.setText(label);
      if (hud.barFill){
        hud.barFill.setVisible(pct > 0.001);
        hud.barFill.setFillStyle(this.rgb(colHex), 1);
        hud.barFill.setDisplaySize(Math.max(0, this.barW * pct), 7);
      }
      if (hud.superFill){
        const SC = (typeof HDATA !== 'undefined' && HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
        const cmax = (SC && SC.chargeMax != null) ? SC.chargeMax : 18;
        const raw = cmax > 0 ? (this.superCharge || 0) / cmax : 0;
        const full = !!this.superBusy || raw >= 1;
        const spct = Phaser.Math.Clamp(this.superBusy ? 1 : raw, 0, 1);
        hud.superFill.setDisplaySize(Math.max(0, 200 * spct), 7);
        hud.superFill.setFillStyle(this.rgb(full ? '#38bdf8' : '#fb9234'), 1);
        hud.superFill.setAlpha(full ? 0.55 + 0.45 * Math.sin(this.time.now / 90) : 1);
        if (hud.superLabel) hud.superLabel.setColor(full ? this.C.cyan : this.C.gold);
      }
    } catch (e) { this.err('hud', e); }
  }

  cullOffscreen(g){
    if (!g) return;
    let arr;
    try { arr = g.getChildren().slice(); } catch (e) { return; }
    for (let i = 0; i < arr.length; i++){
      const b = arr[i];
      if (!b) continue;
      let dead = false;
      if (b.active === false || b.scene === undefined || b.scene === null) dead = true;
      else {
        const x = b.x;
        const y = b.y;
        if (y < -30 || y > 830 || x < -30 || x > 480) dead = true;
      }
      if (dead){
        b.active = false;
        try { b.destroy(); } catch (e) {}
        try { g.remove(b); } catch (e) {}
      }
    }
  }

  movePlayer(K, CU, dt){
    const p = this.player;
    if (!p || p.active === false) return;
    const d = (k) => !!(k && k.isDown);
    let dx = 0;
    let dy = 0;
    if (d(K.A) || (CU && d(CU.left))) dx -= 1;
    if (d(K.D) || (CU && d(CU.right))) dx += 1;
    if (d(K.W) || (CU && d(CU.up))) dy -= 1;
    if (d(K.S) || (CU && d(CU.down))) dy += 1;
    if (!dx && !dy) return;
    if (dx && dy){ dx *= 0.7071; dy *= 0.7071; }
    const sp = (this.ship && this.ship.speed) || 220;
    p.x = Phaser.Math.Clamp(p.x + dx * sp * dt, 20, 430);
    p.y = Phaser.Math.Clamp(p.y + dy * sp * dt, 60, 780);
  }

  autofire(dt){
    const R = this.rules();
    this.fireT -= dt * 1000;
    let delay = null;
    try {
      if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.fireDelay) delay = GameWeapons.fireDelay(this.shipId);
    } catch (e) { this.err('fdel', e); }
    if (!(delay > 0)) delay = (this.ship && this.ship.fireDelay > 0) ? this.ship.fireDelay : 16;
    if (this.tier > 0) delay *= Math.pow(R.tierMul != null ? R.tierMul : 0.82, this.tier);
    if (this.rapidT > 0) delay *= R.rapidMul != null ? R.rapidMul : 0.55;
    if (this.fireT > 0) return;
    this.fireT = delay;
    try {
      if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.fire && this.player){
        GameWeapons.fire(this, this.shipId, this.player.x, this.player.y - 20);
      }
    } catch (e) { this.err('fire', e); }
  }

  updateEnemies(dt){
    try {
      if (typeof GameEnemies === 'undefined' || !GameEnemies || !GameEnemies.update) return;
      const arr = this.enemies.getChildren().slice();
      for (let i = 0; i < arr.length; i++){
        const e = arr[i];
        if (e && e.active !== false) GameEnemies.update(this, e, dt);
      }
    } catch (e) { this.err('enupd', e); }
  }

  update(time, delta){
    if (this.finished) return;
    const dt = Math.min(0.05, Math.max(0, (delta || 0) / 1000));
    const K = this.keys;
    const CU = this.cursors;
    if (K){
      const jd = (k) => { try { return !!(k && Phaser.Input.Keyboard.JustDown(k)); } catch (e) { return false; } };
      if (jd(K.M)) this.toggleMute();
      if (jd(K.ESC)){
        this.scene.start('Menu');
        return;
      }
      if (jd(K.X) || jd(K.Q)) this.useBomb();
      this.movePlayer(K, CU, dt);
    }
    if (this.player && this.player.active !== false && this.aura){
      this.aura.setPosition(this.player.x, this.player.y);
      this.auraRing.setPosition(this.player.x, this.player.y);
      const pulse = 0.5 + 0.5 * Math.sin((this.time.now || 0) / 250);
      this.aura.setAlpha(0.10 + 0.12 * pulse);
      this.auraRing.setScale(0.92 + 0.18 * pulse);
    } else if (this.aura){
      this.aura.setVisible(false);
      this.auraRing.setVisible(false);
    }
    this.autofire(dt);
    try {
      if (typeof GameWeapons !== 'undefined' && GameWeapons && GameWeapons.update) GameWeapons.update(this, Math.min(delta || 0, 50));
    } catch (e) { this.err('weaupd', e); }
    try {
      if (typeof GameCampaign !== 'undefined' && GameCampaign && GameCampaign.update) GameCampaign.update(this, dt);
    } catch (e) { this.err('campupd', e); }
    this.updateEnemies(dt);
    this.cullOffscreen(this.playerBullets);
    this.cullOffscreen(this.enemyBullets);
    this.cullOffscreen(this.powerups);
    if (this.shipId === 'amp' && this.shipSpec === 'B'){
      try {
        const p = this.player;
        if (p && p.active !== false){
          const pus = this.powerups.getChildren().slice();
          for (let i = 0; i < pus.length; i++){
            const pu = pus[i];
            if (!pu || pu.active === false) continue;
            const dx = p.x - pu.x;
            const dy = p.y - pu.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 150 && d > 0.0001 && pu.body && pu.body.setVelocity){
              pu.body.setVelocity((dx / d) * 260, (dy / d) * 260);
              pu._mag = true;
            } else if (pu._mag && pu.body && pu.body.setVelocity){
              pu.body.setVelocity(0, 64);
              pu._mag = false;
            }
          }
        }
      } catch (e) { this.err('magnet', e); }
    }
    try {
      const SC = (typeof HDATA !== 'undefined' && HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
      const cmax = (SC && SC.chargeMax != null) ? SC.chargeMax : 18;
      if (!this.superBusy && (this.superCharge || 0) >= cmax) this.triggerSuper();
    } catch (e) { this.err('supertrig', e); }
    if (this.rapidT > 0) this.rapidT = Math.max(0, this.rapidT - dt);
    if (this.iframe > 0){
      this.iframe -= dt;
      if (this.iframe <= 0){
        this.iframe = 0;
        try { this.tweens.killTweensOf(this.player); } catch (e) {}
        if (this.player) this.player.setAlpha(1);
      }
    }
    if (this.camp && this.camp.won && !this.finished){
      try {
        if (typeof Progress !== 'undefined' && Progress && Progress.complete) Progress.complete(this.c, this.p);
      } catch (e) { this.err('prog', e); }
      this.finish(true);
      return;
    }
    this.refreshHud();
  }
}
