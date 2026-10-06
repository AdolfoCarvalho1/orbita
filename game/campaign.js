import { HDATA } from './game-data.js';
import { GameEnemies } from './enemies-ai.js';
import { SND } from './game-audio.js';

'use strict';

export const GameCampaign = (function () {
  const ACTS = [
    { id: 'opening', name: 'COMEÇO', banner: 'COMEÇO DA FASE · CONTATO INICIAL' },
    { id: 'middle', name: 'MEIO', banner: 'MEIO DA FASE · REFORÇOS INIMIGOS' },
    { id: 'final', name: 'FINAL', banner: 'FINAL DA FASE · ÚLTIMA FORMAÇÃO' }
  ];

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickType(mix, random) {
    if (!mix || !mix.length) return null;
    let total = 0;
    for (let i = 0; i < mix.length; i++) total += mix[i].weight || 0;
    if (total <= 0) return mix[mix.length - 1].type;
    let r = (random ? random() : Math.random()) * total;
    for (let i = 0; i < mix.length; i++) {
      r -= mix[i].weight || 0;
      if (r <= 0) return mix[i].type;
    }
    return mix[mix.length - 1].type;
  }

  function gapOf(def) {
    return (typeof def.gap === 'number' && def.gap > 0) ? def.gap : 1;
  }

  function activeEnemies(scene) {
    try { return scene.enemies ? scene.enemies.countActive(true) : 0; }
    catch (e) { return 0; }
  }

  function spawnOne(scene, speedMul) {
    const camp = scene.camp;
    const type = pickType(camp.def.mix, camp.random);
    if (!type) return false;
    camp.spawned++;
    const progress = camp.duration > 0 ? camp.t / camp.duration : 0;
    const x = camp.map && camp.map.spawnX
      ? camp.map.spawnX(progress, camp.spawned - 1, camp.random)
      : 30 + camp.random() * 390;
    GameEnemies.spawn(scene, type, x, -30, {
      speedMul: (camp.def.speed || 1) * (speedMul || 1)
    });
    return true;
  }

  function bossLabel(def) {
    const b = def.boss;
    if (HDATA && HDATA.ENEMIES && typeof b === 'string' && HDATA.ENEMIES[b] && HDATA.ENEMIES[b].label) {
      return HDATA.ENEMIES[b].label;
    }
    if (typeof b === 'string' && b) return b;
    if (b && typeof b === 'object' && b.name) return b.name;
    return 'CHEFE';
  }

  function actFor(progress) {
    return progress < 0.3 ? ACTS[0] : progress < 0.7 ? ACTS[1] : ACTS[2];
  }

  function showAct(scene, camp, act) {
    if (camp.act === act.id) return;
    camp.act = act.id;
    if (typeof scene.banner === 'function') scene.banner(act.banner, 1250);
  }

  return {
    begin: function (scene, c, p) {
      if (!HDATA || !HDATA.CAMPAIGNS || !HDATA.CAMPAIGNS[c] || !HDATA.CAMPAIGNS[c].phases[p]) {
        scene.camp = null;
        return null;
      }
      const def = HDATA.CAMPAIGNS[c].phases[p];
      const duration = Math.max(8, def.dur || 20);
      const finaleAt = Math.max(4, duration * 0.7);
      const waveEnd = def.obj === 'boss' ? finaleAt : duration;
      const waveCount = Math.max(14, Math.min(28, Math.round(waveEnd / gapOf(def))));
      const runSeed = Number(scene.run && scene.run.mapSeed) || 1;
      const random = seededRandom(runSeed ^ Math.imul(c + 1, 0x45d9f3b) ^ Math.imul(p + 1, 0x119de1f3));
      scene.camp = {
        c: c,
        p: p,
        def: def,
        t: 0,
        kills: 0,
        spawned: 0,
        spawnT: 1.25,
        bossSpawned: false,
        bossAlive: false,
        won: false,
        lost: false,
        act: null,
        finaleAt: finaleAt,
        duration: duration,
        waveCount: waveCount,
        map: scene.proceduralMap || null,
        random: random
      };
      if (SND && typeof SND.play === 'function') SND.play('phaseStart');
      return scene.camp;
    },

    update: function (scene, dt) {
      const camp = scene.camp;
      if (!camp || camp.won) return;
      const def = camp.def;
      camp.t += dt;
      const progress = Math.min(1, camp.t / camp.duration);
      const act = actFor(progress);
      showAct(scene, camp, act);

      const isBossPhase = def.obj === 'boss';
      const waveEnd = isBossPhase ? camp.finaleAt : camp.duration;
      const waveWindow = Math.max(1, waveEnd - 1.25);
      const baseInterval = waveWindow / Math.max(1, camp.waveCount - 1);
      const gap = baseInterval * (act.id === 'middle' ? 0.94 : act.id === 'final' ? 0.88 : 1);
      const speedMul = act.id === 'middle' ? 1.08 : act.id === 'final' ? 1.18 : 1;

      while (camp.spawned < camp.waveCount && camp.t < waveEnd && camp.t >= camp.spawnT) {
        if (activeEnemies(scene) >= 14) {
          camp.spawnT = camp.t + Math.min(0.35, gap);
          break;
        }
        spawnOne(scene, speedMul);
        camp.spawnT += gap;
      }

      if (isBossPhase) {
        if (!camp.bossSpawned && camp.t >= camp.finaleAt) {
          camp.bossSpawned = true;
          camp.bossAlive = true;
          if (typeof scene.startBoss === 'function') scene.startBoss(def.boss, def.bossMul || 1);
          if (typeof scene.banner === 'function') scene.banner('FINAL DA FASE · ' + bossLabel(def), 1700);
          camp.nextEscort = camp.t + Math.max(1.25, gapOf(def) * 3);
        }
        if (camp.bossAlive && def.mix && def.mix.length && camp.t >= camp.nextEscort) {
          if (activeEnemies(scene) < 14) spawnOne(scene, 1.12);
          camp.nextEscort = camp.t + Math.max(1.25, gapOf(def) * 3);
        }
        return;
      }

      if (camp.t >= camp.duration && activeEnemies(scene) === 0) camp.won = true;
    },

    progressInfo: function (scene) {
      const camp = scene.camp;
      if (!camp) return null;
      const progress = Math.min(1, camp.t / camp.duration);
      const act = actFor(progress);
      const objectives = {
        opening: 'Contato inicial · a formação se aproxima',
        middle: 'Meio da fase · reforços inimigos',
        final: camp.def.obj === 'boss' ? 'Confronto final · chefe detectado' : 'Final da fase · limpe o setor'
      };
      return {
        act: act.id,
        actName: act.name,
        phaseName: camp.def.name,
        obj: objectives[act.id],
        progress: progress,
        t: camp.t,
        dur: camp.duration,
        bossAlive: camp.bossAlive,
        boss: camp.def.boss || null,
        bossName: camp.def.obj === 'boss' ? bossLabel(camp.def) : null
      };
    }
  };
})();
