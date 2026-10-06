'use strict';
const GameArt = (function () {
  const PX = 3;
  const PANEL_NUM = 0x0d1526;
  const PAL = {
    steelDark: '#8b95a8',
    gold: '#fbbf24',
    orange: '#fb923c',
    green: '#34d399',
    red: '#f43f5e',
    acid: '#a3e635',
    shieldBlue: '#60a5fa',
    bioOrange: '#f97316'
  };
  const PIXEL = { K: '#000000', W: '#ffffff', G: '#bfe3ff', M: '#8b95a8', DARK: -0.55, LIGHT: 0.35 };

  function num(hex) {
    return parseInt(hex.slice(1), 16);
  }

  function tint(hexStr, f) {
    const n = parseInt(hexStr.slice(1), 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;
    if (f >= 0) {
      r += (255 - r) * f;
      g += (255 - g) * f;
      b += (255 - b) * f;
    } else {
      r *= 1 + f;
      g *= 1 + f;
      b *= 1 + f;
    }
    const hx = function (v) {
      return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    };
    return '#' + hx(r) + hx(g) + hx(b);
  }

  function towerPalette(col) {
    return {
      K: PIXEL.K,
      W: PIXEL.W,
      G: PIXEL.G,
      M: PAL.steelDark,
      D: tint(col, -0.55),
      C: col,
      L: tint(col, 0.35),
      E: tint(col, -0.25),
      Y: PAL.gold,
      O: PAL.orange,
      N: PAL.green,
      R: PAL.red,
      V: PAL.acid,
      B: PAL.shieldBlue,
      P: PAL.acid
    };
  }

  function enemyPalette(col) {
    return {
      K: PIXEL.K,
      W: PIXEL.W,
      G: PIXEL.G,
      M: PAL.steelDark,
      D: tint(col, PIXEL.DARK),
      C: col,
      L: tint(col, PIXEL.LIGHT),
      E: tint(col, -0.25),
      R: PAL.red,
      Y: PAL.gold,
      P: PAL.acid,
      N: PAL.green,
      B: PAL.shieldBlue,
      O: PAL.bioOrange
    };
  }

  function mirrorRows(halves) {
    return halves.map(function (source) {
      const half = String(source).padEnd(11, '.').slice(0, 11);
      const left = half.slice(0, 10);
      return (left + half[10] + left.split('').reverse().join('')).replace(/\./g, ' ');
    });
  }

  const TOWER_ART = {
    cannon: mirrorRows([
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
    gatling: mirrorRows([
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
    laser: mirrorRows([
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
    missile: mirrorRows([
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
    cryo: mirrorRows([
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
    tesla: mirrorRows([
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
    sniper: mirrorRows([
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
    venom: mirrorRows([
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
    amp: mirrorRows([
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
    rail: mirrorRows([
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

  const TOWER_IDS = ['cannon', 'gatling', 'laser', 'missile', 'cryo', 'tesla', 'sniper', 'venom', 'amp', 'rail'];

  const FAMILY_COL = {
    cannon: '#e2e8f0',
    gatling: '#fbbf24',
    laser: '#f43f5e',
    missile: '#fb923c',
    cryo: '#38bdf8',
    tesla: '#34d399',
    sniper: '#67e8f9',
    venom: '#a3e635',
    amp: '#fde047',
    rail: '#ffffff'
  };

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
      'KCRRKWRWKRRCX'.replace(/X/, 'K'),
      'KCRRKRRRKRRCX'.replace(/X/, 'K'),
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
      'KBCKGGGGKCBXK'.replace(/X/, 'B'),
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
      'KWCX'.replace(/X/, 'K'),
      'KCGK',
      'KKKK'
    ],
    wasp: [
      'KK        KK',
      'KYYK      KYX'.replace(/X/, 'Y') + 'K',
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
      'KOOOOWWKDDDDDDDKWWOOOXK'.replace(/X/, 'O'),
      'KOOOWWKDDRRDDRDDKWWOOOK',
      'KOOWWKDDRRKGGKRRDDKWOOX'.replace(/X/, 'K'),
      'KOOWKDDRRKGYGKRRDDKWOOK',
      'KOOWKDDRRKGYGKRRDDKWOXK'.replace(/X/, 'K'),
      'KOOXKDDRKKKKKKRDDKXOOXK'.replace(/X/g, 'O'),
      ' KOOXKWDDDDDDDDDWKXOOK '.replace(/X/g, 'O'),
      '  KKOOWWKDDDDDKWWOOKK  ',
      '    KKKWWKKKKKWWKKK    ',
      '      KKKKKKKKKKK      '
    ],
    boss3: [
      '  KKKKKKKKKKKKKKKKKKKK  ',
      ' KWWWWWWWWKKKKKWWWWWWWWK',
      'KWCYYCWWWWKDDDKWWWWCYYCX'.replace(/X/, 'K'),
      'KCYYCCWWKDDDDDDDKWWCCYYK',
      'KCYYWKDDRRRRRRRDDKWYYCKK',
      'KCWXKDDRGGGGGGGRDDKXWCKK'.replace(/X/g, 'Y'),
      'KCWKDDRGGKKKKKGGXRDKWCKK'.replace(/XR/, 'RD'),
      'KCWKDRGGKKWWWKKGGRDKWCKK',
      'KCWKDRGGKKWKWKKGGRDKWCKK',
      'KCWKDDRGGKKKKKGGXRDKWCKK'.replace(/XR/, 'RD'),
      'KCCXKDDRGGGGGGGXRDXXCCKK'.replace(/X/g, 'Y'),
      'KCCWKDDRRRRRRRRRDKWCCXK'.replace(/X/, 'K'),
      ' KCKWWKDDDDDDDDDKWWKCK  ',
      '  KKWWKKKDDDDDKKKWWKKK  ',
      '    KKKKKKKKKKKKKKKK    '
    ]
  };

  const ENEMY_IDS = [
    'drone', 'runner', 'tank', 'swarm', 'healer', 'phase', 'bomber',
    'shielded', 'splitter', 'colossus', 'mini', 'wasp',
    'boss1', 'boss2', 'boss3', 'fleet'
  ];

  const ENEMY_COL = {
    drone: '#f97316',
    runner: '#fbbf24',
    tank: '#94a3b8',
    swarm: '#fb923c',
    healer: '#34d399',
    phase: '#38bdf8',
    bomber: '#f43f5e',
    shielded: '#60a5fa',
    splitter: '#fde047',
    colossus: '#64748b',
    mini: '#fde047',
    wasp: '#facc15',
    boss1: '#f43f5e',
    boss2: '#fb923c',
    boss3: '#22d3ee',
    fleet: '#a3e635'
  };

  const PU_COLOR = { P: '#38bdf8', S: '#34d399', B: '#fbbf24', R: '#f43f5e' };
  const PU_LETTERS = ['P', 'S', 'B', 'R'];
  const GLYPH = {
    P: ['XXX', 'X.X', 'XXX', 'X..', 'X..'],
    S: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
    B: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
    R: ['XXX', 'X.X', 'XXX', 'XX.', 'X.X']
  };

  function rowsWidth(rows) {
    let w = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].length > w) w = rows[i].length;
    }
    return w;
  }

  function enemyBox(rows) {
    const ew = rowsWidth(rows) * PX;
    const eh = rows.length * PX;
    const dim = Math.max(ew, eh);
    return { dim: dim, ox: Math.floor((dim - ew) / 2), oy: Math.floor((dim - eh) / 2) };
  }

  function drawRows(g, rows, pal, ox, oy) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ' ' || ch === '.') continue;
        const c = pal[ch];
        if (!c) continue;
        g.fillStyle(num(c), 1);
        g.fillRect(ox + x * PX, oy + y * PX, PX, PX);
      }
    }
  }

  function paintPowerup(g, letter) {
    const col = num(PU_COLOR[letter]);
    g.fillStyle(PANEL_NUM, 1);
    g.fillRect(0, 0, 12 * PX, 12 * PX);
    g.fillStyle(col, 1);
    g.fillRect(0, 0, 12 * PX, PX);
    g.fillRect(0, 11 * PX, 12 * PX, PX);
    g.fillRect(0, PX, PX, 10 * PX);
    g.fillRect(11 * PX, PX, PX, 10 * PX);
    const glyph = GLYPH[letter];
    for (let y = 0; y < glyph.length; y++) {
      const row = glyph[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        g.fillRect((5 + x) * PX, (4 + y) * PX, PX, PX);
      }
    }
  }

  function paintDot(g) {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  }

  function paintRing(g) {
    g.fillStyle(0xffffff, 1);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - 8;
        const dy = y + 0.5 - 8;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 36 && d2 <= 64) g.fillRect(x, y, 1, 1);
      }
    }
  }

  function removeKey(scene, key) {
    try {
      if (scene.textures && scene.textures.exists(key)) scene.textures.remove(key);
    } catch (e) {}
  }

  function paintKey(scene, key, w, h, painter) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    painter(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  function build(scene) {
    const out = [];
    if (!scene || !scene.make || typeof scene.make.graphics !== 'function') {
      out.push('WARN invalid scene');
      return out;
    }
    for (let i = 0; i < TOWER_IDS.length; i++) {
      const id = TOWER_IDS[i];
      const key = 'tur_' + id;
      try {
        const grid = TOWER_ART[id];
        if (!grid || !grid.length) {
          out.push('WARN missing grid ' + key);
          continue;
        }
        const w = rowsWidth(grid) * PX;
        const h = grid.length * PX;
        const pal = towerPalette(FAMILY_COL[id]);
        removeKey(scene, key);
        paintKey(scene, key, w, h, function (g) {
          drawRows(g, grid, pal, 0, 0);
        });
        out.push(key + ' ' + w + 'x' + h);
      } catch (e) {
        out.push('WARN ' + key + ' ' + (e && e.message));
      }
    }
    for (let i = 0; i < ENEMY_IDS.length; i++) {
      const type = ENEMY_IDS[i];
      const key = 'en_' + type;
      try {
        const grid = type === 'fleet' ? ENEMY_ART.boss3 : ENEMY_ART[type];
        if (!grid || !grid.length) {
          out.push('WARN missing grid ' + key);
          continue;
        }
        const pal = enemyPalette(ENEMY_COL[type]);
        const box = enemyBox(grid);
        removeKey(scene, key);
        paintKey(scene, key, box.dim, box.dim, function (g) {
          drawRows(g, grid, pal, box.ox, box.oy);
        });
        out.push(key + ' ' + box.dim + 'x' + box.dim);
      } catch (e) {
        out.push('WARN ' + key + ' ' + (e && e.message));
      }
    }
    for (let i = 0; i < PU_LETTERS.length; i++) {
      const letter = PU_LETTERS[i];
      const key = 'pu_' + letter;
      try {
        if (!GLYPH[letter] || !PU_COLOR[letter]) {
          out.push('WARN missing grid ' + key);
          continue;
        }
        removeKey(scene, key);
        paintKey(scene, key, 36, 36, function (g) {
          paintPowerup(g, letter);
        });
        out.push(key + ' 36x36');
      } catch (e) {
        out.push('WARN ' + key + ' ' + (e && e.message));
      }
    }
    try {
      removeKey(scene, 'px_dot');
      paintKey(scene, 'px_dot', 4, 4, paintDot);
      out.push('px_dot 4x4');
    } catch (e) {
      out.push('WARN px_dot ' + (e && e.message));
    }
    try {
      removeKey(scene, 'px_ring');
      paintKey(scene, 'px_ring', 16, 16, paintRing);
      out.push('px_ring 16x16');
    } catch (e) {
      out.push('WARN px_ring ' + (e && e.message));
    }
    return out;
  }

  return { PX: PX, build: build };
})();
