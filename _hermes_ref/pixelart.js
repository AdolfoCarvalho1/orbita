/* Defesa Orbital v3 — FASE 1: Pixel Art por Código (window.PXART)
   Sprites ASCII + paleta, 1 px lógico = 3 px reais. Sem pixelArt global.
   Chaves novas (prevalecem sobre as antigas): tur_<id>_t<tier>, en_<tipo>, px_factory_l<n>, px_pr_<kind>, st_<id>, ov_<track>(_hi). */
'use strict';
(function () {
  const TKN = (typeof window!=='undefined' && (window.TOKENS || (window.DO3 && window.DO3.TOKENS))) || null;
  const PX = (TKN && TKN.PIXEL && TKN.PIXEL.PX) || 3; // escala: 1 pixel lógico = 3px reais
  // ONDA 4: chaves já geradas pelo PXART nesta página — evita regenerar ~150 texturas a cada Boot/Menu.
  // O override único (vetorial→pixel art) roda na 1ª vez; depois disso o exists() basta.
  const _pxartKeys = new Set();

  // helper de desenho: rows ASCII + palette por caractere
  function drawRows(g, rows, pal) {
    const h = rows.length;
    let w = 0;
    for (const r of rows) w = Math.max(w, r.length);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ' || ch === '.') continue;
        const c = pal[ch];
        if (!c) continue;
        // Phaser quer cor NUMÉRICA; string vira preto (bug dos sprites pretos)
        g.fillStyle(typeof c === 'number' ? c : parseInt(c.slice(1), 16), 1);
        g.fillRect(x * PX, y * PX, PX, PX);
      }
    }
    return { w: w * PX, h: h * PX };
  }
  function tint(hexStr, f) { // usa TOKENS.tint se existir, senão fallback
    if(TKN && TKN.tint) return TKN.tint(hexStr, f);
    const n = parseInt(hexStr.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; }
    else { r *= 1 + f; gg *= 1 + f; b *= 1 + f; }
    const hx = v => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    return '#' + hx(r) + hx(gg) + hx(b);
  }
  function getTOK(col){ return TKN ? TKN.PALETTE : null; }

  // ===== TORRES: silhuetas 13-17px, apontando pra CIMA (rotaciona no jogo) =====
  // IDENTIDADE UNIFICADA: K contorno preto obrigatório, W brilho, G vidro, M metal aço #8b95a8 (TOKENS.PIXEL.M)
  // C = col da família (1 acento), D/E/L derivados, Y gold camu uniform, O orange, N green p/ amp/tesla
  function towerPalette(col) {
    const PAL = getTOK();
    const steel = (PAL && PAL.steelDark) || '#8b95a8';
    return {
      K: (TKN && TKN.PIXEL && TKN.PIXEL.K) || '#000000',
      W: (TKN && TKN.PIXEL && TKN.PIXEL.W) || '#ffffff',
      G: (TKN && TKN.PIXEL && TKN.PIXEL.G) || '#bfe3ff',
      M: steel,
      D: tint(col, -0.55),
      C: col, L: tint(col, 0.35), E: tint(col, -0.25),
      Y: (PAL && PAL.gold) || '#fbbf24',
      O: (PAL && PAL.orange) || '#fb923c',
      N: (PAL && PAL.green) || '#34d399',
      R: (PAL && PAL.red) || '#f43f5e',
      V: (PAL && PAL.acid) || '#a3e635',
      B: (PAL && PAL.shieldBlue) || '#60a5fa',
      P: (PAL && PAL.purple) || '#a3e635'
    };
  }
  // Cada linha descreve somente a metade esquerda + o eixo central.
  // O espelhamento garante cascos simétricos, contornos limpos e zero "pixel solto".
  function mirrorRows(halves) {
    return halves.map(source => {
      const half = String(source).padEnd(11, '.').slice(0, 11);
      const left = half.slice(0, 10);
      return (left + half[10] + left.split('').reverse().join('')).replace(/\./g, ' ');
    });
  }
  const ship = mirrorRows;
  const TOWER_ART = {
    // Corveta Gauss — proa blindada, cockpit central e dois canhões frontais.
    cannon: ship([
      '........KKK',
      '.......KWWG',
      '.....KKKMMC',
      '....KCCKMMM',
      '..KKCCKMGGG',
      '.KCCLLKMGGG',
      'KCCLLCKMGGG',
      'KCCCCKMMDDD',
      '.KCCCKMDDDK',
      '..KKKKDYYYO',
      '....KKDOOOO',
      '.....KDOOOO',
      '......KOOOO'
    ]),
    // Caça Vulcan — nariz agudo, asas em flecha e motores duplos.
    gatling: ship([
      '..........K',
      '.........KW',
      '........KWG',
      '.......KCCG',
      '......KCLLG',
      '...KKKKCLLG',
      '.KKCCCLLMMM',
      'KCCLLLMMGGG',
      '..KKCCKMDGG',
      '....KKMDYDO',
      '......KDOOO',
      '.......KOOO',
      '........KOO'
    ]),
    // Destróier de Fótons — delta compacto em torno de um emissor axial.
    laser: ship([
      '..........K',
      '.........KW',
      '........KWR',
      '.......KCRR',
      '......KCLRR',
      '....KKCLGRR',
      '..KKCCLGRWW',
      'KCCCLLGRWWW',
      '..KCCKRRWWW',
      '....KDRRYWO',
      '.....KDRYOO',
      '......KDOOO',
      '.......KOOO'
    ]),
    // Bombardeiro MIRV — fuselagem larga, quatro baias e pods de mísseis nas asas.
    missile: ship([
      '........KKK',
      '.......KGGG',
      '......KMMMM',
      '..KKKOKMCCC',
      '.KOYOKCLLCC',
      'KOYYOKCLGGC',
      'KOYOKCCMMMD',
      '.KKKKCCMDDD',
      '..KCCCKDYYO',
      '...KKKDYYOO',
      '.....KDOOOO',
      '......KOOOO',
      '.......KOOO'
    ]),
    // Fragata Glacial — proa cristalina e aletas em forma de floco.
    cryo: ship([
      '.........KG',
      '.......KKGW',
      '......KGGWG',
      '...K.KKCGGG',
      '..KGKCLGWGG',
      'KGGKCLGGWGG',
      '.KGCCLGGWGG',
      '..KCCKGGGGD',
      '...KKDGGGDO',
      '....KDGGYOO',
      '.....KDGYOO',
      '......KDOOO',
      '.......KOOO'
    ]),
    // Cruzador Tempestade — duas bobinas laterais e espinha condutora dourada.
    tesla: ship([
      '.........KYW',
      '........KWYW',
      '.......KCYWY',
      '....KKKCYWYC',
      '..KYWKCLYWYC',
      'KCYWYKCLGWYC',
      'KCCYCKMGWYM',
      '.KCCKDYWYWD',
      '..KKKDYYWYD',
      '....KDYYWYO',
      '.....KDYYOO',
      '......KDOOO',
      '.......KOOO'
    ]),
    // Espectro Sniper — agulha longa, cockpit recuado e asas furtivas.
    sniper: ship([
      '..........W',
      '.........KW',
      '........KWC',
      '.......KWCC',
      '......KCLLG',
      '....KKCLGGW',
      '..KKCCLGWWW',
      'KCCLLKMGWWW',
      '...KCCKDWWW',
      '.....KDDGWO',
      '......KDGOO',
      '.......KDOO',
      '........KOO'
    ]),
    // Infectador Nanopraga — bio-nave manta com núcleo e vesículas simétricas.
    venom: ship([
      '........KVK',
      '......KKVLV',
      '....KKVLLWV',
      '..KKVVCLGGV',
      'KVVVCLLGGGV',
      'KVVCLLGWGGV',
      '.KVCCLGGGGV',
      '..KVCKGVVGD',
      '...KKDGVVDO',
      '....KDGGWOO',
      '.....KDYYOO',
      '......KOOOO',
      '.......KOOO'
    ]),
    // Porta-Naves Amplificadora — convés largo, hangar central e escoltas laterais.
    amp: ship([
      '........KYW',
      '.......KYYY',
      '.....KKYCWY',
      '..KKKCCYCWY',
      'KCCCLLYCWWW',
      'KCLLLYGGWWW',
      'KCCCKYGGWYG',
      '.KCCKDDYWYD',
      '..KKKDDYWYD',
      '....KDDYYYO',
      '.....KDYYOO',
      '......KOOOO',
      '.......KOOO'
    ]),
    // Encouraçado Railgun — trilho branco contínuo entre placas de blindagem pesada.
    rail: ship([
      '..........W',
      '.........KW',
      '........KWW',
      '......KKMWW',
      '...KKKMMWCC',
      '.KKMMMLLWCC',
      'KMMMCCLGWGG',
      'KMMCCKDGWGG',
      '.KMMCKDDWMD',
      '..KKMDDDWMO',
      '....KMDDWOO',
      '.....KMDWOO',
      '......KDOOO'
    ])
  };

  // ===== INIMIGOS: chunky aliens com olhos / naves com cockpit =====
  // IDENTIDADE UNIFICADA: inimigos usam 3 mães Hivemind (bioOrange/acid/shieldBlue) mas paleta fechada TOKENS
  function enemyPalette(defCol) {
    const PAL = getTOK();
    const steel = (PAL && PAL.steelDark) || (TKN && TKN.PIXEL && TKN.PIXEL.M) || '#8b95a8';
    return {
      K: (TKN && TKN.PIXEL && TKN.PIXEL.K) || '#000000',
      W: (TKN && TKN.PIXEL && TKN.PIXEL.W) || '#ffffff',
      G: (TKN && TKN.PIXEL && TKN.PIXEL.G) || '#bfe3ff',
      M: steel,
      D: tint(defCol, (TKN && TKN.PIXEL && TKN.PIXEL.DARK_FACTOR) || -0.55),
      C: defCol, L: tint(defCol, (TKN && TKN.PIXEL && TKN.PIXEL.LIGHT_FACTOR) || 0.35), E: tint(defCol, -0.25),
      R: (PAL && PAL.red) || '#f43f5e',
      Y: (PAL && PAL.gold) || '#fbbf24',
      P: (PAL && PAL.purple) || '#a3e635',
      N: (PAL && PAL.green) || '#34d399',
      B: (PAL && PAL.shieldBlue) || '#60a5fa',
      O: (PAL && PAL.bioOrange) || '#f97316'
    };
  }
  const ENEMY_ART = {
    drone: [
      '   K     K   ',
      '  KWK   KWK  ',
      '  KCK K KCK  ',
      ' KKCKKKKKCKK ',
      'KCCLLCGCLLCKK',
      'KCGWGGCGGWGCK',
      'KCGKKGGGKKGGK',
      ' KCCKDDDKCCK ',
      '  KCKDKDKCK  ',
      '   KKKKKKK   '
    ],
    runner: [
      ' KK          ',
      'KWLK         ',
      'KCCLK        ',
      'KCGLLK       ',
      'KCGGCLKKKKK  ',
      'KCGLLCCCCLLK ',
      'KCCLKCCKCCLKK',
      'KKKKKKKKKKKKK',
      '   KYYKKYYK  '
    ],
    tank: [
      ' KKKKKKKKKKKK ',
      'KCMDMMMMMMMMK',
      'KCMMDDDDDDMMK',
      'KCMKWWKKWWKMMK',
      'KCCKGGKKGGKCMK',
      'KCCKGGKKGGKCMK',
      'KCMMKDKKKDKMMK',
      'KCMMDDDDDDMMMK',
      'KCMMEMMMMMECMK',
      ' KKMMKKKKMMKK ',
      '  KKKK  KKKK  '
    ],
    swarm: [
      ' K K  ',
      'KWKCK ',
      'KCCK  ',
      'KCGCK ',
      'KKCKK ',
      ' KKK  '
    ],
    healer: [
      '  KWKKWK  ',
      '  KNCCKN  ',
      ' KKNCCNKK ',
      'KNCLLGLLNK',
      'KNCGWGWGCNK',
      'KNCGKKKGCNK',
      ' KNCCCCKNK',
      '  KKNCNKK ',
      ' KNCKKCKNK',
      '  KKKKKK  '
    ],
    phase: [
      '   KKKKK   ',
      ' KK WGW KK ',
      'KWKGGGGGKWK',
      'KWGKPWPKGWK',
      'KWGKGGGKGWK',
      ' KWGGWGGWK ',
      '  KKGWGKK  ',
      '   KKKKK   '
    ],
    bomber: [
      '     KW      ',
      '    KWCK     ',
      '  KKWCCKKK   ',
      ' KCLRRLRCLCK ',
      'KCLRRWRRRRLCK',
      'KCRRKWRWKRRCX'.replace(/X/,'K'),
      'KCRRKRRRKRRCX'.replace(/X/,'K'),
      ' KCCKRRRRKCK ',
      '  KKKKRKKKK  ',
      '     KYYK    ',
      '      KK     '
    ],
    shielded: [
      '  KBBBBBBBK  ',
      ' KBWBBBBBBBK ',
      'KBCCBBBBBBCBK',
      'KBCKWWWWKCBBK',
      'KBCKGGGGKCBBK',
      'KBCKGGGGKCBXK'.replace(/X/,'B'),
      'KBCKKDDKKCBBK',
      'KBCCCDDCCCBBK',
      ' KBCDDDDDCBK ',
      '  KBBKKKBBK  ',
      '   KKK  KKK  '
    ],
    splitter: [
      ' KKK   KKK  ',
      'KWLGK KWGLK ',
      'KCGGLKKLGGBK',
      'KCGGKYYYKGBK',
      'KCGKYYYYYKGB',
      'KKKYYYYYYYKK',
      ' KYYKKKKKYYK',
      '  KKK   KKK '
    ],
    colossus: [
      '  KKKKKKKKKKKKK  ',
      ' KMDDDDDDDDDDDMK ',
      'KMMDKKKKKKKKKDDMK',
      'KMMDKMMMMMMMKDDMK',
      'KMDDKWGKKKWGKDDMK',
      'KMDDKWGKKKWGKDDMK',
      'KMDDDKKKKKKKDDDMK',
      'KMMDDDDDDDDDDDDMK',
      'KMEMMMMMMMMMMEMMK',
      'KMEMKKEMMMKEKMEMK',
      ' KMMKKKMMMKKKMMDK',
      '  KKKKKKKKKKKKKK '
    ],
    mini: [
      ' KK ',
      'KWCX'.replace(/X/,'K'),
      'KCGK',
      'KKKK'
    ],
    wasp: [
      'KK        KK',
      'KYYK      KYX'.replace(/X/,'Y')+'K',
      'KYYYKKKKKKYYK',
      'KYLGGCCCCKKYK',
      'KYYKCKKKCKYYK',
      'KKYYKYYYKYYKK',
      '  KKKYYYKKK  ',
      '    KKKKK    '
    ],
    boss1: [
      '    KKKKKKKKKKKKKK    ',
      '  KKWWWWKKKKKKWWWWKK  ',
      ' KKWRRWWKDDDDKWWRWWKK ',
      'KKWRRWWKDDDDDDKWWRWWKK',
      'KKRRWWKDDRDDRDDKWWRRKK',
      'KKRRWKDDRKGGKRDDKWRRKK',
      'KKRRKDDDRKGGKRDDDKRRKK',
      'KKRRKDDRKKGGKKRDDKRRKK',
      'KKRRKDDRKKKKKKRDDKRRKK',
      'KKRRWKDDDDDDDDDKWRRKK ',
      ' KKRWWKDDDDDDDKWWRKK  ',
      '  KKKWWKKKKKKKWWKKK   ',
      '    KKKKKKKKKKKKKK    '
    ],
    boss2: [
      '   KKKKKKKKKKKKKKKKK   ',
      ' KKWWWWWWKKKKKWWWWWWKK ',
      'KKWOOOWWWKDDDKWWWOOWKK ',
      'KOOOOWWKDDDDDDDKWWOOOXK'.replace(/X/,'O'),
      'KOOOWWKDDRRDDRDDKWWOOOK',
      'KOOWWKDDRRKGGKRRDDKWOOX'.replace(/X/,'K'),
      'KOOWKDDRRKGYGKRRDDKWOOK',
      'KOOWKDDRRKGYGKRRDDKWOXK'.replace(/X/,'K'),
      'KOOXKDDRKKKKKKRDDKXOOXK'.replace(/X/g,'O'),
      ' KOOXKWDDDDDDDDDWKXOOK '.replace(/X/g,'O'),
      '  KKOOWWKDDDDDKWWOOKK  ',
      '    KKKWWKKKKKWWKKK    ',
      '      KKKKKKKKKKK      '
    ],
    boss3: [
      '  KKKKKKKKKKKKKKKKKKKK  ',
      ' KWWWWWWWWKKKKKWWWWWWWWK',
      'KWCYYCWWWWKDDDKWWWWCYYCX'.replace(/X/,'K'),
      'KCYYCCWWKDDDDDDDKWWCCYYK',
      'KCYYWKDDRRRRRRRDDKWYYCKK',
      'KCWXKDDRGGGGGGGRDDKXWCKK'.replace(/X/g,'Y'),
      'KCWKDDRGGKKKKKGGXRDKWCKK'.replace(/XR/,'RD'),
      'KCWKDRGGKKWWWKKGGRDKWCKK',
      'KCWKDRGGKKWKWKKGGRDKWCKK',
      'KCWKDDRGGKKKKKGGXRDKWCKK'.replace(/XR/,'RD'),
      'KCCXKDDRGGGGGGGXRDXXCCKK'.replace(/X/g,'Y'),
      'KCCWKDDRRRRRRRRRDKWCCXK'.replace(/X/,'K'),
      ' KCKWWKDDDDDDDDDKWWKCK  ',
      '  KKWWKKKDDDDDKKKWWKKK  ',
      '    KKKKKKKKKKKKKKKK    '
    ]
  };

  // ===== FÁBRICA: prédio industrial com chaminé e luz verde =====
  function factoryArt(lvl) {
    const chimneys = [];
    for (let i = 0; i < lvl; i++) chimneys.push(i);
    const art = [];
    // chaminés no topo
    const topRow = new Array(19).fill('.');
    topRow[16] = 'K'; topRow[17] = 'N'; topRow[18] = 'K';
    art.push(topRow.join('').replace(/\./g, ' '));
    for (let r = 0; r < 2 + lvl; r++) {
      const row = new Array(19).fill('.');
      row[16] = 'K'; row[18] = 'K';
      art.push(row.join('').replace(/\./g, ' '));
    }
    // corpo
    art.push(' KKKKKKKKKKKKKKKKK ');
    art.push('KMMDDDDDDDDDDDDKNNK');
    art.push('KMDGGDDDDDDDDDDKENK');
    art.push('KMDGDGDDDDDDDDDKENK');
    art.push('KMDDDGDDDDDDDDDKDNK');
    art.push('KMDDDDDDDDDDDDDKDNK');
    art.push('KMDKKDDKKDDKKDDKDDK');
    art.push('KMDKWDDKWDDKWDDKDDK');
    art.push('KMDKKDDKKDDKKDDKDDK');
    art.push('KMMDDDDDDDDDDDDKDDK');
    art.push('KKKKKKKKKKKKKKKKKKK');
    return art;
  }

  // ===== PROJÉTEIS por kind =====
  const PROJ_ART = {
    bullet: [' K ', 'KWK', 'KWK', ' KO'],
    missile: ['.K..', 'KOOK', 'KOYK', '.KK.'].map(s => s.replace(/\./g, ' ')),
    beam: ['KWWK', 'KRWK'],
    slow: ['.KK.', 'KGWK', 'KWGK', '.KK.'].map(s => s.replace(/\./g, ' ')),
    chain: ['.K.K.', 'KWKWK', '.KYK.', 'KYWYK', '.KKK.'].map(s => s.replace(/\./g, ' ')),
    snipe: ['KW', 'KC', 'KO'],
    dot: ['.KK.', 'KLGK', 'KLWK', '.KK.'].map(s => s.replace(/\./g, ' ')),
    pierce: ['.KW.', 'KWCK', 'KWCK', '.KK.'].map(s => s.replace(/\./g, ' '))
  };

  // Tier adiciona detalhes internos simétricos; nunca altera o contorno da nave.
  function applyTierArt(rows, tier, pal) {
    if (tier <= 1) return rows;
    const w = rows[0].length;
    const out = rows.slice();
    const cx = Math.floor(w / 2);
    const paintPair = (y, offset, ch) => {
      if (y < 0 || y >= out.length) return;
      const row = out[y].split('');
      const lx = cx - offset, rx = cx + offset;
      if (row[lx] && row[lx] !== ' ' && row[lx] !== 'K') row[lx] = ch;
      if (row[rx] && row[rx] !== ' ' && row[rx] !== 'K') row[rx] = ch;
      out[y] = row.join('');
    };
    const bodyY = Math.floor(out.length * 0.48);
    if (tier >= 2) paintPair(bodyY, 3, 'L');       // luzes de asa
    if (tier >= 3) paintPair(bodyY + 2, 5, 'Y');   // acabamento de esquadrão
    if (tier >= 4) {
      const row = out[bodyY].split('');
      if (row[cx] !== ' ' && row[cx] !== 'K') row[cx] = 'W';
      out[bodyY] = row.join('');
    }
    if (tier >= 5) {
      paintPair(bodyY - 1, 2, 'Y');
      paintPair(bodyY + 1, 4, 'W');
    }
    return out;
  }

  function buildTowerTextures(scene) {
    for (const def of (window.DO3 ? window.DO3.TOWERS_DATA : [])) {
      const base = TOWER_ART[def.id];
      if (!base) continue;
      const pal = towerPalette(def.color);
      for (let tier = 1; tier <= 5; tier++) {
        const key = 'tur_' + def.id + '_t' + tier;
        if (scene.textures.exists(key)) continue;
        const rows = applyTierArt(base, tier, pal);
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        const size = drawRows(g, rows, pal);
        g.generateTexture(key, Math.max(16, size.w), Math.max(16, size.h));
        g.destroy();
      }
      // Legado também recebe a arte nova; makeTextures cria uma versão vetorial antes do PXART.
      const legacyKey = 'tur_' + def.id + '_1';
      if (_pxartKeys.has(legacyKey) && scene.textures.exists(legacyKey)) continue; // ONDA 4: já é pixel art
      try { if (scene.textures.exists(legacyKey)) scene.textures.remove(legacyKey); } catch (e) {}
      const rows = applyTierArt(base, 1, pal);
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const size = drawRows(g, rows, pal);
      g.generateTexture(legacyKey, Math.max(16, size.w), Math.max(16, size.h));
      g.destroy();
      _pxartKeys.add(legacyKey);
    }
  }

  function buildEnemyTextures(scene) {
    const ED = window.DO3 ? window.DO3.ENEMIES_DATA : {};
    for (const type in ED) {
      const def = ED[type];
      const key = 'en_' + type;
      if (_pxartKeys.has(key) && scene.textures.exists(key)) continue; // ONDA 4: já é pixel art (não remove/regenera)
      // IDENTIDADE UNIFICADA: força pixel art mesmo se já existir textura vetorial antiga (makeTextures criou 'en_' via drawEnemyShape)
      if(scene.textures.exists(key)){
        try{
          if(typeof scene.textures.remove === 'function') scene.textures.remove(key);
          else if(scene.textures.get(key) && typeof scene.textures.get(key).destroy === 'function') scene.textures.get(key).destroy();
        }catch(e){}
        // fallback: se ainda existe, tenta destroy direto
        try{ if(scene.textures.exists(key) && scene.textures.get(key)) scene.textures.get(key).destroy(); }catch(e){}
      }
      let art = ENEMY_ART[type];
      if (!art) {
        // variantes procedurais reutilizam o arte do tipo base
        const baseT = def.variantOf || type.split('_')[0];
        art = ENEMY_ART[baseT] || ENEMY_ART.drone;
      }
      const pal = enemyPalette(def.col);
      // centra arte dentro de textura quadrada para rotação estável (origin 0.5)
      let maxW = 0; for (const r of art) maxW = Math.max(maxW, r.length);
      const expW = maxW * PX, expH = art.length * PX;
      const dim = Math.ceil(Math.max(expW, expH));
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const offX = (dim - expW) / 2, offY = (dim - expH) / 2;
      if (offX || offY) { g.save(); g.translateCanvas(offX, offY); }
      drawRows(g, art, pal);
      if (offX || offY) g.restore();
      g.generateTexture(key, dim, dim);
      g.destroy();
      _pxartKeys.add(key);
    }
  }

  // ONDA 5: buildProjectiles removido — as 8 texturas px_pr_* eram órfãs (sem consumidores no jogo).
  // PROJ_ART continua exportado em window.PXART (dados/API pública preservados).

  function buildFactory(scene) {
    const PAL = getTOK();
    const factoryPal = {
      K: (TKN && TKN.PIXEL && TKN.PIXEL.K) || '#000000',
      W: (TKN && TKN.PIXEL && TKN.PIXEL.W) || '#ffffff',
      G: (PAL && PAL.cyan) || '#bfe3ff',
      D: '#334155', M: (TKN && TKN.PIXEL && TKN.PIXEL.M) || '#94a3b8',
      E: '#475569', N: (PAL && PAL.green) || '#34d399',
      Y: (PAL && PAL.gold) || '#fbbf24'
    };
    for (let lvl = 1; lvl <= 5; lvl++) {
      const key = 'px_factory_l' + lvl;
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const size = drawRows(g, factoryArt(lvl), factoryPal);
      g.generateTexture(key, size.w, size.h);
      g.destroy();
    }
  }

  // ===== F1-E: estação + cargueiro (chaves EXATAS st_station / st_support) =====
  // st_station ~20x20 lógicos: anel + docas N/S/E/W + luzes âmbar A #f5a83d, base S #0d1220.
  // st_support ~14x10 lógicos: casco + 2 tanques ciano C #7dd3fc. Sem roxo.
  const ST_ART = {
    st_station: [
      '........KKKK........',
      '........KMMK........',
      '.....KKKKMMKKKK.....',
      '....KMMMMAAMMMMK....',
      '...KMMGGMMMMGGMMK...',
      '..KMMAMDDDDDDMAMMK..',
      '..KMMAAMMMMMMAAMMK..',
      '.KMMMK   MM   KMMMK.',
      ' KMMMK KKKKKK KMMMK ',
      'KAMMMKMKGAAGKMKMMMAK',
      'KAMMMKMKSSSSKMKMMMAK',
      ' KMMMK KKKKKK KMMMK ',
      '.KMMMK   MM   KMMMK.',
      '..KMMAAMMMMMMAAMMK..',
      '..KMMAMDDDDDDMAMMK..',
      '...KMMGGMMMMGGMMK...',
      '....KMMMMAAMMMMK....',
      '.....KKKKMMKKKK.....',
      '........KMMK........',
      '........KKKK........'
    ],
    st_support: [
      '      KK      ',
      '     KMMK     ',
      '    KMGGMK    ',
      ' KKKKMMMMKKKK ',
      ' KCKKMDDMKKCK ',
      ' KCKKMSSMKKCK ',
      ' KWKKMMMMKKWK ',
      ' KCKKDAADKKCK ',
      ' KKKKMMMMKKKK ',
      '     KAAK     '
    ]
  };
  function stationPalette() {
    return {
      K: '#000000',
      M: '#8b95a8',
      D: '#334155',
      A: '#f5a83d',
      G: '#bfe3ff',
      S: '#0d1220',
      C: '#7dd3fc',
      W: '#ffffff'
    };
  }
  function buildStation(scene) {
    const pal = stationPalette();
    for (const key in ST_ART) {
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const size = drawRows(g, ST_ART[key], pal);
      g.generateTexture(key, Math.max(16, size.w), Math.max(16, size.h));
      g.destroy();
    }
  }

  // ===== F1-C3: overlays de componente (chaves EXATAS ov_<track> / ov_<track>_hi) =====
  // Pequenos (<=10x10 lógicos), cor da track em C. Exibidos quando t.comp[track]>=1;
  // versão forte (>=4) = 2ª textura ov_<track>_hi com pixels W extras (brilho/núcleo).
  const OV_TRACK_COL = {
    weapon: '#f87171',
    engine: '#7dd3fc',
    reactor: '#f5a83d',
    target: '#34d399'
  };
  const OV_ART = {
    // ov_weapon: cano extra apontando p/ cima.
    ov_weapon: [
      ' KKK ',
      ' KCK ',
      ' KCK ',
      ' KCK ',
      ' KCK ',
      ' KCK ',
      ' KCK ',
      'KKKKK'
    ],
    ov_weapon_hi: [
      'KWWWK',
      'KWCWK',
      'KWCWK',
      'KWCWK',
      'KWCWK',
      'KWCWK',
      'KWCWK',
      'KKKKK'
    ],
    // ov_engine: brilho do motor (chama, ponta quente W).
    ov_engine: [
      ' KKK ',
      ' KCK ',
      'KCCCK',
      'KCCCK',
      'KCWCK',
      ' KCK ',
      '  W  '
    ],
    ov_engine_hi: [
      '  KKK  ',
      ' KCCCK ',
      'KCWCWCK',
      'KCCCCCK',
      'KCCCCCK',
      ' KWCWK ',
      '   W   '
    ],
    // ov_reactor: anel do reator (hi = núcleo quente).
    ov_reactor: [
      '  KKK  ',
      ' KCCCK ',
      'KCC CCK',
      'KC   CK',
      'KCC CCK',
      ' KCCCK ',
      '  KKK  '
    ],
    ov_reactor_hi: [
      '  KKK  ',
      ' KCCCK ',
      'KCCWCCK',
      'KCWWWCK',
      'KCCWCCK',
      ' KCCCK ',
      '  KKK  '
    ],
    // ov_target: antena (hi = barra de sinal + mastro/reforço).
    ov_target: [
      'K     K',
      'KC   CK',
      'KC   CK',
      ' KCWCK ',
      '   C   ',
      '   C   ',
      '  KKK  '
    ],
    ov_target_hi: [
      'K     K',
      'KC   CK',
      'KCWCWCK',
      ' KCWCK ',
      '  WCW  ',
      '   C   ',
      ' KKKKK '
    ]
  };
  function ovPalette(trackCol) {
    return { K: '#000000', C: trackCol, W: '#ffffff' };
  }
  function buildOverlays(scene) {
    for (const key in OV_ART) {
      if (scene.textures.exists(key)) continue;
      const track = key.replace(/_hi$/, '').replace(/^ov_/, '');
      const pal = ovPalette(OV_TRACK_COL[track] || '#ffffff');
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const size = drawRows(g, OV_ART[key], pal);
      g.generateTexture(key, Math.max(16, size.w), Math.max(16, size.h));
      g.destroy();
    }
  }

  // ===== U-ASTRO: o astronauta solitário (perfil contemplativo, eco da referência) =====
  // Paleta fechada sunset (sem roxo): traje M #8b95a8 / D #5a6d93, viseira V #ffe9bd
  // com reflexo W, rim light âmbar R #f5a83d num dos lados, base/sombra S #0d1220.
  // Assimétrico (perfil) → rows explícitas como ENEMY_ART (mirrorRows não se aplica).
  function astroPalette() {
    return {
      K: '#000000',
      M: '#8b95a8',
      D: '#5a6d93',
      V: '#ffe9bd',
      W: '#ffffff',
      R: '#f5a83d',
      S: '#0d1220'
    };
  }
  const ASTRO_ART = {
    // astro_sit: SENTADO de perfil (olhando p/ direita), pernas encolhidas, mochila à esquerda.
    astro_sit: [
      '....KKKKKK......',
      '...KMMMMMMMK....',
      '..KMMMMMMMMMK...',
      '..KMMMKVVVVVK...',
      '.KDMMKVWWVVVVRK.',
      '.KDMMKVWVVVVVRRK',
      '.KDMMMKVVVVVVRRK',
      '.KDMMMMKKKKKVRRK',
      '.KDDMMMMMMMDDRRK',
      '.KDDMMMDDMMDDRK.',
      '..KDDMMMMMMDRK..',
      '..KDDDMMMMDDRK..',
      '...KKMMMDDRRK...',
      '...SSSSSSSSSS...'
    ],
    // astro_stand: EM PÉ, viseira p/ cima (vitória).
    astro_stand: [
      '....KKKKKK......',
      '...KMMMMMMMK....',
      '...KMMVVVMMMK...',
      '...KMVWVVVMMMK..',
      '...KMVVVVVMMMRK.',
      '....KMMMMMMMRK..',
      '...KDMMMMMMDRK..',
      '...KDMMMMMMDRK..',
      '...KDMMMMMMDRK..',
      '...KDMKMMKMDRK..',
      '...KDKKMMKKDRK..',
      '...KK.KMMK.KK...',
      '......KMMK......',
      '......KMMK......',
      '.....SS..SS.....'
    ]
  };

  // Pinta o astronauta num <canvas> 2D (DOM: menu, modais, pausa). Sem Phaser.
  // opts: { scale, mound } — mound desenha a colina/horizonte sob os pés.
  function paintOn(canvas, key, opts) {
    opts = opts || {};
    const scale = opts.scale || 4;
    const rows = ASTRO_ART[key || 'astro_sit'] || ASTRO_ART.astro_sit;
    const pal = astroPalette();
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    let maxW = 0;
    for (const r of rows) maxW = Math.max(maxW, r.length);
    const w = maxW * scale, h = rows.length * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ox = Math.floor((canvas.width - w) / 2);
    let oy = canvas.height - h;
    if (opts.mound) {
      // colina em silhueta #0d1220 + fio de horizonte âmbar
      ctx.fillStyle = '#0d1220';
      ctx.fillRect(0, canvas.height - 8 * scale / 4, canvas.width, 8 * scale / 4);
      ctx.fillStyle = '#f5a83d';
      ctx.fillRect(0, canvas.height - 8 * scale / 4, canvas.width, 1);
      oy -= Math.floor(6 * scale / 4);
    }
    if (oy < 0) oy = 0;
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ' || ch === '.') continue;
        const c = pal[ch];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
    return true;
  }

  function buildAstro(scene) {
    const pal = astroPalette();
    for (const key in ASTRO_ART) {
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      const size = drawRows(g, ASTRO_ART[key], pal);
      g.generateTexture(key, Math.max(16, size.w), Math.max(16, size.h));
      g.destroy();
    }
  }

  function buildAll(scene) {
    try {
      buildTowerTextures(scene);
      buildEnemyTextures(scene);
      buildFactory(scene);
      buildAstro(scene);
      buildStation(scene);
      buildOverlays(scene);
    } catch (e) { console.error('[PXART]', e); }
  }

  window.PXART = { build: buildAll, buildAll, PX, ENEMY_ART, TOWER_ART, PROJ_ART, ASTRO_ART, ST_ART, OV_ART, OV_TRACK_COL, astroPalette, stationPalette, ovPalette, paintOn, buildAstro, buildStation, buildOverlays, enemyPalette, towerPalette, drawRows, tint };
})();
