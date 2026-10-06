'use strict';
var DO3 = (function () {
  const COLS = 21;
  const ROWS = 13;
  const CELL_SIZE = 44;
  const BOARD_W = COLS * CELL_SIZE;
  const BOARD_H = ROWS * CELL_SIZE;
  const SAVE_KEY = 'defesa_orbital_v3';
  const TOWER_MAX_LVL = 50;

  // IDENTIDADE UNIFICADA: PALETTE deriva de TOKENS se existir (6-mãe fechada)
  const _TOK = (typeof window!=='undefined' && (window.TOKENS || (window.DO3 && window.DO3.TOKENS))) ? (window.TOKENS || window.DO3.TOKENS).PALETTE : null;
  const PALETTE = _TOK ? {
    bg: _TOK.bg, bg2: _TOK.bg2, panel: _TOK.panel, text: _TOK.text,
    muted: _TOK.muted, cyan: _TOK.cyan, red: _TOK.red, gold: _TOK.gold,
    green: _TOK.green, orange: _TOK.orange, steel: _TOK.steel, acid: _TOK.acid, shieldBlue: _TOK.shieldBlue
  } : {
    bg: '#050914', bg2: '#0a1128', panel: '#0d1526', text: '#e8eefc',
    muted: '#8fa3c4', cyan: '#38bdf8', red: '#f43f5e', gold: '#fbbf24',
    green: '#34d399', orange: '#fb923c', steel: '#e2e8f0', acid: '#a3e635', shieldBlue: '#60a5fa'
  };

  const TOWERS_DATA = [
    {
      id: 'cannon', name: 'Corveta Gauss', icon: '◉', color: '#e2e8f0', mobility: 3,
      cost: 50, dmg: 16, rng: 120, rate: 1.1, kind: 'bullet',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2,
      desc: 'Bateria balística de alta precisão com perfuração leve.',
      specA: { name: 'Cerco Orbital', desc: 'Tiros de altíssimo calibre com concussão em área.', dmgMul: 2.2, rngAdd: 30, rateMul: 0.6, splash: 50 },
      specB: { name: 'Flak Quádrupla', desc: 'Dispara 4 projéteis rápidos em leque. Alcança voadores.', dmgMul: 0.7, rateMul: 2.2, multi: 4 }
    },
    {
      id: 'gatling', name: 'Caça Vulcan', icon: '⁂', color: '#fbbf24', mobility: 3,
      cost: 85, dmg: 6, rng: 105, rate: 4.2, kind: 'bullet',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2, // ammoPerShot 1 por projétil
      desc: 'Cadência insana. Esmaga unidades leves e enxames.',
      specA: { name: 'Superaquecimento', desc: 'Rampa de dano contínuo até +250% no mesmo alvo.', ramp: true },
      specB: { name: 'Canhão de Fragmentação', desc: 'Micro-atordoamento de 0.2s e perfura 2 alvos.', stun: 0.2, pierce: 2 }
    },
    {
      id: 'laser', name: 'Destróier de Fótons', icon: '⌁', color: '#f43f5e', mobility: 3,
      cost: 115, dmg: 32, rng: 130, rate: 0, kind: 'beam',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 0, battDrain: 6, fuelPerCell: 2,
      desc: 'Feixe contínuo de energia pura térmica. Atinge voadores.',
      specA: { name: 'Raio Desintegrador', desc: 'Multiplica o dano no mesmo alvo até 400%.', beamRamp: true },
      specB: { name: 'Prisma Prismático', desc: 'Divide o feixe em 3 alvos secundários.', prism: 3 }
    },
    {
      id: 'missile', name: 'Bombardeiro MIRV', icon: '➤', color: '#fb923c', mobility: 3,
      cost: 135, dmg: 42, rng: 145, rate: 0.6, kind: 'splash', splash: 65,
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2,
      desc: 'Ogivas autoguiadas com explosão de área pesada.',
      specA: { name: 'Enxame de Micro-Mísseis', desc: 'Salva de 4 micromísseis rápidos. Alcança voadores.', salvos: 4, dmgMul: 0.45 },
      specB: { name: 'Ogiva Termobárica', desc: 'Raio de explosão +70% com fogo residual.', splashAdd: 40, burn: true }
    },
    {
      id: 'cryo', name: 'Fragata Glacial', icon: '❄', color: '#38bdf8', mobility: 3,
      cost: 80, dmg: 6, rng: 110, rate: 0.85, kind: 'slow',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 0, battDrain: 6, fuelPerCell: 2,
      desc: 'Pulso glacial que retarda a velocidade inimiga.',
      specA: { name: 'Zero Absoluto', desc: 'Congela 75% e alvos recebem +40% dano físico.', slowVal: 0.75, physDebuff: true },
      specB: { name: 'Nevasca Permanente', desc: 'Campo de frio constante ao redor da torre.', auraSlow: true }
    },
    {
      id: 'tesla', name: 'Cruzador Tempestade', icon: '⚡', color: '#34d399', mobility: 3,
      cost: 155, dmg: 15, rng: 115, rate: 1.15, kind: 'chain', chain: 4,
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 0, battDrain: 6, fuelPerCell: 2,
      desc: 'Relâmpagos que saltam entre múltiplos invasores.',
      specA: { name: 'Tempestade de Arcos', desc: 'Salta em até 8 alvos com chance de atordoar.', chainAdd: 4, stunChance: 0.35 },
      specB: { name: 'Pulso Eletrostático', desc: 'Dano multiplicado contra escudos azuis (+300%).', shieldBuster: true }
    },
    {
      id: 'sniper', name: 'Espectro Sniper', icon: '✜', color: '#67e8f9', mobility: 3,
      cost: 175, dmg: 95, rng: 290, rate: 0.32, kind: 'snipe',
      fuelCap: 100, battCap: 100, ammoCap: 12, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2,
      desc: 'Alcance global na arena. Foca o inimigo mais perigoso.',
      specA: { name: 'Tiro de Antimatéria', desc: 'Crítico de 400% e executa com menos de 15% HP.', critChance: 0.4, critMul: 4, exec: 0.15 },
      specB: { name: 'Marcador Holográfico', desc: 'Alvo marcado recebe +35% de dano de todas as torres.', spotter: true }
    },
    {
      id: 'venom', name: 'Infectador Nanopraga', icon: '☠', color: '#a3e635', mobility: 3,
      cost: 105, dmg: 9, rng: 120, rate: 0.75, kind: 'dot',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 0, battDrain: 6, fuelPerCell: 2,
      desc: 'Névoa ácida corrosiva que dissolve blindagens.',
      specA: { name: 'Praga Contagiosa', desc: 'Inimigo que morre envenenado espalha a toxina.', plague: true },
      specB: { name: 'Ácido Corrosivo', desc: 'Reduz a armadura dos alvos a zero.', armorStrip: true }
    },
    {
      id: 'amp', name: 'Porta-Naves Amplificadora', icon: '▲', color: '#fde047', mobility: 3,
      cost: 125, dmg: 0, rng: 125, rate: 0, kind: 'buff',
      fuelCap: 100, battCap: 100, ammoCap: 40, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2,
      desc: 'Aumenta dano e alcance das torres vizinhas dentro do anel.',
      specA: { name: 'Reator de Sobrecarga', desc: '+45% Dano e +25% Cadência às vizinhas.', buffDmg: 0.45, buffRate: 0.25 },
      specB: { name: 'Radar de Varredura', desc: '+40% Alcance às vizinhas e revela camuflados.', buffRng: 0.4, reveal: true }
    },
    {
      id: 'rail', name: 'Encouraçado Railgun', icon: '╫', color: '#ffffff', mobility: 3,
      cost: 210, dmg: 65, rng: 230, rate: 0.4, kind: 'pierce',
      fuelCap: 100, battCap: 100, ammoCap: 12, ammoPerShot: 1, battDrain: 0, fuelPerCell: 2,
      desc: 'Disparo hiperveloz que atravessa toda a linha. Nv4+ atinge voadores.',
      specA: { name: 'Trilho de Singularidade', desc: 'Perfura toda a extensão da arena causando dano puro.', fullPierce: true },
      specB: { name: 'Trilho Duplo Turbo', desc: 'Dois tiros alternados com cadência dobrada.', doubleShot: true, rateMul: 2.0 }
    }
  ];

  // Skills por nave a cada 4 níveis (12 skills até 48, 50 é mestre)
  TOWERS_DATA.forEach(t=>{
    if(t.id==='cannon') t.skills=[
      {lvl:4,name:'Calibre Pesado',desc:'+22% dano',eff:{dmgMul:1.22}},
      {lvl:8,name:'Alcance Estendido',desc:'+18% alcance',eff:{rngMul:1.18}},
      {lvl:12,name:'Cadência Afinada',desc:'+14% cadência',eff:{rateMul:1.14}},
      {lvl:16,name:'Perfurante',desc:'Perfura +1',eff:{pierce:1}},
      {lvl:20,name:'Traçante',desc:'+10% crit',eff:{crit:0.1}},
      {lvl:24,name:'Blindagem',desc:'+30 shield',eff:{shield:30}},
      {lvl:28,name:'Duplo',desc:'2 projéteis',eff:{multi:2}},
      {lvl:32,name:'Ogiva Leve',desc:'+16% splash',eff:{splashMul:1.16}},
      {lvl:36,name:'Giroscópica',desc:'+12% precisão',eff:{acc:1.12}},
      {lvl:40,name:'Sobrecarga',desc:'+20% dano 2s após matar',eff:{overdmg:0.2}},
      {lvl:44,name:'Casco',desc:'+15% HP',eff:{hp:1.15}},
      {lvl:48,name:'Ancoragem',desc:'Imune +25% dano',eff:{immunity:true,dmgMul2:1.25}},
    ];
    else if(t.id==='gatling') t.skills=[
      {lvl:4,name:'Tambor',desc:'+12% cadência',eff:{rateMul:1.12}},
      {lvl:8,name:'Refrigeração',desc:'-15% overheat',eff:{cool:0.15}},
      {lvl:12,name:'Traçante',desc:'+10% alcance',eff:{rngMul:1.1}},
      {lvl:16,name:'Frenesi',desc:'Rampa 180%',eff:{ramp:1.8}},
      {lvl:20,name:'Stun',desc:'Stun 0.15s',eff:{stun:0.15}},
      {lvl:24,name:'Correia',desc:'+22% cadência',eff:{rateMul2:1.22}},
      {lvl:28,name:'Precisão',desc:'+12% dano',eff:{dmgMul:1.12}},
      {lvl:32,name:'Barragem',desc:'3x burst',eff:{burst:3}},
      {lvl:36,name:'Superaq',desc:'+30% quando quente',eff:{heatDmg:0.3}},
      {lvl:40,name:'Vulcão',desc:'+18% splash',eff:{splash:8}},
      {lvl:44,name:'Turbo',desc:'+10% vel',eff:{spd:1.1}},
      {lvl:48,name:'Dilúvio',desc:'+35% cadência',eff:{rateMul3:1.35}},
    ];
    else if(t.id==='laser') t.skills=[
      {lvl:4,name:'Foco',desc:'+18% alcance',eff:{rngMul:1.18}},
      {lvl:8,name:'Intensidade',desc:'+16% dano/s',eff:{dmgMul:1.16}},
      {lvl:12,name:'Duração',desc:'+0.6s burn',eff:{burn:0.6}},
      {lvl:16,name:'Colimador',desc:'Prisma +1',eff:{prism:1}},
      {lvl:20,name:'Superaq',desc:'Ramp 300%',eff:{beamRamp:3.0}},
      {lvl:24,name:'Lente',desc:'+14% alcance',eff:{rngMul2:1.14}},
      {lvl:28,name:'Fissão',desc:'Reflete 1',eff:{reflect:1}},
      {lvl:32,name:'Plasma',desc:'+20% puro',eff:{pure:0.2}},
      {lvl:36,name:'Irradiação',desc:'Aura 30',eff:{aura:30}},
      {lvl:40,name:'Desintegrador',desc:'+25% vs escudo',eff:{vsShield:1.25}},
      {lvl:44,name:'Foco Final',desc:'+18% dano',eff:{dmgMul2:1.18}},
      {lvl:48,name:'Sol',desc:'Atravessa tudo',eff:{pierceAll:true}},
    ];
    else if(t.id==='missile') t.skills=[
      {lvl:4,name:'Carga Extra',desc:'+1 míssil',eff:{salvo:1}},
      {lvl:8,name:'Propulsor',desc:'+14% vel',eff:{spdMul:1.14}},
      {lvl:12,name:'Ogiva Maior',desc:'+22% splash',eff:{splashMul:1.22}},
      {lvl:16,name:'Guiamento',desc:'Homing 30%',eff:{homing:1.3}},
      {lvl:20,name:'Chuva',desc:'4 mísseis',eff:{salvo4:true}},
      {lvl:24,name:'Termobárica',desc:'Burn 2s',eff:{burn:2}},
      {lvl:28,name:'Fragmentação',desc:'3 splits',eff:{frag:3}},
      {lvl:32,name:'Alcance',desc:'+18% rng',eff:{rngMul:1.18}},
      {lvl:36,name:'Pesada',desc:'+16% dano',eff:{dmgMul:1.16}},
      {lvl:40,name:'Enxame',desc:'5 mísseis',eff:{swarm:5}},
      {lvl:44,name:'Precisão',desc:'+12% vs ar',eff:{vsAir:1.12}},
      {lvl:48,name:'Apocalipse',desc:'+30% splash',eff:{splashMul2:1.3}},
    ];
    else if(t.id==='cryo') t.skills=[
      {lvl:4,name:'Gelo Seco',desc:'+14% freeze',eff:{freezeDur:1.14}},
      {lvl:8,name:'Nevasca',desc:'+12% área',eff:{aoe:1.12}},
      {lvl:12,name:'Zero',desc:'Slow 60%',eff:{slow:0.6}},
      {lvl:16,name:'Quebra',desc:'+20% dano congelado',eff:{phys:1.2}},
      {lvl:20,name:'Aura',desc:'Slow 15% passivo',eff:{auraSlow:0.15}},
      {lvl:24,name:'Pico',desc:'+18% dano',eff:{dmgMul:1.18}},
      {lvl:28,name:'Cristal',desc:'Stun 0.4s',eff:{stun:0.4}},
      {lvl:32,name:'Blizzard',desc:'+22% área',eff:{aoe2:1.22}},
      {lvl:36,name:'Hipotermia',desc:'DoT 4/s',eff:{dot:4}},
      {lvl:40,name:'Glacial',desc:'+16% alcance',eff:{rngMul:1.16}},
      {lvl:44,name:'Permafrost',desc:'Freeze 75% 3s',eff:{freeze75:true}},
      {lvl:48,name:'Era do Gelo',desc:'Nova ao matar',eff:{nova:true}},
    ];
    else if(t.id==='tesla') t.skills=[
      {lvl:4,name:'Arco +1',desc:'+1 salto',eff:{chain:1}},
      {lvl:8,name:'Voltagem',desc:'+16% dano',eff:{dmgMul:1.16}},
      {lvl:12,name:'Alcance',desc:'+14% rng',eff:{rngMul:1.14}},
      {lvl:16,name:'Stun',desc:'15% stun',eff:{stun:0.15}},
      {lvl:20,name:'Cadeia +2',desc:'+2 saltos',eff:{chain2:2}},
      {lvl:24,name:'Sobrecarga',desc:'+20% vs escudo',eff:{vsShield:1.2}},
      {lvl:28,name:'Relâmpago',desc:'+18% chain',eff:{chainDmg:1.18}},
      {lvl:32,name:'Tempestade',desc:'8 saltos',eff:{chain8:true}},
      {lvl:36,name:'Ionização',desc:'Slow 12%',eff:{slowChain:0.12}},
      {lvl:40,name:'Plasma',desc:'+16% dano',eff:{dmgMul2:1.16}},
      {lvl:44,name:'Paralisia',desc:'Stun 30%',eff:{stun30:true}},
      {lvl:48,name:'Ragnarok',desc:'12 saltos',eff:{god:true}},
    ];
    else if(t.id==='sniper') t.skills=[
      {lvl:4,name:'Mira',desc:'+14% alcance',eff:{rngMul:1.14}},
      {lvl:8,name:'Calibre',desc:'+18% dano',eff:{dmgMul:1.18}},
      {lvl:12,name:'Crítico',desc:'30% crit',eff:{crit:0.3}},
      {lvl:16,name:'Perfurante',desc:'Pierce 1',eff:{pierce:1}},
      {lvl:20,name:'Executa',desc:'<15% HP',eff:{exec:0.15}},
      {lvl:24,name:'Marcador',desc:'+25% marcado',eff:{mark:0.25}},
      {lvl:28,name:'Global',desc:'+22% rng',eff:{rngMul2:1.22}},
      {lvl:32,name:'Antimatéria',desc:'Crit 4x',eff:{crit4:true}},
      {lvl:36,name:'Foco',desc:'+16% dano',eff:{dmgMul2:1.16}},
      {lvl:40,name:'Fantasma',desc:'Ignora armor',eff:{ignoreArmor:true}},
      {lvl:44,name:'Morte',desc:'+20% vs boss',eff:{vsBoss:1.2}},
      {lvl:48,name:'Deus',desc:'Infinito + pierce',eff:{infinite:true}},
    ];
    else if(t.id==='venom') t.skills=[
      {lvl:4,name:'Toxina',desc:'+14% DoT',eff:{dotMul:1.14}},
      {lvl:8,name:'Alcance',desc:'+12% rng',eff:{rngMul:1.12}},
      {lvl:12,name:'Contágio',desc:'Espalha',eff:{plague:true}},
      {lvl:16,name:'Ácido',desc:'Strip armor',eff:{strip:true}},
      {lvl:20,name:'Nuvem',desc:'+16% área',eff:{aoe:1.16}},
      {lvl:24,name:'Corrosão',desc:'-15% armor',eff:{corrode:0.15}},
      {lvl:28,name:'Virulência',desc:'+18% dur',eff:{dur:1.18}},
      {lvl:32,name:'Epidemia',desc:'+2 alvos',eff:{extra:2}},
      {lvl:36,name:'Neuro',desc:'Slow 20%',eff:{slow:0.2}},
      {lvl:40,name:'Mortal',desc:'+16% dano',eff:{dmgMul:1.16}},
      {lvl:44,name:'Praga',desc:'10% infect spawn',eff:{infectSpawn:0.1}},
      {lvl:48,name:'Pandemia',desc:'Tudo',eff:{pandemia:true}},
    ];
    else if(t.id==='amp') t.skills=[
      {lvl:4,name:'Amplifica',desc:'+8% dano',eff:{buffDmg:0.08}},
      {lvl:8,name:'Alcance',desc:'+10% rng',eff:{buffRng:0.1}},
      {lvl:12,name:'Cadência',desc:'+8% rate',eff:{buffRate:0.08}},
      {lvl:16,name:'Sobrecarga',desc:'+16% dano',eff:{buffDmg2:0.16}},
      {lvl:20,name:'Radar',desc:'+16% rng',eff:{buffRng2:0.16}},
      {lvl:24,name:'Eficiência',desc:'+12% rate',eff:{buffRate2:0.12}},
      {lvl:28,name:'Campo',desc:'+20% área',eff:{buffArea:1.2}},
      {lvl:32,name:'Núcleo',desc:'+22% dano',eff:{buffDmg3:0.22}},
      {lvl:36,name:'Sincronia',desc:'+1s dur',eff:{dur:1}},
      {lvl:40,name:'Matriz',desc:'+16% todos',eff:{buffAll:0.16}},
      {lvl:44,name:'Hivemind',desc:'+18% dano',eff:{buffDmg4:0.18}},
      {lvl:48,name:'Deus Suporte',desc:'+30% + stealth',eff:{godBuff:true}},
    ];
    else if(t.id==='rail') t.skills=[
      {lvl:4,name:'Velocidade',desc:'+14% cadência',eff:{rateMul:1.14}},
      {lvl:8,name:'Alcance',desc:'+16% rng',eff:{rngMul:1.16}},
      {lvl:12,name:'Perfura',desc:'Pierce 1',eff:{pierce:1}},
      {lvl:16,name:'Trilho',desc:'Full pierce',eff:{fullPierce:true}},
      {lvl:20,name:'Calibre',desc:'+18% dano',eff:{dmgMul:1.18}},
      {lvl:24,name:'Duplo',desc:'2 tiros',eff:{double:true}},
      {lvl:28,name:'Precisão',desc:'+12% vs ar',eff:{vsAir:1.12}},
      {lvl:32,name:'Carga',desc:'+16% dano',eff:{dmgMul2:1.16}},
      {lvl:36,name:'Alcance+',desc:'+14% rng',eff:{rngMul2:1.14}},
      {lvl:40,name:'Bala',desc:'2x pierce',eff:{pierce2:true}},
      {lvl:44,name:'Rail Final',desc:'+20% puro',eff:{pure:1.2}},
      {lvl:48,name:'Annihilator',desc:'Tudo',eff:{annihilate:true}},
    ];
  });

  const PILOTS = [
    { id:'cannon', name:'Capitão Rook "Muralha"', callsign:'ROOK', color:'#e2e8f0', desc:'Piloto da Corveta Gauss — especialista em defesa. Habilidade: Escudo de 2s.', ability:'shield', icon:'🛡️' },
    { id:'gatling', name:'Tenente Blaze "Vulcano"', callsign:'BLAZE', color:'#fbbf24', desc:'Piloto do Caça Vulcan — velocidade extrema. Habilidade: Dash.', ability:'dash', icon:'⚡' },
    { id:'laser', name:'Comandante Photon "Luz"', callsign:'PHOTON', color:'#f43f5e', desc:'Piloto do Destróier de Fótons — feixe mortal. Habilidade: Laser orbital.', ability:'laser', icon:'⌁' },
    { id:'missile', name:'Major MIRV "Chuvisco"', callsign:'MIRV', color:'#fb923c', desc:'Piloto do Bombardeiro — chuva de mísseis. Habilidade: Barragem.', ability:'barrage', icon:'☢' },
    { id:'cryo', name:'Sargento Frost "Zero"', callsign:'FROST', color:'#38bdf8', desc:'Piloto da Fragata Glacial — congela tudo. Habilidade: Campo glacial.', ability:'freeze', icon:'❄' },
    { id:'tesla', name:'Capitã Storm "Volt"', callsign:'STORM', color:'#34d399', desc:'Piloto do Cruzador Tempestade — relâmpagos. Habilidade: Cadeia.', ability:'chain', icon:'⚡' },
    { id:'sniper', name:'Fantasma "Olho"', callsign:'GHOST', color:'#67e8f9', desc:'Piloto do Espectro — tiro único, letal. Habilidade: Tiro perfurante.', ability:'pierce', icon:'✜' },
    { id:'venom', name:'Doutora Vex "Praga"', callsign:'VEX', color:'#a3e635', desc:'Piloto da Infectadora — veneno. Habilidade: Nuvem tóxica.', ability:'poison', icon:'☠' },
    { id:'amp', name:'Almirante Halo "Amplia"', callsign:'HALO', color:'#fde047', desc:'Piloto da Porta-Naves — suporte. Habilidade: Amplifica aliados.', ability:'buff', icon:'▲' },
    { id:'rail', name:'Coronel Rail "Trilho"', callsign:'RAIL', color:'#ffffff', desc:'Piloto do Encouraçado — canhão linear. Habilidade: Tiro que atravessa.', ability:'rail', icon:'╫' },
  ];

  const ENEMIES_DATA = {
    drone:    { hp: 32,  spd: 62,  gold: 6,   res: 1,  r: 8,  col: '#f97316', label: 'Enxame Alienígena', shape: 'tri', dmg: 1 },
    runner:   { hp: 20,  spd: 110, gold: 5,   res: 1,  r: 7,  col: '#fbbf24', label: 'Caçador Alienígena', shape: 'dart', dmg: 1, flying: true },
    tank:     { hp: 175, spd: 32,  gold: 16,  res: 2,  r: 12, col: '#94a3b8', label: 'Cruzador Hivemind', shape: 'square', dmg: 2, armor: 4 },
    swarm:    { hp: 12,  spd: 86,  gold: 2,   res: 1,  r: 5,  col: '#fb923c', label: 'Parasita do Vazio', shape: 'dot', dmg: 1 },
    healer:   { hp: 75,  spd: 42,  gold: 14,  res: 2,  r: 10, col: '#34d399', label: 'Matriarca Curandeira', shape: 'cross', dmg: 1, heals: true },
    phase:    { hp: 60,  spd: 68,  gold: 11,  res: 2,  r: 9,  col: '#38bdf8', label: 'Espectro do Vazio', shape: 'ring', dmg: 1, stealth: true, flying: true },
    bomber:   { hp: 52,  spd: 72,  gold: 10,  res: 2,  r: 9,  col: '#f43f5e', label: 'Bombardeiro de Plasma', shape: 'diamond', dmg: 1, onDeathStun: true },
    shielded: { hp: 95,  spd: 46,  gold: 15,  res: 3,  r: 11, col: '#60a5fa', label: 'Guardião de Carapaça', shape: 'shield', dmg: 1, shield: 80 },
    splitter: { hp: 58,  spd: 56,  gold: 10,  res: 2,  r: 10, col: '#fde047', label: 'Replicante Quântico', shape: 'split', dmg: 1, splits: true },
    colossus: { hp: 580, spd: 22,  gold: 50,  res: 6,  r: 16, col: '#64748b', label: 'Leviatã Biotitan', shape: 'jugg', dmg: 3, slowImmune: true, armor: 8 },
    mini:     { hp: 14,  spd: 95,  gold: 2,   res: 1,  r: 5,  col: '#fde047', label: 'Fragmento Alienígena', shape: 'dot', dmg: 1 },
    wasp:     { hp: 45,  spd: 92,  gold: 9,   res: 2,  r: 8,  col: '#facc15', label: 'Vespa Cortadora', shape: 'dart', dmg: 1, flying: true },
    boss1:    { hp: 1800, spd: 24, gold: 160, res: 15, r: 20, col: '#f43f5e', label: 'Nave-Mãe Alfa', shape: 'boss', dmg: 5, isBoss: true, shield: 400 },
    boss2:    { hp: 3200, spd: 22, gold: 220, res: 25, r: 22, col: '#fb923c', label: 'Titan Hivemind Hélios', shape: 'boss', dmg: 6, isBoss: true, shield: 800 },
    boss3:    { hp: 5000, spd: 20, gold: 300, res: 40, r: 24, col: '#22d3ee', label: 'Devorador de Mundos', shape: 'boss', dmg: 8, isBoss: true, shield: 1400 },
    fleet:    { hp: 8000, spd: 18, gold: 500, res: 60, r: 28, col: '#a3e635', label: 'FROTA SUPREMA HIVEMIND', shape: 'boss', dmg: 12, isBoss: true, shield: 2500, isFleet: true }
  };
  // ===== ULTRA: 100 variações procedurais (vida/vel/escudo/estilo) =====
  (function genVariants(){
    function hexToHsl(hex){
      const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      let h=0,s=0,l=(max+min)/2;
      if(max!==min){
        const d=max-min; s=l>0.5? d/(2-max-min): d/(max+min);
        switch(max){ case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d+2; break; case b: h=(r-g)/d+4; break; }
        h/=6;
      }
      return [h*360,s,l];
    }
    function hslToHex(h,s,l){
      h/=360; let r,g,b;
      if(s===0){ r=g=b=l; } else {
        const hue2rgb=(p,q,t)=>{ if(t<0) t+=1; if(t>1) t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3-t)*6; return p; };
        const q=l<0.5? l*(1+s): l+s-l*s, p=2*l-q;
        r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
      }
      const toHex=x=> ('0'+Math.round(x*255).toString(16)).slice(-2);
      return '#'+toHex(r)+toHex(g)+toHex(b);
    }
    const bases = Object.keys(ENEMIES_DATA);
    const suffixes = ['Mk-II','Mk-III','Alfa','Beta','Ômega','Specter','Fúria','Vex','Titan','Eclipse','Nova','Umbra','Ravager','Phantom','Wraith','Dread','Apex','Prime'];
    let variantCount = 0;
    // gera até 100 total (já tem 15, precisa 85)
    let seed = 1337;
    function rnd(){ seed = (seed*9301+49297)%233280; return seed/233280; }
    while(Object.keys(ENEMIES_DATA).length < 100){
      const baseKey = bases[Math.floor(rnd()*bases.length)];
      const base = ENEMIES_DATA[baseKey];
      // não varia boss demais pra não quebrar
      if(base.isBoss && rnd() < 0.6) continue;
      const hpMul = 0.72 + rnd()*1.55; // 0.72-2.27
      const spdMul = 0.82 + rnd()*0.78; // 0.82-1.6
      const shieldAdd = base.shield ? Math.round((rnd()*0.6-0.2)*base.shield) : (rnd()<0.28 ? Math.round(rnd()*90+20) : 0);
      const rAdd = Math.round((rnd()-0.5)*4);
      const [h,s,l] = hexToHsl(base.col);
      // IDENTIDADE UNIFICADA: variação contida dentro da família (max 18° hue, sat/light clamp suave)
      const nh = (h + (rnd()-0.5)*18 + 360)%360;
      const ns = Math.max(0.52, Math.min(0.92, s + (rnd()-0.5)*0.14));
      const nl = Math.max(0.46, Math.min(0.62, l + (rnd()-0.5)*0.10));
      const nCol = hslToHex(nh, ns, nl);
      const suff = suffixes[variantCount % suffixes.length] + (variantCount>=suffixes.length ? ' '+(Math.floor(variantCount/suffixes.length)+1) : '');
      const newKey = baseKey + '_v' + (variantCount+2);
      if(ENEMIES_DATA[newKey]) { variantCount++; continue; }
      const nLabel = base.label + ' ' + suff;
      const variant = {
        hp: Math.round(base.hp * hpMul),
        spd: Math.round(base.spd * spdMul),
        gold: Math.max(2, Math.round(base.gold * (0.85 + hpMul*0.35 + (shieldAdd?0.2:0)))),
        res: base.res + (hpMul>1.6?1:0) + (shieldAdd?1:0),
        r: Math.max(5, Math.min(26, base.r + rAdd)),
        col: nCol,
        label: nLabel,
        shape: base.shape,
        dmg: base.dmg + (hpMul>1.8 && rnd()<0.3 ? 1 : 0),
        // herda traits com chance de variação
        flying: base.flying || (rnd()<0.07),
        stealth: base.stealth || (rnd()<0.04),
        heals: base.heals,
        onDeathStun: base.onDeathStun || (rnd()<0.03),
        shield: Math.max(0, (base.shield||0) + shieldAdd),
        splits: base.splits,
        slowImmune: base.slowImmune || (rnd()<0.05 && hpMul>1.4),
        armor: Math.max(0, (base.armor||0) + (rnd()<0.22 ? Math.round((rnd()-0.5)*4) : 0)),
        isBoss: !!base.isBoss,
        variantOf: baseKey,
        hpMul: hpMul, spdMul: spdMul
      };
      // limpa undefined
      Object.keys(variant).forEach(k=> variant[k]===undefined && delete variant[k]);
      ENEMIES_DATA[newKey] = variant;
      variantCount++;
    }
  })();


  const MAPS_DATA = [
    {
      id: 1, name: 'Fronteira de Netuno: Borda do Sistema', sub: 'Onde tudo começa • 12 Ondas • Aliens detectados', theme: 'neptune-frontier',
      routes: [
        [[-1, 2], [5, 2], [5, 6], [2, 6], [2, 10], [10, 10], [10, 4], [15, 4], [15, 11], [21, 11]],
        [[-1, 8], [5, 8], [5, 11], [10, 11], [10, 4], [15, 4], [15, 11], [21, 11]]
      ],
      waves: ['d8', 'd12', 'd8 r6', 'r12 d6', 't1 d12 e4', 's18', 'h2 d14 v4', 'p8 d8 e6', 'b8 r12 v6', 't3 h2 s14 j1', 'd16 r12 p8 b8 e8', 'B1 d10 v8']
    },
    {
      id: 2, name: 'Anéis de Saturno: Cinturão de Gelo', sub: 'Tempestade de asteroides • 16 Ondas', theme: 'saturn-rings',
      routes: [
        [[-1, 1], [4, 1], [4, 8], [1, 8], [1, 11], [9, 11], [9, 3], [13, 3], [13, 9], [17, 9], [17, 2], [21, 2]],
        [[-1, 6], [7, 6], [7, 11], [9, 11], [9, 3], [13, 3], [13, 9], [17, 9], [17, 2], [21, 2]]
      ],
      waves: ['d12', 'r14', 't2 d10 e5', 's20 d8', 'h3 d14 v6', 'p10 r10 e6', 'b12 t2 j1', 'd18 s14 v8', 't4 h3 p10 v8', 'r18 b12 j2', 'd20 s16 h3 e10', 'p14 t4 v10', 'b16 r14 j2', 't6 h4 d20 e12', 's26 p14 v14', 'B1 h4 d16 v10']
    },
    {
      id: 3, name: 'Órbita de Júpiter: Gigante Gasoso', sub: 'Gravidade extrema • 18 Ondas', theme: 'jupiter-orbit',
      routes: [
        [[-1, 2], [4, 2], [4, 5], [8, 5], [8, 1], [14, 1], [14, 6], [11, 6], [11, 11], [18, 11], [18, 5], [21, 5]],
        [[-1, 10], [6, 10], [6, 7], [11, 7], [11, 11], [18, 11], [18, 5], [21, 5]],
        [[-1, 5], [2, 5], [8, 5], [8, 1], [14, 1], [14, 6], [11, 6], [11, 11], [18, 11], [18, 5], [21, 5]]
      ],
      waves: ['d14', 'r16 s10', 't3 d12 v5', 's22 r12', 'h4 d16 e5', 'p12 b10', 't4 h3 s18 v6', 'd18 r14 b10 e8', 'p14 s22 v8', 'r20 b14 h4 e10', 'd22 t6 j1', 's28 h5 e10', 'b18 r18 t5 v10', 'd24 p14 s14 j2', 'B2 h5 t6 e10', 'r24 b16 v12', 'd26 s24 p14 e12', 'B2 r20 d18 v14']
    },
    {
      id: 4, name: 'Cinturão de Asteroides: Última Barreira', sub: 'Última defesa antes da Terra • 20 Ondas', theme: 'asteroid-belt',
      routes: [
        [[-1, 1], [6, 1], [6, 4], [3, 4], [3, 9], [8, 9], [8, 6], [13, 6], [13, 2], [18, 2], [18, 8], [15, 8], [15, 11], [21, 11]],
        [[-1, 11], [5, 11], [5, 7], [8, 7], [8, 6], [13, 6], [13, 2], [18, 2], [18, 8], [15, 8], [15, 11], [21, 11]]
      ],
      waves: ['d16', 'r18 s12', 't4 d14 v6', 's24 r14', 'h5 d18 e6', 'p14 b12', 't5 h4 s20 v8', 'd22 r16 b12 e8', 'p16 s24 v10', 'r22 b16 h5 e10', 'd24 t6 j2', 's30 h6 e12', 'b20 r20 t6 v12', 'd26 p16 s16 j3', 'B2 h6 t6 e12', 'r26 b18 v14', 'd28 s26 p16 e14', 't8 h6 b16 j3', 'B3 h6 d22 v16', 'B3 r24 s28 j4']
    },
    {
      id: 5, name: 'Órbita da Terra: Última Esperança', sub: 'DEFENDA A TERRA • 24 Ondas • Invasão Final', theme: 'earth-orbit',
      routes: [
        [[-1, 1], [3, 1], [3, 6], [7, 6], [7, 2], [11, 2], [11, 7], [15, 7], [15, 3], [19, 3], [19, 9], [21, 9]],
        [[-1, 11], [5, 11], [5, 8], [11, 8], [11, 7], [15, 7], [15, 3], [19, 3], [19, 9], [21, 9]],
        [[-1, 6], [2, 6], [2, 4], [7, 4], [7, 2], [11, 2], [11, 7], [15, 7], [15, 3], [19, 3], [19, 9], [21, 9]]
      ],
      waves: ['d18', 'r20 s14', 't5 d16 v8', 's26 r16', 'h6 d20 e8', 'p16 b14', 't6 h5 s22 v10', 'd24 r18 b14 e10', 'B1 t5 j2', 'p18 s26 v12', 'r24 b18 h6 e12', 'd26 t8 j2', 'B2 p20 v12', 's32 h7 e14', 'b22 r22 t7 v14', 'd28 p18 s16 j3', 'B2 h7 t8 e14', 'r28 b20 v16', 'd30 s28 p18 e16', 't10 h8 b18 j4', 'B3 r26 d22 v16', 's36 p22 e18', 'd34 r28 b20 t8 j4', 'B3 B3 h8 d30 v20']
    },
    {
      id: 6, name: 'Nexus Pixel: Forja Orbital', sub: 'MAPA NOVO • Pixel Art Puro • 22 Ondas • Labirinto Longo', theme: 'neptune-frontier',
      routes: [
        [[-1, 6], [4, 6], [4, 2], [8, 2], [8, 10], [12, 10], [12, 2], [16, 2], [16, 10], [12, 10], [12, 6], [20, 6], [20, 2], [21, 2]],
        [[-1, 10], [6, 10], [6, 4], [10, 4], [10, 8], [14, 8], [14, 4], [18, 4], [18, 10], [14, 10], [14, 6], [20, 6], [20, 10], [21, 10]],
        [[-1, 2], [2, 2], [2, 6], [6, 6], [6, 2], [10, 2], [10, 6], [14, 6], [14, 2], [18, 2], [18, 10], [10, 10], [10, 6], [21, 6]]
      ],
      waves: ['d10 r6', 's16 r10', 't3 d10 v4', 'h4 s14 e6', 'p12 b8 v6', 'd18 t4 s10 j1', 'b14 r16 v8', 's22 h4 p10 v8', 't6 h4 d16 e10', 'r20 b14 v10', 'd22 s18 p12 e12', 'B1 h6 t6 v10', 's26 b18 v12', 'd26 p16 t6 j2', 'B2 r22 v12', 'h8 b20 r20 t8 j2', 'd30 s28 p16 e14', 'B3 B3 h8 v16', 'b16 r18 v10', 't8 h6 d20 e12', 'B2 B2 h10 v14', 'B3 B3 B3 h12 v18']
    },
    // ===== SISTEMA SOLAR TEMÁTICO — 8 PLANETAS + 6 LUAS MAIORES =====
    {
      id: 7, name: 'Mercúrio: Fornalha Solar', sub: '☿ Planeta mais próximo do Sol • 10 Ondas • Calor extremo', theme: 'jupiter-orbit',
      routes: [[[-1,6],[6,6],[6,2],[12,2],[12,10],[18,10],[18,6],[21,6]], [[-1,10],[4,10],[4,6],[10,6],[10,2],[16,2],[16,10],[21,10]]],
      waves: ['d8','r10 s6','t2 d8 v2','s14 h2','p6 b4','d12 t2 v4','b8 r8','B1 d8 v4','d14 p8 s10','B1 B1 h4 v6']
    },
    {
      id: 8, name: 'Vênus: Véu Ácido', sub: '♀ Inferno ácido • 12 Ondas • Nuvens corrosivas', theme: 'jupiter-orbit',
      routes: [[[-1,2],[5,2],[5,8],[2,8],[2,11],[9,11],[9,4],[14,4],[14,11],[21,11]], [[-1,8],[7,8],[7,2],[13,2],[13,8],[21,8]]],
      waves: ['d10','r12 s8','t2 d10 e3','s16 h3','p8 b6 v4','d14 t3 v6','b10 r10 v6','B1 d10 v6','d16 p10 s12','B1 B1 h4','p12 t4 b8','B2 d12 v8']
    },
    {
      id: 9, name: 'Marte: Deserto Vermelho', sub: '♂ Planeta vermelho • 14 Ondas • Tempestades de areia', theme: 'asteroid-belt',
      routes: [[[-1,6],[5,6],[5,2],[9,2],[9,8],[13,8],[13,2],[17,2],[17,6],[21,6]], [[-1,10],[7,10],[7,4],[11,4],[11,10],[15,10],[15,6],[21,6]]],
      waves: ['d12','r14 s8','t3 d12 v4','s18 h3','p10 b8','t4 h4 s14 v6','b12 r12 v8','B1 t3 v6','d18 p10 s14','B1 B1 h5','r18 b14 v10','B2 d16 v10','s22 h6 p12','B2 B1 h6 v10']
    },
    {
      id: 10, name: 'Lua: Mar da Tranquilidade', sub: '☾ Lua da Terra • 10 Ondas • Crateras', theme: 'asteroid-belt',
      routes: [[[-1,6],[3,6],[3,2],[7,2],[7,10],[11,10],[11,2],[15,2],[15,6],[21,6]]],
      waves: ['d8','s12 r8','t2 d8','s14 p4','b6 r8 v4','B1 d10','d14 s10 p4','B1 B1 h3','d16 p8 v6','B2 d14 v8']
    },
    {
      id: 11, name: 'Europa: Oceano Congelado', sub: 'Lua de Júpiter • 12 Ondas • Gelo rachado', theme: 'neptune-frontier',
      routes: [[[-1,2],[4,2],[4,6],[8,6],[8,2],[12,2],[12,6],[16,6],[16,2],[21,2]], [[-1,10],[6,10],[6,2],[10,2],[10,6],[14,6],[14,10],[21,10]]],
      waves: ['d10','r12 s6','t2 d10','s16 h3 e4','p8 b6','t4 s12 v6','b10 r12 v6','B1 d12 v6','d16 p10 s10','B1 B1 h5','h6 t4 b10','B2 d14 v8']
    },
    {
      id: 12, name: 'Titã: Lagos de Metano', sub: 'Lua de Saturno • 14 Ondas • Névoa laranja', theme: 'saturn-rings',
      routes: [[[-1,6],[5,6],[5,2],[9,2],[9,8],[13,8],[13,2],[17,2],[17,6],[21,6]], [[-1,10],[4,10],[4,4],[8,4],[8,10],[12,10],[12,6],[16,6],[16,10],[21,10]]],
      waves: ['d12','r14 s8','t3 d10 v4','s16 h4','p10 b8 v4','t4 h4 s14','B1 t4 v6','b12 r14 v8','d18 p12 s12','B1 B1 h5','r20 b14 v10','B2 d18 v10','s24 h6 p12','B2 B1 h6 v12']
    },
    {
      id: 13, name: 'Urano: Gigante de Gelo', sub: '⛢ Inclinação extrema • 16 Ondas • Anéis finos', theme: 'neptune-frontier',
      routes: [[[-1,2],[6,2],[6,8],[2,8],[2,11],[10,11],[10,4],[15,4],[15,11],[21,11]], [[-1,10],[8,10],[8,4],[12,4],[12,11],[21,11]]],
      waves: ['d14','r16 s8','t3 d12 v4','s20 h3 e6','p12 b10','t5 h5 s16 v6','b14 r14 v8','B1 t4 v8','d20 p12 s14','B1 B1 h6','r22 b16 v10','B2 d18 v12','s26 h6 p14','B2 B1 h8 v12','b16 r18 v12','B3 h8 v16']
    },
    {
      id: 14, name: 'TRITÃO: Última Lua', sub: 'Lua de Netuno • 12 Ondas • Gêiseres', theme: 'neptune-frontier',
      routes: [[[-1,6],[5,6],[5,2],[9,2],[9,8],[13,8],[13,2],[17,2],[17,8],[21,8]]],
      waves: ['d10','r12 s8','t2 d10 v4','s16 h3','p10 b8','t4 s14 v6','b12 r12','B1 t4 v6','d18 p10 s12','B1 B1 h5','r22 b14','B2 d16 v10']
    },
    // ===== BOSS SUPREMO — FROTA GIGANTE =====
    {
      id: 15, name: '⚠ FROTA SUPREMA HIVEMIND: Sistema Solar', sub: '★ CHEFE FINAL • Todo o Sistema Solar de fundo • Frota gigante', theme: 'earth-orbit',
      routes: [
        [[-1,1],[4,1],[4,6],[8,6],[8,1],[12,1],[12,6],[16,6],[16,1],[21,1]],
        [[-1,6],[4,6],[4,11],[8,11],[8,6],[12,6],[12,11],[16,11],[16,6],[21,6]],
        [[-1,11],[6,11],[6,6],[10,6],[10,11],[14,11],[14,6],[18,6],[18,11],[21,11]]
      ],
      waves: [
        'd20 r20 s20','t8 h8 p16 b16 e16 v16 j2 w10','B1 B1 h8 p16','s30 r30 t10','B2 B2 h10 p18','d30 s30 p20 e18','B1 B2 B3 h10','r30 b22 t10 w12','B3 B3 h12','s36 p24 e20 j4 w14','B1 B2 B3 B3 h14 p22','d40 r40 s40 t12','B3 B3 B3 h16 e22 j6','B1 B2 B3 B3 B3 h18 p26','B3 B3 B3 B3 h20 e24 j8 w16'
      ]
    }
  ];

  const SHMUP_STAGES = [
    { id:1, name:'Netuno: Névoa Azul', planet:'Netuno', theme:'neptune-frontier', bg:'#051425', accent:'#38bdf8', enemyPool:['drone','runner','swarm'], boss:'swarm', duration:22, target:22, speed:1.0, desc:'Patrulha na névoa de Netuno' },
    { id:2, name:'Saturno: Anéis Cortantes', planet:'Saturno', theme:'saturn-rings', bg:'#1a1408', accent:'#fbbf24', enemyPool:['swarm','wasp','phase'], boss:'phase', duration:24, target:25, speed:1.15, desc:'Navegue entre os anéis' },
    { id:3, name:'Júpiter: Tempestade Vermelha', planet:'Júpiter', theme:'jupiter-orbit', bg:'#1a0f08', accent:'#fb923c', enemyPool:['tank','bomber','colossus'], boss:'colossus', duration:26, target:28, speed:1.25, desc:'Sobreviva à Grande Mancha' },
    { id:4, name:'Cinturão: Campo de Destroços', planet:'Cinturão', theme:'asteroid-belt', bg:'#0f0a14', accent:'#94a3b8', enemyPool:['swarm','splitter','shielded'], boss:'splitter', duration:28, target:30, speed:1.35, desc:'Asteroides por toda parte' },
    { id:5, name:'Terra: Órbita Final', planet:'Terra', theme:'earth-orbit', bg:'#051425', accent:'#22d3ee', enemyPool:['boss1','boss2','boss3'], boss:'boss1', duration:30, target:32, speed:1.45, desc:'Defenda a Terra até o fim' },
  ];
  // ===== 5 ESTILOS DE NAVINHA (90s/2000s) - cada fase usa um estilo diferente =====
  const NAVE_STYLES = [
    { id:'asteroids', name:'Asteroids: Campo de Meteoros', styleId:'asteroids', bg:'#020617', accent:'#38bdf8',
      enemyPool:['swarm','mini','splitter'], duration:22, target:22, speed:1.0,
      desc:'Drift 360° estilo Asteroids — destrua meteoros que se dividem' },
    { id:'horizontal', name:'Corredor Horizontal: R-Type', styleId:'horizontal', bg:'#0a0f1a', accent:'#fbbf24',
      enemyPool:['runner','wasp','tank'], duration:24, target:25, speed:1.15,
      desc:'Scroll lateral com tiro carregado estilo R-Type/Gradius' },
    { id:'vertical', name:'Bullet Hell: Raiden', styleId:'vertical', bg:'#87CEEB', accent:'#f43f5e',
      enemyPool:['drone','bomber','shielded'], duration:26, target:28, speed:1.25,
      desc:'Scroll vertical com boss e chuva de balas estilo Raiden' },
    { id:'arena', name:'Arena 360°: Geometry Wars', styleId:'arena', bg:'#0f172a', accent:'#34d399',
      enemyPool:['swarm','drone','phase','splitter'], duration:28, target:30, speed:1.35,
      desc:'Arena fechada twin-stick estilo Geometry Wars/Smash TV' },
    { id:'tunnel', name:'Túnel 3D: Tempest', styleId:'tunnel', bg:'#050914', accent:'#a3e635',
      enemyPool:['phase','wasp','bomber'], duration:30, target:32, speed:1.45,
      desc:'Túnel pseudo-3D com lanes estilo Tempest/Star Fox' },
  ];
  // 5 CAMPANHAS x 5 FASES = 25 fases navinha + 5 TD = 30 total
  const NAVE_CAMPAIGNS = [
    { id:'asteroids', name:'Campanha Asteroids', styleId:'asteroids', bg:'#020617', accent:'#38bdf8', desc:'Drift 360° — 5 fases do campo ao núcleo', phases:[
      { obj:'kill', n:1, name:'Campo Inicial', desc:'Destrua 18 meteoros — aprenda o drift', enemyPool:['swarm','mini'], duration:20, target:18, speed:1.0 },
      { obj:'kill', n:2, name:'Fragmentação', desc:'22 meteoros que se dividem', enemyPool:['swarm','splitter','mini'], duration:22, target:22, speed:1.1 },
      { obj:'survive', n:3, name:'Cinturão Denso', desc:'26 asteroides rápidos', enemyPool:['swarm','phase','mini'], duration:24, target:26, speed:1.25 },
      { obj:'kill', n:4, name:'Tempestade', desc:'28 — enxame + caçadores', enemyPool:['drone','swarm','splitter'], duration:26, target:28, speed:1.35 },
      { obj:'boss', n:5, name:'Núcleo do Asteroide', desc:'BOSS — 32 + núcleo colossal', enemyPool:['colossus','swarm','mini'], duration:30, target:32, speed:1.45, boss:true },
    ]},
    { id:'horizontal', name:'Campanha R-Type', styleId:'horizontal', bg:'#0a0f1a', accent:'#fbbf24', desc:'Corredor horizontal — 5 fases até a Nave-Mãe', phases:[
      { obj:'kill', n:1, name:'Corredor Inicial', desc:'20 caças — aprenda charge', enemyPool:['runner'], duration:22, target:20, speed:1.0 },
      { obj:'kill', n:2, name:'Esquadrão', desc:'24 — enxame + wasp', enemyPool:['runner','wasp'], duration:24, target:24, speed:1.12 },
      { obj:'survive', n:3, name:'Fortaleza', desc:'26 — tanques blindados', enemyPool:['tank','runner','wasp'], duration:26, target:26, speed:1.25 },
      { obj:'kill', n:4, name:'Enxame', desc:'28 — horda total', enemyPool:['swarm','wasp','tank'], duration:28, target:28, speed:1.35 },
      { obj:'boss', n:5, name:'Nave-Mãe', desc:'BOSS — 32 + canhões', enemyPool:['colossus','bomber','tank'], duration:30, target:32, speed:1.45, boss:true },
    ]},
    { id:'vertical', name:'Campanha Raiden', styleId:'vertical', bg:'#87CEEB', accent:'#f43f5e', desc:'Bullet hell vertical — 5 fases até a fortaleza', phases:[
      { obj:'kill', n:1, name:'Ascensão', desc:'20 drones — aquecimento', enemyPool:['drone'], duration:22, target:20, speed:1.0 },
      { obj:'kill', n:2, name:'Tempestade', desc:'24 — chuva de balas', enemyPool:['drone','swarm'], duration:24, target:24, speed:1.15 },
      { obj:'survive', n:3, name:'Bombardeio', desc:'26 — bombers + escudos', enemyPool:['bomber','shielded','drone'], duration:26, target:26, speed:1.25 },
      { obj:'kill', n:4, name:'Inferno', desc:'28 — phase + wasp em massa', enemyPool:['phase','wasp','bomber'], duration:28, target:28, speed:1.38 },
      { obj:'boss', n:5, name:'Fortaleza Voadora', desc:'BOSS — 32 + chefe final', enemyPool:['boss1','boss2','colossus'], duration:30, target:32, speed:1.45, boss:true },
    ]},
    { id:'arena', name:'Campanha Geometry', styleId:'arena', bg:'#0f172a', accent:'#34d399', desc:'Arena 360° — 5 fases de sobrevivência', phases:[
      { obj:'kill', n:1, name:'Arena Pequena', desc:'18 — primeiro contato', enemyPool:['swarm'], duration:20, target:18, speed:1.0 },
      { obj:'kill', n:2, name:'Hordas', desc:'22 — drones caçadores', enemyPool:['swarm','drone'], duration:22, target:22, speed:1.12 },
      { obj:'survive', n:3, name:'Caçadores', desc:'26 — phase + splitter', enemyPool:['phase','splitter','swarm'], duration:24, target:26, speed:1.25 },
      { obj:'kill', n:4, name:'Sobrecarga', desc:'28 — tudo ao mesmo tempo', enemyPool:['swarm','phase','splitter','drone'], duration:26, target:28, speed:1.38 },
      { obj:'boss', n:5, name:'Mestre da Arena', desc:'BOSS — 32 + colosso', enemyPool:['colossus','phase','swarm'], duration:30, target:32, speed:1.48, boss:true },
    ]},
    { id:'tunnel', name:'Campanha Tempest', styleId:'tunnel', bg:'#050914', accent:'#a3e635', desc:'Túnel 3D — 5 fases até o coração', phases:[
      { obj:'kill', n:1, name:'Túnel Inicial', desc:'18 — aprenda as lanes', enemyPool:['phase'], duration:20, target:18, speed:1.0 },
      { obj:'kill', n:2, name:'Curvas', desc:'22 — wasps nas curvas', enemyPool:['wasp','phase'], duration:22, target:22, speed:1.12 },
      { obj:'survive', n:3, name:'Aceleração', desc:'26 — bombers velozes', enemyPool:['bomber','phase','wasp'], duration:24, target:26, speed:1.28 },
      { obj:'kill', n:4, name:'Inversão', desc:'28 — lanes invertidas', enemyPool:['phase','wasp','bomber'], duration:26, target:28, speed:1.38 },
      { obj:'boss', n:5, name:'Coração do Túnel', desc:'BOSS — 32 + guardião', enemyPool:['colossus','phase','wasp'], duration:30, target:32, speed:1.48, boss:true },
    ]},
  ];
  const METAL_STAGES = [
    { id:1, name:'Netuno: Geleira Abissal', planet:'Netuno', theme:'neptune-frontier', bg:'#051425', accent:'#38bdf8', enemyPool:['swarm','drone'], platTheme:'ice', duration:35, target:24, gravity:950, desc:'Infantaria alien na geleira' },
    { id:2, name:'Saturno: Plataformas de Gelo', planet:'Saturno', theme:'saturn-rings', bg:'#1a1408', accent:'#fbbf24', enemyPool:['wasp','phase'], platTheme:'rings', duration:35, target:26, gravity:820, desc:'Salte entre anéis' },
    { id:3, name:'Júpiter: Fornalha', planet:'Júpiter', theme:'jupiter-orbit', bg:'#1a0f08', accent:'#fb923c', enemyPool:['tank','bomber'], platTheme:'volcano', duration:35, target:28, gravity:1050, desc:'Chão que queima' },
    { id:4, name:'Cinturão: Ruínas', planet:'Cinturão', theme:'asteroid-belt', bg:'#0f0a14', accent:'#94a3b8', enemyPool:['shielded','splitter'], platTheme:'ruins', duration:35, target:30, gravity:900, desc:'Ruínas de batalha' },
    { id:5, name:'Terra: Trincheiras Finais', planet:'Terra', theme:'earth-orbit', bg:'#051425', accent:'#22d3ee', enemyPool:['colossus','boss1'], platTheme:'earth', duration:38, target:32, gravity:950, desc:'Última trincheira' },
  ];

  const TECH_UPGRADES = [
    { id: 'start_gold', name: 'Reserva de Créditos', desc: '+60 Créditos Iniciais por nível.', max: 5, cost: 10 },
    { id: 'global_dmg', name: 'Calibragem de Matriz', desc: '+5% de Dano Global em todas as torres.', max: 5, cost: 15 },
    { id: 'global_rng', name: 'Ópticas Aumentadas', desc: '+6% de Alcance Global em todas as torres.', max: 5, cost: 12 },
    { id: 'super_cd', name: 'Condensadores Quânticos', desc: '-12% Cooldown das Superarmas Orbitais.', max: 4, cost: 20 },
    { id: 'salvage', name: 'Nanobots de Reciclagem', desc: '+15% Créditos por abate de invasores.', max: 4, cost: 18 },
    { id: 'base_hp', name: 'Escudos de Portal', desc: '+5 de Integridade máxima do Portal.', max: 4, cost: 15 }
  ];

  const DIFFICULTIES = {
    normal:  { key: 'normal',  name: 'RECRUTA',  livesMul: 1,   hpMul: 1,    goldMul: 1,   col: '#34d399', crystalBonus: 1 },
    veteran: { key: 'veteran', name: 'VETERANO', livesMul: 0.7, hpMul: 1.25, goldMul: 0.9, col: '#fbbf24', crystalBonus: 2 },
    insane:  { key: 'insane',  name: 'INSANE',   livesMul: 0.5, hpMul: 1.55, goldMul: 0.8, col: '#f43f5e', crystalBonus: 3 }
  };

  const TARGET_MODES = ['FIRST', 'STRONGEST', 'WEAKEST', 'CLOSEST', 'FASTEST'];

  const WAVE_LETTERS = {
    d: 'drone', r: 'runner', t: 'tank', s: 'swarm', h: 'healer',
    p: 'phase', b: 'bomber', e: 'shielded', v: 'splitter', j: 'colossus',
    w: 'wasp', B1: 'boss1', B2: 'boss2', B3: 'boss3'
  };

  const WAVE_LABELS = {
    d: 'Drone', r: 'Veloz', t: 'Blindado', s: 'Enxame', h: 'Médica',
    p: 'Espectral', b: 'Bomba PEM', e: 'Escudo', v: 'Divisor', j: 'Colosso',
    w: 'Vespa', B1: 'Dreadnought', B2: 'Titan Hélios', B3: 'Devorador'
  };

  function parseWaveString(str) {
    const queue = [];
    let curTime = 0;
    str.trim().split(/\s+/).forEach(tok => {
      if (!tok) return;
      let code = tok[0];
      let countStr = tok.slice(1);
      if (tok.startsWith('B')) {
        code = tok.slice(0, 2);
        countStr = tok.slice(2);
      }
      const type = WAVE_LETTERS[code] || 'drone';
      const count = Math.max(1, parseInt(countStr, 10) || 1);
      const gap = type === 'swarm' ? 0.28 : (type.startsWith('boss') ? 0 : 0.75);
      for (let i = 0; i < count; i++) {
        queue.push({ at: curTime, type: type });
        curTime += gap;
      }
      if (type.startsWith('boss')) curTime += 2.0;
    });
    return queue;
  }

  function makeEndlessWave(n) {
    const pool = ['d', 'r', 's', 't', 'h', 'p', 'b', 'e', 'v', 'j', 'w'];
    const budget = 10 + n * 3;
    const parts = [];
    let left = budget, i = 0;
    while (left > 0) {
      const code = pool[(n * 7 + i * 5) % pool.length];
      const count = Math.min(left, 4 + ((n + i) % 8));
      parts.push(code + count);
      left -= count;
      i++;
    }
    if (n % 5 === 0) parts.push('B' + (1 + (Math.floor(n / 5) % 3)));
    return parts.join(' ');
  }

  function wpToPixels(wps) {
    return wps.map(w => ({ x: w[0] * CELL_SIZE + CELL_SIZE / 2, y: w[1] * CELL_SIZE + CELL_SIZE / 2 }));
  }

  function getPathLength(pts) {
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    return len;
  }

  function getPosAtDist(pts, dist) {
    for (let i = 0; i < pts.length - 1; i++) {
      const segLen = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      if (dist <= segLen) {
        const ratio = segLen === 0 ? 0 : dist / segLen;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * ratio, y: pts[i].y + (pts[i + 1].y - pts[i].y) * ratio };
      }
      dist -= segLen;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  function getPathBlockedCells(routes) {
    const blocked = {};
    routes.forEach(wps => {
      const pts = wpToPixels(wps);
      const total = getPathLength(pts);
      for (let d = 0; d <= total; d += 6) {
        const p = getPosAtDist(pts, d);
        const c = Math.floor(p.x / CELL_SIZE);
        const r = Math.floor(p.y / CELL_SIZE);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) blocked[c + ',' + r] = true;
      }
    });
    return blocked;
  }

  const Save = {
    key: SAVE_KEY,
    notifications: [],
    data: null,
    defaults() {
      return {
        v: 3, unlockedMap: 1, crystals: 30, mapStars: {}, tech: {},
        achievements: [], bestEndless: {}, lastDiff: 'normal', muted: false, autoNext: false,
        naveProgress: { asteroids:1, horizontal:1, vertical:1, arena:1, tunnel:1 },
        naveStars: { asteroids:[0,0,0,0,0], horizontal:[0,0,0,0,0], vertical:[0,0,0,0,0], arena:[0,0,0,0,0], tunnel:[0,0,0,0,0] },
        shipLevels: { cannon:1, gatling:1, laser:1, missile:1, cryo:1, tesla:1, sniper:1, venom:1, amp:1, rail:1 }
      };
    },
    load() {
      this.data = this.defaults();
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          const raw = localStorage.getItem(this.key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.v === 3) Object.assign(this.data, parsed);
          }
        }
      } catch (e) { /* storage indisponível */ }
      if (this.repairProgress()) this.save();
      return this.data;
    },
    repairProgress() {
      if (!this.data) return false;
      const stars = this.data.mapStars || {};
      let earnedUnlocks = 1;
      Object.keys(stars).forEach(key => {
        const idx = Number(key);
        if (Number.isInteger(idx) && idx >= 0 && idx < MAPS_DATA.length && Number(stars[key]) > 0) {
          earnedUnlocks = Math.max(earnedUnlocks, idx + 2);
        }
      });
      const repaired = Math.min(
        MAPS_DATA.length,
        Math.max(1, Number(this.data.unlockedMap) || 1, earnedUnlocks)
      );
      const changed = repaired !== this.data.unlockedMap;
      this.data.unlockedMap = repaired;
      return changed;
    },
    save() {
      try {
        if (typeof localStorage !== 'undefined' && localStorage) {
          localStorage.setItem(this.key, JSON.stringify(this.data));
        }
      } catch (e) { /* quota/privacy mode */ }
    },
    unlock(id) {
      if (this.data.achievements.includes(id)) return false;
      this.data.achievements.push(id);
      this.save();
      this.notifications.push({ id: id, at: Date.now() });
      return true;
    },
    drainNotifications() {
      const n = this.notifications;
      this.notifications = [];
      return n;
    },
    techLevel(id) { return this.data.tech[id] || 0; }
  };

  const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'Primeiro Sangue', desc: 'Abata seu primeiro invasor.', icon: '🩸' },
    { id: 'kills_100', name: 'Exterminador', desc: 'Abata 100 invasores numa partida.', icon: '💀' },
    { id: 'kills_500', name: 'Ceifador de Frotas', desc: 'Abata 500 invasores numa partida.', icon: '☄️' },
    { id: 'no_leak_10', name: 'Muralha Impecável', desc: 'Vença sem perder integridade (mín. 10 ondas).', icon: '🛡️' },
    { id: 'max_tower', name: 'Engenharia Suprema', desc: 'Leve uma torre ao nível máximo.', icon: '🏗️' },
    { id: 'boss_slayer', name: 'Matador de Nave-Mãe', desc: 'Destrua um Dreadnought ou superior.', icon: '🎯' },
    { id: 'rich', name: 'Magnata Orbital', desc: 'Acumule 2000 créditos.', icon: '💰' },
    { id: 'map1_clear', name: 'Defensor de Alfa', desc: 'Complete o Setor 1.', icon: '⭐' },
    { id: 'all_maps', name: 'Guardião da Periferia', desc: 'Complete todos os 15 setores.', icon: '👑' },
    { id: 'endless_30', name: 'Sem Fim à Vista', desc: 'Sobreviva à onda 30 no Modo Infinito.', icon: '♾️' },
    { id: 'hard_win', name: 'Duro de Roer', desc: 'Vença qualquer setor em dificuldade VETERANO.', icon: '🔥' },
    { id: 'insane_win', name: 'Lenda do Vácuo', desc: 'Vença qualquer setor em dificuldade INSANE.', icon: '🌌' }
  ];

  const AIR_KINDS = ['beam', 'chain', 'snipe', 'slow', 'dot', 'buff'];

  const SUPERS = {
    // G9: íon com bônus vs boss; PEM restrito a raio (antes: global)
    ion:       { key: 'ion',       name: 'Canhão de Íons',        hot: 'Q', maxCd: 20, dmg: 520, radius: 88, color: '#38bdf8', targeted: true,  desc: 'Mira um ponto: feixe orbital colossal (520 dano puro + queimadura; +100% vs chefe).' },
    emp:       { key: 'emp',       name: 'Pulso PEM',             hot: 'W', maxCd: 26, radius: 180, color: '#60a5fa', targeted: true, desc: 'Mira um ponto: pulso PEM em raio 180 — congela 5s, drena 70% escudos e atordoa.' },
    vortex:    { key: 'vortex',    name: 'Vórtice Gravitacional', hot: 'E', maxCd: 30, radius: 110, dps: 42, dur: 6, color: '#22d3ee', targeted: true, desc: 'Buraco negro que suga e tritura por 6s (dano crescente).' },
    overdrive: { key: 'overdrive', name: 'Sobrecarga de Reator',  hot: 'R', maxCd: 36, dur: 9, rateMul: 2.2, color: '#fb923c', desc: '+120% cadência + projéteis em chamas por 9s.' }
  };

  // ===== ULTRA: sistema de MUTATIONS roguelike (escolha a cada 3 ondas) =====
  const MUTATIONS = [
    { id:'mut_dmg', name:'Sobrecarga de Núcleo', desc:'+18% dano em TODAS as torres (acumula).', color:'#f43f5e', icon:'⚡', tag:'OFENSIVO',
      apply: S => { S.mutBuffs.dmg = (S.mutBuffs.dmg||0)+0.18; } },
    { id:'mut_rng', name:'Ópticas de Precisão', desc:'+14% alcance em todas as torres. Visão é poder.', color:'#38bdf8', icon:'◎', tag:'TÁTICO',
      apply: S => { S.mutBuffs.rng = (S.mutBuffs.rng||0)+0.14; } },
    { id:'mut_rate', name:'Acelerador Temporal', desc:'+14% cadência global. Mais tiros, mais caos.', color:'#fbbf24', icon:'≋', tag:'OFENSIVO',
      apply: S => { S.mutBuffs.rate = (S.mutBuffs.rate||0)+0.14; } },
    { id:'mut_gold', name:'Protocolo de Saque', desc:'+35% créditos por abate. Fique rico ou morra tentando.', color:'#fbbf24', icon:'◆', tag:'ECONOMIA',
      apply: S => { S.mutBuffs.gold = (S.mutBuffs.gold||0)+0.35; } },
    { id:'mut_crit', name:'Munição Perfurante', desc:'+18% chance de acerto crítico (2× dano).', color:'#fb923c', icon:'✦', tag:'OFENSIVO',
      apply: S => { S.mutBuffs.crit = (S.mutBuffs.crit||0)+0.18; } },
    { id:'mut_slow', name:'Campo Criogênico', desc:'Torres Cryo +40% duração de congelamento e +20% área.', color:'#38bdf8', icon:'❄', tag:'CONTROLE',
      apply: S => { S.mutBuffs.cryo = (S.mutBuffs.cryo||0)+1; } },
    { id:'mut_chain', name:'Rede de Tesla', desc:'Bobina Tesla salta +2 alvos extras e +15% dano em cadeia.', color:'#34d399', icon:'⚡', tag:'OFENSIVO',
      apply: S => { S.mutBuffs.chain = (S.mutBuffs.chain||0)+1; } },
    { id:'mut_splash', name:'Ogivas Termobáricas', desc:'Mísseis e Railguns +28% raio de explosão e +20% dano em área.', color:'#fb923c', icon:'☢', tag:'OFENSIVO',
      apply: S => { S.mutBuffs.splash = (S.mutBuffs.splash||0)+0.28; } },
    { id:'mut_shield', name:'Barreira de Contenção', desc:'+8 integridade máxima + cura 3 ao escolher.', color:'#34d399', icon:'⬡', tag:'DEFENSIVO',
      apply: S => { S.livesMax += 8; S.lives = Math.min(S.livesMax, S.lives+3); } },
    { id:'mut_super', name:'Condensador Instável', desc:'-18% cooldown de TODAS as supers. Spamme sem parar.', color:'#a3e635', icon:'⬢', tag:'ULTIMATE',
      apply: S => { S.mutBuffs.superCd = (S.mutBuffs.superCd||0)+0.18; for(const k in S.powers) S.powers[k].maxCd *= 0.82; } },
    { id:'mut_poison', name:'Cepa Virulenta', desc:'Veneno dura 45% mais e espalha em +1 alvo extra.', color:'#a3e635', icon:'☣', tag:'CONTROLE',
      apply: S => { S.mutBuffs.poison = (S.mutBuffs.poison||0)+1; } },
    { id:'mut_overdrive', name:'Reator Quântico', desc:'Overdrive dura +4s e também dá +25% dano durante.', color:'#f59e0b', icon:'⬣', tag:'ULTIMATE',
      apply: S => { S.mutBuffs.odDur = (S.mutBuffs.odDur||0)+4; S.mutBuffs.odDmg = (S.mutBuffs.odDmg||0)+0.25; } },
  ];

  function getMutationChoices(seed, count){
    const arr = MUTATIONS.slice();
    // seeded shuffle simples
    let s = seed * 9301 + 49297;
    for(let i=arr.length-1;i>0;i--){
      s = (s * 9301 + 49297) % 233280;
      const j = s % (i+1);
      const tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp;
    }
    return arr.slice(0, count||3);
  }

  const COMBO = {
    window: 2.2, // segundos para manter combo
    maxStacks: 50,
    goldPerStack: 0.04, // +4% gold por stack
    dmgPerStack: 0.015  // +1.5% dmg por stack (visual)
  };

