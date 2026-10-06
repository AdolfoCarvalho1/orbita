'use strict';
export const HDATA = {
  W: 450, H: 800,
  COLORS: {
    bg: '#050914',
    panel: '#0d1526',
    text: '#e8eefc',
    cyan: '#38bdf8',
    red: '#f43f5e',
    gold: '#fbbf24',
    green: '#34d399',
    orange: '#fb923c',
    acid: '#a3e635',
    shieldBlue: '#60a5fa',
    steel: '#e2e8f0'
  },
  LIVES: 3,
  BOMBS_START: 2,
  IFRAME: 1.7,
  POWERUPS: {
    P: { label: 'P', kind: 'tier' },
    S: { label: 'S', kind: 'life' },
    B: { label: 'B', kind: 'bomb' },
    R: { label: 'R', kind: 'rapid' }
  },
  POWERUP_RULES: { chance: 0.05, everyKills: 11, rapidMul: 0.55, rapidDur: 8, tierMul: 0.82, tierMax: 4 },
  LEVEL_UP: { firstXp: 5, xpStep: 3 },
  SUPER: { chargeMax: 18, perKill: 1, perBoss: 15 },
  SHIPS: [
    {
      id: 'cannon', name: 'Corveta Gauss', icon: '◉', color: '#e2e8f0',
      desc: 'Bateria balística de alta precisão com perfuração leve.',
      specA: { name: 'Cerco Orbital', desc: 'Tiros de altíssimo calibre com concussão em área.', dmgMul: 2.2, rngAdd: 30, rateMul: 0.6, splash: 50 },
      specB: { name: 'Flak Quádrupla', desc: 'Dispara 4 projéteis rápidos em leque. Alcança voadores.', dmgMul: 0.7, rateMul: 2.2, multi: 4 },
      super: { name: 'Barragem Orbital' },
      specBeh: { A: { dmgMul: 2.2, cooldownMul: 1.25, splash: 26 }, B: { shots: 4, spread: 0.18, dmgMul: 0.7, cooldownMul: 0.9 } },
      kind: 'cannon', speed: 220, fireDelay: 280, dmg: 7,
      extra: { pierce: 1 }
    },
    {
      id: 'gatling', name: 'Caça Vulcan', icon: '⁂', color: '#fbbf24',
      desc: 'Cadência insana. Esmaga unidades leves e enxames.',
      specA: { name: 'Superaquecimento', desc: 'Rampa de dano contínuo até +250% no mesmo alvo.', ramp: true },
      specB: { name: 'Canhão de Fragmentação', desc: 'Micro-atordoamento de 0.2s e perfura 2 alvos.', stun: 0.2, pierce: 2 },
      super: { name: 'Tornado de Chumbo' },
      specBeh: { A: { rampPerHit: 0.15, rampMax: 2.5, rampReset: 1.2 }, B: { pierce: 2, stun: 0.2 } },
      kind: 'gatling', speed: 240, fireDelay: 110, dmg: 2,
      extra: { spread: 0.05 }
    },
    {
      id: 'laser', name: 'Destróier de Fótons', icon: '⌁', color: '#f43f5e',
      desc: 'Feixe contínuo de energia pura térmica. Atinge voadores.',
      specA: { name: 'Raio Desintegrador', desc: 'Multiplica o dano no mesmo alvo até 400%.', beamRamp: true },
      specB: { name: 'Prisma Prismático', desc: 'Divide o feixe em 3 alvos secundários.', prism: 3 },
      super: { name: 'Prisma Solar' },
      specBeh: { A: { rampPerSec: 0.8, rampMax: 4 }, B: { split: 3 } },
      kind: 'beam', speed: 215, fireDelay: 100, dmg: 5,
      extra: { width: 14, reach: 800 }
    },
    {
      id: 'missile', name: 'Bombardeiro MIRV', icon: '➤', color: '#fb923c',
      desc: 'Ogivas autoguiadas com explosão de área pesada.',
      specA: { name: 'Enxame de Micro-Mísseis', desc: 'Salva de 4 micromísseis rápidos. Alcança voadores.', salvos: 4, dmgMul: 0.45 },
      specB: { name: 'Ogiva Termobárica', desc: 'Raio de explosão +70% com fogo residual.', splashAdd: 40, burn: true },
      super: { name: 'Enxame MIRV' },
      specBeh: { A: { salvos: 4, dmgMul: 0.45, speed: 340 }, B: { splashMul: 1.7, burnDps: 5, burnDur: 3 } },
      kind: 'splash', speed: 200, fireDelay: 650, dmg: 16,
      extra: { radius: 50, speed: 260 }
    },
    {
      id: 'cryo', name: 'Fragata Glacial', icon: '❄', color: '#38bdf8',
      desc: 'Pulso glacial que retarda a velocidade inimiga.',
      specA: { name: 'Zero Absoluto', desc: 'Congela 75% e alvos recebem +40% dano físico.', slowVal: 0.75, physDebuff: true },
      specB: { name: 'Nevasca Permanente', desc: 'Campo de frio constante ao redor da torre.', auraSlow: true },
      super: { name: 'Era Glacial' },
      specBeh: { A: { slowFactor: 0.25, takeMul: 1.4, slowDur: 2 }, B: { auraRadius: 100, auraDps: 3, auraSlow: 0.5 } },
      kind: 'slow', speed: 225, fireDelay: 500, dmg: 4,
      extra: { factor: 0.5, dur: 2 }
    },
    {
      id: 'tesla', name: 'Cruzador Tempestade', icon: '⚡', color: '#34d399',
      desc: 'Relâmpagos que saltam entre múltiplos invasores.',
      specA: { name: 'Tempestade de Arcos', desc: 'Salta em até 8 alvos com chance de atordoar.', chainAdd: 4, stunChance: 0.35 },
      specB: { name: 'Pulso Eletrostático', desc: 'Dano multiplicado contra escudos azuis (+300%).', shieldBuster: true },
      super: { name: 'Tempestade Final' },
      specBeh: { A: { jumps: 8, stunChance: 0.35, stun: 0.4 }, B: { shieldMul: 4 } },
      kind: 'chain', speed: 215, fireDelay: 320, dmg: 6,
      extra: { jumps: 3, range: 110, falloff: 0.78 }
    },
    {
      id: 'sniper', name: 'Espectro Sniper', icon: '✜', color: '#67e8f9',
      desc: 'Alcance global na arena. Foca o inimigo mais perigoso.',
      specA: { name: 'Tiro de Antimatéria', desc: 'Crítico de 400% e executa com menos de 15% HP.', critChance: 0.4, critMul: 4, exec: 0.15 },
      specB: { name: 'Marcador Holográfico', desc: 'Alvo marcado recebe +35% de dano de todas as torres.', spotter: true },
      super: { name: 'Sentença' },
      specBeh: { A: { critChance: 0.4, critMul: 4, execute: 0.15 }, B: { markDur: 3, markMul: 1.35 } },
      kind: 'snipe', speed: 195, fireDelay: 950, dmg: 30,
      extra: {}
    },
    {
      id: 'venom', name: 'Infectador Nanopraga', icon: '☠', color: '#a3e635',
      desc: 'Névoa ácida corrosiva que dissolve blindagens.',
      specA: { name: 'Praga Contagiosa', desc: 'Inimigo que morre envenenado espalha a toxina.', plague: true },
      specB: { name: 'Ácido Corrosivo', desc: 'Reduz a armadura dos alvos a zero.', armorStrip: true },
      super: { name: 'Maré Nanopraga' },
      specBeh: { A: { spreadCount: 2, spreadRadius: 80 }, B: { strip: true } },
      kind: 'dot', speed: 230, fireDelay: 420, dmg: 3,
      extra: { dps: 6, dur: 3 }
    },
    {
      id: 'amp', name: 'Porta-Naves Amplificadora', icon: '▲', color: '#fde047',
      desc: 'Aumenta dano e alcance das torres vizinhas dentro do anel.',
      specA: { name: 'Reator de Sobrecarga', desc: '+45% Dano e +25% Cadência às vizinhas.', buffDmg: 0.45, buffRate: 0.25 },
      specB: { name: 'Radar de Varredura', desc: '+40% Alcance às vizinhas e revela camuflados.', buffRng: 0.4, reveal: true },
      super: { name: 'Sobrecarga Total' },
      specBeh: { A: { droneDelayMul: 0.6, droneDmgMul: 1.5, selfFireMul: 0.75 }, B: { magnet: 150, dronePierce: 2 } },
      kind: 'amp', speed: 210, fireDelay: 0, dmg: 0,
      extra: { drones: 2, droneDelay: 400, droneDmg: 2, droneRadius: 30 }
    },
    {
      id: 'rail', name: 'Encouraçado Railgun', icon: '╫', color: '#ffffff',
      desc: 'Disparo hiperveloz que atravessa toda a linha. Nv4+ atinge voadores.',
      specA: { name: 'Trilho de Singularidade', desc: 'Perfura toda a extensão da arena causando dano puro.', fullPierce: true },
      specB: { name: 'Trilho Duplo Turbo', desc: 'Dois tiros alternados com cadência dobrada.', doubleShot: true, rateMul: 2.0 },
      super: { name: 'Lança Estelar' },
      specBeh: { A: { width: 40, ignoreArmor: true }, B: { lines: 2, offset: 14, cooldownMul: 0.7 } },
      kind: 'pierce', speed: 190, fireDelay: 750, dmg: 22,
      extra: { width: 18 }
    }
  ],
  ENEMIES: {
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
  },
  CAMPAIGNS: [
    {
      id: 'asteroids', name: 'Campanha Asteroids', styleId: 'asteroids', bg: '#020617', accent: '#38bdf8', desc: 'Drift 360° — 5 fases do campo ao núcleo',
      phases: [
        { n: 1, name: 'Campo Inicial', desc: 'Aprenda a desviar dos destroços no campo inicial.', obj: 'timed', dur: 20, speed: 1.0, gap: 1.1, mix: [{ type: 'drone', weight: 40 }, { type: 'swarm', weight: 45 }, { type: 'mini', weight: 15 }] },
        { n: 2, name: 'Fragmentação', desc: 'Fragmentos se dividem e fecham rotas de fuga.', obj: 'timed', dur: 22, speed: 1.1, gap: 1.02, mix: [{ type: 'drone', weight: 35 }, { type: 'swarm', weight: 35 }, { type: 'runner', weight: 20 }, { type: 'mini', weight: 10 }] },
        { n: 3, name: 'Cinturão Denso', desc: 'Um cinturão veloz aperta o cerco no meio da travessia.', obj: 'timed', dur: 24, speed: 1.25, gap: 0.94, mix: [{ type: 'drone', weight: 30 }, { type: 'swarm', weight: 30 }, { type: 'runner', weight: 25 }, { type: 'splitter', weight: 15 }] },
        { n: 4, name: 'Tempestade', desc: 'Enxames e caçadores atacam por todos os lados.', obj: 'timed', dur: 26, speed: 1.35, gap: 0.86, mix: [{ type: 'drone', weight: 35 }, { type: 'swarm', weight: 25 }, { type: 'runner', weight: 25 }, { type: 'splitter', weight: 15 }] },
        { n: 5, name: 'Núcleo do Asteroide', desc: 'Abra caminho e enfrente o núcleo colossal no final.', obj: 'boss', dur: 30, speed: 1.45, gap: 0.78, mix: [{ type: 'drone', weight: 35 }, { type: 'swarm', weight: 25 }, { type: 'runner', weight: 25 }, { type: 'splitter', weight: 15 }], boss: 'boss1', bossMul: 1 }
      ]
    },
    {
      id: 'horizontal', name: 'Campanha R-Type', styleId: 'horizontal', bg: '#0a0f1a', accent: '#fbbf24', desc: 'Corredor horizontal — 5 fases até a Nave-Mãe',
      phases: [
        { n: 1, name: 'Corredor Inicial', desc: 'Aprenda a carregar o disparo enquanto cruza o corredor.', obj: 'timed', dur: 22, speed: 1.0, gap: 0.96, mix: [{ type: 'runner', weight: 45 }, { type: 'drone', weight: 35 }, { type: 'swarm', weight: 20 }] },
        { n: 2, name: 'Esquadrão', desc: 'Caças rápidos e vespas cercam sua rota.', obj: 'timed', dur: 24, speed: 1.12, gap: 0.88, mix: [{ type: 'runner', weight: 40 }, { type: 'drone', weight: 30 }, { type: 'wasp', weight: 20 }, { type: 'swarm', weight: 10 }] },
        { n: 3, name: 'Fortaleza', desc: 'Tanques blindados seguram o avanço inimigo.', obj: 'timed', dur: 26, speed: 1.25, gap: 0.8, mix: [{ type: 'tank', weight: 25 }, { type: 'runner', weight: 35 }, { type: 'wasp', weight: 25 }, { type: 'drone', weight: 15 }] },
        { n: 4, name: 'Enxame', desc: 'Uma horda toma o corredor antes do confronto final.', obj: 'timed', dur: 28, speed: 1.35, gap: 0.72, mix: [{ type: 'runner', weight: 30 }, { type: 'swarm', weight: 25 }, { type: 'wasp', weight: 25 }, { type: 'tank', weight: 20 }] },
        { n: 5, name: 'Nave-Mãe', desc: 'Atravesse a escolta e enfrente a Nave-Mãe.', obj: 'boss', dur: 30, speed: 1.45, gap: 0.64, mix: [{ type: 'runner', weight: 30 }, { type: 'swarm', weight: 25 }, { type: 'wasp', weight: 25 }, { type: 'tank', weight: 20 }], boss: 'boss2', bossMul: 1 }
      ]
    },
    {
      id: 'vertical', name: 'Campanha Raiden', styleId: 'vertical', bg: '#87CEEB', accent: '#f43f5e', desc: 'Bullet hell vertical — 5 fases até a fortaleza',
      phases: [
        { n: 1, name: 'Ascensão', desc: 'A patrulha inicial fecha o céu durante a subida.', obj: 'timed', dur: 22, speed: 1.0, gap: 0.82, mix: [{ type: 'drone', weight: 45 }, { type: 'swarm', weight: 30 }, { type: 'runner', weight: 15 }, { type: 'bomber', weight: 10 }] },
        { n: 2, name: 'Tempestade', desc: 'Chuva de disparos e unidades protegidas.', obj: 'timed', dur: 24, speed: 1.15, gap: 0.74, mix: [{ type: 'drone', weight: 35 }, { type: 'swarm', weight: 20 }, { type: 'bomber', weight: 25 }, { type: 'shielded', weight: 20 }] },
        { n: 3, name: 'Bombardeio', desc: 'Bombardeiros e escudos dominam a faixa de voo.', obj: 'timed', dur: 26, speed: 1.25, gap: 0.66, mix: [{ type: 'bomber', weight: 30 }, { type: 'shielded', weight: 25 }, { type: 'drone', weight: 25 }, { type: 'splitter', weight: 20 }] },
        { n: 4, name: 'Inferno', desc: 'Espectros e vespas aceleram a ofensiva.', obj: 'timed', dur: 28, speed: 1.38, gap: 0.58, mix: [{ type: 'phase', weight: 30 }, { type: 'wasp', weight: 25 }, { type: 'bomber', weight: 25 }, { type: 'shielded', weight: 20 }] },
        { n: 5, name: 'Fortaleza Voadora', desc: 'Rompa a escolta e derrube a fortaleza.', obj: 'boss', dur: 30, speed: 1.45, gap: 0.5, mix: [{ type: 'phase', weight: 30 }, { type: 'wasp', weight: 25 }, { type: 'bomber', weight: 25 }, { type: 'shielded', weight: 20 }], boss: 'boss3', bossMul: 1 }
      ]
    },
    {
      id: 'arena', name: 'Campanha Geometry', styleId: 'arena', bg: '#0f172a', accent: '#34d399', desc: 'Arena 360° — 5 fases de sobrevivência',
      phases: [
        { n: 1, name: 'Arena Pequena', desc: 'Uma formação leve apresenta os perigos da arena.', obj: 'timed', dur: 20, speed: 1.0, gap: 0.68, mix: [{ type: 'swarm', weight: 40 }, { type: 'drone', weight: 30 }, { type: 'mini', weight: 15 }, { type: 'runner', weight: 15 }] },
        { n: 2, name: 'Hordas', desc: 'Drones caçadores e espectros encurtam as rotas.', obj: 'timed', dur: 22, speed: 1.12, gap: 0.6, mix: [{ type: 'swarm', weight: 30 }, { type: 'drone', weight: 25 }, { type: 'phase', weight: 25 }, { type: 'splitter', weight: 20 }] },
        { n: 3, name: 'Caçadores', desc: 'Espectros e unidades que se dividem cercam a nave.', obj: 'timed', dur: 24, speed: 1.25, gap: 0.52, mix: [{ type: 'phase', weight: 30 }, { type: 'splitter', weight: 25 }, { type: 'swarm', weight: 25 }, { type: 'healer', weight: 20 }] },
        { n: 4, name: 'Sobrecarga', desc: 'Toda a frota avança antes do duelo na arena.', obj: 'timed', dur: 26, speed: 1.38, gap: 0.44, mix: [{ type: 'swarm', weight: 20 }, { type: 'phase', weight: 25 }, { type: 'splitter', weight: 20 }, { type: 'drone', weight: 15 }, { type: 'colossus', weight: 10 }, { type: 'healer', weight: 10 }] },
        { n: 5, name: 'Mestre da Arena', desc: 'Supere a escolta e enfrente o colosso da arena.', obj: 'boss', dur: 30, speed: 1.48, gap: 0.36, mix: [{ type: 'swarm', weight: 20 }, { type: 'phase', weight: 25 }, { type: 'splitter', weight: 20 }, { type: 'drone', weight: 15 }, { type: 'colossus', weight: 10 }, { type: 'healer', weight: 10 }], boss: 'boss3', bossMul: 1.5 }
      ]
    },
    {
      id: 'tunnel', name: 'Campanha Tempest', styleId: 'tunnel', bg: '#050914', accent: '#a3e635', desc: 'Túnel 3D — 5 fases até o coração',
      phases: [
        { n: 1, name: 'Túnel Inicial', desc: 'Aprenda as rotas e encontre a saída do túnel.', obj: 'timed', dur: 20, speed: 1.0, gap: 0.54, mix: [{ type: 'phase', weight: 35 }, { type: 'wasp', weight: 25 }, { type: 'drone', weight: 25 }, { type: 'swarm', weight: 15 }] },
        { n: 2, name: 'Curvas', desc: 'Vespas aparecem nas curvas mais fechadas.', obj: 'timed', dur: 22, speed: 1.12, gap: 0.46, mix: [{ type: 'wasp', weight: 30 }, { type: 'phase', weight: 25 }, { type: 'tank', weight: 20 }, { type: 'healer', weight: 25 }] },
        { n: 3, name: 'Aceleração', desc: 'Bombardeiros velozes apertam o ritmo da fuga.', obj: 'timed', dur: 24, speed: 1.28, gap: 0.38, mix: [{ type: 'bomber', weight: 25 }, { type: 'phase', weight: 20 }, { type: 'shielded', weight: 20 }, { type: 'splitter', weight: 15 }, { type: 'healer', weight: 10 }, { type: 'colossus', weight: 10 }] },
        { n: 4, name: 'Inversão', desc: 'Rotas invertidas e blindados bloqueiam o avanço.', obj: 'timed', dur: 26, speed: 1.38, gap: 0.35, mix: [{ type: 'tank', weight: 20 }, { type: 'shielded', weight: 20 }, { type: 'splitter', weight: 15 }, { type: 'healer', weight: 10 }, { type: 'phase', weight: 15 }, { type: 'bomber', weight: 10 }, { type: 'colossus', weight: 10 }] },
        { n: 5, name: 'Coração do Túnel', desc: 'Rompa a defesa e enfrente a Frota Suprema.', obj: 'boss', dur: 30, speed: 1.48, gap: 0.35, mix: [{ type: 'tank', weight: 20 }, { type: 'shielded', weight: 20 }, { type: 'splitter', weight: 15 }, { type: 'healer', weight: 10 }, { type: 'phase', weight: 15 }, { type: 'bomber', weight: 10 }, { type: 'colossus', weight: 10 }], boss: 'fleet', bossMul: 1 }
      ]
    }
  ]
};
