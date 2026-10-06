import { HDATA } from './game-data.js';
import { GameArt } from './game-art.js';
import { SND } from './game-audio.js';
import { GameWeapons } from './weapons.js';
import { GameEnemies } from './enemies-ai.js';
import { GameCampaign } from './campaign.js';
import { createProceduralMap } from './procedural-map.js';
import { Progress } from './progress.js';

export function createStage(engine, opts, cb){
  cb = cb || {};
  const run = opts || {};
  const W = (HDATA && HDATA.W) ? HDATA.W : 450;
  const H = (HDATA && HDATA.H) ? HDATA.H : 800;
  const C = (HDATA && HDATA.COLORS) ? HDATA.COLORS : {
    bg: '#050914', panel: '#0d1526', text: '#e8eefc', cyan: '#38bdf8',
    red: '#f43f5e', gold: '#fbbf24', green: '#34d399', orange: '#fb923c',
    steel: '#e2e8f0'
  };
  const c = (run.c | 0);
  const p = (run.p | 0);
  const ships = (HDATA && HDATA.SHIPS) ? HDATA.SHIPS : [];
  let ship = null;
  for (let i = 0; i < ships.length; i++) if (ships[i].id === run.shipId) ship = ships[i];
  ship = ship || ships[0] || { id: 'cannon', name: 'Corveta', speed: 220, fireDelay: 280, dmg: 7 };
  const shipId = ship.id;
  const shipSpec = (run.spec === 'A' || run.spec === 'B') ? run.spec : ((Progress && Progress.getSpec) ? Progress.getSpec(shipId) : 'A');
  const LIVES = (HDATA && HDATA.LIVES != null) ? HDATA.LIVES : 3;
  const BOMBS_START = (HDATA && HDATA.BOMBS_START != null) ? HDATA.BOMBS_START : 2;
  const errTags = {};
  const levelRules = (HDATA && HDATA.LEVEL_UP) || { firstXp: 5, xpStep: 3 };
  const buildSource = run.runBuild || {};
  const sourceUpgrades = buildSource.upgrades || {};
  const runBuild = {
    level: Math.max(1, buildSource.level | 0),
    xp: Math.max(0, Number(buildSource.xp) || 0),
    xpNext: Math.max(1, Number(buildSource.xpNext) || levelRules.firstXp),
    upgrades: {
      power: Math.max(0, sourceUpgrades.power | 0),
      cadence: Math.max(0, sourceUpgrades.cadence | 0),
      caliber: Math.max(0, sourceUpgrades.caliber | 0),
      overcharge: Math.max(0, sourceUpgrades.overcharge | 0)
    }
  };
  const LEVEL_UP_OPTIONS = [
    { id: 'power', icon: '✦', name: 'CARGA DE PLASMA', desc: '+12% de dano por melhoria', max: 10 },
    { id: 'cadence', icon: '»', name: 'DISPARO ACELERADO', desc: 'A nave atira mais rápido', max: 10 },
    { id: 'caliber', icon: '◎', name: 'CALIBRE AMPLIADO', desc: 'Tiros maiores e mais alcance', max: 10 },
    { id: 'overcharge', icon: '⚡', name: 'SUPER SOBRECARREGADO', desc: '+15% de carga do super por abate', max: 10 }
  ];

  function clamp(v, lo, hi){ return v < lo ? lo : (v > hi ? hi : v); }

  function now(){
    try { return (engine.time && engine.time.now) || 0; } catch (e) { return 0; }
  }

  function rgb(hex){
    try {
      if (engine && typeof engine.rgb === 'function') return engine.rgb(hex);
    } catch (e) {}
    try {
      if (typeof hex === 'number') return hex & 0xffffff;
      if (typeof hex === 'string' && hex.charAt(0) !== '#' && /^[0-9]+$/.test(hex)) return parseInt(hex, 10) & 0xffffff;
      return parseInt(String(hex).replace('#', ''), 16);
    } catch (e) { return 0xffffff; }
  }

  function err(tag, e){
    try {
      if (!e) return;
      if (errTags[tag]) return;
      errTags[tag] = true;
      const msg = tag + ':' + e.message;
      if (typeof cb.onError === 'function') { try { cb.onError(msg); } catch (_e) {} }
      if (typeof window !== 'undefined' && window.__errors) window.__errors.push(msg);
    } catch (_e) {}
  }

  function held(code){
    try { return !!(engine.keyDown && engine.keyDown(code)); } catch (e) { return false; }
  }

  function pressed(code){
    try { return !!(engine.keyJustDown && engine.keyJustDown(code)); } catch (e) { return false; }
  }

  function sndUnlock(){ try { if (SND && SND.unlock) SND.unlock(); } catch (e) {} }
  function sndMusic(mode){ try { if (SND && SND.startMusic) SND.startMusic(mode); } catch (e) {} }
  function sndPlay(cue){ try { if (SND && SND.play) SND.play(cue); } catch (e) {} }
  function toggleMute(){ try { if (SND && SND.setMuted) SND.setMuted(!SND.muted); } catch (e) {} }

  function rules(){
    try { if (HDATA && HDATA.POWERUP_RULES) return HDATA.POWERUP_RULES; } catch (e) {}
    return { chance: 0.05, everyKills: 11, rapidMul: 0.55, rapidDur: 8, tierMul: 0.82, tierMax: 4 };
  }

  function hasTexture(key){
    try {
      const t = engine.textures;
      if (!t) return false;
      if (typeof t.has === 'function') return !!t.has(key);
      if (typeof t.get === 'function') return !!t.get(key);
      return t[key] != null;
    } catch (e) { return false; }
  }

  function ensureTexture(key){
    try {
      if (hasTexture(key)) return true;
      if (GameArt && typeof GameArt.get === 'function'){
        const cvs = GameArt.get(key);
        if (cvs){
          const t = engine.textures;
          if (t && typeof t.set === 'function'){ t.set(key, cvs); return true; }
          if (t && typeof t === 'object'){ t[key] = cvs; return true; }
        }
      }
    } catch (e) {}
    return hasTexture(key);
  }

  function puColor(t){
    if (t === 'P') return C.cyan;
    if (t === 'S') return C.green;
    if (t === 'B') return C.orange;
    if (t === 'R') return C.acid || '#a3e635';
    return C.text;
  }

  function enemyDef(e){
    try {
      if (!HDATA || !HDATA.ENEMIES || !e) return null;
      if (e.def && typeof e.def === 'object') return e.def;
      const ids = [e.typeId, e.type, e.kind, e.enemyId, e.id];
      for (let i = 0; i < ids.length; i++){
        if (ids[i] && HDATA.ENEMIES[ids[i]]) return HDATA.ENEMIES[ids[i]];
      }
    } catch (e2) {}
    return null;
  }

  function enemyColor(e){
    try {
      if (e && e.col) return e.col;
      if (e && e.def && typeof e.def === 'object' && e.def.col) return e.def.col;
      const def = enemyDef(e);
      if (def && def.col) return def.col;
    } catch (e2) {}
    return '#ffffff';
  }

  function burst(x, y, hex){
    try {
      const cc = engine.add.circle(x, y, 14, rgb(hex)).setDepth(60);
      engine.tweens.add({
        targets: cc, scale: 2.6, alpha: 0, duration: 200,
        ease: 'Cubic.easeOut',
        onComplete: () => { cc.destroy(); }
      });
    } catch (e) { err('burst', e); }
  }

  function floatText(x, y, str, color){
    try {
      if (typeof cb.onFloat === 'function') cb.onFloat(x, y, String(str), color || C.gold);
    } catch (e) { err('float', e); }
  }

  function banner(text, ms){
    try {
      if (typeof cb.onBanner === 'function') cb.onBanner(String(text), ms || 1400);
    } catch (e) { err('banner', e); }
  }

  function findBoss(){
    try {
      const arr = st.enemies.getChildren();
      for (let i = 0; i < arr.length; i++){
        const e = arr[i];
        if (e && e.active !== false && (e.boss || e.isBoss)) return e;
      }
    } catch (e) {}
    return null;
  }

  function bossPct(b){
    try {
      let max = 0;
      let cur = 0;
      const def = enemyDef(b);
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
      return clamp(cur / max, 0, 1);
    } catch (e) { return 0; }
  }

  function spawnPlayerBullet(o){
    o = o || {};
    try {
      const w = o.w != null ? o.w : 6;
      const h = o.h != null ? o.h : 14;
      const caliber = 1 + (runBuild.upgrades.caliber || 0) * 0.1;
      const color = o.color != null ? o.color : C.cyan;
      const px = o.x != null ? o.x : (st.player ? st.player.x : 225);
      const py = o.y != null ? o.y : (st.player ? st.player.y : 720);
      const shotW = w * caliber;
      const shotH = h * caliber;
      const rect = engine.add.rectangle(px, py, shotW, shotH, rgb(color));
      engine.physics.add.existing(rect);
      const body = rect.body;
      if (body && body.setAllowGravity) body.setAllowGravity(false);
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
      rect.w = shotW;
      rect.h = shotH;
      if (o.poison) rect.poison = o.poison;
      if (o.splash != null) rect.splash = o.splash;
      if (o.burn != null) rect.burn = o.burn;
      st.playerBullets.add(rect);
      if (body && body.setVelocity) body.setVelocity(vx, vy);
      try { rect.setStrokeStyle(1, rgb(color), 1); } catch (e) {}
      return rect;
    } catch (e) {
      err('pbullet', e);
      return null;
    }
  }

  function spawnEnemyBullet(o){
    o = o || {};
    try {
      const w = o.w != null ? o.w : 5;
      const h = o.h != null ? o.h : 5;
      const color = o.color != null ? o.color : '#fbbf24';
      const px = o.x != null ? o.x : (st.player ? st.player.x : 225);
      const py = o.y != null ? o.y : 60;
      const rect = engine.add.rectangle(px, py, w, h, rgb(color));
      engine.physics.add.existing(rect);
      const body = rect.body;
      if (body && body.setAllowGravity) body.setAllowGravity(false);
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
      st.enemyBullets.add(rect);
      if (body && body.setVelocity) body.setVelocity(vx, vy);
      return rect;
    } catch (e) {
      err('ebullet', e);
      return null;
    }
  }

  function dealDamage(e, dmg, dmgOpts){
    if (!e || e.active === false) return false;
    try {
      if (!GameEnemies || !GameEnemies.applyDamage) return false;
      if (GameWeapons && GameWeapons.modifyDamage) dmg = GameWeapons.modifyDamage(st, e, dmg);
      const r = GameEnemies.applyDamage(st, e, dmg, dmgOpts) || {};
      if (r.died) onEnemyKilled(e, !!r.wasBoss);
      return !!r.died;
    } catch (e2) {
      err('dmg', e2);
      return false;
    }
  }

  function triggerSuper(){
    if (st.superBusy) return;
    st.superBusy = true;
    st.superCharge = 0;
    let name = null;
    try {
      if (GameWeapons && GameWeapons.super) name = GameWeapons.super(st, st.run.shipId, st.shipSpec);
    } catch (e) { err('super', e); }
    const sn = (st.ship && st.ship.super && st.ship.super.name) || null;
    banner('SUPER: ' + (name || sn || 'ULTIMO RECURSO'), 1600);
    try {
      const f = engine.add.rectangle(W / 2, H / 2, W, H, 0xffffff)
        .setDepth(200).setAlpha(0.5);
      engine.tweens.add({ targets: f, alpha: 0, duration: 180, onComplete: () => { f.destroy(); } });
    } catch (e) {}
    try { engine.cameras.main.shake(200, 0.006); } catch (e) {}
    sndPlay('bomb');
    try {
      engine.time.delayedCall(400, () => { st.superBusy = false; });
    } catch (e) { st.superBusy = false; }
  }

  function nearestEnemy(x, y, maxDist){
    if (maxDist == null) maxDist = 9999;
    let best = null;
    let bd = maxDist * maxDist;
    try {
      const arr = st.enemies.getChildren();
      for (let i = 0; i < arr.length; i++){
        const e = arr[i];
        if (!e || e.active === false) continue;
        const dx = e.x - x;
        const dy = e.y - y;
        const d = dx * dx + dy * dy;
        if (d <= bd){ bd = d; best = e; }
      }
    } catch (e2) { err('near', e2); }
    return best;
  }

  function startBoss(bossId, mul){
    try {
      if (!GameEnemies || !GameEnemies.spawnBoss) return null;
      const b = GameEnemies.spawnBoss(st, bossId, { bossMul: mul });
      if (st.camp) st.camp.bossAlive = true;
      sndPlay('bossAlert');
      sndMusic('boss');
      return b;
    } catch (e) {
      err('boss', e);
      return null;
    }
  }

  function onEnemyKilled(e, wasBoss){
    if (!e || e.counted) return;
    e.counted = true;
    try {
      const S = (HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
      const inc = wasBoss ? ((S && S.perBoss != null) ? S.perBoss : 15) : ((S && S.perKill != null) ? S.perKill : 1);
      st.superCharge = (st.superCharge || 0) + inc * (1 + runBuild.upgrades.overcharge * 0.15);
      let pts = e.pts;
      if (pts == null){
        const def = enemyDef(e);
        pts = def && def.pts != null ? def.pts : 0;
      }
      pts = pts | 0;
      st.score += pts;
      awardRunXp(wasBoss ? 14 : Math.max(1, Math.min(4, 1 + Math.floor(pts / 45))));
      const R = rules();
      if (st.camp){
        st.camp.kills = (st.camp.kills | 0) + 1;
        if (wasBoss){
          st.camp.bossAlive = false;
          st.camp.won = true;
        }
      }
      const k = st.camp ? (st.camp.kills | 0) : 0;
      const every = R.everyKills | 0;
      if (Math.random() < (R.chance || 0) || (every > 0 && k % every === 0)){
        spawnRandomPowerup(e.x, e.y);
      }
      floatText(e.x, e.y - 8, '+' + pts, C.gold);
      burst(e.x, e.y, enemyColor(e));
      sndPlay(wasBoss ? 'bossDeath' : 'explosion');
      if (wasBoss){ try { engine.cameras.main.shake(320, 0.012); } catch (e2) {} }
    } catch (e2) {
      err('kill', e2);
    }
  }

  function awardRunXp(amount){
    runBuild.xp += amount;
    if (st.pendingLevelUp) return;
    openLevelUp();
    emitHud();
  }

  function openLevelUp(){
    if (st.pendingLevelUp || runBuild.xp < runBuild.xpNext) return false;
    runBuild.xp -= runBuild.xpNext;
    runBuild.level++;
    runBuild.xpNext = (levelRules.firstXp || 5) + (runBuild.level - 1) * (levelRules.xpStep || 3);
    st.pendingLevelUp = true;
    if (engine.pauseSimulation) engine.pauseSimulation();
    if (SND && SND.laserStopAll) SND.laserStopAll();
    const choices = LEVEL_UP_OPTIONS
      .filter((choice) => runBuild.upgrades[choice.id] < choice.max)
      .map((choice) => ({ ...choice, rank: runBuild.upgrades[choice.id] }));
    if (!choices.length){
      st.pendingLevelUp = false;
      banner('ARSENAL NO LIMITE · NÍVEL ' + String(runBuild.level).padStart(2, '0'), 1500);
      if (runBuild.xp >= runBuild.xpNext) openLevelUp();
      else if (engine.resumeSimulation) engine.resumeSimulation();
      emitHud();
      return true;
    }
    if (typeof cb.onLevelUp === 'function') cb.onLevelUp({ level: runBuild.level, choices: choices });
    else {
      st.pendingLevelUp = false;
      if (engine.resumeSimulation) engine.resumeSimulation();
      return false;
    }
    sndPlay('powerup');
    return true;
  }

  function chooseUpgrade(id){
    if (!st.pendingLevelUp) return false;
    const choice = LEVEL_UP_OPTIONS.find((item) => item.id === id);
    if (!choice || runBuild.upgrades[id] >= choice.max) return false;
    runBuild.upgrades[id]++;
    st.pendingLevelUp = false;
    if (typeof cb.onLevelUp === 'function') cb.onLevelUp(null);
    if (runBuild.xp >= runBuild.xpNext) openLevelUp();
    else if (engine.resumeSimulation) engine.resumeSimulation();
    emitHud();
    return true;
  }

  function cancelLevelUp(){
    if (!st.pendingLevelUp) return false;
    st.pendingLevelUp = false;
    if (typeof cb.onLevelUp === 'function') cb.onLevelUp(null);
    if (engine.resumeSimulation) engine.resumeSimulation();
    return true;
  }

  function copyRunBuild(){
    return {
      level: runBuild.level,
      xp: runBuild.xp,
      xpNext: runBuild.xpNext,
      upgrades: { ...runBuild.upgrades }
    };
  }

  function spawnRandomPowerup(x, y){
    try {
      let keys = ['P', 'S', 'B', 'R'];
      if (HDATA && HDATA.POWERUPS){
        const k = Object.keys(HDATA.POWERUPS);
        if (k.length) keys = k;
      }
      spawnPowerup(x, y, keys[(Math.random() * keys.length) | 0]);
    } catch (e) { err('pur', e); }
  }

  function spawnPowerup(x, y, type){
    try {
      const key = 'pu_' + type;
      let o = null;
      if (ensureTexture(key)){
        o = engine.physics.add.sprite(x, y, key);
      } else {
        o = engine.add.rectangle(x, y, 16, 16, rgb(puColor(type)));
        engine.physics.add.existing(o);
      }
      if (o.body){
        if (o.body.setAllowGravity) o.body.setAllowGravity(false);
        if (o.body.setVelocity) o.body.setVelocity(0, 64);
      }
      o.puType = type;
      st.powerups.add(o);
      return o;
    } catch (e) {
      err('pu', e);
      return null;
    }
  }

  function onBulletHit(b, e){
    if (st.finished) return;
    if (!b || b.active === false || !e || e.active === false) return;
    const died = dealDamage(e, b.dmg != null ? b.dmg : 1);
    if (b.splash && b.splash > 0){
      const sx = e.x, sy = e.y, sr = b.splash;
      try {
        const ring = engine.add.circle(sx, sy, sr, 0xfb923c, 0.35).setDepth(70);
        engine.tweens.add({ targets: ring, scale: 1.35, alpha: 0, duration: 180, onComplete: () => { try { ring.destroy(); } catch (err2) {} } });
      } catch (err2) {}
      const sdmg = (b.dmg != null ? b.dmg : 1) * 0.5;
      const near = st.enemies.getChildren().slice();
      for (let i = 0; i < near.length; i++){
        const t = near[i];
        if (!t || t === e || t.active === false) continue;
        const dx = t.x - sx, dy = t.y - sy;
        if (dx * dx + dy * dy <= sr * sr) dealDamage(t, sdmg);
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
      try { st.playerBullets.remove(b); } catch (e2) {}
    }
  }

  function onEnemyBulletHit(b){
    if (st.finished) return;
    if (!b || b.active === false) return;
    if (st.iframe > 0) return;
    b.active = false;
    try { b.destroy(); } catch (e) {}
    try { st.enemyBullets.remove(b); } catch (e) {}
    hurtPlayer();
  }

  function onEnemyTouch(e){
    if (st.finished) return;
    if (!e || e.active === false) return;
    if (st.iframe > 0) return;
    const t = now();
    if (e.touchT != null && t < e.touchT) return;
    e.touchT = t + 400;
    hurtPlayer();
    if (!st.finished && e.active !== false) dealDamage(e, 2);
  }

  function onPowerupTouch(pu){
    if (st.finished) return;
    if (!pu || pu.active === false) return;
    const t = pu.puType;
    pu.active = false;
    try { pu.destroy(); } catch (e) {}
    try { st.powerups.remove(pu); } catch (e) {}
    applyPowerup(t);
  }

  function applyPowerup(t){
    const R = rules();
    if (t === 'P') {
      st.tier = Math.min(R.tierMax != null ? R.tierMax : 4, (st.tier | 0) + 1);
      try { if (GameWeapons && GameWeapons.setTier) GameWeapons.setTier(st.tier); } catch (e) {}
    }
    else if (t === 'S') st.lives = Math.min(5, st.lives + 1);
    else if (t === 'B') st.bombs = (st.bombs | 0) + 1;
    else if (t === 'R') st.rapidT = R.rapidDur != null ? R.rapidDur : 8;
    sndPlay('powerup');
    let label = String(t);
    try {
      if (HDATA && HDATA.POWERUPS && HDATA.POWERUPS[t]) label = HDATA.POWERUPS[t].label;
    } catch (e) {}
    floatText(st.player ? st.player.x : 225, (st.player ? st.player.y : 720) - 30, '+' + label, puColor(t));
  }

  function hurtPlayer(){
    if (st.finished || st.iframe > 0) return;
    st.lives--;
    if (st.lives > 0){
      sndPlay('lifeLost');
    } else {
      sndPlay('defeat');
      st._cueDefeat = true;
    }
    st.iframe = (HDATA && HDATA.IFRAME != null) ? HDATA.IFRAME : 1.7;
    if (st.lives <= 0){
      finish(false);
      return;
    }
    if (st.player) st.player.x = 225;
    try { engine.tweens.killTweensOf(st.player); } catch (e) {}
    if (st.player){
      st.player.setAlpha(1);
      engine.tweens.add({
        targets: st.player, alpha: 0.15, duration: 110,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  function useBomb(){
    if (st.finished || st.bombs <= 0) return;
    st.bombs--;
    st.bombsUsed = (st.bombsUsed | 0) + 1;
    sndPlay('bomb');
    try {
      const f = engine.add.rectangle(W / 2, H / 2, W, H, 0xffffff)
        .setDepth(200).setAlpha(0.6);
      engine.tweens.add({ targets: f, alpha: 0, duration: 140, onComplete: () => { f.destroy(); } });
    } catch (e) {}
    try { engine.cameras.main.shake(150, 0.01); } catch (e) {}
    try {
      const ebs = st.enemyBullets.getChildren().slice();
      for (let i = 0; i < ebs.length; i++){
        const b = ebs[i];
        if (b && b.active !== false){
          b.active = false;
          try { b.destroy(); } catch (e2) {}
        }
      }
    } catch (e) { err('bombclr', e); }
    try {
      const es = st.enemies.getChildren().slice();
      for (let i = 0; i < es.length; i++){
        const en = es[i];
        if (!en || en.active === false) continue;
        const isBoss = !!(en.boss || en.isBoss);
        dealDamage(en, isBoss ? 10 : 9999);
      }
    } catch (e) { err('bombdmg', e); }
  }

  function finish(victory){
    if (st.finished) return;
    st.finished = true;
    st.victory = !!victory;
    try { if (engine.physics && engine.physics.pause) engine.physics.pause(); } catch (e) {}
    if (victory) sndPlay('victory');
    else if (!st._cueDefeat) sndPlay('defeat');
    st._cueDefeat = true;
    try {
      if (Progress && Progress.getHigh && Progress.setHigh) {
        Progress.getHigh();
        Progress.setHigh(st.score);
      }
    } catch (e) { err('high', e); }
    const payload = {
      victory: st.victory, score: st.score,
      c: st.c, p: st.p, shipId: st.shipId, spec: st.shipSpec,
      runBuild: copyRunBuild()
    };
    try {
      engine.time.delayedCall(800, () => {
        try { if (typeof cb.onFinish === 'function') cb.onFinish(payload); } catch (e) { err('result', e); }
      });
    } catch (e) {
      err('timer', e);
      try { if (typeof cb.onFinish === 'function') cb.onFinish(payload); } catch (e2) {}
    }
  }

  function cullOffscreen(g){
    if (!g) return;
    let arr;
    try { arr = g.getChildren().slice(); } catch (e) { return; }
    for (let i = 0; i < arr.length; i++){
      const b = arr[i];
      if (!b) continue;
      let dead = false;
      const sceneRef = (typeof b.scene !== 'undefined') ? b.scene : engine;
      if (b.active === false || b.destroyed === true || sceneRef === null) dead = true;
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

  function movePlayer(dt){
    const pl = st.player;
    if (!pl || pl.active === false) return;
    let dx = 0;
    let dy = 0;
    if (held('KeyA') || held('ArrowLeft')) dx -= 1;
    if (held('KeyD') || held('ArrowRight')) dx += 1;
    if (held('KeyW') || held('ArrowUp')) dy -= 1;
    if (held('KeyS') || held('ArrowDown')) dy += 1;
    if (engine.virtualInput){
      dx += engine.virtualInput.x || 0;
      dy += engine.virtualInput.y || 0;
      dx = clamp(dx, -1, 1);
      dy = clamp(dy, -1, 1);
    }
    if (!dx && !dy) return;
    if (dx && dy){ dx *= 0.7071; dy *= 0.7071; }
    const sp = (st.ship && st.ship.speed) || 220;
    pl.x = clamp(pl.x + dx * sp * dt, 20, 430);
    pl.y = clamp(pl.y + dy * sp * dt, 60, 780);
  }

  function autofire(dt){
    const R = rules();
    st.fireT -= dt * 1000;
    let delay = null;
    try {
      if (GameWeapons && GameWeapons.fireDelay) delay = GameWeapons.fireDelay(st.shipId);
    } catch (e) { err('fdel', e); }
    if (!(delay > 0)) delay = (st.ship && st.ship.fireDelay > 0) ? st.ship.fireDelay : 16;
    if (st.tier > 0) delay *= Math.pow(R.tierMul != null ? R.tierMul : 0.82, st.tier);
    if (st.rapidT > 0) delay *= R.rapidMul != null ? R.rapidMul : 0.55;
    if (st.fireT > 0) return;
    st.fireT = delay;
    try {
      if (GameWeapons && GameWeapons.fire && st.player){
        GameWeapons.fire(st, st.shipId, st.player.x, st.player.y - 20);
      }
    } catch (e) { err('fire', e); }
  }

  function updateEnemies(dt){
    try {
      if (!GameEnemies || !GameEnemies.update) return;
      const arr = st.enemies.getChildren().slice();
      for (let i = 0; i < arr.length; i++){
        const en = arr[i];
        if (en && en.active !== false) GameEnemies.update(st, en, dt);
      }
    } catch (e) { err('enupd', e); }
  }

  function emitHud(){
    if (typeof cb.onHud !== 'function') return;
    try {
      const SC = (HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
      const cmax = (SC && SC.chargeMax != null) ? SC.chargeMax : 18;
      let info = null;
      try {
        if (GameCampaign && GameCampaign.progressInfo) info = GameCampaign.progressInfo(st);
      } catch (e) { err('info', e); }
      let objectiveText = '';
      let objectivePct = 0;
      let boss = null;
      let act = 'opening';
      let actName = 'COMEÇO';
      if (info){
        const bossEnt = info.bossAlive ? findBoss() : null;
        act = info.act || act;
        actName = info.actName || actName;
        objectiveText = info.obj || '';
        objectivePct = info.progress || 0;
        if (info.bossAlive || bossEnt) {
          const name = (bossEnt && bossEnt.label) || info.bossName || 'CHEFE';
          boss = { name: name, hpPct: bossEnt ? bossPct(bossEnt) : 1 };
        }
      }
      cb.onHud({
        score: st.score | 0,
        lives: st.lives,
        bombs: st.bombs,
        tier: st.tier | 0,
        spec: st.shipSpec,
        shipName: (st.ship && st.ship.name) ? st.ship.name : '',
        campaignLabel: 'CAMPANHA ' + ('ABCDE'.charAt(st.c) || '?') + ' · FASE ' + (st.p + 1),
        act: act,
        actName: actName,
        objectiveText: objectiveText,
        objectivePct: objectivePct,
        boss: boss,
        superPct: cmax > 0 ? clamp((st.superCharge || 0) / cmax, 0, 1) : 0,
        level: runBuild.level,
        xp: runBuild.xp,
        xpNext: runBuild.xpNext,
        xpPct: runBuild.xpNext > 0 ? clamp(runBuild.xp / runBuild.xpNext, 0, 1) : 0,
        upgrades: { ...runBuild.upgrades }
      });
    } catch (e) { err('hud', e); }
  }

  function destroy(){
    if (st.destroyed) return;
    st.destroyed = true;
    if (engine.resumeSimulation) engine.resumeSimulation();
    try { if (engine.tweens && engine.tweens.killAll) engine.tweens.killAll(); } catch (e) {}
    try { if (engine.time && engine.time.removeAll) engine.time.removeAll(); } catch (e) {}
    try { if (engine.stop) engine.stop(); } catch (e) {}
    try { if (st.proceduralMap) st.proceduralMap.destroy(); } catch (e) {}
    const groups = [st.enemies, st.playerBullets, st.enemyBullets, st.powerups];
    for (let i = 0; i < groups.length; i++){
      const group = groups[i];
      if (group && typeof group.destroy === 'function'){
        try { group.destroy(); } catch (e) {}
      }
    }
    const objs = Array.isArray(engine._items)
      ? engine._items.slice()
      : [st.player, st.aura, st.auraRing];
    for (let i = 0; i < objs.length; i++){
      const o = objs[i];
      if (o && typeof o.destroy === 'function'){ try { o.destroy(); } catch (e) {} }
    }
    st.player = null;
    st.aura = null;
    st.auraRing = null;
    st.enemies = null;
    st.playerBullets = null;
    st.enemyBullets = null;
    st.powerups = null;
  }

  function update(dtMs){
    if (st.destroyed || st.finished) return;
    if (st.pendingLevelUp) return;
    const delta = dtMs || 0;
    const dt = Math.min(0.05, Math.max(0, delta / 1000));
    if (pressed('KeyM')) toggleMute();
    if (pressed('Escape')){
      if (typeof cb.onExit === 'function'){ try { cb.onExit(); } catch (e) {} }
      destroy();
      return;
    }
    const virtualBomb = !!(engine.virtualInput && engine.virtualInput.bomb);
    if (engine.virtualInput) engine.virtualInput.bomb = false;
    if (pressed('KeyX') || pressed('KeyQ') || virtualBomb) useBomb();
    movePlayer(dt);
    if (st.player && st.player.active !== false && st.aura){
      st.aura.setPosition(st.player.x, st.player.y);
      st.auraRing.setPosition(st.player.x, st.player.y);
      const pulse = 0.5 + 0.5 * Math.sin((now() || 0) / 250);
      st.aura.setAlpha(0.10 + 0.12 * pulse);
      st.auraRing.setScale(0.92 + 0.18 * pulse);
    } else if (st.aura){
      st.aura.setVisible(false);
      st.auraRing.setVisible(false);
    }
    autofire(dt);
    try {
      if (GameWeapons && GameWeapons.update) GameWeapons.update(st, Math.min(delta, 50));
    } catch (e) { err('weaupd', e); }
    try {
      if (GameCampaign && GameCampaign.update) GameCampaign.update(st, dt);
    } catch (e) { err('campupd', e); }
    try {
      if (st.proceduralMap && st.camp) st.proceduralMap.update(st.camp.t / st.camp.duration);
    } catch (e) { err('mapupd', e); }
    updateEnemies(dt);
    cullOffscreen(st.playerBullets);
    cullOffscreen(st.enemyBullets);
    cullOffscreen(st.powerups);
    if (st.shipId === 'amp' && st.shipSpec === 'B'){
      try {
        const pl = st.player;
        if (pl && pl.active !== false){
          const pus = st.powerups.getChildren().slice();
          for (let i = 0; i < pus.length; i++){
            const pu = pus[i];
            if (!pu || pu.active === false) continue;
            const dx = pl.x - pu.x;
            const dy = pl.y - pu.y;
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
      } catch (e) { err('magnet', e); }
    }
    try {
      const SC = (HDATA && HDATA.SUPER) ? HDATA.SUPER : null;
      const cmax = (SC && SC.chargeMax != null) ? SC.chargeMax : 18;
      if (!st.superBusy && (st.superCharge || 0) >= cmax) triggerSuper();
    } catch (e) { err('supertrig', e); }
    if (st.rapidT > 0) st.rapidT = Math.max(0, st.rapidT - dt);
    if (st.iframe > 0){
      st.iframe -= dt;
      if (st.iframe <= 0){
        st.iframe = 0;
        try { engine.tweens.killTweensOf(st.player); } catch (e) {}
        if (st.player) st.player.setAlpha(1);
      }
    }
    if (st.camp && st.camp.won && !st.finished){
      if (!st._progressDone){
        st._progressDone = true;
        try {
          if (Progress && Progress.complete) Progress.complete(st.c, st.p);
        } catch (e) { err('prog', e); }
      }
      finish(true);
      return;
    }
    st.hudT += delta;
    if (st.hudT >= 120){
      st.hudT = 0;
      emitHud();
    }
  }

  const st = {
    engine: engine,
    run: run,
    W: W,
    H: H,
    C: C,
    c: c,
    p: p,
    ship: ship,
    shipId: shipId,
    shipSpec: shipSpec,
    superCharge: 0,
    superBusy: false,
    enemies: null,
    playerBullets: null,
    enemyBullets: null,
    powerups: null,
    player: null,
    aura: null,
    auraRing: null,
    lives: LIVES,
    bombs: BOMBS_START,
    iframe: 0,
    score: 0,
    fireT: 0,
    tier: 0,
    rapidT: 0,
    bombsUsed: 0,
    runBuild: runBuild,
    proceduralMap: null,
    pendingLevelUp: false,
    camp: { kills: 0, won: false, bossAlive: false },
    finished: false,
    victory: false,
    _cueDefeat: false,
    _errTags: errTags,
    _progressDone: false,
    destroyed: false,
    hudT: 120,
    add: engine.add,
    physics: engine.physics,
    tweens: engine.tweens,
    time: engine.time,
    cameras: engine.cameras,
    textures: engine.textures,
    rgb: rgb,
    rules: rules,
    err: err,
    sndPlay: sndPlay,
    sndMusic: sndMusic,
    sndUnlock: sndUnlock,
    toggleMute: toggleMute,
    banner: banner,
    floatText: floatText,
    burst: burst,
    puColor: puColor,
    enemyDef: enemyDef,
    enemyColor: enemyColor,
    findBoss: findBoss,
    bossPct: bossPct,
    spawnPlayerBullet: spawnPlayerBullet,
    spawnEnemyBullet: spawnEnemyBullet,
    spawnPowerup: spawnPowerup,
    spawnRandomPowerup: spawnRandomPowerup,
    dealDamage: dealDamage,
    nearestEnemy: nearestEnemy,
    onEnemyKilled: onEnemyKilled,
    onBulletHit: onBulletHit,
    onEnemyBulletHit: onEnemyBulletHit,
    onEnemyTouch: onEnemyTouch,
    onPowerupTouch: onPowerupTouch,
    applyPowerup: applyPowerup,
    hurtPlayer: hurtPlayer,
    useBomb: useBomb,
    triggerSuper: triggerSuper,
    startBoss: startBoss,
    cullOffscreen: cullOffscreen,
    movePlayer: movePlayer,
    autofire: autofire,
    updateEnemies: updateEnemies,
    emitHud: emitHud,
    finish: finish,
    chooseUpgrade: chooseUpgrade,
    cancelLevelUp: cancelLevelUp
  };
  try { if (typeof window !== 'undefined') window.__stage = st; } catch (e) {}

  st.enemies = engine.physics.add.group();
  st.playerBullets = engine.physics.add.group();
  st.enemyBullets = engine.physics.add.group();
  st.powerups = engine.physics.add.group();
  try {
    const campaign = HDATA.CAMPAIGNS[st.c];
    const phase = campaign && campaign.phases[st.p];
    if (campaign && phase) {
      st.proceduralMap = createProceduralMap(engine, {
        campaign: campaign,
        phase: phase,
        campaignIndex: st.c,
        phaseIndex: st.p,
        seed: run.mapSeed
      });
    }
  } catch (e) { err('map', e); }
  const playerKey = 'tur_' + st.shipId;
  ensureTexture(playerKey);
  st.player = engine.physics.add.sprite(225, 720, playerKey);
  try {
    const pb = st.player.body;
    if (pb && pb.setCircle){
      const bw = st.player.width || 32;
      const bh = st.player.height || 32;
      pb.setCircle(16, Math.round((bw - 32) / 2), Math.round((bh - 32) / 2));
    }
    if (st.player.setCollideWorldBounds) st.player.setCollideWorldBounds(true);
    if (st.player.setDepth) st.player.setDepth(6);
  } catch (e) { err('pbody', e); }
  st.aura = engine.add.circle(225, 720, 30, 0x38bdf8, 0.15).setDepth(5);
  st.auraRing = engine.add.circle(225, 720, 22, 0x38bdf8, 0).setStrokeStyle(2, 0x38bdf8, 0.55).setDepth(5);
  try {
    if (GameWeapons){
      if (GameWeapons.setShip) GameWeapons.setShip(st.shipId, st.shipSpec);
      if (GameWeapons.reset) GameWeapons.reset(st);
      if (GameWeapons.setTier) GameWeapons.setTier(st.tier | 0);
    }
  } catch (e) { err('weainit', e); }
  sndMusic('combat');
  try {
    if (GameCampaign && GameCampaign.begin) GameCampaign.begin(st, st.c, st.p);
  } catch (e) { err('camp', e); }
  try { if (SND && SND.ctx) sndUnlock(); } catch (e) {}
  engine.physics.add.overlap(st.playerBullets, st.enemies, (b, e) => { onBulletHit(b, e); });
  engine.physics.add.overlap(st.enemyBullets, st.player, (b) => { onEnemyBulletHit(b); });
  engine.physics.add.overlap(st.enemies, st.player, (e) => { onEnemyTouch(e); });
  engine.physics.add.overlap(st.player, st.powerups, (_p, pu) => { onPowerupTouch(pu); });
  try {
    const sp = (st.shipSpec === 'B' && st.ship.specB) ? st.ship.specB : st.ship.specA;
    if (sp && sp.name) banner(sp.name, 1500);
  } catch (e) {}

  return { destroy: destroy, update: update, chooseUpgrade: chooseUpgrade, cancelLevelUp: cancelLevelUp };
}
