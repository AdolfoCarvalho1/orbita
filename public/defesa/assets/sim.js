/* Defesa Orbital v3 - sim.js (Brief 08 A5: extracao mecanica de assets/scenes.js, nucleo headless puro: orig 4-1675 + moveTower 4491-4514) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  const D = window.DO3;
  const CELL = D.CELL_SIZE, COLS = D.COLS, ROWS = D.ROWS;
  const BW = D.BOARD_W, BH = D.BOARD_H;
  /* RANGESQ: combate em quadrados Chebyshev (1□=1 célula=44px). rng px legado mantido p/ render/projeteis. */
  function pxToSqHalf(px) { return Math.ceil((px / CELL) * 2) / 2; } // RANGESQ: 65px→1.5□
  function towerCell(t) {
    var c = (t.c != null ? t.c : Math.floor(((t.x != null ? t.x : 0)) / CELL));
    var r = (t.r != null ? t.r : Math.floor(((t.y != null ? t.y : 0)) / CELL));
    return { c: c, r: r };
  }
  function enemyCell(e) { return { c: Math.floor(((e.x != null ? e.x : 0)) / CELL), r: Math.floor(((e.y != null ? e.y : 0)) / CELL) }; }
  function chebSqCell(c1, r1, c2, r2) { return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2)); }
  function chebTowerEnemy(t, e) { var tc = towerCell(t), ec = enemyCell(e); return chebSqCell(tc.c, tc.r, ec.c, ec.r); }
  function getSupplySq(o) {
    try {
      var od = o && (o.defRef || o.def);
      if (!od) return 0;
      if (od.supplySq != null) return od.supplySq;
      if (od.id === 'station' && D.STATION_DATA && D.STATION_DATA.supplySq != null) return D.STATION_DATA.supplySq;
      if (od.id === 'support' && D.SUPPORT_DATA && D.SUPPORT_DATA.supplySq != null) return D.SUPPORT_DATA.supplySq;
      if (od.supplyRadius != null) return od.supplyRadius / CELL;
      return 0;
    } catch (_) { return 0; }
  }
  function getRngSqEff(stats) {
    try {
      if (stats && stats.rngSqEff != null) return stats.rngSqEff;
      if (stats && stats.rngSq != null) return stats.rngSq;
      if (stats && stats.rng != null) return stats.rng / CELL;
    } catch (_) {}
    return 0;
  }
  const SND = (typeof window !== 'undefined' && window.AudioSys) ||
    { ensure(){}, unlock(){}, setMuted(){}, setMode(){}, musicTick(){}, tone(){}, noiseHit(){}, shoot(){}, gatlingTick(){},
      laserStart(){}, laserStop(){}, laserStopAll(){}, explosion(){}, ui(){}, uiBack(){}, buy(){}, upgrade(){},
      error(){}, coin(){}, coinBig(){}, lifeLost(){}, leak(){}, waveStart(){}, waveClear(){}, bossAlert(){}, bossDeath(){},
      combo(){}, comboBreak(){}, mutation(){}, mutPick(){}, superFire(){}, superFireX(){}, superIon(){}, superEmp(){},
      superVortex(){}, overdriveOn(){}, superReady(){}, victory(){},
      defeat(){}, achievement(){}, star(){}, build(){}, sell(){},
      tierUp(){}, merge(){}, factory(){}, lab(){} };

  /* ================= NÚCLEO DE LÓGICA (sem Phaser — testável headless) ================= */

  function uid() { return ++STATE_SEQ; }
  let STATE_SEQ = 0;

  D.Save.load();

  function techLvl(id) { return D.Save.techLevel(id); }

  function createState(mapIdx, diffKey, endless) {
    const map = D.MAPS_DATA[mapIdx];
    const diff = D.DIFFICULTIES[diffKey] || D.DIFFICULTIES.normal;
    const routes = map.routes.map(wp => D.wpToPixels(wp));
    const lengths = routes.map(D.getPathLength);
    const airPts = [
      { x: -24, y: routes[0][0].y },
      { x: BW + 24, y: routes[0][routes[0].length - 1].y }
    ];
    const livesMax = Math.max(1, Math.round((20 + techLvl('base_hp') * 5) * diff.livesMul));
    const cdMul = 1 - techLvl('super_cd') * 0.12;
    const S = {
      id: uid(), mapIdx, map, diff, endless,
      routes, routeLengths: lengths,
      blocked: D.getPathBlockedCells(map.routes),
      airPts, airLen: Math.hypot(airPts[1].x - airPts[0].x, airPts[1].y - airPts[0].y),
      time: 0, state: 'idle', wave: 0, waveQueue: [], waveStartTime: 0,
      credits: Math.round(350 * diff.goldMul) + techLvl('start_gold') * 60,
      creditsEarned: 0, livesMax, lives: livesMax,
      enemies: [], towers: [], projectiles: [], vortices: [],
      occupied: {}, spawnCounter: 0,
      powers: {
        ion: { key: 'ion', cd: 0, maxCd: D.SUPERS.ion.maxCd * cdMul },
        emp: { key: 'emp', cd: 0, maxCd: D.SUPERS.emp.maxCd * cdMul },
        vortex: { key: 'vortex', cd: 0, maxCd: D.SUPERS.vortex.maxCd * cdMul },
        overdrive: { key: 'overdrive', cd: 0, maxCd: D.SUPERS.overdrive.maxCd * cdMul, dur: 0 }
      },
      kills: 0, leakCounts: {}, leakedFlying: false, leaks: 0,
      parts: 0, // v3 PIXEL FASE 5: recurso PEÇAS ⚙
      enemyHpLevel: 0, // v3 PIXEL FASE 5: laboratório Hivemind (por run)
      endlessHpMul: 1, autoWaveTimer: 0, autoNext: false,
      autoMove: true, // G10: toggle do auto-movimento preditivo (default true)
      showDmgNum: true, // V12-js: toggle números de dano (default true)
      activeBoss: null, hitStop: 0, result: null, chrono: 0,
      combo: 0, comboTimer: 0, comboMax: 0,
      mutBuffs: {}, mutChoices: null, pendingMut: false, mutHistory: [],
      overdriveDmg: 0,
      overdriveBuff: 0, // G-a G3: buff de cadência do super da amp (Sobrecarga Total, 6s)
      _ampVersion: 0, // Onda 2 perf: invalida cache de getTowerStats quando torres/amps mudam
      events: []
    };
    return S;
  }
  function startNewGame(mapIdx, diffKey, endless) { return createState(mapIdx, diffKey, endless); }

  function ev(S, e) { S.events.push(e); }

  // Onda 2 perf: invalida o cache de getTowerStats quando a composição/estado das torres muda
  function bumpAmpVersion(S) { if (S) S._ampVersion = (S._ampVersion || 0) + 1; }

  function hpMultiplier(S) {
    // v3 PIXEL FASE 5: laboratório Hivemind soma +12% HP por nível na run
    return (1 + S.mapIdx * 0.25 + S.wave * 0.12) * S.diff.hpMul * S.endlessHpMul * (1 + (S.enemyHpLevel || 0) * D.HIVEMIND.hpAdd);
  }

  function spawnEnemy(S, type) {
    let def = D.ENEMIES_DATA[type];
    if (!def) return null;
    // ULTRA: escolhe variação procedural da mesma família (hp/spd/shield/style)
    // Se type é variante, usa direto; se é base, sorteia entre variantes da família
    if(!def.variantOf){
      // coleta variantes da família
      const fam = [];
      for(const k in D.ENEMIES_DATA){ const v=D.ENEMIES_DATA[k]; if(v.variantOf===type || k===type) fam.push(v); }
      if(fam.length>1){
        // peso: waves altas pegam variantes mais fortes
        const tier = Math.min(fam.length-1, Math.floor(S.wave/3 + (S.endless? S.wave/9 : 0) + Math.random()*2));
        // ordena por hp
        fam.sort((a,b)=>a.hp-b.hp);
        const pick = fam[Math.min(fam.length-1, tier + Math.floor(Math.random()*2))];
        if(pick && Math.random()<0.72) def = pick;
      }
    }
    const mul = hpMultiplier(S);
    const routeIdx = S.spawnCounter++ % S.routes.length;
    const flying = !!def.flying;
    const totalLen = flying ? S.airLen : S.routeLengths[routeIdx];
    const e = {
      eid: uid(), type, type_key: type, defRef: def,
      label: def.label, col: def.col, r: def.r, shape: def.shape,
      hp: def.hp * mul, maxHp: def.hp * mul,
      shield: (def.shield || 0) * mul, maxShield: (def.shield || 0) * mul,
      dist: 0, totalLen, progress: 0, routeIdx, flying,
      x: -30, y: flying ? S.airPts[0].y : S.routes[routeIdx][0].y,
      dirAngle: 0, speed: def.spd, armor: def.armor || 0,
      slowTimer: 0, slowFactor: 1, stunTimer: 0, cryoVuln: 0,
      poisonTimer: 0, poisonDps: 0, poisonBy: null,
      burnTimer: 0, burnDps: 0, markedTimer: 0,
      healCooldown: 0, stealthPhase: 0, raged: false,
      flash: 0, dead: false, leaked: false
    };
    S.enemies.push(e);
    if (def.isBoss) {
      S.activeBoss = e;
      ev(S, { t: 'bossSpawn', name: def.label });
      SND.bossAlert();
    } else {
      ev(S, { t: 'spawnFx', x: e.x, y: e.y, flying });
    }
    return e;
  }

  function canHitAir(tower) {
    const def = tower.defRef || tower.def;
    if (!def) return false;
    if (def.kind === 'factory' || def.kind === 'station' || def.kind === 'support') return false; // F2-sim: prédios não atiram
    if (def.kind === 'buff') return false; // amp é suporte, não atira
    // G-a G6: matriz anti-aérea por kind (base = D.AIR_KINDS sem buff).
    // beam/chain/snipe/slow/dot sempre atingem ar; bullet/splash/pierce só em casos especiais.
    const AA = (D.AIR_KINDS || []).filter(k => k !== 'buff' && k !== 'factory');
    if (AA.indexOf(def.kind) >= 0) return true;
    // cannon specB (Flak Quádrupla) libera AA
    if (def.id === 'cannon' && tower.specBranch === 'B') return true;
    // missile specA (Enxame de Micro-Mísseis) ou T4+ (Mira Dupla: sempre alcança voadores)
    if (def.id === 'missile') {
      if (tower.specBranch === 'A') return true;
      if (D.getTier && D.getTier(tower.level) >= 4) return true;
      return false;
    }
    // rail nv≥4 atinge voadores (design: "Nv4+ atinge voadores")
    if (def.id === 'rail' || def.kind === 'pierce') return (tower.level || 1) >= 4;
    // splash terrestre e bullet comum NÃO atingem voador
    return false;
  }

  // G-a G4: venom com praga (specA Contagiosa, T3+ base ou skill nv12+) espalha o DoT ao matar
  function towerHasPlague(t) {
    if (!t) return false;
    const d = t.defRef || t.def;
    if (!d || d.id !== 'venom') return false;
    if (t.specBranch === 'A' && d.specA && d.specA.plague) return true;
    if (D.getTier && D.getTier(t.level) >= 3) return true; // TIER_LOGIC.venom[3].eff.plagueBase
    if ((t.level || 1) >= 12) return true; // skill nv12 Contágio
    return false;
  }

  // G-a G6: amp specB (Radar de Varredura, reveal:true) revela phase stealth p/ torres no anel
  // RANGESQ: anel do amp em quadrados Chebyshev (rngSq 3□ + 10px/nv → /CELL).
  function towerHasReveal(S, t) {
    if (!S || !t) return false;
    for (const other of S.towers) {
      const od = other.defRef || other.def;
      if (!od || od.id !== 'amp' || other === t) continue;
      if (other.specBranch !== 'B') continue;
      if (!(od.specB && od.specB.reveal)) continue;
      const odTier = D.getTier ? D.getTier(other.level) : 1;
      const odBaseSq = (od.rngSq != null ? od.rngSq : (od.rng != null ? od.rng / CELL : 0));
      const odRngSq = (odBaseSq + (other.level - 1) * 10 / CELL) * ((D.TIER_LOGIC.amp[odTier] && D.TIER_LOGIC.amp[odTier].eff.ringMul) || 1);
      if (chebTowerEnemy(other, t) <= odRngSq + 1e-9) return true;
    }
    return false;
  }

  function getTowerStats(S, t) {
    const def = t.defRef || t.def;
    // F2-sim: prédios não têm stats de combate — retorna dummy sem quebrar
    if (!def || isF2BuildingKind(def.kind)) {
      return { dmg: 0, rng: 0, rngSq: 0, rngSqEff: 0, rate: 0, splash: 0, splashSq: 0, canHitAir: false, pierceBonus: 0, critBonus: 0, shieldBonus: 0, multiBonus: 0, stunBonus: 0, chainBonus: 0, dotDurMul: 1 };
    }
    const lvl = t.level;
    // Onda 2 perf (4.1): cache por frame — chave cobre level/spec/comp/mutBuffs/combo/tech/
    // overdrive/versão global de amps/killStacks. Mutação direta de qualquer um desses campos
    // invalida por comparação de chave (sem depender de dirty flags externas).
    var _comp = t.comp || null;
    var _cacheKey = (S.id | 0) + '|' + (lvl | 0) + '|' + (t.specBranch || '') + '|' +
      (_comp ? ((_comp.w | 0) + ',' + (_comp.e | 0) + ',' + (_comp.r | 0) + ',' + (_comp.t | 0)) : '') + '|' +
      (S.mutBuffs ? JSON.stringify(S.mutBuffs) : '') + '|' + (S.combo | 0) + '|' + (S._ampVersion | 0) + '|' +
      techLvl('global_dmg') + ',' + techLvl('global_rng') + '|' +
      ((S.powers && S.powers.overdrive && S.powers.overdrive.dur > 0) ? 1 : 0) + ',' + ((S.overdriveBuff > 0) ? 1 : 0) + '|' +
      (t.killStacks | 0);
    if (t._statsCache && t._statsCache.key === _cacheKey) return t._statsCache.value;
    // 50-level balanced scaling (linear + mild expo, não explode em 1.32^49)
    let dmg = def.dmg * (1 + (lvl - 1) * 0.22) * Math.pow(1.038, lvl - 1);
    // RANGESQ: base em quadrados (contrato rngSq) + lvl em fração (3.2px/nv → /CELL). rng px legado = rngSqEff*CELL.
    var _baseSq = (def.rngSq != null ? def.rngSq : (def.rng != null ? def.rng / CELL : 0));
    let rngSq = _baseSq + (lvl - 1) * 3.2 / CELL;
    let rate = def.rate === 0 ? 0 : def.rate * (1 + (lvl - 1) * 0.018) * Math.pow(1.012, lvl - 1);

    // G8: cap +100% no bônus combinado de dano (mutação + combo)
    const _mutDmg = ((S.mutBuffs && S.mutBuffs.dmg) || 0);
    const _comboDmg = (S.combo || 0) * ((D.COMBO && D.COMBO.dmgPerStack) || 0);
    dmg *= 1 + techLvl('global_dmg') * 0.05 + Math.min(1, _mutDmg + _comboDmg);
    rngSq *= 1 + techLvl('global_rng') * 0.06 + ((S.mutBuffs && S.mutBuffs.rng) || 0);
    rate *= 1 + ((S.mutBuffs && S.mutBuffs.rate) || 0);

    const spec = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
    if (spec) {
      if (spec.dmgMul) dmg *= spec.dmgMul;
      if (spec.rngAdd) rngSq += spec.rngAdd / CELL; // RANGESQ: 30px→0.68□
      if (spec.rateMul) rate *= spec.rateMul;
    }

    // SKILLS por nave: aplica efeito acumulado a cada 4 níveis
    // G5: auditoria completa — todo eff de TOWERS_DATA[].skills tem consumo mínimo aqui.
    // Mapeamento conservador (não quebra saves): funcionais mantidos; mortos viram
    // bônus pequeno equivalente (detalhes no report-05-scenes-gb.md).
    let skillPierce = 0, skillCrit = 0, skillShield = 0, skillMulti = 0;
    let splashBonus = 0, splashMulAcc = 1, stunBonus = 0, chainBonus = 0, dotDurMul = 1;
    const skills = def.skills || [];
    for (const sk of skills) {
      if (t.level < sk.lvl || !sk.eff) continue;
      const ef = sk.eff;
      if (ef.dmgMul) dmg *= ef.dmgMul;
      if (ef.dmgMul2) dmg *= ef.dmgMul2;
      if (ef.rateMul) rate *= ef.rateMul;
      if (ef.rateMul2) rate *= ef.rateMul2;
      if (ef.rateMul3) rate *= ef.rateMul3;
      if (ef.rngMul) rngSq *= ef.rngMul;
      if (ef.rngMul2) rngSq *= ef.rngMul2;
      // G5: pierce/crit/multi só são consumidos por kind bullet — dão +dano universal junto
      if (ef.pierce) { skillPierce += ef.pierce; dmg *= 1.03; }
      if (ef.crit) { skillCrit += ef.crit; dmg *= 1.03; }
      if (ef.shield) skillShield += ef.shield;
      if (ef.multi) { skillMulti += ef.multi; dmg *= 1.03; }
      // G5: consumo mínimo dos effs antes mortos (todo ramo dá dano/rate/rng universal
      // + bônus especializado quando a kind consome; detalhe no relatório)
      if (ef.splash) { splashBonus += ef.splash; dmg *= 1.05; } // gatling Vulcão +8 área
      if (ef.splashMul) { splashMulAcc *= ef.splashMul; dmg *= 1.05; }
      if (ef.splashMul2) { splashMulAcc *= ef.splashMul2; dmg *= 1.05; }
      if (ef.cool) rate *= 1 + ef.cool; // refrigeração → cadência
      if (ef.burst) { skillMulti += Math.max(1, (ef.burst | 0) - 1); dmg *= 1.05; } // rajada → projétil extra
      if (ef.beamRamp) dmg *= 1 + (ef.beamRamp - 1) * 0.25;
      if (ef.reflect) { skillPierce += ef.reflect; dmg *= 1.05; }
      if (ef.pure) dmg *= 1 + (typeof ef.pure === 'number' ? ef.pure : 0.2) * 0.5;
      if (ef.aura) dmg *= 1.1;
      if (ef.dotMul) dmg *= ef.dotMul;
      if (typeof ef.dot === 'number') dmg *= 1.08; // hipotermia DoT → dano
      if (ef.dur && typeof ef.dur === 'number' && ef.dur !== 1) { dotDurMul *= ef.dur; dmg *= 1.03; } // virulência → duração + dano
      else if (ef.dur) dmg *= 1.05; // sincronia amp +1s → +dano (duração do super é fixa)
      if (ef.extra) { rngSq *= 1 + ef.extra * 0.05; dmg *= 1.05; } // epidemia +alvos → alcance + dano
      if (ef.acc) dmg *= 1.06;
      if (ef.overdmg) dmg *= 1 + ef.overdmg;
      if (ef.hp) dmg *= 1.05; // casco (torre sem HP) → dano
      if (ef.immunity) dmg *= 1.1;
      if (ef.ramp) dmg *= 1.1;
      if (ef.stun && typeof ef.stun === 'number') { stunBonus += ef.stun; dmg *= 1.05; }
      if (ef.stun30) { stunBonus += 0.3; dmg *= 1.05; }
      if (ef.heatDmg) dmg *= 1 + ef.heatDmg * 0.5;
      if (ef.spd) rate *= 1.05;
      if (ef.spdMul) rate *= 1 + (ef.spdMul - 1) * 0.5;
      if (ef.prism) { skillPierce += ef.prism; dmg *= 1.08; } // prisma → perfuração + dano (beam não usa pierce)
      if (ef.burn && typeof ef.burn === 'number') dmg *= 1.08; // burn de skill → dano (+fogo real via tier/spec)
      if (ef.vsShield) dmg *= 1.1;
      if (ef.pierceAll) { skillPierce += 2; dmg *= 1.05; }
      if (ef.pierce2) { skillPierce += 1; dmg *= 1.05; }
      if (ef.fullPierce) { skillPierce += 1; dmg *= 1.05; }
      if (ef.double) { skillMulti += 1; dmg *= 1.05; } // rail duplo (pierce kind não usa multi) → +dano
      if (ef.salvo || ef.salvo4 || ef.swarm || ef.frag) dmg *= 1.1; // salvas extras → dano
      if (ef.homing) dmg *= 1.05;
      if (ef.vsAir) dmg *= 1.06;
      if (ef.vsBoss) dmg *= 1.1;
      if (ef.freezeDur && typeof ef.freezeDur === 'number' && ef.freezeDur < 5) dmg *= 1.05;
      if (ef.aoe || ef.aoe2) { rngSq *= 1.06; dmg *= 1.03; }
      if (ef.slow || ef.auraSlow || ef.slowChain) dmg *= 1.05; // lentidão base já existe → dano
      if (ef.phys) dmg *= 1.1;
      if (ef.freeze75 || ef.nova || ef.god || ef.infinite || ef.annihilate || ef.pandemia) dmg *= 1.15; // ultimates → dano
      if (ef.infectSpawn) dmg *= 1.1;
      if (ef.godBuff) dmg *= 1.15;
      if (ef.crit4) { skillCrit += 0.1; dmg *= 1.05; }
      if (ef.exec || ef.mark) dmg *= 1.1; // execução/marcação → dano (exec real via spec)
      if (ef.ignoreArmor) dmg *= 1.1;
      if (ef.strip || ef.corrode) dmg *= 1.08; // corrosão → dano (strip real via spec/venom)
      if (ef.plague) { /* praga real via towerHasPlague/killEnemy */ dmg *= 1.05; }
      if (ef.chain && typeof ef.chain === 'number') { chainBonus += ef.chain; dmg *= 1.03; }
      if (ef.chain2) { chainBonus += ef.chain2; dmg *= 1.03; }
      if (ef.chain8) { chainBonus += 8; dmg *= 1.05; }
      if (ef.chainDmg) dmg *= ef.chainDmg > 2 ? 1.1 : ef.chainDmg;
      // buff* (skills da amp) consumidos no bloco da amp abaixo, não aqui
    }

    let buffDmg = 0, buffRng = 0, buffRate = 0;
    let ampCritAdd = 0;
    const tTier = D.getTier(t.level);
    // G10: amps com diminishing — maior 100% + 50% das demais (antes: max() puro)
    const _dmgList = [], _rngList = [], _rateList = [];
    for (const other of S.towers) {
      const od = other.defRef || other.def;
      if (od.id !== 'amp' || other === t) continue;
      // v3 PIXEL FASE 6: amp T2 anel 20% maior (+ G5: buffArea de skill amplia o anel)
      const odTier = D.getTier(other.level);
      let _ringMul = ((D.TIER_LOGIC.amp[odTier] && D.TIER_LOGIC.amp[odTier].eff.ringMul) || 1);
      let _skDmg = 0, _skRng = 0, _skRate = 0;
      const _osk = (od.skills || []);
      for (const _s of _osk) {
        if (other.level < _s.lvl || !_s.eff) continue;
        const _e = _s.eff;
        // G5: skills da amp amplificam o anel (antes mortas)
        if (_e.buffDmg) _skDmg += _e.buffDmg;
        if (_e.buffDmg2) _skDmg += _e.buffDmg2;
        if (_e.buffDmg3) _skDmg += _e.buffDmg3;
        if (_e.buffDmg4) _skDmg += _e.buffDmg4;
        if (_e.buffRng) _skRng += _e.buffRng;
        if (_e.buffRng2) _skRng += _e.buffRng2;
        if (_e.buffRate) _skRate += _e.buffRate;
        if (_e.buffRate2) _skRate += _e.buffRate2;
        if (_e.buffAll) { _skDmg += _e.buffAll; _skRng += _e.buffAll; _skRate += _e.buffAll; }
        if (_e.buffArea) _ringMul *= _e.buffArea;
        if (_e.godBuff) { _skDmg += 0.3; }
        if (_e.dur) { /* duração do super fixa → sem efeito no anel */ }
      }
      const _odBaseSq = (od.rngSq != null ? od.rngSq : (od.rng != null ? od.rng / CELL : 0));
      const odRngSq = (_odBaseSq + (other.level - 1) * 10 / CELL) * _ringMul; // RANGESQ: anel amp em □
      if (chebTowerEnemy(other, t) <= odRngSq + 1e-9) {
        let _d = (other.specBranch === 'A' ? 0.45 : 0.25 + (other.level - 1) * 0.04) + _skDmg;
        let _r = (other.specBranch === 'B' ? 0.40 : 0) + _skRng;
        let _ra = (other.specBranch === 'A' ? 0.25 : 0) + _skRate;
        // v3 PIXEL FASE 6: amp T3/T4/T5 extras
        if (odTier >= 3) _ra += D.TIER_LOGIC.amp[3].eff.rateAdd;
        if (odTier >= 4) _d += D.TIER_LOGIC.amp[4].eff.dmgAdd;
        if (odTier >= 5) ampCritAdd = Math.max(ampCritAdd, D.TIER_LOGIC.amp[5].eff.critAdd);
        _dmgList.push(_d); _rngList.push(_r); _rateList.push(_ra);
      }
    }
    const _dim = (arr) => { if (!arr.length) return 0; const s = arr.slice().sort((a, b) => b - a); return s[0] + 0.5 * s.slice(1).reduce((a, b) => a + b, 0); };
    buffDmg = _dim(_dmgList); buffRng = _dim(_rngList); buffRate = _dim(_rateList);
    dmg *= 1 + buffDmg; rngSq *= 1 + buffRng; rate *= 1 + buffRate;
    skillCrit += ampCritAdd;
    // v3 PIXEL FASE 6: lógica por tier da própria torre
    const tl = D.TIER_LOGIC[def.id] && D.TIER_LOGIC[def.id][tTier] ? D.TIER_LOGIC[def.id][tTier].eff : null;
    if (tl) {
      if (tl.pierce) skillPierce += tl.pierce;               // gatling T4
      if (tl.critAdd) skillCrit += tl.critAdd;               // sniper T4 / amp T5 vizinhas
      if (tl.comboRate && S.combo) rate *= 1 + Math.min(tl.comboRate, S.combo * 0.01); // gatling T5
      if (tl.killDmg) dmg *= 1 + Math.min(tl.killCap || 0.5, (t.killStacks || 0) * tl.killDmg); // cannon T5 Dente de Ferro
      if (def.kind === 'beam') {
        // laser T4 fásico: metade do dano ignora escudo (aplicado no tick abaixo via flag)
        if (tl.shieldPhase) t._shieldPhase = tl.shieldPhase; else t._shieldPhase = null;
      }
    } else if (def.kind === 'beam') t._shieldPhase = null;
    // G-a G3: overdrive (super R) OU overdriveBuff (super auto da amp) aceleram a cadência
    if ((S.powers && S.powers.overdrive && S.powers.overdrive.dur > 0) || (S.overdriveBuff > 0)) { rate *= D.SUPERS.overdrive.rateMul; if(S.mutBuffs && S.mutBuffs.odDmg) dmg *= 1 + S.mutBuffs.odDmg; }

    // G5: shield de skill (torre sem HP) vira blindagem ofensiva mínima
    if (skillShield) dmg *= 1 + skillShield * 0.002;
    // aplica skills de pierce/crit/multi no retorno (G5: splash de skill multiplica a base)
    const baseSplash = ((def.splash || (spec && spec.splash) || 0) + ((spec && spec.splashAdd) || 0) + splashBonus) * splashMulAcc;
    // Onda 2: fallback genérico de TIER_LOGIC removido — todos os eff têm consumo real nos hooks.
    // F4-comp C1: mults de componentes (COMP_DEFS) por cima do chassi nv1-50.
    // RANGESQ: Mira (t +4%/pip) SOMA em fração de quadrado (0.04□/pip); e (move/leash) via getEngineMul no pursue; r via getMax*/getResupply.
    try {
      var _cp = (t && t.comp) || {};
      var _cw = _cp.w | 0, _ct = _cp.t | 0;
      if (_cw > 0 && D.COMP_DEFS && D.COMP_DEFS.w && D.COMP_DEFS.w.levels) {
        var _wl = D.COMP_DEFS.w.levels[Math.min(_cw, D.COMP_DEFS.w.levels.length) - 1];
        if (_wl) {
          if (_wl.dmgMul) dmg *= _wl.dmgMul;
          if (_wl.rateMul && rate) rate *= _wl.rateMul;
        }
      }
      if (_ct > 0 && D.COMP_DEFS && D.COMP_DEFS.t && D.COMP_DEFS.t.levels) {
        var _tlc = D.COMP_DEFS.t.levels[Math.min(_ct, D.COMP_DEFS.t.levels.length) - 1];
        if (_tlc) {
          if (_tlc.rngMul) rngSq += (_tlc.rngMul - 1); // RANGESQ: +0.04□/pip (t1 +0.04, t5 +0.20)
          if (_tlc.critAdd) skillCrit += _tlc.critAdd;
        }
      }
    } catch (_) {}
    var rng = rngSq * CELL; // RANGESQ: px p/ render/projeteis (= rngSqEff×CELL)
    var splashSq = pxToSqHalf(baseSplash); // RANGESQ: 65px→1.5□
    var _out = {
      dmg, rng, rngSq: rngSq, rngSqEff: rngSq, rate,
      splash: baseSplash, splashSq: splashSq,
      canHitAir: canHitAir(t),
      pierceBonus: skillPierce,
      critBonus: skillCrit,
      shieldBonus: skillShield,
      multiBonus: skillMulti,
      stunBonus, chainBonus, dotDurMul // G5: bônus de skill consumidos em fireTower
    };
    t._statsCache = { key: _cacheKey, value: _out };
    return _out;
  }

  function computeDps(t) {
    const def = t.defRef || t.def;
    const fake = Object.assign({}, t);
    const st = getTowerStats({ towers: [] }, fake);
    if (def.kind === 'beam') return st.dmg;
    if (def.kind === 'slow' || def.kind === 'dot' || def.kind === 'buff') return st.dmg * st.rate;
    return st.dmg * st.rate;
  }

  function findBestTarget(S, tower, stats) {
    // F2-sim E1/E2: estação/apoio/fábrica/buff nunca têm alvo (não atiram)
    try {
      var _td = tower && (tower.defRef || tower.def);
      if (_td && (isF2BuildingKind(_td.kind) || _td.kind === 'buff')) return null;
    } catch (_) {}
    let best = null;
    // RANGESQ: alcance em quadrados Chebyshev entre células (diagonal=1□). rngSqEff com tolerância.
    var _rngSq = getRngSqEff(stats);
    // G-a G6: reveal da amp B anula o stealth do phase para esta torre
    const revealed = towerHasReveal(S, tower);
    for (const e of S.enemies) {
      if (e.dead || e.leaked) continue;
      if (e.type === 'phase' && e.stealthPhase > 1.8 && !revealed) continue;
      if (e.flying && !stats.canHitAir) continue;
      const d = chebTowerEnemy(tower, e); // □ Chebyshev
      const dPx = Math.hypot(e.x - tower.x, e.y - tower.y); // p/ desempate CLOSEST
      if (d <= _rngSq + 1e-9) {
        if (!best) { best = e; best._d = dPx; best._dSq = d; continue; }
        switch (tower.targetMode) {
          case 'STRONGEST': if (e.hp + e.shield > best.hp + best.shield) best = e; break;
          case 'WEAKEST': if (e.hp + e.shield < best.hp + best.shield) best = e; break;
          case 'CLOSEST': if (dPx < best._d) { best = e; best._d = dPx; best._dSq = d; } break;
          case 'FASTEST': if (e.speed > best.speed) best = e; break;
          default: if (e.progress > best.progress) best = e;
        }
        if (best === e) { best._d = dPx; best._dSq = d; }
      }
    }
    if (best) { delete best._d; delete best._dSq; }
    return best;
  }

  function damageEnemy(S, e, amount, opt) {
    opt = opt || {};
    if (e.dead || e.leaked) return;
    if(!opt.crit && !opt.pure && S.mutBuffs && S.mutBuffs.crit && Math.random() < S.mutBuffs.crit){
      opt = Object.assign({}, opt, { crit: true });
      amount *= 2.2;
    }
    let finalDmg = amount;
    // v3 PIXEL FASE 6: cannon T3 perfura armadura; cryo T3: lentos recebem +25%
    const shooterTier = opt.src ? D.getTier(opt.src.level) : 0;
    const shooterLogic = (opt.src && D.TIER_LOGIC[opt.src.defRef.id]) ? D.TIER_LOGIC[opt.src.defRef.id][shooterTier] : null;
    if (opt.src) e._lastSrc = opt.src; else e._lastSrc = null; // Onda 2: crédito do abate (cannon T5); fix pós-review: dano sem src limpa crédito
    const shooterEff = (shooterLogic && shooterLogic.eff) || null;
    if (!opt.pure && e.armor > 0 && !(shooterEff && shooterEff.ignoreArmor)) { // sniper T3: ignora armadura
      const ap = (shooterEff && shooterEff.armorPierce) || 0;
      finalDmg = Math.max(1, finalDmg - Math.max(0, e.armor - ap));
    }
    if (opt.src && shooterEff && shooterEff.vsArmor) finalDmg *= shooterEff.vsArmor; // rail T2 vs blindados
    if (opt.src && shooterEff && shooterEff.vsShield && e.shield > 0) finalDmg *= shooterEff.vsShield; // tesla T4
    if (opt.src && shooterEff && shooterEff.vsBurn && e.burnTimer > 0) finalDmg *= shooterEff.vsBurn; // laser T2
    if (opt.sb && e.shield > 0) finalDmg *= 4;
    if (!opt.pure && e.cryoVuln > 0) finalDmg *= 1.4;
    else if (!opt.pure && e.slowTimer > 0) { // v3 PIXEL FASE 6: cryo T3 quebra total
      const src = opt.src;
      if (src && D.TIER_LOGIC.cryo[D.getTier(src.level)] && D.TIER_LOGIC.cryo[D.getTier(src.level)].eff.chillVuln && src.defRef.id === 'cryo') finalDmg *= 1.25;
    }
    if (e.markedTimer > 0) finalDmg *= (e.markMul || 1.35); // sniper T2 marca: 1.15; spec B/base: 1.35
    e.flash = 0.08;
    if (e.shield > 0) {
      // laser T4 shieldPhase: fração do dano atravessa o escudo direto no HP
      const _phase = (opt.src && opt.src._shieldPhase) || 0;
      if (_phase > 0) {
        const _through = finalDmg * _phase;
        e.hp -= _through;
        e.shield -= (finalDmg - _through);
        if (e.shield < 0) { e.hp += e.shield; e.shield = 0; }
      } else {
        e.shield -= finalDmg;
        if (e.shield < 0) { e.hp += e.shield; e.shield = 0; }
      }
      ev(S, { t: 'float', x: e.x, y: e.y - 10, txt: String(Math.round(finalDmg)), col: '#38bdf8', size: 9, dmg: true });
    } else {
      e.hp -= finalDmg;
      if (finalDmg >= 3) {
        ev(S, { t: 'float', x: e.x, y: e.y - 10, txt: (opt.crit ? '»' : '') + Math.round(finalDmg), col: opt.crit ? '#fbbf24' : '#dbe7ff', size: opt.crit ? 13 : 10, crit: !!opt.crit, dmg: true });
      }
    }
    if (e.hp <= 0) killEnemy(S, e);
  }

  // Onda 1.6: barra de chefe com múltiplos chefes — boss vivo de maior (hp + shield)
  function strongerLivingBoss(S) {
    let best = null;
    if (!S || !S.enemies) return null;
    for (const e of S.enemies) {
      if (e.dead || e.leaked || !e.defRef || !e.defRef.isBoss) continue;
      if (!best || (e.hp + e.shield) > (best.hp + best.shield)) best = e;
    }
    return best;
  }

  function killEnemy(S, e) {
    if (e.dead) return;
    e.dead = true;
    S.kills++;
    // Onda 2: cannon T5 Dente de Ferro — +1% dano por abate creditado a ESTA torre (cap em getTowerStats)
    if (e._lastSrc && e._lastSrc.defRef && D.TIER_LOGIC[e._lastSrc.defRef.id]) {
      const _ktl = D.TIER_LOGIC[e._lastSrc.defRef.id][D.getTier(e._lastSrc.level)];
      if (_ktl && _ktl.eff && _ktl.eff.killDmg) e._lastSrc.killStacks = (e._lastSrc.killStacks || 0) + 1;
    }
    // G2: toda torre com SUPERS_AUTO carrega a cada abate (incl. amp/buff; factory não tem super)
    let charged = false;
    for (const t of S.towers) {
      const _tid = t.defRef && t.defRef.id;
      if (!_tid || !D.SUPERS_AUTO[_tid]) continue;
      t.superCharge = (t.superCharge || 0) + (e.defRef.res || 1);
      charged = true;
    }
    if (charged) ev(S, { t: 'float', x: e.x, y: e.y - 30, txt: '+carga', col: '#fde047', size: 9 });
    S.combo = Math.min(D.COMBO.maxStacks, (S.combo||0)+1);
    S.comboTimer = D.COMBO.window;
    S.comboMax = Math.max(S.comboMax||0, S.combo);
    // G8: bônus de gold com cap +100% (combo e mutação separados)
    const comboBonus = 1 + Math.min(1, S.combo * D.COMBO.goldPerStack);
    const mutGold = 1 + Math.min(1, ((S.mutBuffs && S.mutBuffs.gold) || 0));
    // v3 PIXEL FASE 5: laboratório Hivemind dá +8% ouro por nível
    const hiveGold = 1 + (S.enemyHpLevel || 0) * D.HIVEMIND.goldAdd;
    const goldVal = Math.round(e.defRef.gold * (1 + techLvl('salvage') * 0.15) * mutGold * comboBonus * hiveGold);
    S.credits += goldVal;
    S.creditsEarned += goldVal;
    if(S.combo >= 5) ev(S, { t:'combo', n:S.combo, mult: comboBonus });
    if(S.combo>=10 && S.combo%5===0) ev(S, { t:'float', x:e.x, y:e.y-28, txt:'COMBO x'+S.combo+'! +' + Math.round((comboBonus-1)*100)+'%', col:'#fbbf24', size:14 });
    if(e.defRef.isBoss) S.chrono = 0.18;
    else if(e.defRef.r >= 12) S.chrono = 0.04;

    if (S.kills === 1) unlockAchievement('first_blood');
    else if (S.kills === 100) unlockAchievement('kills_100');
    else if (S.kills === 500) unlockAchievement('kills_500');
    if (S.credits >= 2000) unlockAchievement('rich');
    if (e.defRef.isBoss) unlockAchievement('boss_slayer');

    ev(S, { t: 'float', x: e.x, y: e.y - 18, txt: '+' + goldVal, col: '#fbbf24', size: 12 });
    ev(S, { t: 'boom', x: e.x, y: e.y, r: e.defRef.r * 2.5, col: e.defRef.col, big: !!e.defRef.isBoss, flying: e.flying });
    SND.explosion(e.defRef.isBoss ? 2 : 0.6 + e.defRef.r / 20);

    if (e.defRef.onDeathStun) {
      // RANGESQ: 85px→2□ (ceil(85/44*2)/2=2) Chebyshev entre células
      var _stunSq = pxToSqHalf(85);
      var _eCell = enemyCell(e);
      for (const t of S.towers) {
        var _tc = towerCell(t);
        if (chebSqCell(_tc.c, _tc.r, _eCell.c, _eCell.r) <= _stunSq + 1e-9) t.cooldown = Math.max(t.cooldown, 2.0);
      }
      ev(S, { t: 'ring', x: e.x, y: e.y, maxR: 60, col: '#f43f5e' });
    }

    if (e.defRef.splits) {
      for (let i = 0; i < 2; i++) {
        const mini = spawnEnemyAt(S, 'mini', e.dist + (i === 0 ? 8 : -8), e.routeIdx, e.x, e.y, e.dirAngle, e.flying);
        if (mini) S.enemies.push(mini);
      }
    }

    // G-a G4: praga do venom — kill com DoT ativo espalha a toxina p/ TODOS os vizinhos no raio
    // RANGESQ: 70px→2□ Chebyshev entre células (antes: hypot<70)
    if ((e.plagueCheck || (e.defRef && e.defRef.plagueCheck) || towerHasPlague(e.poisonBy)) && e.poisonTimer > 0 && e.poisonBy) {
      let spread = false;
      var _plagueSq = pxToSqHalf(70);
      var _peCell = enemyCell(e);
      for (const o of S.enemies) {
        if (!o.dead && o !== e && (function(){ var _oc = enemyCell(o); return chebSqCell(_oc.c, _oc.r, _peCell.c, _peCell.r) <= _plagueSq + 1e-9; })()) {
          o.poisonTimer = 3.5; o.poisonDps = e.poisonDps; o.poisonBy = e.poisonBy;
          o.plagueCheck = true; // vizinho infectado também propaga se morrer envenenado
          spread = true;
        }
      }
      if (spread) ev(S, { t: 'ring', x: e.x, y: e.y, maxR: 70, col: '#a3e635' });
    }

    // Onda 2: venom T5 Detonação Esporulante — morte envenenada por venom T5 explode nuvem em 2□ (dano = poisonDps×2)
    if (e.poisonBy && e.poisonTimer > -0.1 && e.poisonDps > 0) {
      const _pb = e.poisonBy;
      const _pbt = D.getTier(_pb.level || 1);
      const _pbl = D.TIER_LOGIC.venom && D.TIER_LOGIC.venom[_pbt] ? D.TIER_LOGIC.venom[_pbt].eff : null;
      if (_pbl && _pbl.deathCloud) {
        var _dcSq = pxToSqHalf(2 * CELL);
        var _dcCell = enemyCell(e);
        ev(S, { t: 'ring', x: e.x, y: e.y, maxR: 2 * CELL, col: '#a3e635' });
        for (const o of S.enemies) {
          if (o === e || o.dead || o.leaked) continue;
          var _dcOC = enemyCell(o);
          if (chebSqCell(_dcOC.c, _dcOC.r, _dcCell.c, _dcCell.r) <= _dcSq + 1e-9) {
            damageEnemy(S, o, e.poisonDps * 2, { pure: true });
          }
        }
      }
    }

    if (e.defRef.isBoss) {
      S.activeBoss = strongerLivingBoss(S); // Onda 1.6: mantém a barra em outro chefe vivo
      S.hitStop = 0.12; // V10: hitstop curto ~120ms (congela dt do sim, não o DOM)
      // Brief 07 A2: fanfarra de moedas no kill de boss (sem sistema de baú no jogo)
      if (SND.coinBig) SND.coinBig(); else SND.coin();
      ev(S, { t: 'bossDeath', x: e.x, y: e.y, name: e.label });
      ev(S, { t: 'shake', mag: 16 });
      ev(S, { t: 'banner', txt: 'NAVE-MÃE DESTRUÍDA!', col: '#fbbf24', strong: true });
    }
  }

  function spawnEnemyAt(S, type, dist, routeIdx, x, y, angle, flying) {
    const def = D.ENEMIES_DATA[type];
    if (!def) return null;
    // G-a G1: minis do splitter escalam com o hpMultiplier da onda (antes: HP fixo 18)
    const mul = hpMultiplier(S);
    const mhp = def.hp * mul;
    const msh = (def.shield || 0) * mul;
    return {
      eid: uid(), type, type_key: type, defRef: def,
      label: def.label, col: def.col, r: def.r, shape: def.shape,
      hp: mhp, maxHp: mhp, shield: msh, maxShield: msh,
      dist: Math.max(0, dist), totalLen: flying ? S.airLen : S.routeLengths[routeIdx],
      progress: 0, routeIdx, flying: !!flying,
      x, y, dirAngle: angle, speed: def.spd, armor: 0,
      slowTimer: 0, slowFactor: 1, stunTimer: 0, cryoVuln: 0,
      poisonTimer: 0, poisonDps: 0, poisonBy: null,
      burnTimer: 0, burnDps: 0, markedTimer: 0,
      healCooldown: 0, stealthPhase: 0, raged: false,
      flash: 0, dead: false, leaked: false
    };
  }

  /* ---- Disparo de torre por tipo ---- */
  // v3 PIXEL FASE 3: helper único de projétil bullet (usado por cannon/gatling em qualquer tier)
  function spawnBullet(S, t, def, target, stats, spread, speed) {
    const isFlak = t.specBranch === 'B' && def.specB && def.specB.multi;
    let dmg = stats.dmg;
    if (def.id === 'gatling' && t.specBranch === 'A') dmg *= 1 + Math.min(2.5, t.rampTime * 0.8);
    if (isFlak) dmg = stats.dmg * 0.6;
    let isCritS = false;
    if (stats.critBonus && Math.random() < stats.critBonus) { isCritS = true; dmg *= 1.5; }
    S.projectiles.push({
      kind: 'bullet', x: t.x, y: t.y, targetId: target.eid,
      vx: Math.cos(t.aimAngle + spread) * speed, vy: Math.sin(t.aimAngle + spread) * speed,
      dmg, col: def.color, life: 1.2, splash: stats.splash || 0, // Onda 1.4: concussão em área no impacto (cannon specA)
      pierce: ((t.specBranch === 'B' && def.specB && def.specB.pierce) || 1) + (stats.pierceBonus || 0),
      stun: ((t.specBranch === 'B' && def.specB && def.specB.stun) || 0) + (stats.stunBonus || 0), // G5: stun de skill
      // G-a G6: projétil balístico herda a matriz AA da torre (cannon nv1 não derruba voador)
      hitAir: !!stats.canHitAir,
      crit: isCritS, hitIds: {}, tower: t, src: t
    });
  }
  function fireTower(S, t, target, stats, dtArg) {
    const def = t.defRef || t.def;
    // F2-sim R1: prédios/suporte/buff nunca atiram
    if (!def || isF2BuildingKind(def.kind) || def.kind === 'buff') return false;
    // F2-sim R1: consumo antes do tiro — munição (ammoPerShot) + bateria p/ beam/chain/slow/dot (battDrain*dt)
    // sem ammo → não atira (aviso 1×/s); sem batt → energy kinds não disparam; bullet sem batt AINDA dispara se houver ammo
    var ammoPerShot = (def.ammoPerShot != null ? def.ammoPerShot : 0);
    var ammoCost = 0, battCost = 0;
    var isEnergy = !!F2_ENERGY[def.kind];
    if (ammoPerShot > 0) {
      if (def.kind === 'bullet') {
        var tier0 = (D.getTier ? D.getTier(t.level || 1) : 1);
        var isFlak0 = t.specBranch === 'B' && def.specB && def.specB.multi;
        var pat0 = (D.SHOT_PATTERNS && D.SHOT_PATTERNS[def.id]) || null;
        var count0 = isFlak0 ? def.specB.multi : 1;
        if (stats && stats.multiBonus) count0 += stats.multiBonus;
        try {
          if (pat0 && !isFlak0 && def.id === 'cannon') count0 = Math.max(count0, (pat0.multi && pat0.multi[tier0 - 1]) || count0);
          if (pat0 && !isFlak0 && def.id === 'gatling') count0 = Math.max(count0, (pat0.burst && pat0.burst[tier0 - 1]) || count0);
        } catch (_) {}
        ammoCost = ammoPerShot * Math.max(1, count0);
      } else if (def.kind === 'splash') {
        var tierS = (D.getTier ? D.getTier(t.level || 1) : 1);
        var specS = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
        var patS = D.SHOT_PATTERNS && D.SHOT_PATTERNS.missile;
        var salvoS = 1;
        try { salvoS = Math.max((specS && specS.salvos) || 0, (patS && patS.salvo && patS.salvo[tierS - 1]) || 1); } catch (_) { salvoS = 1; }
        ammoCost = ammoPerShot * Math.max(1, salvoS);
      } else {
        ammoCost = ammoPerShot;
      }
    }
    if (isEnergy) {
      var drain = (def.battDrain != null ? def.battDrain : 0);
      var dtEff = (typeof dtArg === 'number' && dtArg > 0) ? dtArg : 0;
      if (!(dtEff > 0)) {
        var rEff = (stats && stats.rate) || 0;
        dtEff = rEff > 0 ? 1 / rEff : 1;
      }
      battCost = drain * dtEff;
    }
    if (ammoCost > 0 && t.ammo != null && t.ammo < ammoCost) { f2Warn(S, t, 'ammo'); return false; }
    if (battCost > 0 && t.batt != null && t.batt < battCost) { f2Warn(S, t, 'batt'); return false; }
    if (ammoCost > 0 && t.ammo != null) t.ammo = Math.max(0, t.ammo - ammoCost);
    if (battCost > 0 && t.batt != null) t.batt = Math.max(0, t.batt - battCost);
    t.aimAngle = Math.atan2(target.y - t.y, target.x - t.x);
    t.recoil = 1.0;
    t.flash = 0.08;
    ev(S, { t: 'muzzle', x: t.x, y: t.y, angle: t.aimAngle, col: def.color, kind: def.kind });

    if (def.kind === 'bullet') {
      SND.shoot('bullet', t.specBranch);
      const tier = D.getTier(t.level);
      const isFlak = t.specBranch === 'B' && def.specB && def.specB.multi;
      const pat = D.SHOT_PATTERNS[def.id] || null;
      let count = isFlak ? def.specB.multi : 1;
      if (stats.multiBonus) count += stats.multiBonus;
      // v3 PIXEL FASE 3: cannon leque por tier / gatling rajada por tier
      if (pat && !isFlak && def.id === 'cannon') count = Math.max(count, pat.multi[tier - 1]);
      if (pat && !isFlak && def.id === 'gatling') count = Math.max(count, pat.burst[tier - 1]);
      for (let i = 0; i < count; i++) {
        const spread = isFlak ? (i - (count - 1) / 2) * 0.18 : (count > 1 ? (i - (count - 1) / 2) * 0.12 : 0);
        spawnBullet(S, t, def, target, stats, spread, 380);
      }
      SND.gatlingTick();
    } else if (def.kind === 'splash') {
      SND.shoot('splash');
      const tier = D.getTier(t.level);
      const spec = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
      const burn = !!(spec && spec.burn) || !!(D.TIER_LOGIC[def.id] && D.TIER_LOGIC[def.id][tier] && D.TIER_LOGIC[def.id][tier].eff.burn && tier >= 2);
      const pat = D.SHOT_PATTERNS.missile;
      const _tlM = (D.TIER_LOGIC.missile && D.TIER_LOGIC.missile[tier] && D.TIER_LOGIC.missile[tier].eff) || null;
      const mirvN = Math.max(pat.mirv[tier - 1] ? 3 : 0, (_tlM && _tlM.mirv) || 0); // Onda 2: T5 MIRV consumido explicitamente
      const salvoN = Math.max((spec && spec.salvos) || 0, pat.salvo[tier - 1]);
      const mkMissile = (tgt, delay, isSub) => S.projectiles.push({
        kind: 'missile', x: t.x, y: t.y, targetId: tgt.eid, speed: 300,
        dmg: stats.dmg, splash: stats.splash,
        hitAir: stats.canHitAir || tier >= 4,
        burn, col: def.color, life: 2.2, delay, tower: t,
        mirv: isSub ? 0 : (mirvN || ((spec && spec.salvos && t.specBranch === 'B') || 0)), // T5 MIRV / spec B frag
        tier
      });
      for (let i = 0; i < Math.max(1, salvoN); i++) mkMissile(target, i * 0.12, false);
    } else if (def.kind === 'slow') {
      SND.shoot('slow');
      const tier = D.getTier(t.level);
      const spec = t.specBranch === 'A' ? def.specA : null;
      const slowVal = t.specBranch === 'A' ? (def.specA.slowVal || 0.75) : 0.5;
      const pulses = D.SHOT_PATTERNS.cryo.pulses[tier - 1] || 1; // v3 PIXEL FASE 3: anéis por tier
      for (let ring = 0; ring < pulses; ring++) {
        ev(S, { t: 'ring', x: t.x, y: t.y, maxR: stats.rng * (0.6 + 0.4 * ((ring + 1) / pulses)), col: '#38bdf8' });
      }
      // RANGESQ: pulso glacial em □ Chebyshev (stats.rngSqEff); mut_cryo amplia duração/área
      var _cryoMut = (S.mutBuffs && S.mutBuffs.cryo) || 0;
      var _slowSq = getRngSqEff(stats) * (1 + 0.2 * _cryoMut);
      for (const e of S.enemies) {
        if (e.dead || chebTowerEnemy(t, e) > _slowSq + 1e-9) continue;
        if (!e.defRef.slowImmune) {
          e.slowTimer = 2.2 * (1 + 0.4 * _cryoMut); e.slowFactor = Math.min(slowVal, e.slowFactor || 1) * (pulses >= 4 ? 0.7 : 1);
          if (spec && spec.physDebuff) e.cryoVuln = 2.2;
          // T2 cryo logic: chance de congelar
          const cl = D.TIER_LOGIC.cryo && D.TIER_LOGIC.cryo[tier];
          if (cl && cl.eff.freezeChance && tier >= 2 && Math.random() < cl.eff.freezeChance) e.stunTimer = Math.max(e.stunTimer, cl.eff.freezeDur || 0.8);
          // G5: stun de skill (Cristal 0.4s) aplica no pulso glacial
          if (stats.stunBonus) e.stunTimer = Math.max(e.stunTimer, Math.min(0.6, stats.stunBonus));
        }
        // Onda 2: cryo T5 Congelamento Absoluto — freezeChance também em bosses, duração ×0.5
        const clB = D.TIER_LOGIC.cryo && D.TIER_LOGIC.cryo[tier];
        if (clB && clB.eff.bossFreeze && e.defRef.isBoss) {
          const _bfc = (clB.eff.freezeChance != null) ? clB.eff.freezeChance : 0.15;
          if (Math.random() < _bfc) e.stunTimer = Math.max(e.stunTimer, (clB.eff.freezeDur || 0.8) * clB.eff.bossFreeze);
        }
        damageEnemy(S, e, stats.dmg * 0.5 * pulses, { src: t }); // Onda 2 fix pós-review: src p/ cryo T3 chillVuln
      }
      if (tier >= 5) ev(S, { t: 'banner', txt: 'NEVASCA!', col: '#38bdf8' });
    } else if (def.kind === 'chain') {
      SND.shoot('chain');
      const tier = D.getTier(t.level);
      const spec = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
      // v3 PIXEL FASE 3: cadeia cresce por tier (G5: + chain de skill; Onda 2: T3 chainAdd +2)
      const _tlT = (D.TIER_LOGIC.tesla && D.TIER_LOGIC.tesla[tier] && D.TIER_LOGIC.tesla[tier].eff) || null;
      const maxChains = Math.max(D.SHOT_PATTERNS.tesla.chain[tier - 1], def.chain + ((spec && spec.chainAdd) || 0) + ((_tlT && _tlT.chainAdd) || 0)) + ((S.mutBuffs && S.mutBuffs.chain)||0)*2 + Math.round(stats.chainBonus || 0);
      const sb = !!(spec && spec.shieldBuster);
      const stunCh = (spec && spec.stunChance) || 0;
      // Onda 2: tesla T5 Campo Global — saltos ignoram distância
      const _globalChain = !!(_tlT && _tlT.globalChain);
      // G5: stun de skill também atordoa na cadeia
      const _skillStunDur = Math.min(0.5, stats.stunBonus || 0);
      let current = target;
      const hitList = [current];
      const pts = [{ x: t.x, y: t.y }, { x: current.x, y: current.y }];
      for (let c = 0; c < maxChains; c++) {
        damageEnemy(S, current, stats.dmg * Math.pow(0.78, c), { sb, src: t });
        if (stunCh && Math.random() < stunCh && !current.dead) current.stunTimer = Math.max(current.stunTimer, 0.4);
        if (_skillStunDur > 0 && !current.dead && Math.random() < Math.min(0.3, _skillStunDur)) current.stunTimer = Math.max(current.stunTimer, _skillStunDur);
        // Onda 2: tesla T2 Ionização — cada alvo atingido fica 12% mais lento por 1.5s
        if (_tlT && _tlT.ionSlow && !current.dead) {
          current.slowTimer = Math.max(current.slowTimer || 0, 1.5);
          current.slowFactor = Math.min(current.slowFactor || 1, 1 - _tlT.ionSlow);
        }
        // RANGESQ: salto em cadeia 100px→2.5□ Chebyshev entre células (ceil(100/44*2)/2)
        let next = null, nextDistSq = _globalChain ? Infinity : pxToSqHalf(100);
        var _curCell = enemyCell(current);
        for (const other of S.enemies) {
          if (hitList.indexOf(other) < 0 && !other.dead && !other.leaked) {
            var _oc2 = enemyCell(other);
            const dSq = chebSqCell(_oc2.c, _oc2.r, _curCell.c, _curCell.r);
            if (dSq <= nextDistSq + 1e-9 && (next === null || dSq < chebSqCell(enemyCell(next).c, enemyCell(next).r, _curCell.c, _curCell.r))) { next = other; }
          }
        }
        if (!next) break;
        hitList.push(next); pts.push({ x: next.x, y: next.y });
        current = next;
      }
      ev(S, { t: 'chain', pts });
    } else if (def.kind === 'snipe') {
      SND.shoot('snipe');
      const tier = D.getTier(t.level);
      const spec = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
      // Onda 2: sniper T2 marca (+15%) e T5 execução ampliada (<25%)
      const _tlS = (D.TIER_LOGIC.sniper && D.TIER_LOGIC.sniper[tier] && D.TIER_LOGIC.sniper[tier].eff) || null;
      const _execThr = Math.max((spec && spec.exec) || 0, (_tlS && _tlS.execAdd) || 0);
      // G5: crit de skill soma à chance base do sniper
      const critCh = Math.min(0.9, ((spec && spec.critChance) || 0.25) + (stats.critBonus || 0));
      const critMul = (spec && spec.critMul) || 2.2;
      // v3 PIXEL FASE 3: alvos por tier (T4=2, T5=3) + tracer por tier
      const nTargets = D.SHOT_PATTERNS.sniper.targets[tier - 1] || 1;
      const targets = [target];
      for (const e of S.enemies) {
        if (targets.length >= nTargets) break;
        if (e !== target && !e.dead && !targets.includes(e)) targets.push(e);
      }
      for (const tgt of targets) {
        const isCrit = Math.random() < critCh;
        if (_execThr && (tgt.hp / tgt.maxHp) < _execThr) {
          damageEnemy(S, tgt, tgt.hp + tgt.shield + 99999, { pure: true, crit: true, src: t });
        } else {
          damageEnemy(S, tgt, isCrit ? stats.dmg * critMul : stats.dmg, { crit: isCrit, src: t });
        }
        if (!tgt.dead && _tlS && _tlS.markMul) { tgt.markedTimer = _tlS.markDur || 1.5; tgt.markMul = _tlS.markMul; }
        if (spec && spec.spotter && !tgt.dead) { tgt.markedTimer = 4.0; tgt.markMul = 1.35; } // fix pós-review: spotter reescreve o mul (+35%)
        ev(S, { t: 'tracer', x1: t.x, y1: t.y, x2: tgt.x, y2: tgt.y, col: def.color, w: D.SHOT_PATTERNS.sniper.tracer[tier - 1] ? 2.5 + tier * 0.5 : 2 });
      }
    } else if (def.kind === 'dot') {
      SND.shoot('dot');
      const spec = t.specBranch === 'A' ? def.specA : (t.specBranch === 'B' ? def.specB : null);
      var _dotSq = getRngSqEff(stats); // RANGESQ: névoa em □ Chebyshev
      var _poisonMut = (S.mutBuffs && S.mutBuffs.poison) || 0; // mut_poison: +45% dur e +1 alvo
      var _poisonDur = 3.5 * (stats.dotDurMul || 1) * (1 + 0.45 * _poisonMut);
      // Onda 2: venom T2 corrosão (-1 armor/aplicação) e T4 necrose (+0.6% maxHp/s no veneno)
      const _vt = D.getTier(t.level);
      const _tlV = (D.TIER_LOGIC.venom && D.TIER_LOGIC.venom[_vt] && D.TIER_LOGIC.venom[_vt].eff) || null;
      const _poisonDps = stats.dmg; // base; % de vida máx. somado por alvo abaixo
      const _corrode = (_tlV && _tlV.corrode) || 0;
      const _pctPoison = (_tlV && _tlV.pctPoison) || 0;
      const _poisoned = [];
      for (const e of S.enemies) {
        if (e.dead || chebTowerEnemy(t, e) > _dotSq + 1e-9) continue;
        e.poisonTimer = _poisonDur; e.poisonDps = _poisonDps + _pctPoison * e.maxHp; e.poisonBy = t; // G5: dur de skill
        if (_corrode) e.armor = Math.max(0, (e.armor || 0) - _corrode);
        // G-a G4: define o check de praga no inimigo (killEnemy espalha p/ vizinhos)
        if (towerHasPlague(t)) e.plagueCheck = true;
        if (spec && spec.armorStrip) e.armor = 0;
        _poisoned.push(e);
      }
      // mut_poison: espalha para o inimigo vivo mais próximo fora da névoa (mesmos valores)
      if (_poisonMut > 0) {
        let _pExtra = null, _pBd = Infinity;
        for (const e of S.enemies) {
          if (e.dead || e.leaked || _poisoned.indexOf(e) >= 0) continue;
          const _pD = Math.hypot(e.x - t.x, e.y - t.y);
          if (_pD < _pBd) { _pBd = _pD; _pExtra = e; }
        }
        if (_pExtra) {
          _pExtra.poisonTimer = _poisonDur; _pExtra.poisonDps = _poisonDps + _pctPoison * _pExtra.maxHp; _pExtra.poisonBy = t;
          if (_corrode) _pExtra.armor = Math.max(0, (_pExtra.armor || 0) - _corrode);
          if (towerHasPlague(t)) _pExtra.plagueCheck = true;
          if (spec && spec.armorStrip) _pExtra.armor = 0;
        }
      }
      ev(S, { t: 'ring', x: t.x, y: t.y, maxR: stats.rng, col: '#a3e635' });
    } else if (def.kind === 'pierce') {
      SND.shoot('pierce');
      const tier = D.getTier(t.level);
      const spec = t.specBranch === 'A' ? def.specA : null;
      // v3 PIXEL FASE 3: lanças por tier; T4 perfura total; T5 lança estelar (linha no mapa todo)
      const pat = D.SHOT_PATTERNS.rail;
      const starLine = pat.star[tier - 1] || (D.TIER_LOGIC.rail && D.TIER_LOGIC.rail[5].eff.starLine && tier >= 5);
      const _tlR = (D.TIER_LOGIC.rail && D.TIER_LOGIC.rail[tier] && D.TIER_LOGIC.rail[tier].eff) || null;
      const fullPierce = pat.full[tier - 1] || (tier >= 4 && !!(_tlR && _tlR.fullBase)); // Onda 2: T4 Perfuração Total consumido
      const beamLen = starLine ? BW * 1.5 : ((fullPierce || (spec && spec.fullPierce)) ? BW : stats.rng + 30);
      const angles = [];
      const beamsN = pat.full[tier-1] || pat.star[tier-1] ? 1 : pat.beams[tier - 1];
      for (let b = 0; b < beamsN; b++) angles.push(t.aimAngle + (b - (beamsN - 1) / 2) * 0.22);
      for (const ang of angles) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        for (const e of S.enemies) {
          const ox = e.x - t.x, oy = e.y - t.y;
          const proj = ox * dx + oy * dy;
          // G-a G6: rail nv<4 não atinge voadores
          if (e.flying && !stats.canHitAir) continue;
          if (proj > 0 && proj <= beamLen && Math.abs(ox * (-dy) + oy * dx) < (starLine ? 26 : 18)) {
            damageEnemy(S, e, stats.dmg, { pure: true, src: t }); // Onda 2 fix pós-review: src p/ hooks do rail (T2 vsArmor)
            // T3 rail logic: atordoa
            const rl = D.TIER_LOGIC.rail && D.TIER_LOGIC.rail[tier];
            if (rl && rl.eff.stunDur) e.stunTimer = Math.max(e.stunTimer, rl.eff.stunDur);
          }
        }
        ev(S, { t: 'tracer', x1: t.x, y1: t.y, x2: t.x + dx * beamLen, y2: t.y + dy * beamLen, col: '#ffffff', w: 4 + tier * 0.6 });
      }
      ev(S, { t: 'shake', mag: 3 + tier });
    }
    return true;
  }

  /* ---- Supers orbitais ---- */
  function applySuper(S, key, x, y) {
    const p = S.powers[key];
    const meta = D.SUPERS[key];
    if (!p || p.cd > 0) return false;
    p.cd = p.maxCd;
    SND.superFire();
    if (SND.superFireX) SND.superFireX(); // Brief 07 A1: super manual também usa o impacto
    ev(S, { t: 'banner', txt: meta.name.toUpperCase() + ' ATIVADA!', col: meta.color });
    if (key === 'ion') {
      ev(S, { t: 'ionBeam', x, y, r: meta.radius, life: 1.6 });
      ev(S, { t: 'shake', mag: 14 });
      S.chrono = 0.14;
      try{ SND.superIon(); }catch(e){ SND.superFire(); }
      for (const e of S.enemies) {
        // G9: íon com +100% dano vs boss (diferencia dos demais supers)
        if (!e.dead && Math.hypot(e.x - x, e.y - y) <= meta.radius) { const _d = meta.dmg * (e.defRef && e.defRef.isBoss ? 2 : 1); damageEnemy(S, e, _d, { pure: true, crit: true }); if(!e.dead){ e.burnTimer=3.5; e.burnDps= _d*0.08; } }
      }
      ev(S, { t:'ring', x, y, maxR: meta.radius*1.4, col:'#38bdf8' });
      ev(S, { t:'ring', x, y, maxR: meta.radius*0.7, col:'#ffffff' });
    } else if (key === 'emp') {
      // G9: PEM restrito a RAIO (antes: global). Raio base em D.SUPERS.emp.radius.
      const _r = (meta && meta.radius) || 180;
      ev(S, { t: 'emp' });
      ev(S, { t: 'ring', x, y, maxR: _r, col: '#60a5fa' });
      ev(S, { t: 'shake', mag: 10 });
      S.chrono=0.10;
      try{ SND.superEmp(); }catch(e){ SND.superFire(); }
      for (const e of S.enemies) {
        if (e.dead || e.leaked) continue;
        if (Math.hypot(e.x - x, e.y - y) > _r) continue;
        // Onda 1.7: slowImmune respeitado (colosso); stun/escudo continuam valendo
        if (!e.defRef.slowImmune) { e.slowTimer = 5.0; e.slowFactor = 0.03; }
        e.stunTimer = Math.max(e.stunTimer, 1.2);
        if (e.shield > 0) e.shield = Math.max(0, e.shield - e.maxShield * 0.72);
      }
    } else if (key === 'vortex') {
      // G8: dps do vórtice com bônus de combo capado em +100%
      S.vortices.push({ x, y, r: meta.radius, dps: meta.dps * (1 + Math.min(1, (S.combo||0)*0.02)), life: meta.dur + ((S.mutBuffs && S.mutBuffs.odDur)||0), tot: meta.dur + ((S.mutBuffs && S.mutBuffs.odDur)||0) });
      ev(S, { t: 'vortexStart', x, y, r: meta.radius, dur: meta.dur });
      try{ SND.superVortex(); }catch(e){ SND.superFire(); }
      S.chrono=0.08;
    } else if (key === 'overdrive') {
      p.dur = meta.dur + ((S.mutBuffs && S.mutBuffs.odDur)||0);
      ev(S, { t: 'overdrive' });
      try{ SND.overdriveOn(); }catch(e){ SND.superFire(); }
      ev(S, { t:'ring', x: BW/2, y:BH/2, maxR: BW*0.6, col:'#fb923c' });
    }
    return true;
  }

  /* ---- v3 PIXEL FASE 4: SUPER AUTOMÁTICO por tipo de nave (carga = abates daquele tipo) ---- */
  function getSuperCharge(S, t) {
    const tier = D.getTier(t.level);
    const need = D.superThreshold(tier);
    const charge = (t.superCharge || 0);
    return { charge, need, pct: Math.min(1, charge / need), ready: charge >= need, tier };
  }
  function forceSuperCharge(S, t, amount) {
    if (!t || !S.towers.includes(t)) return null;
    t.superCharge = (t.superCharge || 0) + (amount == null ? 9999 : amount);
    S._superTestArmed = true; // flag p/ teste: próxima checagem dispara
    return fireAutoSuperIfReady(S, t);
  }
  function fireAutoSuperIfReady(S, t) {
    // G2: toda torre com SUPERS_AUTO dispara (incl. amp/buff; factory não tem entrada)
    if (!t || !t.defRef || S.state === 'victory' || S.state === 'defeat') return false;
    if (!D.SUPERS_AUTO[t.defRef.id]) return false;
    const sc = getSuperCharge(S, t);
    if (!sc.ready) return false;
    // Brief 07 A1: chime quando o super termina de carregar (guard silencioso)
    if (SND.superReady) SND.superReady();
    t.superCharge = 0;
    fireAutoSuper(S, t.defRef.id, t);
    return true;
  }
  function fireAutoSuper(S, kind, tower) {
    const meta = D.SUPERS_AUTO[kind];
    if (!meta) return false;
    SND.superFire();
    // Brief 07 A1: impacto dramático do super automático (guard silencioso)
    if (SND.superFireX) SND.superFireX();
    ev(S, { t: 'banner', txt: '★ ' + meta.name.toUpperCase() + ' — SUPER DE ' + defName(tower).toUpperCase() + '!', col: meta.col || '#fbbf24', strong: true });
    S.autoSupersFired = (S.autoSupersFired || 0) + 1; // contador exposto p/ teste
    ev(S, { t: 'autoSuperFx', x: tower.x, y: tower.y, col: meta.col || '#fbbf24' });
    const alive = () => S.enemies.filter(e => !e.dead && !e.leaked);
    switch (kind) {
      case 'cannon': { // BAL2: 20→14 obuses (−30%), dmg 60+8/lvl→40+5/lvl (−33~38%), raio 46→32 (−30%)
        // RANGESQ: cluster 90px→2.5□ e impacto 32px→1□ Chebyshev (ceil(px/44*2)/2)
        let bx = BW / 2, by = BH / 2, bestN = -1;
        var _clSq = pxToSqHalf(90), _hitSq = pxToSqHalf(32);
        for (const e of alive()) {
          let n = 0;
          var _ec0 = enemyCell(e);
          for (const o of alive()) { var _oc0 = enemyCell(o); if (chebSqCell(_oc0.c, _oc0.r, _ec0.c, _ec0.r) <= _clSq + 1e-9) n++; }
          if (n > bestN) { bestN = n; bx = e.x; by = e.y; }
        }
        for (let i = 0; i < 14; i++) {
          const ox = bx + (Math.random() - 0.5) * 90, oy = by + (Math.random() - 0.5) * 90;
          let hit = 0;
          var _ic = { c: Math.floor(ox / CELL), r: Math.floor(oy / CELL) };
          for (const e of alive()) { var _ecH = enemyCell(e); if (chebSqCell(_ecH.c, _ecH.r, _ic.c, _ic.r) <= _hitSq + 1e-9) { damageEnemy(S, e, tower.damageDealt >= 0 ? 40 + tower.level * 5 : 40); hit++; } }
          ev(S, { t: 'boom', x: ox, y: oy, r: 28, col: '#e2e8f0', big: false });
        }
        break;
      }
      case 'gatling': { // BAL2: ×6→×3.5 (−42%)
        const rng2 = tower.rng !== undefined ? tower.rng : 200; // headless fallback
        let hits = 0;
        // aplicação instantânea em área dobrada (equivalente ao tornado)
        // RANGESQ: 2×rngSqEff Chebyshev (st.rng px já = rngSqEff×CELL)
        const st = getTowerStats(S, tower);
        var _gatSq = getRngSqEff(st) * 2;
        for (const e of alive()) {
          if (chebTowerEnemy(tower, e) <= _gatSq + 1e-9) {
            damageEnemy(S, e, st.dmg * 3.5); hits++;
            if (hits % 4 === 0) ev(S, { t: 'tracer', x1: tower.x, y1: tower.y, x2: e.x, y2: e.y, col: '#fbbf24', w: 2 });
          }
        }
        break;
      }
      case 'laser': { // BAL2: global ×8→×4.5 puro (−44%)
        const st = getTowerStats(S, tower);
        for (let d = 0; d < S.routeLengths[0]; d += 14) {
          const p = D.getPosAtDist(S.routes[0], d);
          ev(S, { t: 'spark', x: p.x, y: p.y, col: '#f43f5e' });
        }
        for (const e of alive()) damageEnemy(S, e, st.dmg * 4.5, { pure: true });
        break;
      }
      case 'missile': { // BAL2: global 16→10 mísseis (−37%), dmg 80+6/lvl→55+4/lvl (−31%), splash 70→45 (−36%)
        const sorted = alive().sort((a, b) => (b.defRef.gold) - (a.defRef.gold));
        for (let i = 0; i < 10; i++) {
          const tgt = sorted[i % Math.max(1, sorted.length)];
          if (!tgt) break;
          S.projectiles.push({ kind: 'missile', x: tower.x, y: tower.y, targetId: tgt.eid, speed: 340, dmg: 55 + tower.level * 4, splash: 45, hitAir: true, burn: true, col: '#fb923c', life: 2.5, delay: i * 0.07, tower, mirv: 0 });
        }
        break;
      }
      case 'cryo': { // BAL2: global stun 3s→1.8s (boss 0.9s), slow 3s→2s; anel local 1.5×rng (antes: flash fullscreen 'emp')
        const stC = getTowerStats(S, tower);
        for (const e of alive()) {
          if (!e.defRef.slowImmune || e.defRef.isBoss) { e.stunTimer = Math.max(e.stunTimer, e.defRef && e.defRef.isBoss ? 0.9 : 1.8); }
          // Onda 1.7: slowImmune respeitado também no super da cryo
          if (!e.defRef.slowImmune) { e.slowTimer = 2; e.slowFactor = 0.05; }
        }
        ev(S, { t: 'ring', x: tower.x, y: tower.y, maxR: stC.rng * 1.5, col: '#38bdf8' });
        break;
      }
      case 'tesla': { // BAL2: global 12→7 relâmpagos (−42%), ×2→×1.2 (−40%)
        // RANGESQ: salto 130px→3□ Chebyshev
        const st = getTowerStats(S, tower);
        var _tesSq = pxToSqHalf(130);
        for (let i = 0; i < 7; i++) {
          const pool = alive();
          if (!pool.length) break;
          const start = pool[Math.floor(Math.random() * pool.length)];
          let cur = start; const pts = [{ x: start.x, y: start.y }]; const hit = new Set();
          for (let c = 0; c < 4; c++) {
            damageEnemy(S, cur, st.dmg * 1.2, { pure: true }); hit.add(cur.eid);
            let next = null;
            var _ccT = enemyCell(cur);
            for (const o of alive()) { if (!hit.has(o.eid)) { var _ooT = enemyCell(o); var _ddT = chebSqCell(_ooT.c, _ooT.r, _ccT.c, _ccT.r); if (_ddT <= _tesSq + 1e-9 && (next === null || _ddT < chebSqCell(enemyCell(next).c, enemyCell(next).r, _ccT.c, _ccT.r))) { next = o; } } }
            if (!next) break;
            pts.push({ x: next.x, y: next.y }); cur = next;
          }
          ev(S, { t: 'chain', pts });
        }
        break;
      }
      case 'sniper': { // BAL2: global exec 3→2 alvos (−33%); boss NÃO executa (1200+40/lvl puro)
        const weak = alive().sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield)).slice(0, 2);
        for (const e of weak) {
          if (e.defRef && e.defRef.isBoss) damageEnemy(S, e, 1200 + tower.level * 40, { pure: true, crit: true });
          else damageEnemy(S, e, e.hp + e.shield + 99999, { pure: true, crit: true });
          ev(S, { t: 'tracer', x1: tower.x, y1: tower.y, x2: e.x, y2: e.y, col: '#67e8f9', w: 4 });
        }
        break;
      }
      case 'venom': { // BAL2: global 8s→5s (−37%), dps ×0.6 (−40%); anel local 1.5×rng (antes: mapa todo)
        const st = getTowerStats(S, tower);
        for (const e of alive()) { e.poisonTimer = 5; e.poisonDps = Math.max(st.dmg * 0.6, 6); e.poisonBy = tower; }
        ev(S, { t: 'ring', x: tower.x, y: tower.y, maxR: st.rng * 1.5, col: '#a3e635' });
        break;
      }
      case 'amp': { // BAL2: Sobrecarga Total 6s→4s (−33%); anel local 1.5×rng (antes: 0.7×mapa)
        S.overdriveBuff = Math.max(S.overdriveBuff || 0, 4);
        const stA = getTowerStats(S, tower);
        ev(S, { t: 'ring', x: tower.x, y: tower.y, maxR: stA.rng * 1.5, col: '#fde047' });
        ev(S, { t: 'overdrive' });
        break;
      }
      case 'rail': { // BAL2: Lança Estelar ×5→×3 (−40%); shake 12→6 (médio)
        const st = getTowerStats(S, tower);
        for (let l = 0; l < 3; l++) {
          const ang = Math.PI * 2 * l / 3 + 0.4;
          const dx = Math.cos(ang), dy = Math.sin(ang);
          for (const e of alive()) {
            const proj = (e.x - BW / 2) * dx + (e.y - BH / 2) * dy;
            if (Math.abs(-(e.x - BW/2) * dy + (e.y - BH/2) * dx) < 30) damageEnemy(S, e, st.dmg * 3, { pure: true });
          }
          ev(S, { t: 'tracer', x1: BW / 2 - dx * BW, y1: BH / 2 - dy * BH, x2: BW / 2 + dx * BW, y2: BH / 2 + dy * BH, col: '#ffffff', w: 6 });
        }
        ev(S, { t: 'shake', mag: 6 });
        break;
      }
    }
    return true;
  }

  /* ---- F2-sim: recursos (fuel/batt/ammo), reator, suprimento ---- */
  var F2_ENERGY = { beam: 1, chain: 1, slow: 1, dot: 1 };
  function isF2BuildingKind(k) { return k === 'factory' || k === 'station' || k === 'support'; }
  function getReactorCapMul(t) {
    try {
      var r = (t && t.comp && t.comp.r) || 0;
      if (!r) return 1;
      var lvls = D.COMP_DEFS && D.COMP_DEFS.r && D.COMP_DEFS.r.levels;
      if (!lvls) return 1;
      var idx = Math.min(r, lvls.length) - 1;
      var e = lvls[idx];
      return (e && e.capMul) || 1;
    } catch (_) { return 1; }
  }
  function getReactorTakeMul(t) {
    try {
      var r = (t && t.comp && t.comp.r) || 0;
      if (!r) return 1;
      var lvls = D.COMP_DEFS && D.COMP_DEFS.r && D.COMP_DEFS.r.levels;
      if (!lvls) return 1;
      var idx = Math.min(r, lvls.length) - 1;
      var e = lvls[idx];
      return (e && e.takeMul) || 1;
    } catch (_) { return 1; }
  }
  function getMaxFuel(t) {
    var def = (t && (t.defRef || t.def)) || {};
    var base = (def.fuelCap != null ? def.fuelCap : (t.maxFuel != null ? t.maxFuel : 100));
    return base * getReactorCapMul(t);
  }
  function getMaxBatt(t) {
    var def = (t && (t.defRef || t.def)) || {};
    var base = (def.battCap != null ? def.battCap : (t.maxBatt != null ? t.maxBatt : 100));
    return base * getReactorCapMul(t);
  }
  function getMaxAmmo(t) {
    var def = (t && (t.defRef || t.def)) || {};
    var base = (def.ammoCap != null ? def.ammoCap : (t.maxAmmo != null ? t.maxAmmo : 40));
    return base * getReactorCapMul(t);
  }
  function initF2TowerState(t, c, r, def) {
    var d = def || (t && (t.defRef || t.def)) || {};
    t.fuel = (d.fuelCap != null ? d.fuelCap : 100);
    t.maxFuel = t.fuel;
    t.batt = (d.battCap != null ? d.battCap : 100);
    t.maxBatt = t.batt;
    t.ammo = (d.ammoCap != null ? d.ammoCap : 40);
    t.maxAmmo = t.ammo;
    t.comp = { w: 0, e: 0, r: 0, t: 0 };
    t.stance = 'anchor';
    t.ax = c; t.ay = r;
    t.returning = false; // F3-pursue: flag p/ UI (lógica de retorno)
    t.refuel = false; // REFUEL: true = voando/atracado p/ reabastecer (destino = station/support)
    t._refuelTid = null; // REFUEL: tid da fonte alvo (estável p/ não oscilar)
    t._refuelDocked = false; // REFUEL: true = atracado dentro do supplyRadius
    t._refuelAcc = 0; // REFUEL: reserva (não usado separado; timing via _pursueAcc)
    t._noTargetT = 0; // F3-pursue: segundos sem alvo
    t._pursueAcc = 0; // F3-pursue: acumulador p/ passo (base 1 célula/s × moveMul)
    t._warnCd = 0;
    if (t.moveCd == null) t.moveCd = 0;
    return t;
  }
  function getFactoryBoost(S) {
    var sum = 0;
    try {
      if (S && S.towers) {
        for (var i = 0; i < S.towers.length; i++) {
          var o = S.towers[i];
          var od = o.defRef || o.def;
          if (od && od.kind === 'factory' && D.FACTORY_DATA && D.FACTORY_DATA.fuelBoost) {
            sum += D.FACTORY_DATA.fuelBoost(o.level || 1);
          }
        }
      }
    } catch (_) {}
    return sum;
  }
  function getResupply(S, t) {
    var out = { fuel: 0, batt: 0, ammo: 0 };
    try {
      if (!S || !t) return out;
      var fuels = [], batts = [], ammos = [];
      var _tc0 = towerCell(t);
      for (var i = 0; i < S.towers.length; i++) {
        var o = S.towers[i];
        if (o === t) continue;
        var od = o.defRef || o.def;
        if (!od) continue;
        if (od.kind !== 'station' && od.kind !== 'support') continue; // factory NÃO é fonte
        // RANGESQ: suprimento em □ Chebyshev (station 4□=176px, support 2□=88px; legado px/CELL fallback)
        var radSq = getSupplySq(o);
        if (!(radSq > 0)) {
          var _legacy = od.supplyRadius;
          if (_legacy == null) {
            if (od.id === 'station' && D.STATION_DATA) _legacy = D.STATION_DATA.supplyRadius;
            else if (od.id === 'support' && D.SUPPORT_DATA) _legacy = D.SUPPORT_DATA.supplyRadius;
            else _legacy = 0;
          }
          radSq = _legacy / CELL;
        }
        var _oc0 = towerCell(o);
        if (chebSqCell(_oc0.c, _oc0.r, _tc0.c, _tc0.r) > radSq + 1e-9) continue;
        var rates = od.rates;
        if (!rates) {
          if (od.id === 'station' && D.STATION_DATA) rates = D.STATION_DATA.rates;
          else if (od.id === 'support' && D.SUPPORT_DATA) rates = D.SUPPORT_DATA.rates;
        }
        if (!rates) continue;
        if (rates.fuel) fuels.push(rates.fuel);
        if (rates.batt) batts.push(rates.batt);
        if (rates.ammo) ammos.push(rates.ammo);
      }
      var dim = function (arr) {
        if (!arr.length) return 0;
        var s = arr.slice().sort(function (a, b) { return b - a; });
        var rest = 0;
        for (var k = 1; k < s.length; k++) rest += s[k];
        return s[0] + 0.5 * rest;
      };
      var boost = 1 + getFactoryBoost(S);
      var take = getReactorTakeMul(t);
      out.fuel = dim(fuels) * boost * take;
      out.batt = dim(batts) * boost * take;
      out.ammo = dim(ammos) * boost * take;
    } catch (_) {}
    return out;
  }
  function f2Warn(S, t, res) {
    if ((t._warnCd || 0) > 0) return;
    t._warnCd = 1.0;
    var txt = res === 'ammo' ? 'SEM MUNIÇÃO' : (res === 'batt' ? 'SEM BATERIA' : 'SEM COMBUSTÍVEL');
    ev(S, { t: 'resEmpty', res: res, tid: t.tid, x: t.x, y: t.y });
    ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: txt, col: '#f43f5e', size: 10 });
  }

  /* ---- F3-pursue: posturas anchor/pursue + leash da âncora ---- */
  // Motor (COMP_DEFS.e): moveMul = velocidade (base 1 célula/s); leashMul = alcance da âncora
  function getEngineMul(t) {
    try {
      var e = (t && t.comp && t.comp.e) || 0;
      if (!e) return { moveMul: 1, leashMul: 1 };
      var lvls = D.COMP_DEFS && D.COMP_DEFS.e && D.COMP_DEFS.e.levels;
      if (!lvls) return { moveMul: 1, leashMul: 1 };
      var lv = lvls[Math.min(e, lvls.length) - 1];
      return { moveMul: (lv && lv.moveMul) || 1, leashMul: (lv && lv.leashMul) || 1 };
    } catch (_) { return { moveMul: 1, leashMul: 1 }; }
  }
  function pursueAnchorXY(t) {
    var ax = (t.ax != null ? t.ax : t.c), ay = (t.ay != null ? t.ay : t.r);
    return { ax: ax, ay: ay, x: ax * CELL + CELL / 2, y: ay * CELL + CELL / 2 };
  }
  // F3: passo de perseguição/retorno p/ célula vizinha — cobra fuelPerCell (Manhattan);
  // sem fuel ou célula ocupada/bloqueada → false (para onde está, atira normalmente)
  function tryPursueStep(S, t, nc, nr) {
    if (!S || !t) return false;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
    var key = nc + ',' + nr;
    if (S.blocked[key] || S.occupied[key]) return false;
    var def = t.defRef || t.def;
    var fuelPerCell = (def && def.fuelPerCell != null ? def.fuelPerCell : 2);
    var cost = fuelPerCell * (Math.abs(nc - t.c) + Math.abs(nr - t.r));
    if (t.fuel != null && t.fuel < cost) return false;
    if (t.fuel != null) t.fuel = Math.max(0, t.fuel - cost);
    delete S.occupied[t.c + ',' + t.r];
    t.c = nc; t.r = nr;
    t.x = nc * CELL + CELL / 2; t.y = nr * CELL + CELL / 2;
    S.occupied[nc + ',' + nr] = t; // FIX (Onda 1.1): célula nova registrada (antes: torre fantasma)
    bumpAmpVersion(S); // Onda 2 fix pós-review: buff da amp é posicional — movimento invalida o cache
    return true;
  }
  // REFUEL: raio de suprimento da fonte (station/support) — RANGESQ: supplySq×CELL (legado px fallback)
  function getSupplyRadius(o) {
    try {
      var od = o && (o.defRef || o.def);
      if (!od) return 0;
      // RANGESQ: prefere supplySq (4□=176, 2□=88); mantém supplyRadius px legado como fallback
      if (od.supplySq != null) return od.supplySq * CELL;
      if (od.id === 'station' && D.STATION_DATA && D.STATION_DATA.supplySq != null) return D.STATION_DATA.supplySq * CELL;
      if (od.id === 'support' && D.SUPPORT_DATA && D.SUPPORT_DATA.supplySq != null) return D.SUPPORT_DATA.supplySq * CELL;
      if (od.supplyRadius != null) return od.supplyRadius;
      if (od.id === 'station' && D.STATION_DATA) return D.STATION_DATA.supplyRadius;
      if (od.id === 'support' && D.SUPPORT_DATA) return D.SUPPORT_DATA.supplyRadius;
      return 0;
    } catch (_) { return 0; }
  }
  // REFUEL: fonte viável MAIS PRÓXIMA (qualquer distância) — station/support no mapa
  function nearestResupply(S, t) {
    try {
      if (!S || !t || !S.towers) return null;
      var best = null, bd = Infinity;
      var tx = (t.x != null ? t.x : 0), ty = (t.y != null ? t.y : 0);
      for (var i = 0; i < S.towers.length; i++) {
        var o = S.towers[i];
        if (o === t) continue;
        var od = o.defRef || o.def;
        if (!od) continue;
        if (od.kind !== 'station' && od.kind !== 'support') continue;
        var dx = (o.x != null ? o.x : 0) - tx, dy = (o.y != null ? o.y : 0) - ty;
        var d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    } catch (_) { return null; }
  }
  function hasResupplyOnMap(S) {
    try {
      if (!S || !S.towers) return false;
      for (var i = 0; i < S.towers.length; i++) {
        var od = S.towers[i].defRef || S.towers[i].def;
        if (od && (od.kind === 'station' || od.kind === 'support')) return true;
      }
      return false;
    } catch (_) { return false; }
  }
  // REFUEL: passo de emergência — move mesmo sem fuel (reserva: rasteja, nunca trava)
  // cobra quando há fuel; sem fuel move sem cobrar (fuel fica em 0)
  function tryRefuelStep(S, t, nc, nr) {
    if (!S || !t) return false;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return false;
    var key = nc + ',' + nr;
    if (S.blocked[key] || S.occupied[key]) return false;
    var def = t.defRef || t.def;
    var fuelPerCell = (def && def.fuelPerCell != null ? def.fuelPerCell : 2);
    var cost = fuelPerCell * (Math.abs(nc - t.c) + Math.abs(nr - t.r));
    if (t.fuel != null) {
      if (t.fuel >= cost) t.fuel = Math.max(0, t.fuel - cost);
      else t.fuel = Math.max(0, t.fuel); // reserva: sem cobrança, nunca negativo/trava
    }
    delete S.occupied[t.c + ',' + t.r];
    t.c = nc; t.r = nr;
    t.x = nc * CELL + CELL / 2; t.y = nr * CELL + CELL / 2;
    S.occupied[nc + ',' + nr] = t; // FIX (Onda 1.1): célula nova registrada (antes: torre fantasma)
    bumpAmpVersion(S); // Onda 2 fix pós-review: buff da amp é posicional — movimento invalida o cache
    return true;
  }
  // F3: DO.setStance(S,t,stance) — valida torre viva + stance anchor|pursue
  function setStance(S, t, stance) {
    if (!S || !t) return false;
    if (stance !== 'anchor' && stance !== 'pursue') return false;
    if (!isLiveTower(S, t)) return false;
    t.stance = stance;
    t._noTargetT = 0;
    t._pursueAcc = 0;
    t.returning = false;
    t.refuel = false; // REFUEL: troca de postura limpa o modo reabastecimento
    t._refuelTid = null; t._refuelDocked = false; t._refuelAcc = 0;
    return true;
  }

  function placeTower(S, c, r, towerId) {
    if (towerId === 'factory') return placeFactory(S, c, r); // v3 PIXEL FASE 5
    if (towerId === 'station') return placeStation(S, c, r); // F2-sim E1
    if (towerId === 'support') return placeSupport(S, c, r); // F2-sim E2
    const def = D.TOWERS_DATA.find(t => t.id === towerId);
    if (!def) return null;
    const key = c + ',' + r;
    if (S.occupied[key] || S.blocked[key]) { SND.error(); return null; }
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    if (S.credits < def.cost) { SND.error(); return null; }
    S.credits -= def.cost;
    const t = {
      tid: uid(), defRef: def, c, r,
      x: c * CELL + CELL / 2, y: r * CELL + CELL / 2,
      level: 1, spent: def.cost, kills: 0, damageDealt: 0,
      angle: -Math.PI / 2, aimAngle: -Math.PI / 2,
      cooldown: 0, recoil: 0, flash: 0, rampTime: 0, lastTargetEid: null,
      targetMode: 'FIRST', specBranch: null, beamTarget: null
    };
    initF2TowerState(t, c, r, def); // F2-sim R1: fuel/batt/ammo cheios + comp/stance/ax/ay
    S.towers.push(t);
    S.occupied[key] = t;
    bumpAmpVersion(S);
    SND.build();
    ev(S, { t: 'buildFx', x: t.x, y: t.y, col: def.color });
    return t;
  }

  function upgradeCost(t) { const base=t.defRef.cost; return Math.round(base * (0.72 + t.level * 0.42 * Math.pow(1.03, t.level/12))); }
  function sellValue(t) { return Math.round(t.spent * 0.7); }

  function isLiveTower(S, t) {
    if (!S || !t) return false;
    if (S.towers.indexOf(t) < 0) return false;
    if (S.occupied[t.c + ',' + t.r] !== t) return false;
    return true;
  }
  function upgradeTower(S, t) {
    if (!isLiveTower(S, t) || t.level >= D.TOWER_MAX_LVL || isF2BuildingKind(t.defRef.kind)) { SND.error(); return false; }
    // v3 PIXEL FASE 2: upgrade trava no teto do tier — precisa FUNDIR
    if (t.level >= tierCap(t)) {
      SND.error();
      ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: 'FUNDA 2 IGUAIS PRA SUBIR DE TIER', col: '#fbbf24', size: 10 });
      return false;
    }
    const cost = upgradeCost(t);
    if (S.credits < cost) { SND.error(); return false; }
    S.credits -= cost;
    t.spent += cost;
    t.level++;
    bumpAmpVersion(S);
    SND.upgrade();
    ev(S, { t: 'lvlFx', x: t.x, y: t.y, col: t.defRef.color });
    if (t.level >= D.TOWER_MAX_LVL) unlockAchievement('max_tower');
    return true;
  }

  /* ---- F4-comp C1: compra de pips de componente (atômica, sem débito parcial) ---- */
  // DO.buyComp(S,t,track): track em w|e|r|t; custo do próximo pip em COMP_DEFS.levels[cur]
  // (créditos + peças); debita, comp[track]++, t.spent+=créditos. Erro via SND como upgradeTower.
  function buyComp(S, t, track) {
    if (!S || !t) { SND.error(); return false; }
    if (track !== 'w' && track !== 'e' && track !== 'r' && track !== 't') { SND.error(); return false; }
    if (!isLiveTower(S, t)) { SND.error(); return false; }
    if (!t.comp) t.comp = { w: 0, e: 0, r: 0, t: 0 };
    var cur = t.comp[track] | 0;
    if (cur >= 5) { SND.error(); return false; }
    var cdef = D.COMP_DEFS && D.COMP_DEFS[track];
    if (!cdef || !cdef.levels || !cdef.levels[cur]) { SND.error(); return false; }
    var lv = cdef.levels[cur];
    var cc = lv.credits || 0, pc = lv.parts || 0;
    if ((S.credits || 0) < cc || (S.parts || 0) < pc) { SND.error(); return false; }
    S.credits -= cc;
    if (pc) S.parts -= pc;
    t.comp[track] = cur + 1;
    t.spent = (t.spent || 0) + cc;
    bumpAmpVersion(S);
    SND.upgrade();
    ev(S, { t: 'lvlFx', x: t.x, y: t.y, col: '#fbbf24' });
    return true;
  }

  function sellTower(S, t) {
    if (!isLiveTower(S, t)) { SND.error(); return false; }
    SND.laserStop('L' + t.tid); // Brief 07 A12: vender torre de laser cala o beam
    const val = sellValue(t);
    S.credits += val;
    const i = S.towers.indexOf(t);
    if (i >= 0) S.towers.splice(i, 1);
    delete S.occupied[t.c + ',' + t.r];
    bumpAmpVersion(S);
    SND.sell();
    ev(S, { t: 'sellFx', x: t.x, y: t.y, val });
    return true;
  }

  function setSpec(S, t, branch) {
    if (!t || t.level < 4 || t.specBranch) return false;
    if (branch !== 'A' && branch !== 'B') return false;
    t.specBranch = branch;
    bumpAmpVersion(S);
    SND.upgrade();
    ev(S, { t: 'lvlFx', x: t.x, y: t.y, col: t.defRef.color });
    return true;
  }

  function cycleTargetMode(t) {
    const i = D.TARGET_MODES.indexOf(t.targetMode);
    t.targetMode = D.TARGET_MODES[(i + 1) % D.TARGET_MODES.length];
    SND.ui();
    return t.targetMode;
  }

  /* ---- v3 PIXEL FASE 2: tiers travam upgrade no teto; FUNDIR 3 iguais → sobe 1 tier ---- */
  function tierCap(t) { return Math.min(5, D.getTier(t.level)) * 10; }
  function mergeCandidates(S, t) {
    const tier = D.getTier(t.level);
    return S.towers.filter(o => o !== t && !isF2BuildingKind(o.defRef.kind) && (o.defRef.id === t.defRef.id) && D.getTier(o.level) === tier);
  }
  function canMerge(S, t) {
    if (!isLiveTower(S, t) || isF2BuildingKind(t.defRef.kind) || t.level >= D.TOWER_MAX_LVL) return false;
    if (t.level < tierCap(t)) return false; // só funde no teto do tier
    return mergeCandidates(S, t).length >= 2;
  }
  function tierEntryPrice(def, tier) {
    if (!def || isF2BuildingKind(def.kind)) return { credits: 0, parts: 0 };
    const targetTier = Math.max(1, Math.min(5, tier || 1));
    let credits = def.cost;
    let parts = 0;
    for (let currentTier = 1; currentTier < targetTier; currentTier++) {
      const mock = { defRef: def, level: (currentTier - 1) * 10 + 1 };
      let upgrades = 0;
      while (mock.level < currentTier * 10) {
        upgrades += upgradeCost(mock);
        mock.level++;
      }
      credits = credits * 3 + upgrades;
      parts = parts * 3 + (D.MERGE_PARTS[currentTier] || 0);
    }
    return { credits, parts };
  }
  function mergePurchaseQuote(S, t) {
    if (!isLiveTower(S, t) || isF2BuildingKind(t.defRef.kind) || t.level >= D.TOWER_MAX_LVL || t.level < tierCap(t)) return null;
    const tier = D.getTier(t.level);
    const existing = Math.min(2, mergeCandidates(S, t).length);
    const missing = 2 - existing;
    const entry = tierEntryPrice(t.defRef, tier);
    return {
      tier,
      existing,
      missing,
      credits: missing * entry.credits,
      parts: (D.MERGE_PARTS[tier] || 0) + missing * entry.parts
    };
  }
  function finishMerge(S, t, others, tier, direct, purchasedCredits) {
    let consumed = 0;
    for (const o of others) { consumed += (o.spent || 0); sellTowerRaw(S, o); }
    t.spent = (t.spent || 0) + consumed + (purchasedCredits || 0);
    t.level = tier * 10 + 1;
    bumpAmpVersion(S); // Onda 2 perf: tier-up invalida cache (vizinhos de amp mudam de nível)
    // V8: tier-up celebration — flash + pop de escala na torre (via flash/recoil) + anéis + float TIER ★ (~1s)
    t.flash = 0.35;
    t.recoil = 1.6;
    SND.upgrade();
    // Brief 07 A1: stingers de fusão (guard: sfx-extra pode não estar carregado)
    if (SND.tierUp) SND.tierUp();
    if (SND.merge) SND.merge();
    ev(S, { t: 'banner', txt: defName(t) + (direct ? ' COMPLETOU A FUSÃO' : ' FUNDIRAM') + ' → TIER ' + (tier + 1) + '!', col: '#fbbf24', strong: true });
    ev(S, { t: 'ring', x: t.x, y: t.y, maxR: CELL * 3, col: '#fbbf24' });
    ev(S, { t: 'ring', x: t.x, y: t.y, maxR: CELL * 4, col: '#ffffff' });
    ev(S, { t: 'float', x: t.x, y: t.y - 30, txt: 'TIER ' + (tier + 1) + ' ★', col: '#fbbf24', size: 18 });
    ev(S, { t: 'lvlFx', x: t.x, y: t.y, col: '#fbbf24' });
    if (t.level >= D.TOWER_MAX_LVL) unlockAchievement('max_tower');
    return t;
  }
  function mergeTowers(S, t) {
    if (!canMerge(S, t)) { SND.error(); return null; }
    const tier = D.getTier(t.level);
    const others = mergeCandidates(S, t).slice(0, 2);
    if (others.length < 2) { SND.error(); return null; }
    const partsCost = D.MERGE_PARTS[tier] || 0;
    if ((S.parts || 0) < partsCost) { SND.error(); ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: 'PEÇAS INSUFICIENTES', col: '#f43f5e', size: 11 }); return null; }
    S.parts -= partsCost;
    return finishMerge(S, t, others, tier, false, 0); // consumidas SEM reembolso
  }
  function mergeWithPurchase(S, t) {
    const quote = mergePurchaseQuote(S, t);
    if (!quote) { SND.error(); return null; }
    if (quote.missing === 0) return mergeTowers(S, t);
    const others = mergeCandidates(S, t).slice(0, quote.existing);
    if (others.length !== quote.existing) { SND.error(); return null; }
    if (S.credits < quote.credits) {
      SND.error();
      ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: 'CRÉDITOS INSUFICIENTES', col: '#f43f5e', size: 11 });
      return null;
    }
    if ((S.parts || 0) < quote.parts) {
      SND.error();
      ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: 'PEÇAS INSUFICIENTES', col: '#f43f5e', size: 11 });
      return null;
    }
    S.credits -= quote.credits;
    S.parts -= quote.parts;
    return finishMerge(S, t, others, quote.tier, true, quote.credits);
  }
  function defName(t) { const d = t.defRef || t.def; return d ? d.name : ''; }
  function sellTowerRaw(S, t) {
    SND.laserStop('L' + t.tid); // Brief 07 A12: fusão consome sem reembolso mas cala o beam
    const i = S.towers.indexOf(t);
    if (i >= 0) S.towers.splice(i, 1);
    if (S.occupied[t.c + ',' + t.r] === t) delete S.occupied[t.c + ',' + t.r];
    bumpAmpVersion(S);
    ev(S, { t: 'boom', x: t.x, y: t.y, r: 20, col: '#8fa3c4', big: false });
  }

  /* ---- v3 PIXEL FASE 5: FÁBRICA + LABORATÓRIO HIVEMIND ---- */
  function placeFactory(S, c, r) {
    const fd = D.FACTORY_DATA;
    const key = c + ',' + r;
    if (S.occupied[key] || S.blocked[key]) { SND.error(); return null; }
    if (c < 0 || c >= COLS || r >= ROWS || r < 0) return null;
    if (S.credits < fd.cost) { SND.error(); return null; }
    S.credits -= fd.cost;
    const t = {
      tid: uid(), defRef: fd, c, r,
      x: c * CELL + CELL / 2, y: r * CELL + CELL / 2,
      level: 1, spent: fd.cost, kills: 0, damageDealt: 0,
      angle: -Math.PI / 2, aimAngle: -Math.PI / 2,
      cooldown: 0, recoil: 0, flash: 0, rampTime: 0, lastTargetEid: null,
      targetMode: 'FIRST', specBranch: null, beamTarget: null
    };
    initF2TowerState(t, c, r, { fuelCap: 100, battCap: 100, ammoCap: 0 }); // F2-sim: prédio também carrega estado
    S.towers.push(t);
    S.occupied[key] = t;
    SND.build();
    if (SND.factory) SND.factory(); // Brief 07 A1: martelo industrial ao colocar fábrica
    ev(S, { t: 'buildFx', x: t.x, y: t.y, col: fd.color });
    return t;
  }
  /* ---- F2-sim E1/E2: estação/apoio como factory (prédio sem tiro/level) ---- */
  function placeStation(S, c, r) {
    const sd = D.STATION_DATA;
    if (!sd) return null;
    const key = c + ',' + r;
    if (S.occupied[key] || S.blocked[key]) { SND.error(); return null; }
    if (c < 0 || c >= COLS || r >= ROWS || r < 0) return null;
    if (S.credits < sd.cost) { SND.error(); return null; }
    S.credits -= sd.cost;
    const t = {
      tid: uid(), defRef: sd, c, r,
      x: c * CELL + CELL / 2, y: r * CELL + CELL / 2,
      level: 1, spent: sd.cost, kills: 0, damageDealt: 0,
      angle: -Math.PI / 2, aimAngle: -Math.PI / 2,
      cooldown: 0, recoil: 0, flash: 0, rampTime: 0, lastTargetEid: null,
      targetMode: 'FIRST', specBranch: null, beamTarget: null
    };
    initF2TowerState(t, c, r, { fuelCap: 100, battCap: 100, ammoCap: 0 });
    S.towers.push(t);
    S.occupied[key] = t;
    SND.build();
    ev(S, { t: 'buildFx', x: t.x, y: t.y, col: sd.color });
    return t;
  }
  function placeSupport(S, c, r) {
    const sd = D.SUPPORT_DATA;
    if (!sd) return null;
    const key = c + ',' + r;
    if (S.occupied[key] || S.blocked[key]) { SND.error(); return null; }
    if (c < 0 || c >= COLS || r >= ROWS || r < 0) return null;
    if (S.credits < sd.cost) { SND.error(); return null; }
    S.credits -= sd.cost;
    const t = {
      tid: uid(), defRef: sd, c, r,
      x: c * CELL + CELL / 2, y: r * CELL + CELL / 2,
      level: 1, spent: sd.cost, kills: 0, damageDealt: 0,
      angle: -Math.PI / 2, aimAngle: -Math.PI / 2,
      cooldown: 0, recoil: 0, flash: 0, rampTime: 0, lastTargetEid: null,
      targetMode: 'FIRST', specBranch: null, beamTarget: null
    };
    initF2TowerState(t, c, r, { fuelCap: 100, battCap: 100, ammoCap: 0 });
    S.towers.push(t);
    S.occupied[key] = t;
    SND.build();
    ev(S, { t: 'buildFx', x: t.x, y: t.y, col: sd.color });
    return t;
  }
  function upgradeFactory(S, t) {
    if (!t || t.defRef.kind !== 'factory' || t.level >= D.FACTORY_DATA.maxLevel) { SND.error(); return false; }
    const cc = D.FACTORY_DATA.upgradeCreditCost(t.level), pc = D.FACTORY_DATA.upgradePartsCost(t.level);
    if (S.credits < cc || (S.parts || 0) < pc) { SND.error(); return false; }
    S.credits -= cc; S.parts -= pc;
    t.spent += cc; t.level++;
    SND.upgrade();
    if (SND.factory) SND.factory(); // Brief 07 A1: martelo industrial ao upar fábrica
    ev(S, { t: 'lvlFx', x: t.x, y: t.y, col: D.FACTORY_DATA.color });
    return true;
  }
  function upgradeEnemyHP(S) { // laboratório Hivemind: paga peças → inimigos +12% HP / +8% ouro por nível
    const cost = D.HIVEMIND.cost(S.enemyHpLevel || 0);
    if ((S.parts || 0) < cost) { SND.error(); return false; }
    S.parts -= cost;
    S.enemyHpLevel = (S.enemyHpLevel || 0) + 1;
    if (SND.lab) SND.lab(); // Brief 07 A1: bolha científica do Hivemind
    ev(S, { t: 'banner', txt: '🧬 HIVEMIND NÍVEL ' + S.enemyHpLevel + ' — INIMIGOS +12% HP', col: '#a3e635' });
    return true;
  }

  /* ---- Fluxo de ondas ---- */
  function startNextWave(S) {
    if (S.state !== 'idle') return false;
    const total = S.endless ? Infinity : S.map.waves.length;
    if (S.wave >= total) return false;
    S.wave++;
    S.state = 'combat';
    S.waveStartTime = S.time;
    let str;
    if (S.endless && S.wave > S.map.waves.length) {
      str = D.makeEndlessWave(S.wave);
      // BAL2: 1.06→1.07 (endless aperta um pouco mais no late, compensa autos ainda presentes)
      S.endlessHpMul = Math.pow(1.07, S.wave - S.map.waves.length);
    } else {
      str = S.map.waves[S.wave - 1];
      S.endlessHpMul = 1;
    }
    S.waveQueue = D.parseWaveString(str);
    // +30% inimigos A CADA 10 NÍVEIS entrando POR VEZ (simultâneos) — 11-20 +30%, 21-30 +60%, etc
    // só para ondas normais (endless já escala via budget+count)
    if (!(S.endless && S.wave > S.map.waves.length) && D.getWaveSpawnMultiplier) {
      const mult = D.getWaveSpawnMultiplier(S.wave);
      if (mult > 1) {
        const base = S.waveQueue.slice();
        const extraCount = Math.round(base.length * (mult - 1));
        for (let i = 0; i < extraCount; i++) {
          const src = base[i % base.length];
          // G-a G12-true: gap temporal progressivo 0.15s/clone (antes: mesmo tick + jitter 0-80ms)
          S.waveQueue.push({ at: src.at + 0.15 * (i + 1) + Math.random() * 0.05, type: src.type });
        }
        S.waveQueue.sort((a, b) => a.at - b.at);
      }
    }
    S.autoWaveTimer = 0;
    if (str.indexOf('B') >= 0) {
      ev(S, { t: 'banner', txt: 'ALERTA MÁXIMO: NAVE-MÃE DETECTADA!', col: '#f43f5e', strong: true });
      SND.bossAlert();
    } else {
      ev(S, { t: 'banner', txt: 'ONDA ' + S.wave, col: '#38bdf8' });
    }
    SND.waveStart();
    return true;
  }

  function waveSummary(str) {
    const counts = [];
    const map = {};
    D.parseWaveString(str).forEach(item => {
      if (!map[item.type]) { map[item.type] = { type: item.type, count: 0 }; counts.push(map[item.type]); }
      map[item.type].count++;
    });
    return counts;
  }

  function peekNextWave(S) {
    const n = S.wave + 1;
    if (!S.endless && n > S.map.waves.length) return null;
    const str = (S.endless && n > S.map.waves.length) ? D.makeEndlessWave(n) : S.map.waves[n - 1];
    const base = waveSummary(str);
    // aplica +30% por vez a cada 10 níveis no preview também (só ondas normais)
    if (!(S.endless && n > S.map.waves.length) && D.getWaveSpawnMultiplier) {
      const mult = D.getWaveSpawnMultiplier(n);
      if (mult > 1) {
        // escala cada tipo proporcionalmente
        base.forEach(entry => {
          entry.count = Math.round(entry.count * mult);
        });
      }
    }
    return base;
  }

  function onWaveCleared(S) {
    // v3 PIXEL FASE 5: peças por onda + produção das fábricas
    S.parts = (S.parts || 0) + 2;
    let factoryParts = 0, factoryCredits = 0;
    for (const t of S.towers) {
      if (t.defRef.kind !== 'factory') continue;
      const p = D.FACTORY_DATA.partsPerWave(t.level), cr = D.FACTORY_DATA.creditsPerWave(t.level);
      S.parts += p; factoryParts += p;
      S.credits += cr; S.creditsEarned += cr; factoryCredits += cr;
      ev(S, { t: 'float', x: t.x, y: t.y - 20, txt: '+' + p + '⚙ +' + cr + 'cr', col: '#34d399', size: 12 });
    }
    if (factoryParts > 0) ev(S, { t: 'banner', txt: 'FÁBRICA: +' + factoryParts + '⚙ +' + factoryCredits + ' CRÉDITOS', col: '#34d399' });
    // G8: bônus de fim de onda com combo capado em +100%
    // BAL2: base 60→66 (+10%, Recruta vencível errando um pouco; slope intacto)
    const bonus = Math.round((66 + S.wave * 15) * (S.endless ? 1.5 : 1) * (1 + Math.min(1, (S.combo||0)*0.02)));
    S.credits += bonus;
    S.creditsEarned += bonus;
    ev(S, { t: 'float', x: BW / 2, y: BH / 2, txt: '+' + bonus + ' ONDA COMPLETA!', col: '#fbbf24', size: 18 });
    if(S.combo >= 8) ev(S, { t:'float', x:BW/2, y:BH/2-28, txt:'COMBO x'+S.combo+' BÔNUS!', col:'#34d399', size:14 });
    SND.waveClear ? SND.waveClear() : SND.coin();
    // Final de campanha tem prioridade sobre mutação (senão trava na 12/12)
    if (!S.endless && S.wave >= S.map.waves.length) { finalizeEnd(S, 'victory'); return; }
    if (S.endless) {
      const best = D.Save.data.bestEndless[S.mapIdx] || 0;
      if (S.wave > best) { D.Save.data.bestEndless[S.mapIdx] = S.wave; D.Save.save(); }
      if (S.wave >= 30) unlockAchievement('endless_30');
      // mutação a cada 3 ondas também no endless, mas antes do idle
      if(S.wave % 3 === 0){
        const choices = D.getMutationChoices(S.wave*17 + S.mapIdx*31 + S.kills, 3);
        S.pendingMut = true;
        S.mutChoices = choices;
        S.state = 'mutate';
        S.autoWaveTimer = 0;
        ev(S, { t:'mutation', wave:S.wave, choices: choices });
        try{ SND.mutation(); }catch(e){}
        return;
      }
      S.state = 'idle';
      S.autoWaveTimer = 6.0;
      ev(S, { t: 'banner', txt: 'ONDA ' + S.wave + ' SUPERADA ∞', col: '#38bdf8' });
      return;
    }
    if(S.wave % 3 === 0){
      const choices = D.getMutationChoices(S.wave*17 + S.mapIdx*31 + S.kills, 3);
      S.pendingMut = true;
      S.mutChoices = choices;
      S.state = 'mutate';
      S.autoWaveTimer = 0;
      ev(S, { t:'mutation', wave:S.wave, choices: choices });
      try{ SND.mutation(); }catch(e){}
      return;
    }

    if (S.endless) {
      const best = D.Save.data.bestEndless[S.mapIdx] || 0;
      if (S.wave > best) { D.Save.data.bestEndless[S.mapIdx] = S.wave; D.Save.save(); }
      if (S.wave >= 30) unlockAchievement('endless_30');
      S.state = 'idle';
      S.autoWaveTimer = 6.0;
      ev(S, { t: 'banner', txt: 'ONDA ' + S.wave + ' SUPERADA \u221E', col: '#38bdf8' });
      return;
    }
    if (S.wave >= S.map.waves.length) { finalizeEnd(S, 'victory'); return; }
    S.state = 'idle';
    S.autoWaveTimer = 6.0;
  }

  function applyMutation(S, mutId){
    if(!S.pendingMut || !S.mutChoices) return false;
    const mut = S.mutChoices.find(m=> m.id===mutId) || D.MUTATIONS.find(m=>m.id===mutId);
    if(!mut) return false;
    try{ mut.apply(S); }catch(e){}
    S.mutHistory.push(mut.id);
    S.pendingMut = false;
    S.mutChoices = null;
    S.state = 'idle';
    S.autoWaveTimer = 6.0;
    ev(S, { t:'mutPicked', name:mut.name, col:mut.color, icon:mut.icon });
    ev(S, { t:'banner', txt: mut.icon+' '+mut.name.toUpperCase()+' ATIVADO!', col: mut.color });
    try{ SND.mutPick(); }catch(e){}
    return true;
  }
  function skipMutation(S){
    if(!S.pendingMut) return false;
    S.pendingMut=false; S.mutChoices=null; S.state='idle'; S.autoWaveTimer=6.0;
    ev(S, { t:'banner', txt:'MUTAÇÃO IGNORADA', col:'#8fa3c4' });
    return true;
  }
  // G10: toggle do auto-movimento (headless + HUD)
  function toggleAutoMove(S) {
    if (!S) return false;
    S.autoMove = !(S.autoMove !== false);
    return S.autoMove;
  }
  function unlockAchievement(id) { return D.Save.unlock(id); }

  function finalizeEnd(S, outcome) {
    S.state = outcome;
    if (outcome === 'victory') {
      SND.victory();
      // Brief 07 A11: trilha de vitória (setMode valida o modo; fallback = musicTick)
      if (SND.setMode) SND.setMode('victory'); else SND.musicTick('victory');
      const stars = S.lives >= Math.ceil(S.livesMax * 0.9) ? 3 : (S.lives >= Math.ceil(S.livesMax * 0.5) ? 2 : 1);
      const cur = D.Save.data.mapStars[S.mapIdx] || 0;
      if (stars > cur) D.Save.data.mapStars[S.mapIdx] = stars;
      const crystals = Math.round((15 + stars * 10 + S.mapIdx * 10) * S.diff.crystalBonus);
      D.Save.data.crystals += crystals;
      // unlockedMap é 1-based: vencer o mapa 0 libera o mapa 2, vencer o 1 libera o 3 etc.
      D.Save.data.unlockedMap = Math.min(
        D.MAPS_DATA.length,
        Math.max(Number(D.Save.data.unlockedMap) || 1, S.mapIdx + 2)
      );
      if (S.mapIdx === 0) unlockAchievement('map1_clear');
      if (D.MAPS_DATA.every((_, i) => (D.Save.data.mapStars[i] || 0) > 0)) unlockAchievement('all_maps');
      if (S.leaks === 0 && S.map.waves.length >= 10) unlockAchievement('no_leak_10');
      if (S.diff.key === 'veteran') unlockAchievement('hard_win');
      if (S.diff.key === 'insane') unlockAchievement('insane_win');
      D.Save.save();
      S.result = { outcome, stars, crystals, kills: S.kills, credits: S.creditsEarned };
    } else {
      SND.defeat();
      // Brief 07 A2: lamento de vida perdida na derrota (antes: só o leak por vazamento)
      if (SND.lifeLost) SND.lifeLost();
      // Brief 07 A11: trilha de derrota (modo novo em audio.js; fallback = musicTick)
      if (SND.setMode) SND.setMode('defeat'); else SND.musicTick('defeat');
      const crystals = Math.max(5, Math.floor(S.wave * 2));
      D.Save.data.crystals += crystals;
      let topLeak = null, topN = 0;
      for (const k in S.leakCounts) if (S.leakCounts[k] > topN) { topN = S.leakCounts[k]; topLeak = k; }
      const diag = topLeak
        ? (S.leakedFlying
          ? 'Voadores romperam a linha! Precisa de mais defesa anti-aérea (Laser/Tesla/Sniper).'
          : 'Principal invasor que vazou: ' + topLeak + ' (x' + topN + '). Reforce a rota dele.')
        : 'O portal planetário foi invadido.';
      D.Save.save();
      S.result = { outcome, crystals, kills: S.kills, credits: S.creditsEarned, diag };
    }
    ev(S, { t: 'gameEnd', outcome: S.state });
  }

  function continueEndlessAfterVictory(S) {
    if (!S || !S.result || S.result.outcome !== 'victory') return false;
    S.endless = true;
    S.state = 'idle';
    S.result = null;
    S.pendingMut = false;
    S.mutChoices = null;
    S.autoWaveTimer = 0;
    S.endlessHpMul = 1;
    ev(S, { t: 'banner', txt: 'MODO INFINITO ATIVADO — DEFENDA ATÉ CAIR!', col: '#38bdf8', strong: true });
    return true;
  }

  /* ---- Simulação principal (dt em segundos) ---- */
  function stepSim(S, dt) {
    if (S.state === 'victory' || S.state === 'defeat') return;
    if (S.hitStop > 0) { S.hitStop -= dt; return; }
    if (S.chrono > 0) { S.chrono -= dt; dt *= 0.22; }
    if(S.combo > 0){
      S.comboTimer -= dt;
      if(S.comboTimer <= 0){ const old=S.combo; S.combo=0; S.comboTimer=0; ev(S,{t:'comboBreak', prev:old}); }
    }
    // Auto-resolve mutation for headless / smoke tests (if UI not handling)
    if(S.pendingMut && S.mutChoices){
      S._mutAuto = (S._mutAuto||0) + dt;
      if(S._mutAuto > 0.26){
        applyMutation(S, S.mutChoices[0].id);
        S._mutAuto = 0;
      }
    } else {
      S._mutAuto = 0;
    }
    S.time += dt;

    for (const k in S.powers) {
      const p = S.powers[k];
      if (p.cd > 0) p.cd = Math.max(0, p.cd - dt);
      if (p.dur > 0) p.dur = Math.max(0, p.dur - dt);
    }
    // G-a G3: overdriveBuff da amp decai em ~6s (era escrito e nunca lido/decrementado)
    if (S.overdriveBuff > 0) S.overdriveBuff = Math.max(0, S.overdriveBuff - dt);

    // Spawner
    while (S.waveQueue.length > 0 && S.waveQueue[0].at <= (S.time - S.waveStartTime)) {
      spawnEnemy(S, S.waveQueue.shift().type);
    }

    // Inimigos
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      const e = S.enemies[i];
      if (e.dead) { S.enemies.splice(i, 1); continue; }

      if (e.poisonTimer > 0) {
        e.poisonTimer -= dt;
        damageEnemy(S, e, e.poisonDps * dt, { pure: true });
        if (e.dead) continue;
      }
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        damageEnemy(S, e, e.burnDps * dt, { pure: true });
        if (e.dead) continue;
      }
      if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowFactor = 1; }
      if (e.stunTimer > 0) e.stunTimer -= dt;
      if (e.cryoVuln > 0) e.cryoVuln -= dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.markedTimer > 0) e.markedTimer -= dt;

      if (e.defRef.heals) {
        e.healCooldown -= dt;
        if (e.healCooldown <= 0) {
          e.healCooldown = 0.6;
          for (const o of S.enemies) {
            if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 90 && o.hp < o.maxHp) {
              o.hp = Math.min(o.maxHp, o.hp + 6);
              ev(S, { t: 'healFx', x: o.x, y: o.y });
            }
          }
        }
      }
      if (e.defRef.stealth) e.stealthPhase = S.time % 2.5;

      if (e.defRef.isBoss && !e.raged && e.hp < e.maxHp * 0.5) {
        e.raged = true;
        ev(S, { t: 'banner', txt: 'FASE DE FÚRIA: ' + e.label.toUpperCase(), col: '#f43f5e', strong: true });
        ev(S, { t: 'rage', eid: e.eid });
      }

      const rageMul = e.raged ? 1.3 : 1;
      const curSpeed = e.speed * e.slowFactor * rageMul * (e.stunTimer > 0 ? 0 : 1);
      e.dist += curSpeed * dt;

      if (e.dist >= e.totalLen) {
        e.leaked = true; e.dead = true;
        const dmg = e.defRef.dmg || 1;
        S.lives -= dmg;
        S.leaks++;
        S.leakCounts[e.label] = (S.leakCounts[e.label] || 0) + 1;
        if (e.flying) S.leakedFlying = true;
        // V10: shake direcional — lado do vazamento (sempre borda direita; dx=-1 empurra p/ esquerda)
        ev(S, { t: 'leak', x: BW - 30, y: e.y, dmg, flying: e.flying, dx: -1, dy: 0 });
        SND.leak();
        ev(S, { t: 'float', x: BW - 40, y: e.y, txt: '-' + dmg, col: '#f43f5e', size: 16 });
        if (e.defRef.isBoss) S.activeBoss = strongerLivingBoss(S); // Onda 1.6: não apaga a barra de outro chefe vivo
        if (S.lives <= 0) { finalizeEnd(S, 'defeat'); return; }
        continue;
      }

      const pts = e.flying ? S.airPts : S.routes[e.routeIdx];
      const pos = D.getPosAtDist(pts, e.dist);
      const nxt = D.getPosAtDist(pts, Math.min(e.dist + 4, e.totalLen));
      e.x = pos.x; e.y = pos.y;
      e.dirAngle = Math.atan2(nxt.y - pos.y, nxt.x - pos.x);
      e.progress = e.dist / e.totalLen;
    }

    // Torres
    for (const t of S.towers) {
      const def = t.defRef || t.def;
      if (t.flash > 0) t.flash -= dt;
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      if ((t._warnCd || 0) > 0) t._warnCd = Math.max(0, t._warnCd - dt); // F2-sim: throttle do aviso 1×/s
      // F2-sim R2/E3: recarga por segundo (station/support → torres), clamp nos maxs efetivos (reator)
      if (t.fuel != null || t.batt != null || t.ammo != null) {
        try {
          var rs = getResupply(S, t);
          if (rs.fuel > 0 && t.fuel != null) t.fuel = Math.min(getMaxFuel(t), t.fuel + rs.fuel * dt);
          if (rs.batt > 0 && t.batt != null) t.batt = Math.min(getMaxBatt(t), t.batt + rs.batt * dt);
          if (rs.ammo > 0 && t.ammo != null) t.ammo = Math.min(getMaxAmmo(t), t.ammo + rs.ammo * dt);
        } catch (_) {}
      }

      // G2: fila de supers automáticos — dispara sozinho quando cheio (incl. amp/buff)
      if (D.SUPERS_AUTO[def.id]) fireAutoSuperIfReady(S, t);
      // v3 PIXEL FASE 5: fábrica não combate — pula alvo/tiro/buff (F2-sim: station/support também)
      if (isF2BuildingKind(def.kind)) continue;
      const stats = getTowerStats(S, t);
      // Onda 1.4: cryo spec B (Nevasca Permanente) — aura passiva real: slow a cada 0.5s
      // nos inimigos no alcance, sem consumir batt/ammo e sem ev de tiro.
      if (def.id === 'cryo' && t.specBranch === 'B') {
        t._auraAcc = (t._auraAcc || 0) + dt;
        if (t._auraAcc >= 0.5) {
          t._auraAcc -= 0.5;
          var _auraMut = (S.mutBuffs && S.mutBuffs.cryo) || 0;
          var _auraSq = getRngSqEff(stats) * (1 + 0.2 * _auraMut);
          for (const _ae of S.enemies) {
            if (_ae.dead || _ae.leaked || (_ae.defRef && _ae.defRef.slowImmune)) continue;
            if (chebTowerEnemy(t, _ae) > _auraSq + 1e-9) continue;
            _ae.slowTimer = Math.max(_ae.slowTimer || 0, 1.0 * (1 + 0.4 * _auraMut));
            _ae.slowFactor = Math.min(_ae.slowFactor || 1, 0.85);
          }
        }
      }
      // Onda 2: cryo T4 Aura de Frio — slow passivo 15% em raio, sem custo (independente de spec)
      if (def.id === 'cryo') {
        const _ct = D.getTier(t.level);
        const _clA = (D.TIER_LOGIC.cryo && D.TIER_LOGIC.cryo[_ct] && D.TIER_LOGIC.cryo[_ct].eff) || null;
        if (_clA && _clA.coldAura) {
          t._coldAcc = (t._coldAcc || 0) + dt;
          if (t._coldAcc >= 0.5) {
            t._coldAcc -= 0.5;
            var _caMut = (S.mutBuffs && S.mutBuffs.cryo) || 0;
            var _caSq = getRngSqEff(stats) * (1 + 0.2 * _caMut);
            for (const _ce of S.enemies) {
              if (_ce.dead || _ce.leaked || (_ce.defRef && _ce.defRef.slowImmune)) continue;
              if (chebTowerEnemy(t, _ce) > _caSq + 1e-9) continue;
              _ce.slowTimer = Math.max(_ce.slowTimer || 0, 1.0);
              _ce.slowFactor = Math.min(_ce.slowFactor || 1, 1 - _clA.coldAura);
            }
          }
        }
      }
      // F3-pursue: postura pursue move 1 célula/intervalo (base 1 célula/s × moveMul do Motor)
      // RANGESQ: leash em □ = 1.5×rngSqEff + fração Motor (leashMul-1); fuel<20% fora da âncora ou 3s sem alvo → retorna
      // REFUEL: fuel<25% com station/support no mapa → refuel=true e voa à fonte MAIS PRÓXIMA
      // (qualquer distância, ignora leash); reserva 30% sem fuel; atraca no supplySq até >=90%
      if ((t.stance || 'anchor') === 'pursue' && def.kind !== 'buff' && S.state !== 'victory' && S.state !== 'defeat') {
        var _eng = getEngineMul(t);
        var _anch = pursueAnchorXY(t);
        var _atAnchor = (t.c === _anch.ax && t.r === _anch.ay);
        var _maxFuel = getMaxFuel(t);
        var _classicLow = (t.fuel != null && _maxFuel > 0 && t.fuel < 0.2 * _maxFuel);
        var _refuelLow = (t.fuel != null && _maxFuel > 0 && t.fuel < 0.25 * _maxFuel);
        var _hasSupply = hasResupplyOnMap(S);
        var _rngSqP = getRngSqEff(stats);
        var _leashSq = 1.5 * _rngSqP + ((_eng.leashMul || 1) - 1); // RANGESQ: Motor soma fração (e=2 → +0.20□)
        var _leash = _leashSq * CELL; // legado px p/ compat visual (lógica usa _leashSq)
        var _interval = 1.0 / (_eng.moveMul || 1);
        t._pursueAcc = (t._pursueAcc || 0) + dt;
        if (t._noTargetT == null) t._noTargetT = 0;
        if (t.returning == null) t.returning = false;
        if (t.refuel == null) t.refuel = false;
        if (t._refuelTid == null) t._refuelTid = null;
        if (t._refuelDocked == null) t._refuelDocked = false;
        // REFUEL entrada: muda SÓ o destino do retorno-low-fuel (fora da âncora + fontes no mapa)
        if (!t.refuel && _hasSupply && _refuelLow && !_atAnchor) {
          var _nr0 = nearestResupply(S, t);
          if (_nr0) { t.refuel = true; t.returning = false; t._refuelDocked = false; t._refuelTid = _nr0.tid; }
        }
        var _tgtP = null;
        var _wantHome = false;
        var _refuelHandled = false;
        var _refuelExitHome = false;
        if (t.refuel) {
          var _rt = null;
          try {
            if (t._refuelTid != null) {
              for (var _ri = 0; _ri < S.towers.length; _ri++) {
                var _ro = S.towers[_ri];
                if (_ro && _ro.tid === t._refuelTid) {
                  var _rod = _ro.defRef || _ro.def;
                  if (_rod && (_rod.kind === 'station' || _rod.kind === 'support')) _rt = _ro;
                  break;
                }
              }
            }
          } catch (_) { _rt = null; }
          if (!_rt) { _rt = nearestResupply(S, t); if (_rt) t._refuelTid = _rt.tid; }
          if (!_rt) {
            t.refuel = false; t._refuelDocked = false; t._refuelTid = null;
          } else if (t.fuel != null && _maxFuel > 0 && t.fuel >= 0.9 * _maxFuel) {
            t.refuel = false; t._refuelDocked = false; t._refuelTid = null;
            t.returning = true; t._noTargetT = 3; t._pursueAcc = 0;
            ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: '✔ TANQUE CHEIO', col: '#4ade80', size: 11 });
            t._warnCd = Math.max(t._warnCd || 0, 1.0);
            _refuelHandled = true; _refuelExitHome = true; _wantHome = !_atAnchor;
          } else {
            // RANGESQ: atraque em □ Chebyshev (supplySq) — station 4□, support 2□
            var _dockSrc = null, _dockD = Infinity;
            var _tCellD = towerCell(t);
            for (var _si = 0; _si < S.towers.length; _si++) {
              var _so = S.towers[_si];
              if (_so === t) continue;
              var _sod = _so.defRef || _so.def;
              if (!_sod) continue;
              if (_sod.kind !== 'station' && _sod.kind !== 'support') continue;
              var _soCell = towerCell(_so);
              var _sdd = chebSqCell(_soCell.c, _soCell.r, _tCellD.c, _tCellD.r);
              var _sradSq = getSupplySq(_so);
              if (!(_sradSq > 0)) _sradSq = getSupplyRadius(_so) / CELL;
              if (_sdd <= _sradSq + 1e-9 && _sdd < _dockD) { _dockD = _sdd; _dockSrc = _so; }
            }
            if (_dockSrc) {
              if (!t._refuelDocked) {
                ev(S, { t: 'float', x: t.x, y: t.y - 16, txt: '⛽ REABASTECENDO', col: '#38bdf8', size: 11 });
                t._warnCd = Math.max(t._warnCd || 0, 1.0);
              }
              t._refuelDocked = true; t._refuelTid = _dockSrc.tid;
              t.returning = false; t._pursueAcc = 0; t._noTargetT = 0;
              _refuelHandled = true;
            } else {
              t._refuelDocked = false;
              t.returning = false; t._noTargetT = 3;
              var _defF = t.defRef || t.def;
              var _fpc = (_defF && _defF.fuelPerCell != null ? _defF.fuelPerCell : 2);
              var _emerg = (t.fuel == null ? false : t.fuel < _fpc);
              var _need = _emerg ? (_interval / 0.3) : _interval;
              if (t._pursueAcc >= _need) {
                t._pursueAcc = 0;
                // RANGESQ: atraque em □, direção minimiza px (evita platô Chebyshev); leash ignorado no refuel
                var _td = Math.hypot(_rt.x - t.x, _rt.y - t.y);
                var _fb = null, _fd = _td;
                var _fdirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                for (var _fi = 0; _fi < 4; _fi++) {
                  var _fc = t.c + _fdirs[_fi][0], _fr = t.r + _fdirs[_fi][1];
                  if (_fc < 0 || _fc >= COLS || _fr < 0 || _fr >= ROWS) continue;
                  var _fk = _fc + ',' + _fr;
                  if (S.blocked[_fk] || S.occupied[_fk]) continue;
                  var _fcx = _fc * CELL + CELL / 2, _fcy = _fr * CELL + CELL / 2;
                  var _fdd = Math.hypot(_rt.x - _fcx, _rt.y - _fcy);
                  if (_fdd < _fd - 1e-6) { _fd = _fdd; _fb = { c: _fc, r: _fr }; }
                }
                if (_fb) tryRefuelStep(S, t, _fb.c, _fb.r);
              }
              _refuelHandled = true;
            }
          }
        }
        if (!_refuelHandled) {
        var _lowFuel = _classicLow;
        var _tgtP2 = (!_lowFuel) ? findBestTarget(S, t, stats) : null;
        _tgtP = _tgtP2;
        if (_lowFuel && !_atAnchor) {
          t.returning = true; // P2: prioridade sobre perseguir
          _wantHome = true;
        } else if (_lowFuel) {
          t.returning = false;
          t._pursueAcc = 0;
        } else if (_tgtP && !_tgtP.dead) {
          t._noTargetT = 0;
          // RANGESQ: leash em □ Chebyshev (1.5×rngSq + fração Motor); direção minimiza px (evita platô □)
          var _curLeashD = chebSqCell(t.c, t.r, _anch.ax, _anch.ay);
          if (_curLeashD > _leashSq + 1e-9 && !_atAnchor) { t.returning = true; _wantHome = true; } // encolheu o leash → volta p/ dentro
          else {
            t.returning = false;
            if (t._pursueAcc >= _interval) {
              t._pursueAcc = 0;
              var _curD = Math.hypot(_tgtP.x - t.x, _tgtP.y - t.y);
              var _best = null, _bd = _curD;
              var _dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
              for (var _di = 0; _di < 4; _di++) {
                var _nc = t.c + _dirs[_di][0], _nr = t.r + _dirs[_di][1];
                if (_nc < 0 || _nc >= COLS || _nr < 0 || _nr >= ROWS) continue;
                var _ck = _nc + ',' + _nr;
                if (S.blocked[_ck] || S.occupied[_ck]) continue;
                if (chebSqCell(_nc, _nr, _anch.ax, _anch.ay) > _leashSq + 1e-9) continue; // nunca passa do leash □
                var _ccx = _nc * CELL + CELL / 2, _ccy = _nr * CELL + CELL / 2;
                var _dd = Math.hypot(_tgtP.x - _ccx, _tgtP.y - _ccy);
                if (_dd < _bd - 1e-6) { _bd = _dd; _best = { c: _nc, r: _nr }; }
              }
              if (_best) tryPursueStep(S, t, _best.c, _best.r); // sem fuel → fica onde está (atira normal)
            }
          }
        } else {
          t._noTargetT += dt;
          if (t._noTargetT >= 3 && !_atAnchor) { t.returning = true; _wantHome = true; }
          else { t.returning = false; if (_atAnchor) t._pursueAcc = 0; }
        }
        if (_wantHome && t._pursueAcc >= _interval) {
          t._pursueAcc = 0;
          t._noTargetT = 3; // F5-fix: mantem estado de retorno p/ passos seguintes no mesmo ritmo (antes resetava p/ 0 e exigia +3s por celula)
          var _hb = null, _hd = Math.hypot(t.x - _anch.x, t.y - _anch.y);
          var _hdirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var _hi = 0; _hi < 4; _hi++) {
            var _hc = t.c + _hdirs[_hi][0], _hr = t.r + _hdirs[_hi][1];
            if (_hc < 0 || _hc >= COLS || _hr < 0 || _hr >= ROWS) continue;
            var _hk = _hc + ',' + _hr;
            if (S.blocked[_hk] || S.occupied[_hk]) continue;
            var _hx = _hc * CELL + CELL / 2, _hy = _hr * CELL + CELL / 2;
            var _hdd = Math.hypot(_hx - _anch.x, _hy - _anch.y);
            if (_hdd < _hd - 1e-6) { _hd = _hdd; _hb = { c: _hc, r: _hr }; }
          }
          if (_hb && tryPursueStep(S, t, _hb.c, _hb.r)) {
            if (t.c === _anch.ax && t.r === _anch.ay) { t.returning = false; t._noTargetT = 0; }
          }
          // sem fuel ou sem célula livre → para onde está (returning segue true p/ a UI ler)
        }
        } else if (_refuelExitHome && _wantHome && t._pursueAcc >= _interval) {
          t._pursueAcc = 0;
          t._noTargetT = 3;
          var _hb2 = null, _hd2 = Math.hypot(t.x - _anch.x, t.y - _anch.y);
          var _hdirs2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var _hi2 = 0; _hi2 < 4; _hi2++) {
            var _hc2 = t.c + _hdirs2[_hi2][0], _hr2 = t.r + _hdirs2[_hi2][1];
            if (_hc2 < 0 || _hc2 >= COLS || _hr2 < 0 || _hr2 >= ROWS) continue;
            var _hk2 = _hc2 + ',' + _hr2;
            if (S.blocked[_hk2] || S.occupied[_hk2]) continue;
            var _hx2 = _hc2 * CELL + CELL / 2, _hy2 = _hr2 * CELL + CELL / 2;
            var _hdd2 = Math.hypot(_hx2 - _anch.x, _hy2 - _anch.y);
            if (_hdd2 < _hd2 - 1e-6) { _hd2 = _hdd2; _hb2 = { c: _hc2, r: _hr2 }; }
          }
          if (_hb2 && tryPursueStep(S, t, _hb2.c, _hb2.r)) {
            if (t.c === _anch.ax && t.r === _anch.ay) { t.returning = false; t._noTargetT = 0; }
          }
        }
      } else if (t.returning) t.returning = false;
      let da = t.aimAngle - t.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      t.angle += da * Math.min(1, dt * 12);

      if (def.kind === 'buff') continue;

      if (def.kind === 'beam') {
        const tgt = findBestTarget(S, t, stats);
        const prevId = t.beamTarget ? t.beamTarget.eid : null;
        t.beamTarget = (tgt && !tgt.dead) ? tgt : null;
        // v3 PIXEL FASE 3: laser por tier — largura do feixe + alvos varridos
        const lp = D.SHOT_PATTERNS.laser;
        const beamTier = D.getTier(t.level);
        const beamW = lp.width[beamTier - 1] || 1;
        let sweepN = (lp.sweep[beamTier - 1] || 0);
        if (t.specBranch === 'B' && def.specB && def.specB.prism) sweepN += def.specB.prism; // spec B vira base
        const _tlL = (D.TIER_LOGIC.laser && D.TIER_LOGIC.laser[beamTier] && D.TIER_LOGIC.laser[beamTier].eff) || null;
        // Onda 2 fix pós-review: SHOT_PATTERNS.laser.sweep (T3=1) JÁ é a implementação do +1 do T3;
        // consome sweepAdd garantindo o mínimo declarado, sem empilhar (antes varria 2 extras no T3).
        if (_tlL && _tlL.sweepAdd && beamTier >= 3) sweepN = Math.max(sweepN, _tlL.sweepAdd);
        if (t.beamTarget) {
          // F2-sim R1: beam cobra battDrain*dt; sem batt → não dispara (mas mira continua)
          if (t.batt != null && (def.battDrain || 0) > 0) {
            var beamCost = (def.battDrain || 0) * dt;
            if (t.batt < beamCost) {
              f2Warn(S, t, 'batt');
              if (prevId !== null) SND.laserStop('L' + t.tid);
              t.beamTarget = null;
              t.rampTime = 0;
              continue;
            }
            t.batt = Math.max(0, t.batt - beamCost);
          }
          t.aimAngle = Math.atan2(t.beamTarget.y - t.y, t.beamTarget.x - t.x);
          SND.laserStart('L' + t.tid);
          let dmgRate = stats.dmg;
          if (t.specBranch === 'A') { t.rampTime += dt; dmgRate *= 1 + Math.min(3.0, t.rampTime * 0.8); }
          damageEnemy(S, t.beamTarget, dmgRate * dt, { pure: true, src: t });
          // Onda 2: laser T5 Derretimento — 1 armor/s enquanto mantém o mesmo alvo
          if (_tlL && _tlL.meltArmor && !t.beamTarget.dead) {
            if (t._meltEid === t.beamTarget.eid) t._meltAcc = (t._meltAcc || 0) + dt;
            else { t._meltEid = t.beamTarget.eid; t._meltAcc = dt; }
            while (t._meltAcc >= 1) {
              t._meltAcc -= 1;
              t.beamTarget.armor = Math.max(0, (t.beamTarget.armor || 0) - _tlL.meltArmor);
            }
          } else if (!t.beamTarget.dead) {
            t._meltEid = null; t._meltAcc = 0;
          }
          if (sweepN > 0) {
            // feixe varredor: atinge N alvos extras próximos do alvo principal
            // RANGESQ: (80+beamW*20)px→□ Chebyshev (80px→2□, 132px→3□)
            var _sweepSq = pxToSqHalf(80 + beamW * 20);
            var _btCell = enemyCell(t.beamTarget);
            let count = 0;
            for (const other of S.enemies) {
              if (other !== t.beamTarget && !other.dead && (function(){ var _ocS = enemyCell(other); return chebSqCell(_ocS.c, _ocS.r, _btCell.c, _btCell.r) <= _sweepSq + 1e-9; })()) {
                damageEnemy(S, other, dmgRate * 0.45 * dt, { pure: true, src: t });
                if (++count >= sweepN) break;
              }
            }
          }
        } else {
          if (prevId !== null) SND.laserStop('L' + t.tid);
          t.rampTime = 0;
        }
        continue;
      }

      t.cooldown -= dt;
      if (t.cooldown <= 0) {
        const target = findBestTarget(S, t, stats);
        if (target) {
          if (def.id === 'gatling' && t.specBranch === 'A') {
            if (t.lastTargetEid === target.eid) t.rampTime += 1 / stats.rate;
            else { t.rampTime = 0; t.lastTargetEid = target.eid; }
          } else t.rampTime = 0;
          fireTower(S, t, target, stats);
          t.cooldown = stats.rate > 0 ? 1 / stats.rate : 0.5;
        }
      }
      // G10: AUTO-MOVIMENTO PREDITIVO com toggle S.autoMove (default true) — F3: só na postura anchor
      if((t.stance || 'anchor') === 'anchor' && S.autoMove !== false && (t.moveCd||0) <= 0 && S.state!=='victory' && S.state!=='defeat' && Math.random() < 0.008){
        const statsTmp = getTowerStats(S, t);
        const best = findBestTarget(S, t, statsTmp);
        let future = null;
        if(best && !best.dead){
          const predDist = best.dist + best.speed * 1.4 * (best.slowFactor||1);
          const pts = best.flying ? S.airPts : S.routes[best.routeIdx];
          const total = best.flying ? S.airLen : S.routeLengths[best.routeIdx];
          future = D.getPosAtDist(pts, Math.min(total, predDist));
        }
        const cells=[];
        const range = t.moveRange||3;
        for(let dc=-range;dc<=range;dc++) for(let dr=-range;dr<=range;dr++){
          const dist=Math.abs(dc)+Math.abs(dr);
          if(dist===0||dist>range) continue;
          const nc=t.c+dc, nr=t.r+dr;
          if(nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
          const key=nc+','+nr;
          if(S.blocked[key] || S.occupied[key]) continue;
          let score = Math.random()*0.3;
          const cx = nc*CELL+CELL/2, cy = nr*CELL+CELL/2;
          // RANGESQ: auto-move pontua em □ Chebyshev (statsTmp.rng px já = rngSqEff×CELL)
          var _autoSq = getRngSqEff(statsTmp);
          if(future){
            var _fCell = { c: Math.floor(future.x / CELL), r: Math.floor(future.y / CELL) };
            const dFutureSq = chebSqCell(_fCell.c, _fCell.r, nc, nr);
            const dFuture = Math.hypot(future.x - cx, future.y - cy);
            const inRangeFuture = dFutureSq <= _autoSq + 1e-9;
            score += inRangeFuture ? 1.2 : 0;
            score += (1 - Math.min(1, dFuture/500)) * 0.8;
            const curIn = chebTowerEnemy(t, best) <= _autoSq + 1e-9;
            if(!curIn && inRangeFuture) score += 1.5;
          } else if(S.enemies.length){
            let bestD=999;
            for(const e of S.enemies) if(!e.dead) bestD=Math.min(bestD, Math.hypot(e.x - cx, e.y - cy));
            score += (1 - Math.min(1, bestD/600))*0.6;
          } else {
            const dCenter = Math.hypot(cx - BW/2, cy - BH/2);
            score += (1 - dCenter/700)*0.3;
          }
          cells.push({c:nc,r:nr,score});
        }
        if(cells.length){
          cells.sort((a,b)=>b.score-a.score);
          const pick=cells[0];
          // F2-sim R1: auto-move cobra fuelPerCell por célula (Manhattan); sem fuel → não move (atira normalmente)
          var mDist = Math.abs(pick.c - t.c) + Math.abs(pick.r - t.r);
          var mCost = ((def && def.fuelPerCell != null ? def.fuelPerCell : 2)) * mDist;
          if (t.fuel != null && t.fuel < mCost) {
            f2Warn(S, t, 'fuel');
          } else {
            if (t.fuel != null) t.fuel = Math.max(0, t.fuel - mCost);
            const oldKey=t.c+','+t.r;
            delete S.occupied[oldKey];
            t.c=pick.c; t.r=pick.r;
            t.x=pick.c*CELL+CELL/2; t.y=pick.r*CELL+CELL/2;
            S.occupied[pick.c+','+pick.r]=t;
            bumpAmpVersion(S); // Onda 2 fix pós-review: buff da amp é posicional — auto-move invalida o cache
            t.moveCd = 2.2 + Math.random()*1.2;
            ev(S,{t:'ring', x:t.x, y:t.y, maxR: CELL*1.2, col:def.color});
          }
        }
      }
    }

    // Projéteis
    for (let i = S.projectiles.length - 1; i >= 0; i--) {
      const pr = S.projectiles[i];
      if (pr.delay > 0) { pr.delay -= dt; continue; }
      pr.life -= dt;
      if (pr.kind === 'bullet') {
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        for (const e of S.enemies) {
          // G-a G6: projétil balístico sem AA atravessa voador sem colidir
          if (e.flying && pr.hitAir === false) continue;
          if (!e.dead && !pr.hitIds[e.eid] && Math.hypot(e.x - pr.x, e.y - pr.y) < e.r + 4) {
            pr.hitIds[e.eid] = true;
            damageEnemy(S, e, pr.dmg, { src: pr.src || pr.tower });
            // v3 PIXEL FASE 6: cannon T2 concussão — reduz 20% da velocidade 1.5s
            if (!e.dead) {
              const st2 = pr.src || pr.tower;
              if (st2 && st2.defRef.id === 'cannon' && D.TIER_LOGIC.cannon[D.getTier(st2.level)] && D.TIER_LOGIC.cannon[D.getTier(st2.level)].eff.concuss) {
                e.slowTimer = Math.max(e.slowTimer, 1.5); e.slowFactor = Math.min(e.slowFactor || 1, 0.8);
              }
              if (pr.stun) e.stunTimer = Math.max(e.stunTimer, pr.stun);
              // v3 PIXEL FASE 6: gatling T2 incendiária
              const gl = st2 && st2.defRef.id === 'gatling' ? D.TIER_LOGIC.gatling[D.getTier(st2.level)] : null;
              if (gl && gl.eff.burn) { e.burnTimer = Math.max(e.burnTimer, gl.eff.burn); e.burnDps = pr.dmg * 0.3; }
              // Onda 2: gatling T3 — 12% de chance de atordoar 0.25s por acerto
              if (gl && gl.eff.stunChance && Math.random() < gl.eff.stunChance) e.stunTimer = Math.max(e.stunTimer, gl.eff.stunDur || 0.25);
            }
            // Onda 1.4: cannon specA (Cerco Orbital) / splash de skill — concussão em área
            // no impacto, mesma fórmula da explosão de míssil; não re-aplica no alvo direto.
            if (pr.splash > 0) {
              var _bSq = pxToSqHalf(pr.splash);
              var _bImp = { c: Math.floor(pr.x / CELL), r: Math.floor(pr.y / CELL) };
              for (let _bi = S.enemies.length - 1; _bi >= 0; _bi--) {
                const _bO = S.enemies[_bi];
                if (_bO === e || _bO.dead || (_bO.flying && pr.hitAir === false)) continue;
                var _bOCell = enemyCell(_bO);
                if (chebSqCell(_bOCell.c, _bOCell.r, _bImp.c, _bImp.r) > _bSq + 1e-9) continue;
                const _bOd = Math.hypot(_bO.x - pr.x, _bO.y - pr.y);
                damageEnemy(S, _bO, pr.dmg * (1 - (Math.min(_bOd, pr.splash) / pr.splash) * 0.5), { src: pr.src || pr.tower });
              }
            }
            // Onda 2: cannon T4 Ricochete — 50% do dano num 2º inimigo a ≤1.5□, 1× por projétil (hitIds)
            const st3 = pr.src || pr.tower;
            if (st3 && st3.defRef && st3.defRef.id === 'cannon' && !pr._ricochet) {
              const cl = D.TIER_LOGIC.cannon && D.TIER_LOGIC.cannon[D.getTier(st3.level)];
              if (cl && cl.eff && cl.eff.ricochet) {
                var _rSq = pxToSqHalf(1.5 * CELL);
                var _rImp = { c: Math.floor(pr.x / CELL), r: Math.floor(pr.y / CELL) };
                var _rBest = null, _rBd = Infinity;
                for (const o of S.enemies) {
                  if (o === e || o.dead || o.leaked || pr.hitIds[o.eid]) continue;
                  if (o.flying && pr.hitAir === false) continue;
                  var _oRC = enemyCell(o);
                  if (chebSqCell(_oRC.c, _oRC.r, _rImp.c, _rImp.r) > _rSq + 1e-9) continue;
                  const _oRd = Math.hypot(o.x - pr.x, o.y - pr.y);
                  if (_oRd < _rBd) { _rBd = _oRd; _rBest = o; }
                }
                if (_rBest) {
                  pr._ricochet = true;
                  pr.hitIds[_rBest.eid] = true;
                  damageEnemy(S, _rBest, pr.dmg * 0.5, { src: st3 });
                  ev(S, { t: 'impact', x: _rBest.x, y: _rBest.y, col: pr.col });
                }
              }
            }
            ev(S, { t: 'impact', x: pr.x, y: pr.y, col: pr.col });
            pr.pierce--;
            if (pr.pierce <= 0) { pr.life = 0; break; }
          }
        }
      } else if (pr.kind === 'missile') {
        const tgt = pr.targetId != null ? findProjTarget(S, pr.targetId) : null;
        const tgtAlive = !!(tgt && !tgt.dead && !tgt.leaked);
        if (tgtAlive) {
          const ang = Math.atan2(tgt.y - pr.y, tgt.x - pr.x);
          pr.vx = Math.cos(ang) * pr.speed; pr.vy = Math.sin(ang) * pr.speed;
          pr.ang = ang;
        }
        pr.x += (pr.vx || 0) * dt; pr.y += (pr.vy || 0) * dt;
        if (Math.random() < dt * 10) ev(S, { t: 'smoke', x: pr.x, y: pr.y });
        if (tgtAlive && Math.hypot(tgt.x - pr.x, tgt.y - pr.y) < tgt.r + 6) {
          detonateMissile(S, pr, pr.x, pr.y);
        } else if (pr.life <= 0 && pr.sub && !tgtAlive) {
          // FIX (Onda 1.3): submunição sem alvo vivo detona em área ao expirar (antes: sumia sem efeito)
          detonateMissile(S, pr, pr.x, pr.y);
        }
      }
      if (pr.life <= 0) S.projectiles.splice(i, 1);
    }

    // Vórtices
    for (let i = S.vortices.length - 1; i >= 0; i--) {
      const v = S.vortices[i];
      v.life -= dt;
      if (v.life <= 0) { S.vortices.splice(i, 1); continue; }
      for (const e of S.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(v.x - e.x, v.y - e.y);
        if (d <= v.r && d > 4) {
          const pull = (1 - d / v.r) * 80 * dt;
          e.x += (v.x - e.x) / d * pull;
          e.y += (v.y - e.y) / d * pull;
          damageEnemy(S, e, v.dps * dt, { pure: true });
        }
      }
    }

    // Fim de onda
    if (S.state === 'combat' && S.waveQueue.length === 0 && S.enemies.length === 0) onWaveCleared(S);

    // Auto-próxima onda
    if (S.state === 'idle' && S.autoNext && S.autoWaveTimer > 0) {
      S.autoWaveTimer -= dt;
      if (S.autoWaveTimer <= 0) startNextWave(S);
    }
  }

  function findProjTarget(S, eid) {
    for (const e of S.enemies) if (e.eid === eid) return e;
    return null;
  }

  function detonateMissile(S, pr, x, y) {
    const mutSplash = 1 + ((S.mutBuffs && S.mutBuffs.splash)||0);
    const effSplash = pr.splash * mutSplash;
    // RANGESQ: splash em □ Chebyshev — 65px→1.5□, 45px→1.5□, 50px→1.5□ (ceil(px/44*2)/2)
    var _effSq = pxToSqHalf(effSplash);
    var _impCell = { c: Math.floor(x / CELL), r: Math.floor(y / CELL) };
    ev(S, { t: 'boom', x, y, r: effSplash, col: '#fb923c', big: false });
    ev(S, { t: 'shake', mag: 4 });
    SND.explosion(1.1);
    for (const e of S.enemies) {
      if (e.dead || (e.flying && !pr.hitAir)) continue;
      var _eCellD = enemyCell(e);
      const dSq = chebSqCell(_eCellD.c, _eCellD.r, _impCell.c, _impCell.r);
      if (dSq <= _effSq + 1e-9) {
        const d = Math.hypot(e.x - x, e.y - y); // falloff usa px p/ suavidade visual
        damageEnemy(S, e, pr.dmg * (1 - (Math.min(d, effSplash) / effSplash) * 0.5) * (1 + ((S.mutBuffs && S.mutBuffs.splash)||0)*0.3), { src: pr.src || pr.tower });
        if (pr.burn && !e.dead) { e.burnTimer = 3; e.burnDps = pr.dmg * 0.25; }
      }
    }
    // v3 PIXEL FASE 3: MIRV — ogiva se subdivide em submunições no impacto
    if (pr.mirv > 0) {
      // FIX (Onda 1.3): cada submunição nasce com alvo vivo — alvo do pai se ainda vivo,
      // senão o inimigo vivo mais próximo no raio de 1.5×CELL, senão null.
      let mirvTgt = pr.targetId != null ? findProjTarget(S, pr.targetId) : null;
      if (mirvTgt && (mirvTgt.dead || mirvTgt.leaked)) mirvTgt = null;
      if (!mirvTgt) {
        let _bd = 1.5 * CELL;
        for (const e of S.enemies) {
          if (e.dead || e.leaked) continue;
          const _dd = Math.hypot(e.x - x, e.y - y);
          if (_dd <= _bd) { _bd = _dd; mirvTgt = e; }
        }
      }
      for (let m = 0; m < pr.mirv; m++) {
        S.projectiles.push({
          kind: 'missile', x, y, targetId: mirvTgt ? mirvTgt.eid : null, speed: 260,
          vx: Math.cos(Math.PI * 2 * m / pr.mirv + Math.random()) * 260,
          vy: Math.sin(Math.PI * 2 * m / pr.mirv + Math.random()) * 260,
          dmg: pr.dmg * 0.5, splash: effSplash * 0.6, hitAir: true, burn: false,
          col: '#fb923c', life: 1.1, delay: 0, tower: pr.tower, mirv: 0, ang: 0, sub: true
        });
      }
    }
    // Onda 2: missile T3 Fragmentação — +1 fragmento (40% do dano do míssil, 60% do splash) no impacto
    if (!pr.sub && pr.tier) {
      const _tlF = (D.TIER_LOGIC.missile && D.TIER_LOGIC.missile[pr.tier] && D.TIER_LOGIC.missile[pr.tier].eff) || null;
      if (_tlF && _tlF.fragAdd) {
        let fragTgt = pr.targetId != null ? findProjTarget(S, pr.targetId) : null;
        if (fragTgt && (fragTgt.dead || fragTgt.leaked)) fragTgt = null;
        if (!fragTgt) {
          let _fbd = 4 * CELL;
          for (const e of S.enemies) {
            if (e.dead || e.leaked) continue;
            const _fdd = Math.hypot(e.x - x, e.y - y);
            if (_fdd <= _fbd) { _fbd = _fdd; fragTgt = e; }
          }
        }
        if (fragTgt) {
          for (let f = 0; f < _tlF.fragAdd; f++) {
            S.projectiles.push({
              kind: 'missile', x, y, targetId: fragTgt.eid, speed: 330,
              vx: Math.cos(Math.random() * Math.PI * 2) * 330, vy: Math.sin(Math.random() * Math.PI * 2) * 330,
              dmg: pr.dmg * 0.4, splash: effSplash * 0.6, hitAir: true, burn: false,
              col: '#fb923c', life: 1.1, delay: 0, tower: pr.tower, mirv: 0, ang: 0, sub: true
            });
          }
        }
      }
    }
    pr.life = 0;
  }


  /* ---- A5: moveTower headless (orig scenes.js 4491-4514) ---- */
  // Helper headless: moveTower (F2-sim: custa fuel, não créditos)
  function moveTower(S, t, nc, nr){
    if(!t || !S) return false;
    const dist = Math.abs(nc - t.c) + Math.abs(nr - t.r);
    const range = t.moveRange || (t.defRef && t.defRef.mobility) || 3;
    if(dist === 0 || dist > range) { SND.error(); return false; }
    const key = nc+','+nr;
    if(S.blocked[key] || S.occupied[key]) { SND.error(); return false; }
    if(nc<0||nc>=COLS||nr<0||nr>=ROWS) return false;
    if((t.moveCd||0) > 0) { SND.error(); ev(S, {t:'float', x:t.x, y:t.y-14, txt:'RECARREGANDO '+t.moveCd.toFixed(1)+'s', col:'#fbbf24', size:11}); return false; }
    // F2-sim R1: cobra fuelPerCell por célula; sem fuel → não move (atira normalmente)
    var fuelPerCell = (t.defRef && t.defRef.fuelPerCell != null ? t.defRef.fuelPerCell : 2);
    var fuelCost = fuelPerCell * dist;
    if (t.fuel != null && t.fuel < fuelCost) {
      SND.error();
      ev(S, { t: 'resEmpty', res: 'fuel', tid: t.tid, x: t.x, y: t.y });
      ev(S, {t:'float', x:t.x, y:t.y-14, txt:'SEM COMBUSTÍVEL', col:'#f43f5e', size:11});
      return false;
    }
    if (t.fuel != null) t.fuel = Math.max(0, t.fuel - fuelCost);
    delete S.occupied[t.c+','+t.r];
    t.c = nc; t.r = nr;
    t.x = nc*CELL + CELL/2; t.y = nr*CELL + CELL/2;
    S.occupied[key] = t;
    bumpAmpVersion(S);
    t.moveCd = t.moveMaxCd || 3.0;
    t.recoil = 0.6;
    SND.build();
    ev(S, {t:'ring', x:t.x, y:t.y, maxR: CELL*1.8, col:'#38bdf8'});
    ev(S, {t:'float', x:t.x, y:t.y-18, txt:'→ MOVIDA', col:'#38bdf8', size:11});
    return true;
  }



  /* ---- F2-sim: expõe getResupply (+aux) em window.DO sem tocar scenes.js ----
   * sim.js carrega ANTES de scenes.js (que faz window.DO = {...}).
   * Intercepta a atribuição futura e injeta os exports F2 de forma síncrona,
   * para que o harness headless (vm, sem timers) já veja DO.getResupply. */
  (function () {
    try {
      var F2_EXPORTS = {
        getResupply: getResupply,
        nearestResupply: (typeof nearestResupply !== 'undefined' ? nearestResupply : null), // REFUEL
        getSupplyRadius: (typeof getSupplyRadius !== 'undefined' ? getSupplyRadius : null), // REFUEL
        setStance: (typeof setStance !== 'undefined' ? setStance : null), // F3-pursue
        tryPursueStep: (typeof tryPursueStep !== 'undefined' ? tryPursueStep : null), // Onda 2 fix: teste de cache em movimento
        tryRefuelStep: (typeof tryRefuelStep !== 'undefined' ? tryRefuelStep : null), // Onda 2 fix: teste de cache em movimento
        buyComp: (typeof buyComp !== 'undefined' ? buyComp : null), // F4-comp C1
        getFactoryBoost: getFactoryBoost,
        getMaxFuel: getMaxFuel,
        getMaxBatt: getMaxBatt,
        getMaxAmmo: getMaxAmmo,
        getReactorCapMul: getReactorCapMul,
        getReactorTakeMul: getReactorTakeMul,
        placeStation: (typeof placeStation !== 'undefined' ? placeStation : null),
        placeSupport: (typeof placeSupport !== 'undefined' ? placeSupport : null)
      };
      var attachF2 = function (doObj) {
        if (!doObj) return;
        for (var k in F2_EXPORTS) {
          try { if (F2_EXPORTS[k] != null) doObj[k] = F2_EXPORTS[k]; } catch (_) {}
        }
      };
      if (typeof window !== 'undefined') {
        if (window.DO) attachF2(window.DO);
        try {
          var _do = window.DO;
          Object.defineProperty(window, 'DO', {
            configurable: true,
            enumerable: true,
            get: function () { return _do; },
            set: function (v) { _do = v; if (v) attachF2(v); }
          });
        } catch (_) {
          try { if (typeof setTimeout !== 'undefined') setTimeout(function () { if (window.DO) attachF2(window.DO); }, 0); } catch (_) {}
        }
      }
    } catch (_) {}
  })();
