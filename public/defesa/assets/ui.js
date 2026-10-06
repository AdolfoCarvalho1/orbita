/* Defesa Orbital v3 - ui.js (Brief 08 A5: extracao mecanica de assets/scenes.js, HUD/DOM: orig 2090-2114 + MenuDOM 2116-2506 + helpers tooltip/overlay 4137-4173) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  /* ---- U-ASTRO: o astronauta solitário em DOM (menu + faixas lab/codex/ach) ---- */
  /* Só visual: canvas 2D pintado de window.PXART.ASTRO_ART, zero asset, sem lógica. */
  function uastroPaint(canvas, key, scale, mound) {
    try {
      if (canvas && window.PXART && window.PXART.paintOn) {
        window.PXART.paintOn(canvas, key, { scale: scale, mound: mound });
        return true;
      }
    } catch (e) {}
    return false;
  }
  // Menu: astronauta sentado na colina, canto inferior-esquerdo. Sempre visível no menu.
  function uastroEnsureMenu() {
    const m = document.getElementById('screen-menu');
    if (!m) return;
    let cv = document.getElementById('astro-menu');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'astro-menu';
      cv.width = 104; cv.height = 88;
      cv.setAttribute('aria-hidden', 'true');
      m.appendChild(cv);
    }
    uastroPaint(cv, 'astro_sit', 5, true);
  }
  // Faixa de cabeçalho sunset (lua CSS + horizonte âmbar + astronauta) p/ lab/codex/ach.
  function uastroEnsureStrip(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const box = modal.querySelector('.modal-box');
    if (!box) return;
    let strip = box.querySelector(':scope > .uastro-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'uastro-strip';
      strip.setAttribute('aria-hidden', 'true');
      const cv = document.createElement('canvas');
      cv.width = 56; cv.height = 48;
      strip.appendChild(cv);
      box.insertBefore(strip, box.firstChild);
    }
    const cv = strip.querySelector('canvas');
    if (cv) uastroPaint(cv, 'astro_sit', 3, false);
  }

  /* ---- DOM dos menus ---- */
  function isMapUnlocked(mapIdx) {
    const unlockedCount = Math.max(1, Number(D.Save.data.unlockedMap) || 1);
    return mapIdx + 1 <= unlockedCount;
  }

  function syncMapCardState(card, mapIdx) {
    const map = D.MAPS_DATA[mapIdx];
    if (!card || !map) return true;
    const locked = !isMapUnlocked(mapIdx);
    const stars = D.Save.data.mapStars[mapIdx] || 0;
    const best = D.Save.data.bestEndless[mapIdx] || 0;
    card.classList.toggle('locked', locked);
    card.tabIndex = locked ? -1 : 0;
    card.setAttribute('aria-disabled', locked ? 'true' : 'false');
    card.setAttribute('aria-label', map.name + '. ' + map.sub + (locked ? '. Bloqueado' : '. Selecionar setor'));
    const starsEl = card.querySelector('.m-stars');
    if (starsEl) {
      starsEl.innerHTML = locked
        ? '<span class="lock">BLOQUEADO</span>'
        : '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) +
          (best ? ' <span class="best">\u221E' + best + '</span>' : '');
    }
    return locked;
  }


  /* ---- A5: MenuDOM + consts de menu (orig scenes.js 2116-2506) ---- */
  const MenuDOM = {
    built: false, scene: null,
    sel: { mapIdx: 0, diffKey: 'normal', endless: false },

    el(id) { return document.getElementById(id); },
    show() {
      const m = this.el('screen-menu');
      if (m) m.classList.remove('hidden');
      document.body.classList.remove('is-playing');
      // S3 SUNSET: afina o véu do menu para a cena Phaser aparecer (só visual, sem lógica)
      try { if (m && m.style) m.style.background = 'radial-gradient(700px 400px at 20% 0%, rgba(246,231,203,.06) 0%, transparent 60%), radial-gradient(800px 500px at 80% 100%, rgba(245,168,61,.10) 0%, transparent 60%), linear-gradient(180deg, rgba(13,18,32,.30) 0%, rgba(13,18,32,.62) 100%)'; } catch (_s3) {}
      // U-ASTRO: astronauta sentado na colina (sempre no menu)
      try { uastroEnsureMenu(); } catch (_u) {}
      this.refresh();
    },
    hide() { const m = this.el('screen-menu'); if (m) m.classList.add('hidden'); document.body.classList.add('is-playing'); },

    build(scene) {
      this.scene = scene;
      if (this.built) { this.refresh(); return; }
      this.built = true;
      const grid = this.el('maps-grid');
      grid.innerHTML = '';
      D.MAPS_DATA.forEach((m, i) => {
        const locked = !isMapUnlocked(i);
        const card = document.createElement('div');
        card.className = 'map-card chamf' + (locked ? ' locked' : '');
        card.dataset.idx = i;
        card.dataset.theme = m.theme;
        card.setAttribute('role', 'button');
        card.tabIndex = locked ? -1 : 0;
        card.setAttribute('aria-disabled', locked ? 'true' : 'false');
        card.setAttribute('aria-label', m.name + '. ' + m.sub + (locked ? '. Bloqueado' : '. Selecionar setor'));
        // tema define --tc via CSS [data-theme] e preview via paintPreview unificado
        if(m.theme && window.TILES && window.TILES.THEMES[m.theme]) card.style.setProperty('--tc', window.TILES.THEMES[m.theme].accent);
        const stars = D.Save.data.mapStars[i] || 0;
        const cv = document.createElement('canvas');
        cv.width = 168; cv.height = 104;
        this.paintPreview(cv, m);
        const info = document.createElement('div');
        info.className = 'mc-info';
        info.innerHTML = '<div class="mc-name">' + m.name + '</div><div class="mc-sub">' + m.sub + '</div>' +
          '<div class="m-stars">' + (locked ? '<span class="lock">BLOQUEADO</span>' : '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars)) +
          (D.Save.data.bestEndless[i] ? ' <span class="best">\u221E' + D.Save.data.bestEndless[i] + '</span>' : '') + '</div>';
        card.appendChild(cv); card.appendChild(info);
        card.addEventListener('click', () => {
          if (syncMapCardState(card, i)) { SND.error(); return; }
          SND.ui();
          this.sel.mapIdx = i;
          this.refresh();
        });
        card.addEventListener('keydown', (e) => {
          if ((e.key !== 'Enter' && e.key !== ' ') || syncMapCardState(card, i)) return;
          e.preventDefault();
          card.click();
        });
        grid.appendChild(card);
      });
      const drow = this.el('diff-row');
      drow.innerHTML = '';
      Object.keys(D.DIFFICULTIES).forEach(k => {
        const d = D.DIFFICULTIES[k];
        const b = document.createElement('button');
        b.className = 'pill chamf';
        b.dataset.diff = k;
        b.style.setProperty('--pc', d.col);
        b.textContent = d.name;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => { SND.ui(); this.sel.diffKey = k; this.refresh(); });
        drow.appendChild(b);
      });
      this.el('opt-endless').addEventListener('change', e => { SND.ui(); this.sel.endless = e.target.checked; this.refresh(); });
      this.el('btn-lab').addEventListener('click', () => { window.__LAST = 'btn-lab'; SND.ui(); this.openLab(); });
      this.el('btn-codex').addEventListener('click', () => { window.__LAST = 'btn-codex'; SND.ui(); this.openCodex(); });
      this.el('btn-ach').addEventListener('click', () => { window.__LAST = 'btn-ach'; SND.ui(); this.openAch(); });
      this.el('btn-start').addEventListener('click', () => { window.__LAST = 'btn-start'; this.start(); });
      // U-ASTRO: garante o astronauta do menu já na construção (aparece SEMPRE no menu)
      try { uastroEnsureMenu(); } catch (_u) {}
      ['modal-lab', 'modal-codex', 'modal-ach'].forEach(id => {
        const close = this.el(id).querySelector('.modal-close');
        if (close) close.addEventListener('click', () => { SND.uiBack(); this.el(id).classList.add('hidden'); });
      });
    },

    paintPreview(cv, map) {
      const c2 = cv.getContext('2d');
      const sx = cv.width / BW, sy = cv.height / BH;
      const themeInfo = (window.TILES && window.TILES.THEMES[map.theme]) ? window.TILES.THEMES[map.theme] : { bg:'#0a1128', accent:'#38bdf8' };
      if(window.TILES && window.TILES.paintPreviewBackdrop) window.TILES.paintPreviewBackdrop(c2,cv.width,cv.height,map.theme);
      else { c2.fillStyle = themeInfo.bg || '#0a1128'; c2.fillRect(0,0,cv.width,cv.height); }
      c2.strokeStyle = themeInfo.accent || '#38bdf8'; c2.globalAlpha=0.07; c2.lineWidth = 1;
      for(let c=0;c<=COLS;c++){ const x=c*CELL*sx; c2.beginPath(); c2.moveTo(x,0); c2.lineTo(x,cv.height); c2.stroke(); }
      for(let r=0;r<=ROWS;r++){ const y=r*CELL*sy; c2.beginPath(); c2.moveTo(0,y); c2.lineTo(cv.width,y); c2.stroke(); }
      c2.globalAlpha=1;
      try{
        const blocked = D.getPathBlockedCells(map.routes);
        const accent = themeInfo.accent || '#38bdf8';
        for(const k in blocked){
          const parts=k.split(','); const c=parseInt(parts[0],10), r=parseInt(parts[1],10);
          if(c<0||c>=COLS||r<0||r>=ROWS) continue;
          const x=c*CELL*sx, y=r*CELL*sy, w=CELL*sx, h=CELL*sy;
          const up=blocked[c+','+(r-1)],right=blocked[(c+1)+','+r],down=blocked[c+','+(r+1)],left=blocked[(c-1)+','+r];
          const arm=(col,inset)=>{ c2.fillStyle=col; c2.fillRect(x+inset,y+inset,w-inset*2,h-inset*2);
            if(up)c2.fillRect(x+inset,y,w-inset*2,h/2+1); if(right)c2.fillRect(x+w/2-1,y+inset,w/2+1,h-inset*2);
            if(down)c2.fillRect(x+inset,y+h/2-1,w-inset*2,h/2+1); if(left)c2.fillRect(x,y+inset,w/2+1,h-inset*2); };
          arm('#070c16',Math.max(1,w*.10)); arm('#2b3d59',Math.max(2,w*.22));
          c2.fillStyle=accent;c2.globalAlpha=.42;
          if(left||right)c2.fillRect(x,y+h/2,w,1); if(up||down)c2.fillRect(x+w/2,y,1,h);
          c2.globalAlpha=1;
        }
        // Entradas e saída ficam reconhecíveis já na seleção de mapa.
        c2.fillStyle=accent;
        map.routes.forEach(route=>{ const fy=(route[0][1]+.5)*CELL*sy;c2.beginPath();c2.moveTo(1,fy);c2.lineTo(7,fy-4);c2.lineTo(7,fy+4);c2.closePath();c2.fill(); });
        const end=map.routes[0][map.routes[0].length-1],ey=(end[1]+.5)*CELL*sy;
        c2.fillStyle='#e8eefc';c2.fillRect(cv.width-7,ey-3,6,6);c2.fillStyle=accent;c2.fillRect(cv.width-5,ey-1,2,2);
      }catch(e){
        // fallback vetorial antigo se blocked falhar
        const baseAccent = themeInfo.accent || '#38bdf8';
        map.routes.forEach((wps, ri) => {
          c2.strokeStyle = baseAccent; c2.lineWidth = 2; c2.globalAlpha = 0.7;
          c2.beginPath();
          wps.forEach((w, i) => {
            const x = w[0] * CELL * sx + CELL * sx / 2, y = w[1] * CELL * sy + CELL * sy / 2;
            if (i === 0) c2.moveTo(Math.max(-4, x), y); else c2.lineTo(x, y);
          });
          c2.stroke();
        });
        c2.globalAlpha = 1;
      }
    },

    refresh() {
      [...this.el('maps-grid').children].forEach((card, i) => {
        syncMapCardState(card, i);
        card.classList.toggle('sel', i === this.sel.mapIdx);
        card.setAttribute('aria-pressed', i === this.sel.mapIdx ? 'true' : 'false');
      });
      [...this.el('diff-row').children].forEach(b => {
        b.classList.toggle('sel', b.dataset.diff === this.sel.diffKey);
        b.setAttribute('aria-pressed', b.dataset.diff === this.sel.diffKey ? 'true' : 'false');
      });
      this.el('crystals-top').textContent = D.Save.data.crystals;
      const canEndless = (D.Save.data.mapStars[this.sel.mapIdx] || 0) > 0 || (D.Save.data.bestEndless[this.sel.mapIdx] || 0) >= S_ENDLESS_UNLOCK_WAVES;
      this.el('opt-endless-wrap').classList.toggle('disabled', !canEndless);
      if (!canEndless) { this.el('opt-endless').checked = false; this.sel.endless = false; }
    },

    start() {
      const sel = this.sel;
      const unlockedOk = sel.mapIdx + 1 <= D.Save.data.unlockedMap;
      if (!unlockedOk) { SND.error(); return; }
      D.Save.data.lastDiff = sel.diffKey;
      D.Save.save();
      SND.buy();
      this.hide();
      const sc = this.scene || (window.__game && window.__game.scene.getScene('Menu'));
      const payload = { mapIdx: sel.mapIdx, diffKey: sel.diffKey, endless: sel.endless };
      try{
        if(sc && sc.cameras && sc.cameras.main && sc.cameras.main.fadeOut){
          sc.cameras.main.fadeOut(240);
          sc.time.delayedCall(260, () => { try{ sc.scene.start('Game', payload); } catch(e){ window.__game.scene.start('Game', payload); }});
        } else if(sc && sc.scene){
          sc.scene.start('Game', payload);
        } else {
          window.__game.scene.start('Game', payload);
        }
      }catch(e){ console.error('[Menu start]', e); try{ window.__game.scene.start('Game', payload);}catch(_){} }
    },

    openLab() {
      const wrap = this.el('lab-grid');
      wrap.innerHTML = '';
      this.el('lab-crystals').textContent = D.Save.data.crystals;
      D.TECH_UPGRADES.forEach(t => {
        const lvl = techLvl(t.id);
        const maxed = lvl >= t.max;
        const cost = Math.round(t.cost * Math.pow(1.5, lvl));
        const card = document.createElement('div');
        card.className = 'tech-card chamf';
        card.innerHTML = '<div class="tc-head">' + t.name + '</div><div class="tc-desc">' + t.desc + '</div>' +
          '<div class="tc-pips">' + Array.from({ length: t.max }, (_, i) => '<i class="' + (i < lvl ? 'on' : '') + '"></i>').join('') + '</div>';
        const btn = document.createElement('button');
        btn.className = 'btn small';
        btn.textContent = maxed ? 'MÁXIMO' : 'MELHORAR \u2022 ' + cost;
        btn.disabled = maxed || D.Save.data.crystals < cost;
        btn.addEventListener('click', () => {
          if (D.Save.data.crystals < cost) return;
          D.Save.data.crystals -= cost;
          D.Save.data.tech[t.id] = lvl + 1;
          D.Save.save();
          SND.upgrade();
          this.openLab(); this.refresh();
        });
        card.appendChild(btn);
        wrap.appendChild(card);
      });
      // Onda 3: modal aberto nunca convive com tooltip pinado
      try { if (typeof hideTip === 'function') hideTip(); } catch (eTipL) {}
      this.el('modal-lab').classList.remove('hidden');
      // U-ASTRO: faixa sunset no cabeçalho (só visual, sem mexer na lista)
      try { uastroEnsureStrip('modal-lab'); } catch (_u) {}
    },

    openCodex() {
      const wrap = this.el('codex-grid');
      wrap.innerHTML = '';
      Object.keys(D.ENEMIES_DATA).forEach(type => {
        const def = D.ENEMIES_DATA[type];
        const card = document.createElement('div');
        card.className = 'codex-card chamf' + (def.isBoss ? ' boss' : '');
        const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
        const c2 = cv.getContext('2d');
        // IDENTIDADE UNIFICADA: usa sprite pixel 'en_<type>' (mesma arte do jogo) em vez de vetorial
        let drew = false;
        try {
          const scene = this.scene || (window.__game && window.__game.scene && window.__game.scene.getScene('Menu')) || null;
          if (scene && scene.textures && scene.textures.exists('en_' + type)) {
            const tex = scene.textures.get('en_' + type);
            const src = tex.getSourceImage();
            if (src && src.width) {
              c2.imageSmoothingEnabled = false;
              const scale = Math.min(56 / src.width, 56 / src.height);
              const w = src.width * scale, h = src.height * scale;
              c2.drawImage(src, 32 - w / 2, 32 - h / 2, w, h);
              drew = true;
            }
          }
          if (!drew && window.PXART && window.PXART.ENEMY_ART) {
            const artMap = window.PXART.ENEMY_ART;
            let art = artMap[type];
            if (!art) {
              const baseT = (def.variantOf || type.split('_')[0]);
              art = artMap[baseT] || artMap.drone;
            }
            if (art) {
              const pal = window.PXART.enemyPalette ? window.PXART.enemyPalette(def.col) : { K: '#000000', W: '#ffffff', G: '#bfe3ff', M: '#8b95a8', C: def.col, D: def.col, L: def.col, E: def.col, R: '#f43f5e', Y: '#fbbf24', P: '#a3e635', N: '#34d399', B: '#60a5fa', O: '#f97316' };
              const PX = (window.TOKENS && window.TOKENS.PIXEL && window.TOKENS.PIXEL.PX) || 3;
              let maxW = 0; for (const r of art) maxW = Math.max(maxW, r.length);
              const pxW = maxW * PX, pxH = art.length * PX;
              const offX = Math.floor((64 - pxW) / 2), offY = Math.floor((64 - pxH) / 2);
              for (let y = 0; y < art.length; y++) {
                const row = art[y];
                for (let x = 0; x < row.length; x++) {
                  const ch = row[x];
                  if (ch === ' ' || ch === '.') continue;
                  const c = pal[ch];
                  if (!c) continue;
                  c2.fillStyle = c;
                  c2.fillRect(offX + x * PX, offY + y * PX, PX, PX);
                }
              }
              drew = true;
            }
          }
        } catch (e) {}
        if (!drew) { c2.save(); c2.translate(32, 32); paintEnemyShape2d(c2, def.shape, def.col, def.r * 1.4); c2.restore(); }
        const traits = [];
        if (def.flying) traits.push('VOADOR \u26a0 anti-aéreo necessário');
        if (def.stealth) traits.push('Camuflagem cíclica');
        if (def.shield) traits.push('Escudo ' + def.shield);
        if (def.armor) traits.push('Armadura ' + def.armor);
        if (def.heals) traits.push('Cura aliados');
        if (def.onDeathStun) traits.push('PEM ao morrer');
        if (def.splits) traits.push('Divide-se ao morrer');
        if (def.slowImmune) traits.push('Imune a lentidão');
        if (def.isBoss) traits.push('CHEFE \u2014 barra dedicada');
        card.appendChild(cv);
        card.insertAdjacentHTML('beforeend',
          '<div class="cc-name" style="color:' + def.col + '">' + def.label + '</div>' +
          '<div class="cc-stats">HP ' + def.hp + ' • VEL ' + def.spd + ' • OURO ' + def.gold + (def.dmg > 1 ? ' • DANO ' + def.dmg : '') + '</div>' +
          '<div class="cc-traits">' + traits.join('<br>') + '</div>');
        wrap.appendChild(card);
      });
      // Onda 3: modal aberto nunca convive com tooltip pinado
      try { if (typeof hideTip === 'function') hideTip(); } catch (eTipC) {}
      this.el('modal-codex').classList.remove('hidden');
      // U-ASTRO: faixa sunset no cabeçalho (só visual, sem mexer na lista)
      try { uastroEnsureStrip('modal-codex'); } catch (_u) {}
    },

    openAch() {
      const wrap = this.el('ach-grid');
      wrap.innerHTML = '';
      D.ACHIEVEMENTS.forEach(a => {
        const got = D.Save.data.achievements.indexOf(a.id) >= 0;
        const card = document.createElement('div');
        card.className = 'ach-card chamf' + (got ? ' got' : '');
        card.innerHTML = '<div class="ac-icon">' + a.icon + '</div><div class="ac-name">' + a.name + '</div><div class="ac-desc">' + a.desc + '</div>';
        wrap.appendChild(card);
      });
      // Onda 3: modal aberto nunca convive com tooltip pinado
      try { if (typeof hideTip === 'function') hideTip(); } catch (eTipA) {}
      this.el('modal-ach').classList.remove('hidden');
      // U-ASTRO: faixa sunset no cabeçalho (só visual, sem mexer na lista)
      try { uastroEnsureStrip('modal-ach'); } catch (_u) {}
    }
  };
  const S_ENDLESS_UNLOCK_WAVES = 12;


  /* ---- A5: helpers DOM tooltip/overlay (orig scenes.js 4137-4173) ---- */
  /* ---- helpers DOM ---- */
  function showTip(html, pinFor) {
    const tip = document.getElementById('tooltip');
    if (!tip) return;
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    // V5-js: tap (pinFor) fixa o tooltip; hover desktop nao pinna
    if (pinFor) { tip.classList.add('pinned'); tip._pinFor = pinFor; }
    else if (!tip._pinFor) { tip.classList.remove('pinned'); }
  }
  function moveTip(e) {
    const tip = document.getElementById('tooltip');
    if (!tip || tip.classList.contains('hidden')) return;
    // V5-js: flip para dentro da viewport (direita/baixo) + clamp
    let w = 280, h = 120;
    try {
      if (tip.offsetWidth) w = tip.offsetWidth;
      if (tip.offsetHeight) h = tip.offsetHeight;
    } catch (err) {}
    const vw = (typeof window !== 'undefined' && window.innerWidth) || 924;
    const vh = (typeof window !== 'undefined' && window.innerHeight) || 572;
    const cx = (e && e.clientX != null) ? e.clientX : vw / 2;
    const cy = (e && e.clientY != null) ? e.clientY : vh / 2;
    let x = cx + 16, y = cy + 14;
    if (x + w > vw - 8) x = cx - w - 12;
    if (y + h > vh - 8) y = cy - h - 12;
    x = Math.max(8, Math.min(x, Math.max(8, vw - w - 8)));
    y = Math.max(8, Math.min(y, Math.max(8, vh - h - 8)));
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() {
    const tip = document.getElementById('tooltip');
    if (tip) { tip.classList.add('hidden'); tip.classList.remove('pinned'); tip._pinFor = null; }
  }
  function showOverlay(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
  function hideOverlay(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

