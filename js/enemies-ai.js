'use strict';
const GameEnemies = (function () {
  const FALLBACK = {
    drone:    { label: 'Enxame Alienígena', col: '#f97316', shape: 'tri', hp: 3, r: 9, spd: 70, pts: 10, shootEvery: 2.4, armor: 0 },
    runner:   { label: 'Caçador Alienígena', col: '#fbbf24', shape: 'dart', hp: 2, r: 8, spd: 140, pts: 15, shootEvery: null },
    tank:     { label: 'Cruzador Hivemind', col: '#94a3b8', shape: 'square', hp: 15, r: 13, spd: 45, pts: 40, shootEvery: 2.5, armor: 1 },
    swarm:    { label: 'Parasita do Vazio', col: '#fb923c', shape: 'dot', hp: 1, r: 6, spd: 95, pts: 5, shootEvery: null },
    healer:   { label: 'Matriarca Curandeira', col: '#34d399', shape: 'cross', hp: 6, r: 11, spd: 55, pts: 35, shootEvery: null, heals: true },
    phase:    { label: 'Espectro do Vazio', col: '#38bdf8', shape: 'ring', hp: 5, r: 10, spd: 75, pts: 30, shootEvery: 1.9, stealth: true },
    bomber:   { label: 'Bombardeiro de Plasma', col: '#f43f5e', shape: 'diamond', hp: 4, r: 10, spd: 90, pts: 25, shootEvery: null, accel: true },
    shielded: { label: 'Guardião de Carapaça', col: '#60a5fa', shape: 'shield', hp: 8, shield: 7, r: 12, spd: 55, pts: 40, shootEvery: 2.2 },
    splitter: { label: 'Replicante Quântico', col: '#fde047', shape: 'split', hp: 5, r: 11, spd: 65, pts: 30, shootEvery: null, splits: true },
    colossus: { label: 'Leviatã Biotitan', col: '#64748b', shape: 'jugg', hp: 48, r: 18, spd: 35, pts: 150, shootEvery: 2.0, armor: 2 },
    mini:     { label: 'Fragmento Alienígena', col: '#fde047', shape: 'dot', hp: 1, r: 6, spd: 120, pts: 3, shootEvery: null },
    wasp:     { label: 'Vespa Cortadora', col: '#facc15', shape: 'dart', hp: 4, r: 9, spd: 110, pts: 12, shootEvery: 1.8 },
    boss1:    { label: 'Nave-Mãe Alfa', col: '#f43f5e', shape: 'boss', hp: 150, shield: 33, r: 22, spd: 38, pts: 600, shootEvery: null, armor: 2, isBoss: true },
    boss2:    { label: 'Titan Hivemind Hélios', col: '#fb923c', shape: 'boss', hp: 267, shield: 67, r: 24, spd: 34, pts: 900, shootEvery: null, armor: 2, isBoss: true },
    boss3:    { label: 'Devorador de Mundos', col: '#22d3ee', shape: 'boss', hp: 417, shield: 117, r: 26, spd: 30, pts: 1400, shootEvery: null, armor: 2, isBoss: true },
    fleet:    { label: 'FROTA SUPREMA HIVEMIND', col: '#a3e635', shape: 'boss', hp: 660, shield: 208, r: 31, spd: 28, pts: 2500, shootEvery: null, armor: 2, isBoss: true, isFleet: true }
  };
  const CADENCE = { boss1: 3.2, boss2: 2.8, boss3: 2.4, fleet: 2.0 };

  function defOf(typeId) {
    try {
      if (typeof HDATA !== 'undefined' && HDATA && HDATA.ENEMIES && HDATA.ENEMIES[typeId]) return HDATA.ENEMIES[typeId];
    } catch (err) {}
    return FALLBACK[typeId] || FALLBACK.drone;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function slowF(e) {
    if (!(e.slowT > 0)) return 1;
    return e.slowFactor != null ? e.slowFactor : 0.5;
  }

  function colOf(e) {
    return (e.def && e.def.col) || '#fbbf24';
  }

  function fireAimed(scene, e, off, speed, color) {
    const p = scene.player;
    if (!p) return;
    const a = Math.atan2(p.y - e.y, p.x - e.x) + (off || 0);
    const sp = speed || 140;
    scene.spawnEnemyBullet({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: color });
  }

  function tick(e, dt) {
    if (!e.shootEvery) return false;
    e.shootT -= dt;
    if (e.shootT > 0) return false;
    e.shootT = e.shootEvery;
    return true;
  }

  function drift(e, base, minX, maxX, dt) {
    const sp = base * (e.speedMul || 1) * slowF(e);
    e.x += sp * e.driftDir * dt;
    if (e.x < minX) {
      e.x = minX;
      e.driftDir = 1;
    } else if (e.x > maxX) {
      e.x = maxX;
      e.driftDir = -1;
    }
  }

  function healPulse(scene, e) {
    try {
      const arr = scene.enemies.getChildren();
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (!a || a.active === false || a.boss) continue;
        const dx = a.x - e.x;
        const dy = a.y - e.y;
        if (dx * dx + dy * dy <= 8100) a.hp = Math.min(a.maxHp, a.hp + 6);
      }
    } catch (err) {}
    try {
      const fx = scene.add.circle(e.x, e.y, 10, 0x34d399, 0.5);
      scene.tweens.add({ targets: fx, scale: 3, alpha: 0, duration: 300, onComplete: function () { fx.destroy(); } });
    } catch (err) {}
  }

  function bomberBlast(scene, e) {
    try {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        scene.spawnEnemyBullet({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, color: '#f43f5e' });
      }
    } catch (err) {}
    try {
      const fx = scene.add.circle(e.x, e.y, 16, 0xffffff, 0.9);
      scene.tweens.add({ targets: fx, scale: 3, alpha: 0, duration: 250, onComplete: function () { fx.destroy(); } });
    } catch (err) {}
    try { scene.cameras.main.shake(80, 0.005); } catch (err) {}
  }

  function flicker(scene, e) {
    try {
      e.setTintFill(0xffffff);
      scene.time.delayedCall(90, function () { if (e.active) e.clearTint(); });
    } catch (err) {}
  }

  function removeEnemy(e) {
    try { if (typeof e.disableBody === 'function') e.disableBody(true, true); } catch (err) {}
    try { e.destroy(); } catch (err) {}
  }

  function die(scene, e) {
    if (e.counted) return false;
    e.hp = 0;
    if (e.type === 'bomber') bomberBlast(scene, e);
    if (e.type === 'splitter') {
      spawn(scene, 'mini', e.x - 10, e.y, { speedMul: 1.2 });
      spawn(scene, 'mini', e.x + 10, e.y, { speedMul: 1.2 });
    }
    removeEnemy(e);
    if (scene.onEnemyKilled) scene.onEnemyKilled(e, !!e.boss);
    e.counted = true;
    return true;
  }

  function spreadPoison(scene, e) {
    try {
      const r = e.poisonSpreadRadius || 0;
      const r2 = r * r;
      const arr = scene.enemies.getChildren();
      const cands = [];
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (!a || a.active === false || a === e || a.boss || !(a.hp > 0)) continue;
        const dx = a.x - e.x;
        const dy = a.y - e.y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) cands.push({ e: a, d: d2 });
      }
      cands.sort(function (p, q) { return p.d - q.d; });
      const n = Math.min(e.poisonSpread, cands.length);
      for (let i = 0; i < n; i++) {
        const a = cands[i].e;
        a.poisonT = Math.max(a.poisonT || 0, 3);
        a.poisonDps = e.poisonDps || 6;
        a.poisonSpread = 0;
        a.poisonSpreadRadius = e.poisonSpreadRadius;
      }
    } catch (err) {}
  }

  function tickDeath(scene, e) {
    if (e.counted) return false;
    if (e._poisonDeath && e.poisonSpread > 0) spreadPoison(scene, e);
    return die(scene, e);
  }

  function enrage(scene, e) {
    e.enraged = true;
    e.speedMul = (e.speedMul || 1) * (e.boss ? 1.35 : 1.3);
    try {
      if (e.boss) {
        scene.banner('FASE DE FÚRIA', 1500);
        flicker(scene, e);
      } else {
        scene.banner('COLOSSUS EM FÚRIA', 1200);
      }
    } catch (err) {}
  }

  function cadenceOf(e) {
    let c = CADENCE[e.type] || 2.4;
    if (e.enraged) c /= 1.35;
    return c;
  }

  function setupCommon(e, typeId, x, y, opts, def) {
    try {
      if (e.body) {
        e.body.setAllowGravity(false);
        e.body.setVelocity(0, 0);
        if (e.body.setImmovable) e.body.setImmovable(true);
      }
    } catch (err) {}
    e.type = typeId;
    e.typeId = typeId;
    e.def = def;
    e.label = def.label;
    e.col = def.col;
    e.hp = def.hp;
    e.maxHp = def.hp;
    e.shield = def.shield || 0;
    e.maxShield = def.shield || 0;
    e.pts = def.pts;
    e.armor = def.armor || 0;
    e.shootEvery = def.shootEvery || 0;
    e.shootT = e.shootEvery ? Math.random() * e.shootEvery : 0;
    e.slowT = 0;
    e.poisonT = 0;
    e.poisonDps = 0;
    e.physTake = false;
    e.stunT = 0;
    e.burnT = 0;
    e.burnDps = 0;
    e.markT = 0;
    e.markMul = 0;
    e._flashT = 0;
    e._stunTint = false;
    e._poisonDeath = false;
    e._burnDeath = false;
    e.stealth = !!def.stealth;
    e.visibleNow = true;
    e.enraged = false;
    e.boss = false;
    e.speedMul = opts.speedMul || 1;
    e.spawnX = x;
    e.seed = Math.random() * 6.28;
    e.t = 0;
    e.vx = 0;
    e.driftDir = Math.random() < 0.5 ? -1 : 1;
    e.counted = false;
    return e;
  }

  function spawn(scene, typeId, x, y, opts) {
    opts = opts || {};
    const def = defOf(typeId);
    let e = null;
    try { e = scene.enemies.create(x, y, 'en_' + typeId); } catch (err) { e = null; }
    if (!e) return null;
    setupCommon(e, typeId, x, y, opts, def);
    if (typeId === 'swarm') {
      e.vx = e.driftDir * 50 * e.speedMul;
      e.swarmT = 1;
    }
    if (typeId === 'healer') e.healT = 0.6;
    if (typeId === 'phase') {
      e.phaseT = 1.8;
      e.setAlpha(1);
    }
    return e;
  }

  function spawnBoss(scene, bossId, opts) {
    opts = opts || {};
    const def = defOf(bossId);
    let e = null;
    try { e = scene.enemies.create(225, -80, 'en_' + bossId); } catch (err) { e = null; }
    if (!e) return null;
    setupCommon(e, bossId, 225, -80, opts, def);
    const mul = opts.bossMul || 1;
    e.maxHp = def.hp * mul;
    e.hp = e.maxHp;
    e.boss = true;
    e.bossArrived = false;
    e.pattern = 0;
    e.patternT = 1.0;
    e.rainT = 0;
    e.rainFireT = 0;
    e.swayPhase = 0;
    try {
      if (e.width && e.width < 120 && e.setDisplaySize) e.setDisplaySize(120, Math.round((e.height || e.width) * 120 / e.width));
    } catch (err) {}
    return e;
  }

  function updateNormal(scene, e, spd, dt) {
    const col = colOf(e);
    switch (e.type) {
      case 'drone': {
        e.y += spd * dt;
        e.x = e.spawnX + Math.sin(e.t * 2 + e.seed) * 30;
        if (tick(e, dt)) fireAimed(scene, e, 0, 140, col);
        break;
      }
      case 'runner': {
        e.y += spd * dt;
        break;
      }
      case 'tank': {
        if (e.y < 120) e.y = Math.min(120, e.y + spd * dt);
        else drift(e, 25, 40, 410, dt);
        if (tick(e, dt)) {
          fireAimed(scene, e, -0.25, 140, col);
          fireAimed(scene, e, 0, 140, col);
          fireAimed(scene, e, 0.25, 140, col);
        }
        break;
      }
      case 'swarm': {
        e.y += spd * dt;
        e.swarmT -= dt;
        if (e.swarmT <= 0) {
          e.swarmT = 1;
          e.vx = -e.vx;
        }
        e.x += e.vx * dt * slowF(e);
        break;
      }
      case 'healer': {
        if (e.y < 140) e.y = Math.min(140, e.y + spd * dt);
        else drift(e, 25, 40, 410, dt);
        e.healT -= dt;
        if (e.healT <= 0) {
          e.healT = 0.6;
          healPulse(scene, e);
        }
        break;
      }
      case 'phase': {
        e.phaseT -= dt;
        if (e.phaseT <= 0) {
          if (e.visibleNow) {
            e.visibleNow = false;
            e.setAlpha(0.25);
            e.phaseT = 0.7;
          } else {
            e.visibleNow = true;
            e.setAlpha(1);
            e.phaseT = 1.8;
          }
        }
        e.y += spd * dt;
        if (e.visibleNow && tick(e, dt)) fireAimed(scene, e, 0, 140, col);
        break;
      }
      case 'bomber': {
        const p = scene.player;
        if (p) {
          e.vx = clamp(e.vx + (p.x - e.x) * 2 * dt, -120, 120);
          e.x += e.vx * dt;
        }
        e.y += spd * 1.5 * dt;
        break;
      }
      case 'shielded': {
        e.y += spd * dt;
        if (tick(e, dt)) fireAimed(scene, e, 0, 140, col);
        break;
      }
      case 'splitter': {
        e.y += spd * dt;
        break;
      }
      case 'colossus': {
        if (e.y < 100) e.y = Math.min(100, e.y + spd * dt);
        else drift(e, 18, 50, 400, dt);
        if (tick(e, dt)) {
          const p = scene.player;
          if (p) {
            const base = Math.atan2(p.y - e.y, p.x - e.x);
            for (let i = 0; i < 4; i++) {
              const a = base - 0.4 + i * (0.8 / 3);
              scene.spawnEnemyBullet({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, color: col });
            }
          }
        }
        break;
      }
      case 'mini': {
        e.y += spd * dt;
        break;
      }
      case 'wasp': {
        e.y += spd * dt;
        e.x = e.spawnX + Math.sin(e.t * 3.5) * 70;
        if (tick(e, dt)) fireAimed(scene, e, 0, 140, col);
        break;
      }
      default: {
        e.y += spd * dt;
        break;
      }
    }
  }

  function updateBoss(scene, e, dt) {
    if (!e.bossArrived) {
      e.y += 100 * dt;
      if (e.y >= 130) {
        e.y = 130;
        e.bossArrived = true;
      }
      return;
    }
    e.swayPhase += dt * 0.6 * (e.speedMul || 1);
    e.x = 225 + Math.sin(e.swayPhase) * 110;
    const col = colOf(e);
    if (e.rainT > 0) {
      e.rainT -= dt;
      e.rainFireT -= dt;
      if (e.rainFireT <= 0) {
        e.rainFireT = 0.12;
        scene.spawnEnemyBullet({ x: 30 + Math.random() * 390, y: e.y + 30, vx: 0, vy: 160, color: col });
      }
      if (e.rainT <= 0) {
        e.pattern = 1;
        e.patternT = cadenceOf(e);
      }
      return;
    }
    e.patternT -= dt;
    if (e.patternT > 0) return;
    if (e.pattern === 0) {
      e.rainT = 0.9;
      e.rainFireT = 0;
      return;
    }
    if (e.pattern === 1) {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        scene.spawnEnemyBullet({ x: e.x, y: e.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, color: col });
      }
      e.pattern = 2;
      e.patternT = cadenceOf(e);
      return;
    }
    fireAimed(scene, e, -0.22, 170, col);
    fireAimed(scene, e, 0, 170, col);
    fireAimed(scene, e, 0.22, 170, col);
    e.pattern = 0;
    e.patternT = cadenceOf(e);
  }
  function update(scene, e, dt) {
    if (!e || e.active === false) return;
    if (!(dt > 0)) dt = 0;
    e.t += dt;
    const wasSlow = e.slowT > 0;
    e.slowT = Math.max(0, (e.slowT || 0) - dt);
    if (wasSlow && !(e.slowT > 0)) {
      e.slowFactor = 1;
      e.physTake = false;
    }
    if (e.poisonT > 0) {
      e.hp -= (e.poisonDps || 0) * dt;
      e.poisonT = Math.max(0, e.poisonT - dt);
      if (e.hp <= 0) {
        e._poisonDeath = true;
        tickDeath(scene, e);
        return;
      }
    }
    if (e.burnT > 0) {
      e.hp -= (e.burnDps || 4) * dt;
      e.burnT = Math.max(0, e.burnT - dt);
      if (e.hp <= 0) {
        e._burnDeath = true;
        tickDeath(scene, e);
        return;
      }
    }
    if (e.markT > 0) e.markT = Math.max(0, e.markT - dt);
    if (e.stunT > 0) e.stunT = Math.max(0, e.stunT - dt);
    if (e._flashT > 0) e._flashT = Math.max(0, e._flashT - dt * 1000);
    if (!e.boss) {
      if (e.stunT > 0.3 && !e._flashT) {
        e.setTint(0xfff2a0);
        e._stunTint = true;
      } else if (!(e.stunT > 0) && e._stunTint && !e._flashT) {
        e.clearTint();
        e._stunTint = false;
      }
    }
    if (!e.enraged && e.maxHp > 0 && e.hp < e.maxHp * 0.5 && (e.boss || e.type === 'colossus')) enrage(scene, e);
    if (e.stunT > 0) return;
    const def = e.def || defOf(e.type);
    const spd = (def.spd || 60) * (e.speedMul || 1) * slowF(e);
    if (e.boss) {
      updateBoss(scene, e, dt);
      return;
    }
    updateNormal(scene, e, spd, dt);
    if (e.y > 840) removeEnemy(e);
  }

  function applyDamage(scene, e, dmg, opts) {
    opts = opts || {};
    if (!e || e.active === false) return { died: false };
    if (e.stealth && !e.visibleNow && !e.boss) return { died: false, phased: true };
    dmg = dmg || 0;
    if (e.markT > 0 && e.markMul) dmg = dmg * e.markMul;
    if (opts.execute != null && !e.boss && e.maxHp > 0 && e.hp / e.maxHp <= opts.execute) dmg = Math.max(dmg, e.hp);
    if (e.physTake && e.slowT > 0) dmg = dmg * (e.physTakeMul != null ? e.physTakeMul : 1.4);
    const eff = opts.ignoreArmor ? Math.max(1, dmg) : Math.max(1, dmg - (e.armor || 0));
    if (e.shield > 0) {
      e.shield -= eff;
      if (e.shield < 0) {
        e.hp += e.shield;
        e.shield = 0;
      }
    } else {
      e.hp -= eff;
    }
    if (e.hp > 0) {
      if (!e.boss) {
        try {
          e.setTintFill(0xffffff);
          e._flashT = 60;
          scene.time.delayedCall(60, function () { e._flashT = 0; if (e.active) e.clearTint(); });
        } catch (err) {}
      }
      return { died: false };
    }
    const wasBoss = !!e.boss;
    if (!die(scene, e)) return { died: false };
    return { died: true, wasBoss: wasBoss };
  }

  return {
    spawn: spawn,
    spawnBoss: spawnBoss,
    update: update,
    applyDamage: applyDamage
  };
})();
