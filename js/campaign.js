'use strict';

const GameCampaign = (function () {
  function pickType(mix) {
    if (!mix || !mix.length) return null;
    let total = 0;
    for (let i = 0; i < mix.length; i++) total += mix[i].weight || 0;
    if (total <= 0) return mix[mix.length - 1].type;
    let r = Math.random() * total;
    for (let i = 0; i < mix.length; i++) {
      r -= mix[i].weight || 0;
      if (r <= 0) return mix[i].type;
    }
    return mix[mix.length - 1].type;
  }

  function gapOf(def) {
    return (typeof def.gap === 'number' && def.gap > 0) ? def.gap : 1;
  }

  function spawnOne(scene) {
    const camp = scene.camp;
    const def = camp.def;
    const type = pickType(def.mix);
    if (!type) return;
    camp.spawned++;
    GameEnemies.spawn(scene, type, 30 + Math.random() * 390, -30, { speedMul: def.speed || 1 });
  }

  function bossLabel(def) {
    const b = def.boss;
    if (typeof HDATA !== 'undefined' && HDATA.ENEMIES && typeof b === 'string' && HDATA.ENEMIES[b] && HDATA.ENEMIES[b].label) {
      return HDATA.ENEMIES[b].label;
    }
    if (typeof b === 'string' && b) return b;
    if (b && typeof b === 'object' && b.name) return b.name;
    return 'CHEFE';
  }

  return {
    begin: function (scene, c, p) {
      if (typeof HDATA === 'undefined' || !HDATA.CAMPAIGNS || !HDATA.CAMPAIGNS[c] || !HDATA.CAMPAIGNS[c].phases[p]) {
        scene.camp = null;
        return null;
      }
      const def = HDATA.CAMPAIGNS[c].phases[p];
      scene.camp = {
        c: c,
        p: p,
        def: def,
        t: 0,
        kills: 0,
        spawned: 0,
        spawnT: 1.0,
        quota: (def.kill || 0),
        bossSpawned: false,
        bossAlive: false,
        won: false,
        lost: false,
        totalPlanned: 0
      };
      if (def.obj === 'kill') scene.camp.totalPlanned = scene.camp.quota * 1.6;
      if (typeof SND !== 'undefined' && SND && typeof SND.play === 'function') SND.play('phaseStart');
      return scene.camp;
    },

    update: function (scene, dt) {
      const camp = scene.camp;
      if (!camp || camp.won) return;
      const def = camp.def;
      camp.t += dt;
      const gap = gapOf(def);

      if (def.obj === 'kill') {
        while (camp.kills < camp.quota && camp.t >= camp.spawnT) {
          let alive = 0;
          try { alive = scene.enemies ? scene.enemies.countActive(true) : 0; } catch (e) { alive = 0; }
          if (alive >= 14) {
            camp.spawnT = camp.t + gap;
            break;
          }
          spawnOne(scene);
          camp.spawnT += gap;
        }
        if (camp.kills >= camp.quota) camp.won = true;
        return;
      }

      if (def.obj === 'survive') {
        const dur = def.dur || 0;
        while (camp.t < dur && camp.t >= camp.spawnT) {
          spawnOne(scene);
          camp.spawnT += gap;
        }
        if (camp.t >= dur && !camp.bossAlive) camp.won = true;
        return;
      }

      if (def.obj === 'boss') {
        const delay = (typeof def.bossDelay === 'number') ? def.bossDelay : 2.5;
        if (!camp.bossSpawned && camp.t >= delay) {
          camp.bossSpawned = true;
          camp.bossAlive = true;
          scene.startBoss(def.boss, def.bossMul || 1);
        }
        if (def.mix && def.mix.length) {
          const trickle = gap * 3;
          while (camp.t >= camp.spawnT) {
            spawnOne(scene);
            camp.spawnT += trickle;
          }
        }
      }
    },

    progressInfo: function (scene) {
      const camp = scene.camp;
      const def = camp.def;
      let obj;
      if (def.obj === 'kill') obj = 'DESTRUA: ' + camp.quota;
      else if (def.obj === 'survive') obj = 'SOBREVIVA: ' + Math.ceil(Math.max(0, (def.dur || 0) - camp.t)) + 's';
      else obj = bossLabel(def);
      return {
        obj: obj,
        kills: camp.kills,
        quota: camp.quota,
        t: camp.t,
        dur: def.dur,
        bossAlive: camp.bossAlive,
        boss: def.boss || null
      };
    }
  };
})();