// ===== v3 PIXEL: TIERS + MERGE + PADRÕES DE TIRO + SUPERS AUTOMÁTICOS + FÁBRICA + LÓGICA TÁTICA =====
const MERGE_PARTS = { 1: 12, 2: 24, 3: 48, 4: 96 }; // peças ⚙ p/ fundir tier N → N+1
const TIER_NAMES = ['T1', 'T2', 'T3', 'T4', 'T5'];
function getTier(level) { return Math.min(5, Math.floor(((level || 1) - 1) / 10) + 1); }
const TIER_STATS = [
  null,
  { dmg: 1,    rate: 1,    rng: 1,     parts: 0 },
  { dmg: 2.2,  rate: 1.15, rng: 1.10,  parts: 20 },
  { dmg: 4.8,  rate: 1.30, rng: 1.21,  parts: 40 },
  { dmg: 10,   rate: 1.50, rng: 1.331, parts: 80 },
  { dmg: 22,   rate: 1.70, rng: 1.464, parts: 160 }
];
// Fase 3 — variações de tiro por tier (consumido por fireTower)
const SHOT_PATTERNS = {
  cannon:  { multi: [1, 2, 3, 4, 5] },                                  // leque largo
  gatling: { burst: [2, 3, 4, 5, 6] },                                  // rajada de tracantes
  laser:   { width: [1, 1.9, 1.9, 2.6, 2.6], sweep: [0, 0, 1, 2, 3] }, // feixe largo/prismas/varredor
  missile: { salvo: [1, 2, 3, 4, 5], mirv: [false, false, false, false, true] },
  cryo:    { pulses: [1, 2, 3, 4, 5] },                                 // anéis glaciais
  tesla:   { chain: [4, 6, 8, 10, 12] },
  sniper:  { targets: [1, 1, 1, 2, 3], tracer: [false, true, true, true, true] },
  venom:   { rngMul: [1, 1, 1.15, 1.35, 1.6], stacks: [1, 1, 1.5, 1.75, 2] },
  amp:     { ring: [1, 1.15, 1.3, 1.45, 1.6] },
  rail:    { beams: [1, 2, 3, 1, 1], full: [false, false, false, true, true], star: [false, false, false, false, true] }
};
// Fase 4 — super automático por tipo (carga = res dos abates daquele tipo)
const SUPERS_AUTO = {
  cannon:  { key: 'cannon',  name: 'Barragem Orbital',    desc: '20 obuses caem na maior concentração de inimigos.', col: '#e2e8f0' },
  gatling: { key: 'gatling', name: 'Tornado de Chumbo',   desc: '360° por 3s acertando tudo em alcance dobrado.', col: '#fbbf24' },
  laser:   { key: 'laser',   name: 'Prisma Solar',        desc: 'Feixe varre a rota inteira por 2.5s.', col: '#f43f5e' },
  missile: { key: 'missile', name: 'Enxame MIRV',         desc: '16 mísseis nos alvos mais caros.', col: '#fb923c' },
  cryo:    { key: 'cryo',    name: 'Era Glacial',         desc: 'Congela TODOS os inimigos por 3s.', col: '#38bdf8' },
  tesla:   { key: 'tesla',   name: 'Tempestade Final',    desc: '12 relâmpagos em cadeia global.', col: '#34d399' },
  sniper:  { key: 'sniper',  name: 'Sentença',            desc: 'Executa os 3 inimigos de menor HP na tela.', col: '#67e8f9' },
  venom:   { key: 'venom',   name: 'Maré Nanopraga',      desc: 'Envenena todos os inimigos em tela por 8s.', col: '#a3e635' },
  amp:     { key: 'amp',     name: 'Sobrecarga Total',    desc: 'Todas as torres +100% dano por 6s (anel dourado).', col: '#fde047' },
  rail:    { key: 'rail',    name: 'Lança Estelar',       desc: '3 linhas perfurantes cruzam o mapa.', col: '#ffffff' }
};
function superThreshold(tier) { return Math.max(12, 30 - (tier || 1) * 3); }

