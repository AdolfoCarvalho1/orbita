'use strict';
/* Defesa da Terra — TILES: grade 44px pixelada por tema, mesma base navy
   Cada tema usa TOKENS.PALETTE mas só varia detalhe, não base.
   Gera texturas de tile 44x44 para fundos de mapa TD + miniaturas.
   Chaves: tile_<theme>_<variant>  (ex: tile_neptune-frontier_a) */
(function(){
  const CELL = 44;
  // S2 SUNSET: paleta crepuscular (sem roxo) — céu poeira, âmbar, creme.
  const DUSK_SKY = '#1c2b4d', DUSK_AMBER = '#f5a83d', DUSK_CREAM = '#ffe9bd';
  const THEMES = {
    'neptune-frontier': { bg:'#051425', accent:'#38bdf8', accent2:'#67e8f9', speck:'#0a2a4a', motif:'ice', moon:{ tint:0xbfe3ff, scale:0.30 } },
    'saturn-rings':     { bg:'#1a1408', accent:'#fbbf24', accent2:'#f59e0b', speck:'#3a2a0a', motif:'rings', moon:{ tint:0xffd98a, scale:0.32 } },
    'jupiter-orbit':    { bg:'#1a0f08', accent:'#fb923c', accent2:'#f97316', speck:'#3a1a08', motif:'storm', moon:{ tint:0xffc46b, scale:0.38 } },
    'asteroid-belt':    { bg:'#0f0a14', accent:'#94a3b8', accent2:'#64748b', speck:'#1e1a2a', motif:'rock', moon:{ tint:0xd1d5db, scale:0.26 } },
    'earth-orbit':      { bg:'#051425', accent:'#22d3ee', accent2:'#38bdf8', speck:'#0a2a3a', motif:'orbit', moon:{ tint:0xa5f3fc, scale:0.30 } },
    'solar-system':     { bg:'#020617', accent:'#a3e635', accent2:'#fbbf24', speck:'#17230a', motif:'nav', moon:{ tint:0xfff6e0, scale:0.30 } },
    'sunset-dusk':      { bg:'#1c2b4d', accent:'#f5a83d', accent2:'#ffe9bd', speck:'#3a2c1a', motif:'dusk', dusk:true, moon:{ tint:0xffffff, scale:0.30 } }
  };

  function hexToNum(hex){ return parseInt(hex.slice(1),16); }

  // S2.1 — céu crepuscular (Phaser Graphics, origem relativa): brilho
  // âmbar no horizonte (borda inferior) + vinheta fria no topo.
  function paintDuskSky(g, w, h){
    const bands = 6, bh = Math.max(2, Math.ceil(h * 0.07));
    for(let i=0;i<bands;i++){
      const t = i / (bands - 1); // 0 = alto do brilho -> 1 = horizonte
      g.fillStyle(hexToNum(DUSK_AMBER), 0.04 + t * 0.20);
      g.fillRect(0, h - (i + 1) * bh, w, bh);
    }
    g.fillStyle(hexToNum(DUSK_AMBER), 0.35); g.fillRect(0, h - 2, w, 1);
    g.fillStyle(hexToNum(DUSK_CREAM), 0.22); g.fillRect(0, h - 3, w, 1);
    const vh = Math.max(2, Math.ceil(h * 0.06));
    for(let i=0;i<5;i++){
      g.fillStyle(hexToNum(DUSK_SKY), 0.30 - (i / 5) * 0.24);
      g.fillRect(0, i * vh, w, vh + 1);
    }
  }

  // S2.1 — equivalente Canvas2D (previews DOM dos map-cards).
  function paintDuskSky2d(ctx, w, h){
    ctx.save();
    let gr = ctx.createLinearGradient(0, h * 0.45, 0, h);
    gr.addColorStop(0, 'rgba(245,168,61,0)');
    gr.addColorStop(1, 'rgba(245,168,61,0.42)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(245,168,61,0.35)'; ctx.fillRect(0, h - 2, w, 1);
    ctx.fillStyle = 'rgba(255,233,189,0.22)'; ctx.fillRect(0, h - 3, w, 1);
    gr = ctx.createLinearGradient(0, 0, 0, h * 0.35);
    gr.addColorStop(0, 'rgba(10,16,34,0.42)');
    gr.addColorStop(1, 'rgba(10,16,34,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, Math.ceil(h * 0.35));
    ctx.restore();
  }

  function drawTile(g, theme, variant){
    const t = THEMES[theme] || THEMES['neptune-frontier'];
    g.fillStyle(hexToNum('#050914'),1); g.fillRect(0,0,CELL,CELL);
    g.fillStyle(hexToNum(t.bg),1); g.fillRect(0,0,CELL,CELL);
    g.fillStyle(hexToNum(t.speck),0.16); g.fillRect(0,0,CELL,CELL);
    g.lineStyle(1, hexToNum(t.accent), 0.10); g.strokeRect(0,0,CELL,CELL);
    const alt = variant==='b';
    if(t.motif==='ice'){
      g.lineStyle(1,hexToNum(t.accent2),0.18);
      g.lineBetween(alt?4:10,0,alt?26:32,22); g.lineBetween(alt?26:32,22,alt?18:38,44);
      g.lineBetween(alt?26:32,22,44,alt?15:29);
      g.fillStyle(0xffffff,0.16); g.fillRect(alt?7:34,alt?31:8,2,2);
    } else if(t.motif==='rings'){
      g.fillStyle(hexToNum(t.accent),0.08); g.fillRect(0,alt?9:5,CELL,5); g.fillRect(0,alt?29:25,CELL,3);
      g.fillStyle(hexToNum(t.accent2),0.16); g.fillRect(0,alt?12:8,CELL,1); g.fillRect(0,alt?32:28,CELL,1);
    } else if(t.motif==='storm'){
      g.fillStyle(hexToNum(t.accent),0.10); g.fillRect(0,6,CELL,4); g.fillRect(0,26,CELL,5);
      g.fillStyle(hexToNum(t.accent2),0.18); g.fillRect(alt?7:27,alt?16:17,10,3); g.fillRect(alt?10:30,alt?19:20,6,2);
    } else if(t.motif==='rock'){
      g.fillStyle(hexToNum(t.accent2),0.16); g.fillRect(alt?5:28,alt?7:8,9,7); g.fillRect(alt?29:8,alt?27:29,7,6);
      g.fillStyle(0x050914,0.28); g.fillRect(alt?8:31,alt?9:10,3,3); g.fillRect(alt?31:10,alt?29:31,2,2);
    } else if(t.motif==='orbit'){
      g.lineStyle(1,hexToNum(t.accent2),0.17); g.strokeCircle(alt?12:32,alt?31:13,10);
      g.fillStyle(hexToNum(t.accent),0.24); g.fillRect(alt?20:21,alt?8:34,3,3);
      g.fillStyle(0xffffff,0.20); g.fillRect(alt?4:38,alt?12:28,1,1);
    } else if(t.motif==='dusk'){
      // S2 SUNSET: estratos horizontais âmbar sobre céu poeira + fagulhas creme.
      g.fillStyle(hexToNum(t.accent),0.10); g.fillRect(0,8,CELL,3); g.fillRect(0,18,CELL,2);
      g.fillStyle(hexToNum(t.accent),0.22); g.fillRect(0,30,CELL,4);
      g.fillStyle(hexToNum(t.accent2),0.14); g.fillRect(0,33,CELL,1);
      g.fillStyle(hexToNum(t.accent2),0.30); g.fillRect(alt?9:27,alt?14:12,2,2);
      g.fillStyle(hexToNum(t.accent),0.30); g.fillRect(alt?30:10,alt?22:24,1,1);
    } else {
      g.lineStyle(1,hexToNum(t.accent),0.16); g.lineBetween(6,22,38,22); g.lineBetween(22,6,22,38);
      g.fillStyle(hexToNum(t.accent2),0.24); g.fillRect(19,19,7,7); g.fillStyle(hexToNum(t.bg),1); g.fillRect(21,21,3,3);
    }
    g.fillStyle(0xffffff,0.18); g.fillRect(alt?35:8,alt?11:8,1,1); g.fillRect(alt?13:35,alt?36:33,1,1);
    if(t.dusk) paintDuskSky(g, CELL, CELL);
  }
  function drawPathTile(g, theme, mask){
    const t = THEMES[theme] || THEMES['neptune-frontier'];
    const up=mask&1,right=mask&2,down=mask&4,left=mask&8;
    const arm=(col,alpha,inset)=>{
      g.fillStyle(hexToNum(col),alpha);
      g.fillRect(inset,inset,CELL-inset*2,CELL-inset*2);
      if(up) g.fillRect(inset,0,CELL-inset*2,CELL/2+1);
      if(right) g.fillRect(CELL/2-1,inset,CELL/2+1,CELL-inset*2);
      if(down) g.fillRect(inset,CELL/2-1,CELL-inset*2,CELL/2+1);
      if(left) g.fillRect(0,inset,CELL/2+1,CELL-inset*2);
    };
    arm('#080d18',0.96,5);
    arm('#263753',1,9);
    g.fillStyle(hexToNum('#344968'),0.82); g.fillRect(12,12,20,20);
    g.fillStyle(hexToNum(t.accent),0.32);
    if(left){g.fillRect(1,21,10,2);g.fillRect(13,21,6,2);} if(right){g.fillRect(25,21,6,2);g.fillRect(33,21,10,2);}
    if(up){g.fillRect(21,1,2,10);g.fillRect(21,13,2,6);} if(down){g.fillRect(21,25,2,6);g.fillRect(21,33,2,10);}
    g.fillStyle(hexToNum(t.accent2),0.42); g.fillRect(12,12,2,2); g.fillRect(30,12,2,2); g.fillRect(12,30,2,2); g.fillRect(30,30,2,2);
    g.fillStyle(0xffffff,0.12); g.fillRect(14,14,8,1); g.fillRect(14,15,1,6);
  }

  function paintPreviewBackdrop(ctx,w,h,theme){
    const t=THEMES[theme]||THEMES['neptune-frontier'];
    ctx.save(); ctx.fillStyle=t.bg; ctx.fillRect(0,0,w,h); ctx.globalAlpha=0.22; ctx.fillStyle=t.speck; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle=t.accent; ctx.fillStyle=t.accent2; ctx.lineWidth=1;
    if(t.motif==='rings') for(let y=8;y<h;y+=18){ctx.globalAlpha=0.10;ctx.fillRect(0,y,w,4);ctx.globalAlpha=0.18;ctx.fillRect(0,y,w,1);}
    else if(t.motif==='storm') for(let y=6;y<h;y+=15){ctx.globalAlpha=0.10;ctx.fillRect(0,y,w,3);}
    else if(t.motif==='ice'){ctx.globalAlpha=0.16;for(let x=-20;x<w;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+32,h);ctx.stroke();}}
    else if(t.motif==='rock'){ctx.globalAlpha=0.14;for(let x=12;x<w;x+=38){const y=(x*7)%h;ctx.fillStyle=t.accent2;ctx.fillRect(x,y,9,7);ctx.fillStyle=t.bg;ctx.fillRect(x+3,y+2,2,2);}}
    else if(t.motif==='orbit'){ctx.globalAlpha=0.16;ctx.beginPath();ctx.arc(w*.65,h*.45,Math.min(w,h)*.32,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(w*.65,h*.45,Math.min(w,h)*.2,0,Math.PI*2);ctx.stroke();}
    else if(t.motif==='dusk'){ctx.globalAlpha=0.12;ctx.fillStyle=t.accent;for(let y=10;y<h;y+=16){ctx.fillRect(0,y,w,3);}ctx.globalAlpha=0.22;ctx.fillRect(0,h-12,w,5);}
    else {ctx.globalAlpha=0.14;ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.stroke();}
    ctx.globalAlpha=0.24;ctx.fillStyle='#fff';[[9,9],[w-13,14],[w*.36,h-11],[w*.72,h*.3]].forEach(p=>ctx.fillRect(Math.round(p[0]),Math.round(p[1]),1,1));ctx.restore();
    if(t.dusk) paintDuskSky2d(ctx,w,h);
  }

  function buildAll(scene){
    if(!scene || !scene.make) return;
    for(const theme in THEMES){
      for(const v of ['a','b']){
        const key='tile_'+theme+'_'+v;
        if(scene.textures.exists(key)) continue;
        const g=scene.make.graphics({x:0,y:0,add:false});
        drawTile(g, theme, v);
        g.generateTexture(key, CELL, CELL);
        g.destroy();
      }
      // 16 peças de pista conectáveis: U/R/D/L em bitmask 1/2/4/8.
      // ONDA 4: texturas determinísticas — só gera se faltar (Boot→Menu→Game não regenera).
      for(let mask=0;mask<16;mask++){
        const pathKey='tile_path_'+theme+'_'+mask;
        if(scene.textures.exists(pathKey)) continue;
        const g=scene.make.graphics({x:0,y:0,add:false}); drawPathTile(g,theme,mask); g.generateTexture(pathKey,CELL,CELL); g.destroy();
      }
      const legacyPath='tile_path_'+theme;
      if(!scene.textures.exists(legacyPath)){
        const g=scene.make.graphics({x:0,y:0,add:false}); drawPathTile(g,theme,15); g.generateTexture(legacyPath,CELL,CELL); g.destroy();
      }
      // fundo 2×2 alternado evita repetição óbvia do mesmo tile.
      const bgKey='tile_bg_'+theme;
      if(!scene.textures.exists(bgKey)){
        const g=scene.make.graphics({x:0,y:0,add:false});
        [['a','b'],['b','a']].forEach((row,ry)=>row.forEach((v,rx)=>{g.save();g.translateCanvas(rx*CELL,ry*CELL);drawTile(g,theme,v);g.restore();}));
        g.generateTexture(bgKey, CELL*2, CELL*2);
        g.destroy();
      }
      // ONDA 5: miniatura tile_<theme>_mini removida (órfã, 7 texturas sem consumidores — rg confirmou)
    }
  }

  // Background helpers para DOM/CSS
  function cssForTheme(theme){
    const t=THEMES[theme]||THEMES['neptune-frontier'];
    if(t.dusk) return {
      bg: 'radial-gradient(900px 500px at 50% 0%, '+t.bg+' 0%, #050914 62%, #030712 100%), linear-gradient(180deg, rgba(10,16,34,0.42) 0%, rgba(245,168,61,0) 55%, rgba(245,168,61,0.30) 100%)',
      accent: t.accent,
      speck: t.speck
    };
    return {
      bg: 'radial-gradient(900px 500px at 50% 0%, '+t.bg+' 0%, #050914 65%, #030712 100%)',
      accent: t.accent,
      speck: t.speck
    };
  }

  window.TILES = { THEMES, buildAll, cssForTheme, paintPreviewBackdrop, paintDuskSky, paintDuskSky2d, CELL };
})();
