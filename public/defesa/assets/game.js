/* Defesa Orbital v3 - game.js (Brief 08 A5: extracao mecanica de assets/scenes.js, cenas TD: BootScene 2082-2088 + MenuScene/THEME_BG/GameScene 2508-4135) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
      makeTextures(this);
      this.scene.start('Menu');
    }
  }


  /* ---- A5: MenuScene + THEME_BG + GameScene (orig scenes.js 2508-4135) ---- */
  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
      this.cameras.main.fadeIn(300);
      SND.unlock();
      SND.musicTick('menu');
      makeTextures(this);
      if (!this.textures.exists('stars1')) {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        for (let i = 0; i < 90; i++) {
          g.fillStyle(0xffffff, 0.25 + Math.random() * 0.75);
          g.fillCircle(Math.random() * 512, Math.random() * 320, Math.random() < 0.85 ? 1 : 2);
        }
        g.generateTexture('stars1', 512, 320); g.destroy();
      }
      this.starsA = this.add.tileSprite(BW / 2, BH / 2, BW, BH, 'stars1').setAlpha(0.7);
      this.starsB = this.add.tileSprite(BW / 2, BH / 2, BW, BH, 'stars1').setAlpha(0.35).setScale(1.6);
      [ '#38bdf8', '#f43f5e', '#34d399' ].forEach((c, i) => {
        const img = this.add.image(140 + i * 330, 120 + (i % 2) * 330, 'soft')
          .setTint(Phaser.Display.Color.HexStringToColor(c).color)
          .setScale(9 - i).setAlpha(0.10);
        this.tweens.add({ targets: img, alpha: 0.16, scale: (9 - i) * 1.15, duration: 5200 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
      MenuDOM.build(this);
      MenuDOM.show();
      this.input.once('pointerdown', () => SND.unlock());
    }
    update(_, dms) {
      this.starsA.tilePositionX += dms * 0.018;
      this.starsB.tilePositionX -= dms * 0.008;
    }
    shutdown() { MenuDOM.hide(); SND.laserStopAll(); }
  }

  /* ---- GameScene ---- */
  const THEME_BG = {
    'space-station': { base: 0x0a1128, accent: '#38bdf8' },
    'asteroid-field': { base: 0x0b1220, accent: '#94a3b8' },
    'solar-furnace': { base: 0x14090c, accent: '#fb923c' },
    'ion-nebula': { base: 0x081420, accent: '#22d3ee' },
    'singularity': { base: 0x07040e, accent: '#f43f5e' },
    // Sistema Solar temático — 8 planetas + luas
    'mercury': { base: 0x1a1208, accent: '#f59e0b' },
    'venus': { base: 0x1a0f08, accent: '#fbbf24' },
    'mars': { base: 0x1a0a08, accent: '#f43f5e' },
    'luna': { base: 0x0f1420, accent: '#94a3b8' },
    'europa': { base: 0x0a1a2a, accent: '#38bdf8' },
    'titan': { base: 0x140f1a, accent: '#f59e0b' },
    'uranus': { base: 0x0a1a2a, accent: '#22d3ee' },
    'triton': { base: 0x0a0f1e, accent: '#38bdf8' },
    'solar-system': { base: 0x020617, accent: '#a3e635' }
  };

  class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create(data) {
      SND.unlock();
      D.Save.load();
      SND.setMuted(!!D.Save.data.muted);
      const mapIdx = (data && data.mapIdx) || 0;
      const diffKey = (data && data.diffKey) || 'normal';
      const endless = !!(data && data.endless);
      this.params = { mapIdx, diffKey, endless };
      this.S = startNewGame(mapIdx, diffKey, endless);
      this.paused = false;
      // Onda 5: sessão nova nunca herda TweenManager pausado de uma pausa anterior
      try { this.tweens.resumeAll(); } catch (eTR) {}
      this.speedIdx = 0;
      this.speeds = [1, 2, 4];
      this.armed = null;
      this.placingId = null;
      this.selected = null;
      this.zaps = []; this.tracers = [];
      this.enemyViews = {}; this.towerViews = {};
      this.pointerWorld = { x: 0, y: 0 };
      this.hoverCell = { c: -1, r: -1 };
      this._lastCredits = -1; this._lastLives = -1;
      this._lastWave = -1; this._waveTotal = 1;
      this._prevPreviewWave = undefined; this._prevPreviewKey = ''; // E4: força 1º rebuild por sessão
      this._hud = null; // U2.1: invalida cache de nos DOM (botoes sao clonados em bindInput)

      const scr = document.getElementById('topbar');
      if (scr) scr.classList.remove('off');
      const shop = document.getElementById('shopbar');
      if (shop) shop.classList.remove('off');
      const boardShell = document.getElementById('board-shell');
      if (boardShell) boardShell.classList.remove('tower-panel-open');
      const towerPanel = document.getElementById('tower-panel');
      if (towerPanel) towerPanel.classList.add('hidden');
      hideOverlay('modal-end'); hideOverlay('pause-overlay');

      this.cameras.main.fadeIn(320);
      this.buildStatic();
      this.buildFxLayers();
      this.buildShopDom();
      this.buildSupersDom();
      this.bindInput();
      try { this.ensureTowerCompactBtn(); } catch (e) {}
      // M2 (brief 09): painel compacto por padrao em viewport pequena/toque
      try {
        const _coarse = !!(window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 760px)').matches));
        if (_coarse) { const _tp = document.getElementById('tower-panel'); if (_tp) _tp.classList.add('compact'); }
      } catch (e3) {}
      // V12-js: estado inicial do toggle (default ON)
      try {
        if (this.S.showDmgNum === undefined) this.S.showDmgNum = true;
        const _db = document.getElementById('btn-dmgnum');
        if (_db) { _db.setAttribute('aria-pressed', this.S.showDmgNum ? 'true' : 'false'); _db.classList.toggle('active', !!this.S.showDmgNum); _db.style.opacity = this.S.showDmgNum ? '1' : '0.45'; }
      } catch (e2) {}
      // TU-TUTO: coach marks na 1ª partida (D.Save.tutorialSeen); "?" reabre
      this._tutActive = false; this._tutIdx = -1;
      try { this._tutBindButtons(); } catch (eT0) {}
      try {
        const _seen = !!(D.Save && D.Save.data && D.Save.data.tutorialSeen);
        if (!_seen) this.time.delayedCall(500, () => { try { this._tutStart(false); } catch (eT1) {} });
      } catch (eT2) {}

      SND.musicTick('combat', 0);
      this.toastTimer = this.time.addEvent({ delay: 700, loop: true, callback: () => this.pollToasts() });
      this.events.once('shutdown', () => this.cleanup());
    }

    cleanup() {
      SND.laserStopAll();
      const scr = document.getElementById('topbar');
      if (scr) scr.classList.add('off');
      const shop = document.getElementById('shopbar');
      if (shop) shop.classList.add('off');
      const boardShell = document.getElementById('board-shell');
      if (boardShell) boardShell.classList.remove('tower-panel-open');
      const towerPanel = document.getElementById('tower-panel');
      if (towerPanel) towerPanel.classList.add('hidden');
      // Onda 5: anel de suprimento (.supply-ring) não pode sobrar entre sessões
      try {
        const sr = document.querySelector('#board-shell > .supply-ring');
        if (sr) sr.remove();
        this._supplyRingKey = null;
      } catch (eSR) {}
      hideOverlay('modal-end'); hideOverlay('pause-overlay'); hideTip();
      try { this._tutHide(); } catch (eT3) {}
      ['banner'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('show'); });
      this._bannerQueue = []; this._bannerBusy = false;
    }

    /* ---------- construção estática ---------- */
    buildStatic() {
      const theme = THEME_BG[this.S.map.theme] || THEME_BG['space-station'];
      // FUNDO base navy
      this.add.rectangle(BW / 2, BH / 2, BW, BH, theme.base);
      // MAPA NOVO PIXEL ART: fundo em tiles 44x44 por tema (mesma identidade das torres/inimigos)
      const mapTheme = this.S.map.theme;
      const bgTileKey = 'tile_bg_' + mapTheme;
      const bgTileAlt = 'tile_' + mapTheme + '_a';
      const bgKey = (this.textures.exists(bgTileKey) ? bgTileKey : (this.textures.exists(bgTileAlt) ? bgTileAlt : null));
      if(bgKey){
        this.bgTile = this.add.tileSprite(BW/2, BH/2, BW, BH, bgKey).setDepth(0).setAlpha(0.95);
        // pixel crisp: desativa suavização
        if(this.bgTile.setTileScale) this.bgTile.setTileScale(1);
      }
      // S4.1 — BOARD DUSK default: horizonte âmbar + vinheta fria no backdrop (depth < path).
      // Path/torres/inimigos seguem opacos por cima (depth>=2): contraste intacto. Se o mapa
      // tiver backdrop próprio, o dusk fica como camada atrás/entre (acima dos tiles, abaixo do path).
      try {
        if(window.TILES && window.TILES.paintDuskSky){
          // Sutil: alpha reduzido (horizonte âmbar + vinheta fria sem roubar o navy).
          this.duskGfx = this.add.graphics().setDepth(0.6).setAlpha(0.5);
          window.TILES.paintDuskSky(this.duskGfx, BW, BH);
        }
      } catch(e){}
      // S4.1 — lua `moon` pequena num canto do céu, fora da área de path (atrás do path).
      // G2 — variante por map.theme via moonFor(): 1 draw estático, tint+escala sobre a base creme.
      try {
        const _moonSpec = (typeof moonFor === 'function') ? moonFor(mapTheme) : { key: 'moon', tint: 0xffffff, scale: 0.3 };
        const _moonKey = (_moonSpec && _moonSpec.key && this.textures.exists(_moonSpec.key)) ? _moonSpec.key : 'moon';
        if(this.textures.exists(_moonKey)){
          let spot = null;
          // Faixa do céu (fileira r=1, longe da coluna #supers do DOM): célula livre = fora do path.
          for(let c = 1; c < COLS - 1 && !spot; c++){
            const x = c * CELL + CELL / 2;
            if(x > BW - 140) break;
            if(!this.S.blocked[c + ',1']) spot = [x, 1 * CELL + CELL / 2];
          }
          if(!spot){
            // Fallback: cantos com vizinhança 3x3 livre.
            const corners = [[64, 56], [BW - 64, BH - 56], [64, BH - 56], [BW - 64, 56]];
            const isFree = (x, y) => {
              const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
              for(let dc = -1; dc <= 1; dc++) for(let dr = -1; dr <= 1; dr++){
                if(this.S.blocked[(c + dc) + ',' + (r + dr)]) return false;
              }
              return true;
            };
            for(const s of corners){ if(isFree(s[0], s[1])){ spot = s; break; } }
          }
          if(spot){
            this.duskMoon = this.add.image(spot[0], spot[1], _moonKey).setDepth(0.7).setAlpha(0.8).setScale((_moonSpec && _moonSpec.scale) || 0.3);
            if(_moonSpec && _moonSpec.tint != null) this.duskMoon.setTint(_moonSpec.tint);
          }
        }
      } catch(e){}
      // E3: só gera a textura uma vez por página (restart não recria 70 círculos)
      if (!this.textures.exists('bgstars')) {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff, 1);
        for (let i = 0; i < 70; i++) g.fillCircle(Math.random() * BW, Math.random() * BH, Math.random() < 0.9 ? 1 : 2);
        g.generateTexture('bgstars', BW, BH); g.destroy();
      }
      this.add.image(BW / 2, BH / 2, 'bgstars').setAlpha(0.35).setDepth(1);

      // GRID pixel art: linhas 1px a cada 44px com alpha .06 (snap inteiro)
      this.gridGfx = this.add.graphics().setDepth(2);
      this.gridGfx.lineStyle(1, 0x38bdf8, 0.06);
      for (let c = 0; c <= COLS; c++) { this.gridGfx.lineBetween(c * CELL, 0, c * CELL, BH); }
      for (let r = 0; r <= ROWS; r++) { this.gridGfx.lineBetween(0, r * CELL, BW, r * CELL); }

      // ROTA PIXEL ART: blocos 44x44 por célula bloqueada (mesmo material das torres) — DEPTH BAIXO (atrás dos inimigos)
      this.pathTiles = [];
      const pathKey = 'tile_path_' + mapTheme;
      const hasPathTile = this.textures.exists(pathKey) || this.textures.exists(pathKey+'_0');
      if(hasPathTile){
        for(const k in this.S.blocked){
          const parts = k.split(','); const c = parseInt(parts[0],10), r = parseInt(parts[1],10);
          if(c<0||c>=COLS||r<0||r>=ROWS) continue;
          let mask=0;
          if(this.S.blocked[c+','+(r-1)]) mask|=1;
          if(this.S.blocked[(c+1)+','+r]) mask|=2;
          if(this.S.blocked[c+','+(r+1)]) mask|=4;
          if(this.S.blocked[(c-1)+','+r]) mask|=8;
          const connectedKey=pathKey+'_'+mask;
          const t = this.add.image(c*CELL + CELL/2, r*CELL + CELL/2, this.textures.exists(connectedKey)?connectedKey:pathKey).setDepth(2).setAlpha(0.98);
          this.pathTiles.push(t);
        }
      }
      // Mantém routeGfx vetorial como overlay sutil para bordas (agora mais fino, pixel snap) — também atrás dos inimigos
      this.routeGfx = this.add.graphics().setDepth(3);
      const accent = Phaser.Display.Color.HexStringToColor(theme.accent).color;
      this.S.routes.forEach(pts => {
        this.routeGfx.lineStyle(1.5, accent, 0.22);
        this.drawPath(this.routeGfx, pts);
      });
      this.dashGfx = this.add.graphics().setDepth(4);
      this.dashOffset = 0;

      // Portal base (saída)
      const exitPts = this.S.routes[0];
      const last = exitPts[exitPts.length - 1];
      this.portalPos = { x: last.x, y: last.y };
      this.portalCore = this.add.image(last.x, last.y, 'soft').setTint(0x38bdf8).setScale(3.4).setAlpha(0.9);
      this.portalRing = this.add.image(last.x, last.y, 'ring').setTint(0x38bdf8).setScale(2.2);
      this.tweens.add({ targets: this.portalRing, angle: 360, duration: 9000, repeat: -1 });
      this.tweens.add({ targets: this.portalCore, alpha: 0.45, scale: 3.0, duration: 1100, yoyo: true, repeat: -1 });

      // Marcadores de entrada
      this.spawnMarkers = [];
      this.S.routes.forEach(pts => {
        const first = pts[0];
        const m1 = this.add.image(Math.max(10, first.x), first.y, 'chev').setTint(accent).setAlpha(0.8);
        const m2 = this.add.image(Math.max(10, first.x) + 16, first.y, 'chev').setTint(accent).setAlpha(0.45);
        this.spawnMarkers.push(m1, m2);
      });

      this.uiGfx = this.add.graphics().setDepth(60);
    }

    drawPath(g, pts) {
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
    }

    buildFxLayers() {
      this.fxUnder = this.add.container(0, 0).setDepth(20);
      this.fxOver = this.add.container(0, 0).setDepth(50);
      this.beamGfx = this.scene ? this.add.graphics().setDepth(45) : null;
      this.vortexGfx = this.add.graphics().setDepth(21);
      this.floatLayer = this.add.container(0, 0).setDepth(70);
      this.pools = {};
      // E5: contadores de imagens ativas por pool (substituem varredura O(pool)/frame)
      this._poolActive = {};
      this._poolTotal = 0;
      this.floatPool = [];
      this.activeFloats = [];
      // Brief 08 A6: pool de projeteis do Game TD (obter/devolver, sem destroy() por frame)
      this._projPool = [];
      this._projKnown = new Set();
      // G3 — brasas ambiente: ~10 'ember' (textura de textures.js) à deriva lenta sobre o
      // board em modo dusk (duskGfx presente = board dusk default S4.1, ou THEMES[theme].dusk).
      // Reusa o pool atual via getImg (sem life/vx/vy => updateParticles ignora); drift por
      // tween yoyo (custo zero/frame no nosso código, zero alocação por frame, sem dano/timing).
      try {
        const _tInfo = (window.TILES && window.TILES.THEMES && this.S && this.S.map) ? window.TILES.THEMES[this.S.map.theme] : null;
        if (this.duskGfx || (_tInfo && _tInfo.dusk)) {
          const EMBER_TINTS = [0xe0512b, 0xf5a83d, 0xfb923c];
          for (let i = 0; i < 10; i++) {
            const m = this.getImg('ember');
            m.setTexture('ember').setTint(EMBER_TINTS[i % EMBER_TINTS.length]);
            m.setPosition(Math.random() * BW, Math.random() * BH);
            m.setScale(0.5 + Math.random() * 0.5).setAlpha(0.35 + Math.random() * 0.25);
            if (!m._inLayer) { this.fxUnder.add(m); m._inLayer = true; }
            this.tweens.add({ targets: m, x: m.x + (Math.random() - 0.5) * 60, y: m.y - (30 + Math.random() * 50), duration: 4000 + Math.random() * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 3000 });
          }
        }
      } catch (e) {}
    }

    getImg(key) {
      if (!this.pools[key]) this.pools[key] = [];
      const arr = this.pools[key];
      for (const img of arr) if (!img.active) {
        img.setActive(true).setVisible(true);
        if (this._poolActive) { this._poolActive[key] = (this._poolActive[key] || 0) + 1; this._poolTotal = (this._poolTotal || 0) + 1; }
        return img;
      }
      const img = this.add.image(0, 0, key);
      img.setActive(true);
      arr.push(img);
      if (this._poolActive) { this._poolActive[key] = (this._poolActive[key] || 0) + 1; this._poolTotal = (this._poolTotal || 0) + 1; }
      return img;
    }

    // E5: devolve imagem ao pool mantendo contadores coerentes (usado no expiration)
    _freeImg(key, img) {
      if (!img.active) return;
      img.setActive(false).setVisible(false);
      if (this._poolActive) {
        this._poolActive[key] = Math.max(0, (this._poolActive[key] || 0) - 1);
        this._poolTotal = Math.max(0, (this._poolTotal || 0) - 1);
      }
    }

    // Brief 08 A6: projeteis do Game TD reutilizam _img (mesma textura/tint/escala/depth/posicao;
    // so muda a alocacao). Devolucao esconde (setVisible(false)); obter reexibe e reconfigura.
    getProjImg() {
      const arr = this._projPool || (this._projPool = []);
      for (const img of arr) if (!img.active) { img.setActive(true).setVisible(true); return img; }
      const img = this.add.image(-50, -50, 'dot');
      img.setActive(true);
      arr.push(img);
      return img;
    }

    releaseProjImg(img) {
      img.setActive(false).setVisible(false);
      img.setPosition(-50, -50);
    }

    spark(x, y, colHex, n, spd, life, key) {
      const k = key || 'dot';
      // cap visual estrito — evita poluição onda 48 x4 (screenshot: tela poluida)
      // níveis altos geram 2.2x inimigos → sem cap estrito acumula 500+ dots
      const arr = this.pools[k];
      if (arr) {
        const active = (this._poolActive && this._poolActive[k]) || 0;
        // thresholds baixos: 45 dots já é visível, >70 começa a poluir
        if (active > 55) {
          if (active > 85) return; // tela poluída, skip total
          n = Math.max(1, Math.floor(n * 0.30)); // throttle forte
        }
        if (active > 110) return;
        // em ondas muito altas (48) com x4, reduz lifetime para sumir mais rápido
        if (active > 35 && life > 0.35) life *= 0.65;
      }
      const col = typeof colHex === 'string' ? Phaser.Display.Color.HexStringToColor(colHex).color : colHex;
      for (let i = 0; i < n; i++) {
        const p = this.getImg(k);
        p.setTexture(k).setTint(col);
        p.x = x; p.y = y;
        const a = Math.random() * Math.PI * 2;
        const v = spd * (0.4 + Math.random() * 0.8);
        p.setData && p.setData('vx', Math.cos(a) * v);
        p.setData && p.setData('vy', Math.sin(a) * v);
        p.setData && p.setData('life', life * (0.6 + Math.random() * 0.7));
        p.setData && p.setData('tot', p.getData('life'));
        p.setScale(0.6 + Math.random() * 0.7);
        p.setAlpha(1);
        if (!p._inLayer) { this.fxOver.add(p); p._inLayer = true; }
      }
    }

    // G3 — paleta quente das explosões: round-robin determinístico fogo/brasa
    // (laranja #fb923c / âmbar #f5a83d / brasa #e0512b). Sem roxo, sem aleatoriedade por frame.
    warmBoomCol() {
      const PAL = ['#fb923c', '#f5a83d', '#e0512b'];
      this._boomWarmIdx = (((this._boomWarmIdx | 0) + 1) % PAL.length);
      return PAL[this._boomWarmIdx];
    }

    boomFx(x, y, r, col, big) {
      // cap flash/ring também — evita acúmulo em onda 48 x4
      const softArr = this.pools['soft'];
      if (softArr) { let a=0; for(const im of softArr) if(im.active) a++; if(a>18) { /* skip flash se poluído */ } else {
        const flash = this.getImg('soft');
        flash.setTexture('soft').setTint(0xffffff).setPosition(x, y).setScale(r / 12).setAlpha(0.95);
        flash.setData && flash.setData('life', 0.12), flash.setData && flash.setData('tot', 0.12);
        flash.setData && flash.setData('vx', 0), flash.setData && flash.setData('vy', 0);
        if (!flash._inLayer) { this.fxOver.add(flash); flash._inLayer = true; }
      }}
      // sparks já têm cap interno, mas reduz life para sumir mais rápido em alta carga
      this.spark(x, y, '#ffffff', big ? 8 : 5, r * 4.2, 0.32);
      this.spark(x, y, col, big ? 12 : 6, r * 3.0, 0.42);
      // G3 — detrito frio genérico '#64748b' vira brasa '#e0512b'; preserva o frio SÓ quando
      // o núcleo é o azul do ionBeam ('#38bdf8', semântica própria de beam — não mexer).
      this.spark(x, y, (col === '#38bdf8' ? '#64748b' : '#e0512b'), big ? 5 : 3, r * 1.8, 0.55);
      const ringArr = this.pools['ring'];
      if (ringArr) { let a=0; for(const im of ringArr) if(im.active) a++; if(a>12) { /* skip ring */ } else {
        const ring = this.getImg('ring');
        ring.setTexture('ring').setTint(0xffffff).setPosition(x, y).setScale(0.3).setAlpha(0.85);
        ring.setData && ring.setData('life', 0.22), ring.setData && ring.setData('tot', 0.22);
        ring.setData && ring.setData('vx', 0), ring.setData && ring.setData('vy', 0);
        ring.setData && ring.setData('grow', r / 17);
        if (!ring._inLayer) { this.fxOver.add(ring); ring._inLayer = true; }
      }}
      this.cameras.main.shake(big ? 260 : 130, (big ? 0.010 : 0.004));
    }

    floatTxt(x, y, txt, col, size) {
      if (this.activeFloats.length > 46) {
        const old = this.activeFloats.shift();
        if (old && old.txt) { old.txt.setVisible(false); this.floatPool.push(old.txt); }
      }
      let t = this.floatPool.pop();
      if (!t) t = this.add.text(0, 0, '', { fontFamily: 'Rajdhani, sans-serif', fontStyle: 'bold' });
      t.setVisible(true).setText(txt).setColor(col || '#fff').setFontSize(size || 11).setPosition(x, y).setAlpha(1).setScale(1);
      this.floatLayer.add(t);
      const item = { txt: t, life: 0.9 };
      this.activeFloats.push(item);
      return item;
    }

    /* ---------- DOM: loja / supers / painel ---------- */
    el(id) { return document.getElementById(id); }

    // U2.1 — dedupe de listeners DOM: os botoes do HUD vivem no index.html e
    // sobrevivem ao restart da cena; religar addEventListener a cada `create`
    // empilhava handlers (2a sessao: 1 clique = 2 disparos). O clone descarta os
    // listeners antigos (cloneNode nao os copia) mantendo id/classes/atributos.
    _freshBtn(id) {
      const old = document.getElementById(id);
      if (!old || !old.parentNode) return old;
      const fresh = old.cloneNode(true);
      old.parentNode.replaceChild(fresh, old);
      return fresh;
    }

    buildShopDom() {
      const bar = this.el('shopbar');
      bar.innerHTML = '';
      D.TOWERS_DATA.forEach(def => {
        const card = document.createElement('div');
        card.className = 'shop-card chamf';
        card.style.setProperty('--tc', def.color);
        card.dataset.id = def.id;
        // V1-js: a11y funcional dos cards (role + teclado)
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        // V2: stats inline — DPS calculado + alcance + ✈ se atinge ar (sem hover)
        // RANGESQ: alcance em □ (rngSqEff, ex. "3□")
        let dpsTxt = 'suporte', rngTxt = (def.rngSq != null ? def.rngSq + '□' : def.rng), airTxt = '';
        try {
          const tmpT = { defRef: def, level: 1, specBranch: null, x: 0, y: 0 };
          const st2 = getTowerStats(this.S, tmpT);
          if (def.kind === 'beam') dpsTxt = Math.round(st2.dmg) + '/s';
          else if (def.kind === 'buff') dpsTxt = 'buff';
          else if (st2.rate) dpsTxt = Math.round(st2.dmg * st2.rate) + ' DPS';
          else dpsTxt = Math.round(st2.dmg) + ' DMG';
          var _sq2 = (st2.rngSqEff != null ? st2.rngSqEff : (st2.rng / 44));
          rngTxt = (Math.round(_sq2 * 10) / 10) + '□';
          if (canHitAir(tmpT)) airTxt = ' ✈';
        } catch (e) { /* headless fallback: usa base */ }
        const dps = def.kind === 'beam' ? '~' + def.dmg + '/s' : (def.rate ? '~' + Math.round(def.dmg * def.rate) + ' DPS' : 'suporte');
        card.setAttribute('aria-label', def.name + '. Custo $' + def.cost + '. ' + dpsTxt + ', alcance ' + rngTxt + (airTxt ? ', atinge ar' : ''));
        card.innerHTML =
          '<div class="sc-icon" style="color:' + def.color + '">' + def.icon + '</div>' +
          '<div class="sc-body"><div class="sc-name">' + def.name + '</div>' +
          '<div class="sc-cost">$' + def.cost + '</div>' +
          '<div class="sc-stats" style="font-family:JetBrains Mono,monospace;font-size:10px;color:#cde6ff;line-height:1.2">' + dpsTxt + ' • ' + rngTxt + airTxt + '</div></div>';
        // v3 PIXEL FASE 6: secao LOGICA DE TIER no tooltip da loja
        let tierTip = '';
        const tl = D.TIER_LOGIC[def.id] || {};
        [2, 3, 4, 5].forEach(tr => {
          if (tl[tr]) tierTip += '<span style="color:' + (tr >= 4 ? '#fbbf24' : '#8fa3c4') + '">T' + tr + ':</span> ' + tl[tr].name + ' — ' + tl[tr].desc + '<br>';
        });
        const superTip = D.SUPERS_AUTO[def.id] ? '<br><b style="color:#fde047">★ SUPER AUTO:</b> ' + D.SUPERS_AUTO[def.id].name + ' — ' + D.SUPERS_AUTO[def.id].desc + '<br>' : '';
        const tipHtml =
          '<b style="color:' + def.color + '">' + def.name + '</b><br>' +
          '<span class="tt-muted">' + def.desc + '</span><br>' +
          'DANO ' + def.dmg + (def.kind === 'beam' ? '/s' : '') + ' • ALCANCE ' + (def.rngSq != null ? def.rngSq + '□' : def.rng) +
          (def.rate ? ' • CADÊNCIA ' + def.rate + '/s' : '') + '<br>' +
          '<b>' + dps + '</b>' + (def.splash ? ' • ÁREA ' + def.splash : '') + '<br>' +
          '<span class="tt-good">Nv4\u25B8A:</span> ' + def.specA.name + ' \u2014 ' + def.specA.desc + '<br>' +
          '<span class="tt-good">Nv4\u25B8B:</span> ' + def.specB.name + ' \u2014 ' + def.specB.desc + '<br>' +
          '<div style="margin-top:4px;padding-top:3px;border-top:1px solid #334155"><b style="color:#38bdf8">LÓGICA DE TIER</b><br>' + tierTip + '</div>' +
          superTip;
        this.bindTip(card, tipHtml);
        const pickShop = () => {
          SND.ui();
          if (this.S.credits < def.cost) { SND.error(); return; }
          this.placingId = (this.placingId === def.id) ? null : def.id;
          this.selected = null;
          this.refreshShopSel();
        };
        card.addEventListener('click', pickShop);
        card.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          pickShop();
        });
        bar.appendChild(card);
      });
      // v3 PIXEL FASE 5: card PRÓPRIO da Fábrica (borda verde, recurso peças)
      (() => {
        const fd = D.FACTORY_DATA;
        const card = document.createElement('div');
        card.className = 'shop-card chamf';
        card.style.setProperty('--tc', fd.color);
        card.style.borderColor = '#34d399';
        card.dataset.id = 'factory';
        // V1-js: fábrica também é operável por teclado
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', fd.name + '. Custo $' + fd.cost + '. Produz peças por onda');
        card.innerHTML =
          '<div class="sc-icon" style="color:' + fd.color + '">⚙</div>' +
          '<div class="sc-body"><div class="sc-name" style="color:#34d399">' + fd.name + '</div>' +
          '<div class="sc-cost">$' + fd.cost + '</div>' +
          '<div class="sc-stats" style="font-family:JetBrains Mono,monospace;font-size:10px;color:#34d399;line-height:1.2">+10⚙ +$18/onda</div></div>';
        this.bindTip(card,
          '<b style="color:#34d399">' + fd.name + '</b><br>' +
          '<span class="tt-muted">' + fd.desc + '</span><br>' +
          'POR ONDA COMPLETA: <b>+10⚙ +$18</b> × nível<br>' +
          'NÃO combate • Upgrades com créditos + peças • Venda 70%');
        const pickFac = () => {
          SND.ui();
          if (this.S.credits < fd.cost) { SND.error(); return; }
          this.placingId = (this.placingId === 'factory') ? null : 'factory';
          this.selected = null;
          this.refreshShopSel();
        };
        card.addEventListener('click', pickFac);
        card.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          pickFac();
        });
        bar.appendChild(card);
      })();
      // F4-comp U1: cards compraveis Estação Espacial + Nave de Apoio (mesmo padrão da factory)
      (() => {
        const sd = D.STATION_DATA;
        if (!sd) return;
        const card = document.createElement('div');
        card.className = 'shop-card chamf';
        card.style.setProperty('--tc', sd.color);
        card.style.borderColor = '#f5a83d';
        card.dataset.id = 'station';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', sd.name + '. Custo $' + sd.cost + '. Suprimento em raio ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius));
        card.innerHTML =
          '<div class="sc-icon" style="color:' + sd.color + '">🛰</div>' +
          '<div class="sc-body"><div class="sc-name" style="color:#f5a83d">' + sd.name + '</div>' +
          '<div class="sc-cost">$' + sd.cost + '</div>' +
          '<div class="sc-stats" style="font-family:JetBrains Mono,monospace;font-size:10px;color:#f5a83d;line-height:1.2">Raio ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius) + ' • +' + sd.rates.fuel + '/+' + sd.rates.batt + '/+' + sd.rates.ammo + '/s</div></div>';
        this.bindTip(card,
          '<b style="color:#f5a83d">' + sd.name + '</b><br>' +
          '<span class="tt-muted">' + sd.desc + '</span><br>' +
          'RAIO ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius) + ': <b>+' + sd.rates.fuel + ' fuel +' + sd.rates.batt + ' batt +' + sd.rates.ammo + ' ammo/s</b><br>' +
          'NÃO combate • Venda 70%');
        const pickSt = () => {
          SND.ui();
          if (this.S.credits < sd.cost) { SND.error(); return; }
          this.placingId = (this.placingId === 'station') ? null : 'station';
          this.selected = null;
          this.refreshShopSel();
        };
        card.addEventListener('click', pickSt);
        card.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          pickSt();
        });
        bar.appendChild(card);
      })();
      (() => {
        const sd = D.SUPPORT_DATA;
        if (!sd) return;
        const card = document.createElement('div');
        card.className = 'shop-card chamf';
        card.style.setProperty('--tc', sd.color);
        card.style.borderColor = '#7dd3fc';
        card.dataset.id = 'support';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.setAttribute('aria-label', sd.name + '. Custo $' + sd.cost + '. Suprimento em raio ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius));
        card.innerHTML =
          '<div class="sc-icon" style="color:' + sd.color + '">🚀</div>' +
          '<div class="sc-body"><div class="sc-name" style="color:#7dd3fc">' + sd.name + '</div>' +
          '<div class="sc-cost">$' + sd.cost + '</div>' +
          '<div class="sc-stats" style="font-family:JetBrains Mono,monospace;font-size:10px;color:#7dd3fc;line-height:1.2">Raio ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius) + ' • +' + sd.rates.fuel + '/+' + sd.rates.batt + '/+' + sd.rates.ammo + '/s</div></div>';
        this.bindTip(card,
          '<b style="color:#7dd3fc">' + sd.name + '</b><br>' +
          '<span class="tt-muted">' + sd.desc + '</span><br>' +
          'RAIO ' + (sd.supplySq != null ? sd.supplySq + '□' : sd.supplyRadius) + ': <b>+' + sd.rates.fuel + ' fuel +' + sd.rates.batt + ' batt +' + sd.rates.ammo + ' ammo/s</b><br>' +
          'NÃO combate • Venda 70%');
        const pickSu = () => {
          SND.ui();
          if (this.S.credits < sd.cost) { SND.error(); return; }
          this.placingId = (this.placingId === 'support') ? null : 'support';
          this.selected = null;
          this.refreshShopSel();
        };
        card.addEventListener('click', pickSu);
        card.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          pickSu();
        });
        bar.appendChild(card);
      })();
    }

    refreshShopSel() {
      [...this.el('shopbar').children].forEach(c => {
        c.classList.toggle('sel', c.dataset.id === this.placingId);
      });
    }

    buildSupersDom() {
      const box = this.el('supers');
      box.innerHTML = '';
      const compactNames = { ion:'ÍON', emp:'PEM', vortex:'VÓRTEX', overdrive:'TURBO' };
      Object.keys(D.SUPERS).forEach(k => {
        const meta = D.SUPERS[k];
        const b = document.createElement('button');
        b.className = 'super-btn chamf';
        b.id = 'super-' + k;
        b.setAttribute('aria-label', meta.name + ' — tecla ' + meta.hot + '. ' + meta.desc);
        b.style.setProperty('--sc', meta.color);
        b.innerHTML =
          '<span class="sb-hot">' + meta.hot + '</span>' +
          '<span class="sb-name sb-name-full">' + meta.name.split(' ')[0].toUpperCase() + '</span>' +
          '<span class="sb-name sb-name-compact">' + (compactNames[k] || meta.hot) + '</span>' +
          '<span class="sb-cd"></span>';
        this.bindTip(b, '<b style="color:' + meta.color + '">' + meta.name + ' [' + meta.hot + ']</b><br><span class="tt-muted">' + meta.desc + '</span><br>Recarga: ' + meta.maxCd + 's');
        b.addEventListener('click', () => this.triggerSuper(k));
        box.appendChild(b);
      });
    }

    triggerSuper(k) {
      const meta = D.SUPERS[k];
      const p = this.S.powers[k];
      if (!p || p.cd > 0) { SND.error(); return; }
      if (meta.targeted) {
        this.armed = (this.armed === k) ? null : k;
        SND.ui();
      } else {
        applySuper(this.S, k, 0, 0);
        SND.ui();
      }
    }

    /* ---------- painel da torre selecionada ---------- */
    showTowerPanel(t) {
      // M2 (brief 09): tooltip pinnado da shop nao pode cobrir o painel no mobile
      try {
        const _tip = document.getElementById('tooltip');
        if (_tip && _tip.classList.contains('pinned') && typeof hideTip === 'function') hideTip();
      } catch (_e) {}
      const panel = this.el('tower-panel');
      const wasHidden = panel.classList.contains('hidden');
      panel.classList.remove('hidden');
      if (wasHidden) {
        panel.scrollTop = 0;
        requestAnimationFrame(() => { panel.scrollTop = 0; });
      }
      const boardShell = this.el('board-shell');
      if (boardShell) boardShell.classList.add('tower-panel-open');
      const def = t.defRef;
      // v3 PIXEL FASE 5: painel próprio da fábrica
      if (def.kind === 'factory') return this.showFactoryPanel(t);
      const stats = getTowerStats(this.S, t);
      // v3 PIXEL FASE 2/6: badge de tier no painel
      const tierBadge = '<span style="font-family:JetBrains Mono;font-size:10px;font-weight:800;color:' +
        (D.getTier(t.level) >= 5 ? '#fbbf24' : '#38bdf8') + ';margin-left:6px">T' + D.getTier(t.level) + (t.level >= D.TOWER_MAX_LVL ? ' MESTRE ★' : '') + '</span>';
      this.el('tp-icon').textContent = def.icon || (def.id === 'station' ? '🛰' : (def.id === 'support' ? '🚀' : '◉'));
      this.el('tp-icon').style.color = def.color;
      this.el('tp-name').textContent = def.name;
      // ULTRA: mostra nível 1-50 como número + barra + tier dots
      const pct = Math.round(t.level / D.TOWER_MAX_LVL * 100);
      this.el('tp-level').innerHTML = '<span style="font-family:JetBrains Mono;font-size:10px;font-weight:800;color:var(--gold);margin-right:6px">NV '+t.level+'/'+D.TOWER_MAX_LVL+'</span><span style="font-size:9px;color:var(--muted)">'+pct+'%</span>' + tierBadge;
      this.el('tp-stats').innerHTML =
        '<div><span>DANO</span><b>' + Math.round(stats.dmg) + (def.kind === 'beam' ? '/s' : '') + '</b></div>' +
        '<div><span>ALCANCE</span><b>' + (Math.round(((stats.rngSqEff != null ? stats.rngSqEff : stats.rng / 44)) * 10) / 10) + '□</b></div>' +
        '<div><span>CADÊNCIA</span><b>' + (stats.rate ? stats.rate.toFixed(2) + '/s' : '\u2014') + '</b></div>' +
        '<div><span>DPS</span><b>' + Math.round(computeDps(t)) + '</b></div>';
      this.el('tp-target').textContent = '\u25C8 ' + t.targetMode;
      const specBox = this.el('tp-specs');
      // E11/FIX: a assinatura pertence ao DOM compartilhado (dataset), não à torre.
      // Guardar em t._specSig mentia ao alternar A→B→A: o memo de A continuava válido,
      // mas o innerHTML era o de B (listeners apontando para a torre errada).
      const specSig = (t.tid != null ? t.tid : '') + '|' + def.id + '|' + t.level + '|' + (t.specBranch || '');
      if (specBox.dataset.sig !== specSig) {
        specBox.dataset.sig = specSig;
        specBox.dataset.tid = String(t.tid != null ? t.tid : '');
        specBox.innerHTML = '';
        if (t.specBranch) {
          const sp = t.specBranch === 'A' ? def.specA : def.specB;
          specBox.innerHTML = '<div class="spec-chosen"><b>NV4\u25B8' + t.specBranch + ':</b> ' + sp.name + ' \u2014 ' + sp.desc + '</div>';
        } else if (t.level >= 4) {
          ['A', 'B'].forEach(br => {
            const sp = br === 'A' ? def.specA : def.specB;
            const btn = document.createElement('button');
            btn.className = 'btn small spec-btn';
            btn.innerHTML = '<b>\u25B8' + br + ' ' + sp.name + '</b><br><span>' + sp.desc + '</span>';
            btn.addEventListener('click', () => { setSpec(this.S, t, br); this.showTowerPanel(t); });
            specBox.appendChild(btn);
          });
        } else {
          specBox.innerHTML = '<div class="spec-chosen tt-muted">Especializações desbloqueiam no nível 4.</div>';
        }
      }
      const up = this.el('tp-upgrade');
      const mergeBuy = this.el('tp-merge-buy');
      mergeBuy.classList.add('hidden');
      const tier = D.getTier(t.level);
      const isFactory = def.kind === 'factory';
      const isF4Building = (def.kind === 'station' || def.kind === 'support'); // F4-comp: prédios sem upgrade/fusão
      if (isF4Building) {
        up.textContent = 'PRÉDIO • SEM UPGRADE';
        up.disabled = true;
        up.title = 'Estação/Apoio não sobem de nível';
      } else if (!isFactory && t.level >= tierCap(t)) {
        // v3 PIXEL FASE 2: botão vira FUNDIR no teto do tier
        const cands = mergeCandidates(this.S, t);
        const partsCost = D.MERGE_PARTS[tier] || 0;
        const ok = cands.length >= 2 && (this.S.parts || 0) >= partsCost;
        up.textContent = 'FUNDIR • ' + Math.min(3, cands.length + 1) + '/3 • ' + partsCost + '⚙';
        up.disabled = !ok;
        up.title = 'Consome esta torre + 2 iguais do mesmo tier → T' + (tier + 1) + ' nv ' + (tier * 10 + 1);
        const quote = mergePurchaseQuote(this.S, t);
        if (quote && quote.missing > 0) {
          const copies = quote.missing === 1 ? '1 NAVE' : quote.missing + ' NAVES';
          mergeBuy.innerHTML = 'COMPLETAR FUSÃO<small>COMPRAR ' + copies + ' • $' + quote.credits + ' + ' + quote.parts + '⚙</small>';
          mergeBuy.disabled = this.S.credits < quote.credits || (this.S.parts || 0) < quote.parts;
          mergeBuy.title = 'Compra as cópias que faltam pelo custo integral deste tier e funde agora';
          mergeBuy.classList.remove('hidden');
        }
      } else if (isFactory) {
        const pc = D.FACTORY_DATA.upgradePartsCost(t.level), cc = D.FACTORY_DATA.upgradeCreditCost(t.level);
        if (t.level >= D.FACTORY_DATA.maxLevel) { up.textContent = 'FÁBRICA NO MÁXIMO • NV5'; up.disabled = true; }
        else { up.textContent = 'MELHORAR • $' + cc + ' + ' + pc + '⚙'; up.disabled = this.S.credits < cc || (this.S.parts || 0) < pc; }
      } else if (t.level >= D.TOWER_MAX_LVL) { up.textContent = 'NÍVEL MÁXIMO • 50'; up.disabled = true; }
      else {
        const cost = upgradeCost(t);
        up.textContent = 'MELHORAR • $' + cost;
        up.disabled = this.S.credits < cost;
      }
      this.el('tp-sell').textContent = 'VENDER \u2022 $' + sellValue(t);
      // v3 PIXEL FASE 6: seção LÓGICA DE TIER (ativa + próximas) e carga do super
      (() => {
        const tier = D.getTier(t.level);
        const tl = D.TIER_LOGIC[def.id] || {};
        const box = document.createElement('div');
        box.style.cssText = 'margin-top:6px;padding:6px 8px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.16);font-size:11px;line-height:1.45';
        let html = '<div style="color:#38bdf8;font-weight:700;margin-bottom:3px">⬢ LÓGICA DE TIER</div>';
        [2, 3, 4, 5].forEach(tr => {
          if (!tl[tr]) return;
          const on = tr <= tier;
          html += '<div style="color:' + (on ? '#34d399' : '#8fa3c4') + '">' + (on ? '✔' : '○') + ' <b>T' + tr + '</b> — ' + tl[tr].name + ': ' + tl[tr].desc + '</div>';
        });
        const sa = D.SUPERS_AUTO[def.id];
        if (sa) {
          const sc = getSuperCharge(this.S, t);
          html += '<div style="color:#fde047;margin-top:3px">★ SUPER AUTO: ' + sa.name + ' (' + Math.round(sc.pct * 100) + '%)</div>';
        }
        box.innerHTML = html;
        const specBox2 = this.el('tp-specs');
        const old = specBox2.querySelector('.tierlogic-info');
        if (old) old.remove();
        box.className = 'tierlogic-info';
        specBox2.appendChild(box);
      })();
      this._syncF4Panel(t); // F4-comp U1: res-bars + stance + componentes
    }

    /* F4-comp U1: preenche #res-*/ /*fill/num, #tp-stance, #comp-*-pips/buy (onclick idempotente; sem addEventListener p/ não empilhar no refresh de 12 frames) */
    _syncF4Panel(t) {
      if (!t) return;
      const self = this;
      try {
        const gMF = (typeof getMaxFuel === 'function') ? getMaxFuel : null;
        const gMB = (typeof getMaxBatt === 'function') ? getMaxBatt : null;
        const gMA = (typeof getMaxAmmo === 'function') ? getMaxAmmo : null;
        const maxF = gMF ? gMF(t) : (t.maxFuel != null ? t.maxFuel : 100);
        const maxB = gMB ? gMB(t) : (t.maxBatt != null ? t.maxBatt : 100);
        const maxA = gMA ? gMA(t) : (t.maxAmmo != null ? t.maxAmmo : 40);
        const rows = [
          ['fuel', (t.fuel != null ? t.fuel : maxF), maxF],
          ['batt', (t.batt != null ? t.batt : maxB), maxB],
          ['ammo', (t.ammo != null ? t.ammo : maxA), maxA]
        ];
        for (const [k, cur, max] of rows) {
          const fill = document.getElementById('res-' + k + '-fill');
          const num = document.getElementById('res-' + k + '-num');
          if (max <= 0) {
            if (fill) fill.style.width = '0%';
            if (num) num.textContent = '—';
            continue;
          }
          const pct = Math.max(0, Math.min(100, Math.round(cur / max * 100)));
          if (fill) fill.style.width = pct + '%';
          if (num) num.textContent = Math.floor(cur) + '/' + Math.round(max) + ' • ' + pct + '%';
        }
      } catch (_) {}
      try {
        const stBtn = this.el('tp-stance');
        if (stBtn) {
          const pursuing = (t.stance === 'pursue');
          stBtn.textContent = pursuing ? '🎯 PERSEGUIR' : '⚓ ANCORADA';
          stBtn.onclick = () => {
            try {
              const fn = (typeof setStance === 'function') ? setStance : (window.DO && window.DO.setStance);
              if (fn) fn(self.S, t, pursuing ? 'anchor' : 'pursue');
              try { SND.ui(); } catch (_) {}
            } catch (_) {}
            try { self.showTowerPanel(t); } catch (_) {}
          };
        }
      } catch (_) {}
      try {
        const tracks = ['w', 'e', 'r', 't'];
        for (const tr of tracks) {
          const lvl = ((t.comp && t.comp[tr]) | 0) || 0;
          const pipsEl = document.querySelector('#comp-' + tr + ' .comp-pips');
          if (pipsEl) {
            let html = '';
            for (let i = 0; i < 5; i++) html += '<i class="' + (i < lvl ? 'on' : '') + '"></i>';
            pipsEl.innerHTML = html;
          }
          const buyEl = document.getElementById('comp-' + tr + '-buy');
          if (!buyEl) continue;
          if (lvl >= 5) {
            buyEl.textContent = 'MAX';
            buyEl.disabled = true;
            buyEl.onclick = null;
            continue;
          }
          const cdef = D.COMP_DEFS && D.COMP_DEFS[tr];
          const next = cdef && cdef.levels && cdef.levels[lvl];
          if (!next) {
            buyEl.textContent = 'MAX';
            buyEl.disabled = true;
            buyEl.onclick = null;
            continue;
          }
          let txt = '+$' + next.credits;
          if (next.parts) txt += ' +' + next.parts + '⚙';
          buyEl.textContent = txt;
          buyEl.disabled = (self.S.credits < next.credits) || ((self.S.parts || 0) < (next.parts || 0));
          buyEl.onclick = ((tr2) => () => {
            try {
              const bf = (typeof buyComp === 'function') ? buyComp : (window.DO && window.DO.buyComp);
              if (bf) bf(self.S, t, tr2);
            } catch (_) {}
            try { self.showTowerPanel(t); } catch (_) {}
          })(tr);
        }
      } catch (_) {}
    }

    /* F4-comp U1: espelho DOM do anel de suprimento (.supply-ring em #board-shell, % do board).
     * #board-shell tem o mesmo aspect do board e o canvas preenche inset 0 100%: % direto é exato. */
    _syncSupplyRing() {
      const shell = this.el('board-shell');
      if (!shell) return;
      let cx = null, cy = null, rad = null;
      if ((this.placingId === 'station' || this.placingId === 'support') && this.hoverCell) {
        const pd = this.placingId === 'station' ? D.STATION_DATA : D.SUPPORT_DATA;
        const hc = this.hoverCell;
        if (pd && hc.c >= 0 && hc.c < COLS && hc.r >= 0 && hc.r < ROWS) {
          cx = hc.c * CELL + CELL / 2; cy = hc.r * CELL + CELL / 2; rad = (pd.supplySq != null ? pd.supplySq * CELL : pd.supplyRadius);
        }
      } else if (this.selected && this.selected.defRef) {
        const sd = this.selected.defRef;
        if (sd.kind === 'station' || sd.kind === 'support' || sd.id === 'station' || sd.id === 'support') {
          rad = (sd.supplySq != null ? sd.supplySq * CELL
            : (sd.supplyRadius != null ? sd.supplyRadius
            : (sd.id === 'station' ? (D.STATION_DATA.supplySq != null ? D.STATION_DATA.supplySq * CELL : D.STATION_DATA.supplyRadius) : (D.SUPPORT_DATA.supplySq != null ? D.SUPPORT_DATA.supplySq * CELL : D.SUPPORT_DATA.supplyRadius))));
          cx = this.selected.x; cy = this.selected.y;
        }
      }
      const key = (cx == null) ? 'hide' : (Math.round(cx) + '|' + Math.round(cy) + '|' + Math.round(rad));
      if (this._supplyRingKey === key) return;
      this._supplyRingKey = key;
      let ring = shell.querySelector(':scope > .supply-ring');
      if (cx == null) { if (ring) ring.style.display = 'none'; return; }
      if (!ring) { ring = document.createElement('div'); ring.className = 'supply-ring'; shell.appendChild(ring); }
      ring.style.display = 'block';
      ring.style.left = ((cx - rad) / BW * 100) + '%';
      ring.style.top = ((cy - rad) / BH * 100) + '%';
      ring.style.width = (rad * 2 / BW * 100) + '%';
      ring.style.height = (rad * 2 / BH * 100) + '%';
    }

    hideTowerPanel() {
      const panel = this.el('tower-panel');
      if (panel) panel.classList.add('hidden');
      const boardShell = this.el('board-shell');
      if (boardShell) boardShell.classList.remove('tower-panel-open');
    }

    /* v3 PIXEL FASE 5: painel da fábrica (produção + próximo nível) */
    showFactoryPanel(t) {
      const el = this.el.bind(this);
      const fd = D.FACTORY_DATA;
      el('tp-icon').textContent = '⚙';
      el('tp-icon').style.color = fd.color;
      el('tp-name').textContent = fd.name;
      const pct = Math.round(t.level / fd.maxLevel * 100);
      el('tp-level').innerHTML = '<span style="font-family:JetBrains Mono;font-size:10px;font-weight:800;color:#34d399;margin-right:6px">FÁBRICA NV ' + t.level + '/' + fd.maxLevel + '</span><span style="font-size:9px;color:var(--muted)">' + pct + '%</span>';
      const p = fd.partsPerWave(t.level), cr = fd.creditsPerWave(t.level);
      const np = fd.partsPerWave(t.level + 1), ncr = fd.creditsPerWave(t.level + 1);
      el('tp-stats').innerHTML =
        '<div><span>PRODUZ/ONDA</span><b style="color:#34d399">+' + p + '⚙ +$' + cr + '</b></div>' +
        '<div><span>PRÓX. NÍVEL</span><b style="color:var(--muted)">+' + np + '⚙ +$' + ncr + '</b></div>' +
        '<div><span>VENDA</span><b>$' + sellValue(t) + '</b></div>' +
        '<div><span>MODO</span><b style="color:var(--muted)">industrial</b></div>';
      el('tp-target').textContent = '◇ SEM ALVO';
      const specBox = el('tp-specs');
      // FIX: painel da fábrica sobrescreve o DOM de #tp-specs; sem marcar a assinatura o
      // showTowerPanel de uma torre anterior pularia o rebuild e as specs não voltariam.
      specBox.dataset.sig = 'factory';
      specBox.dataset.tid = String(t.tid != null ? t.tid : '');
      specBox.innerHTML = '<div class="spec-chosen tt-muted">Prédio industrial: paga a conta com peças ⚙ para FUNDIR torres e ligar o laboratório Hivemind.</div>';
      el('tp-merge-buy').classList.add('hidden');
      const up = el('tp-upgrade');
      if (t.level >= fd.maxLevel) { up.textContent = 'FÁBRICA NO MÁXIMO • NV5'; up.disabled = true; }
      else {
        const cc = fd.upgradeCreditCost(t.level), pc2 = fd.upgradePartsCost(t.level);
        up.textContent = 'MELHORAR • $' + cc + ' + ' + pc2 + '⚙';
        up.disabled = this.S.credits < cc || (this.S.parts || 0) < pc2;
      }
      el('tp-sell').textContent = 'VENDER • $' + sellValue(t);
      this._syncF4Panel(t); // F4-comp U1: res-bars + stance + componentes também no painel da fábrica
    }

    bindTip(el, html) {
      const supportsRealHover = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (supportsRealHover) {
        el.addEventListener('mouseenter', () => showTip(html));
        el.addEventListener('mousemove', e => moveTip(e));
        el.addEventListener('mouseleave', () => { const _tip = document.getElementById('tooltip'); if (_tip && !_tip.classList.contains('pinned')) hideTip(); });
      }
      // V5-js: toque alterna .pinned (mobile fixa o tooltip); mouse fora do hover fecha se nao pinnado
      el.addEventListener('click', (e) => {
        let coarse = false;
        try { coarse = !!(window.matchMedia && window.matchMedia('(hover: none)').matches); } catch (err) {}
        if (e && e.pointerType === 'touch') coarse = true;
        if (!coarse) { const _t = document.getElementById('tooltip'); if (_t && !_t.classList.contains('pinned')) hideTip(); return; }
        const tip = document.getElementById('tooltip');
        if (tip && tip.classList.contains('pinned') && tip._pinFor === el) { tip._pinFor = null; hideTip(); return; }
        showTip(html, el);
        try { moveTip(e); } catch (err2) {}
      });
      el.addEventListener('pointerdown', (e) => {
        if (e && e.pointerType !== 'touch') { const _t2 = document.getElementById('tooltip'); if (_t2 && !_t2.classList.contains('pinned')) hideTip(); }
      });
    }

    // V7-js: alterna #tower-panel.compact (CSS pronto); nunca esconde #supers
    toggleTowerCompact() {
      const panel = this.el('tower-panel');
      if (!panel) return false;
      panel.classList.toggle('compact');
      const on = panel.classList.contains('compact');
      const btn = this.el('tp-compact');
      if (btn) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = '\u25A4'; btn.title = on ? 'Expandir painel' : 'Compactar painel'; }
      return on;
    }

    ensureTowerCompactBtn() {
      const panel = this.el('tower-panel');
      if (!panel) return;
      // U2.1: bindInput clona #tower-panel (dedupe) e o clone perde listeners —
      // se o botao ja existe (sessao anterior), troca por clone e religa 1x.
      let btn = this.el('tp-compact');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'tp-compact';
        btn.className = 'ctrl-btn chamf';
        btn.type = 'button';
        btn.style.cssText = 'position:absolute;top:5px;right:54px;z-index:2;min-width:44px;min-height:44px;padding:6px 8px;font-size:10px';
        const on = panel.classList.contains('compact');
        btn.textContent = '◤';
        btn.title = on ? 'Expandir painel' : 'Compactar painel';
        btn.setAttribute('aria-label', 'Alternar painel compacto');
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        panel.appendChild(btn);
      } else {
        const fresh = btn.cloneNode(true);
        btn.parentNode.replaceChild(fresh, btn);
        btn = fresh;
      }
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleTowerCompact(); });
    }

    // V12-js: alterna S.showDmgNum via #btn-dmgnum (default true)
    toggleDmgNum() {
      if (!this.S) return true;
      this.S.showDmgNum = this.S.showDmgNum === false ? true : false;
      if (this.S.showDmgNum === undefined) this.S.showDmgNum = true;
      const b = this.el('btn-dmgnum');
      if (b) {
        b.setAttribute('aria-pressed', this.S.showDmgNum ? 'true' : 'false');
        b.classList.toggle('active', !!this.S.showDmgNum);
        b.style.opacity = this.S.showDmgNum ? '1' : '0.45';
      }
      return this.S.showDmgNum;
    }

    /* ---------- TU-TUTO: coach marks da 1ª partida (overlay nunca bloqueia o jogo) ---------- */
    _tutSteps() {
      return [
        { text: 'Torres atiram sozinhas — compre uma na loja', sel: '#shopbar', alt: null },
        { text: 'Tiros gastam MUNIÇÃO e BATERIA', sel: '#tower-panel:not(.hidden) #res-bars', alt: '#shopbar' },
        { text: 'FÁBRICA acelera a recarga de tudo', sel: '#shopbar .shop-card[data-id="factory"]', alt: '#shopbar' },
        { text: 'ESTAÇÃO e APOIO são pit stops — posicione perto das torres', sel: '#shopbar .shop-card[data-id="station"]', alt: '#shopbar' },
        { text: 'Upgrades agora são COMPONENTES: Arma/Motor/Reator/Mira', sel: '#tower-panel:not(.hidden) #comp-rows', alt: null },
        { text: 'Aperte ▶ ONDA para começar (Espaço pausa)', sel: null, alt: null }
      ];
    }

    _tutBindButtons() {
      // botoes estaticos do overlay: cloneNode descarta listeners de creates anteriores (padrao U2.1)
      const _on2 = (id, fn) => {
        const old = document.getElementById(id);
        if (!old || !old.parentNode) return;
        const fresh = old.cloneNode(true);
        old.parentNode.replaceChild(fresh, old);
        fresh.addEventListener('click', fn);
      };
      _on2('tut-next', () => { try { SND.ui(); } catch (e) {} this._tutNext(); });
      _on2('tut-skip', () => { try { SND.ui(); } catch (e2) {} this._tutFinish(); });
      if (!window.__tutResizeBound) {
        window.__tutResizeBound = true;
        window.addEventListener('resize', () => {
          try {
            const sc = window.__game && window.__game.scene.getScene('Game');
            if (sc && sc._tutActive) sc._tutPlace();
          } catch (e3) {}
        });
      }
    }

    _tutVisibleEl(sel) {
      if (!sel) return null;
      let n = null;
      try { n = document.querySelector(sel); } catch (e) { return null; }
      if (!n) return null;
      try {
        const r = n.getBoundingClientRect();
        const cs = window.getComputedStyle(n);
        if (r.width < 2 || r.height < 2 || cs.display === 'none' || cs.visibility === 'hidden') return null;
      } catch (e2) { return null; }
      return n;
    }

    _tutWaveBtn() {
      // desktop #btn-nextwave x mobile #btn-nextwave-mobile: usa o visivel
      return this._tutVisibleEl('#btn-nextwave-mobile') || this._tutVisibleEl('#btn-nextwave');
    }

    _tutTarget(i) {
      const steps = this._tutSteps();
      const st = steps[i];
      if (!st) return null;
      if (i === 5) return this._tutWaveBtn();
      return this._tutVisibleEl(st.sel) || (st.alt ? this._tutVisibleEl(st.alt) : null);
    }

    _tutStart(force) {
      if (this._tutActive) return;
      if (!force && D.Save && D.Save.data && D.Save.data.tutorialSeen) return;
      this._tutActive = true;
      this._tutIdx = 0;
      const ov = document.getElementById('tut-overlay');
      if (ov) { ov.classList.remove('hidden'); ov.setAttribute('aria-hidden', 'false'); }
      this._tutShow();
    }

    _tutShow() {
      const steps = this._tutSteps();
      const i = this._tutIdx;
      const st = steps[i];
      if (!st) { this._tutFinish(); return; }
      const stepEl = document.getElementById('tut-step');
      const txtEl = document.getElementById('tut-text');
      const bub = document.getElementById('tut-bubble');
      if (stepEl) stepEl.textContent = 'PASSO ' + (i + 1) + '/' + steps.length;
      if (txtEl) txtEl.textContent = st.text;
      const nx = document.getElementById('tut-next');
      if (nx) nx.textContent = (i === steps.length - 1) ? 'COMEÇAR ▶' : 'PRÓXIMO ▸';
      if (bub) bub.classList.remove('hidden');
      this._tutPlace();
    }

    _tutPlace() {
      const ring = document.getElementById('tut-ring');
      const bub = document.getElementById('tut-bubble');
      if (!ring || !bub) return;
      const tgt = this._tutTarget(this._tutIdx);
      const M = 12, PAD = 6;
      if (tgt) {
        const r = tgt.getBoundingClientRect();
        ring.classList.remove('hidden');
        ring.style.left = Math.max(4, r.left - PAD) + 'px';
        ring.style.top = Math.max(4, r.top - PAD) + 'px';
        ring.style.width = (r.width + PAD * 2) + 'px';
        ring.style.height = (r.height + PAD * 2) + 'px';
        const bw = Math.min(320, window.innerWidth - M * 2);
        bub.style.maxWidth = bw + 'px';
        bub.style.left = '0px'; bub.style.top = '0px';
        const bh = bub.offsetHeight || 150;
        let top = r.bottom + 10;
        if (top + bh > window.innerHeight - M) top = r.top - bh - 10;
        if (top < M) top = Math.min(window.innerHeight - bh - M, r.bottom + 10);
        if (top < M) top = M;
        const left = Math.min(Math.max(M, r.left), window.innerWidth - bw - M);
        bub.style.left = left + 'px';
        bub.style.top = Math.max(M, top) + 'px';
      } else {
        // alvo oculto (ex.: #comp-rows com painel fechado): bolha centralizada, sem anel
        ring.classList.add('hidden');
        const bw = Math.min(320, window.innerWidth - M * 2);
        bub.style.maxWidth = bw + 'px';
        bub.style.left = '0px'; bub.style.top = '0px';
        const bh = bub.offsetHeight || 150;
        bub.style.left = Math.max(M, (window.innerWidth - bw) / 2) + 'px';
        bub.style.top = Math.max(M, (window.innerHeight - bh) / 2) + 'px';
      }
    }

    _tutNext() {
      if (!this._tutActive) return;
      this._tutIdx += 1;
      if (this._tutIdx >= this._tutSteps().length) this._tutFinish();
      else this._tutShow();
    }

    _tutFinish() {
      try {
        if (D.Save) {
          if (!D.Save.data) D.Save.load();
          D.Save.data.tutorialSeen = true;
          D.Save.save();
        }
      } catch (e) {}
      this._tutHide();
    }

    _tutHide() {
      this._tutActive = false;
      this._tutIdx = -1;
      const ov = document.getElementById('tut-overlay');
      if (ov) { ov.classList.add('hidden'); ov.setAttribute('aria-hidden', 'true'); }
      const ring = document.getElementById('tut-ring');
      if (ring) ring.classList.add('hidden');
      const bub = document.getElementById('tut-bubble');
      if (bub) bub.classList.add('hidden');
    }

    /* ---------- input ---------- */
    bindInput() {
      // U2.1 (dedupe Phaser): a instancia da cena e reutilizada entre sessoes;
      // limpa os binds da sessao anterior antes de religar (off sem listeners = no-op).
      this.input.off('pointermove');
      this.input.off('pointerdown');
      this.input.on('pointermove', p => {
        const wp = p.position ? { x: p.worldX, y: p.worldY } : { x: p.x, y: p.y };
        this.pointerWorld = wp;
        this.hoverCell.c = Math.floor(wp.x / CELL);
        this.hoverCell.r = Math.floor(wp.y / CELL);
      });
      this.input.on('pointerdown', p => {
        SND.unlock();
        if (this.paused) return;
        const wx = p.worldX != null ? p.worldX : p.x;
        const wy = p.worldY != null ? p.worldY : p.y;
        if (this.armed) {
          applySuper(this.S, this.armed, wx, wy);
          this.armed = null;
          return;
        }
        if (p.event && p.event.target !== this.game.canvas) return;
        const c = Math.floor(wx / CELL), r = Math.floor(wy / CELL);
        if (this.placingId) {
          const t = placeTower(this.S, c, r, this.placingId);
          // M1 (brief 09): pos-compra limpa selecao e esconde o painel (unico p/ desktop+mobile)
          if (t) { this.placingId = null; this.selected = null; this.refreshShopSel(); this.hideTowerPanel(); try { if (typeof hideTip === 'function') hideTip(); } catch (_e2) {} try { if (this._tutActive && this._tutIdx === 0) this._tutNext(); } catch (_eT) {} }
          return;
        }
        const key = c + ',' + r;
        if (this.S.occupied[key]) {
          this.selected = this.S.occupied[key];
          this.showTowerPanel(this.selected);
          SND.ui();
        } else {
          this.selected = null;
          this.hideTowerPanel();
        }
      });

      const kb = this.input.keyboard;
      // U2.1 (dedupe teclado): exatamente 1 handler por tecla mesmo apos N creates.
      ['keydown-Q', 'keydown-W', 'keydown-E', 'keydown-R', 'keydown-P', 'keydown-ESC', 'keydown-SPACE', 'keydown-F'].forEach(ev => { try { kb.off(ev); } catch (e) {} });
      kb.on('keydown-Q', () => this.triggerSuper('ion'));
      kb.on('keydown-W', () => this.triggerSuper('emp'));
      kb.on('keydown-E', () => this.triggerSuper('vortex'));
      kb.on('keydown-R', () => this.triggerSuper('overdrive'));
      kb.on('keydown-P', () => this.togglePause());
      kb.on('keydown-ESC', () => { if (this.placingId) { this.placingId = null; this.refreshShopSel(); } else this.togglePause(); });
      // ESPAÇO = exclusivamente play/pause (próxima onda só pelo botão ▶ ONDA)
      // Onda 3: preventDefault evita ativação do botão focado (pause duplo) e repeat não alterna em rajada
      kb.on('keydown-SPACE', (e) => {
        if (e && e.repeat) return;
        if (e && e.preventDefault) e.preventDefault();
        this.togglePause();
      });
      kb.on('keydown-F', () => this.cycleSpeed());
      // M handled globally

      // U2.1 (dedupe DOM): botoes do HUD sao estaticos no index.html — _freshBtn
      // troca cada um por cloneNode(true) antes de religar: id/classes/atributos
      // preservados, listeners da sessao anterior descartados (1 clique = 1 disparo).
      // (Shop/supers sao recriados via innerHTML a cada create: sem dupe. Teclado/
      // Phaser dedupados no topo deste metodo.)
      const _on = (id, ev, fn) => { const b = this._freshBtn(id); if (b) b.addEventListener(ev, fn); return b; };
      _on('btn-speed', 'click', () => this.cycleSpeed());
      _on('btn-auto', 'click', () => {
        this.S.autoNext = !this.S.autoNext;
        D.Save.data.autoNext = this.S.autoNext; D.Save.save();
        SND.ui();
      });
      // G10: toggle do auto-movimento (botão próprio; #btn-auto segue sendo auto-ondas)
      const _amBtn = this._freshBtn('btn-automove');
      if (_amBtn) _amBtn.addEventListener('click', () => { toggleAutoMove(this.S); SND.ui(); });
      _on('btn-pause', 'click', () => this.togglePause());
      // próxima onda pelo botão (desktop #btn-nextwave + mobile #btn-nextwave-mobile)
      const nextWaveGo = () => {
        if (this.S.state === 'idle') {
          SND.ui(); startNextWave(this.S);
          try { if (this._tutActive && this._tutIdx === 5) this._tutFinish(); } catch (_eT2) {}
        } else { SND.error(); }
      };
      ['btn-nextwave', 'btn-nextwave-mobile'].forEach(id => {
        _on(id, 'click', nextWaveGo);
      });
      // mute handled globally (HTML) to avoid double toggle
      _on('btn-home', 'click', () => { SND.uiBack(); this.goMenu(); });
      // TU-TUTO: "?" reabre o guia a qualquer hora (dedupe via _freshBtn como os demais)
      _on('btn-help', 'click', () => { SND.ui(); this._tutStart(true); });
      // V12-js: toggle numeros de dano (default ON; OFF esconde floats de dano, mantem gold/avisos)
      {
        const dmgBtn = this._freshBtn('btn-dmgnum');
        if (dmgBtn) dmgBtn.addEventListener('click', () => { this.toggleDmgNum(); SND.ui(); });
      }
      // v3 PIXEL FASE 5: botão laboratório Hivemind no topbar
      {
        const hiveBtn = this._freshBtn('btn-hivemind');
        if (hiveBtn) hiveBtn.addEventListener('click', () => { upgradeEnemyHP(this.S); });
      }
      _on('btn-resume', 'click', () => this.togglePause());
      _on('btn-quit', 'click', () => { this.paused = false; this.goMenu(); });
      // U2.1: clona o painel ANTES dos filhos — o clone ja descarta os listeners
      // antigos dos filhos junto; os binds abaixo religam exatamente 1x cada.
      // (Ordem importa: clonar depois apagaria os binds recem-feitos.)
      const _tp = this._freshBtn('tower-panel');
      // FIX: cloneNode copia atributos (data-sig/data-tid); sem limpar, o 1º
      // showTowerPanel da nova sessão poderia pular o rebuild e deixar os
      // botões de spec clonados (sem listeners).
      try {
        const _specFresh = document.getElementById('tp-specs');
        if (_specFresh) { delete _specFresh.dataset.sig; delete _specFresh.dataset.tid; }
      } catch (eSpecR) {}
      _on('tp-upgrade', 'click', () => {
        if (!this.selected) return;
        const t = this.selected;
        if (t.defRef.kind === 'factory') { upgradeFactory(this.S, t); }
        else if (t.level >= tierCap(t)) { mergeTowers(this.S, t); } // v3 PIXEL FASE 2
        else { upgradeTower(this.S, t); }
        this.showTowerPanel(this.selected);
      });
      _on('tp-merge-buy', 'click', () => {
        if (!this.selected) return;
        mergeWithPurchase(this.S, this.selected);
        this.showTowerPanel(this.selected);
      });
      _on('tp-sell', 'click', () => { if (this.selected) { sellTower(this.S, this.selected); this.selected = null; this.hideTowerPanel(); } });
      _on('tp-target', 'click', () => { if (this.selected) { cycleTargetMode(this.selected); this.showTowerPanel(this.selected); } });
      _on('tp-close', 'click', () => { this.selected = null; this.hideTowerPanel(); });
      // Onda 3 (BUG 2): tocar/rolar DENTRO do painel não fecha mais (inclusive summary/scroll).
      // O fechamento por toque fora continua no tap-to-dismiss global abaixo (ignora #tower-panel).
      // M2 (brief 09): tap-to-dismiss — toque fora do painel/board fecha o painel.
      // Ignora toques no canvas (Phaser ja trata: cela vazia fecha, torre abre),
      // dentro do painel e em modais.
      // U2.1: guarda global (document e unico por pagina; flag de instancia nao
      // basta se o Phaser algum dia recriar a cena — com 2 creates, 1 listener).
      if (!window.__tdTapDismissBound) {
        window.__tdTapDismissBound = true;
        document.addEventListener('pointerdown', (e) => {
          const t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('#tower-panel') || t.closest('#game-canvas') || t.closest('canvas') || t.closest('.modal')) return;
          const sc = window.__game && window.__game.scene.getScene('Game');
          if (sc && sc.selected) { sc.selected = null; if (sc.hideTowerPanel) sc.hideTowerPanel(); }
        }, { passive: true });
      }
      this._tapDismissBound = true;
      // Onda 3: tooltip pinado (toque) fecha ao tocar FORA do card que o fixou;
      // nunca intercepta cliques de modal (modais ficam acima do tooltip: z-index 50 > 49).
      if (!window.__tdTipDismissBound) {
        window.__tdTipDismissBound = true;
        document.addEventListener('pointerdown', (e) => {
          const t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('.modal') || t.closest('#tooltip')) return;
          const tip = document.getElementById('tooltip');
          if (!tip || tip.classList.contains('hidden')) return;
          const pin = tip._pinFor;
          if (pin && (t === pin || (pin.contains && pin.contains(t)))) return;
          hideTip();
        }, { passive: true });
      }
      // Onda 3: qualquer modal aberto (ex.: mutação via scenes.js) esconde o tooltip pinado
      if (!window.__tdTipModalWatch) {
        window.__tdTipModalWatch = true;
        try {
          const _tipModals = ['modal-mut', 'modal-lab', 'modal-codex', 'modal-ach', 'pause-overlay', 'modal-end'];
          const _tipModalCheck = () => {
            for (const _id of _tipModals) {
              const _m = document.getElementById(_id);
              if (_m && !_m.classList.contains('hidden')) { hideTip(); return; }
            }
          };
          _tipModals.forEach(_id => {
            const _m = document.getElementById(_id);
            if (_m && typeof MutationObserver !== 'undefined') new MutationObserver(_tipModalCheck).observe(_m, { attributes: true, attributeFilter: ['class'] });
          });
        } catch (eTipM) {}
      }
      ['modal-end'].forEach(id => {
        const b = this._freshBtn('btn-retry');
        if (b) b.addEventListener('click', () => { SND.ui(); this.restartSame(); });
        const n = this._freshBtn('btn-next');
        if (n) n.addEventListener('click', () => { SND.ui(); this.goNext(); });
        const m = this._freshBtn('btn-menu');
        if (m) m.addEventListener('click', () => { SND.uiBack(); this.goMenu(); });
      });
    }


    cycleSpeed() {
      this.speedIdx = (this.speedIdx + 1) % this.speeds.length;
      SND.ui();
    }

    togglePause() {
      if (this.S.state === 'victory' || this.S.state === 'defeat') return;
      this.paused = !this.paused;
      const ov = this.el('pause-overlay');
      if (ov) ov.classList.toggle('hidden', !this.paused);
      // Onda 5: laser contínuo silencia na pausa; tweens (FX ambientais + combate) congelam juntos
      if (this.paused) {
        try { SND.laserStopAll(); } catch (eP1) {}
        try { this.tweens.pauseAll(); } catch (eP2) {}
      } else {
        try { this.tweens.resumeAll(); } catch (eP3) {}
      }
      SND.musicTick(this.paused ? 'paused' : 'combat', this.S.wave, !!this.S.activeBoss);
      SND.uiBack();
    }

    goMenu() {
      this.hideEndModal();
      this.cameras.main.fadeOut(240);
      this.time.delayedCall(260, () => {
        this.scene.stop('Game');
        this.scene.start('Menu');
      });
    }

    restartSame() {
      this.hideEndModal();
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(220, () => this.scene.restart(this.params));
    }

    goNext() {
      if (!this.S.result || this.S.result.outcome !== 'victory') return;
      const next = this.S.mapIdx + 1;
      if (next >= D.MAPS_DATA.length) { this.goMenu(); return; }
      this.hideEndModal();
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(220, () => this.scene.restart({ mapIdx: next, diffKey: 'normal', endless: false }));
    }

    continueEndless() {
      if (!continueEndlessAfterVictory(this.S)) { SND.error(); return; }
      this.params.endless = true;
      this.paused = false;
      this.hideEndModal();
      SND.ui();
      SND.musicTick('combat', this.S.wave, false);
      this.time.delayedCall(450, () => {
        if (this.S.state === 'idle') startNextWave(this.S);
      });
    }

    hideEndModal() { hideOverlay('modal-end'); }

    /* ---------- loop ---------- */
    update(_, dms) {
      const dt = Math.min(0.05, dms / 1000);
      const ended = this.S.state === 'victory' || this.S.state === 'defeat';
      const steps = this.speeds[this.speedIdx] || 1;
      if (!this.paused && !ended) {
        for (let i = 0; i < steps; i++) {
          if (this.S.state === 'victory' || this.S.state === 'defeat') break;
          stepSim(this.S, dt);
        }
        SND.musicTick('combat', this.S.wave, !!this.S.activeBoss);
      }
      this.dashOffset += dms * 0.06;
      this.consumeEvents();
      const effDt = dt * steps * (this.paused || ended ? 0 : 1);
      this._effDt = effDt;
      this.updateParticles(effDt);
      this.drawDynamic(effDt);
      this.syncEnemies();
      this.syncTowers();
      this.syncProjectiles();
      this.syncHud();
      this.syncBossBar();
      if (this.selected && !this.S.towers.includes(this.selected)) { this.selected = null; this.hideTowerPanel(); }
      this.pollFloats(effDt);
      // Onda 3: auto-avanço do tutorial ao construir a 1ª torre. O override de bindInput em
      // scenes.js descarta o hook original do pointerdown; o contador abaixo dispara o _tutNext
      // independentemente de qual handler colocou a torre (clique real ou API de teste).
      try {
        const tc = this.S.towers.length;
        if (this._tutTowerCount === undefined) this._tutTowerCount = tc;
        else if (tc > this._tutTowerCount) {
          this._tutTowerCount = tc;
          if (this._tutActive && this._tutIdx === 0) this._tutNext();
        } else if (tc < this._tutTowerCount) {
          this._tutTowerCount = tc;
        }
      } catch (eTT) {}
    }

    /* v3 PIXEL FASES 2-6: helpers de teste headless */
    get testPanelOpen() { const p = this.el('tower-panel'); return !!p && !p.classList.contains('hidden'); }

    consumeEvents() {
      for (const e of this.S.events) this.handleEvent(e);
      this.S.events.length = 0;
    }

    handleEvent(e) {
      switch (e.t) {
        case 'boom': this.boomFx(e.x, e.y, e.r, this.warmBoomCol(), e.big); break;
        case 'ring': {
          const ringArr2 = this.pools['ring'];
          if (ringArr2) { let a=0; for(const im of ringArr2) if(im.active) a++; if(a>10) break; }
          const ring = this.getImg('ring');
          ring.setTexture('ring').setTint(Phaser.Display.Color.HexStringToColor(e.col).color)
            .setPosition(e.x, e.y).setScale(0.25).setAlpha(0.8);
          ring.setData('life', 0.28); ring.setData('tot', 0.28);
          ring.setData('vx', 0); ring.setData('vy', 0); ring.setData('grow', e.maxR / 17);
          if (!ring._inLayer) { this.fxOver.add(ring); ring._inLayer = true; }
          break;
        }
        case 'tracer':
          this.tracers.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, col: e.col, w: e.w, life: 0.14, tot: 0.14 });
          break;
        case 'chain':
          this.zaps.push({ pts: e.pts, life: 0.16, tot: 0.16 });
          break;
        case 'float': if (e.dmg && this.S && this.S.showDmgNum === false) break; this.floatTxt(e.x, e.y, e.txt, e.col, e.size); break;
        case 'banner': this.showBanner(e.txt, e.col, e.strong); break;
        case 'shake': this.cameras.main.shake(Math.min(400, 60 + e.mag * 12), Math.min(0.02, e.mag / 900)); break;
        case 'leak': {
          const edge = this.el('edge-flash');
          if (edge) { edge.classList.remove('on'); void edge.offsetWidth; edge.classList.add('on'); }
          // V10: shake direcional do lado do vazamento (dx=-1: borda direita -> empurra p/ esquerda)
          const dx = (e.dx != null ? e.dx : -1);
          this.cameras.main.shake(200, 0.009);
          try {
            const cam = this.cameras.main;
            cam.scrollX += dx * 7;
            this.tweens.add({ targets: cam, scrollX: 0, duration: 200, ease: 'Cubic.easeOut' });
          } catch (err) {}
          this.spark(this.portalPos.x, e.y, '#f43f5e', 10, 160, 0.5);
          break;
        }
        case 'bossSpawn': {
          this.showBanner('\u26A0 ' + e.name.toUpperCase() + ' DETECTADO!', '#f43f5e', true);
          const cam = this.cameras.main;
          cam.setZoom(1.09);
          this.tweens.add({ targets: cam, zoom: 1, duration: 420, ease: 'Cubic.easeOut' });
          break;
        }
        case 'bossDeath': {
          const flash = this.add.rectangle(BW / 2, BH / 2, BW, BH, 0xffffff, 0.5).setDepth(80);
          this.tweens.add({ targets: flash, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
          this.boomFx(e.x, e.y, 60, '#fbbf24', true);
          break;
        }
        case 'ionBeam': {
          this.ionFx = { x: e.x, y: e.y, r: e.r, life: e.life, tot: e.life };
          this.boomFx(e.x, e.y, e.r, '#38bdf8', true);
          break;
        }
        case 'emp': {
          const rect = this.add.rectangle(BW / 2, BH / 2, BW, BH, 0x38bdf8, 0.28).setDepth(79);
          this.tweens.add({ targets: rect, alpha: 0, duration: 380, onComplete: () => rect.destroy() });
          const ring = this.getImg('ring');
          ring.setTexture('ring').setTint(0x38bdf8).setPosition(BW / 2, BH / 2).setScale(2).setAlpha(1);
          ring.setData('life', 0.6); ring.setData('tot', 0.6);
          ring.setData('vx', 0); ring.setData('vy', 0); ring.setData('grow', BW / 15);
          if (!ring._inLayer) { this.fxOver.add(ring); ring._inLayer = true; }
          break;
        }
        case 'vortexStart': break;
        case 'overdrive': {
          const rect = this.add.rectangle(BW / 2, BH / 2, BW, BH, 0xfb923c, 0.16).setDepth(78);
          this.tweens.add({ targets: rect, alpha: 0, duration: 500, onComplete: () => rect.destroy() });
          break;
        }
        case 'buildFx': this.spark(e.x, e.y, e.col, 10, 120, 0.4); break;
        case 'autoSuperFx': { // v3 PIXEL FASE 4: FX dramático do super automático (decai mesmo pausado)
          const ringArrA = this.pools['ring'];
          if (ringArrA) { let a=0; for(const im of ringArrA) if(im.active) a++; if(a>10) break; }
          const ring = this.getImg('ring');
          ring.setTexture('ring').setTint(Phaser.Display.Color.HexStringToColor(e.col).color)
            .setPosition(e.x, e.y).setScale(0.3).setAlpha(0.95);
          ring.setData('life', 0.45); ring.setData('tot', 0.45);
          ring.setData('vx', 0); ring.setData('vy', 0); ring.setData('grow', 9);
          if (!ring._inLayer) { this.fxOver.add(ring); ring._inLayer = true; }
          this.spark(e.x, e.y, e.col, 10, 180, 0.38);
          break;
        }
        case 'lvlFx': {
          this.spark(e.x, e.y, '#fbbf24', 12, 140, 0.5);
          this.floatTxt(e.x, e.y - 20, 'N\u00CDVEL UP!', '#fbbf24', 13);
          break;
        }
        case 'sellFx': this.floatTxt(e.x, e.y - 14, '+$' + e.val, '#fbbf24', 12); break;
        case 'spawnFx': {
          const x0 = e.flying ? this.S.airPts[0].x : this.S.routes[e.flying === false ? 0 : 0][0].x;
          const y0 = e.y || this.S.routes[0][0].y;
          this.spark(Math.max(14, x0), y0, '#38bdf8', 6, 110, 0.45);
          break;
        }
        case 'muzzle': {
          const m = this.getImg('soft');
          m.setTexture('soft').setTint(0xffffff).setPosition(e.x + Math.cos(e.angle) * 18, e.y + Math.sin(e.angle) * 18).setScale(0.7).setAlpha(0.85);
          m.setData('life', 0.06); m.setData('tot', 0.06);
          m.setData('vx', 0); m.setData('vy', 0);
          if (!m._inLayer) { this.fxOver.add(m); m._inLayer = true; }
          break;
        }
        case 'impact': this.spark(e.x, e.y, e.col, 3, 70, 0.25); break;
        case 'smoke': {
          // cap smoke também — mesma pool 'dot' que spark, evita flood em x4
          const arrDot = this.pools['dot'];
          if (arrDot) {
            let a = 0; for (const img of arrDot) if (img.active) a++;
            if (a > 45) break; // skip smoke se já poluído
            if (a > 30 && Math.random() < 0.6) break; // 60% skip quando médio
          }
          const s = this.getImg('dot');
          s.setTexture('dot').setTint(0x94a3b8).setPosition(e.x, e.y).setScale(0.45).setAlpha(0.45);
          s.setData('life', 0.32); s.setData('tot', 0.32);
          s.setData('vx', (Math.random() - 0.5) * 18); s.setData('vy', -14);
          if (!s._inLayer) { this.fxOver.add(s); s._inLayer = true; }
          break;
        }
        case 'spark': this.spark(e.x, e.y, e.col, 2, 90, 0.22); break;
        case 'healFx': this.floatTxt(e.x, e.y - 8, '+', '#34d399', 11); break;
        case 'rage': break;
        case 'gameEnd': this.time.delayedCall(600, () => this.showEndModal()); break;
      }
    }

    updateParticles(dt) {
      if (dt <= 0) return;
      // E5: total vem do contador (antes: varredura O(pool) todo frame)
      const totalActive = this._poolTotal || 0;
      const over = totalActive > 60 ? Math.min(2.5, (totalActive - 60) / 30) : 0; // 60→0, 90→1, 120→2
      const dtEff = dt * (1 + over * 1.6); // acelera sumiço quando poluído
      for (const key in this.pools) {
        for (const img of this.pools[key]) {
          if (!img.active) continue;
          let life = img.getData('life');
          if (life == null) continue;
          life -= dtEff;
          img.setData('life', life);
          if (life <= 0) { this._freeImg(key, img); img.setAlpha(1).setScale(1); continue; }
          const vx = img.getData('vx') || 0, vy = img.getData('vy') || 0;
          img.x += vx * dt; img.y += vy * dt;
          const tot = img.getData('tot') || 1;
          img.setAlpha(Math.min(1, life / tot * 1.6 * (1 - over*0.15)));
          const grow = img.getData('grow');
          if (grow != null) {
            const base = img.getData('baseScale') || (img.setData('baseScale', img.scaleX), img.scaleX);
            img.setScale(base + grow * (1 - life / tot));
            img.setAlpha((life / tot) * (1 - over*0.2));
          } else if (!img.getData('vx')) {
            img.setScale(img.scaleX * (1 - dt * 1.2));
          }
          // hard cap: se total >110, força expiração dos mais antigos
          if (totalActive > 110 && life < tot*0.35) {
            this._freeImg(key, img);
          }
        }
      }
    }

    pollFloats(dt) {
      for (let i = this.activeFloats.length - 1; i >= 0; i--) {
        const f = this.activeFloats[i];
        f.life -= dt;
        f.txt.y -= 30 * dt;
        f.txt.alpha = Math.max(0, f.life / 0.9);
        if (f.life <= 0) {
          f.txt.setVisible(false);
          this.activeFloats.splice(i, 1);
          this.floatPool.push(f.txt);
        }
      }
    }

    drawDynamic(dt) {
      const effDt = (dt != null ? dt : 0.016);
      const g = this.beamGfx;
      g.clear();
      // lasers contínuos
      for (const t of this.S.towers) {
        const def = t.defRef;
        if (def.kind !== 'beam' || !t.beamTarget || t.beamTarget.dead) continue;
        const col = Phaser.Display.Color.HexStringToColor(def.color).color;
        g.lineStyle(5, col, 0.45);
        g.lineBetween(t.x, t.y, t.beamTarget.x, t.beamTarget.y);
        g.lineStyle(1.8, 0xffffff, 0.95);
        g.lineBetween(t.x, t.y, t.beamTarget.x, t.beamTarget.y);
        g.fillStyle(col, 0.8);
        g.fillCircle(t.beamTarget.x, t.beamTarget.y, 3 + Math.random() * 2);
      }
      // zaps tesla
      for (let i = this.zaps.length - 1; i >= 0; i--) {
        const z = this.zaps[i];
        z.life -= effDt;
        if (z.life <= 0) { this.zaps.splice(i, 1); continue; }
        const a = z.life / z.tot;
        g.lineStyle(4 * a, 0x34d399, 0.5 * a);
        this.jagged(g, z.pts);
        g.lineStyle(1.5, 0xffffff, 0.9 * a);
        this.jagged(g, z.pts);
      }
      // tracers sniper/rail
      for (let i = this.tracers.length - 1; i >= 0; i--) {
        const tr = this.tracers[i];
        tr.life -= effDt;
        if (tr.life <= 0) { this.tracers.splice(i, 1); continue; }
        const col = Phaser.Display.Color.HexStringToColor(tr.col).color;
        const a = tr.life / tr.tot;
        g.lineStyle(tr.w * a, col, 0.9 * a);
        g.lineBetween(tr.x1, tr.y1, tr.x2, tr.y2);
      }
      // feixe de íons
      if (this.ionFx) {
        this.ionFx.life -= effDt;
        if (this.ionFx.life <= 0) this.ionFx = null;
        else {
          const f = this.ionFx.life / this.ionFx.tot;
          g.fillStyle(0x38bdf8, 0.35 * f);
          g.fillRect(this.ionFx.x - 16 * f, 0, 32 * f, this.ionFx.y);
          g.fillStyle(0xffffff, 0.75 * f);
          g.fillRect(this.ionFx.x - 5 * f, 0, 10 * f, this.ionFx.y);
        }
      }
      // vórtices
      const vg = this.vortexGfx;
      vg.clear();
      for (const v of this.S.vortices) {
        const rot = this.S.time * 2;
        vg.lineStyle(2, 0x22d3ee, 0.55);
        for (let k = 0; k < 3; k++) {
          vg.beginPath();
          vg.arc(v.x, v.y, v.r * (0.4 + k * 0.28), rot + k * 2.1, rot + k * 2.1 + 2.4);
          vg.strokePath();
        }
        vg.fillStyle(0x22d3ee, 0.08);
        vg.fillCircle(v.x, v.y, v.r * (v.life / v.tot));
      }
      // linhas tracejadas das rotas
      const dg = this.dashGfx;
      dg.clear();
      dg.lineStyle(2, 0x38bdf8, 0.20);
      dg.translateCanvas(0, 0);
      this.S.routes.forEach(pts => {
        dg.beginPath();
        let carry = this.dashOffset % 26;
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
          const len = Math.hypot(dx, dy);
          const ux = dx / len, uy = dy / len;
          let d = -carry;
          while (d < len) {
            const s = Math.max(0, d), e2 = Math.min(len, d + 13);
            if (e2 > s) dg.lineBetween(pts[i - 1].x + ux * s, pts[i - 1].y + uy * s, pts[i - 1].x + ux * e2, pts[i - 1].y + uy * e2);
            d += 26;
          }
          carry = len - (Math.floor((len + carry) / 26)) * 26 + carry;
          carry = ((carry % 26) + 26) % 26;
        }
        dg.strokePath();
      });

      // círculos de alcance / fantasma de posicionamento
      const ui = this.uiGfx;
      ui.clear();
      if (this.selected) {
        const st = getTowerStats(this.S, this.selected);
        // RANGESQ: raio = rngSqEff×CELL (st.rng já é squares×CELL)
        ui.lineStyle(1.6, 0x38bdf8, 0.65);
        ui.strokeCircle(this.selected.x, this.selected.y, st.rng);
        ui.fillStyle(0x38bdf8, 0.05);
        ui.fillCircle(this.selected.x, this.selected.y, st.rng);
        ui.lineStyle(1.4, 0xfbbf24, 0.9);
        ui.strokeRect(this.selected.c * CELL + 2, this.selected.r * CELL + 2, CELL - 4, CELL - 4);
        // F4-comp U1: anel de suprimento âmbar ao selecionar station/support
        // RANGESQ: anel = supplySq×CELL
        try {
          const _sd = this.selected.defRef || {};
          const _sr = (_sd.supplySq != null ? _sd.supplySq * CELL
            : (_sd.supplyRadius != null ? _sd.supplyRadius
            : (_sd.id === 'station' && D.STATION_DATA ? (D.STATION_DATA.supplySq != null ? D.STATION_DATA.supplySq * CELL : D.STATION_DATA.supplyRadius)
            : (_sd.id === 'support' && D.SUPPORT_DATA ? (D.SUPPORT_DATA.supplySq != null ? D.SUPPORT_DATA.supplySq * CELL : D.SUPPORT_DATA.supplyRadius) : 0))));
          if (_sr > 0) {
            ui.lineStyle(1.4, 0xf5a83d, 0.7);
            ui.strokeCircle(this.selected.x, this.selected.y, _sr);
            ui.fillStyle(0xf5a83d, 0.04);
            ui.fillCircle(this.selected.x, this.selected.y, _sr);
          }
        } catch (_) {}
      }
      if (this.placingId) {
        const def = D.TOWERS_DATA.find(d => d.id === this.placingId) || (this.placingId === 'factory' ? Object.assign({ rng: 70 }, D.FACTORY_DATA) : null) || (this.placingId === 'station' && D.STATION_DATA ? Object.assign({}, D.STATION_DATA) : null) || (this.placingId === 'support' && D.SUPPORT_DATA ? Object.assign({}, D.SUPPORT_DATA) : null); // v3 PIXEL FASE 5 + F4-comp U1
        if (!def) { this.placingId = null; return; }
        const c = this.hoverCell.c, r = this.hoverCell.r;
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
          const okCell = !this.S.blocked[c + ',' + r] && !this.S.occupied[c + ',' + r] && this.S.credits >= def.cost;
          const colr = okCell ? 0x34d399 : 0xf43f5e;
          ui.lineStyle(1.6, colr, 0.95);
          ui.strokeRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
          // RANGESQ: fantasma usa rngSq×CELL e supplySq×CELL
          var _ghostRng = (def.rngSq != null ? def.rngSq * CELL : def.rng);
          if (_ghostRng) {
            ui.lineStyle(1.4, colr, 0.55);
            ui.strokeCircle(cx, cy, _ghostRng);
          }
          // F4-comp U1: fantasma de station/support mostra o anel de suprimento
          var _ghostSup = (def.supplySq != null ? def.supplySq * CELL : def.supplyRadius);
          if (_ghostSup) {
            ui.lineStyle(1.4, 0xf5a83d, 0.7);
            ui.strokeCircle(cx, cy, _ghostSup);
            ui.fillStyle(0xf5a83d, 0.04);
            ui.fillCircle(cx, cy, _ghostSup);
          }
          if (!okCell) { ui.fillStyle(0xf43f5e, 0.08); ui.fillCircle(cx, cy, CELL / 2); }
        }
      }
      try { this._syncSupplyRing(); } catch (_) {} // F4-comp U1: espelho DOM .supply-ring
      if (this.armed) {
        const meta = D.SUPERS[this.armed];
        ui.lineStyle(1.8, Phaser.Display.Color.HexStringToColor(meta.color).color, 0.8);
        ui.strokeCircle(this.pointerWorld.x, this.pointerWorld.y, meta.radius);
        ui.fillStyle(Phaser.Display.Color.HexStringToColor(meta.color).color, 0.06);
        ui.fillCircle(this.pointerWorld.x, this.pointerWorld.y, meta.radius);
      }
      // v3 PIXEL FASE 4: anel fino de progresso do super automático ao redor de cada torre
      for (const t of this.S.towers) {
        if (t.defRef.kind === 'factory') continue;
        const sc = getSuperCharge(this.S, t);
        if (sc.pct <= 0 || sc.pct >= 1) continue;
        const col = Phaser.Display.Color.HexStringToColor((D.SUPERS_AUTO[t.defRef.id] || {}).col || '#fbbf24').color;
        ui.lineStyle(2, col, 0.55);
        ui.beginPath();
        ui.arc(t.x, t.y, CELL * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sc.pct);
        ui.strokePath();
      }
    }

    jagged(g, pts) {
      g.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        g.moveTo(a.x, a.y);
        const segs = 4;
        for (let s = 1; s < segs; s++) {
          const tt = s / segs;
          const jx = (Math.random() - 0.5) * 10, jy = (Math.random() - 0.5) * 10;
          g.lineTo(a.x + (b.x - a.x) * tt + jx, a.y + (b.y - a.y) * tt + jy);
        }
        g.lineTo(b.x, b.y);
      }
      g.strokePath();
    }

    /* ---------- sincronização de sprites ---------- */
    syncEnemies() {
      const seen = {};
      for (const e of this.S.enemies) {
        if (e.dead) continue;
        seen[e.eid] = true;
        let v = this.enemyViews[e.eid];
        if (!v) {
          const root = this.add.container(e.x, e.y).setDepth(10);
          const body = this.add.image(0, 0, 'en_' + e.type);
          const hpBg = this.add.image(0, e.r + 6, 'px').setTint(0x000000).setAlpha(0.6).setDisplaySize(e.r * 2.4, 4);
          const hpFg = this.add.image(0, e.r + 6, 'px').setDisplaySize(e.r * 2.4, 4);
          const shFg = this.add.image(0, e.r + 2, 'px').setTint(0x60a5fa).setDisplaySize(e.r * 2.4, 2.4);
          const aura = this.add.image(0, 0, 'soft').setTint(0xf43f5e).setScale(e.r / 6).setVisible(false).setAlpha(0.5);
          root.add([aura, body, hpBg, hpFg, shFg]);
          v = { root, body, hpBg, hpFg, shFg, aura, lastLevelHp: -1 };
          this.enemyViews[e.eid] = v;
        }
        v.root.setPosition(e.x, e.y - (e.flying ? 6 + Math.sin(this.S.time * 5 + e.eid) * 3 : 0));
        v.root.setAlpha(e.type === 'phase' ? (e.stealthPhase > 1.8 ? 0.22 : 0.85) : 1);
        v.body.rotation = (e.dirAngle || 0) + Math.PI / 2;
        if (e.flash > 0) v.body.setTintFill(0xffffff); else v.body.clearTint();
        v.aura.setVisible(!!e.raged);
        const hpPct = Math.max(0, e.hp / e.maxHp);
        v.hpFg.setDisplaySize(e.r * 2.4 * hpPct, 4);
        v.hpFg.setTint(hpPct > 0.5 ? 0x34d399 : (hpPct > 0.25 ? 0xfbbf24 : 0xf43f5e));
        v.hpBg.setVisible(hpPct < 1);
        v.hpFg.setVisible(hpPct < 1);
        const shPct = e.maxShield > 0 ? Math.max(0, e.shield / e.maxShield) : 0;
        v.shFg.setDisplaySize(e.r * 2.4 * shPct, 2.4);
        v.shFg.setVisible(shPct > 0);
        void v.lastLevelHp;
      }
      for (const eid in this.enemyViews) {
        if (!seen[eid]) {
          this.enemyViews[eid].root.destroy();
          delete this.enemyViews[eid];
        }
      }
    }

    syncTowers() {
      for (const t of this.S.towers) {
        let v = this.towerViews[t.tid];
        const tkind = t.defRef.kind;
        const tkey = tkind === 'factory'
          ? 'px_factory_l' + Math.min(5, t.level)
          : tkind === 'station' ? 'st_station'
          : tkind === 'support' ? 'st_support'
          : 'tur_' + t.defRef.id + '_t' + D.getTier(t.level); // v3 PIXEL: tier/factory/station/support texture
        if (!v || v.lastTexKey !== tkey) {
          if (v && v.lastTexKey !== tkey && this.textures.exists(tkey)) { v.tur.setTexture(tkey); v.lastTexKey = tkey; }
        }
        if (!v) {
          const tur = this.add.image(t.x, t.y, this.textures.exists(tkey) ? tkey : 'dot');
          const pips = this.add.container(t.x, t.y + 15);
          tur.setDepth(31); pips.setDepth(32);
          v = { tur, pips, lastLevel: t.level };
          v.lastTexKey = this.textures.exists(tkey) ? tkey : null; // v3 PIXEL
          v.tur.baseScale = [1, 1, 1.08, 1.18, 1.30, 1.45][D.getTier(t.level)] || 1;
          this.towerViews[t.tid] = v;
          this.buildPips(v, t);
        }
        v.tur.setPosition(t.x, t.y);
        v.pips.setPosition(t.x, t.y+15);
        if(v.ultraGlow) v.ultraGlow.setPosition(t.x, t.y);
        if(v.odFlame) v.odFlame.setPosition(t.x, t.y);
        // F4-comp C3: overlays de componente (ov_<track> quando comp>=1, _hi quando >=4); pips/tiers intactos
        try {
          const _ovMap = { w: 'weapon', e: 'engine', r: 'reactor', t: 'target' };
          if (!v.ovs) v.ovs = {};
          const _comp = t.comp || {};
          for (const _tk in _ovMap) {
            const _lvl = ((_comp[_tk] | 0) || 0);
            const _nm = _ovMap[_tk];
            const _key = _lvl >= 4 ? ('ov_' + _nm + '_hi') : (_lvl >= 1 ? ('ov_' + _nm) : null);
            let _im = v.ovs[_tk];
            if (!_key || !(this.textures && this.textures.exists && this.textures.exists(_key))) {
              if (_im) _im.setVisible(false);
              continue;
            }
            if (!_im) {
              _im = this.add.image(t.x, t.y, _key).setDepth(32);
              v.ovs[_tk] = _im;
            } else if (!_im.texture || _im.texture.key !== _key) {
              try { _im.setTexture(_key); } catch (_) {}
            }
            _im.setVisible(true).setPosition(t.x, t.y);
            if (_tk === 'w') _im.setRotation((t.angle || 0) + Math.PI / 2);
            else _im.setRotation(0);
          }
        } catch (_) {}
        v.tur.rotation = (t.angle || 0) + Math.PI / 2;
        v.tur.setScale(1 + (t.recoil || 0) * 0.12);
        if (t.flash > 0) v.tur.setTintFill(0xffffff); else v.tur.clearTint();
        if (t.level !== v.lastLevel) {
          // v3 PIXEL: troca textura por TIER (escala visual 1.0/1.08/1.18/1.30/1.45)
          const tk = tkind === 'factory' ? 'px_factory_l' + Math.min(5, t.level)
            : tkind === 'station' ? 'st_station'
            : tkind === 'support' ? 'st_support'
            : 'tur_' + t.defRef.id + '_t' + D.getTier(t.level);
          if (this.textures.exists(tk)) { v.tur.setTexture(tk); v.lastTexKey = tk; }
          const tierScale = [1, 1, 1.08, 1.18, 1.30, 1.45][D.getTier(t.level)] || 1;
          v.tur.baseScale = tierScale;
          v.lastLevel = t.level; this.buildPips(v, t);
        }
        v.tur.setScale((v.tur.baseScale || 1) * (1 + (t.recoil || 0) * 0.12));
      }
      // FIX: remove visual remanescente de naves consumidas no merge/venda (estava deixando fantasma)
      for (const tid in this.towerViews) {
        const stillExists = this.S.towers.some(t => String(t.tid) === String(tid));
        if (!stillExists) {
          const v = this.towerViews[tid];
          try{ if(v.tur) v.tur.destroy(); }catch(e){}
          try{ if(v.pips) v.pips.destroy(true); }catch(e){}
          try{ if(v.ultraGlow) v.ultraGlow.destroy(); }catch(e){}
          try{ if(v.odFlame) v.odFlame.destroy(); }catch(e){}
          try{ if(v.aura) v.aura.destroy(); }catch(e){}
          try{ if(v.ovs) for (const _k in v.ovs) { try{ v.ovs[_k].destroy(); }catch(e){} } }catch(e){}
          delete this.towerViews[tid];
        }
      }
    }

    buildPips(v, t) {
      v.pips.removeAll(true);
      // ULTRA: mostra até 5 tiers visuais + número, não 50 dots
      const tiers = Math.min(5, Math.ceil(t.level/10));
      for (let i = 0; i < tiers; i++) {
        const dot = this.add.image((i - (tiers - 1) / 2) * 8, 0, 'dot')
          .setTint(t.level>=D.TOWER_MAX_LVL ? 0xf43f5e : i>=3 ? 0x38bdf8 : 0xfbbf24).setScale(0.38 + i*0.06);
        v.pips.add(dot);
      }
      // número de nível acima dos pips
      const txt = this.add.text(0, -10, String(t.level), { fontFamily:'JetBrains Mono', fontSize:'9px', color:'#fbbf24' }).setOrigin(0.5);
      v.pips.add(txt);
    }

    // Brief 08 A6: pool de projeteis — obter/devolver _img em vez de destroy() por frame.
    // Sem mudar trajetoria/dano (sim intacto); mesmos textura/tint/escala/depth/posicao.
    // O _projKnown tambem recolhe orfaos que o stepSim removeu do array (splice) antes do sync.
    syncProjectiles() {
      const alive = new Set();
      for (const pr of this.S.projectiles) {
        if (pr.delay > 0) continue;
        alive.add(pr);
        if (!pr._img) {
          const isMissile = pr.kind === 'missile';
          pr._img = this.getProjImg();
          pr._img.setTexture('dot')
            .setTint(isMissile ? 0xfb923c : Phaser.Display.Color.HexStringToColor(pr.col).color)
            .setScale(isMissile ? 0.62 : 0.42).setDepth(40);
        }
        pr._img.setPosition(pr.x, pr.y);
        if (pr.kind === 'missile' && pr.vx) pr._img.rotation = Math.atan2(pr.vy, pr.vx) + Math.PI / 2;
      }
      const known = this._projKnown || (this._projKnown = new Set());
      for (const pr of known) {
        if (!alive.has(pr) || pr.life <= 0) {
          if (pr._img) { this.releaseProjImg(pr._img); pr._img = null; }
          known.delete(pr);
        }
      }
      for (const pr of alive) if (pr.life > 0) known.add(pr);
    }

    /* ---------- HUD DOM ---------- */
    syncHud() {
      const S = this.S;
      // Brief 07 A8: cache de elementos + dirty-check (syncHud roda todo frame;
      // escreve no DOM só quando o valor muda; sem mudar layout/valores).
      const H = this._hud || (this._hud = { els: {}, v: {}, sb: {} });
      const el = id => H.els[id] || (H.els[id] = document.getElementById(id));
      const setT = (id, val) => { if (H.v[id] !== val) { H.v[id] = val; const n = el(id); if (n) n.textContent = val; } };
      if (S.credits !== this._lastCredits) {
        const up = this._lastCredits >= 0 && S.credits > this._lastCredits;
        this._lastCredits = S.credits;
        const c = el('hud-credits');
        c.textContent = '$' + S.credits;
        if (up) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
      }
      if (S.lives !== this._lastLives) {
        const down = this._lastLives >= 0 && S.lives < this._lastLives;
        this._lastLives = S.lives;
        const l = el('hud-lives');
        l.textContent = '\u25C8 ' + S.lives;
        if (down) { l.classList.remove('blink'); void l.offsetWidth; l.classList.add('blink'); }
      }
      // V9: Terra HP <=30% -> borda pulsante continua + aria-live assertive; some ao recuperar
      {
        const _low = S.livesMax > 0 && S.lives <= Math.ceil(S.livesMax * 0.3);
        if (H.v._lowLives !== _low) {
          H.v._lowLives = _low;
          const _livesEl = el('hud-lives');
          if (_livesEl) {
            _livesEl.classList.toggle('low', !!_low);
            _livesEl.setAttribute('aria-live', _low ? 'assertive' : 'polite');
          }
        }
      }
      // v3 PIXEL FASE 5: HUD de peças ⚙
      if ((S.parts || 0) !== (this._lastParts || -1)) {
        this._lastParts = S.parts || 0;
        const pEl = el('hud-parts');
        if (pEl) pEl.textContent = String(this._lastParts);
      }
      // v3 PIXEL FASE 5: botão laboratório Hivemind (A8: só reescreve quando muda)
      const hiveBtn = el('btn-hivemind');
      if (hiveBtn) {
        const cost = D.HIVEMIND.cost(S.enemyHpLevel || 0);
        const hkey = (S.enemyHpLevel || 0) + '|' + cost + '|' + ((S.parts || 0) < cost);
        if (H.v._hive !== hkey) {
          H.v._hive = hkey;
          hiveBtn.textContent = '🧬 HP ×' + (1 + (S.enemyHpLevel || 0) * D.HIVEMIND.hpAdd).toFixed(2) + ' (+' + cost + '⚙)';
          hiveBtn.disabled = (S.parts || 0) < cost;
        }
      }
      setT('hud-wave-num', String(Math.max(1, S.wave)));
      setT('hud-wave-num2', String(Math.max(1, S.wave)));
      setT('hud-wave-total', '/ ' + (S.endless ? '∞' : S.map.waves.length));
      if (S.state === 'combat') {
        if (this._lastWave !== S.wave) { this._lastWave = S.wave; this._waveTotal = Math.max(1, S.waveQueue.length); }
        const pct = Math.round(100 * (1 - S.waveQueue.length / this._waveTotal));
        // Brief 07 A8: gradiente só quando o % muda
        if (H.v._ring !== 'c' + pct) {
          H.v._ring = 'c' + pct;
          el('wave-ring').style.background = 'conic-gradient(#38bdf8 ' + pct + '%, rgba(56,189,248,0.15) 0)';
        }
        setT('countdown-chip', '');
      } else {
        if (H.v._ring !== 'idle') {
          H.v._ring = 'idle';
          el('wave-ring').style.background = 'conic-gradient(#fbbf24 100%, rgba(56,189,248,0.15) 0)';
        }
        const moreWaves = S.endless || S.wave < S.map.waves.length;
        setT('countdown-chip', moreWaves
          ? (S.autoNext ? 'PR\u00D3XIMA ONDA EM ' + Math.ceil(S.autoWaveTimer) + 's [AUTO]' : '')
          : '');
        // mobile sem teclado: atualiza botão Próxima Onda (A8: unificado; escreve só quando muda)
        const moreKey = S.state + '|' + moreWaves + '|' + S.wave + '|' + (S.autoNext ? 1 : 0);
        if (H.v._more !== moreKey) {
          H.v._more = moreKey;
          const canNext2 = S.state === 'idle' && moreWaves;
          const txt2 = S.state === 'combat' ? 'COMBATE' : '▶ ONDA ' + (S.wave + 1);
          ['btn-nextwave', 'btn-nextwave-mobile'].forEach(id => {
            const b2 = el(id);
            if (!b2) return;
            b2.disabled = !canNext2;
            b2.style.opacity = canNext2 ? '1' : '0.45';
            b2.textContent = txt2;
          });
        }
      }
      this.syncNextPreview();
      // estado dos botões próxima onda também em combat (consome a mesma chave _more acima)
      {
        const nms = [el('btn-nextwave'), el('btn-nextwave-mobile')].filter(Boolean);
        if (nms.length && S.state === 'combat') {
          if (H.v._moreCombat !== S.wave) {
            H.v._moreCombat = S.wave;
            H.v._more = 'combat'; // invalida: ao voltar p/ idle o bloco acima reescreve
            nms.forEach(nm => { nm.disabled = true; nm.style.opacity = '0.35'; nm.textContent = 'COMBATE'; });
          }
        } else if (nms.length && S.state === 'idle') {
          H.v._moreCombat = -1;
        }
      }
      setT('btn-speed', '×' + this.speeds[this.speedIdx]);
      if (H.v._auto !== !!S.autoNext) { H.v._auto = !!S.autoNext; el('btn-auto').classList.toggle('active', !!S.autoNext); }
      // G10: estado visual do toggle de auto-movimento (A8: só quando muda)
      {
        const _amOn = S.autoMove !== false;
        if (H.v._am !== _amOn) {
          H.v._am = _amOn;
          const _amBtn2 = el('btn-automove');
          if (_amBtn2) { _amBtn2.classList.toggle('active', _amOn); _amBtn2.title = 'Auto-movimento das naves (' + (_amOn ? 'LIGADO' : 'DESLIGADO') + ')'; }
        }
      }
      if (H.v._mute !== !!SND.muted) {
        H.v._mute = !!SND.muted;
        el('btn-mute').classList.toggle('active', !!SND.muted);
        el('btn-mute').textContent = SND.muted ? '✖🔇' : '🔊';
      }
      Object.keys(D.SUPERS).forEach(k => {
        const btn = el('super-' + k);
        if (!btn) return;
        const p = S.powers[k];
        // A8: cacheia o .sb-cd (querySelector fora do hot path) e escreve só quando muda
        let cdEl = H.sb[k];
        if (cdEl === undefined) { cdEl = btn.querySelector('.sb-cd'); H.sb[k] = cdEl || null; }
        const cdOn = p.cd > 0;
        const secs = cdOn ? String(Math.ceil(p.cd)) : '';
        const cdp = cdOn ? Math.round(100 * p.cd / p.maxCd) + '%' : '';
        const skey = (cdOn ? 1 : 0) + '|' + secs + '|' + cdp + '|' + (this.armed === k ? 1 : 0);
        if (H.v['sb:' + k] !== skey) {
          H.v['sb:' + k] = skey;
          btn.classList.toggle('cd', cdOn);
          if (cdEl) cdEl.textContent = secs;
          if (cdOn) btn.style.setProperty('--cdpct', cdp);
          btn.classList.toggle('armed', this.armed === k);
        }
      });
      if (this.selected && this.S.towers.indexOf(this.selected) < 0) { this.selected = null; this.hideTowerPanel(); }
      if (this.selected) {
        this._panelAcc = (this._panelAcc || 0) + 1;
        if (this._panelAcc % 12 === 0) this.showTowerPanel(this.selected);
      }
    }

    syncNextPreview() {
      // E4/FIX: peekNextWave 1x por onda — em sessão sem próxima onda o cache de
      // conteúdo nunca era preenchido e o peek rodava a cada frame. O guard de onda
      // agora é incondicional e a chave é sempre atribuída antes da comparação.
      const _preKey = this.S.wave + '|' + (this.S.endless ? 1 : 0);
      if (this._prevPreviewWave === _preKey) return;
      this._prevPreviewWave = _preKey;
      const peek = peekNextWave(this.S);
      const key = peek ? peek.map(p => p.type + p.count).join('|') : '';
      const prevKey = this._prevPreviewKey;
      this._prevPreviewKey = key;
      if (key === prevKey) return;
      const box = document.getElementById('next-preview');
      box.innerHTML = '';
      if (!peek) return;
      peek.forEach(p => {
        const def = D.ENEMIES_DATA[p.type];
        if (!def) return;
        const chip = document.createElement('span');
        chip.className = 'np-chip';
        chip.innerHTML = '<i style="background:' + def.col + '"></i>' + (def.isBoss ? '\u26A0' : '') + p.count;
        box.appendChild(chip);
      });
    }

    syncBossBar() {
      const bar = document.getElementById('boss-bar');
      const b = this.S.activeBoss;
      if (!b || b.dead) { bar.classList.remove('show'); return; }
      bar.classList.add('show');
      document.getElementById('boss-name').textContent = '\u26A0 ' + b.label.toUpperCase() + (b.raged ? ' \u2014 F\u00daRIA!' : '');
      document.getElementById('boss-fill').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
      const sh = b.maxShield > 0 ? Math.max(0, b.shield / b.maxShield * 100) : 0;
      document.getElementById('boss-shield-fill').style.width = sh + '%';
      // V4-js: preenche #boss-pct com % + HP atual/max
      const _pctEl = document.getElementById('boss-pct');
      if (_pctEl) {
        const _pct = Math.max(0, Math.round(b.hp / b.maxHp * 100));
        _pctEl.textContent = _pct + '% \u2022 ' + Math.max(0, Math.ceil(b.hp)) + ' / ' + Math.ceil(b.maxHp);
      }
    }

    showBanner(txt, col, strong) {
      // V3: fila FIFO max 3 (descarta excedente mais antigo nao-strong); exibe em sequencia
      this._bannerQueue = this._bannerQueue || [];
      this._bannerQueue.push({ txt, col, strong: !!strong });
      while (this._bannerQueue.length > 3) {
        const idx = this._bannerQueue.findIndex(q => !q.strong);
        this._bannerQueue.splice(idx >= 0 ? idx : 0, 1);
      }
      if (!this._bannerBusy) this._bannerNext();
    }

    _bannerNext() {
      const b = document.getElementById('banner');
      if (!b) { this._bannerBusy = false; return; }
      const q = (this._bannerQueue || []).shift();
      if (!q) { this._bannerBusy = false; return; }
      this._bannerBusy = true;
      b.textContent = q.txt;
      b.style.color = q.col || '#e8eefc';
      b.style.borderColor = q.col || '#38bdf8';
      b.classList.toggle('strong', !!q.strong);
      b.classList.remove('show');
      void b.offsetWidth;
      b.classList.add('show');
      if (this._bannerTimer) { try { this._bannerTimer.remove(); } catch (e) {} }
      const dur = q.strong ? 2200 : 1500;
      try {
        this._bannerTimer = this.time.delayedCall(dur, () => {
          b.classList.remove('show');
          this._bannerBusy = false;
          if ((this._bannerQueue || []).length) this._bannerNext();
        });
      } catch (e) {
        setTimeout(() => {
          b.classList.remove('show');
          this._bannerBusy = false;
          if ((this._bannerQueue || []).length) this._bannerNext();
        }, dur);
      }
    }

    pollToasts() {
      const notes = D.Save.drainNotifications();
      for (const n of notes) {
        const ach = D.ACHIEVEMENTS.find(a => a.id === n.id);
        if (!ach) continue;
        SND.achievement();
        const toast = document.createElement('div');
        toast.className = 'toast chamf';
        toast.innerHTML = '<span class="t-icon">' + ach.icon + '</span><span><b>CONQUISTA:</b> ' + ach.name + '</span>';
        document.getElementById('toasts').appendChild(toast);
        setTimeout(() => toast.classList.add('out'), 2800);
        setTimeout(() => toast.remove(), 3300);
      }
    }

    showEndModal() {
      const res = this.S.result;
      if (!res) return;
      // Onda 5: fim de jogo não pode deixar laser contínuo soando
      try { SND.laserStopAll(); } catch (eL) {}
      const victory = res.outcome === 'victory';
      // Brief 07 A11: trilha do resultado ao abrir o modal (finalizeEnd já definiu; idempotente).
      // Brief 07 A2: cascata star(i) com delay por estrela já existe abaixo (400+i*420ms).
      if (SND.setMode) SND.setMode(victory ? 'victory' : 'defeat'); else SND.musicTick(victory ? 'victory' : 'defeat');
      const el = id => document.getElementById(id);
      el('end-title').textContent = victory ? 'SETOR LIBERADO COM SUCESSO!' : 'FALHA DA DEFESA ORBITAL';
      el('end-title').style.color = victory ? '#34d399' : '#f43f5e';
      el('end-sub').textContent = 'SETOR ' + (this.S.mapIdx + 1) + ': ' + this.S.map.name + ' \u2022 ' + this.S.diff.name +
        (this.S.endless ? ' \u2022 MODO INFINITO \u2014 ONDA ' + this.S.wave : '');
      el('end-kills').textContent = res.kills;
      el('end-credits').textContent = '$' + res.credits;
      el('end-crystals').textContent = '+' + res.crystals + ' \u27E8\u27E8';
      el('end-diag').textContent = res.diag || '';
      el('end-diag').style.display = res.diag ? 'block' : 'none';
      const starsBox = el('end-stars');
      starsBox.innerHTML = '';
      const starEls = [];
      for (let i = 0; i < 3; i++) {
        const s = document.createElement('span');
        s.className = 'end-star';
        s.textContent = '\u2606';
        starsBox.appendChild(s);
        starEls.push(s);
        if (victory && i < res.stars) {
          this.time.delayedCall(400 + i * 420, () => {
            s.textContent = '\u2605';
            s.classList.add('on');
            SND.star(i);
          });
        }
      }
      if (!victory) starsBox.innerHTML = '<span class="end-star off">\u2606\u2606\u2606</span>';
      el('btn-next').style.display = (victory && this.S.mapIdx + 1 < D.MAPS_DATA.length) ? '' : 'none';
      const oldInf = document.getElementById('btn-infinite');
      const oldNote = document.getElementById('end-infinite-note');
      if(oldInf) oldInf.remove();
      if(oldNote) oldNote.remove();
      // Após a vitória, o desbloqueio já foi salvo; o infinito continua a mesma partida.
      if(victory){
        const goActions = document.querySelector('#modal-end .go-actions');
        if(goActions){
          const note = document.createElement('div');
          note.id='end-infinite-note';
          const unlockedNext = this.S.mapIdx + 1 < D.MAPS_DATA.length;
          note.innerHTML='<b>' + (unlockedNext ? 'PRÓXIMO SETOR DESBLOQUEADO' : 'CAMPANHA CONCLUÍDA') + '</b>' +
            '<span>Continue com suas torres, créditos e vidas. As ondas seguirão sem limite até a defesa cair.</span>';
          goActions.parentNode.insertBefore(note, goActions);
          const btnInf = document.createElement('button');
          btnInf.id='btn-infinite';
          btnInf.className='btn chamf';
          btnInf.style.borderColor='#38bdf8';
          btnInf.style.color='#38bdf8';
          btnInf.textContent='♾ CONTINUAR DAQUI NO INFINITO';
          btnInf.title='Mantém esta defesa e inicia ondas extras até a derrota';
          goActions.appendChild(btnInf);
          btnInf.addEventListener('click', ()=>{
            this.continueEndless();
          });
          // animação de entrada nos botões — FIX: Phaser tweens não funcionam em DOM (deixava botões com opacity 0 e travava próxima fase)
          [...goActions.children].forEach((b,i)=>{
            b.style.opacity='0'; b.style.transform='translateY(12px)';
            try{
              b.animate([{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'translateY(0)'}], {duration:400, delay:600+i*120, easing:'cubic-bezier(0.2,1.4,0.4,1)', fill:'forwards'});
              // fallback garante visível após animação mesmo se fill:forwards falhar
              setTimeout(()=>{ b.style.opacity='1'; b.style.transform='none'; }, 600+i*120+420);
            }catch(e){ b.style.opacity='1'; b.style.transform='none'; }
          });
          // brilho sutil no modal
          const box = document.querySelector('#modal-end .modal-box');
          if(box){ box.style.boxShadow='0 0 40px rgba(56,189,248,.25), 0 20px 60px rgba(0,0,0,.7)'; box.animate([{ boxShadow:'0 0 20px rgba(56,189,248,.15)'},{ boxShadow:'0 0 40px rgba(56,189,248,.30)'}], {duration:1200, iterations:2, direction:'alternate'}); }
        }
      }
      showOverlay('modal-end');
    }
  }