// Fase 5 — Fábrica Orbital (produz peças ⚙ e créditos por onda completa)
const FACTORY_DATA = {
  id: 'factory', name: 'Fábrica Orbital', icon: '⚙', color: '#34d399', kind: 'factory',
  cost: 120, maxLevel: 5,
  desc: 'Prédio industrial: produz PEÇAS ⚙ e créditos a cada onda completa.',
  upgradePartsCost: lvl => 15 * lvl,
  upgradeCreditCost: lvl => Math.round(90 * Math.pow(1.8, lvl)),
  partsPerWave: lvl => 20 * lvl,
  creditsPerWave: lvl => 18 * lvl,
  fuelBoost: lvl => 0.25 * lvl
};
// E1/E2 — Estação Espacial (base fixa) e Nave de Apoio (móvel): reabastecem fuel/batt/ammo em raio
const STATION_DATA = {
  id: 'station', name: 'Estação Espacial', cost: 400, kind: 'station',
  supplyRadius: 170, rates: { fuel: 12, batt: 14, ammo: 6 }, color: '#f5a83d',
  desc: 'Base fixa de suprimento: reabastece combustível, bateria e munição das torres no raio.'
};
const SUPPORT_DATA = {
  id: 'support', name: 'Nave de Apoio', cost: 90, kind: 'support',
  supplyRadius: 95, rates: { fuel: 6, batt: 7, ammo: 3 }, color: '#7dd3fc',
  desc: 'Nave logística móvel: reabastece combustível, bateria e munição das torres no raio.'
};
// C1 — Componentes (5 níveis cada; custo fixo créditos [60,110,180,280,420] e peças [0,5,10,20,35]).
// Mults por pip: w dmg+6%/rate+3%; e move+15%/leash+10%; r caps+25%/recarga-recebida+10%; t range+4%/crit+2%.
// NOTA p/ agente do sim (diminishing de múltiplas fontes): total = melhor + 0.5×(soma das demais).
const COMP_DEFS = {
  w: { name: 'Arma', desc: 'Amplifica dano e cadência da torre.',
    levels: [
      { credits: 60, parts: 0, dmgMul: 1.06, rateMul: 1.03 },
      { credits: 110, parts: 5, dmgMul: 1.12, rateMul: 1.06 },
      { credits: 180, parts: 10, dmgMul: 1.18, rateMul: 1.09 },
      { credits: 280, parts: 20, dmgMul: 1.24, rateMul: 1.12 },
      { credits: 420, parts: 35, dmgMul: 1.30, rateMul: 1.15 }
    ] },
  e: { name: 'Motor', desc: 'Amplifica mobilidade e alcance da âncora (leash).',
    levels: [
      { credits: 60, parts: 0, moveMul: 1.15, leashMul: 1.10 },
      { credits: 110, parts: 5, moveMul: 1.30, leashMul: 1.20 },
      { credits: 180, parts: 10, moveMul: 1.45, leashMul: 1.30 },
      { credits: 280, parts: 20, moveMul: 1.60, leashMul: 1.40 },
      { credits: 420, parts: 35, moveMul: 1.75, leashMul: 1.50 }
    ] },
  r: { name: 'Reator', desc: 'Amplifica capacidades de fuel/batt/ammo e recarga recebida.',
    levels: [
      { credits: 60, parts: 0, capMul: 1.25, takeMul: 1.10 },
      { credits: 110, parts: 5, capMul: 1.50, takeMul: 1.20 },
      { credits: 180, parts: 10, capMul: 1.75, takeMul: 1.30 },
      { credits: 280, parts: 20, capMul: 2.00, takeMul: 1.40 },
      { credits: 420, parts: 35, capMul: 2.25, takeMul: 1.50 }
    ] },
  t: { name: 'Mira', desc: 'Amplifica alcance e chance de crítico da torre.',
    levels: [
      { credits: 60, parts: 0, rngMul: 1.04, critAdd: 0.02 },
      { credits: 110, parts: 5, rngMul: 1.08, critAdd: 0.04 },
      { credits: 180, parts: 10, rngMul: 1.12, critAdd: 0.06 },
      { credits: 280, parts: 20, rngMul: 1.16, critAdd: 0.08 },
      { credits: 420, parts: 35, rngMul: 1.20, critAdd: 0.10 }
    ] }
};
// Laboratório Hivemind: paga peças p/ aumentar HP dos inimigos na run (mais ouro)
const HIVEMIND = {
  hpAdd: 0.12, goldAdd: 0.08,
  cost: lvl => Math.round(15 * Math.pow(1.5, lvl))
};

