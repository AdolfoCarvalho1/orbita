/* Defesa Orbital v3 - nave.js (Brief 08 A5: extracao mecanica de assets/scenes.js, NaveScene polimorfica + subclasses: orig 4727-6515) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  class NaveScene extends Phaser.Scene {
    constructor(key){ super(key || 'Nave'); }
    create(data){
      document.body.classList.add('mode-nave');
      // Suporte a campanhas 5x5 (novo) e stageIdx legado
      const camps = D.NAVE_CAMPAIGNS||null;
      const hasCampaign = data && data.campaignIdx!=null && camps;
      if(hasCampaign){
        this.campaignIdx = Math.max(0, Math.min(camps.length-1, data.campaignIdx|0));
        this.phaseIdx = Math.max(0, Math.min(4, data.phaseIdx!=null? data.phaseIdx|0 : 0));
        const camp = camps[this.campaignIdx];
        const phase = camp.phases ? camp.phases[this.phaseIdx] : camp;
        this.campaign = camp;
        this.stage = Object.assign({}, camp, phase, { name: camp.name+' — Fase '+phase.n+': '+phase.name, accent: camp.accent, bg: camp.bg });
        this.styleId = camp.styleId || camp.id;
        this.stageIdx = this.phaseIdx;
        this.campaignId = camp.id;
      } else {
        const rawIdx = data && data.stageIdx!=null ? data.stageIdx : (data && data.styleIdx!=null ? data.styleIdx : (data && data.nextMapIdx!=null ? data.nextMapIdx : 0));
        this.stageIdx = Math.max(0, Math.min(4, rawIdx|0));
        const cfgFromNAVE = D.NAVE_STYLES ? D.NAVE_STYLES[this.stageIdx] : null;
        const cfgFallback = resolveNaveStage(this.stageIdx);
        this.stage = cfgFromNAVE || cfgFallback;
        const _nv = D.NAVE_STYLES ? D.NAVE_STYLES[this.stageIdx] : this.stage;
        const ids = ['asteroids','horizontal','vertical','arena','tunnel'];
        this.styleId = (data && data.styleId) ? String(data.styleId).toLowerCase() : (this.stage && this.stage.id ? String(this.stage.id).toLowerCase() : ids[this.stageIdx]);
        if(ids.indexOf(this.styleId)===-1) this.styleId = ids[this.stageIdx] || 'vertical';
        this.campaignIdx = this.stageIdx; this.phaseIdx=0; this.campaign=null; this.campaignId=this.styleId;
      }
      this.nextMap = data && data.nextMapIdx!=null ? data.nextMapIdx : this.stageIdx;
      this.diffKey = data && data.diffKey || 'normal';
      // nave escolhida (1 das 10) — mesma do TD
      this.shipId = (data && data.shipId) || localStorage.getItem('nave_last_ship') || (D.TOWERS_DATA[0].id);
      this.shipDef = D.TOWERS_DATA.find(t=>t.id===this.shipId) || D.TOWERS_DATA[0];
      this.shipLevel = (D.Save.data.shipLevels && D.Save.data.shipLevels[this.shipId]) || 1;
      // calcula stats da nave (dano/escala com nível e skills)
      this.shipDmgMul = 1 + (this.shipLevel-1)*0.18;
      if(this.shipDef.skills){ for(const sk of this.shipDef.skills){ if(this.shipLevel>=sk.lvl && sk.eff && sk.eff.dmgMul) this.shipDmgMul*=sk.eff.dmgMul; } }
      this.score=0; this.timeLeft=this.stage.duration||22; this.enemies=[]; this.bullets=[]; this.eBullets=[]; this.boss=null; this.bossHp=0;
      this._finished=false;
      const bgCol = this.stage.bg || '#020617';
      this.cameras.main.setBackgroundColor(bgCol);
      // FIX DOM: esconde HUD do TD que ficava por cima da briefing (causava trava)
      try{ document.getElementById('topbar')?.classList.add('off'); }catch(e){}
      try{ document.getElementById('shopbar')?.classList.add('off'); }catch(e){}
      try{ document.getElementById('screen-menu')?.classList.add('hidden'); }catch(e){}
      try{ document.getElementById('board-shell')?.classList.remove('hidden'); }catch(e){}
      // garante que inputs anteriores não bloqueiem
      this._cdRunning=false; this.phaseActive=false;
      // ===== OBJETIVO DA FASE (kill / survive / boss) =====
      this.objKind = (this.stage && this.stage.obj) ? this.stage.obj : (this.stage && this.stage.boss ? 'boss' : 'kill');
      if(this.objKind==='boss') this.objKind='boss';
      this.bossKilled=false;
      // ===== POLISH: vinheta + scanlines + borda glow (estilo TD) =====
      if(!this.textures.exists('vig')){
        const cv=this.textures.createCanvas('vig', BW, BH);
        const ctx=cv.getContext();
        const g=ctx.createRadialGradient(BW/2,BH/2, Math.min(BW,BH)*0.42, BW/2,BH/2, Math.max(BW,BH)*0.72);
        g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(2,4,10,0.5)');
        ctx.fillStyle=g; ctx.fillRect(0,0,BW,BH);
        cv.refresh();
      }
      if(!this.textures.exists('scan')){
        const cv=this.textures.createCanvas('scan', 4, 4);
        const ctx=cv.getContext();
        ctx.fillStyle='rgba(255,255,255,0.028)'; ctx.fillRect(0,0,4,1);
        cv.refresh();
      }
      this.add.image(BW/2,BH/2,'vig').setDepth(17);
      this.add.tileSprite(BW/2,BH/2,BW,BH,'scan').setDepth(17).setAlpha(0.9);
      const accCol=Phaser.Display.Color.HexStringToColor(this.stage.accent||'#38bdf8').color;
      this.borderGlow=this.add.rectangle(BW/2,BH/2,BW-6,BH-6).setStrokeStyle(2,accCol,0.20).setDepth(18);
      this.tweens.add({targets:this.borderGlow, alpha:0.45, duration:1800, yoyo:true, repeat:-1, ease:'Sine.easeInOut'});
      // ===== HUD PAINÉIS (estilo TD) =====
      const panel=(x,y,w,h)=>{ const g=this.add.graphics().setDepth(19); g.fillStyle(0x0d1526,0.88); g.fillPoints([{x:x+6,y},{x:x+w-6,y},{x:x+w,y:y+6},{x:x+w,y:y+h-6},{x:x+w-6,y:y+h},{x:x+6,y:y+h},{x,y:y+h-6},{x,x:y+6}],true); g.lineStyle(1,accCol,0.35); g.strokePoints([{x:x+6,y},{x:x+w-6,y},{x:x+w,y:y+6},{x:x+w,y:y+h-6},{x:x+w-6,y:y+h},{x:x+6,y:y+h},{x,y:y+h-6},{x,x:y+6}],true); return g; };
      panel(10,6,236,34);
      const objLabel=this.objKind==='survive'? 'SOBREVIVA' : this.objKind==='boss'? 'CHEFE' : 'ABATES';
      this.add.text(20,11,objLabel,{fontFamily:'Orbitron',fontSize:'8px',color:'#8fa3c4'}).setDepth(20);
      this.scoreTxt=this.add.text(20,19,'',{fontFamily:'Orbitron',fontSize:'14px',color:'#fbbf24',fontStyle:'bold'}).setDepth(20);
      // timer central
      panel(BW/2-140,6,280,26);
      this.timerBarBg=this.add.rectangle(BW/2,19,264,12,0x000000,0.55).setDepth(20);
      this.timerBar=this.add.rectangle(BW/2-132,19,264,12,this.objKind==='survive'?0x34d399:accCol).setOrigin(0,0.5).setDepth(21);
      this.timeTxt=this.add.text(BW/2,19,'',{fontFamily:'Orbitron',fontSize:'10px',color:'#e8eefc'}).setOrigin(0.5).setDepth(22);
      // título fase centro-topo sob timer
      const campName = this.campaign ? this.campaign.name : '';
      const faseTxt = this.campaign ? `FASE ${this.phaseIdx+1}/5` : `NAV ${this.stageIdx+1}`;
      this.add.text(BW/2,38,`${campName.toUpperCase()} ${faseTxt}`.trim(),{fontFamily:'Orbitron',fontSize:'9px',color:this.shipDef.color||'#e8eefc'}).setOrigin(0.5,0).setDepth(20);
      // painel direito status
      panel(BW-206,6,196,34);
      this.livesTxt = this.add.text(BW-196,10,'',{fontFamily:'Orbitron', fontSize:'13px', color:'#f43f5e'}).setDepth(20);
      this.bombsTxt = this.add.text(BW-130,10,'',{fontFamily:'Orbitron', fontSize:'11px', color:'#fb923c'}).setDepth(20);
      this.tierTxt = this.add.text(BW-196,27,'',{fontFamily:'Orbitron', fontSize:'10px', color:'#38bdf8'}).setDepth(20);
      this.updateHudExtras();
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT');
      this.input.keyboard.on('keydown-SPACE', ()=> this.shoot());
      this.input.on('pointerdown', ()=> this.shoot());
      // switch por styleId - exigido spec
      switch(this.styleId){
        case 'asteroids': this.createAsteroids(); break;
        case 'horizontal': this.createHorizontal(); break;
        case 'vertical': this.createVertical(); break;
        case 'arena': this.createArena(); break;
        case 'tunnel': this.createTunnel(); break;
        default: this.createVertical(); break;
      }
      SND.musicTick('combat', 8, true);
      this.spawnTimer=0; this.bulletTimer=0;
      this.autoFireTimer=0;
      const af={asteroids:0.22, horizontal:0.16, vertical:0.14, arena:0.15, tunnel:0.17};
      const baseDelay = af[this.styleId]||0.16;
      const lvlScale = Math.max(0.62, 1 - (this.shipLevel-1)*0.012);
      this.baseAutoFireDelay = baseDelay * lvlScale;
      this.autoFireDelay = this.baseAutoFireDelay;
      this.chargeHeld=0; this.isCharging=false;
      // ===== SISTEMAS COMPARTILHADOS (vidas, combo, tier, bombas, drops) =====
      this.lives = 3 + (this.shipLevel>=20?1:0);
      this.iframes = 1.2; // graça inicial
      this.combo=0; this.comboT=0;
      this.weaponTier=1; this.rapidT=0;
      this.bombs = 2 + (this.shipLevel>=30?1:0);
      this.powerups=[]; this.killsSinceDrop=0;
      this.kills=0;
      this.elapsed=0; this.waveIdx=0;
      // HUD extra
      this.livesTxt = this.add.text(BW-12, 26, '', {fontFamily:'Orbitron', fontSize:'13px', color:'#f43f5e'}).setOrigin(1,0).setDepth(20);
      this.bombsTxt = this.add.text(BW-12, 44, '', {fontFamily:'Orbitron', fontSize:'11px', color:'#fb923c'}).setOrigin(1,0).setDepth(20);
      this.tierTxt = this.add.text(12, 26, '', {fontFamily:'Orbitron', fontSize:'11px', color:'#38bdf8'}).setDepth(20);
      this.updateHudExtras();
      // bomba: teclas X / B / Q
      this.input.keyboard.on('keydown-X', ()=> this.useBomb());
      this.input.keyboard.on('keydown-B', ()=> this.useBomb());
      this.input.keyboard.on('keydown-Q', ()=> this.useBomb());
      // plano de ondas + banner de anúncio
      this.buildWaves();
      // ===== BRIEFING DE MISSÃO (padrão TD) =====
      this.phaseActive=false;
      this.time.delayedCall(60, ()=> this.showBriefing());
    }
    objDesc(){
      if(this.objKind==='survive') return {t:'SOBREVIVA', d:`Aguarde ${Math.round(this.stage.duration||22)}s sob ataque sem perder todas as vidas`, val:''};
      if(this.objKind==='boss') return {t:'CHEFE', d:'Localize e destrua o chefe da fase', val:''};
      return {t:'ABATER', d:`Destrua ${this.stage.target||22} inimigos antes do tempo acabar`, val:'0/'+(this.stage.target||22)};
    }
    showBriefing(){
      const acc=this.stage.accent||'#38bdf8';
      const accCol=Phaser.Display.Color.HexStringToColor(acc).color;
      const od=this.objDesc();
      this.briefC=this.add.container(0,0).setDepth(30);
      const dim=this.add.rectangle(BW/2,BH/2,BW,BH,0x020617,0.86);
      const g=this.add.graphics();
      const bx=BW/2-260, by=70, bw2=520, bh2=330;
      g.fillStyle(0x0d1526,0.97); g.fillPoints([{x:bx+14,y:by},{x:bx+bw2-14,y:by},{x:bx+bw2,y:by+14},{x:bx+bw2,y:by+bh2-14},{x:bx+bw2-14,y:by+bh2},{x:bx+14,y:by+bh2},{x:bx,y:by+bh2-14},{x:bx,y:by+14}],true);
      g.lineStyle(2,accCol,0.8); g.strokePoints([{x:bx+14,y:by},{x:bx+bw2-14,y:by},{x:bx+bw2,y:by+14},{x:bx+bw2,y:by+bh2-14},{x:bx+bw2-14,y:by+bh2},{x:bx+14,y:by+bh2},{x:bx,y:by+bh2-14},{x:bx,y:by+14}],true);
      this.briefC.add([dim,g]);
      const campName=this.campaign? this.campaign.name : 'PATRULHA';
      const title=this.add.text(BW/2, by+34, campName.toUpperCase(), {fontFamily:'Orbitron',fontSize:'21px',color:acc,fontStyle:'bold'}).setOrigin(0.5).setShadow(0,0,acc,16,true,true);
      const fase=this.add.text(BW/2, by+62, `FASE ${this.phaseIdx+1} de 5 — ${this.stage.name||''}`.toUpperCase(), {fontFamily:'Orbitron',fontSize:'11px',color:'#e8eefc'}).setOrigin(0.5);
      this.briefC.add([title,fase]);
      // OBJETIVO box
      const og=this.add.graphics();
      og.fillStyle(accCol,0.10); og.fillRect(bx+30,by+92,bw2-60,64);
      og.lineStyle(1,accCol,0.55); og.strokeRect(bx+30,by+92,bw2-60,64);
      this.briefC.add(og);
      const oTag=this.add.text(bx+42,by+100,'◆ OBJETIVO',{fontFamily:'Orbitron',fontSize:'9px',color:'#8fa3c4'}).setDepth(31);
      const oTxt=this.add.text(BW/2,by+122,od.t,{fontFamily:'Orbitron',fontSize:'19px',color:'#fbbf24',fontStyle:'bold'}).setOrigin(0.5);
      const oDesc=this.add.text(BW/2,by+143,od.d,{fontFamily:'Rajdhani',fontSize:'12px',color:'#cbd5e1'}).setOrigin(0.5);
      this.briefC.add([oTag,oTxt,oDesc]);
      // nave escolhida
      const sIcon=this.add.text(BW/2,by+186,`${this.shipDef.icon}`, {fontFamily:'Orbitron',fontSize:'20px',color:this.shipDef.color}).setOrigin(0.5);
      const ship=this.add.text(BW/2,by+212,`${this.shipDef.name} • NV ${this.shipLevel}/50`,{fontFamily:'Orbitron',fontSize:'13px',color:this.shipDef.color}).setOrigin(0.5);
      const kindTxt={bullet:'Canhão balístico',beam:'Feixe contínuo',splash:'Mísseis teleguiados',slow:'Pulso criogênico',chain:'Raio em cadeia',snipe:'Tiro de precisão',dot:'Veneno corrosivo',buff:'Amplificador',pierce:'Railgun perfurante'}[this.shipDef.kind]||this.shipDef.kind;
      const skils=this.shipDef.skills? this.shipDef.skills.filter(s=>this.shipLevel>=s.lvl).length : 0;
      const shipSub=this.add.text(BW/2,by+230,`${kindTxt} • ${skils} skill${skils===1?'':'s'} ativa${skils===1?'':'s'}`,{fontFamily:'Rajdhani',fontSize:'11px',color:'#8fa3c4'}).setOrigin(0.5);
      this.briefC.add([sIcon,ship,shipSub]);
      // dica por estilo
      const hints={asteroids:'SETAS/WASD movem • nave aponta a direção • X = bomba',horizontal:'W/S sobe/desce • A/D avança • segure ESPAÇO = tiro carregado',vertical:'Setas/WASD ou mouse • X = bomba • pegue Ⓟ para evoluir a arma',arena:'WASD move • mouse mira • X = bomba quando cercado',tunnel:'← → trocam de lane • cuidado com flippers dourados'};
      const hint=this.add.text(BW/2,by+262,hints[this.styleId]||'',{fontFamily:'JetBrains Mono',fontSize:'9px',color:'#64748b'}).setOrigin(0.5);
      this.briefC.add(hint);
      // CTA piscando
      const cta=this.add.text(BW/2,by+bh2-36,'▶ TOQUE OU ENTER PARA DECOLAR ◀',{fontFamily:'Orbitron',fontSize:'13px',color:acc,fontStyle:'bold'}).setOrigin(0.5);
      this.tweens.add({targets:cta,alpha:0.25,duration:600,yoyo:true,repeat:-1});
      this.briefC.add(cta);
      SND.musicTick('menu');
      // FIX TRAVA: briefing agora responde a Phaser + DOM (ENTER, SPACE, clique, toque) e dim interativo
      const go=()=>{ if(this.phaseActive || this._cdRunning) return;
        this._cdRunning=true;
        try{
          this.input.off('pointerdown',go);
          this.input.keyboard.off('keydown-ENTER',go);
          this.input.keyboard.off('keydown-SPACE',go);
          this.input.keyboard.off('keydown',go);
        }catch(_){}
        try{ if(this._domGo) document.removeEventListener('keydown', this._domGo); }catch(e){}
        try{ document.removeEventListener('pointerdown', go); }catch(e){}
        try{ dim.off('pointerdown',go); }catch(e){}
        this.startCountdown();
      };
      // Phaser input (canvas)
      try{
        this.input.on('pointerdown',go);
        this.input.keyboard.on('keydown-ENTER',go);
        this.input.keyboard.on('keydown-SPACE',go);
        this.input.keyboard.on('keydown',go);
      }catch(e){}
      // DOM fallback (garante ENTER/SPACE mesmo se Phaser não capturar)
      try{
        const domGo = (ev)=>{ if(ev && ev.key && !['Enter',' ','Space'].includes(ev.key) && ev.type==='keydown' && ev.key.length!==1) return; go(); };
        document.addEventListener('keydown', domGo, {once:false});
        document.addEventListener('pointerdown', go, {once:false});
        // guarda para remover depois
        this._domGo = domGo;
      }catch(e){}
      // torna o dim clicável (cobre toda a tela) — fallback se Phaser input falhar
      try{ dim.setInteractive(); dim.on('pointerdown', go); }catch(e){}
      // também clique no canvas DOM direto
      try{
        const canvas = document.querySelector('#game-canvas canvas');
        if(canvas) canvas.addEventListener('pointerdown', go, {once:false});
      }catch(e){}
      // auto-fallback: se em 30s não decolar, permite decolar via timeout (evita trava permanente)
      this.time.delayedCall(30000, ()=>{ if(!this.phaseActive && !this._cdRunning && this.briefC) { console.warn('[Nave] fallback auto-go'); go(); } });
    }
    startCountdown(){
      if(this.briefC){ this.briefC.destroy(); this.briefC=null; }
      let n=3;
      const cd=this.add.text(BW/2,BH*0.42,'3',{fontFamily:'Orbitron',fontSize:'64px',color:'#fbbf24',fontStyle:'bold'}).setOrigin(0.5).setDepth(30).setScale(1.4);
      cd.setShadow(0,0,'#fbbf24',24,true,true);
      SND.shoot('chain');
      const tick=()=>{
        n--;
        if(n>0){ cd.setText(String(n)); cd.setScale(1.4); this.tweens.add({targets:cd,scale:1,duration:260}); SND.ui(); this.time.delayedCall(520,tick); }
        else { cd.setText('GO!'); cd.setColor('#34d399'); cd.setShadow(0,0,'#34d399',28,true,true); this.tweens.add({targets:cd,scale:1.7,alpha:0,duration:380,onComplete:()=>cd.destroy()}); this.beginPhase(); }
      };
      this.time.delayedCall(520,tick);
    }
    beginPhase(){
      this.phaseActive=true;
      SND.musicTick('combat', 8, true);
    }
    updateHudExtras(){
      if(this.livesTxt) this.livesTxt.setText('♥'.repeat(Math.max(0,this.lives))+'·'.repeat(Math.max(0,5-this.lives)));
      if(this.bombsTxt) this.bombsTxt.setText('✸ BOMBA ×'+this.bombs);
      if(this.tierTxt) this.tierTxt.setText('PWR '+this.weaponTier+'/4'+(this.rapidT>0? ' ⚡RAPID':''));
    }
    comboMult(){ return Math.min(4, 1+Math.floor(this.combo/8)); }
    addScore(n){
      const pts=Math.round(n*this.comboMult());
      this.score+=pts;
      return pts;
    }
    fxExplode(x,y,col,n){
      n=n||8;
      for(let k=0;k<n;k++){
        const p=this.add.image(x,y,'dot').setTint(col).setScale(0.3+Math.random()*0.5).setDepth(9);
        const a=Math.random()*Math.PI*2, d=20+Math.random()*46;
        this.tweens.add({targets:p, x:x+Math.cos(a)*d, y:y+Math.sin(a)*d, alpha:0, scale:0.05, duration:260+Math.random()*180, onComplete:()=>p.destroy()});
      }
      const fl=this.add.image(x,y,'soft').setTint(col).setScale(0.7).setAlpha(0.85).setDepth(9);
      this.tweens.add({targets:fl, scale:1.6, alpha:0, duration:200, onComplete:()=>fl.destroy()});
    }
    popup(x,y,txt,col){
      const t=this.add.text(x,y,txt,{fontFamily:'Orbitron', fontSize:'10px', color:col||'#fbbf24'}).setOrigin(0.5).setDepth(21);
      this.tweens.add({targets:t, y:y-26, alpha:0, duration:650, onComplete:()=>t.destroy()});
    }
    announce(txt,col){
      if(this._ann) this._ann.destroy();
      this._ann=this.add.text(BW/2, BH*0.32, txt, {fontFamily:'Orbitron', fontSize:'22px', color:col||'#e8eefc', fontStyle:'bold'}).setOrigin(0.5).setDepth(22).setAlpha(0);
      this._ann.setShadow(0,0,col||'#38bdf8',14,true,true);
      this.tweens.add({targets:this._ann, alpha:1, scale:1.08, duration:220, yoyo:true, hold:520, onComplete:()=>{ if(this._ann){this._ann.destroy(); this._ann=null;} }});
    }
    spawnPowerup(x,y){
      const roll=Math.random();
      let type='P';
      if(this.lives<5 && roll<0.18) type='S';
      else if(roll<0.42) type='B';
      else if(roll<0.60 && this.weaponTier<4) type='P';
      else type='R';
      const cols={P:0xfbbf24,S:0x34d399,B:0xfb923c,R:0x22d3ee};
      const img=this.add.image(x,y,'ring').setTint(cols[type]).setScale(0.55).setDepth(10);
      const core=this.add.text(x,y,type,{fontFamily:'Orbitron',fontSize:'11px',color:'#fff'}).setOrigin(0.5).setDepth(11);
      this.powerups.push({img, core, x,y, vy:64, type, t:0});
    }
    updatePowerups(dt){
      for(let i=this.powerups.length-1;i>=0;i--){
        const u=this.powerups[i];
        u.t+=dt; u.y+=u.vy*dt; u.img.setPosition(u.x,u.y); u.core.setPosition(u.x,u.y);
        u.img.setScale(0.45+Math.sin(u.t*6)*0.12);
        if(u.y>BH+24){ u.img.destroy(); u.core.destroy(); this.powerups.splice(i,1); continue; }
        if(Math.hypot(u.x-this.playerBody.x, u.y-this.playerBody.y)<28){
          SND.buy();
          if(u.type==='P'){ this.weaponTier=Math.min(4,this.weaponTier+1); this.popup(u.x,u.y,'POWER UP!','#fbbf24'); }
          else if(u.type==='S'){ this.lives=Math.min(5,this.lives+1); this.popup(u.x,u.y,'+1 VIDA','#34d399'); }
          else if(u.type==='B'){ this.bombs++; this.popup(u.x,u.y,'+1 BOMBA','#fb923c'); }
          else { this.rapidT=8; this.popup(u.x,u.y,'TIRO RÁPIDO!','#22d3ee'); }
          this.updateHudExtras();
          u.img.destroy(); u.core.destroy(); this.powerups.splice(i,1);
        }
      }
    }
    useBomb(){
      if(!this.bombs || this.bombs<=0 || this.timeLeft<=0 || this._finished) { SND.error(); return; }
      this.bombs--; this.updateHudExtras();
      SND.explosion(2); SND.victory();
      this.cameras.main.flash(160,255,255,255,false);
      this.cameras.main.shake(240,0.010);
      const ring=this.add.circle(this.playerBody.x, this.playerBody.y, 10, 0xffffff, 0.65).setDepth(15);
      this.tweens.add({targets:ring, scale:34, alpha:0, duration:480, onComplete:()=>ring.destroy()});
      for(let i=this.eBullets.length-1;i>=0;i--){ const b=this.eBullets[i]; const s=this.add.image(b.x,b.y,'dot').setTint(0xffffff).setScale(0.5).setDepth(9); this.tweens.add({targets:s,alpha:0,scale:0.05,duration:260,onComplete:()=>s.destroy()}); b.img.destroy(); this.eBullets.splice(i,1); }
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.isBoss){ e.hp-=10; e.img.setTint(0xffaaaa); this.time.delayedCall(120,()=>{ if(e.img&&e.img.active&&e.def&&e.def.col) e.img.setTint(Phaser.Display.Color.HexStringToColor(e.def.col).color); }); this.updateBossBar(e); if(e.hp<=0) this.bossDie(e); continue; }
        this.fxExplode(e.x,e.y,Phaser.Display.Color.HexStringToColor((e.def&&e.def.col)||'#94a3b8').color,6);
        e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1); this.kills++; this.score+=5;
      }
      this.announce('✸ BOMBA!', '#fb923c');
    }
    hurtPlayer(){
      if(this.iframes>0 || this._finished || this.timeLeft<=0 || this.lives<=0) return;
      this.lives--; this.iframes=1.7;
      this.combo=0;
      SND.leak();
      this.cameras.main.flash(110,244,63,94,false);
      this.cameras.main.shake(140,0.008);
      this.popup(this.playerBody.x, this.playerBody.y-24, '-1 ♥', '#f43f5e');
      this.updateHudExtras();
      if(this.lives<=0){
        this.announce('NAVE DESTRUÍDA', '#f43f5e');
        this.fxExplode(this.playerBody.x,this.playerBody.y,0xf43f5e,22);
        if(this.player) this.player.setVisible(false);
        this._dead=true;
        this.time.delayedCall(700, ()=>{ this.finish(); });
      }
    }
    buildWaves(){
      const dur=(this.stage.duration||24)*0.92;
      const isBossPhase=!!(this.stage&&this.stage.boss);
      const times=[dur*0.14, dur*0.34, dur*0.54, dur*0.72];
      this.waves=times.map(t=>({t, done:false}));
      this.finalWaveT=dur*0.86;
      if(isBossPhase) this.waves.push({t:this.finalWaveT, boss:true, done:false});
      else this.waves.push({t:this.finalWaveT, mega:true, done:false});
    }
    processWaves(dt){
      this.elapsed+=dt;
      while(this.waveIdx<this.waves.length && this.elapsed>=this.waves[this.waveIdx].t){
        const w=this.waves[this.waveIdx];
        w.done=true;
        if(w.boss){
          this.announce('⚠ CHEFE ⚠', '#f43f5e');
          this.spawnStyleBoss();
        } else {
          this.announce('ONDA '+(this.waveIdx+1), this.stage.accent||'#38bdf8');
          try{ this['wave_'+this.styleId](this.waveIdx); }catch(e){}
        }
        this.waveIdx++;
      }
    }
    updateCentral(dt){
      // i-frames piscando
      if(this.iframes>0){ this.iframes-=dt; if(this.player) this.player.setAlpha((Math.floor(this.iframes*14)%2)?0.25:0.85); if(this.iframes<=0 && this.player) this.player.setAlpha(1); }
      // combo timer
      if(this.comboT>0){ this.comboT-=dt; if(this.comboT<=0) this.combo=0; }
      // rapid fire
      if(this.rapidT>0){ this.rapidT-=dt; if(this.rapidT<=0) this.updateHudExtras(); else if(Math.floor(this.rapidT*2)!==Math.floor((this.rapidT+dt)*2)) this.updateHudExtras(); }
      // delay efetivo
      this.autoFireDelay = this.baseAutoFireDelay * (this.rapidT>0?0.55:1);
      // atiradores centrais (saucer, torres etc.)
      for(const e of this.enemies){
        if(!e.shootEvery || !e.img || !e.img.active) continue;
        e.shootT=(e.shootT==null? e.shootEvery : e.shootT)-dt;
        if(e.shootT<=0){
          e.shootT=e.shootEvery;
          const ang=Math.atan2(this.playerBody.y-e.y, this.playerBody.x-e.x);
          const eb=this.add.image(e.x,e.y,'dot').setTint(0xef4444).setScale(0.62).setDepth(9);
          this.eBullets.push({img:eb,x:e.x,y:e.y,vx:Math.cos(ang)*230,vy:Math.sin(ang)*230,life:3});
          SND.shoot('chain');
        }
      }
      // balas inimigas genéricas (estilos sem loop próprio: arena/tunnel)
      if(this.styleId==='arena'||this.styleId==='tunnel'){
        for(let i=this.eBullets.length-1;i>=0;i--){
          const b=this.eBullets[i];
          b.life=(b.life||3)-dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.img.setPosition(b.x,b.y);
          if(b.life<=0||b.x<-24||b.x>BW+24||b.y<-24||b.y>BH+24){ b.img.destroy(); this.eBullets.splice(i,1); continue; }
          if(Math.hypot(b.x-this.playerBody.x,b.y-this.playerBody.y)<17){ b.img.destroy(); this.eBullets.splice(i,1); this.hurtPlayer(); }
        }
      }
      // power-ups + HUD combo
      this.updatePowerups(dt);
      // RASTRO DE MOTOR (polish TD)
      if(this.player && this.playerBody && Math.random()<0.55){
        const px=this.playerBody.x, py=(this.styleId==='tunnel'? this.player.y : (this.playerBody.y||0));
        const trail=this.add.image(px+(Math.random()-0.5)*6, py+18, 'soft').setTint(this._shipCol()).setScale(0.32).setAlpha(0.4).setDepth(8);
        this.tweens.add({targets:trail, y:trail.y+10, alpha:0, scale:0.05, duration:300, onComplete:()=>trail.destroy()});
      }
      const mult=this.comboMult();
      if(this.scoreTxt) this.scoreTxt.setText('ABATES '+this.kills+'/'+(this.stage.target||22)+(mult>1? '  ×'+mult : '  '+this.score+'pts'));
    }
    initBossBar(label){
      this.bossBarBg=this.add.rectangle(BW/2,50,260,10,0x000000,0.65).setDepth(20);
      this.bossBar=this.add.rectangle(BW/2-130,50,260,10,0xf43f5e).setOrigin(0,0.5).setDepth(21);
      if(label) this.add.text(BW/2,36,label,{fontFamily:'Orbitron',fontSize:'9px',color:'#f43f5e'}).setOrigin(0.5).setDepth(20);
    }
    updateBossBar(e){
      if(this.bossBar) this.bossBar.width=260*Math.max(0,e.hp/e.maxHp);
    }
    bossDie(e){
      this.bossKilled=true;
      this.fxExplode(e.x,e.y,0xfbbf24,26);
      for(let k=0;k<10;k++){ const p=this.add.image(e.x+(Math.random()-0.5)*70,e.y+(Math.random()-0.5)*40,'dot').setTint(0xf43f5e).setScale(0.8); this.tweens.add({targets:p,alpha:0,scale:0.1,duration:500,delay:k*40,onComplete:()=>p.destroy()}); }
      SND.explosion(2.4);
      this.cameras.main.shake(300,0.012);
      this.kills=(this.kills||0)+1;
      const pts=this.addScore(e.pts||15);
      this.popup(e.x,e.y,'+'+pts+' BOSS!','#fbbf24');
      if(e.img) e.img.destroy(); if(e.shadow) e.shadow.destroy();
      const idx=this.enemies.indexOf(e); if(idx>=0) this.enemies.splice(idx,1);
      if(this.bossBarBg) this.bossBarBg.destroy(); if(this.bossBar) this.bossBar.destroy();
      this.boss=null;
      this.announce('CHEFE DESTRUÍDO!', '#34d399');
    }
    _handleBossHit(b,e){
      e.hp--;
      this.updateBossBar(e);
      e.img.setTint(0xffaaaa);
      this.time.delayedCall(70,()=>{ if(e.img&&e.img.active&&e.def&&e.def.col) e.img.setTint(Phaser.Display.Color.HexStringToColor(e.def.col).color); });
      this.cameras.main.shake(40,0.003);
      if(e.hp<=0){ this.bossDie(e); return true; }
      return false;
    }

    // ===== ASTEROIDS: polígonos 3 tamanhos + saucer atirador =====
    createAsteroids(){
      const g=this.add.graphics().setDepth(0);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(this.stage.bg||'#020617').color,1); g.fillRect(0,0,BW,BH);
      for(let i=0;i<70;i++){ const x=Math.random()*BW, y=Math.random()*BH; g.fillStyle(0xffffff, Math.random()*0.8); g.fillCircle(x,y, Math.random()<0.9?1:1.8); }
      // texturas procedurais de asteroide (irregulares, estilo vetorial)
      const sizes=[['astL',34],['astM',22],['astS',12]];
      for(const [key,R] of sizes){
        if(this.textures.exists(key)) continue;
        const gg=this.make.graphics({x:0,y:0,add:false});
        const pts=[]; const n=8+Math.floor(Math.random()*4);
        for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const rr=R*(0.72+Math.random()*0.38); pts.push({x:R+Math.cos(a)*rr, y:R+Math.sin(a)*rr}); }
        gg.fillStyle(0x3d4a63,1); gg.fillPoints(pts,true);
        gg.lineStyle(2,0xa8b6d4,0.95); gg.strokePoints(pts,true);
        // crateras
        gg.fillStyle(0x2a3550,1);
        for(let c=0;c<3;c++){ gg.fillCircle(R*0.5+(Math.random()-0.5)*R, R*0.5+(Math.random()-0.5)*R, R*0.14); }
        gg.generateTexture(key,R*2,R*2); gg.destroy();
      }
      const tex=this._shipTextureKey();
      this.player = this.add.image(BW/2, BH/2, tex);
      if(!this.textures.exists(tex)) this.player.setTexture('dot');
      this.player.setScale(0.92 + Math.min(0.2, this.shipLevel*0.009)).setDepth(10);
      this.playerShadow = this.add.ellipse(this.player.x, this.player.y+16, 28,10,0x000000,0.25).setDepth(9);
      this.playerBody = {x:BW/2, y:BH/2, vx:0, vy:0, w:32, h:32, angle: -Math.PI/2};
      this.player.setRotation(this.playerBody.angle + Math.PI/2);
      // alguns asteroides iniciais
      for(let k=0;k<3;k++) this.spawnAsteroid('L');
    }
    spawnAsteroid(sizeClass, x, y){
      let radius, pts, texKey;
      if(sizeClass==='L'){ radius=32; pts=20; texKey='astL'; }
      else if(sizeClass==='M'){ radius=21; pts=50; texKey='astM'; }
      else { radius=12; pts=100; texKey='astS'; }
      let px=x, py=y;
      if(px==null){
        let tries=0;
        do{
          const edge=Math.floor(Math.random()*4);
          if(edge===0){ px=Math.random()*BW; py=-30; }
          else if(edge===1){ px=BW+30; py=Math.random()*BH; }
          else if(edge===2){ px=Math.random()*BW; py=BH+30; }
          else { px=-30; py=Math.random()*BH; }
          tries++;
        } while(Math.hypot(px-this.playerBody.x, py-this.playerBody.y)<110 && tries<6);
      }
      const ang=(y==null)? Math.atan2(BH/2-py, BW/2-px)+(Math.random()-0.5)*0.9 : Math.random()*Math.PI*2;
      const spd=(sizeClass==='S'? 120 : sizeClass==='M'? 88 : 62)*(0.85+Math.random()*0.4)*(this.stage.speed||1);
      const img=this.add.image(px,py,texKey).setDepth(8);
      img.setRotation(Math.random()*Math.PI*2);
      this.enemies.push({img, x:px, y:py, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, hp:1, def:{r:radius,col:'#94a3b8'}, astSize:sizeClass, pts, spin:(Math.random()-0.5)*1.4});
    }
    spawnSaucer(){
      const fromLeft=Math.random()<0.5;
      const x=fromLeft? -26 : BW+26;
      const y=60+Math.random()*(BH-160);
      const img=this.add.image(x,y,'en_wasp').setScale(1.15).setDepth(8);
      if(!this.textures.exists('en_wasp')) img.setTexture('dot');
      img.setTint(0xf43f5e);
      this.enemies.push({img, x,y, vx:(fromLeft?1:-1)*(105+this.waveIdx*18), vy:0, hp:2, def:{r:16,col:'#f43f5e'}, saucer:true, pts:200, shootEvery:1.7, wobble:Math.random()*6});
    }
    updateAsteroids(dt){
      // CONTROLES CORRIGIDOS: setas/WASD movem direto e nave aponta para direção (8-way)
      let dx=0, dy=0;
      if(this.cursors.left.isDown || this.wasd.A.isDown) dx-=1;
      if(this.cursors.right.isDown || this.wasd.D.isDown) dx+=1;
      if(this.cursors.up.isDown || this.wasd.W.isDown) dy-=1;
      if(this.cursors.down.isDown || this.wasd.S.isDown) dy+=1;
      // normaliza diagonal
      if(dx!==0 && dy!==0){ dx*=0.7071; dy*=0.7071; }
      if(dx!==0 || dy!==0){
        const ang=Math.atan2(dy, dx);
        this.playerBody.angle = ang;
        this.player.setRotation(ang + Math.PI/2);
        // thrust na direção das setas (sentido corrigido)
        this.playerBody.vx += Math.cos(ang) * 520 * dt;
        this.playerBody.vy += Math.sin(ang) * 520 * dt;
        // feedback visual quando corre
        if(Math.random()<0.18){
          const tail=this.add.image(this.playerBody.x - Math.cos(ang)*14, this.playerBody.y - Math.sin(ang)*14, 'dot').setTint(0x38bdf8).setScale(0.45).setAlpha(0.7).setDepth(9);
          this.tweens.add({targets:tail, alpha:0, scale:0.1, duration:220, onComplete:()=>tail.destroy()});
        }
      }
      // drift com amortecimento
      this.playerBody.vx *= 0.985; this.playerBody.vy *= 0.985;
      // clamp velocidade
      const sp=Math.hypot(this.playerBody.vx, this.playerBody.vy);
      if(sp>380){ this.playerBody.vx*=380/sp; this.playerBody.vy*=380/sp; }
      this.playerBody.x += this.playerBody.vx * dt;
      this.playerBody.y += this.playerBody.vy * dt;
      // wrap em BOARD_W/H
      if(this.playerBody.x < -20) this.playerBody.x = BW+20;
      if(this.playerBody.x > BW+20) this.playerBody.x = -20;
      if(this.playerBody.y < -20) this.playerBody.y = BH+20;
      if(this.playerBody.y > BH+20) this.playerBody.y = -20;
      this.player.setPosition(this.playerBody.x, this.playerBody.y);
      this.playerShadow.setPosition(this.playerBody.x, this.playerBody.y+16);
      // TIRO AUTOMÁTICO na direção da nave
      this.autoFireTimer=(this.autoFireTimer||0)+dt;
      if(this.autoFireTimer>=this.autoFireDelay){ this.autoFireTimer=0; this.shoot(); }
      this.handleAsteroidsSpawn(dt);
      this.handleAsteroidsBullets(dt);
      this.handleAsteroidsEnemies(dt);
    }
    handleAsteroidsSpawn(dt){
      this.spawnTimer+=dt;
      const rate = Math.max(0.55, 1.15 - (this.stage.speed||1)*0.12);
      if(this.spawnTimer>rate){
        this.spawnTimer=0;
        // distribuição clássica: mais L no início, S depois
        const roll=Math.random();
        const sizeClass = this.waveIdx<=1 ? (roll<0.7?'L':'M') : (roll<0.35?'L':roll<0.75?'M':'S');
        this.spawnAsteroid(sizeClass);
        // +30% por vez a cada 10 níveis — spawna extras simultâneos
        const extra = this._getNaveExtraCount();
        for(let k=0;k<extra;k++) this.spawnAsteroid(sizeClass);
      }
      // saucer periódico (a partir da onda 2)
      this.saucerT=(this.saucerT==null? 6+Math.random()*4 : this.saucerT)-dt;
      if(this.saucerT<=0){
        if(this.waveIdx>=1 && !this.enemies.some(e=>e.saucer)) this.spawnSaucer();
        this.saucerT=8+Math.random()*5;
      }
    }
    handleAsteroidsBullets(dt){
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        // homing para mísseis
        if(b.homing && this.enemies.length){
          let nearest=null, nd=1e9;
          for(const e of this.enemies){ const d=Math.hypot(e.x-b.x, e.y-b.y); if(d<160 && d<nd){ nd=d; nearest=e; } }
          if(nearest){ const ang=Math.atan2(nearest.y-b.y, nearest.x-b.x); const curAng=Math.atan2(b.vy,b.vx); let diff=ang-curAng; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI; const turn=3.8*dt; const na=curAng + Math.max(-turn, Math.min(turn, diff)); const spd=Math.hypot(b.vx,b.vy); b.vx=Math.cos(na)*spd; b.vy=Math.sin(na)*spd; if(b.img) b.img.setRotation(na+Math.PI/2); }
        }
        b.x+=b.vx*dt; b.y+=b.vy*dt; b.img.setPosition(b.x,b.y);
        if(b.img && b.img.rotation!=null && b.homing) b.img.setRotation(Math.atan2(b.vy,b.vx)+Math.PI/2);
        if(b.x<-10) b.x=BW+10; if(b.x>BW+10) b.x=-10;
        if(b.y<-10) b.y=BH+10; if(b.y>BH+10) b.y=-10;
        b.life-=dt; if(b.life<=0){ b.img.destroy(); this.bullets.splice(i,1); }
      }
      for(let i=this.eBullets.length-1;i>=0;i--){
        const b=this.eBullets[i];
        b.x+=b.vx*dt; b.y+=b.vy*dt; b.img.setPosition(b.x,b.y);
        if(b.x<-10) b.x=BW+10; if(b.x>BW+10) b.x=-10; // wrap
        if(b.y<-10) b.y=BH+10; if(b.y>BH+10) b.y=-10; // wrap
        b.life-=dt; if(b.life<=0){ b.img.destroy(); this.eBullets.splice(i,1); continue; }
        if(Math.hypot(b.x-this.playerBody.x,b.y-this.playerBody.y)<18){ b.img.destroy(); this.eBullets.splice(i,1); this.hurtPlayer(); }
      }
    }
    handleAsteroidsEnemies(dt){
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.slowed && e.slowed>0){ e.slowed-=dt; if(e.slowed<=0){ e.slowed=0; if(e.img) e.img.setTint(Phaser.Display.Color.HexStringToColor(e.def.col).color); } }
        if(e.dot && e.dotDur && e.dotDur>0){ e.dotDur-=dt; e.dotTick=(e.dotTick||0)+dt; if(e.dotTick>0.45){ e.dotTick=0; this.damageEnemyNave(e,i); continue; } }
        const slowMul = e.slowed? (1-(e.slowVal||0.55)) : 1;
        e.x+=e.vx*slowMul*dt; e.y+=e.vy*slowMul*dt;
        if(e.saucer){ e.wobble+=dt*2.2; e.y+= Math.sin(e.wobble)*26*dt; }
        // wrap asteroids
        if(e.x<-30) e.x=BW+30; if(e.x>BW+30) e.x=-30;
        if(e.y<-30) e.y=BH+30; if(e.y>BH+30) e.y=-30;
        e.img.setPosition(e.x,e.y); if(e.shadow) e.shadow.setPosition(e.x,e.y+10);
        if(!e.saucer) e.img.rotation+=(e.spin||0.6)*dt*slowMul;
        if(Math.hypot(e.x-this.playerBody.x, e.y-this.playerBody.y)< (e.def.r+14)){
          if(e.hp>1 && !e.saucer){ e.hp--; const a=Math.atan2(this.playerBody.y-e.y,this.playerBody.x-e.x); e.vx=-Math.cos(a)*130; e.vy=-Math.sin(a)*130; this.hurtPlayer(); continue; }
          this.hurtPlayer();
          this.fxExplode(e.x,e.y,Phaser.Display.Color.HexStringToColor(e.def.col).color,8);
          e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1);
          continue;
        }
        for(let j=this.bullets.length-1;j>=0;j--){
          const b=this.bullets[j];
          if(Math.hypot(e.x-b.x, e.y-b.y)< e.def.r+9){
            const shouldRemoveBullet = this._handleShipHit(b,e,this.enemies);
            if(shouldRemoveBullet){ b.img.destroy(); this.bullets.splice(j,1); }
            this.damageEnemyNave(e,i,true);
            break;
          }
        }
      }
    }
    damageEnemyNave(e, idx, fromBullet){
      // hp-- e morte com split (asteroids) / pontos / drops
      e.hp=(e.hp||1)-1;
      if(e.hp>0){
        e.img.setTint(0xffffff); this.time.delayedCall(60,()=>{ if(e.img&&e.img.active) e.img.setTint(Phaser.Display.Color.HexStringToColor((e.def&&e.def.col)||'#fff').color); });
        return false;
      }
      // split clássico L→2M→2S
      if(e.astSize && e.astSize!=='S'){
        for(let k=0;k<2;k++){
          const child = e.astSize==='L' ? 'M' : 'S';
          const ang=Math.random()*Math.PI*2;
          this.spawnAsteroid(child, e.x+Math.cos(ang)*12, e.y+Math.sin(ang)*12);
          const c=this.enemies[this.enemies.length-1];
          const ca=Math.atan2(BH/2-e.y+(Math.random()-0.5)*200, BW/2-e.x+(Math.random()-0.5)*200);
          c.vx=Math.cos(ang)*95*(this.stage.speed||1); c.vy=Math.sin(ang)*95*(this.stage.speed||1);
        }
      }
      const col=Phaser.Display.Color.HexStringToColor((e.def&&e.def.col)||'#94a3b8').color;
      this.fxExplode(e.x,e.y,col, e.astSize==='L'?12:7);
      const pts=this.addScore(e.pts||1);
      this.kills=(this.kills||0)+1;
      if(pts>=50||e.saucer) this.popup(e.x,e.y,'+'+pts,'#fbbf24');
      this.combo++; this.comboT=2.6;
      SND.explosion(e.astSize==='L'?1.1:0.6);
      this.killsSinceDrop++;
      if(Math.random()<0.05 || this.killsSinceDrop>=11){ this.killsSinceDrop=0; this.spawnPowerup(e.x,e.y); }
      e.img.destroy(); if(e.shadow) e.shadow.destroy();
      const i=this.enemies.indexOf(e);
      if(i>=0) this.enemies.splice(i,1);
      return true;
    }
    spawnTunnelEnemy(){
      const lane=Math.floor(Math.random()*3);
      const ex=this.laneX[lane], ey=-18;
      const pool=this.stage.enemyPool||['phase','wasp','bomber'];
      const t=pool[Math.floor(Math.random()*pool.length)];
      const def=D.ENEMIES_DATA[t]||D.ENEMIES_DATA['phase'];
      const img=this.add.image(ex, ey, 'en_'+t).setScale(0.78).setDepth(8);
      if(!this.textures.exists('en_'+t)) img.setTexture('dot');
      img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
      const sh=this.add.ellipse(ex, ey+12, 14,5,0x000000,0.18).setDepth(7);
      // flipper a partir da fase 2 (pula lanes como Tempest)
      const flipper = this.waveIdx>=2 && Math.random()<0.35;
      if(flipper) img.setTint(0xfbbf24);
      this.enemies.push({img, shadow:sh, x:ex, y:ey, lane, vy:(140+Math.random()*45)*(this.stage.speed||1)+(lane===this.currentLane?16:0), hp:flipper?2:1, def, flipper, pts:flipper?30:12});
    }
    wave_tunnel(w){
      // fila de flippers em lanes alternadas — escala por vez a cada 10 níveis
      const mult=this._getNaveSpawnMult();
      const nT = Math.round((3+w)*mult);
      for(let k=0;k<nT;k++){
        this.time.delayedCall(k*220, ()=>{ if(!this._finished){ this.spawnTunnelEnemy(); const e=this.enemies[this.enemies.length-1]; if(e&&e.vy) e.vy*=1.25; } });
      }
    }
    wave_asteroids(w){
      const mult=this._getNaveSpawnMult();
      const nA = Math.round((4+w)*mult);
      for(let k=0;k<nA;k++) this.spawnAsteroid('L');
      if(w>=2) this.spawnSaucer();
      // extra saucer em tiers altos
      if(mult>=1.6 && w>=1) this.time.delayedCall(600, ()=>{ if(!this._finished) this.spawnSaucer(); });
    }
    // ===== BOSS GENÉRICO por estilo =====
    spawnStyleBoss(){
      if(this.boss) return;
      const tex=this.textures.exists('en_boss1')?'en_boss1':(this.textures.exists('en_colossus')?'en_colossus':'soft');
      const accent=Phaser.Display.Color.HexStringToColor(this.stage.accent||'#f43f5e').color;
      const hp=36+this.campaignIdx*14+(this.shipLevel>=25?6:0);
      const img=this.add.image(BW/2,-60,tex).setScale(2.3).setDepth(9).setTint(accent);
      const shadow=this.add.ellipse(BW/2,40,60,16,0x000000,0.3).setDepth(8);
      const e={isBoss:true,img,shadow,x:BW/2,y:-60,hp,maxHp:hp,def:{r:52,col:this.stage.accent},pts:20,bt:0,mt:0,phase:1};
      this.boss=e;
      this.enemies.push(e);
      this.initBossBar(this.stage.name? 'CHEFE — '+this.stage.name.toUpperCase():'CHEFE');
      this.updateBossBar(e);
    }
    bossMoveCommon(e,dt){
      if(e.y<(e.homeY||120)) e.y+=70*dt;
      if(e.shadow){ e.shadow.setPosition(e.x,e.y+46); }
    }
    bossFireRadial(e,n,spd){
      n=n||10;
      const base=Math.random()*Math.PI*2;
      for(let a=0;a<n;a++){ const ang=base+a/n*Math.PI*2; const eb=this.add.image(e.x,e.y,'dot').setTint(0xef4444).setScale(0.6).setDepth(9); this.eBullets.push({img:eb,x:e.x,y:e.y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,life:4}); }
      SND.shoot('splash');
    }
    bossFireAimed(e,n){
      const ang=Math.atan2(this.playerBody.y-e.y,this.playerBody.x-e.x);
      n=n||3;
      for(let k=-(n-1)/2;k<=(n-1)/2;k++){
        const eb=this.add.image(e.x,e.y,'dot').setTint(0xf43f5e).setScale(0.66).setDepth(9);
        this.eBullets.push({img:eb,x:e.x,y:e.y,vx:Math.cos(ang+k*0.22)*260,vy:Math.sin(ang+k*0.22)*260,life:4});
      }
      SND.shoot('chain');
    }
    bossUpd_asteroids(e,dt){
      this.bossMoveCommon(e,dt); e.homeY=e.homeY||130;
      e.x=BW/2+Math.sin(this.elapsed*0.55)*(BW*0.30);
      e.img.setPosition(e.x,e.y);
      e.img.rotation+=dt*0.7;
      e.bt=(e.bt||0)-dt;
      if(e.bt<=0 && e.y>100){ e.bt=e.hp<e.maxHp/2?1.15:1.6; this.bossFireRadial(e,12,150); }
    }
    bossUpd_horizontal(e,dt){
      this.bossMoveCommon(e,dt); e.homeY=140;
      e.x=Math.min(BW-110, e.x+40*dt); 
      e.y=e.homeY + Math.sin(this.elapsed*0.9)*90;
      e.img.setPosition(e.x,e.y);
      e.bt=(e.bt||0)-dt;
      if(e.bt<=0 && e.x>BW*0.5){ e.bt=e.hp<e.maxHp/2?1.0:1.35; this.bossFireAimed(e, e.hp<e.maxHp/2?5:3); }
      e.mt=(e.mt||0)-dt;
      if(e.mt<=0 && e.x>BW*0.5){ e.mt=3.2; // spawna minions
        for(let k=0;k<2;k++) this.spawnHorizontalEnemy('runner', e.y-40+k*80);
      }
    }
    bossUpd_arena(e,dt){
      this.bossMoveCommon(e,dt); e.homeY=130;
      // persegue devagar
      const ang=Math.atan2(this.playerBody.y-e.y,this.playerBody.x-e.x);
      e.x+=Math.cos(ang)*46*dt; e.y+=Math.sin(ang)*46*dt;
      e.x=Phaser.Math.Clamp(e.x,80,BW-80); e.y=Phaser.Math.Clamp(e.y,80,BH-120);
      e.img.setPosition(e.x,e.y);
      e.bt=(e.bt||0)-dt;
      if(e.bt<=0){ e.bt=e.hp<e.maxHp/2?1.5:2.1; this.bossFireRadial(e,10,170); }
      e.mt=(e.mt||0)-dt;
      if(e.mt<=0){ // dash telegrafado
        e.mt=3.4;
        const da=Math.atan2(this.playerBody.y-e.y,this.playerBody.x-e.x);
        this.tweens.add({targets:e.img, alpha:0.5, duration:180, yoyo:true});
        this.time.delayedCall(300,()=>{ if(!e.img||!e.img.active) return; this.tweens.add({targets:{},duration:1}); e.vx=Math.cos(da)*430; e.vy=Math.sin(da)*430; });
      }
      if(e.vx||e.vy){
        e.x+=e.vx*dt; e.y+=e.vy*dt;
        e.vx*=0.92; e.vy*=0.92;
        e.x=Phaser.Math.Clamp(e.x,60,BW-60); e.y=Phaser.Math.Clamp(e.y,60,BH-100);
        if(Math.hypot(e.vx,e.vy)<24){ e.vx=0; e.vy=0; }
        e.img.setPosition(e.x,e.y);
      }
    }
    bossUpd_tunnel(e,dt){
      this.bossMoveCommon(e,dt); e.homeY=BH*0.30;
      e.laneT=(e.laneT==null?2:e.laneT)-dt;
      if(e.laneT<=0){ e.laneT=2.1; e.lane=Math.floor(Math.random()*3); this.tweens.add({targets:e.img, x:this.laneX[e.lane], duration:340, ease:'Cubic.easeInOut'}); }
      e.x=e.img.x;
      e.img.setPosition(e.x,e.y);
      e.bt=(e.bt||0)-dt;
      if(e.bt<=0 && e.y>BH*0.2){ // feixe de lane
        e.bt=e.hp<e.maxHp/2?1.3:1.8;
        const lx=e.img.x;
        for(let k=0;k<5;k++){
          this.time.delayedCall(k*90, ()=>{ if(!this._finished&&e.img&&e.img.active){ const eb=this.add.image(lx,e.y+34,'dot').setTint(0xa3e635).setScale(0.75).setDepth(9); this.eBullets.push({img:eb,x:lx,y:e.y+34,vx:(this.playerBody.x-lx)*0.35,vy:330,life:3}); } });
        }
        SND.shoot('pierce');
      }
    }

    // ===== HORIZONTAL: tilePositionX+charge Pod amp =====
    createHorizontal(){
      const bgCol = this.stage.bg||'#0a0f1a';
      this.cameras.main.setBackgroundColor(bgCol);
      // fundo parallax 3 camadas
      if(!this.textures.exists('hbg')){
        const g=this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(Phaser.Display.Color.HexStringToColor(bgCol).color,1); g.fillRect(0,0,256,256);
        g.fillStyle(0xffffff,0.07); for(let i=0;i<28;i++) g.fillRect(Math.random()*256, Math.random()*256, 1,1);
        g.fillStyle(0xffffff,0.14); for(let i=0;i<10;i++) g.fillCircle(Math.random()*256, Math.random()*256, 1.2);
        g.generateTexture('hbg',256,256); g.destroy();
      }
      if(!this.textures.exists('hbg2')){
        const g=this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(0xffffff,0.04); for(let i=0;i<6;i++) g.fillCircle(Math.random()*256, Math.random()*256, 18);
        g.generateTexture('hbg2',256,256); g.destroy();
      }
      this.bgTile = this.add.tileSprite(BW/2, BH/2, BW, BH, 'hbg').setDepth(0).setAlpha(0.95);
      this.bgTile2 = this.add.tileSprite(BW/2, BH/2, BW, BH, 'hbg2').setTint(Phaser.Display.Color.HexStringToColor(this.stage.accent||'#fbbf24').color).setAlpha(0.07).setScale(2.2).setDepth(1);
      this.bgTile3 = this.add.tileSprite(BW/2, BH/2, BW, BH, 'soft').setTint(0xffffff).setAlpha(0.035).setScale(3.5).setDepth(1);
      const texH=this._shipTextureKey();
      this.player = this.add.image(90, BH/2, texH);
      if(!this.textures.exists(texH)) this.player.setTexture('dot');
      this.player.setScale(0.92 + Math.min(0.18, this.shipLevel*0.008)).setDepth(10);
      this.player.setRotation(Math.PI/2);
      this.playerBody = {x:90, y:BH/2, w:28, h:22};
      this.playerShadow = this.add.ellipse(this.player.x, this.player.y+16, 24,8,0x000000,0.22).setDepth(9);
      // Pod amp que orbita (mecânica charge amp) - mais visível
      this.pod = this.add.image(this.playerBody.x+18, this.playerBody.y-10, 'soft').setTint(0xfbbf24).setScale(0.55).setAlpha(0.9).setDepth(10);
      this.podOrbit=0;
      // charge bar
      this.charge = 0; // 0..1
      this.chargeTxt = this.add.text(12, BH-18, 'CHARGE 0%', {fontFamily:'Orbitron', fontSize:'10px', color:'#fbbf24'}).setDepth(20);
    }
    updateHorizontal(dt){
      // scroll parallax 3 camadas
      if(this.bgTile) this.bgTile.tilePositionX += dt * 160 * (this.stage.speed||1);
      if(this.bgTile2) this.bgTile2.tilePositionX += dt * 90 * (this.stage.speed||1);
      if(this.bgTile3) this.bgTile3.tilePositionX += dt * 35 * (this.stage.speed||1);
      // charge hold: segurar espaço
      const spaceDown = this.wasd.SPACE.isDown || this.input.activePointer.isDown;
      if(spaceDown){
        this.charge = Math.min(1, this.charge + dt*0.9);
        this.isCharging=true;
      } else {
        if(this.isCharging && this.charge>0.15){
          this.fireHorizontalCharge(this.charge);
        }
        this.charge = Math.max(0, this.charge - dt*1.8);
        this.isCharging=false;
      }
      if(this.chargeTxt) this.chargeTxt.setText('CHARGE '+Math.round(this.charge*100)+'%'+ (this.charge>=0.95?' PRONTO':''));
      // pod amp orbita
      this.podOrbit+=dt*3.2;
      if(this.pod) this.pod.setPosition(this.playerBody.x + Math.cos(this.podOrbit)*18, this.playerBody.y + Math.sin(this.podOrbit)*14);
      // player move vertical + leve horizontal (80..200)
      let dy=0, dx=0;
      if(this.cursors.up.isDown || this.wasd.W.isDown) dy=-1;
      if(this.cursors.down.isDown || this.wasd.S.isDown) dy=1;
      if(this.cursors.left.isDown || this.wasd.A.isDown) dx=-1;
      if(this.cursors.right.isDown || this.wasd.D.isDown) dx=1;
      if(this.input.activePointer.isDown){
        const my=this.input.activePointer.worldY, mx=this.input.activePointer.worldX;
        dy = Math.sign(my - this.playerBody.y) * 0.9;
        dx = Math.sign(mx - this.playerBody.x) * 0.6;
      }
      this.playerBody.y = Phaser.Math.Clamp(this.playerBody.y + dy*320*dt, 32, BH-32);
      this.playerBody.x = Phaser.Math.Clamp(this.playerBody.x + dx*220*dt, 64, 210);
      this.player.setPosition(this.playerBody.x, this.playerBody.y);
      this.playerShadow.setPosition(this.playerBody.x, this.playerBody.y+14);
      // nave aponta para direita com inclinação (se corre pra esquerda aponta levemente esquerda)
      this.player.setRotation(Math.PI/2 + dy*0.35 + dx* -0.28);
      // TIRO AUTOMÁTICO horizontal
      this.autoFireTimer=(this.autoFireTimer||0)+dt;
      if(this.autoFireTimer>=this.autoFireDelay){
        this.autoFireTimer=0;
        if(!this.isCharging || this.charge<0.85) this.shoot();
      }
      this.handleHorizontalSpawn(dt);
      this.handleHorizontalBullets(dt);
    }
    fireHorizontalCharge(pow){
      SND.shoot('bullet');
      const dmgScale = 1 + pow*2.2;
      // tira normal + Pod amp amplifica
      const b=this.add.image(this.playerBody.x+18, this.playerBody.y, 'dot').setTint(0xffffff).setScale(0.55+pow*0.6).setDepth(9);
      this.bullets.push({img:b, x:this.playerBody.x+18, y:this.playerBody.y, vx:560, vy:0, life:1.2, dmg:dmgScale});
      if(this.pod){
        const pb=this.add.image(this.pod.x, this.pod.y, 'dot').setTint(0xfbbf24).setScale(0.5+pow*0.4).setDepth(9);
        this.bullets.push({img:pb, x:this.pod.x, y:this.pod.y, vx:560, vy: Math.sin(this.podOrbit)*20, life:1.2, dmg:dmgScale*0.7});
      }
      this.tweens.add({targets:this.player, scale:1.18, duration:70, yoyo:true});
    }
    spawnHorizontalEnemy(type, y){
      const def=D.ENEMIES_DATA[type]||D.ENEMIES_DATA['runner'];
      const yy = y!=null? y : 50+Math.random()*(BH-100);
      const x=BW+30;
      const img=this.add.image(x,yy,'en_'+type).setScale(0.92).setDepth(8);
      if(!this.textures.exists('en_'+type)) img.setTexture('dot');
      img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
      const sh=this.add.ellipse(x,yy+10,16,6,0x000000,0.18).setDepth(7);
      const isSine=(type==='wasp'||type==='runner') && Math.random()<0.7;
      this.enemies.push({img, shadow:sh, x, y:yy, baseY:yy, vx:-(95+Math.random()*85)*(this.stage.speed||1), vy:0, hp:(type==='tank'?3:1), def, sine:isSine, amp:26+Math.random()*24, freq:1.8+Math.random()*1.4, t:0, pts:type==='tank'?30:(isSine?20:10)});
    }
    handleHorizontalSpawn(dt){
      this.spawnTimer+=dt;
      const rate = Math.max(0.55, 1.05 - (this.stage.speed||1)*0.11);
      if(this.spawnTimer>rate){
        this.spawnTimer=0;
        const pool=this.stage.enemyPool||['tank','runner','wasp'];
        const t=pool[Math.floor(Math.random()*pool.length)];
        this.spawnHorizontalEnemy(t);
        const extra = this._getNaveExtraCount();
        for(let k=0;k<extra;k++){
          const t2=pool[Math.floor(Math.random()*pool.length)];
          this.spawnHorizontalEnemy(t2);
        }
      }
    }
    handleHorizontalBullets(dt){
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        if(b.homing && this.enemies.length){
          let ne=null, nd=1e9; for(const e of this.enemies){ if(e.isBoss) continue; const d=Math.hypot(e.x-b.x,e.y-b.y); if(d<180 && d<nd){ nd=d; ne=e; } }
          if(ne){ const ang=Math.atan2(ne.y-b.y, ne.x-b.x); const ca=Math.atan2(b.vy,b.vx); let diff=ang-ca; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI; const turn=4.2*dt; const na=ca+Math.max(-turn,Math.min(turn,diff)); const sp=Math.hypot(b.vx,b.vy); b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; }
        }
        b.x+=b.vx*dt; b.y+=b.vy*dt; b.img.setPosition(b.x,b.y);
        if(b.x>BW+30){ b.img.destroy(); this.bullets.splice(i,1); continue; }
        for(let j=this.enemies.length-1;j>=0;j--){
          const e=this.enemies[j];
          if(Math.hypot(e.x-b.x, e.y-b.y)< e.def.r+9){
            const rm=this._handleShipHit(b,e,this.enemies);
            if(rm){ b.img.destroy(); this.bullets.splice(i,1); }
            if(!e.isBoss) this.damageEnemyNave(e,j);
            break;
          }
        }
      }
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.isBoss) continue;
        if(e.slowed && e.slowed>0){ e.slowed-=dt; if(e.slowed<=0) e.slowed=0; }
        if(e.dot && e.dotDur>0){ e.dotDur-=dt; e.dotTick=(e.dotTick||0)+dt; if(e.dotTick>0.5){ e.dotTick=0; this.damageEnemyNave(e,i); continue; } }
        const sm = e.slowed? 0.45 : 1;
        e.t=(e.t||0)+dt;
        if(e.sine){ e.x+=e.vx*sm*dt; e.y=e.baseY + Math.sin(e.t*e.freq)*e.amp; }
        else { e.x+=e.vx*sm*dt; e.y+=e.vy*sm*dt; }
        e.img.setPosition(e.x,e.y); e.shadow.setPosition(e.x,e.y+10);
        if(e.x<-40){ e.img.destroy(); e.shadow.destroy(); this.enemies.splice(i,1); continue; }
        if(Math.hypot(e.x-this.playerBody.x, e.y-this.playerBody.y)< 24){ this.fxExplode(e.x,e.y,0xf43f5e,6); e.img.destroy(); e.shadow.destroy(); this.enemies.splice(i,1); this.hurtPlayer(); }
      }
    }
    wave_horizontal(w){
      // esquadrão em formação V — escala por vez a cada 10 níveis
      const mult=this._getNaveSpawnMult();
      const n= Math.round((4+w)*mult);
      const cy=90+Math.random()*(BH-220);
      for(let k=0;k<n;k++){
        const off=(k-(n-1)/2);
        this.time.delayedCall(k*130, ()=>{ if(!this._finished) this.spawnHorizontalEnemy('runner', cy+Math.abs(off)*34); });
      }
      // extras simultâneos extras por tier
      const extra = this._getNaveExtraCount();
      for(let k=0;k<extra;k++) this.time.delayedCall(150+k*80, ()=>{ if(!this._finished) this.spawnHorizontalEnemy('runner', cy); });
      // par de mergulhadores
      if(w>=1) for(let k=0;k<2;k++) this.time.delayedCall(600+k*260, ()=>{ if(!this._finished){ const e=this.spawnHorizontalEnemy('wasp', 80+k*(BH-160)); } });
      if(mult>=1.6 && w>=1) for(let k=0;k<Math.round(extra+1);k++) this.time.delayedCall(900+k*200, ()=>{ if(!this._finished) this.spawnHorizontalEnemy('wasp', 120+Math.random()*(BH-240)); });
    }

    // ===== VERTICAL: já existe (boss + bullet hell) =====
    createVertical(){
      // Céu com degradê e nuvens (igual referência)
      const bg=this.add.graphics().setDepth(0);
      bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F6FF, 0xE0F6FF,1); bg.fillRect(0,0,BW,BH);
      this.clouds1 = this.add.tileSprite(BW/2, 60, BW,120,'soft').setTint(0xffffff).setAlpha(0.85).setDepth(1).setScale(1.8);
      this.clouds2 = this.add.tileSprite(BW/2,140,BW,80,'soft').setTint(0xffffff).setAlpha(0.55).setDepth(1).setScale(2.4);
      this.clouds3 = this.add.tileSprite(BW/2,BH/2,BW,BH,'soft').setTint(0xffffff).setAlpha(0.12).setDepth(1).setScale(3);
      const mtn=this.add.graphics().setDepth(2).setAlpha(0.35);
      mtn.fillStyle(0x1e3a5f,1); mtn.beginPath(); mtn.moveTo(0,BH-120); for(let x=0;x<BW;x+=40) mtn.lineTo(x, BH-140 - Math.sin(x*0.02)*30 - Math.random()*20); mtn.lineTo(BW,BH); mtn.lineTo(0,BH); mtn.fillPath();
      const texV=this._shipTextureKey();
      this.player=this.add.image(BW/2, BH-50, texV);
      if(!this.textures.exists(texV)) this.player.setTexture('dot');
      this.player.setScale(0.96 + Math.min(0.18, this.shipLevel*0.008)).setDepth(10);
      this.playerShadow=this.add.ellipse(this.player.x,this.player.y+16,28,10,0x000000,0.25).setDepth(9);
      this.playerBody={x:BW/2, y:BH-50, w:32,h:32};
      if(this.stage && this.stage.boss) this.spawnBossVertical();
      else { this.boss=null; this.bossHp=0; }
    }
    spawnBossVertical(){
      if(this.boss) return;
      const hpBase = this.stage && this.stage.boss ? 24 : 18;
      const boss=this.add.image(BW/2,90,'en_boss1');
      if(!this.textures.exists('en_boss1')) boss.setTexture('soft');
      boss.setScale(1.9).setDepth(8).setTint(0x1e3a8a);
      // detalhe boss: núcleo pulsante + canhões
      const core=this.add.circle(BW/2,90,14,0x38bdf8,0.9).setDepth(9);
      this.tweens.add({targets:core, scale:1.18, duration:420, yoyo:true, repeat:-1});
      this.bossCore=core;
      this.boss=boss; this.bossHp= hpBase + (this.stageIdx||0)*6 + (this.campaignIdx||0)*2;
      this.boss.setData('hp',this.bossHp);
      this.bossCannons=[];
      for(let i=0;i<6;i++){ const cx=BW/2-60+i*24; const c=this.add.rectangle(cx,110,8,22,0x334155).setDepth(9); this.bossCannons.push(c); }
      this.bossBarBg=this.add.rectangle(BW/2,32,220,10,0x000000,0.6).setDepth(20);
      this.bossBar=this.add.rectangle(BW/2-110,32,220,10,0xef4444).setOrigin(0,0.5).setDepth(21);
      this.bossBar.setData('max',220);
    }
    updateVertical(dt){
      // parallax nuvens
      if(this.clouds1) this.clouds1.tilePositionY -= dt*22;
      if(this.clouds2) this.clouds2.tilePositionY -= dt*38;
      if(this.clouds3) this.clouds3.tilePositionY -= dt*14;
      if(this.boss){
        this.boss.x = BW/2 + Math.sin(this.time.now*0.0010)*58;
        if(this.bossCore) this.bossCore.setPosition(this.boss.x,90);
        this.bossCannons.forEach((c,i)=> c.setPosition(this.boss.x -60 + i*24, 110 + Math.sin(this.time.now*0.002 + i)*5));
        this.bossBarBg.setPosition(this.boss.x,32); this.bossBar.setPosition(this.boss.x-110,32);
        this.bulletTimer+=dt;
        // padrão alternado: chuva + circular + mirado
        const interval = this.stage && this.stage.boss ? 0.28 : 0.32;
        if(this.bulletTimer>interval){
          this.bulletTimer=0;
          this.bossPattern = (this.bossPattern||0)+1;
          if(this.bossPattern%3===0){
            // chuva densa
            for(let i=0;i<5+(this.campaignIdx||0);i++){
              const sx=this.boss.x -42 + Math.random()*84;
              const eB=this.add.image(sx,130,'dot').setTint(0xfb923c).setScale(0.68).setDepth(8);
              this.eBullets.push({img:eB, x:sx, y:130, vy:210+Math.random()*70, vx:(Math.random()-0.5)*70});
            }
          } else if(this.bossPattern%3===1){
            // circular 12 vias
            for(let a=0;a<12;a++){ const ang=a*Math.PI/6 + this.bossPattern*0.18; const eB=this.add.image(this.boss.x,130,'dot').setTint(0xef4444).setScale(0.52).setDepth(8); this.eBullets.push({img:eB, x:this.boss.x, y:130, vy:Math.cos(ang)*165, vx:Math.sin(ang)*165}); }
          } else {
            // mirado no player
            const ang=Math.atan2(this.playerBody.y-130, this.playerBody.x-this.boss.x);
            for(let k=-1;k<=1;k++){
              const eB=this.add.image(this.boss.x,130,'dot').setTint(0xf43f5e).setScale(0.62).setDepth(8);
              this.eBullets.push({img:eB, x:this.boss.x, y:130, vy:Math.sin(ang+k*0.22)*240, vx:Math.cos(ang+k*0.22)*240});
            }
          }
        }
      }
      let dx=0,dy=0;
      if(this.cursors.left.isDown || this.wasd.A.isDown) dx=-1;
      if(this.cursors.right.isDown || this.wasd.D.isDown) dx=1;
      if(this.cursors.up.isDown || this.wasd.W.isDown) dy=-1;
      if(this.cursors.down.isDown || this.wasd.S.isDown) dy=1;
      if(this.input.activePointer.isDown){ const mx=this.input.activePointer.worldX; dx=Math.sign(mx-this.playerBody.x)*0.95; }
      this.playerBody.x=Phaser.Math.Clamp(this.playerBody.x+dx*340*dt,24,BW-24);
      this.playerBody.y=Phaser.Math.Clamp(this.playerBody.y+dy*300*dt,80,BH-32);
      this.player.setPosition(this.playerBody.x,this.playerBody.y);
      this.playerShadow.setPosition(this.playerBody.x,this.playerBody.y+18);
      // nave aponta onde corre: inclina quando vai para esquerda/direita
      this.player.setRotation(dx*0.55);
      // TIRO AUTOMÁTICO vertical (sempre atira para cima)
      this.autoFireTimer=(this.autoFireTimer||0)+dt;
      if(this.autoFireTimer>=this.autoFireDelay){ this.autoFireTimer=0; this.shoot(); }
      this.spawnTimer+=dt;
      const rate=Math.max(0.5, 0.95 - (this.stage.speed||1)*0.10);
      if(this.spawnTimer>rate){
        this.spawnTimer=0;
        this.spawnEnemyVertical(); if(Math.random()<0.4) this.spawnEnemyVertical();
        const extra = this._getNaveExtraCount();
        for(let k=0;k<extra;k++) this.spawnEnemyVertical();
        // a cada 10 níveis o bônus também aumenta o 40% de chance extra em +15% por tier
        const mult = this._getNaveSpawnMult();
        if(mult>1 && Math.random() < (mult-1)*0.5) this.spawnEnemyVertical();
      }
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        if(b.homing && (this.boss || this.enemies.length)){
          let ne=null, nd=1e9;
          const pool = this.boss? [{x:this.boss.x,y:110}] : this.enemies.filter(x=>!x.isBoss);
          for(const e of pool){ const d=Math.hypot(e.x-b.x,e.y-b.y); if(d<200 && d<nd){ nd=d; ne=e; } }
          if(ne){ const ang=Math.atan2(ne.y-b.y, ne.x-b.x); const ca=Math.atan2(b.vy,b.vx); let diff=ang-ca; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI; const turn=5.0*dt; const na=ca+Math.max(-turn,Math.min(turn,diff)); const sp=Math.hypot(b.vx,b.vy)||620; b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; }
        }
        b.y+=b.vy*dt; b.x+= (b.vx||0)*dt; b.img.setPosition(b.x,b.y);
        if(b.y<-12){ b.img.destroy(); this.bullets.splice(i,1); continue; }
        if(this.boss && Math.hypot(b.x-this.boss.x,b.y-110)<48){
          const rm=this._handleShipHit(b,{x:this.boss.x,y:110, def:{r:48, col:'#1e3a8a'}}, this.enemies);
          if(rm){ b.img.destroy(); this.bullets.splice(i,1); }
          this.bossHp--; if(this.bossBar) this.bossBar.width=220*Math.max(0,this.bossHp/(24+(this.campaignIdx||0)*2+ (this.stageIdx||0)*6));
          if(this.bossCore) this.bossCore.setFillStyle(0xffaaaa,0.9);
          this.boss.setTint(0xffaaaa); this.time.delayedCall(80,()=> { if(this.boss) this.boss.setTint(0x1e3a8a); if(this.bossCore) this.bossCore.setFillStyle(0x38bdf8,0.9); });
          this.cameras.main.shake(40,0.003);
          if(this.bossHp<=0){
            this.bossKilled=true;
            this.fxExplode(this.boss.x,110,0xfbbf24,26);
            SND.explosion(2.2); this.cameras.main.shake(280,0.010);
            const pts=this.addScore(15); this.popup(this.boss.x,90,'+'+pts+' BOSS!','#fbbf24');
            if(this.bossCore) this.bossCore.destroy(); this.boss.destroy(); this.boss=null; if(this.bossBar) this.bossBar.destroy(); if(this.bossBarBg) this.bossBarBg.destroy(); (this.bossCannons||[]).forEach(c=>c.destroy());
            this.announce('CHEFE DESTRUÍDO!', '#34d399');
          }
          continue;
        }
        // inimigos normais
        let hit=false;
        for(let j=this.enemies.length-1;j>=0;j--){
          const e=this.enemies[j];
          if(Math.hypot(e.x-b.x,e.y-b.y)< e.def.r+7){
            const rm=this._handleShipHit(b,e,this.enemies);
            if(rm){ b.img.destroy(); this.bullets.splice(j,1); }
            this.damageEnemyNave(e,j);
            hit=true; break;
          }
        }
        if(hit) continue;
      }
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.slowed && e.slowed>0){ e.slowed-=dt; if(e.slowed<=0){ e.slowed=0; e.img.setTint(Phaser.Display.Color.HexStringToColor(e.def.col).color); } else e.img.setTint(0x38bdf8); }
        if(e.dot && e.dotDur>0){ e.dotDur-=dt; e.dotTick=(e.dotTick||0)+dt; if(e.dotTick>0.5){ e.dotTick=0; this.damageEnemyNave(e,i); continue; } }
        const sm = e.slowed? 0.42 : 1;
        e.t=(e.t||0)+dt;
        // swoop: entra em curva depois cai
        let vx=e.vx||0;
        if(e.swoop){ e.y+=(60+e.vy*sm)*dt; e.x=e.baseX+Math.sin(e.t*3)*70; }
        else e.y+=e.vy*sm*dt;
        e.x+=vx*sm*dt*0;
        e.img.setPosition(e.x,e.y); if(e.shadow) e.shadow.setPosition(e.x,e.y+12); e.img.rotation+=dt*1.4*sm;
        if(e.y>BH+40){ e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1); continue; }
        if(e.y>BH-60 && Math.hypot(e.x-this.playerBody.x, e.y-this.playerBody.y)<28){ this.fxExplode(e.x,e.y,0xf43f5e,6); e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1); this.hurtPlayer(); }
      }
      for(let i=this.eBullets.length-1;i>=0;i--){
        const b=this.eBullets[i];
        b.y+=b.vy*dt; b.x+=b.vx*dt; b.img.setPosition(b.x,b.y);
        if(b.y>BH+20||b.x<-20||b.x>BW+20){ b.img.destroy(); this.eBullets.splice(i,1); continue; }
        if(Math.hypot(b.x-this.playerBody.x,b.y-this.playerBody.y)<18){ b.img.destroy(); this.eBullets.splice(i,1); this.hurtPlayer(); }
      }
    }
    spawnEnemyVertical(){
      const pool=this.stage.enemyPool||['drone','runner','swarm','wasp'];
      const t=pool[Math.floor(Math.random()*pool.length)];
      const def=D.ENEMIES_DATA[t];
      const x=40+Math.random()*(BW-80), y=-20;
      const img=this.add.image(x,y,'en_'+t).setScale(0.9).setDepth(8);
      img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
      const sh=this.add.ellipse(x,y+12,16,6,0x000000,0.2).setDepth(7);
      const pts=t==='shielded'?30:(t==='bomber'?20:10);
      this.enemies.push({img, shadow:sh, x,y, baseX:x, vy:(85+Math.random()*85)*(this.stage.speed||1) + Math.min(120,this.score*0.5), hp:1, def, pts});
    }
    spawnVerticalSquadron(){
      const mult=this._getNaveSpawnMult();
      const n= Math.round(5*mult);
      const bx=100+Math.random()*(BW-220);
      for(let k=0;k<n;k++){
        this.time.delayedCall(k*160, ()=>{
          if(this._finished) return;
          const def=D.ENEMIES_DATA['drone'];
          const x=bx+k*26 - ((n-5)*13), y=-24;
          const img=this.add.image(x,y,'en_drone').setScale(0.9).setDepth(8);
          if(!this.textures.exists('en_drone')) img.setTexture('dot');
          img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
          const sh=this.add.ellipse(x,y+12,16,6,0x000000,0.2).setDepth(7);
          this.enemies.push({img, shadow:sh, x, y, baseX:x, vy:150*(this.stage.speed||1), hp:1, def, pts:20, swoop:true});
        });
      }
    }
    wave_vertical(w){
      this.spawnVerticalSquadron();
      if(w>=2){ // segunda esquadrilha espelhada
        this.time.delayedCall(900, ()=>{ if(!this._finished) this.spawnVerticalSquadron(); });
      }
      // esquadrão extra por tier alto (por vez)
      const extra = this._getNaveExtraCount();
      if(extra>0) this.time.delayedCall(500, ()=>{ if(!this._finished) this.spawnVerticalSquadron(); });
    }

    // ===== ARENA: twin-stick sem física, com obstáculos =====
    createArena(){
      const bg=this.add.graphics().setDepth(0);
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(this.stage.bg||'#0f172a').color,1); bg.fillRect(0,0,BW,BH);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.stage.accent||'#34d399').color, 0.35); bg.strokeRect(4,4,BW-8,BH-8);
      // 4 pilares como obstáculos
      this.pillars=[];
      const pillPos=[[BW*0.22,BH*0.32],[BW*0.78,BH*0.32],[BW*0.22,BH*0.72],[BW*0.78,BH*0.72]];
      pillPos.forEach(([px,py])=>{
        const r=this.add.rectangle(px,py,36,36,0x0f172a).setDepth(2).setStrokeStyle(1,0x34d399,0.45);
        this.add.rectangle(px,py,24,24,0x1e293b).setDepth(2);
        this.pillars.push({x:px,y:py,w:36,h:36});
      });
      // bordas visuais
      this.add.rectangle(BW/2,6,BW-8,12,0x0f172a).setDepth(1).setStrokeStyle(1,0x34d399,0.6);
      this.add.rectangle(BW/2,BH-6,BW-8,12,0x0f172a).setDepth(1).setStrokeStyle(1,0x34d399,0.6);
      const texA=this._shipTextureKey();
      this.player=this.add.image(BW/2,BH/2,texA);
      if(!this.textures.exists(texA)) this.player.setTexture('dot');
      this.player.setScale(0.96 + Math.min(0.2, this.shipLevel*0.009)).setDepth(10);
      this.playerBody={x:BW/2, y:BH/2, w:28,h:28};
      this.playerShadow=this.add.ellipse(this.player.x,this.player.y+16,22,8,0x000000,0.2).setDepth(9);
      // mira mouse
      this.aimLine=this.add.graphics().setDepth(11);
      this.input.on('pointermove', p=>{ this.mouseX=p.worldX; this.mouseY=p.worldY; });
      this.mouseX=BW/2; this.mouseY=BH/2;
    }
    updateArena(dt){
      const W=BW, H=BH;
      let dx=0,dy=0;
      if(this.cursors.left.isDown || this.wasd.A.isDown) dx=-1;
      if(this.cursors.right.isDown || this.wasd.D.isDown) dx=1;
      if(this.cursors.up.isDown || this.wasd.W.isDown) dy=-1;
      if(this.cursors.down.isDown || this.wasd.S.isDown) dy=1;
      if(dx!==0 && dy!==0){ dx*=0.7071; dy*=0.7071; }
      // WASD move arena fechada
      let nx = Phaser.Math.Clamp(this.playerBody.x + dx*265*dt, 22, W-22);
      let ny = Phaser.Math.Clamp(this.playerBody.y + dy*265*dt, 22, H-22);
      // colisão com pilares
      for(const pill of (this.pillars||[])){
        if(Math.abs(nx-pill.x) < (pill.w/2+14) && Math.abs(ny-pill.y) < (pill.h/2+14)){
          // empurra para fora
          const ang=Math.atan2(ny-pill.y, nx-pill.x);
          nx = pill.x + Math.cos(ang)*(pill.w/2+15);
          ny = pill.y + Math.sin(ang)*(pill.h/2+15);
        }
      }
      this.playerBody.x=nx; this.playerBody.y=ny;
      // mouse mira 360°
      const ang=Math.atan2(this.mouseY - this.playerBody.y, this.mouseX - this.playerBody.x);
      this.player.setRotation(ang + Math.PI/2);
      this.player.setPosition(this.playerBody.x, this.playerBody.y);
      this.playerShadow.setPosition(this.playerBody.x, this.playerBody.y+14);
      // linha de mira
      this.aimLine.clear(); this.aimLine.lineStyle(1.5, 0x34d399, 0.55);
      this.aimLine.lineBetween(this.playerBody.x, this.playerBody.y, this.mouseX, this.mouseY);
      this.aimLine.fillStyle(0x34d399,0.9); this.aimLine.fillCircle(this.mouseX, this.mouseY, 4);
      // TIRO AUTOMÁTICO arena (360° para mira)
      this.autoFireTimer=(this.autoFireTimer||0)+dt;
      if(this.autoFireTimer>=this.autoFireDelay){ this.autoFireTimer=0; this.shoot(); }
      // spawn arena - vetorial sem física
      this.spawnTimer+=dt;
      const rate = Math.max(0.28, 0.52 - (this.stage.speed||1)*0.06);
      if(this.spawnTimer>rate){
        this.spawnTimer=0;
        const pool=this.stage.enemyPool||['swarm','splitter','phase'];
        const spawnOne=()=>{
          const t=pool[Math.floor(Math.random()*pool.length)];
          const def=D.ENEMIES_DATA[t]||D.ENEMIES_DATA['swarm'];
          const edge=Math.floor(Math.random()*4);
          let x=edge===0? -22 : edge===1? W+22 : Math.random()*W;
          let y=edge===2? -22 : edge===3? H+22 : Math.random()*H;
          if(edge<2) y=Math.random()*H;
          const img=this.add.image(x,y,'en_'+t).setScale(0.92).setDepth(8);
          if(!this.textures.exists('en_'+t)) img.setTexture('dot');
          img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
          const sh=this.add.ellipse(x,y+10,16,6,0x000000,0.18).setDepth(7);
          const spd = t==='swarm'? 92 : t==='phase'? 105 : t==='splitter'? 68 : 75;
          this.enemies.push({img, shadow:sh, x,y, hp:1, def, spd: spd*(this.stage.speed||1), t:0});
        };
        spawnOne();
        const extra = this._getNaveExtraCount();
        for(let k=0;k<extra;k++) spawnOne();
      }
      // move enemies vetorial
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.isBoss){ e.img.setPosition(e.x,e.y); if(e.shadow) e.shadow.setPosition(e.x,e.y+46); }
        else {
          if(e.slowed && e.slowed>0){ e.slowed-=dt; if(e.slowed<=0){ e.slowed=0; if(e.img) e.img.setTint(Phaser.Display.Color.HexStringToColor(e.def.col).color); } else e.img.setTint(0x38bdf8); }
          if(e.dot && e.dotDur>0){ e.dotDur-=dt; e.dotTick=(e.dotTick||0)+dt; if(e.dotTick>0.5){ e.dotTick=0; this.damageEnemyNave(e,i); continue; } }
          e.t=(e.t||0)+dt;
          const angE=Math.atan2(this.playerBody.y - e.y, this.playerBody.x - e.x);
          let spd=e.spd * (e.slowed? 0.38 : 1);
          if(e.dasher){
            // dasher: persegue, pausa, telegrafa, avança
            e.dt2=(e.dt2||0)+dt;
            const cyc=e.dt2%2.6;
            if(cyc<1.4){ e.x+=Math.cos(angE)*spd*dt; e.y+=Math.sin(angE)*spd*dt; e.img.setAlpha(1); }
            else if(cyc<2.0){ e.img.setAlpha(0.5+Math.sin(e.dt2*20)*0.3); } // telegraph
            else { e.x+=e.dx*spd*3.2*dt; e.y+=e.dy*spd*3.2*dt; e.img.setAlpha(1); if(!e.locked){ e.locked=true; e.dx=Math.cos(angE); e.dy=Math.sin(angE);} }
            if(cyc<0.05) e.locked=false;
          } else if(e.orbiter){
            e.ot=(e.ot||Math.random()*6)+dt*2.1;
            e.x+=Math.cos(angE)*spd*0.7*dt + Math.cos(e.ot)*60*dt;
            e.y+=Math.sin(angE)*spd*0.7*dt + Math.sin(e.ot)*60*dt;
          } else {
            e.x+=Math.cos(angE)*spd*dt; e.y+=Math.sin(angE)*spd*dt;
          }
          // desvia de pilares
          for(const pill of (this.pillars||[])){
            if(Math.abs(e.x-pill.x) < (pill.w/2+10) && Math.abs(e.y-pill.y) < (pill.h/2+10)){
              const a=Math.atan2(e.y-pill.y, e.x-pill.x);
              e.x = pill.x + Math.cos(a)*(pill.w/2+12);
              e.y = pill.y + Math.sin(a)*(pill.h/2+12);
            }
          }
        }
        e.img.setPosition(e.x,e.y); if(e.shadow) e.shadow.setPosition(e.x,e.y+10);
        if(Math.hypot(e.x-this.playerBody.x, e.y-this.playerBody.y)< 23){
          this.fxExplode(e.x,e.y,0xf43f5e,6);
          e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1);
          this.hurtPlayer(); continue;
        }
        for(let j=this.bullets.length-1;j>=0;j--){
          const b=this.bullets[j];
          if(Math.hypot(e.x-b.x, e.y-b.y)< e.def.r+9){
            const rm=this._handleShipHit(b,e,this.enemies);
            if(rm){ b.img.destroy(); this.bullets.splice(j,1); }
            if(!e.isBoss) this.damageEnemyNave(e,j);
            break;
          }
        }
      }
      // balas arena (homing)
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        if(b.homing && this.enemies.length){
          let ne=null, nd=1e9; for(const e of this.enemies){ if(e.isBoss) continue; const d=Math.hypot(e.x-b.x,e.y-b.y); if(d<170 && d<nd){ nd=d; ne=e; } }
          if(ne){ const ang=Math.atan2(ne.y-b.y, ne.x-b.x); const ca=Math.atan2(b.vy,b.vx); let diff=ang-ca; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI; const turn=4.0*dt; const na=ca+Math.max(-turn,Math.min(turn,diff)); const sp=Math.hypot(b.vx,b.vy); b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; }
        }
        b.x+=b.vx*dt; b.y+=b.vy*dt; b.img.setPosition(b.x,b.y);
        if(b.x<-22||b.x>W+22||b.y<-22||b.y>H+22){ b.img.destroy(); this.bullets.splice(i,1); }
      }
    }
    wave_arena(w){
      // anel de inimigos convergindo das bordas — escala por vez
      const mult=this._getNaveSpawnMult();
      const n= Math.round((6+w*2)*mult);
      for(let k=0;k<n;k++){
        const ang=k/n*Math.PI*2;
        const x=BW/2+Math.cos(ang)*(BW*0.56), y=BH/2+Math.sin(ang)*(BH*0.62);
        const pool=this.stage.enemyPool||['swarm','drone'];
        const t=pool[Math.floor(Math.random()*pool.length)];
        const def=D.ENEMIES_DATA[t]||D.ENEMIES_DATA['swarm'];
        const img=this.add.image(x,y,'en_'+t).setScale(0.92).setDepth(8);
        if(!this.textures.exists('en_'+t)) img.setTexture('dot');
        img.setTint(Phaser.Display.Color.HexStringToColor(def.col).color);
        const sh=this.add.ellipse(x,y+10,16,6,0x000000,0.18).setDepth(7);
        this.enemies.push({img, shadow:sh, x,y, hp:1, def, spd:80*(this.stage.speed||1), t:0, pts:15});
      }
      if(w>=2){ // dasher especial
        const def=D.ENEMIES_DATA['wasp']||D.ENEMIES_DATA['swarm'];
        const img=this.add.image(BW+24,BH/2,'en_wasp').setScale(1.05).setDepth(8).setTint(0xf43f5e);
        this.enemies.push({img,x:BW+24,y:BH/2,hp:2,def:{r:16,col:'#f43f5e'},spd:95*(this.stage.speed||1),dasher:true,pts:40});
      }
      if(w>=3){
        const def=D.ENEMIES_DATA['phase']||D.ENEMIES_DATA['swarm'];
        const img=this.add.image(BW/2,-24,'en_phase').setScale(1.0).setDepth(8).setTint(0x22d3ee);
        this.enemies.push({img,x:BW/2,y:-24,hp:2,def:{r:15,col:'#22d3ee'},spd:88*(this.stage.speed||1),orbiter:true,pts:35});
      }
    }

    // ===== TUNEL: pseudo-3D com perspectiva real e speed lines =====
    createTunnel(){
      const bgCol=this.stage.bg||'#050914';
      this.cameras.main.setBackgroundColor(bgCol);
      this.tunnelGfx=this.add.graphics().setDepth(0);
      this.lanes = [-1,0,1];
      this.laneX = [BW*0.28, BW*0.5, BW*0.72];
      this.currentLane=1;
      this.tunnelDepth=0;
      this.rings=[];
      for(let i=0;i<10;i++) this.rings.push({z: i*0.10});
      // estrelas de velocidade radial
      this.speedStars=[];
      for(let i=0;i<28;i++) this.speedStars.push({x:Math.random()*BW, y:Math.random()*BH, s:0.6+Math.random()*1.2});
      const texT=this._shipTextureKey();
      this.player=this.add.image(this.laneX[this.currentLane], BH-74, texT);
      if(!this.textures.exists(texT)) this.player.setTexture('dot');
      this.player.setScale(0.96 + Math.min(0.18, this.shipLevel*0.008)).setDepth(11);
      this.playerBody={x:this.laneX[this.currentLane], y:BH-74, lane:this.currentLane};
      this.playerShadow=this.add.ellipse(this.player.x,this.player.y+16,24,8,0x000000,0.24).setDepth(10);
      this.tunnelSpawnTimer=0;
      this.input.keyboard.on('keydown-LEFT', ()=> this.shiftLane(-1));
      this.input.keyboard.on('keydown-RIGHT', ()=> this.shiftLane(1));
      this.input.keyboard.on('keydown-A', ()=> this.shiftLane(-1));
      this.input.keyboard.on('keydown-D', ()=> this.shiftLane(1));
      this.input.on('pointerdown', p=>{ if(p.worldX < BW*0.33) this.shiftLane(-1); else if(p.worldX>BW*0.66) this.shiftLane(1); else this.shoot(); });
    }
    shiftLane(dir){
      const nl=Phaser.Math.Clamp(this.currentLane+dir,0,2);
      if(nl===this.currentLane) return;
      this.currentLane=nl; this.playerBody.lane=nl;
      this.tweens.add({targets:this.player, x:this.laneX[nl], duration:120, ease:'Cubic.easeOut'});
      // inclina na direção do movimento (se corre pra esquerda aponta esquerda)
      this.tweens.add({targets:this.player, rotation: dir*0.55, duration:90, yoyo:true, onComplete:()=> this.player.setRotation(0)});
      SND.ui();
    }
    updateTunnel(dt){
      this.tunnelDepth += dt * 1.7 * (this.stage.speed||1);
      const g=this.tunnelGfx; g.clear();
      const cx=BW/2, cy=BH*0.38;
      // speed stars radial
      g.fillStyle(0xffffff,0.55);
      for(const s of (this.speedStars||[])){
        s.y += dt*420*(this.stage.speed||1)*s.s;
        if(s.y>BH) { s.y=-10; s.x=Math.random()*BW; }
        g.fillCircle(s.x, s.y, 1.2*s.s);
        // rastro
        g.fillStyle(0xffffff,0.18); g.fillRect(s.x-0.5, s.y-8, 1, 8); g.fillStyle(0xffffff,0.55);
      }
      for(let i=0;i<this.rings.length;i++){
        const ring=this.rings[i];
        let z = (ring.z + this.tunnelDepth) % 1;
        if(z<0) z+=1;
        const scale = 0.10 + z*0.90;
        const rx = 38 + scale* 360;
        const ry = 24 + scale* 240;
        const alpha = 0.14 + (1-z)*0.48;
        g.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.stage.accent||'#a3e635').color, alpha);
        g.strokeEllipse(cx, cy, rx*2, ry*2);
        // lanes em perspectiva real (convergem para o centro)
        g.lineStyle(1, 0xa3e635, 0.10 + (1-z)*0.08);
        for(let l=0;l<3;l++){
          const laneOff = (this.laneX[l]-BW/2) * scale;
          const lx = cx + laneOff;
          const lxPrev = cx + (this.laneX[l]-BW/2) * Math.max(0.08, scale-0.10);
          g.lineBetween(lx, cy - ry*0.92, lxPrev, cy - (ry-18)*0.92);
          // luzes laterais do túnel
          if(i%2===0){
            g.fillStyle(0xa3e635, alpha*0.7); g.fillCircle(lx, cy - ry*0.92, 1.8);
          }
        }
      }
      // spawn timer dedicado (mais confiável que z>0.92 random)
      this.tunnelSpawnTimer=(this.tunnelSpawnTimer||0)+dt;
      const sRate = Math.max(0.62, 1.0 - (this.stage.speed||1)*0.10);
      if(this.tunnelSpawnTimer> sRate){
        this.tunnelSpawnTimer=0;
        this.spawnTunnelEnemy();
        const extra = this._getNaveExtraCount();
        for(let k=0;k<extra;k++) this.spawnTunnelEnemy();
      }
      // player lanes interp
      this.playerBody.x = this.laneX[this.currentLane];
      // não precisa setPosition pois tween já faz, mas garante
      this.playerShadow.setPosition(this.player.x, this.player.y+16);
      // TIRO AUTOMÁTICO túnel (sempre para frente)
      this.autoFireTimer=(this.autoFireTimer||0)+dt;
      if(this.autoFireTimer>=this.autoFireDelay){ this.autoFireTimer=0; this.shoot(); }
      // inimigos descem nas lanes
      for(let i=this.enemies.length-1;i>=0;i--){
        const e=this.enemies[i];
        if(e.slowed && e.slowed>0){ e.slowed-=dt; if(e.slowed<=0) e.slowed=0; }
        if(e.dot && e.dotDur>0){ e.dotDur-=dt; e.dotTick=(e.dotTick||0)+dt; if(e.dotTick>0.5){ e.dotTick=0; this.damageEnemyNave(e,i); continue; } }
        const sm = e.slowed? 0.42 : 1;
        // flipper: pula de lane periodicamente (Tempest!)
        if(e.flipper){
          e.flipT=(e.flipT==null? 0.9+Math.random()*0.8 : e.flipT)-dt;
          if(e.flipT<=0 && e.y<BH*0.72){
            e.flipT=0.9+Math.random()*0.9;
            e.lane=Phaser.Math.Wrap(e.lane+(Math.random()<0.5?-1:1),0,3);
            this.tweens.add({targets:e.img, x:this.laneX[e.lane], duration:160, ease:'Sine.easeInOut'});
            SND.ui();
          }
          e.x=e.img.x;
        }
        e.y += e.vy * sm * dt;
        e.img.setPosition(e.x, e.y);
        if(e.shadow) e.shadow.setPosition(e.x, e.y+12);
        e.img.setScale(0.78 + (e.y/BH)*0.42);
        if(e.y>BH+30){ e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1); continue; }
        if(e.lane===this.currentLane && Math.abs(e.y - this.playerBody.y) < 30){
          this.fxExplode(e.x,e.y,0xf43f5e,7);
          e.img.destroy(); if(e.shadow) e.shadow.destroy(); this.enemies.splice(i,1);
          this.hurtPlayer(); continue;
        }
        for(let j=this.bullets.length-1;j>=0;j--){
          const b=this.bullets[j];
          if(Math.abs(b.x - e.x) < 22 && Math.hypot(e.x-b.x, e.y-b.y) < e.def.r+14){
            const rm=this._handleShipHit(b,e,this.enemies);
            if(rm){ b.img.destroy(); this.bullets.splice(j,1); }
            if(!e.isBoss) this.damageEnemyNave(e,i);
            break;
          }
        }
      }
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i];
        if(b.homing && this.enemies.length){
          let ne=null, nd=1e9; for(const e of this.enemies){ const d=Math.hypot(e.x-b.x,e.y-b.y); if(d<190 && d<nd){ nd=d; ne=e; } }
          if(ne){ const ang=Math.atan2(ne.y-b.y, ne.x-b.x); const ca=Math.atan2(b.vy,b.vx); let diff=ang-ca; while(diff>Math.PI) diff-=2*Math.PI; while(diff<-Math.PI) diff+=2*Math.PI; const turn=5.5*dt; const na=ca+Math.max(-turn,Math.min(turn,diff)); const sp=Math.hypot(b.vx,b.vy)||620; b.vx=Math.cos(na)*sp; b.vy=Math.sin(na)*sp; }
        }
        b.y+=b.vy*dt; b.x+= (b.vx||0)*dt; b.img.setPosition(b.x,b.y);
        if(b.y<-20){ b.img.destroy(); this.bullets.splice(i,1); }
      }
    }

    _shipTextureKey(){
      const tier = D.getTier ? D.getTier(this.shipLevel) : Math.max(1, Math.min(5, Math.ceil(this.shipLevel / 10)));
      const key = 'tur_' + this.shipDef.id + '_t' + tier;
      return this.textures.exists(key) ? key : ('tur_' + this.shipDef.id + '_1');
    }
    _shipCol(){ return Phaser.Display.Color.HexStringToColor(this.shipDef.color).color; }
    _shipDmg(){ return (this.shipDef.dmg||16) * (this.shipDmgMul||1) * 0.18; }
    // +30% inimigos a cada 10 níveis POR VEZ (simultâneos)
    _getNaveGlobalLevel(){
      if(this.campaign!=null && this.campaignIdx!=null && this.phaseIdx!=null) return this.campaignIdx*5 + this.phaseIdx + 1;
      return (this.stageIdx||0) + (this.waveIdx||0) + 1;
    }
    _getNaveSpawnMult(){
      const lvl = this._getNaveGlobalLevel();
      return 1 + Math.floor(Math.max(0, lvl-1)/10)*0.30;
    }
    _getNaveExtraCount(){
      const mult = this._getNaveSpawnMult();
      const extra = mult - 1;
      const guaranteed = Math.floor(extra);
      const chance = extra - guaranteed;
      return guaranteed + (Math.random() < chance ? 1 : 0);
    }
    _createShipBullet(bx,by,vx,vy){
      const def=this.shipDef; const col=this._shipCol(); const kind=def.kind||'bullet';
      const lvl=this.shipLevel||1;
      // skills que afetam tiro
      let pierce= (lvl>=16 && def.skills && def.skills.some(s=>s.lvl===16 && s.eff && s.eff.pierce)) ? 2 : 1;
      if(def.id==='rail') pierce= 99;
      if(def.id==='sniper') pierce= 3;
      if(def.id==='laser') pierce= 3;
      if(def.id==='gatling' && lvl>=16) pierce=2;
      // escala base por nave
      let scale=0.72, life=1.35, tint=col;
      let bullet={x:bx,y:by,vx,vy, life, dmg: this._shipDmg(), kind, pierce, shipId:def.id, hits:0};
      let img;
      if(kind==='beam'){ // laser
        img=this.add.rectangle(bx,by,5,14, col).setDepth(9);
        this.tweens.add({targets:img, alpha:0.85, duration:80, yoyo:true, repeat:1});
        scale=0.95; bullet.life=0.55; bullet.pierce=4;
        // raio visual
        const beam=this.add.rectangle(bx,by,3,22, col).setAlpha(0.55).setDepth(8);
        this.tweens.add({targets:beam, alpha:0, scaleY:0.2, duration:140, onComplete:()=>beam.destroy()});
      } else if(kind==='splash'){ // missile
        img=this.add.image(bx,by,'dot').setTint(col).setScale(0.92).setDepth(9);
        bullet.splash= def.splash||65; bullet.homing=true; bullet.life=1.6; scale=0.92;
        // rastro fumaça
        const sm=this.add.image(bx,by,'soft').setTint(0x475569).setScale(0.45).setAlpha(0.45).setDepth(8);
        this.tweens.add({targets:sm, alpha:0, scale:0.15, duration:260, onComplete:()=>sm.destroy()});
      } else if(kind==='slow'){ // cryo
        img=this.add.image(bx,by,'dot').setTint(0x38bdf8).setScale(0.78).setDepth(9);
        bullet.slow=0.55; bullet.slowDur=1.8; tint=0x38bdf8;
        const ring=this.add.circle(bx,by,4,0x38bdf8,0.35).setDepth(8);
        this.tweens.add({targets:ring, scale:2.2, alpha:0, duration:320, onComplete:()=>ring.destroy()});
      } else if(kind==='chain'){ // tesla
        img=this.add.image(bx,by,'dot').setTint(col).setScale(0.88).setDepth(9);
        bullet.chain= def.chain||4; if(lvl>=16) bullet.chain+=1;
        bullet.life=1.2;
        const zap=this.add.graphics().setDepth(8);
        zap.lineStyle(2, col, 0.85); zap.lineBetween(bx,by, bx+vx*0.04, by+vy*0.04);
        this.time.delayedCall(80, ()=> zap.destroy());
      } else if(kind==='snipe'){ // sniper
        img=this.add.rectangle(bx,by,3,10, col).setDepth(9);
        bullet.pierce=4; bullet.life=1.1; scale=0.9;
      } else if(kind==='dot'){ // venom
        img=this.add.image(bx,by,'dot').setTint(0xa3e635).setScale(0.82).setDepth(9);
        bullet.dot=3.5; bullet.dotDur=2.2; bullet.life=1.4;
      } else if(kind==='buff'){ // amp
        img=this.add.image(bx,by,'soft').setTint(0xfde047).setScale(0.75).setDepth(9);
        bullet.splash=32; bullet.buff=true; bullet.life=1.3; scale=0.85;
      } else if(kind==='pierce'){ // rail
        img=this.add.rectangle(bx,by,4,16, 0xffffff).setDepth(9);
        img.setStrokeStyle(1, col, 0.9);
        bullet.pierce=99; bullet.life=0.9; scale=1.0;
        const trail=this.add.rectangle(bx,by,2,20, col).setAlpha(0.35).setDepth(8);
        this.tweens.add({targets:trail, alpha:0, scaleX:0.2, duration:180, onComplete:()=>trail.destroy()});
      } else { // bullet padrão (cannon, gatling)
        img=this.add.image(bx,by,'dot').setTint(col).setScale(0.72 + Math.min(0.35, lvl*0.02)).setDepth(9);
        if(def.id==='gatling' && lvl>=28) bullet.multi=1;
      }
      if(!img) img=this.add.image(bx,by,'dot').setTint(col).setScale(scale).setDepth(9);
      if(img.setTint) try{ img.setTint(tint);}catch(_){}
      bullet.img=img;
      // MUZZLE FLASH
      const mf=this.add.image(bx,by,'soft').setTint(col).setScale(0.5).setAlpha(0.85).setDepth(10);
      this.tweens.add({targets:mf, scale:0.9, alpha:0, duration:90, onComplete:()=>mf.destroy()});
      const sndMap={beam:'pierce', splash:'splash', slow:'slow', chain:'chain', snipe:'snipe', dot:'dot', buff:'bullet', pierce:'pierce', bullet:'bullet'};
      try{ SND.shoot(sndMap[kind]||'bullet'); }catch(_){}
      return bullet;
    }
    _handleShipHit(bullet, enemy, enemies){
      // BOSS: decrementa HP, não mata
      if(enemy.isBoss){
        bullet.hits=(bullet.hits||0)+1;
        const maxPierce=bullet.pierce||1;
        const dead=this._handleBossHit(bullet, enemy);
        return dead || bullet.hits>=maxPierce;
      }
      // splash (missile)
      if(bullet.splash){
        const rad= bullet.splash;
        const ex=this.add.circle(enemy.x, enemy.y, 8, this._shipCol(), 0.85).setDepth(9);
        this.tweens.add({targets:ex, scale: rad/8, alpha:0, duration:260, onComplete:()=>ex.destroy()});
        SND.explosion(0.9);
        for(let j=enemies.length-1;j>=0;j--){
          const other=enemies[j];
          if(other===enemy || other.isBoss) continue;
          if(Math.hypot(other.x-enemy.x, other.y-enemy.y) < rad){
            this.fxExplode(other.x,other.y,Phaser.Display.Color.HexStringToColor((other.def&&other.def.col)||'#94a3b8').color,5);
            other.img.destroy(); if(other.shadow) other.shadow.destroy();
            // remove from array
            const idx=enemies.indexOf(other);
            if(idx>=0) enemies.splice(idx,1);
            this.kills++; this.score+=5;
          }
        }
      }
      // chain (tesla) - salta para até chain próximos
      if(bullet.chain && bullet.chain>1){
        let chainLeft=bullet.chain-1;
        let cur=enemy;
        const hitSet=new Set([cur]);
        while(chainLeft>0){
          let nearest=null, nd=1e9;
          for(const other of enemies){
            if(hitSet.has(other)) continue;
            const d=Math.hypot(other.x-cur.x, other.y-cur.y);
            if(d<85 && d<nd){ nd=d; nearest=other; }
          }
          if(!nearest) break;
          hitSet.add(nearest);
          const zap=this.add.graphics().setDepth(9);
          zap.lineStyle(2, this._shipCol(), 0.9); zap.lineBetween(cur.x,cur.y, nearest.x, nearest.y);
          this.time.delayedCall(90, ()=> zap.destroy());
          nearest.img.setTint(0xffffff); this.time.delayedCall(80, ()=> { if(nearest.img && nearest.img.active) nearest.img.setTint(Phaser.Display.Color.HexStringToColor(nearest.def.col).color); });
          // aplica dano: marca para remover
          this.time.delayedCall(40, ()=>{
            const idx=enemies.indexOf(nearest);
            if(idx>=0){ nearest.img.destroy(); if(nearest.shadow) nearest.shadow.destroy(); enemies.splice(idx,1); this.kills++; this.score+=5; SND.explosion(0.5); }
          });
          cur=nearest; chainLeft--;
        }
      }
      // slow (cryo)
      if(bullet.slow){
        enemy.slowed = bullet.slowDur||1.8;
        enemy.slowVal = bullet.slow||0.55;
        enemy.img.setTint(0x38bdf8);
        this.time.delayedCall((bullet.slowDur||1.8)*1000, ()=>{ if(enemy.img && enemy.img.active) enemy.img.setTint(Phaser.Display.Color.HexStringToColor(enemy.def.col).color); });
      }
      // dot (venom)
      if(bullet.dot){
        enemy.dot = bullet.dot; enemy.dotDur = bullet.dotDur||2.2; enemy.dotTick=0;
        enemy.img.setTint(0xa3e635);
      }
      // pierce: se ainda tem pierce, não destrói bala
      bullet.hits = (bullet.hits||0)+1;
      const maxPierce = bullet.pierce||1;
      return bullet.hits >= maxPierce;
    }
    shoot(){
      if(!this.phaseActive || this.timeLeft<=0 || this._finished) return;
      const def=this.shipDef;
      const getDir=()=>{
        if(this.styleId==='asteroids'){
          const ang=this.playerBody.angle; return {bx:this.playerBody.x, by:this.playerBody.y-14, vx:Math.cos(ang)*520, vy:Math.sin(ang)*520};
        } else if(this.styleId==='horizontal'){
          if(this.isCharging && this.charge>0.18) return null;
          return {bx:this.playerBody.x+18, by:this.playerBody.y, vx:560, vy:0};
        } else if(this.styleId==='arena'){
          const ang=Math.atan2(this.mouseY - this.playerBody.y, this.mouseX - this.playerBody.x);
          return {bx:this.playerBody.x, by:this.playerBody.y, vx:Math.cos(ang)*520, vy:Math.sin(ang)*520};
        } else if(this.styleId==='tunnel'){
          return {bx:this.laneX[this.currentLane], by:this.playerBody.y-18, vx:0, vy:-620};
        } else {
          return {bx:this.playerBody.x, by:this.playerBody.y-18, vx:0, vy:-620};
        }
      };
      const dir=getDir(); if(!dir) return;
      // cria projétil padrão da nave
      const b=this._createShipBullet(dir.bx, dir.by, dir.vx, dir.vy);
      this.bullets.push(b);
      // WEAPON TIER (power-ups): 2=paralelo, 3=spread 3, 4=paralelos+spread
      const spd=Math.hypot(dir.vx,dir.vy)||1;
      const px=-dir.vy/spd, py=dir.vx/spd; // perpendicular
      if(this.weaponTier>=2){
        const b2=this._createShipBullet(dir.bx+px*11, dir.by+py*11, dir.vx, dir.vy);
        this.bullets.push(b2);
      }
      if(this.weaponTier>=3){
        for(const a of [-0.17,0.17]){
          const vx2=dir.vx*Math.cos(a)-dir.vy*Math.sin(a), vy2=dir.vx*Math.sin(a)+dir.vy*Math.cos(a);
          const b3=this._createShipBullet(dir.bx, dir.by, vx2, vy2);
          b3.life=(b3.life||1)*0.85; this.bullets.push(b3);
        }
      }
      if(this.weaponTier>=4 && def.id!=='laser' && def.id!=='gatling'){
        const b4=this._createShipBullet(dir.bx-px*11, dir.by-py*11, dir.vx, dir.vy);
        this.bullets.push(b4);
      }
      this.tweens.add({targets:this.player, scale:1.18, duration:60, yoyo:true});
      // gatling rajada extra
      if(def.id==='gatling' && this.shipLevel>=12){
        const b2=this._createShipBullet(dir.bx, dir.by+6, dir.vx, dir.vy);
        b2.life=1.0; this.bullets.push(b2);
      }
      // laser prisma (se tiver skill)
      if(def.id==='laser' && this.shipLevel>=16){
        for(let a of [-0.18,0.18]){
          const vx2 = dir.vx*Math.cos(a) - dir.vy*Math.sin(a);
          const vy2 = dir.vx*Math.sin(a) + dir.vy*Math.cos(a);
          const pb=this._createShipBullet(dir.bx, dir.by, vx2*0.92, vy2*0.92);
          pb.life=0.45; this.bullets.push(pb);
        }
      }
    }

    update(_, delta){
      const dt=delta/1000;
      if(!this.phaseActive || this.timeLeft<=0 || this._finished) return;
      this.timeLeft-=dt;
      // ondas + sistemas compartilhados
      this.processWaves(dt);
      // switch(this.styleId) em update - exigido spec
      switch(this.styleId){
        case 'asteroids': this.updateAsteroids(dt); break;
        case 'horizontal': this.updateHorizontal(dt); break;
        case 'vertical': this.updateVertical(dt); break;
        case 'arena': this.updateArena(dt); break;
        case 'tunnel': this.updateTunnel(dt); break;
        default: this.updateVertical(dt); break;
      }
      if(this.boss && this['bossUpd_'+this.styleId]) this['bossUpd_'+this.styleId](this.boss, dt);
      this.updateCentral(dt);
      // HUD objetivo
      const target=this.stage.target||22;
      const mult=this.comboMult();
      if(this.objKind==='survive'){
        this.scoreTxt.setText(Math.ceil(Math.max(0,this.timeLeft))+'s restantes');
        this.scoreTxt.setColor('#34d399');
        this.timerBar.setFillStyle(0x34d399);
      } else if(this.objKind==='boss'){
        this.scoreTxt.setText(this.bossKilled? '✔ CHEFE DESTRUÍDO' : '⚠ CHEFE ATIVO');
        this.scoreTxt.setColor(this.bossKilled? '#34d399':'#f43f5e');
      } else {
        this.scoreTxt.setText(this.kills+'/'+target+(mult>1?'  ×'+mult:'')+'  '+this.score+'pts');
      }
      // timer bar
      const dur=this.stage.duration||22;
      const pct=Phaser.Math.Clamp(this.timeLeft/dur,0,1);
      this.timerBar.width=264*pct;
      this.timerBar.x=BW/2-132;
      this.timerBar.setFillStyle(pct<0.25?0xf43f5e:(this.objKind==='survive'?0x34d399:this._shipCol()));
      this.timeTxt.setText(Math.ceil(Math.max(0,this.timeLeft))+'s');
      // fim de fase por objetivo
      let timeUp = this.timeLeft<=0;
      if(this.objKind==='kill' && this.kills>=target) this.finish();
      else if(this.objKind==='boss' && this.bossKilled) this.finish();
      else if(timeUp) this.finish();
    }
    finish(){
      if(this._finished) return;
      this._finished=true;
      const target=this.stage.target||22;
      // resultado por objetivo
      let ok=false, stars=0;
      if(this.objKind==='survive'){
        ok=!this._dead;
        stars=ok? Math.min(3,this.lives) : (this.kills>=target*0.5?1:0);
      } else if(this.objKind==='boss'){
        ok=this.bossKilled && !this._dead;
        stars=ok? Math.min(3,this.lives) : 0;
      } else {
        ok=this.kills>=target && !this._dead;
        stars=ok? 3 : this.kills>= target*0.70? 2 : this.kills>= target*0.45? 1 : 0;
      }
      const bonus = (stars===3? 140 : stars===2? 90 : stars===1? 50 : 20) + Math.floor(this.score/40);
      D.Save.data.crystals += bonus;
      // campanha 5x5: salva estrelas e progresso
      const isCampaign = !!this.campaign;
      if(isCampaign){
        const cid=this.campaignId;
        recordNaveProgress(D.Save.data,cid,this.phaseIdx,stars,ok);
      }
      D.Save.save(); SND.victory();
      this.add.rectangle(BW/2,BH/2,BW,BH,0x020617,0.80).setDepth(19);
      const objResult = this.objKind==='survive'? (ok?'SOBREVIVEU!':'NAO RESISTIU')
        : this.objKind==='boss'? (ok?'CHEFE DESTRUÍDO!':'CHEFE ESCAPOU')
        : (ok? 'VITÓRIA ESPACIAL!' : 'MISSÃO INCOMPLETA');
      this.add.text(BW/2, BH/2-36, objResult, {fontFamily:'Orbitron', fontSize:'20px', color:ok?'#34d399':'#fbbf24'}).setOrigin(0.5).setDepth(20);
      const starsTxt = '★'.repeat(stars)+'☆'.repeat(3-stars);
      this.add.text(BW/2, BH/2-10, `${starsTxt}  +${bonus} cristais • ${this.kills}/${target} abates • ${this.score} pts • ${this.shipDef.name} NV${this.shipLevel}`, {fontFamily:'Rajdhani', fontSize:'12px', color:'#e8eefc'}).setOrigin(0.5).setDepth(20);
      if(isCampaign){
        const isLastPhase = this.phaseIdx>=4;
        const hasNext = !isLastPhase && ok;
        const y0=BH/2+22;
        if(hasNext){
          const nextPhase=this.phaseIdx+1;
          const btnNext=this.add.text(BW/2-90, y0, '▶ PRÓXIMA FASE', {fontFamily:'Orbitron', fontSize:'12px', color:'#020617', backgroundColor:this.stage.accent||'#38bdf8', padding:{left:14,right:14,top:8,bottom:8}}).setOrigin(0.5).setDepth(20).setInteractive({useHandCursor:true});
          btnNext.on('pointerdown', ()=>{
            this.scene.start('Nave', {campaignIdx:this.campaignIdx, phaseIdx:nextPhase, shipId:this.shipId, diffKey:this.diffKey});
          });
          const btnUp=this.add.text(BW/2+90, y0, '⬆ MELHORAR NAVE', {fontFamily:'Orbitron', fontSize:'11px', color:'#fbbf24', backgroundColor:'#1e293b', padding:{left:10,right:10,top:8,bottom:8}}).setOrigin(0.5).setDepth(20).setInteractive({useHandCursor:true});
          btnUp.on('pointerdown', ()=>{
            const lvl=(D.Save.data.shipLevels[this.shipId]||1);
            const cost=12+lvl*8;
            if(D.Save.data.crystals>=cost && lvl<50){
              D.Save.data.crystals-=cost; D.Save.data.shipLevels[this.shipId]=lvl+1; D.Save.save();
              this.scene.start('Nave', {campaignIdx:this.campaignIdx, phaseIdx:nextPhase, shipId:this.shipId, diffKey:this.diffKey});
            } else { SND.error(); this.add.text(BW/2, y0+28, lvl>=50?'NÍVEL MÁXIMO':'CRISTAIS INSUFICIENTES ('+cost+')', {fontFamily:'Rajdhani', fontSize:'10px', color:'#f43f5e'}).setOrigin(0.5).setDepth(20); }
          });
          const btnMenu=this.add.text(BW/2, y0+38, '▣ MENU', {fontFamily:'Orbitron', fontSize:'11px', color:'#8fa3c4', backgroundColor:'#0f172a', padding:{left:12,right:12,top:7,bottom:7}}).setOrigin(0.5).setDepth(20).setInteractive({useHandCursor:true});
          btnMenu.on('pointerdown', ()=> this.scene.start('Menu'));
          this.time.delayedCall(6000, ()=>{ if(this.scene.isActive()) this.scene.start('Nave', {campaignIdx:this.campaignIdx, phaseIdx:nextPhase, shipId:this.shipId, diffKey:this.diffKey}); });
        } else {
          const label = isLastPhase && ok ? '🏆 CAMPANHA COMPLETA! ★ MENU' : (ok? '✔ FASE COMPLETA — MENU' : '✕ TENTAR NOVAMENTE');
          const btn=this.add.text(BW/2, BH/2+32, label, {fontFamily:'Orbitron', fontSize:'12px', color:'#020617', backgroundColor: ok? (this.stage.accent||'#38bdf8') : '#475569', padding:{left:14,right:14,top:8,bottom:8}}).setOrigin(0.5).setDepth(20).setInteractive({useHandCursor:true});
          const targetPhase = isLastPhase? null : this.phaseIdx;
          btn.on('pointerdown', ()=>{
            if(isLastPhase) this.scene.start('Menu');
            else if(ok) this.scene.start('Menu');
            else this.scene.start('Nave', {campaignIdx:this.campaignIdx, phaseIdx:this.phaseIdx, shipId:this.shipId, diffKey:this.diffKey});
          });
          if(!isLastPhase) this.time.delayedCall(5000, ()=>{ if(this.scene.isActive()) this.scene.start('Menu'); });
        }
      } else {
        const isFinal = this.nextMap >= D.MAPS_DATA.length;
        const label = isFinal ? '▶ VOLTAR À BASE' : '▶ PRÓXIMO PLANETA';
        const btn=this.add.text(BW/2, BH/2+32, label, {fontFamily:'Orbitron', fontSize:'13px', color:'#020617', backgroundColor:this.stage.accent||'#38bdf8', padding:{left:16,right:16,top:9,bottom:9}}).setOrigin(0.5).setDepth(20).setInteractive({useHandCursor:true});
        btn.on('pointerdown', ()=>{ if(isFinal) this.scene.start('Menu'); else this.scene.start('Game',{mapIdx:this.nextMap, diffKey:this.diffKey, endless:false}); });
        this.time.delayedCall(4000, ()=>{ if(this.scene.isActive()){ if(isFinal) this.scene.start('Menu'); else this.scene.start('Game',{mapIdx:this.nextMap, diffKey:this.diffKey, endless:false}); }});
      }
    }
  }

  // 5 subclasses leves (polimorfia via herança) - exigido spec OU switch
  class AsteroidsScene extends NaveScene { constructor(){ super('Asteroids'); } create(d){ if(d && !d.styleId) d.styleId='asteroids'; return super.create(d); } }
  class HorizontalScene extends NaveScene { constructor(){ super('Horizontal'); } create(d){ if(d && !d.styleId) d.styleId='horizontal'; return super.create(d); } }
  class VerticalScene extends NaveScene { constructor(){ super('Vertical'); } create(d){ if(d && !d.styleId) d.styleId='vertical'; return super.create(d); } }
  class ArenaScene extends NaveScene { constructor(){ super('Arena'); } create(d){ if(d && !d.styleId) d.styleId='arena'; return super.create(d); } }
  class TunnelScene extends NaveScene { constructor(){ super('Tunnel'); } create(d){ if(d && !d.styleId) d.styleId='tunnel'; return super.create(d); } }
  // alias compatibilidade: ShmupScene vira VerticalScene
  class ShmupScene extends NaveScene { constructor(){ super('Shmup'); } create(d){ if(d && !d.styleId){ const ids=['asteroids','horizontal','vertical','arena','tunnel']; const idx=Math.max(0,Math.min(4,(d.stageIdx!=null?d.stageIdx:2))); d.styleId=ids[idx]; } return super.create(d); } }
