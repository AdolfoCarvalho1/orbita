import { HDATA } from './game-data.js';
import { SND } from './game-audio.js';

export const GameWeapons = (function () {
  const DEFAULTS = {
    cannon: { fireDelay: 280, dmg: 7, speed: 520, w: 5, h: 14, color: 0xe2e8f0 },
    gatling: { fireDelay: 110, dmg: 2, speed: 560, w: 4, h: 10, color: 0xfbbf24 },
    beam: { fireDelay: 100, dmg: 5, width: 14, color: 0xf43f5e },
    missile: { fireDelay: 650, dmg: 16, speed: 200, w: 6, h: 10, color: 0xfb923c, radius: 50 },
    slow: { fireDelay: 500, dmg: 4, radius: 140 },
    chain: { fireDelay: 320, dmg: 6 },
    snipe: { fireDelay: 950, dmg: 30 },
    dot: { fireDelay: 420, dmg: 3, speed: 400, w: 5, h: 12, color: 0xa3e635 },
    amp: { fireDelay: 400, dmg: 2, speed: 500, w: 3, h: 8, color: 0xfde047 },
    pierce: { fireDelay: 750, dmg: 22, width: 18 }
  };

  const SUPER_NAMES = {
    cannon: 'Barragem Orbital',
    gatling: 'Tornado de Chumbo',
    laser: 'Prisma Solar',
    missile: 'Enxame MIRV',
    slow: 'Era Glacial',
    chain: 'Tempestade Final',
    snipe: 'Sentença',
    dot: 'Maré Nanopraga',
    amp: 'Sobrecarga Total',
    pierce: 'Lança Estelar'
  };

  const TIER_MAX = 4;
  const CHAIN_RADIUS = 340;
  const CHAIN_JUMP = 110;
  const CHAIN_FALLOFF = 0.78;
  const CHAIN_JUMPS = [4, 4, 8, 10, 12];
  const CANNON_VOLLEY = [1, 1, 2, 3, 5];
  const CANNON_SPREAD = 0.12;
  const GATLING_BURST = [2, 2, 3, 4, 6];
  const GATLING_STEP = 60;
  const MISSILE_SALVO = [1, 1, 2, 3, 4];
  const MISSILE_STEP = 120;
  const CRYO_PULSES = [1, 1, 2, 3, 5];
  const CRYO_STEP = 250;
  const SNIPE_TARGETS = [1, 1, 1, 2, 3];
  const VENOM_RADIUS = 90;
  const VENOM_TICK = 2;
  const MIRV_OFFSET = 20;
  const MIRV_RADIUS = 30;
  const MISSILE_AGGRO = 700;
  const MISSILE_HIT = 14;
  const MISSILE_RADIUS = 50;
  const MISSILE_RAMP = 200;
  const MISSILE_TOP = 260;
  const MISSILE_TURN_RATE = 5.2;
  const DRONE_RADIUS = 30;
  const DRONE_SPIN = 2.2;
  const DRONE_DELAY = 400;
  const DRONE_IDLE_DELAY = 800;
  const CHAIN_COLOR = 0x34d399;

  let curShip = null;
  let curSpec = 'A';
  let curScene = null;
  let curTier = 0;

  function shipList() {
    return (HDATA && HDATA.SHIPS) || null;
  }

  function findShip(shipId) {
    const list = shipList();
    if (!list) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === shipId) return list[i];
    }
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].kind === shipId) return list[i];
    }
    return null;
  }

  function resolve(shipId) {
    const s = findShip(shipId);
    let kind;
    if (s && s.kind) kind = s.kind;
    else if (DEFAULTS[shipId]) kind = shipId;
    else kind = 'cannon';
    if (kind === 'splash') kind = 'missile';
    const base = DEFAULTS[kind] || DEFAULTS.cannon;
    const out = {
      kind: kind,
      fireDelay: base.fireDelay,
      dmg: base.dmg,
      speed: base.speed,
      color: base.color,
      w: base.w,
      h: base.h,
      width: base.width,
      radius: base.radius
    };
    if (s) {
      if (typeof s.fireDelay === 'number') out.fireDelay = s.fireDelay;
      if (typeof s.dmg === 'number') out.dmg = s.dmg;
      const ex = s.extra;
      if (ex) {
        if (typeof ex.speed === 'number') out.speed = ex.speed;
        if (typeof ex.color === 'number') out.color = ex.color;
        if (typeof ex.w === 'number') out.w = ex.w;
        if (typeof ex.h === 'number') out.h = ex.h;
        if (typeof ex.radius === 'number') out.radius = ex.radius;
        if (typeof ex.width === 'number') out.width = ex.width;
        if (typeof ex.pierce === 'number') out.pierce = ex.pierce;
      }
      if (kind === 'amp' && !(out.dmg > 0)) {
        out.dmg = (ex && typeof ex.droneDmg === 'number') ? ex.droneDmg : DEFAULTS.amp.dmg;
      }
    }
    if (typeof out.fireDelay !== 'number') out.fireDelay = 300;
    if (typeof out.dmg !== 'number') out.dmg = 5;
    if (typeof out.speed !== 'number') out.speed = 520;
    if (typeof out.color !== 'number') out.color = 0xe2e8f0;
    if (typeof out.w !== 'number') out.w = 5;
    if (typeof out.h !== 'number') out.h = 14;
    if (typeof out.width !== 'number') out.width = 14;
    if (typeof out.radius !== 'number') out.radius = 140;
    return out;
  }

  function specKnobs(shipId) {
    const s = findShip(shipId || curShip);
    if (s && s.specBeh) {
      const k = s.specBeh[curSpec] || s.specBeh.A;
      if (k) return k;
    }
    return {};
  }

  function getSpec() {
    return curSpec;
  }

  function setShip(shipId, spec) {
    curShip = shipId;
    curSpec = (spec === 'B') ? 'B' : 'A';
  }

  function setTier(n) {
    const t = (typeof n === 'number' && isFinite(n)) ? Math.floor(n) : 0;
    curTier = Math.max(0, Math.min(TIER_MAX, t));
  }

  function tierVal(list) {
    const i = Math.max(0, Math.min(list.length - 1, curTier));
    return list[i];
  }

  function applyRunUpgrades(scene, stats) {
    const upgrades = scene && scene.runBuild && scene.runBuild.upgrades;
    if (!upgrades) return stats;
    stats.dmg *= 1 + (upgrades.power || 0) * 0.12;
    const caliber = 1 + (upgrades.caliber || 0) * 0.1;
    if (stats.width) stats.width *= caliber;
    if (stats.radius) stats.radius *= caliber;
    return stats;
  }

  function caliberMul(scene) {
    const upgrades = scene && scene.runBuild && scene.runBuild.upgrades;
    return 1 + ((upgrades && upgrades.caliber) || 0) * 0.1;
  }

  function fireDelay(shipId) {
    let d = resolve(shipId).fireDelay;
    const knobs = specKnobs(shipId);
    if (typeof knobs.cooldownMul === 'number') d *= knobs.cooldownMul;
    if (typeof knobs.selfFireMul === 'number') d *= knobs.selfFireMul;
    const ws = curScene && curScene.weaponState;
    if (ws) {
      if (ws.frenzyT > 0) d *= 0.3;
      if (ws.selfBuffT > 0) d *= 0.5;
    }
    const upgrades = curScene && curScene.runBuild && curScene.runBuild.upgrades;
    if (upgrades && upgrades.cadence > 0) d *= Math.pow(0.93, upgrades.cadence);
    return Math.max(45, d);
  }

  function playSnd(kind) {
    if (SND && typeof SND.shoot === 'function') SND.shoot(kind);
  }

  function listOf(scene) {
    if (!scene.enemies) return [];
    return typeof scene.enemies.getChildren === 'function' ? scene.enemies.getChildren() : scene.enemies;
  }

  function alive(e) {
    return !!e && e.hp > 0 && e.active !== false;
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function nearestList(scene, x, y, n) {
    const list = listOf(scene);
    const arr = [];
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (alive(e)) arr.push({ e: e, d: dist(e.x, e.y, x, y) });
    }
    arr.sort(function (a, b) { return a.d - b.d; });
    const out = [];
    for (let i = 0; i < arr.length && i < n; i++) out.push(arr[i].e);
    return out;
  }

  function topTargets(scene, n) {
    const list = listOf(scene);
    const arr = [];
    for (let i = 0; i < list.length; i++) {
      if (alive(list[i])) arr.push(list[i]);
    }
    arr.sort(function (a, b) { return b.y - a.y; });
    return arr.slice(0, n || 1);
  }

  function queueJob(ws, delay, fn) {
    if (!ws.supQueue) ws.supQueue = [];
    ws.supQueue.push({ t: delay, fn: fn });
  }

  function additive(go) {
    try {
      if (go) go.blendMode = 'lighter';
    } catch (e) {}
  }

  function flare(scene, x, y, w, h, color, dur) {
    if (!scene.add || !scene.add.rectangle || !scene.tweens) return null;
    const r = scene.add.rectangle(x, y, w, h, color).setAlpha(0.9);
    additive(r);
    scene.tweens.add({
      targets: r,
      alpha: 0,
      duration: dur || 90,
      onComplete: function () { r.destroy(); }
    });
    return r;
  }

  function beamFx(scene, x1, y1, x2, y2, color, width) {
    const g = scene.add.graphics();
    g.lineStyle(width || 2, color, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(Math.max(1, (width || 2) * 0.45), 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: function () { g.destroy(); }
    });
    return g;
  }

  function reticleFx(scene, x, y, size) {
    if (!scene.add || !scene.add.rectangle || !scene.tweens) return null;
    const s = size || 22;
    const h = scene.add.rectangle(x, y, s, 2, 0xffffff).setAlpha(0.9);
    const v = scene.add.rectangle(x, y, 2, s, 0xffffff).setAlpha(0.9);
    scene.tweens.add({
      targets: h,
      scaleX: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: function () { h.destroy(); }
    });
    scene.tweens.add({
      targets: v,
      scaleY: 1.8,
      alpha: 0,
      duration: 200,
      onComplete: function () { v.destroy(); }
    });
    return h;
  }

  function lightningFx(scene, x1, y1, x2, y2, color, width) {
    if (!scene.add || !scene.add.graphics) return null;
    const g = scene.add.graphics();
    const segs = 5;
    const pts = [{ x: x1, y: y1 }];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push({
        x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * 16,
        y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * 16
      });
    }
    pts.push({ x: x2, y: y2 });
    let dead = false;
    const draw = function (alpha) {
      if (dead) return;
      try {
        g.clear();
        g.lineStyle(Math.max(1, width || 3), color, 0.5 * alpha);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();
        g.lineStyle(Math.max(1, (width || 3) * 0.45), 0xffffff, 0.95 * alpha);
        g.beginPath();
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.strokePath();
      } catch (e) {}
    };
    draw(1);
    if (scene.time && scene.time.delayedCall) {
      scene.time.delayedCall(40, function () { draw(0.65); });
      scene.time.delayedCall(80, function () { draw(0.35); });
    }
    if (scene.tweens) {
      scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 120,
        onComplete: function () { dead = true; try { g.destroy(); } catch (e) {} }
      });
    }
    return g;
  }

  function modifyDamage(a, b, c) {
    let scene = null;
    let e = null;
    let dmg = 0;
    if (c === undefined && a && (a.hp !== undefined || a.active !== undefined) && typeof b === 'number') {
      e = a;
      dmg = b;
      scene = curScene;
    } else {
      scene = a || curScene;
      e = b;
      dmg = c;
    }
    if (typeof dmg !== 'number' || !(dmg > 0)) dmg = 0;
    let out = dmg;
    const ws = scene && scene.weaponState;
    if (ws && ws.dmgBuff > 1) out *= ws.dmgBuff;
    if (!e) return out;
    const knobs = specKnobs(curShip);
    const kind = curShip ? resolve(curShip).kind : null;
    if (kind === 'gatling' && curSpec === 'A') {
      const rampMax = knobs.rampMax != null ? knobs.rampMax : 2.5;
      const rampPerHit = knobs.rampPerHit != null ? knobs.rampPerHit : 0.15;
      const rampReset = knobs.rampReset != null ? knobs.rampReset : 1.2;
      e._heat = Math.min(rampMax, (e._heat || 0) + rampPerHit);
      e._heatT = rampReset;
      out *= (1 + e._heat);
    }
    if (kind === 'gatling' && curSpec === 'B') {
      const stun = knobs.stun != null ? knobs.stun : 0.2;
      e.stunT = Math.max(e.stunT || 0, stun);
    }
    if (kind === 'beam' && curSpec === 'A') {
      const rampPerSec = knobs.rampPerSec != null ? knobs.rampPerSec : 0.8;
      const rampMax = knobs.rampMax != null ? knobs.rampMax : 4;
      if (e._beamT > 0) {
        e._beamRamp = Math.min(rampMax, (e._beamRamp || 1) + rampPerSec * 0.1);
      } else {
        e._beamRamp = 1 + rampPerSec * 0.1;
      }
      e._beamT = 0.25;
      out *= e._beamRamp;
    }
    if (kind === 'slow' && curSpec === 'A') {
      const takeMul = knobs.takeMul != null ? knobs.takeMul : 1.4;
      if (e.physTake && e.slowT > 0) out *= takeMul;
    }
    if (kind === 'chain' && curSpec === 'B') {
      const shieldMul = knobs.shieldMul != null ? knobs.shieldMul : 4;
      if (e.shield > 0) out *= shieldMul;
    }
    return out;
  }

  function ensureBeamFx(scene, s) {
    const ws = scene.weaponState;
    if (ws.beamFx && ws.beamFx.outer && ws.beamFx.outer.active !== false) return ws.beamFx;
    const outer = scene.add.rectangle(0, -40, Math.max(8, s.width * 1.8), 1, s.color);
    const core = scene.add.rectangle(0, -40, Math.max(4, s.width * 0.7), 1, 0xff526b);
    const line = scene.add.rectangle(0, -40, Math.max(2, s.width * 0.22), 1, 0xffffff);
    outer.setAlpha(0.3);
    core.setAlpha(0.85);
    line.setAlpha(0.9);
    additive(outer);
    additive(core);
    additive(line);
    ws.beamFx = { outer: outer, core: core, line: line, lastTick: 0, spec: s };
    return ws.beamFx;
  }

  function placeBeam(scene, fx, x, height) {
    const s = fx.spec || { width: 14 };
    fx.outer.setPosition(x, height / 2);
    fx.outer.width = Math.max(8, s.width * 1.8);
    fx.outer.height = height;
    fx.core.setPosition(x, height / 2);
    fx.core.width = Math.max(4, s.width * 0.7);
    fx.core.height = height;
    fx.line.setPosition(x, height / 2);
    fx.line.width = Math.max(2, s.width * 0.22);
    fx.line.height = height;
  }

  function refreshBeamFx(scene, s, x, y) {
    const fx = ensureBeamFx(scene, s);
    fx.lastTick = (scene.time && scene.time.now) ? scene.time.now : Date.now();
    fx.outer.setAlpha(0.3);
    fx.core.setAlpha(0.85);
    fx.line.setAlpha(0.9);
    placeBeam(scene, fx, x, Math.max(1, y));
    return fx;
  }

  function updateBeam(scene, dt) {
    const ws = scene.weaponState;
    const fx = ws && ws.beamFx;
    if (!fx || !fx.outer || fx.outer.active === false) return;
    const nowMs = (scene.time && scene.time.now) ? scene.time.now : Date.now();
    const stale = fx.lastTick > 0 && (nowMs - fx.lastTick) > 180;
    const p = scene.player;
    if (!stale && p && p.active !== false) {
      placeBeam(scene, fx, p.x, Math.max(1, p.y));
    }
    if (stale) {
      if (SND && typeof SND.laserStop === 'function') SND.laserStop('player');
      const a = Math.max(0, fx.outer.alpha - dt * 0.004);
      fx.outer.setAlpha(Math.max(0, a * 0.3));
      fx.core.setAlpha(Math.max(0, a * 0.85));
      fx.line.setAlpha(Math.max(0, a * 0.9));
      if (a <= 0.01) {
        fx.outer.destroy();
        fx.core.destroy();
        fx.line.destroy();
        ws.beamFx = null;
      }
    }
  }

  function fireBeam(scene, s, x, y) {
    const half = s.width / 2;
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (alive(e) && Math.abs(e.x - x) < half) scene.dealDamage(e, s.dmg);
    }
    refreshBeamFx(scene, s, x, y);
    flare(scene, x, y - 4, 16, 16, s.color, 90);
    return null;
  }

  function fireBeamSplit(scene, s, x, y, knobs) {
    const n = knobs.split != null ? knobs.split : 3;
    const targets = nearestList(scene, x, y, n);
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      scene.dealDamage(t, s.dmg);
      beamFx(scene, x, y, t.x, t.y, s.color, 3);
      const c = scene.add.circle(t.x, t.y, 5, s.color, 0.7);
      scene.tweens.add({
        targets: c,
        scale: 1.6,
        alpha: 0,
        duration: 140,
        onComplete: function () { c.destroy(); }
      });
    }
    refreshBeamFx(scene, s, x, y);
    return null;
  }

  function fireMissile(scene, s, x, y, opts) {
    opts = opts || {};
    const spd = opts.speed != null ? opts.speed : s.speed;
    const dmg = opts.dmg != null ? opts.dmg : s.dmg;
    const b = scene.spawnPlayerBullet({
      x: x, y: y, vx: 0, vy: -spd,
      dmg: dmg, color: s.color, w: s.w || 6, h: s.h || 12, kind: 'missile'
    });
    if (!b) return null;
    const ws = scene.weaponState;
    if (!ws.missiles) ws.missiles = [];
    ws.missiles.push({
      bullet: b, speed: spd, dmg: dmg,
      target: scene.nearestEnemy(x, y, MISSILE_AGGRO),
      heading: -Math.PI / 2,
      radius: opts.radius != null ? opts.radius : s.radius,
      poison: opts.poison || null,
      mirv: !!opts.mirv,
      trailT: 0
    });
    return b;
  }

  function miniBlast(scene, cx, cy, radius, dmg) {
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      const d = dist(e.x, e.y, cx, cy);
      if (d <= radius) scene.dealDamage(e, dmg * (1 - 0.6 * (d / radius)));
    }
    if (!scene.add || !scene.add.circle) return;
    const ring = scene.add.circle(cx, cy, radius, 0xfdba74, 0.4);
    ring.scale = 0.3;
    scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 200,
      onComplete: function () { ring.destroy(); }
    });
  }

  function explodeMissile(scene, m) {
    const b = m.bullet;
    const cx = b.x;
    const cy = b.y;
    const radius = m.radius != null ? m.radius : MISSILE_RADIUS;
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      const d = dist(e.x, e.y, cx, cy);
      if (d <= radius) {
        const died = scene.dealDamage(e, m.dmg * (1 - 0.6 * (d / radius)));
        if (!died && m.poison && e.active !== false) {
          e.poisonT = Math.max(e.poisonT || 0, m.poison.dur);
          e.poisonDps = m.poison.dps;
        }
      }
    }
    const ring = scene.add.circle(cx, cy, radius, 0xfb923c, 0.5);
    ring.scale = 0.15;
    scene.tweens.add({
      targets: ring,
      scale: 1,
      alpha: 0,
      duration: 220,
      onComplete: function () { ring.destroy(); }
    });
    if (m.mirv) {
      miniBlast(scene, cx - MIRV_OFFSET, cy, MIRV_RADIUS, m.dmg * 0.4);
      miniBlast(scene, cx + MIRV_OFFSET, cy, MIRV_RADIUS, m.dmg * 0.4);
    }
    b.destroy();
  }

  function updateMissiles(scene, dt) {
    const ws = scene.weaponState;
    if (!ws || !ws.missiles || !ws.missiles.length) return;
    const secs = dt / 1000;
    for (let i = ws.missiles.length - 1; i >= 0; i--) {
      const m = ws.missiles[i];
      const b = m.bullet;
      if (!b || !b.active || b.y < -40 || b.x < -40 || b.x > 490) {
        if (b && b.active) b.destroy();
        ws.missiles.splice(i, 1);
        continue;
      }
      m.speed = Math.min(MISSILE_TOP, m.speed + MISSILE_RAMP * secs);
      let t = m.target;
      if (!alive(t) || dist(t.x, t.y, b.x, b.y) > MISSILE_AGGRO) {
        t = scene.nearestEnemy(b.x, b.y, MISSILE_AGGRO);
        m.target = t;
      }
      if (t) {
        const desired = Math.atan2(t.y - b.y, t.x - b.x);
        let turn = desired - m.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        const maxTurn = MISSILE_TURN_RATE * secs;
        m.heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
      }
      const vx = Math.cos(m.heading) * m.speed;
      const vy = Math.sin(m.heading) * m.speed;
      if (b.body && b.body.velocity) {
        if (typeof b.body.velocity.set === 'function') b.body.velocity.set(vx, vy);
        else {
          b.body.velocity.x = vx;
          b.body.velocity.y = vy;
        }
      }
      b.rotation = m.heading + Math.PI / 2;
      m.trailT -= dt;
      if (m.trailT <= 0 && ws.missiles.length <= 6) {
        m.trailT = 80;
        if (scene.add && scene.add.circle && scene.tweens) {
          const puff = scene.add.circle(b.x, b.y + 6, 2.5, 0xfb923c, 0.3);
          scene.tweens.add({
            targets: puff,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: function () { puff.destroy(); }
          });
        }
      }
      const list = listOf(scene);
      let hit = false;
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (alive(e) && dist(e.x, e.y, b.x, b.y) < MISSILE_HIT) {
          explodeMissile(scene, m);
          hit = true;
          break;
        }
      }
      if (hit) ws.missiles.splice(i, 1);
    }
  }

  function fireMissileSalvo(scene, s, x, y, knobs) {
    const ws = scene.weaponState;
    let first = null;
    if (curSpec === 'B') {
      const count = tierVal(MISSILE_SALVO);
      const splashMul = knobs.splashMul != null ? knobs.splashMul : 1.7;
      const radius = (s.radius || MISSILE_RADIUS) * splashMul;
      const poison = {
        dps: knobs.burnDps != null ? knobs.burnDps : 5,
        dur: knobs.burnDur != null ? knobs.burnDur : 3
      };
      for (let i = 0; i < count; i++) {
        const job = function () {
          return fireMissile(scene, s, x, y, { radius: radius, poison: poison, mirv: curTier >= TIER_MAX });
        };
        if (i === 0) first = job();
        else queueJob(ws, i * MISSILE_STEP, job);
      }
      return first;
    }
    const salvos = knobs.salvos != null ? knobs.salvos : 4;
    const dmg = s.dmg * (knobs.dmgMul != null ? knobs.dmgMul : 1);
    const speed = knobs.speed != null ? knobs.speed : s.speed;
    for (let i = 0; i < salvos; i++) {
      const job = function () {
        return fireMissile(scene, s, x, y, { dmg: dmg, speed: speed, mirv: curTier >= TIER_MAX });
      };
      if (i === 0) first = job();
      else queueJob(ws, i * MISSILE_STEP, job);
    }
    return first;
  }

  function fireSlow(scene, s, x, y, knobs) {
    const ws = scene.weaponState;
    if (curSpec === 'B') {
      const wave = scene.add.circle(x, y, 8, 0x38bdf8, 0.35);
      scene.tweens.add({
        targets: wave,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 300,
        onComplete: function () { wave.destroy(); }
      });
      return null;
    }
    const pulses = tierVal(CRYO_PULSES);
    const r = s.radius;
    const col = curSpec === 'A' ? 0x60a5fa : 0x38bdf8;
    const slowFactor = knobs.slowFactor != null ? knobs.slowFactor : 0.5;
    const slowDur = knobs.slowDur != null ? knobs.slowDur : 2;
    const cast = function (idx) {
      const rr = r * (0.6 + 0.4 * ((idx + 1) / pulses));
      const wave = scene.add.circle(x, y, 6, col, 0.5);
      scene.tweens.add({
        targets: wave,
        scaleX: rr / 6,
        scaleY: rr / 6,
        alpha: 0,
        duration: 400,
        onComplete: function () { wave.destroy(); }
      });
      for (let k = 0; k < 2; k++) {
        const ang = Math.random() * Math.PI * 2;
        const sx = x + Math.cos(ang) * rr * 0.7;
        const sy = y + Math.sin(ang) * rr * 0.7;
        if (scene.add && scene.add.rectangle) {
          const sp = scene.add.rectangle(sx, sy, 4, 4, 0xffffff).setAlpha(0.8);
          scene.tweens.add({
            targets: sp,
            alpha: 0,
            scale: 1.8,
            duration: 200,
            onComplete: function () { sp.destroy(); }
          });
        }
      }
      const list = listOf(scene);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!alive(e)) continue;
        if (dist(e.x, e.y, x, y) > rr) continue;
        e.slowT = Math.max(e.slowT || 0, slowDur);
        e.slowFactor = slowFactor;
        e.physTake = true;
        e.physTakeMul = 1;
        scene.dealDamage(e, s.dmg);
      }
    };
    for (let i = 0; i < pulses; i++) {
      if (i === 0) cast(0);
      else queueJob(ws, i * CRYO_STEP, (function (idx) { return function () { cast(idx); }; })(i));
    }
    return null;
  }

  function fireChain(scene, s, x, y, knobs) {
    const reach = CHAIN_RADIUS * caliberMul(scene);
    const jumpReach = CHAIN_JUMP * caliberMul(scene);
    let target = scene.nearestEnemy(x, y, reach);
    if (!target) return null;
    let maxHops = tierVal(CHAIN_JUMPS);
    if (curSpec === 'A') {
      let add = knobs.chainAdd;
      if (add == null && knobs.jumps != null) add = Math.max(0, knobs.jumps - CHAIN_JUMPS[0]);
      if (add == null) add = 4;
      maxHops += add;
    }
    const stunChance = knobs.stunChance != null ? knobs.stunChance : 0;
    const stunDur = knobs.stun != null ? knobs.stun : 0.4;
    const hitList = [];
    let px = x;
    let py = y;
    let hop = 0;
    while (target && hop < maxHops) {
      lightningFx(scene, px, py, target.x, target.y, CHAIN_COLOR, 3);
      scene.dealDamage(target, s.dmg * Math.pow(CHAIN_FALLOFF, hop));
      if (stunChance > 0 && Math.random() < stunChance) {
        target.stunT = Math.max(target.stunT || 0, stunDur);
      }
      hitList.push(target);
      px = target.x;
      py = target.y;
      hop++;
      let next = null;
      let best = Infinity;
      const list = listOf(scene);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!alive(e) || hitList.indexOf(e) !== -1) continue;
        const d = dist(e.x, e.y, px, py);
        if (d <= jumpReach && d < best) {
          best = d;
          next = e;
        }
      }
      target = next;
    }
    return null;
  }

  function snipeFx(scene, x, y, tx, ty, big) {
    const g = scene.add.graphics();
    g.lineStyle(big ? 5 : 3, 0x67e8f9, 0.45);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.strokePath();
    g.lineStyle(big ? 2 : 1.2, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.strokePath();
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: big ? 220 : 200,
      onComplete: function () { g.destroy(); }
    });
    const c = scene.add.circle(tx, ty, big ? 12 : 7, 0x67e8f9, 0.85);
    scene.tweens.add({
      targets: c,
      scale: big ? 2.6 : 1.8,
      alpha: 0,
      duration: big ? 260 : 150,
      onComplete: function () { c.destroy(); }
    });
  }

  function fireSnipe(scene, s, x, y, knobs) {
    const caliberRanks = scene && scene.runBuild && scene.runBuild.upgrades
      ? scene.runBuild.upgrades.caliber || 0
      : 0;
    const targets = topTargets(scene, tierVal(SNIPE_TARGETS) + Math.floor(caliberRanks / 3));
    if (!targets.length) return null;
    if (curSpec === 'B') {
      const markDur = knobs.markDur != null ? knobs.markDur : 3;
      const markMul = knobs.markMul != null ? knobs.markMul : 1.35;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        scene.dealDamage(t, s.dmg);
        snipeFx(scene, x, y, t.x, t.y, false);
        reticleFx(scene, t.x, t.y, 26);
        if (t.active !== false && t.hp > 0) {
          t.markT = markDur;
          t.markMul = markMul;
        }
      }
      return targets[0];
    }
    const critChance = knobs.critChance != null ? knobs.critChance : 0.4;
    const critMul = knobs.critMul != null ? knobs.critMul : 4;
    const execute = knobs.execute != null ? knobs.execute : 0.15;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      let dmg = s.dmg;
      let crit = false;
      if (Math.random() < critChance) {
        dmg *= critMul;
        crit = true;
      }
      const isBoss = !!(t.boss || t.isBoss);
      const maxHp = t.maxHp || t.hp;
      if (!isBoss && maxHp > 0 && t.hp / maxHp <= execute) {
        scene.dealDamage(t, 99999);
      } else {
        scene.dealDamage(t, dmg);
      }
      snipeFx(scene, x, y, t.x, t.y, crit);
      reticleFx(scene, t.x, t.y, crit ? 30 : 22);
    }
    return targets[0];
  }

  function fireVenom(scene, s, x, y, knobs) {
    const list = listOf(scene);
    let anchor = null;
    let best = Infinity;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      const d = Math.abs(e.x - x);
      if (d < best) {
        best = d;
        anchor = e;
      }
    }
    let cx = x;
    let cy = Math.max(80, y - 320);
    if (anchor) {
      cx = anchor.x;
      cy = anchor.y;
    }
    const ship = findShip(curShip);
    const venomRadius = VENOM_RADIUS * caliberMul(scene);
    let dps = 6;
    let dur = 3;
    if (ship && ship.extra) {
      if (typeof ship.extra.dps === 'number') dps = ship.extra.dps;
      if (typeof ship.extra.dur === 'number') dur = ship.extra.dur;
    }
    const blobs = [
      { dx: -22, dy: -10, r: 0.75 },
      { dx: 20, dy: 12, r: 0.7 },
      { dx: -4, dy: 24, r: 0.65 }
    ];
    for (let i = 0; i < blobs.length; i++) {
      const bl = blobs[i];
      const c = scene.add.circle(cx + bl.dx, cy + bl.dy, 8, 0xa3e635, 0.35);
      scene.tweens.add({
        targets: c,
        scaleX: (venomRadius * bl.r) / 8,
        scaleY: (venomRadius * bl.r) / 8,
        duration: 300,
        onComplete: function () {
          scene.tweens.add({
            targets: c,
            alpha: 0,
            duration: 600,
            onComplete: function () { c.destroy(); }
          });
        }
      });
    }
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      if (dist(e.x, e.y, cx, cy) > venomRadius) continue;
      e.poisonT = Math.max(e.poisonT || 0, dur);
      e.poisonDps = dps;
      if (curSpec === 'A') {
        e.poisonSpread = knobs.spreadCount != null ? knobs.spreadCount : 2;
        e.poisonSpreadRadius = knobs.spreadRadius != null ? knobs.spreadRadius : 80;
      } else if (curSpec === 'B') {
        e.armor = 0;
      }
      scene.dealDamage(e, VENOM_TICK);
    }
    return anchor;
  }

  function firePierce(scene, s, x, y, opts) {
    opts = opts || {};
    const width = opts.width != null ? opts.width : s.width;
    const dmg = opts.dmg != null ? opts.dmg : s.dmg;
    const dealOpts = opts.ignoreArmor ? { ignoreArmor: true } : undefined;
    const half = width / 2;
    const list = listOf(scene);
    let hitY = null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e) || Math.abs(e.x - x) >= half) continue;
      scene.dealDamage(e, dmg, dealOpts);
      if (hitY === null || e.y > hitY) hitY = e.y;
    }
    flare(scene, x, y - 10, 14, 28, 0xffffff, 60);
    const height = Math.max(1, y);
    const outer = scene.add.rectangle(x, height / 2, width, height, 0xffffff).setAlpha(0.35);
    const core = scene.add.rectangle(x, height / 2, 6, height, 0xffffff).setAlpha(0.95);
    additive(outer);
    additive(core);
    scene.tweens.add({
      targets: outer,
      alpha: 0,
      duration: 180,
      onComplete: function () { outer.destroy(); }
    });
    scene.tweens.add({
      targets: core,
      alpha: 0,
      duration: 220,
      onComplete: function () { core.destroy(); }
    });
    const wy = hitY != null ? hitY : (scene.H || 800) / 2;
    const shock = scene.add.rectangle(x, wy, 8, 2, 0xffffff).setAlpha(0.8);
    scene.tweens.add({
      targets: shock,
      scaleX: (scene.W || 450) / 8,
      alpha: 0,
      duration: 150,
      onComplete: function () { shock.destroy(); }
    });
    if (opts.shake !== false && scene.cameras && scene.cameras.main && scene.cameras.main.shake) {
      scene.cameras.main.shake(80, 0.004);
    }
    return null;
  }

  function fireCannon(scene, s, x, y, knobs) {
    const dmg = s.dmg * (knobs.dmgMul != null ? knobs.dmgMul : 1);
    const speed = knobs.speed != null ? knobs.speed : s.speed;
    if (curSpec === 'B') {
      const shots = knobs.shots != null ? knobs.shots : 4;
      const spread = knobs.spread != null ? knobs.spread : 0.18;
      let first = null;
      for (let i = 0; i < shots; i++) {
        const t = shots === 1 ? 0 : (i / (shots - 1) - 0.5);
        const ang = t * spread;
        const b = scene.spawnPlayerBullet({
          x: x, y: y,
          vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed,
          dmg: dmg, color: s.color, w: 4, h: 12
        });
        if (!first) first = b;
      }
      flare(scene, x, y - 6, 12, 18, s.color, 70);
      return first;
    }
    const count = tierVal(CANNON_VOLLEY);
    const heavy = count === 1;
    let first = null;
    for (let i = 0; i < count; i++) {
      const ang = count > 1 ? (i - (count - 1) / 2) * CANNON_SPREAD : 0;
      const opts = {
        x: x, y: y,
        vx: Math.sin(ang) * speed, vy: -Math.cos(ang) * speed,
        dmg: dmg, color: s.color,
        w: heavy ? 9 : 6, h: heavy ? 22 : 18
      };
      if (heavy) opts.splash = knobs.splash != null ? knobs.splash : 26;
      const b = scene.spawnPlayerBullet(opts);
      if (!first) first = b;
    }
    flare(scene, x, y - 8, heavy ? 14 : 12, heavy ? 26 : 18, s.color, 80);
    if (scene.cameras && scene.cameras.main && scene.cameras.main.shake) {
      scene.cameras.main.shake(40, 0.002);
    }
    return first;
  }

  function fireGatling(scene, s, x, y, knobs) {
    const ws = scene.weaponState;
    if (ws && ws.gatlingBurst > 0) return null;
    const count = tierVal(GATLING_BURST);
    const pierce = curSpec === 'B' ? (knobs.pierce != null ? knobs.pierce : 2) : null;
    const shootOne = function () {
      const ang = (Math.random() - 0.5) * 0.12;
      const opts = {
        x: x + (Math.random() - 0.5) * 6, y: y,
        vx: Math.sin(ang) * s.speed, vy: -Math.cos(ang) * s.speed,
        dmg: s.dmg, color: s.color, w: 3, h: 12
      };
      if (pierce != null) opts.pierce = pierce;
      return scene.spawnPlayerBullet(opts);
    };
    const first = shootOne();
    flare(scene, x, y - 6, 10, 16, s.color, 60);
    if (count > 1 && ws) {
      ws.gatlingBurst = count - 1;
      for (let i = 1; i < count; i++) {
        queueJob(ws, i * GATLING_STEP, function () {
          if (ws.gatlingBurst > 0) ws.gatlingBurst--;
          shootOne();
        });
      }
    }
    if (scene.cameras && scene.cameras.main && scene.cameras.main.shake) {
      scene.cameras.main.shake(20, 0.001);
    }
    return first;
  }

  function fireRail(scene, s, x, y, knobs) {
    if (curSpec === 'B') {
      const off = knobs.offset != null ? knobs.offset : 14;
      firePierce(scene, s, x - off, y, { width: s.width, shake: false });
      firePierce(scene, s, x + off, y, { width: s.width, shake: false });
      if (curTier >= TIER_MAX) firePierce(scene, s, x, y, { width: s.width, shake: false });
      if (scene.cameras && scene.cameras.main && scene.cameras.main.shake) {
        scene.cameras.main.shake(80, 0.004);
      }
      return null;
    }
    return firePierce(scene, s, x, y, {
      width: knobs.width != null ? knobs.width : s.width,
      ignoreArmor: !!knobs.ignoreArmor
    });
  }

  function ensureDrones(scene) {
    const ws = scene.weaponState;
    if (ws.drones && ws.drones.length) return ws.drones;
    ws.drones = [];
    for (let i = 0; i < 2; i++) {
      ws.drones.push({
        angle: i * Math.PI,
        sprite: scene.add.rectangle(0, 0, 6, 6, 0xfde047),
        timer: DRONE_DELAY,
        sparkT: 0
      });
    }
    return ws.drones;
  }

  function clearDrones(ws) {
    if (!ws.drones) return;
    for (let i = 0; i < ws.drones.length; i++) {
      const spr = ws.drones[i].sprite;
      if (spr && spr.active) spr.destroy();
    }
    ws.drones = null;
  }

  function updateDrones(scene, dt) {
    const ws = scene.weaponState;
    const s = curShip ? applyRunUpgrades(scene, resolve(curShip)) : null;
    const isAmp = !!(s && s.kind === 'amp');
    if (ws.drones && ws.drones.length && !isAmp) clearDrones(ws);
    if (!ws.drones || !ws.drones.length) {
      if (!isAmp) return;
      ensureDrones(scene);
    }
    const p = scene.player;
    if (!p) return;
    const knobs = isAmp ? specKnobs(curShip) : {};
    let dmgMul = 1;
    let delayMul = 1;
    if (curSpec === 'A') {
      if (typeof knobs.droneDmgMul === 'number') dmgMul = knobs.droneDmgMul;
      if (typeof knobs.droneDelayMul === 'number') delayMul = knobs.droneDelayMul;
    }
    if (ws.ampSuperT > 0) delayMul *= 0.5;
    const droneDmg = s.dmg * dmgMul;
    const pierce = (curSpec === 'B' && knobs.dronePierce != null) ? knobs.dronePierce : undefined;
    for (let i = 0; i < ws.drones.length; i++) {
      const d = ws.drones[i];
      d.angle += DRONE_SPIN * (dt / 1000);
      d.sprite.x = p.x + Math.cos(d.angle) * DRONE_RADIUS;
      d.sprite.y = p.y + Math.sin(d.angle) * DRONE_RADIUS;
      d.sparkT = (d.sparkT || 0) - dt;
      if (d.sparkT <= 0) {
        d.sparkT = 60;
        if (scene.add && scene.add.circle && scene.tweens) {
          const sp = scene.add.circle(d.sprite.x, d.sprite.y + 4, 2, 0xfde047, 0.7);
          scene.tweens.add({
            targets: sp,
            alpha: 0,
            scale: 0.4,
            duration: 260,
            onComplete: function () { sp.destroy(); }
          });
        }
      }
      d.timer -= dt;
      if (d.timer > 0) continue;
      const t = scene.nearestEnemy(d.sprite.x, d.sprite.y, 900 * caliberMul(scene));
      if (t) {
        const dx = t.x - d.sprite.x;
        const dy = t.y - d.sprite.y;
        const len = Math.hypot(dx, dy) || 1;
        const opts = {
          x: d.sprite.x, y: d.sprite.y,
          vx: (dx / len) * s.speed, vy: (dy / len) * s.speed,
          dmg: droneDmg, color: s.color, w: s.w, h: s.h
        };
        if (pierce != null) opts.pierce = pierce;
        scene.spawnPlayerBullet(opts);
        flare(scene, d.sprite.x, d.sprite.y, 8, 8, 0xfde047, 70);
        d.timer = DRONE_DELAY * delayMul;
      } else {
        const opts = {
          x: d.sprite.x, y: d.sprite.y,
          vx: 0, vy: -s.speed,
          dmg: droneDmg, color: s.color, w: s.w, h: s.h
        };
        if (pierce != null) opts.pierce = pierce;
        scene.spawnPlayerBullet(opts);
        flare(scene, d.sprite.x, d.sprite.y, 8, 8, 0xfde047, 70);
        d.timer = DRONE_IDLE_DELAY * delayMul;
      }
      playSnd('amp');
    }
  }

  function updateSpecTimers(scene, dt) {
    const ws = scene.weaponState;
    const secs = dt / 1000;
    if (ws.frenzyT > 0) ws.frenzyT = Math.max(0, ws.frenzyT - secs);
    if (ws.selfBuffT > 0) {
      ws.selfBuffT = Math.max(0, ws.selfBuffT - secs);
      if (ws.selfBuffT <= 0) {
        ws.dmgBuff = 1;
        ws.ampSuperT = 0;
      }
    }
    if (ws.supQueue && ws.supQueue.length) {
      for (let i = ws.supQueue.length - 1; i >= 0; i--) {
        const job = ws.supQueue[i];
        job.t -= dt;
        if (job.t <= 0) {
          try { job.fn(); } catch (err) {}
          ws.supQueue.splice(i, 1);
        }
      }
      if (!ws.supQueue.length) ws.supQueue = null;
    }
    if (ws.supSweepT > 0) {
      ws.supSweepT = Math.max(0, ws.supSweepT - secs);
      ws.supSweepAcc = (ws.supSweepAcc || 0) + dt;
      const y = (scene.H || 800) * (1 - ws.supSweepT);
      while (ws.supSweepAcc >= 60) {
        ws.supSweepAcc -= 60;
        const list = listOf(scene);
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (alive(e)) scene.dealDamage(e, 8);
        }
        const line = scene.add.rectangle(scene.W / 2, y, scene.W || 450, 4, 0xf43f5e).setAlpha(0.95);
        scene.tweens.add({
          targets: line,
          alpha: 0,
          duration: 90,
          onComplete: function () { line.destroy(); }
        });
      }
      if (ws.supSweepT <= 0) ws.supSweepAcc = 0;
    }
    if (curShip && resolve(curShip).kind === 'slow' && curSpec === 'B') {
      const knobs = specKnobs(curShip);
      const p = scene.player;
      if (p) {
        ws._cryoTick = (ws._cryoTick || 0) - dt;
        if (ws._cryoTick <= 0) {
          ws._cryoTick = 500;
          const r = knobs.auraRadius != null ? knobs.auraRadius : 100;
          const dps = knobs.auraDps != null ? knobs.auraDps : 3;
          const slow = knobs.auraSlow != null ? knobs.auraSlow : 0.5;
          const list = listOf(scene);
          for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (!alive(e)) continue;
            if (dist(e.x, e.y, p.x, p.y) <= r) {
              e.slowT = Math.max(e.slowT || 0, 0.3);
              e.slowFactor = slow;
              e.physTake = false;
              scene.dealDamage(e, dps * 0.5);
            }
          }
        }
      }
    }
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e) continue;
      if (e._heat > 0) {
        e._heatT = (e._heatT || 0) - secs;
        if (e._heatT <= 0) {
          e._heat = 0;
          e._heatT = 0;
        }
      }
      if (e._beamT > 0) {
        e._beamT -= secs;
        if (e._beamT <= 0) {
          e._beamT = 0;
          e._beamRamp = 1;
        }
      }
    }
  }

  function update(scene, dt) {
    if (!scene) return;
    curScene = scene;
    if (!scene.weaponState) scene.weaponState = {};
    updateMissiles(scene, dt);
    updateDrones(scene, dt);
    updateBeam(scene, dt);
    updateSpecTimers(scene, dt);
  }

  function reset(scene) {
    curScene = scene || curScene;
    if (!scene || !scene.weaponState) return;
    const ws = scene.weaponState;
    if (ws.missiles) {
      for (let i = 0; i < ws.missiles.length; i++) {
        const b = ws.missiles[i].bullet;
        if (b && b.active) b.destroy();
      }
      ws.missiles = null;
    }
    clearDrones(ws);
    ws.frenzyT = 0;
    ws.selfBuffT = 0;
    ws.ampSuperT = 0;
    ws.dmgBuff = 1;
    ws.supQueue = null;
    ws.supSweepT = 0;
    ws.supSweepAcc = 0;
    ws.gatlingBurst = 0;
    ws._cryoTick = 0;
    const bfx = ws.beamFx;
    if (bfx) {
      try { bfx.outer.destroy(); bfx.core.destroy(); bfx.line.destroy(); } catch (e) {}
      ws.beamFx = null;
    }
    if (SND && typeof SND.laserStopAll === 'function') SND.laserStopAll();
  }

  function fire(scene, shipId, x, y) {
    const s = applyRunUpgrades(scene, resolve(shipId));
    curShip = shipId;
    curScene = scene;
    playSnd(s.kind);
    if (!scene.weaponState) scene.weaponState = {};
    const knobs = specKnobs(shipId);
    switch (s.kind) {
      case 'beam':
        if (curSpec === 'B') return fireBeamSplit(scene, s, x, y, knobs);
        return fireBeam(scene, s, x, y);
      case 'missile':
        return fireMissileSalvo(scene, s, x, y, knobs);
      case 'slow':
        return fireSlow(scene, s, x, y, knobs);
      case 'chain':
        return fireChain(scene, s, x, y, knobs);
      case 'snipe':
        return fireSnipe(scene, s, x, y, knobs);
      case 'pierce':
        return fireRail(scene, s, x, y, knobs);
      case 'amp':
        ensureDrones(scene);
        return null;
      case 'gatling':
        return fireGatling(scene, s, x, y, knobs);
      case 'dot':
        return fireVenom(scene, s, x, y, knobs);
      case 'cannon':
        return fireCannon(scene, s, x, y, knobs);
      default:
        return scene.spawnPlayerBullet({
          x: x, y: y, vx: 0, vy: -s.speed,
          dmg: s.dmg, color: s.color, w: s.w, h: s.h
        });
    }
  }

  function superCannon(scene) {
    const ws = scene.weaponState;
    for (let i = 0; i < 14; i++) {
      queueJob(ws, i * (1200 / 14), function () {
        const list = listOf(scene);
        let sx = 40 + Math.random() * 370;
        let best = null;
        for (let j = 0; j < list.length; j++) {
          if (alive(list[j]) && (!best || list[j].hp < best.hp)) best = list[j];
        }
        if (best) sx = Math.max(20, Math.min(430, best.x + (Math.random() - 0.5) * 40));
        const p = scene.player;
        scene.spawnPlayerBullet({
          x: sx, y: p ? p.y : 720, vx: 0, vy: -560,
          dmg: 5, color: 0xe2e8f0, w: 6, h: 16
        });
      });
    }
  }

  function superGatling(scene) {
    const ws = scene.weaponState;
    ws.frenzyT = 3.5;
  }

  function superLaser(scene) {
    const ws = scene.weaponState;
    ws.supSweepT = 1.0;
    ws.supSweepAcc = 0;
  }

  function superMissile(scene) {
    const s = resolve(curShip);
    const x = scene.player ? scene.player.x : 225;
    const y = scene.player ? scene.player.y - 20 : 700;
    for (let i = 0; i < 10; i++) {
      const ox = (i - 4.5) * 16;
      fireMissile(scene, s, x + ox, y, { dmg: 6 });
    }
  }

  function superCryo(scene) {
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      e.slowT = 2;
      e.slowFactor = 0.25;
      const isBoss = !!(e.boss || e.isBoss);
      e.stunT = Math.max(e.stunT || 0, isBoss ? 0.9 : 2);
      scene.dealDamage(e, 10);
    }
    const ring = scene.add.circle(scene.W / 2, scene.H / 2, 30, 0xffffff, 0.55).setDepth(90);
    scene.tweens.add({
      targets: ring,
      scale: 14,
      alpha: 0,
      duration: 520,
      onComplete: function () { ring.destroy(); }
    });
  }

  function superTesla(scene) {
    const p = scene.player;
    let px = p ? p.x : 225;
    let py = p ? p.y : 700;
    let target = scene.nearestEnemy(px, py, 9000);
    const hitList = [];
    let hops = 0;
    while (target && hops < 7) {
      lightningFx(scene, px, py, target.x, target.y, CHAIN_COLOR, 4);
      scene.dealDamage(target, 12);
      hitList.push(target);
      px = target.x;
      py = target.y;
      hops++;
      let next = null;
      let best = Infinity;
      const list = listOf(scene);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!alive(e) || hitList.indexOf(e) !== -1) continue;
        const d = dist(e.x, e.y, px, py);
        if (d <= 260 && d < best) {
          best = d;
          next = e;
        }
      }
      target = next;
    }
  }

  function superSniper(scene) {
    const list = listOf(scene);
    const nonBoss = [];
    let boss = null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      if (e.boss || e.isBoss) boss = e;
      else nonBoss.push(e);
    }
    nonBoss.sort(function (a, b) { return a.hp - b.hp; });
    const x = scene.player ? scene.player.x : 225;
    const y = scene.player ? scene.player.y - 20 : 700;
    for (let i = 0; i < 2 && i < nonBoss.length; i++) {
      const t = nonBoss[i];
      scene.dealDamage(t, 99999);
      snipeFx(scene, x, y, t.x, t.y, true);
      reticleFx(scene, t.x, t.y, 30);
    }
    if (boss) {
      scene.dealDamage(boss, 120, { ignoreArmor: true });
      snipeFx(scene, x, y, boss.x, boss.y, true);
      reticleFx(scene, boss.x, boss.y, 30);
    }
  }

  function superVenom(scene) {
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!alive(e)) continue;
      e.poisonT = Math.max(e.poisonT || 0, 4);
      e.poisonDps = 8;
      try {
        e.setTint(0xa3e635);
        scene.time.delayedCall(400, function () {
          if (e.active !== false) e.clearTint();
        });
      } catch (err) {}
    }
  }

  function superAmp(scene) {
    const ws = scene.weaponState;
    ws.frenzyT = 4;
    ws.ampSuperT = 4;
    ws.selfBuffT = 4;
    ws.dmgBuff = 2;
    const ring = scene.add.circle(scene.player ? scene.player.x : 225, scene.player ? scene.player.y : 720, 40, 0xfde047, 0.5).setDepth(90);
    scene.tweens.add({
      targets: ring,
      scale: 3.5,
      alpha: 0,
      duration: 500,
      onComplete: function () { ring.destroy(); }
    });
  }

  function superRail(scene) {
    const list = listOf(scene);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (alive(e)) scene.dealDamage(e, 15);
    }
    const p = scene.player;
    const ys = [
      (p ? p.y : 720) - 100,
      p ? p.y : 720,
      (p ? p.y : 720) + 100
    ];
    for (let i = 0; i < ys.length; i++) {
      const line = scene.add.rectangle(scene.W / 2, ys[i], scene.W || 450, 6, 0xffffff).setAlpha(0.95).setDepth(90);
      scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 280,
        onComplete: function () { line.destroy(); }
      });
    }
    if (scene.cameras && scene.cameras.main) scene.cameras.main.shake(160, 0.008);
  }

  function execSuper(scene, shipId, spec) {
    if (shipId) curShip = shipId;
    if (spec === 'A' || spec === 'B') curSpec = spec;
    if (!scene) return null;
    curScene = scene;
    if (!scene.weaponState) scene.weaponState = {};
    const s = applyRunUpgrades(scene, resolve(shipId || curShip));
    const kind = s.kind;
    let name = null;
    const ship = findShip(shipId || curShip);
    if (ship && ship.super && ship.super.name) name = ship.super.name;
    else if (DEFAULTS[shipId] || (ship && ship.kind)) name = SUPER_NAMES[kind] || null;
    else name = SUPER_NAMES[kind] || null;
    switch (kind) {
      case 'cannon': superCannon(scene); break;
      case 'gatling': superGatling(scene); break;
      case 'beam': superLaser(scene); break;
      case 'missile': superMissile(scene); break;
      case 'slow': superCryo(scene); break;
      case 'chain': superTesla(scene); break;
      case 'snipe': superSniper(scene); break;
      case 'dot': superVenom(scene); break;
      case 'amp': superAmp(scene); break;
      case 'pierce': superRail(scene); break;
      default: return null;
    }
    return name;
  }

  return {
    fireDelay: fireDelay,
    fire: fire,
    update: update,
    reset: reset,
    setShip: setShip,
    setTier: setTier,
    getSpec: getSpec,
    modifyDamage: modifyDamage,
    super: execSuper
  };
})();
