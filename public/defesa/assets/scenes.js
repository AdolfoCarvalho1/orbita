/* Defesa Orbital v3 - scenes.js (Brief 08 A5: extracao mecanica de assets/scenes.js, cola: patches _orig/ULTRA 4175-4490 + 4515-4701) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  /* ================= ULTRA VISUAL PATCH ================= */
  (() => {
    const ULTRA_THEMES = {
      'space-station': { base: 0x0a1430, accent: '#38bdf8', nebula: ['#0a1a3a','#050a1a'] },
      'asteroid-field': { base: 0x17101e, accent: '#fbbf24', nebula: ['#1a1200','#0f0a1a'] },
      'solar-furnace': { base: 0x1a0a08, accent: '#fb423c', nebula: ['#2a0a08','#1a0505'] },
      'ion-nebula': { base: 0x08101e, accent: '#22d3ee', nebula: ['#0a1a2a','#050a1e'] },
      'singularity': { base: 0x061006, accent: '#a3e635', nebula: ['#0f1d08','#030703'] }
    };
    Object.assign(THEME_BG, ULTRA_THEMES);
  })();
  const _origMakeTextures = makeTextures;
  makeTextures = function(scene){
    _origMakeTextures(scene);
    // IDENTIDADE UNIFICADA: pixel-art (torres tier, inimigos) + tiles por tema
    if (window.PXART) window.PXART.buildAll(scene);
    if (window.TILES) try{ window.TILES.buildAll(scene); }catch(e){}
    const mk = (key, size, drawFn) => {
      if (scene.textures.exists(key)) return;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      drawFn(g);
      g.generateTexture(key, size, size);
      g.destroy();
    };
    mk('glow', 64, g=>{ for(let i=3;i>=0;i--){ g.fillStyle(0xffffff, 0.07+ i*0.08); g.fillCircle(32,32, 28 - i*6); } });
    mk('flare', 48, g=>{ g.fillStyle(0xffffff,1); g.fillCircle(24,24,3); for(let r=8;r<24;r+=4){ g.fillStyle(0xffffff, 0.15 - r*0.005); g.fillCircle(24,24,r); } g.fillStyle(0xffffff,0.9); g.fillRect(0,23,48,2); g.fillRect(23,0,2,48); });
    // ONDA 5: textura 'trail' removida (órfã, sem consumidores — rg confirmou)
    mk('shock', 80, g=>{ g.lineStyle(2,0xffffff,1); g.strokeCircle(40,40,36); g.lineStyle(1,0xffffff,0.5); g.strokeCircle(40,40,30); });
  };
  const _origBuildStatic = GameScene.prototype.buildStatic;
  GameScene.prototype.buildStatic = function(){
    _origBuildStatic.call(this);
    const theme = THEME_BG[this.S.map.theme] || THEME_BG['space-station'];
    const neb = this.add.graphics().setDepth(1).setAlpha(0.35);
    const c1 = Phaser.Display.Color.HexStringToColor(theme.nebula ? theme.nebula[0] : '#0a1a3a').color;
    const c2 = Phaser.Display.Color.HexStringToColor(theme.nebula ? theme.nebula[1] : '#050a1a').color;
    neb.fillStyle(c1, 0.12); neb.fillCircle(BW*0.25, BH*0.35, 280);
    neb.fillStyle(c2, 0.10); neb.fillCircle(BW*0.75, BH*0.70, 340);
    neb.fillStyle(Phaser.Display.Color.HexStringToColor(theme.accent).color, 0.04); neb.fillCircle(BW*0.5, BH*0.5, 520);
    this.nebulaGfx = neb;
    this.dustA = this.add.tileSprite(BW/2, BH/2, BW, BH, 'soft').setTint(Phaser.Display.Color.HexStringToColor(theme.accent).color).setAlpha(0.018).setScale(6).setDepth(2);
    this.dustB = this.add.tileSprite(BW/2, BH/2, BW, BH, 'soft').setTint(0xffffff).setAlpha(0.012).setScale(8).setDepth(2);
    if(this.gridGfx) this.gridGfx.setAlpha(0.35);
    this.routeParticles = [];
    for(let i=0;i<18;i++){
      const pr = this.add.image(Math.random()*BW, Math.random()*BH, 'dot').setTint(Phaser.Display.Color.HexStringToColor(theme.accent).color).setScale(0.28).setAlpha(0.55).setDepth(6);
      pr.setData('spd', 0.4 + Math.random()*0.9); pr.setData('routeIdx', Math.floor(Math.random()*this.S.routes.length)); pr.setData('t', Math.random());
      this.routeParticles.push(pr);
    }
    if(this.portalCore){
      this.portalCore.setScale(4.2).setAlpha(0.95);
      this.add.image(this.portalPos.x, this.portalPos.y, 'glow').setTint(0x38bdf8).setScale(3.8).setAlpha(0.18).setDepth(4);
      this.portalRing2 = this.add.image(this.portalPos.x, this.portalPos.y, 'ring').setTint(0x22d3ee).setScale(1.6).setAlpha(0.55).setDepth(4);
      this.tweens.add({ targets:this.portalRing2, angle:-360, duration:6000, repeat:-1 });
      this.tweens.add({ targets:this.portalCore, scale:4.6, duration:900, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
    }
  };
  const _origDrawDynamic = GameScene.prototype.drawDynamic;
  GameScene.prototype.drawDynamic = function(){
    _origDrawDynamic.call(this);
    if(this.dustA) this.dustA.tilePositionX += 0.18;
    if(this.dustB) this.dustB.tilePositionX -= 0.11;
    if(this.routeParticles){
      for(const pr of this.routeParticles){
        let t = pr.getData('t') + 0.0018 * pr.getData('spd');
        if(t>1) t-=1; pr.setData('t', t);
        const rid = pr.getData('routeIdx') % this.S.routes.length;
        const pts = this.S.routes[rid]; const total = this.S.routeLengths[rid];
        const pos = D.getPosAtDist(pts, t*total);
        pr.setPosition(pos.x, pos.y);
        pr.setAlpha(0.45 + Math.sin(this.S.time*3 + t*10)*0.25);
      }
    }
    if(this.S.chrono > 0){ this.cameras.main.setZoom(1 + this.S.chrono*0.12); } else { this.cameras.main.setZoom(1); }
  };
  const _origSyncEnemies = GameScene.prototype.syncEnemies;
  GameScene.prototype.syncEnemies = function(){
    _origSyncEnemies.call(this);
    // ONDA 4 (perf): eid→entidade num Map reutilizado (O(n)/frame). Antes: find() O(n) por view = O(n²).
    const em = this._enemyEntMap || (this._enemyEntMap = new Map());
    em.clear();
    for(let i=0;i<this.S.enemies.length;i++){ const en=this.S.enemies[i]; em.set(String(en.eid), en); }
    for(const eid in this.enemyViews){
      const v = this.enemyViews[eid];
      const e = em.get(eid);
      if(!e) continue;
      if(e.flying && !v.exhaust){
        v.exhaust = this.add.image(0,0,'soft').setTint(0x38bdf8).setScale(0.55).setAlpha(0.45).setDepth(35);
        v.root.addAt(v.exhaust, 0);
      }
      if(v.exhaust){ v.exhaust.setVisible(!!e.flying && !e.dead); if(e.flying) v.exhaust.setPosition(-Math.cos(e.dirAngle)* (e.r*0.9), -Math.sin(e.dirAngle)*(e.r*0.9)); }
      if(e.poisonTimer>0 && !v.poisonAura){
        v.poisonAura = this.add.image(0,0,'glow').setTint(0xa3e635).setScale(e.r/14).setAlpha(0.22).setDepth(36);
        v.root.add(v.poisonAura);
      }
      if(v.poisonAura) v.poisonAura.setVisible(e.poisonTimer>0);
      if(e.burnTimer>0 && !v.burnAura){
        v.burnAura = this.add.image(0,0,'glow').setTint(0xfb923c).setScale(e.r/14).setAlpha(0.28).setDepth(36);
        v.root.add(v.burnAura);
      }
      if(v.burnAura) v.burnAura.setVisible(e.burnTimer>0);
      if(e.maxShield>0 && !v.shieldBubble){
        v.shieldBubble = this.add.image(0,0,'ring').setTint(0x60a5fa).setScale(e.r/14).setAlpha(0.85).setDepth(37);
        v.root.add(v.shieldBubble);
      }
      if(v.shieldBubble) { const hasShield = e.shield>0; v.shieldBubble.setVisible(hasShield); if(hasShield) v.shieldBubble.setScale(e.r/14 + Math.sin(this.S.time*4)*0.06); }
      if(e.cryoVuln>0) v.body.setTint(0xbfdbfe);
    }
  };
  const _origSyncTowers = GameScene.prototype.syncTowers;
  GameScene.prototype.syncTowers = function(){
    _origSyncTowers.call(this);
    // ONDA 4 (perf): tid→torre num Map reutilizado (O(n)/frame). Antes: find() O(n) por view = O(n²).
    const tm = this._towerEntMap || (this._towerEntMap = new Map());
    tm.clear();
    for(let i=0;i<this.S.towers.length;i++){ const tt=this.S.towers[i]; tm.set(String(tt.tid), tt); }
    for(const tid in this.towerViews){
      const v = this.towerViews[tid];
      const t = tm.get(tid);
      if(!t) continue;
      if(t.level>=4 && !v.ultraGlow){
        v.ultraGlow = this.add.image(v.tur.x, v.tur.y, 'glow').setTint(Phaser.Display.Color.HexStringToColor(t.defRef.color).color).setScale(1.7 + Math.min(t.level,30)*0.04).setAlpha(0.16).setDepth(29);
      }
      if(v.ultraGlow) {
        v.ultraGlow.setPosition(v.tur.x, v.tur.y);
        v.ultraGlow.setAlpha(0.12 + Math.sin(this.S.time*2 + t.tid)*0.06 + t.level*0.02);
        v.ultraGlow.setScale(1.7 + Math.min(t.level,30)*0.035 + Math.sin(this.S.time*1.2)*0.06);
      }
      if(this.S.powers && this.S.powers.overdrive && this.S.powers.overdrive.dur>0){
        if(!v.odFlame){ v.odFlame = this.add.image(v.tur.x, v.tur.y, 'soft').setTint(0xfb923c).setScale(0.9).setAlpha(0.0).setDepth(32); }
        v.odFlame.setPosition(v.tur.x, v.tur.y); v.odFlame.setAlpha(0.35 + Math.random()*0.2); v.odFlame.setScale(0.8 + Math.random()*0.4);
      } else if(v.odFlame){ // ONDA 5: overdrive terminou — destrói (antes só setAlpha(0) e ficava preso na cena)
        v.odFlame.destroy(); v.odFlame = null;
      }
    }
  };
  const _origSyncProjectiles = GameScene.prototype.syncProjectiles;
  GameScene.prototype.syncProjectiles = function(){
    for(const pr of this.S.projectiles){
      if(pr.delay>0) continue;
      if(pr.kind==='missile' && !pr._trail){ pr._trail = []; }
      if(pr.kind==='missile' && pr._trail){ pr._trail.push({x:pr.x, y:pr.y, life:0.22}); if(pr._trail.length>6) pr._trail.shift(); }
      if(pr.kind==='bullet' && !pr._btrail){ pr._btrail = []; }
      if(pr.kind==='bullet' && pr._btrail){ pr._btrail.push({x:pr.x, y:pr.y, life:0.10}); if(pr._btrail.length>3) pr._btrail.shift(); }
    }
    _origSyncProjectiles.call(this);
    if(this.beamGfx){
      const _dt = this._effDt != null ? this._effDt : 0.016;
      for(const pr of this.S.projectiles){
        if(pr._trail){
          for(let i=0;i<pr._trail.length;i++){
            const pt = pr._trail[i]; pt.life -= _dt;
            const a = Math.max(0, pt.life/0.22);
            this.beamGfx.fillStyle(0xfb923c, a*0.5); this.beamGfx.fillCircle(pt.x, pt.y, 4*(a));
          }
          pr._trail = pr._trail.filter(p=>p.life>0);
        }
        if(pr._btrail){ for(const pt of pr._btrail){ pt.life -= _dt; } pr._btrail = pr._btrail.filter(p=>p.life>0); }
        if(pr._img){ if(pr.kind==='missile') pr._img.setScale(0.62 + Math.sin(this.S.time*12)*0.06); }
      }
    }
  };
  const _origHandleEvent = GameScene.prototype.handleEvent;
  GameScene.prototype.handleEvent = function(e){
    if(e.t==='combo'){
      const bar = document.getElementById('combo-wrap');
      const cnt = document.getElementById('combo-count');
      const fill = document.getElementById('combo-fill');
      const mult = document.getElementById('combo-mult');
      if(bar && cnt){
        bar.classList.add('show');
        cnt.textContent = '×'+e.n;
        cnt.style.transform = 'scale(1.18)'; setTimeout(()=> cnt.style.transform='scale(1)', 120);
        if(fill) fill.style.width = Math.min(100, (e.n/D.COMBO.maxStacks)*100)+'%';
        if(mult) mult.textContent = '+'+Math.round((e.mult-1)*100)+'% BÔNUS OURO';
        try{ SND.combo(e.n); }catch(_){}
        const kf = document.getElementById('killfeed');
        if(kf && e.n>=5 && e.n%3===0){
          const el=document.createElement('div'); el.className='kf-item';
          el.textContent = 'COMBO ×'+e.n + '  +' + Math.round((e.mult-1)*100)+'%';
          el.style.borderColor = e.n>=15 ? '#fbbf24' : e.n>=10 ? '#fb923c' : '#38bdf8';
          kf.appendChild(el); setTimeout(()=> el.remove(), 2300); if(kf.children.length>5) kf.firstChild.remove();
        }
        if(this._comboHide) clearTimeout(this._comboHide);
        this._comboHide = setTimeout(()=> bar.classList.remove('show'), 2200);
      }
      return;
    }
    if(e.t==='comboBreak'){
      const bar=document.getElementById('combo-wrap');
      if(bar) bar.classList.remove('show');
      try{ SND.comboBreak(); }catch(_){}
      const cnt=document.getElementById('combo-count');
      if(cnt) cnt.textContent='×0';
      return;
    }
    if(e.t==='mutation'){ this.showMutation(e.choices, e.wave); return; }
    if(e.t==='mutPicked'){
      const kf=document.getElementById('killfeed');
      if(kf){ const el=document.createElement('div'); el.className='kf-item'; el.textContent = e.icon+' '+e.name; el.style.borderColor = e.col; el.style.color = e.col; kf.appendChild(el); setTimeout(()=> el.remove(), 2800); }
      return;
    }
    if(e.t==='bossDeath'){
      const flare = this.add.image(e.x, e.y, 'flare').setTint(0xffffff).setScale(1.2).setAlpha(0.9).setDepth(85);
      this.tweens.add({ targets:flare, alpha:0, scale:2.8, duration:420, ease:'Cubic.easeOut', onComplete:()=> flare.destroy() });
      try{ SND.bossDeath(); }catch(_){}
    }
    return _origHandleEvent.call(this, e);
  };
  GameScene.prototype.showMutation = function(choices, wave){
    const modal = document.getElementById('modal-mut');
    const grid = document.getElementById('mut-grid');
    const wEl = document.getElementById('mut-wave');
    if(!modal || !grid) { applyMutation(this.S, choices[0].id); return; }
    if(wEl) wEl.textContent = String(wave);
    grid.innerHTML='';
    choices.forEach(mut=>{
      const card=document.createElement('div');
      card.className='mut-card chamf';
      card.style.setProperty('--mc', mut.color);
      // V1-js: mut-cards operáveis por teclado
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.setAttribute('aria-label', mut.name + '. ' + mut.desc);
      card.innerHTML = '<div style="font-size:22px">'+mut.icon+'</div><h3>'+mut.name+'</h3><p>'+mut.desc+'</p><span class="mut-tag">'+mut.tag+'</span>';
      const pickMut = ()=>{ if(applyMutation(this.S, mut.id)){ modal.classList.add('hidden'); this.paused=false; }};
      card.addEventListener('click', pickMut);
      card.addEventListener('keydown', (e)=>{ if(e.key!=='Enter'&&e.key!==' ') return; e.preventDefault(); pickMut(); });
      grid.appendChild(card);
    });
    const skip=document.getElementById('mut-skip');
    if(skip){
      const nSkip = skip.cloneNode(true);
      skip.parentNode.replaceChild(nSkip, skip);
      nSkip.addEventListener('click', ()=>{ skipMutation(this.S); modal.classList.add('hidden'); this.paused=false; });
    }
    modal.classList.remove('hidden');
    this.paused = true;
  };
  const _origConsumeEvents = GameScene.prototype.consumeEvents;
  GameScene.prototype.consumeEvents = function(){
    for(const e of this.S.events) this.handleEvent(e);
    this.S.events.length=0;
  };
  const _origUpdate = GameScene.prototype.update;
  GameScene.prototype.update = function(_, dms){
    if(this.S && this.S.pendingMut){
      this.dashOffset += dms*0.06;
      this.updateParticles(dms/1000 *0.3);
      this.drawDynamic();
      this.syncHud();
      return;
    }
    return _origUpdate.call(this, _, dms);
  };
  const _origSyncHud = GameScene.prototype.syncHud;
  GameScene.prototype.syncHud = function(){
    _origSyncHud.call(this);
    const S=this.S; const el=id=>document.getElementById(id);
    const ring=el('wave-ring');
    if(ring){
      if(S.state==='combat'){
        const pct = Math.round(100 * (1 - S.waveQueue.length / Math.max(1, this._waveTotal||1)));
        // Brief 07 A8: a base já escreveu sua versão; esta (final no DOM) só reescreve quando o % muda
        if (this._ringKey2 !== pct) {
          this._ringKey2 = pct;
          ring.style.setProperty('--wpct', pct+'%');
          ring.style.background = 'conic-gradient(#38bdf8 '+pct+'%, rgba(56,189,248,0.12) 0)';
        }
      } else if(S.state==='mutate'){
        if (this._ringKey2 !== 'mut') {
          this._ringKey2 = 'mut';
          ring.style.background='conic-gradient(#a3e635 100%, rgba(56,189,248,0.12) 0)';
          const cc=el('countdown-chip'); if(cc) cc.textContent='⬢ ESCOLHA UMA MUTAÇÃO';
        }
      } else if (this._ringKey2 !== null && this._ringKey2 !== undefined) {
        this._ringKey2 = null; // idle/vitória/derrota: a base é dona do anel; rearma p/ próxima transição
      }
    }
    const fill=document.getElementById('combo-fill');
    if(S.combo>0 && fill){
      const pct = Math.max(0, S.comboTimer / D.COMBO.window *100);
      const w = Math.round(pct * 10) / 10;
      const tier = S.combo>=15 ? 2 : S.combo>=10 ? 1 : 0;
      if (this._cfW !== w) { this._cfW = w; fill.style.width = pct+'%'; }
      if (this._cfT !== tier) {
        this._cfT = tier;
        fill.style.background = tier === 2 ? 'linear-gradient(90deg, #fbbf24, #f43f5e)' : tier === 1 ? 'linear-gradient(90deg, #fbbf24, #fb923c)' : 'linear-gradient(90deg, #38bdf8, #34d399)';
        const bar=document.getElementById('combo-wrap'); if(bar) bar.classList.add('show');
      }
    } else if(fill && S.combo===0){ if (this._cfW !== 0) { this._cfW = 0; this._cfT = -1; fill.style.width='0%'; } }
  };
  const _origBoomFx = GameScene.prototype.boomFx;
  GameScene.prototype.boomFx = function(x,y,r,col,big){
    _origBoomFx.call(this,x,y,r,col,big);
    const shock = this.getImg('shock');
    shock.setTexture('shock').setTint(Phaser.Display.Color.HexStringToColor(col).color).setPosition(x,y).setScale(0.2).setAlpha(0.7);
    shock.setData('life', 0.42); shock.setData('tot',0.42); shock.setData('vx',0); shock.setData('vy',0); shock.setData('grow', (r/18));
    if(!shock._inLayer){ this.fxOver.add(shock); shock._inLayer=true; }
    if(big){
      const flare=this.add.image(x,y,'flare').setTint(0xffffff).setScale(0.8).setAlpha(0.75).setDepth(75);
      this.tweens.add({ targets:flare, alpha:0, scale:1.8, duration:260, onComplete:()=> flare.destroy() });
      this.cameras.main.flash(120, 255,255,255, false);
    }
  };
  const _origMenuCreate = MenuScene.prototype.create;
  MenuScene.prototype.create = function(){
    _origMenuCreate.call(this);
    for(let i=0;i<4;i++){
      const s = this.add.image(Math.random()*BW, Math.random()*BH*0.6, 'soft').setTint(0xffffff).setScale(0.18).setAlpha(0);
      const delay = i*1200 + Math.random()*2000;
      this.time.delayedCall(delay, ()=>{
        const doShoot = ()=>{
          s.setPosition(Math.random()*BW*0.3, Math.random()*BH*0.4); s.setAlpha(0);
          this.tweens.add({ targets:s, x: s.x+ 340, y: s.y+ 170, alpha:0.9, duration:650 + Math.random()*400, ease:'Cubic.easeIn',
            onComplete:()=>{ s.setAlpha(0); this.time.delayedCall(1500+Math.random()*3000, doShoot); } });
        };
        s.setPosition(Math.random()*BW*0.3, Math.random()*BH*0.4);
        this.tweens.add({ targets:s, x: s.x+ 320, y: s.y+ 160, alpha:0.85, duration:600, ease:'Cubic.easeIn', onComplete: doShoot });
      });
    }
    const planet = this.add.image(BW/2, 86, 'soft').setTint(0x38bdf8).setScale(9).setAlpha(0.07).setDepth(-1);
    this.tweens.add({ targets:planet, scale:9.6, duration:3200, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
  };

  /* ================= TEMA: NAVES MÓVEIS + TERRA + SISTEMA SOLAR ================= */

  /* ---- A5: patches (orig scenes.js 4515-4701; moveTower 4491-4514 e TASK6 4703-4725 vivem em sim.js) ---- */
  // export (adiado)
  // Patch stepSim to decrement moveCd
  const _origStepSim2 = stepSim;
  stepSim = function(S, dt){
    const res = _origStepSim2(S, dt);
    // decrement move cooldowns (stepSim already did time, but we need extra)
    if(S.towers) for(const t of S.towers){ if(t.moveCd>0) t.moveCd=Math.max(0,t.moveCd-dt); }
    return res;
  };
  // stepSim patch adiado

  // Extend THEME_BG with solar system
  Object.assign(THEME_BG, {
    'neptune-frontier': { base: 0x051425, accent: '#38bdf8', nebula: ['#0a1a3a','#051425'] },
    'saturn-rings': { base: 0x1a1408, accent: '#fbbf24', nebula: ['#2a1a08','#1a1408'] },
    'jupiter-orbit': { base: 0x1a0f08, accent: '#fb923c', nebula: ['#2a1408','#1a0f08'] },
    'asteroid-belt': { base: 0x0f0a14, accent: '#94a3b8', nebula: ['#1a0f1a','#0f0a14'] },
    'earth-orbit': { base: 0x051425, accent: '#22d3ee', nebula: ['#0a1a3a','#051425'] }
  });

  // Make earth texture — MAIOR E MAIS BONITO (pixel art detalhado, menos monocromático)
  const _origMakeTextures2 = makeTextures;
  makeTextures = function(scene){
    _origMakeTextures2(scene);
    // ONDA 4: textura determinística — só gera se faltar (Boot→Menu→Game não regenera)
    if(scene.textures.exists('earth')) return;
    const g = scene.make.graphics({x:0,y:0,add:false});
    // Terra pixel art 96x96: oceano azul profundo + continentes verdes + deserto + gelo + nuvens + brilho atmosférico
    g.fillStyle(0x0f1a3a,1); g.fillCircle(48,48,42);
    g.fillStyle(0x1e40af,1); g.fillCircle(48,48,40);
    g.fillStyle(0x1e3a8a,0.6); g.fillCircle(48,48,38);
    // continentes principais
    g.fillStyle(0x22c55e,0.98);
    g.fillCircle(36,40,14); g.fillCircle(60,52,11); g.fillCircle(42,62,8); g.fillCircle(64,34,7); g.fillCircle(50,70,6);
    // montanhas/deserto
    g.fillStyle(0xa3a04a,0.85); g.fillCircle(40,38,5); g.fillCircle(58,60,4);
    // gelo polar
    g.fillStyle(0xffffff,0.92); g.fillCircle(48,16,10); g.fillCircle(48,80,7);
    // nuvens brancas pixeladas
    g.fillStyle(0xffffff,0.22); g.fillCircle(30,30,16); g.fillCircle(66,42,12); g.fillCircle(38,58,10);
    g.fillStyle(0xffffff,0.14); g.fillCircle(52,26,8); g.fillCircle(60,68,6);
    // atmosfera cyan + borda
    g.lineStyle(3,0x38bdf8,0.95); g.strokeCircle(48,48,42);
    g.lineStyle(2,0x22d3ee,0.55); g.strokeCircle(48,48,45);
    g.lineStyle(1,0xffffff,0.22); g.strokeCircle(48,48,38);
    // brilho specular
    g.fillStyle(0xffffff,0.18); g.fillCircle(32,32,18);
    // ONDA 5 (SUNSET/pixel art): contorno preto de 1px lógico por fora da atmosfera, sem redesenhar a identidade
    g.lineStyle(2,0x000000,1); g.strokeCircle(48,48,46);
    g.generateTexture('earth',96,96); g.destroy();
    // ONDA 5: textura 'star2' removida (órfã, sem consumidores — rg confirmou)
  };

  // Patch GameScene buildStatic to use Earth
  const _origBuildStatic2 = GameScene.prototype.buildStatic;
  GameScene.prototype.buildStatic = function(){
    _origBuildStatic2.call(this);
    // substitui portal por Terra
    if(this.portalCore){ this.portalCore.destroy(); this.portalRing.destroy(); if(this.portalRing2) this.portalRing2.destroy(); }
    const p = this.portalPos;
    // Terra GIGANTE E MAIS BONITA — escala 2.8x, glow duplo e anéis com pixel art
    this.earth = this.add.image(p.x, p.y, 'earth').setScale(2.65).setDepth(5);
    this.earthGlow = this.add.image(p.x, p.y, 'glow').setTint(0x22d3ee).setScale(6.0).setAlpha(0.24).setDepth(4);
    this.earthRing = this.add.image(p.x, p.y, 'ring').setTint(0x38bdf8).setScale(4.2).setAlpha(0.60).setDepth(6);
    this.earthRing2 = this.add.image(p.x, p.y, 'ring').setTint(0x60a5fa).setScale(5.0).setAlpha(0.26).setDepth(5);
    // anel extra dourado para contraste
    this.earthRing3 = this.add.image(p.x, p.y, 'ring').setTint(0xfbbf24).setScale(2.9).setAlpha(0.18).setDepth(6);
    this.tweens.add({targets:this.earthRing, angle:360, duration:14000, repeat:-1});
    this.tweens.add({targets:this.earthRing2, angle:-360, duration:22000, repeat:-1});
    this.tweens.add({targets:this.earthRing3, angle:360, duration:18000, repeat:-1});
    this.tweens.add({targets:this.earth, angle:2, duration:3000, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
    this.tweens.add({targets:this.earthGlow, alpha:0.28, scale:6.4, duration:1600, yoyo:true, repeat:-1});
    this.tweens.add({targets:this.earth, scale:2.75, duration:2200, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
    // Texto TERRA maior e mais visível
    this.add.text(p.x, p.y+62, 'T E R R A', {fontFamily:'Orbitron', fontSize:'13px', color:'#38bdf8', fontStyle:'bold'}).setOrigin(0.5).setDepth(7).setAlpha(0.95).setShadow(0,0,'#38bdf8',12,true,true);
    // Atualiza portalPos refs
    this.portalCore = this.earth; this.portalRing = this.earthRing;
  };

  // Patch GameScene to support movimento
  GameScene.prototype.getMoveCells = function(t){
    const res=[];
    const range = t.moveRange || t.defRef.mobility || 3;
    for(let dc=-range; dc<=range; dc++) for(let dr=-range; dr<=range; dr++){
      if(Math.abs(dc)+Math.abs(dr)===0 || Math.abs(dc)+Math.abs(dr)>range) continue;
      const nc=t.c+dc, nr=t.r+dr;
      if(nc<0||nc>=COLS||nr<0||nr>=ROWS) continue;
      const key=nc+','+nr;
      if(this.S.blocked[key] || this.S.occupied[key]) continue;
      res.push({c:nc,r:nr,x:nc*CELL+CELL/2,y:nr*CELL+CELL/2});
    }
    return res;
  };
  const _origDrawDynamic2 = GameScene.prototype.drawDynamic;
  GameScene.prototype.drawDynamic = function(){
    _origDrawDynamic2.call(this);
    // highlight de movimento quando nave selecionada
    if(this.selected && this.selected.moveCd!==undefined){
      const cells = this.getMoveCells(this.selected);
      const g=this.uiGfx;
      // desenha alcance de movimento em verde/azul
      for(const cell of cells){
        const alpha = this.selected.moveCd>0 ? 0.08 : 0.18;
        const col = this.selected.moveCd>0 ? 0xf43f5e : 0x34d399;
        g.fillStyle(col, alpha);
        g.fillRect(cell.c*CELL+2, cell.r*CELL+2, CELL-4, CELL-4);
        g.lineStyle(1.2, col, this.selected.moveCd>0 ? 0.3 : 0.9);
        g.strokeRect(cell.c*CELL+2, cell.r*CELL+2, CELL-4, CELL-4);
      }
      // cooldown no painel?
    }
  };
  const _origBindInput2 = GameScene.prototype.bindInput;
  GameScene.prototype.bindInput = function(){
    // chama original mas vamos interceptar pointerdown para movimento
    const origHandler = this.input._events ? null : null; // placeholder
    _origBindInput2.call(this);
    // sobrescreve o listener de pointerdown para adicionar movimento
    this.input.off('pointerdown');
    this.input.on('pointerdown', p=>{
      SND.unlock();
      if(this.paused) return;
      const wx = p.worldX!=null? p.worldX: p.x;
      const wy = p.worldY!=null? p.worldY: p.y;
      if(this.armed){ applySuper(this.S, this.armed, wx, wy); this.armed=null; return; }
      if(p.event && p.event.target !== this.game.canvas) return;
      const c=Math.floor(wx/CELL), r=Math.floor(wy/CELL);
      // se tem nave selecionada e clicou em célula de movimento válida, move
      if(this.selected){
        const moveCells = this.getMoveCells(this.selected);
        const target = moveCells.find(cell=> cell.c===c && cell.r===r);
        if(target){
          if(moveTower(this.S, this.selected, c, r)){
            this.showTowerPanel(this.selected);
            this.syncTowers();
            return;
          }
        }
      }
      if(this.placingId){
        const t=placeTower(this.S,c,r,this.placingId);
        // M1 (brief 09): pos-compra limpa selecao e esconde o painel (unico p/ desktop+mobile)
        if(t){ this.placingId=null; this.selected=null; this.refreshShopSel(); this.hideTowerPanel(); try{ if(typeof hideTip==='function') hideTip(); }catch(_e){} }
        return;
      }
      const key=c+','+r;
      if(this.S.occupied[key]){
        this.selected=this.S.occupied[key];
        this.showTowerPanel(this.selected);
        SND.ui();
      } else {
        this.selected=null;
        this.hideTowerPanel();
      }
    });
  };
  // Patch showTowerPanel para mostrar mobilidade e cooldown
  const _origShowPanel = GameScene.prototype.showTowerPanel;
  GameScene.prototype.showTowerPanel = function(t){
    _origShowPanel.call(this,t);
    if(t.defRef && t.defRef.kind === 'factory') return; // v3 PIXEL FASE 5: painel da fábrica não recebe extras
    const specBox=this.el('tp-specs');
    // adiciona info de mobilidade após specs
    const mob = t.moveRange || t.defRef.mobility || 3;
    const cd = t.moveCd||0;
    const extra = document.createElement('div');
    extra.style.cssText='margin-top:6px;padding:6px 8px;background:rgba(52,211,153,.07);border:1px solid rgba(52,211,153,.18);font-size:11px;line-height:1.3';
    extra.innerHTML = `⭢ <b style="color:#34d399">NAVE MÓVEL</b> • Alcance <b>${mob} casas</b> • ${cd>0? '<span style="color:#f43f5e">Recarga '+cd.toFixed(1)+'s</span>' : '<span style="color:#34d399">Pronta pra mover</span>'}<br><span style="color:var(--muted)">Clique numa casa verde ao redor para mover (custo 8 créditos)</span>`;
    // evita duplicar
    const old = specBox.querySelector('.mob-info');
    if(old) old.remove();
    extra.className='mob-info';
    specBox.appendChild(extra);
    // SKILLS: mostra as desbloqueadas (lvl 4,8,12...)
    const def = t.defRef || t.def;
    if(def && def.skills && def.skills.length){
      const skBox = document.createElement('div');
      skBox.style.cssText='margin-top:6px;padding:6px 8px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.16);font-size:11px;line-height:1.5';
      const unlocked = def.skills.filter(s=>t.level>=s.lvl);
      const next = def.skills.find(s=>t.level<s.lvl);
      skBox.innerHTML = '<div style="color:var(--gold,#fbbf24);font-weight:700;margin-bottom:3px">✦ SKILLS DA NAVE</div>' +
        (unlocked.length ? unlocked.map(s=>`<div style="color:#fbbf24">✔ <b>NV${s.lvl}</b> — ${s.name}</div>`).join('') : '<div style="color:var(--muted,#8fa3c4)">Nenhuma skill desbloqueada ainda</div>') +
        (next ? `<div style="color:var(--muted,#8fa3c4);margin-top:2px">Próxima: <b style="color:#e8eefc">NV${next.lvl}</b> — ${next.name}</div>` : '<div style="color:#34d399;margin-top:2px">Todas as skills desbloqueadas!</div>');
      const oldSk = specBox.querySelector('.skills-info');
      if(oldSk) oldSk.remove();
      skBox.className='skills-info';
      specBox.appendChild(skBox);
    }
  };



  /* ================= S3 SUNSET: fundo do menu (lua + nuvens + horizonte + brasas) ================= */
  // Direção de arte: pôr-do-sol cinematográfico atrás do DOM do menu. PROIBIDO ROXO.
  // Paleta: ink #0d1220, skyDeep #1c2b4d, skyDusk #33456b, cream #f6e7cb, moon #ffe9bd,
  // amber #f5a83d, ember #e0512b. Só visual: reusa texturas/tweens existentes, sem lógica nova.
  // reduced-motion: o código não trata em JS (só CSS); por contrato não há sistema novo —
  // o desenho estático sustenta a cena e os tweens seguem o padrão sutil existente.
  const _origMenuCreateS3 = MenuScene.prototype.create;
  MenuScene.prototype.create = function(){
    _origMenuCreateS3.call(this);
    const S3_INK = 0x0d1220, S3_DEEP = 0x1c2b4d, S3_DUSK = 0x33456b;
    const S3_CREAM = 0xf6e7cb, S3_MOON = 0xffe9bd, S3_AMBER = 0xf5a83d, S3_EMBER = 0xe0512b;
    // Céu crepuscular em faixas (depth negativo: atrás de estrelas/planetes/DOM)
    const sky = this.add.graphics().setDepth(-10);
    sky.fillStyle(S3_DEEP, 1); sky.fillRect(0, 0, BW, BH*0.55);
    sky.fillStyle(S3_DUSK, 1); sky.fillRect(0, BH*0.45, BW, BH*0.30);
    sky.fillStyle(S3_AMBER, 0.16); sky.fillRect(0, BH*0.66, BW, BH*0.12);
    // Lua grande: textura 'moon' (S2) se existir, senão disco radial via Graphics
    if (this.textures.exists('moon')) {
      this.add.image(BW*0.72, BH*0.30, 'moon').setDepth(-9).setAlpha(0.95);
      this.add.image(BW*0.72, BH*0.30, 'soft').setTint(S3_MOON).setScale(7).setAlpha(0.16).setDepth(-9);
    } else {
      const halo = this.add.image(BW*0.72, BH*0.30, 'soft').setTint(S3_MOON).setScale(7.5).setAlpha(0.18).setDepth(-9);
      const disc = this.add.graphics().setDepth(-9);
      disc.fillStyle(S3_MOON, 0.16); disc.fillCircle(BW*0.72, BH*0.30, 86);
      disc.fillStyle(S3_MOON, 0.28); disc.fillCircle(BW*0.72, BH*0.30, 68);
      disc.fillStyle(S3_CREAM, 0.95); disc.fillCircle(BW*0.72, BH*0.30, 52);
      this.tweens.add({ targets: halo, alpha: 0.24, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // 3 faixas de nuvens: elipses creme semi-transparentes com borda quente âmbar na base
    const clouds = [
      { x: BW*0.30, y: BH*0.40, sx: 11, sy: 1.6, a: 0.13 },
      { x: BW*0.68, y: BH*0.52, sx: 13, sy: 1.9, a: 0.15 },
      { x: BW*0.44, y: BH*0.63, sx: 10, sy: 1.4, a: 0.12 }
    ];
    clouds.forEach((c, i) => {
      const body = this.add.image(c.x, c.y, 'soft').setTint(S3_CREAM).setScale(c.sx, c.sy).setAlpha(c.a).setDepth(-8);
      this.add.image(c.x, c.y + 10, 'soft').setTint(S3_AMBER).setScale(c.sx*0.9, c.sy*0.45).setAlpha(0.10).setDepth(-8);
      this.tweens.add({ targets: body, x: c.x + 22, duration: 9000 + i*2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    // Brilho de horizonte na base + colinas em silhueta
    this.add.image(BW/2, BH*0.94, 'soft').setTint(S3_AMBER).setScale(22, 3.2).setAlpha(0.16).setDepth(-7);
    this.add.image(BW/2, BH*0.97, 'soft').setTint(S3_EMBER).setScale(18, 2.2).setAlpha(0.12).setDepth(-7);
    const hills = this.add.graphics().setDepth(-7);
    hills.fillStyle(S3_INK, 0.92);
    hills.fillEllipse(BW*0.18, BH*1.06, BW*0.55, BH*0.22);
    hills.fillEllipse(BW*0.82, BH*1.08, BW*0.65, BH*0.26);
    // ~14 brasas à deriva (mesmo padrão das estrelas cadentes: tweens + delayedCall, lento e sutil)
    const EMBER_TINTS = [S3_EMBER, S3_AMBER, 0xfbbf24];
    for (let i = 0; i < 14; i++) {
      const e = this.add.image(Math.random()*BW, BH*0.35 + Math.random()*BH*0.6, 'dot').setTint(EMBER_TINTS[i % EMBER_TINTS.length]).setScale(0.35 + Math.random()*0.3).setAlpha(0).setDepth(-6);
      const drift = () => {
        e.setPosition(Math.random()*BW, BH*0.75 + Math.random()*BH*0.22);
        e.setAlpha(0);
        this.tweens.add({ targets: e, x: e.x + (Math.random()-0.5)*40, y: e.y - (50 + Math.random()*70), alpha: 0.45 + Math.random()*0.2, duration: 3800 + Math.random()*3200, ease: 'Sine.easeOut',
          onComplete: () => { e.setAlpha(0); this.time.delayedCall(600 + Math.random()*2200, drift); } });
      };
      this.time.delayedCall(Math.random()*3000, drift);
    }
  };

  /* ================= U-ASTRO: o astronauta solitário nos modais (só visual) ================= */
  // Direção de arte: mesmo idioma sunset, sem roxo. Vitória = em pé + lua;
  // derrota = sentado sozinho (solidão), diagnóstico mantido. Tudo canvas 2D procedural.
  function uastroPaintScene(canvas, key, scale, mound) {
    try {
      if (canvas && window.PXART && window.PXART.paintOn) {
        window.PXART.paintOn(canvas, key, { scale: scale, mound: mound });
        return true;
      }
    } catch (e) {}
    return false;
  }
  const _origShowEndU = GameScene.prototype.showEndModal;
  GameScene.prototype.showEndModal = function(){
    _origShowEndU.call(this);
    try {
      const victory = this.S && this.S.result && this.S.result.outcome === 'victory';
      const modal = document.getElementById('modal-end');
      const box = modal && modal.querySelector('.modal-box');
      if (!box) return;
      box.classList.add('uastro');
      let hero = document.getElementById('end-astro');
      if (!hero) {
        hero = document.createElement('div');
        hero.id = 'end-astro';
        hero.className = 'uastro-strip uastro-hero';
        hero.setAttribute('aria-hidden', 'true');
        const cv = document.createElement('canvas');
        cv.width = 72; cv.height = 64;
        hero.appendChild(cv);
        const title = document.getElementById('end-title');
        box.insertBefore(hero, title);
      }
      hero.setAttribute('data-mood', victory ? 'victory' : 'defeat');
      const cv = hero.querySelector('canvas');
      if (cv) uastroPaintScene(cv, victory ? 'astro_stand' : 'astro_sit', 4, false);
      // U3: título creme sob a faixa horizonte âmbar (coerente menu/board)
      const title = document.getElementById('end-title');
      if (title) title.style.color = '#f6e7cb';
    } catch (e) {}
  };
  const _origTogglePauseU = GameScene.prototype.togglePause;
  GameScene.prototype.togglePause = function(){
    _origTogglePauseU.call(this);
    try {
      const ov = document.getElementById('pause-overlay');
      if (!ov || ov.classList.contains('hidden')) return;
      const box = ov.querySelector('.modal-box');
      if (box) box.classList.add('uastro');
      const cv = document.getElementById('astro-pause');
      if (cv) uastroPaintScene(cv, 'astro_sit', 4, false);
    } catch (e) {}
  };

  /* ---- boot ---- */
  const gameConfig = {
    type: Phaser.AUTO,
    width: BW,
    height: BH,
    parent: 'game-canvas',
    pixelArt: true, // ONDA 4: nearest + roundPixels (1px lógico = 3px reais, sem borrão)
    backgroundColor: '#050914',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, GameScene]
  };

  let booted = false;
  function boot() {
    if (booted) return true;
    if (typeof Phaser === 'undefined' || !Phaser.Game || !Phaser.VERSION) return false;
    if (typeof document === 'undefined' || !document.getElementById('game-canvas')) return false;
    window.__game = new Phaser.Game(gameConfig);
    booted = true;
    return true;
  }
  boot();

  /* ---- API de teste (headless / smoke) ---- */
  window.DO = {
    D,
    startNewGame, startNextWave, onWaveCleared, stepSim,
    spawnEnemy, killEnemy, damageEnemy,
    getTowerStats, findBestTarget, canHitAir,
    placeTower, upgradeTower, sellTower, setSpec, cycleTargetMode,
    applySuper, unlockAchievement, applyMutation, skipMutation,
    peekNextWave, waveSummary, computeDps
  };
  // ULTRA: exporta moveTower e stepSim patchado
  window.DO.moveTower = moveTower;
  window.DO.stepSim = stepSim;
  // v3 PIXEL FASES 2-7: exports novos
  window.DO.mergeTowers = mergeTowers;
  window.DO.mergeWithPurchase = mergeWithPurchase;
  window.DO.mergePurchaseQuote = mergePurchaseQuote;
  window.DO.tierEntryPrice = tierEntryPrice;
  window.DO.canMerge = canMerge;
  window.DO.mergeCandidates = mergeCandidates;
  window.DO.tierCap = tierCap;
  window.DO.getTier = D.getTier;
  window.DO.getSuperCharge = getSuperCharge;
  window.DO.forceSuperCharge = forceSuperCharge;
  window.DO.fireTower = fireTower;
  window.DO.upgradeEnemyHP = upgradeEnemyHP;
  window.DO.upgradeFactory = upgradeFactory;
  window.DO.hpMultiplier = hpMultiplier;
  window.DO.finalizeEnd = finalizeEnd;
  window.DO.continueEndlessAfterVictory = continueEndlessAfterVictory;
  window.DO.isMapUnlocked = isMapUnlocked;
  window.DO.syncMapCardState = syncMapCardState;
  window.DO.toggleAutoMove = toggleAutoMove; // G10
  window.DO.fireAutoSuperIfReady = fireAutoSuperIfReady; // G2 (teste do super da amp)