// Fase 6 — lógica tática desbloqueada por tier (acumulativa), 10 torres × T2-T5
const TIER_LOGIC = {
  cannon: {
    2: { name: 'Concussão', desc: 'Impactos explodem em área pequena e reduzem 20% da velocidade por 1.5s.', eff: { concuss: true } },
    3: { name: 'Ogiva Perfurante', desc: 'Tiros ignoram 4 pontos de armadura.', eff: { armorPierce: 4 } },
    4: { name: 'Ricochete', desc: 'Projéteis ricocheteiam em +1 alvo próximo após o impacto.', eff: { ricochet: 1 } },
    5: { name: 'Dente de Ferro', desc: '+1% dano por abate desta nave (cap +50%).', eff: { killDmg: 0.01, killCap: 0.5 } }
  },
  gatling: {
    2: { name: 'Munição Incendiária', desc: 'Tracantes incendeiam: 1s de queimadura.', eff: { burn: 1 } },
    3: { name: 'Balística Vibratória', desc: '12% de chance de atordoar 0.25s por acerto.', eff: { stunChance: 0.12, stunDur: 0.25 } },
    4: { name: 'Canos Duplos Reforçados', desc: 'Projéteis perfuram +2 inimigos.', eff: { pierce: 2 } },
    5: { name: 'Frenesi de Combate', desc: 'Até +30% cadência conforme o combo atual.', eff: { comboRate: 0.3 } }
  },
  laser: {
    2: { name: 'Foco Térmico', desc: '+25% dano contra alvos em chamas.', eff: { vsBurn: 1.25 } },
    3: { name: 'Prisma Automático', desc: 'O feixe ganha +1 alvo varrido.', eff: { sweepAdd: 1 } },
    4: { name: 'Fóton Fásico', desc: '50% do dano atravessa escudos diretamente.', eff: { shieldPhase: 0.5 } },
    5: { name: 'Derretimento', desc: 'O feixe corrói 1 de armadura por segundo do alvo.', eff: { meltArmor: 1 } }
  },
  missile: {
    2: { name: 'Rastro de Fogo', desc: 'Explosões deixam fogo residual (queima 2s).', eff: { burn: 2 } },
    3: { name: 'Fragmentação', desc: 'Ogivas soltam +1 fragmento ao explodir.', eff: { fragAdd: 1 } },
    4: { name: 'Mira Dupla', desc: 'Sempre alcança voadores.', eff: { hitAir: true } },
    5: { name: 'MIRV', desc: 'Cada ogiva se subdivide em 3 submunições no impacto.', eff: { mirv: 3 } }
  },
  cryo: {
    2: { name: 'Gelo Profundo', desc: '15% de chance de congelar por 0.8s.', eff: { freezeChance: 0.15, freezeDur: 0.8 } },
    3: { name: 'Quebra Total', desc: 'Inimigos lentos/congelados recebem +25% dano.', eff: { chillVuln: 0.25 } },
    4: { name: 'Aura de Frio', desc: 'Reduz 15% a velocidade num raio fixo, sem gastar tiro.', eff: { coldAura: 0.15 } },
    5: { name: 'Congelamento Absoluto', desc: 'Afeta até chefes (50% de eficácia).', eff: { bossFreeze: 0.5 } }
  },
  tesla: {
    2: { name: 'Ionização', desc: 'Alvos atingidos ficam 12% mais lentos por 1.5s.', eff: { ionSlow: 0.12 } },
    3: { name: 'Condensadores Extras', desc: '+2 saltos de cadeia.', eff: { chainAdd: 2 } },
    4: { name: 'Sobrecarga Magnética', desc: '+60% dano contra escudos.', eff: { vsShield: 1.6 } },
    5: { name: 'Campo Global', desc: 'A cadeia salta por qualquer distância.', eff: { globalChain: true } }
  },
  sniper: {
    2: { name: 'Marcador Leve', desc: 'Alvo marcado por 1.5s recebe +15% dano geral.', eff: { markDur: 1.5, markMul: 1.15 } },
    3: { name: 'Munição AP', desc: 'Ignora toda a armadura do alvo.', eff: { ignoreArmor: true } },
    4: { name: 'Ótica Crítica', desc: '+15% de chance de crítico.', eff: { critAdd: 0.15 } },
    5: { name: 'Sentença Ampliada', desc: 'Executa alvos abaixo de 25% de HP.', eff: { execAdd: 0.25 } }
  },
  venom: {
    2: { name: 'Corrosão', desc: 'Cada aplicação corrói 1 de armadura (acumula).', eff: { corrode: 1 } },
    3: { name: 'Toxina Contagiosa', desc: 'Morto envenenado espalha a toxina (vira base).', eff: { plagueBase: true } },
    4: { name: 'Necrose', desc: 'Veneno causa +0.6%/s da vida máxima do alvo.', eff: { pctPoison: 0.006 } },
    5: { name: 'Detonação Esporulante', desc: 'Morte envenenada explode numa nuvem tóxica.', eff: { deathCloud: true } }
  },
  amp: {
    2: { name: 'Antena Estendida', desc: 'Anel de buff 20% maior.', eff: { ringMul: 1.2 } },
    3: { name: 'Metronomo', desc: 'Vizinhas ganham +10% cadência extra.', eff: { rateAdd: 0.1 } },
    4: { name: 'Ressonância', desc: 'Vizinhas ganham +10% dano extra.', eff: { dmgAdd: 0.1 } },
    5: { name: 'Hivemind', desc: 'Vizinhas ganham +5% de chance crítica.', eff: { critAdd: 0.05 } }
  },
  rail: {
    2: { name: 'Trilho Ressonante', desc: '+15% dano contra blindados.', eff: { vsArmor: 1.15 } },
    3: { name: 'Choque Magnético', desc: 'Impacto atordoa 0.2s.', eff: { stunDur: 0.2 } },
    4: { name: 'Perfuração Total', desc: 'A lança atravessa todo o alcance sem parar (base).', eff: { fullBase: true } },
    5: { name: 'Lança Estelar', desc: 'O disparo vira uma linha através do mapa inteiro.', eff: { starLine: true } }
  }
};

// __DO3_PART2__
  return {
    COLS, ROWS, CELL_SIZE, BOARD_W, BOARD_H, SAVE_KEY, TOWER_MAX_LVL, PALETTE,
    TOWERS_DATA, PILOTS, ENEMIES_DATA, MAPS_DATA, SHMUP_STAGES, NAVE_STYLES, NAVE_CAMPAIGNS, METAL_STAGES, TECH_UPGRADES, DIFFICULTIES,
    TARGET_MODES, WAVE_LETTERS, WAVE_LABELS, AIR_KINDS, SUPERS,
    MUTATIONS, COMBO, getMutationChoices,
    parseWaveString, makeEndlessWave, wpToPixels, getPathLength, getPosAtDist,
    getPathBlockedCells, Save, ACHIEVEMENTS,
    MERGE_PARTS, TIER_STATS, TIER_NAMES, getTier, SHOT_PATTERNS, SUPERS_AUTO, superThreshold,
    FACTORY_DATA, HIVEMIND, TIER_LOGIC,
    STATION_DATA, SUPPORT_DATA, COMP_DEFS
  };
})();
if (typeof window !== 'undefined') window.DO3 = DO3;
