/* Defesa Orbital v3 - textures.js (Brief 08 A5: extracao mecanica de assets/scenes.js, apresentacao: orig 1677-2080 (drawEnemyShape/paintEnemyShape2d/makeTextures)) */
/* REGRA DE OURO (A5): comportamento identico. Linhas movidas byte-exatas; ordem relativa preservada. */
'use strict';
  /* ================= APRESENTAÇÃO (Phaser 3) ================= */

  function drawEnemyShape(g, shape, col, r) {
    const R = Math.max(6, r);
    // Textura é quadrada (size×size) e o Phaser ancora no CENTRO dela:
    // todo desenho precisa partir do meio (C,C), não de (0,0).
    const C = g.width ? g.width / 2 : R * 1.5 + 4;
    g.save(); g.translateCanvas(C, C);
    const body = Phaser.Display.Color.HexStringToColor(col).color;
    const dark = 0x0a1226;
    const glass = 0xbfe3ff;
    // Sombra no chão
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(R * 0.4, R * 1.15, R * 1.6, R * 0.55);

    switch (shape) {
      case 'tri': {
        // Caça leve: fuselagem afilada + cabine + 2 motores
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(0, -R * 1.25);            // bico
        g.lineTo(R * 0.45, -R * 0.2);
        g.lineTo(R * 0.95, R * 0.85);       // ponta da asa direita
        g.lineTo(R * 0.35, R * 0.65);
        g.lineTo(-R * 0.35, R * 0.65);
        g.lineTo(-R * 0.95, R * 0.85);      // ponta da asa esquerda
        g.lineTo(-R * 0.45, -R * 0.2);
        g.closePath();
        g.fillPath(); g.strokePath();
        // Cabine de vidro
        g.fillStyle(glass, 0.95);
        g.fillCircle(0, -R * 0.35, Math.max(2, R * 0.22));
        // Motores
        g.fillStyle(dark, 1);
        g.fillRect(-R * 0.4, R * 0.6, R * 0.22, R * 0.35);
        g.fillRect(R * 0.18, R * 0.6, R * 0.22, R * 0.35);
        break;
      }
      case 'dart': {
        // Interceptador rápido: fuselagem fina em agulha + canards
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(-R * 1.15, 0);             // nariz (aponta pra ESQUERDA = direção de voo)
        g.lineTo(-R * 0.2, -R * 0.28);
        g.lineTo(R * 0.75, -R * 0.85);      // aleta superior
        g.lineTo(R * 0.9, -R * 0.15);
        g.lineTo(R * 0.9, R * 0.15);
        g.lineTo(R * 0.75, R * 0.85);       // aleta inferior
        g.lineTo(-R * 0.2, R * 0.28);
        g.closePath();
        g.fillPath(); g.strokePath();
        g.fillStyle(glass, 0.9);
        g.fillCircle(-R * 0.45, 0, Math.max(1.8, R * 0.16));
        break;
      }
      case 'square': {
        // Cruzador blindado: casco pesado retangular com torres laterais
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.55);
        g.fillRect(-R * 0.85, -R * 0.7, R * 1.7, R * 1.4);
        g.strokeRect(-R * 0.85, -R * 0.7, R * 1.7, R * 1.4);
        // Placas de blindagem
        g.fillStyle(0x0a1226, 0.8);
        g.fillRect(-R * 0.85, -R * 0.7, R * 1.7, R * 0.28);
        g.fillRect(-R * 0.85, R * 0.42, R * 1.7, R * 0.28);
        // Torres de canhão
        g.fillStyle(0xe8eefc, 0.9);
        g.fillCircle(-R * 0.45, 0, R * 0.18);
        g.fillCircle(R * 0.45, 0, R * 0.18);
        // Ponte central
        g.fillStyle(glass, 0.8);
        g.fillRect(-R * 0.18, -R * 0.12, R * 0.36, R * 0.24);
        break;
      }
      case 'dot': {
        // Parasita: esfera com núcleo pulsante e garras
        g.fillStyle(body, 1);
        g.fillCircle(0, 0, R * 0.8);
        g.lineStyle(1.5, 0xffffff, 0.55);
        g.strokeCircle(0, 0, R * 0.8);
        g.fillStyle(dark, 1);
        g.fillCircle(0, 0, R * 0.38);
        g.fillStyle(glass, 1);
        g.fillCircle(0, 0, R * 0.16);
        // Garras orbitais
        g.lineStyle(1.5, body, 0.9);
        for (let a = 0; a < 6; a++) {
          const ang = a * Math.PI / 3;
          g.beginPath();
          g.moveTo(Math.cos(ang) * R * 0.8, Math.sin(ang) * R * 0.8);
          g.lineTo(Math.cos(ang) * R * 1.05, Math.sin(ang) * R * 1.05);
          g.strokePath();
        }
        break;
      }
      case 'cross': {
        // Nave-mãe médica: cruz de cura + hélice traseira
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(0, -R * 1.05); g.lineTo(R * 0.3, -R * 0.5); g.lineTo(R * 0.3, -R * 0.15);
        g.lineTo(R * 1.05, -R * 0.15); g.lineTo(R * 1.05, R * 0.15); g.lineTo(R * 0.3, R * 0.15);
        g.lineTo(R * 0.3, R * 0.5); g.lineTo(0, R * 1.05);
        g.lineTo(-R * 0.3, R * 0.5); g.lineTo(-R * 0.3, R * 0.15);
        g.lineTo(-R * 1.05, R * 0.15); g.lineTo(-R * 1.05, -R * 0.15); g.lineTo(-R * 0.3, -R * 0.15);
        g.lineTo(-R * 0.3, -R * 0.5);
        g.closePath();
        g.fillPath(); g.strokePath();
        // Cruz branca central (identidade médica)
        g.fillStyle(0xffffff, 0.95);
        g.fillRect(-R * 0.09, -R * 0.32, R * 0.18, R * 0.64);
        g.fillRect(-R * 0.32, -R * 0.09, R * 0.64, R * 0.18);
        break;
      }
      case 'ring': {
        // Espectral: anel com núcleo flutuante e 3 pods
        g.fillStyle(body, 1);
        g.fillCircle(0, 0, R);
        g.fillStyle(dark, 1);
        g.fillCircle(0, 0, R * 0.58);
        g.lineStyle(2, 0xffffff, 0.55);
        g.strokeCircle(0, 0, R * 0.82);
        // Pods de camuflagem
        g.fillStyle(glass, 0.9);
        for (let a = 0; a < 3; a++) {
          const ang = -Math.PI / 2 + a * 2 * Math.PI / 3;
          g.fillCircle(Math.cos(ang) * R * 0.68, Math.sin(ang) * R * 0.68, R * 0.14);
        }
        // Núcleo piscante
        g.fillStyle(body, 0.95);
        g.fillCircle(0, 0, R * 0.24);
        break;
      }
      case 'diamond': {
        // Bombardeiro PEM: losango pesado com baia de bombas
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(0, -R * 1.1); g.lineTo(R * 0.78, 0); g.lineTo(0, R * 1.1); g.lineTo(-R * 0.78, 0);
        g.closePath();
        g.fillPath(); g.strokePath();
        g.lineStyle(1.5, dark, 0.9);
        g.beginPath(); g.moveTo(0, -R * 0.55); g.lineTo(0, R * 0.55); g.strokePath();
        g.beginPath(); g.moveTo(-R * 0.42, 0); g.lineTo(R * 0.42, 0); g.strokePath();
        g.fillStyle(glass, 0.9);
        g.fillCircle(0, -R * 0.5, Math.max(2, R * 0.17));
        break;
      }
      case 'shield': {
        // Vanguarda: proa blindada em cunha + gerador de escudo
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.moveTo(0, -R * 1.15); g.lineTo(R * 0.85, -R * 0.5); g.lineTo(R * 0.85, R * 0.35);
        g.lineTo(0, R * 1.05); g.lineTo(-R * 0.85, R * 0.35); g.lineTo(-R * 0.85, -R * 0.5);
        g.closePath();
        g.fillPath(); g.strokePath();
        // Arco de escudo frontal
        g.lineStyle(2.5, 0x60a5fa, 0.85);
        g.beginPath(); g.arc(0, -R * 0.15, R * 0.95, Math.PI * 1.15, Math.PI * 1.85, false); g.strokePath();
        // Gerador central
        g.fillStyle(glass, 0.9);
        g.fillCircle(0, 0, R * 0.2);
        break;
      }
      case 'split': {
        // Divisor quântico: duas cápsulas ligadas por energia
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.beginPath();
        g.arc(0, -R * 0.45, R * 0.52, Math.PI, 0, false);
        g.arc(0, R * 0.45, R * 0.52, 0, Math.PI, false);
        g.closePath();
        g.fillPath(); g.strokePath();
        // Ligação energética
        g.lineStyle(2, glass, 0.9);
        g.beginPath(); g.moveTo(-R * 0.3, -R * 0.1); g.lineTo(-R * 0.3, R * 0.1);
        g.moveTo(R * 0.3, -R * 0.1); g.lineTo(R * 0.3, R * 0.1);
        g.strokePath();
        // Dois núcleos (as metades futuras)
        g.fillStyle(glass, 1);
        g.fillCircle(0, -R * 0.45, R * 0.14);
        g.fillCircle(0, R * 0.45, R * 0.14);
        break;
      }
      case 'jugg': {
        // Leviatã: couraçado massivo com proa em cunha e 3 funis
        g.fillStyle(body, 1);
        g.lineStyle(2, 0xffffff, 0.55);
        g.beginPath();
        g.moveTo(-R * 1.35, 0);
        g.lineTo(-R * 0.7, -R * 0.72); g.lineTo(R * 0.85, -R * 0.72);
        g.lineTo(R * 1.15, -R * 0.3); g.lineTo(R * 1.15, R * 0.3);
        g.lineTo(R * 0.85, R * 0.72); g.lineTo(-R * 0.7, R * 0.72);
        g.closePath();
        g.fillPath(); g.strokePath();
        // Convés blindado
        g.fillStyle(0x0a1226, 0.75);
        g.fillRect(-R * 0.55, -R * 0.5, R * 1.35, R * 0.22);
        g.fillRect(-R * 0.55, R * 0.28, R * 1.35, R * 0.22);
        // Funis/motores
        g.fillStyle(0xe8eefc, 0.85);
        g.fillCircle(R * 0.92, -R * 0.4, R * 0.13);
        g.fillCircle(R * 0.92, 0, R * 0.13);
        g.fillCircle(R * 0.92, R * 0.4, R * 0.13);
        // Ponte
        g.fillStyle(glass, 0.85);
        g.fillRect(-R * 0.3, -R * 0.16, R * 0.5, R * 0.32);
        break;
      }
      case 'boss': {
        // Dreadnought: fortaleza circular com anel de armas e núcleo exposto
        g.fillStyle(body, 1);
        g.fillCircle(0, 0, R);
        // Asas de ataque
        g.fillTriangle(-R * 1.5, -R * 0.5, -R * 0.7, 0, -R * 1.5, R * 0.5);
        g.fillTriangle(R * 1.5, -R * 0.5, R * 0.7, 0, R * 1.5, R * 0.5);
        // Anel de blindagem segmentado
        g.lineStyle(3, 0xffffff, 0.65);
        for (let a = 0; a < 8; a++) {
          g.beginPath();
          g.arc(0, 0, R, a * Math.PI / 4 + 0.08, (a + 1) * Math.PI / 4 - 0.08, false);
          g.strokePath();
        }
        // Poço do núcleo
        g.fillStyle(dark, 1);
        g.fillCircle(0, 0, R * 0.48);
        g.fillStyle(glass, 0.95);
        g.fillCircle(0, 0, R * 0.26);
        g.fillStyle(body, 1);
        g.fillCircle(0, 0, R * 0.13);
        break;
      }
      default: {
        // Nave genérica: fuselagem oval com cabine
        g.fillStyle(body, 1);
        g.lineStyle(1.5, 0xffffff, 0.6);
        g.fillEllipse(0, 0, R * 1.1, R * 1.9);
        g.lineStyle(1.5, 0xffffff, 0.55);
        g.strokeEllipse(0, 0, R * 1.1, R * 1.9);
        g.fillStyle(glass, 0.9);
        g.fillCircle(0, -R * 0.3, Math.max(2, R * 0.2));
      }
    }
    g.restore();
    return g;
  }

  function paintEnemyShape2d(c2, shape, colHex, r) {
    const R = Math.max(5, r);
    c2.fillStyle = colHex; c2.strokeStyle = '#e8eefc'; c2.lineWidth = 2;
    c2.beginPath();
    switch (shape) {
      case 'tri': c2.moveTo(0, -R); c2.lineTo(R * 0.85, R * 0.7); c2.lineTo(-R * 0.85, R * 0.7); c2.closePath(); break;
      case 'dart': c2.moveTo(-R, -R * 0.5); c2.lineTo(R * 1.1, 0); c2.lineTo(-R, R * 0.5); c2.lineTo(-R * 0.45, 0); c2.closePath(); break;
      case 'square': c2.rect(-R * 0.8, -R * 0.8, R * 1.6, R * 1.6); break;
      case 'dot': c2.arc(0, 0, R * 0.8, 0, Math.PI * 2); break;
      case 'cross': c2.rect(-R * 0.22, -R, R * 0.44, R * 2); c2.rect(-R, -R * 0.22, R * 2, R * 0.44); break;
      case 'ring': c2.arc(0, 0, R, 0, Math.PI * 2); break;
      case 'diamond': c2.moveTo(0, -R); c2.lineTo(R * 0.75, 0); c2.lineTo(0, R); c2.lineTo(-R * 0.75, 0); c2.closePath(); break;
      case 'shield': c2.moveTo(0, -R); c2.lineTo(R * 0.8, -R * 0.45); c2.lineTo(R * 0.8, R * 0.3); c2.lineTo(0, R); c2.lineTo(-R * 0.8, R * 0.3); c2.lineTo(-R * 0.8, -R * 0.45); c2.closePath(); break;
      case 'split': c2.arc(0, -R * 0.42, R * 0.52, Math.PI, 0, false); c2.arc(0, R * 0.42, R * 0.52, 0, Math.PI, false); c2.closePath(); break;
      case 'jugg': c2.rect(-R, -R * 0.72, R * 2, R * 1.44); break;
      case 'boss': c2.arc(0, 0, R, 0, Math.PI * 2); break;
      default: c2.arc(0, 0, R * 0.8, 0, Math.PI * 2);
    }
    c2.fill(); c2.stroke();
  }

  // G2 — luas por tema: 0 texturas novas, só tint/escala sobre a base `moon` creme (sem roxo).
  // Fonte primária: window.TILES.THEMES[theme].moon; fallback local espelha os mesmos valores.
  function moonFor(theme) {
    try {
      const m = (typeof window !== 'undefined' && window.TILES && window.TILES.THEMES[theme] && window.TILES.THEMES[theme].moon) || null;
      if (m) return { key: 'moon', tint: m.tint, scale: m.scale };
    } catch (e) {}
    switch (theme) {
      case 'neptune-frontier': return { key: 'moon', tint: 0xbfe3ff, scale: 0.30 };
      case 'saturn-rings': return { key: 'moon', tint: 0xffd98a, scale: 0.32 };
      case 'jupiter-orbit': return { key: 'moon', tint: 0xffc46b, scale: 0.38 };
      case 'asteroid-belt': return { key: 'moon', tint: 0xd1d5db, scale: 0.26 };
      case 'earth-orbit': return { key: 'moon', tint: 0xa5f3fc, scale: 0.30 };
      case 'solar-system': return { key: 'moon', tint: 0xfff6e0, scale: 0.30 };
      case 'sunset-dusk': return { key: 'moon', tint: 0xffffff, scale: 0.30 };
      default: return { key: 'moon', tint: 0xffffff, scale: 0.30 };
    }
  }

  function makeTextures(scene) {
    const mk = (key, size, drawFn) => {
      if (scene.textures.exists(key)) return;
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      drawFn(g);
      g.generateTexture(key, size, size);
      g.destroy();
    };
    mk('dot', 10, g => { g.fillStyle(0xffffff, 1); g.fillCircle(5, 5, 4); });
    mk('soft', 32, g => {
      [15, 11, 7].forEach((r, i) => { g.fillStyle(0xffffff, 0.16 + i * 0.12); g.fillCircle(16, 16, r); });
    });
    mk('ring', 40, g => { g.lineStyle(3, 0xffffff, 1); g.strokeCircle(20, 20, 17); });
    mk('px', 2, g => { g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 2, 2); });
    mk('chev', 22, g => {
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(4, 3, 18, 11, 4, 19);
      g.fillRect(4, 8, 8, 6);
    });
    // S2 SUNSET (ambiente): lua creme com halo + brasa quente. Só fundo/ambiente.
    mk('moon', 180, g => {
      // halo radial (creme, sem roxo)
      g.fillStyle(0xffe9bd, 0.06); g.fillCircle(90, 90, 88);
      g.fillStyle(0xffe9bd, 0.08); g.fillCircle(90, 90, 74);
      g.fillStyle(0xf5a83d, 0.08); g.fillCircle(90, 90, 62);
      // disco creme
      g.fillStyle(0xffe9bd, 1); g.fillCircle(90, 90, 48);
      // crateras suaves (creme escuro / âmbar claro)
      g.fillStyle(0xe8c07a, 0.35); g.fillCircle(74, 78, 10);
      g.fillStyle(0xe8c07a, 0.28); g.fillCircle(102, 96, 13);
      g.fillStyle(0xf0d49a, 0.35); g.fillCircle(96, 70, 7);
      g.fillStyle(0xf0d49a, 0.30); g.fillCircle(80, 106, 6);
      // contorno + luz quente do horizonte (base âmbar)
      g.lineStyle(2, 0xfff6e0, 0.9); g.strokeCircle(90, 90, 48);
      g.lineStyle(3, 0xf5a83d, 0.45);
      g.beginPath(); g.arc(90, 90, 48, Math.PI * 0.15, Math.PI * 0.85, false); g.strokePath();
      // ONDA 5 (SUNSET/pixel art): contorno preto de 1px lógico por fora da silhueta, sem redesenhar a identidade
      g.lineStyle(2, 0x000000, 1); g.strokeCircle(90, 90, 50);
    });
    mk('ember', 8, g => {
      // partícula quente 3-5px: halo âmbar + núcleo creme
      g.fillStyle(0xf5a83d, 0.35); g.fillCircle(4, 4, 3.5);
      g.fillStyle(0xfb923c, 0.9); g.fillCircle(4, 4, 2.2);
      g.fillStyle(0xffe9bd, 1); g.fillCircle(4, 4, 1.2);
    });
    D.TOWERS_DATA.forEach(def => {
      const col = Phaser.Display.Color.HexStringToColor(def.color).color;
      for (let lvl = 1; lvl <= D.TOWER_MAX_LVL; lvl++) {
        if (lvl > 1) continue; // v3 PIXEL: só o legado nv1 fica; tiers vêm do PXART (tur_<id>_t<tier>)
        mk('tur_' + def.id + '_1', 62 + Math.min(lvl, 14) * 2, g => {
          const S2 = 31 + Math.min(lvl, 14) * 1.0;
          const scale = 0.92 + Math.min(lvl, 30) * 0.016;
          g.save(); g.translateCanvas(S2, S2); g.scaleCanvas(scale, scale);
          // nave base: sombra + casco + cockpit + motores
          g.fillStyle(0x000000, 0.28); g.fillEllipse(2, 10, 26, 10);
          g.fillStyle(col, 1); g.lineStyle(1.2, 0xffffff, 0.55);
          // ===== NAVES: cada uma com silhueta única de nave =====
          g.lineStyle(1.2, 0xffffff, 0.5);
          if(def.id==='cannon'){ // Corveta Gauss - casco robusto + 2 canhões frontais
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-18); g.lineTo(10,-4); g.lineTo(8,12); g.lineTo(-8,12); g.lineTo(-10,-4); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0x0a1226,1); g.fillRect(-6, -2, 12, 8);
            g.fillStyle(0xbfe3ff,0.95); g.fillCircle(0,-6,4);
            g.fillStyle(col,1); g.fillRect(-7, -14, 3, 10); g.fillRect(4, -14, 3, 10);
            // motores
            g.fillStyle(0xfb923c,1); g.fillTriangle(-6,12, -3,18, -9,18); g.fillTriangle(6,12, 3,18, 9,18);
            if(lvl>=10){ g.fillStyle(0xffffff,0.25); g.strokeCircle(0,0,14); }
            if(lvl>=25){ g.fillStyle(0xfbbf24,0.9); g.fillCircle(0,14,2); }
          } else if(def.id==='gatling'){ // Caça Vulcan - caça leve veloz
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-20); g.lineTo(6,-6); g.lineTo(14,4); g.lineTo(6,12); g.lineTo(-6,12); g.lineTo(-14,4); g.lineTo(-6,-6); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0x0a1226,1); g.fillEllipse(0,-2,10,7);
            g.fillStyle(0xbfe3ff,1); g.fillEllipse(0,-5,6,4);
            // asas
            g.fillStyle(col,1); g.fillTriangle(-6,-6, -16,2, -6,4); g.fillTriangle(6,-6, 16,2, 6,4);
            g.fillStyle(0xfb923c,1); g.fillRect(-4,12,3,6); g.fillRect(1,12,3,6);
            if(lvl>=15) { g.fillStyle(0xffffff,0.35); g.fillCircle(0,0,12); }
          } else if(def.id==='laser'){ // Destróier de Fótons - nave triangular com cristal
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-20); g.lineTo(11,10); g.lineTo(0,14); g.lineTo(-11,10); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0xf43f5e,0.95); g.fillCircle(0,2,5);
            g.lineStyle(1,0xffffff,0.6); g.strokeCircle(0,2,5);
            g.fillStyle(0x0a1226,1); g.fillTriangle(0,-14, -4,-8, 4,-8);
            if(lvl>=10) g.lineStyle(1.5,col,0.5), g.strokeCircle(0,2,10);
          } else if(def.id==='missile'){ // Bombardeiro MIRV - nave pesada com baías
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(-10,-12); g.lineTo(10,-12); g.lineTo(12,8); g.lineTo(0,14); g.lineTo(-12,8); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0x0a1226,1); g.fillRect(-8,-8,16,6);
            g.fillStyle(0xbfe3ff,0.9); g.fillRect(-4,-6,8,3);
            g.fillStyle(col,1); g.fillCircle(-6,6,3); g.fillCircle(0,6,3); g.fillCircle(6,6,3);
            if(lvl>=12) { g.fillStyle(0xfb923c,1); g.fillRect(-5,14,3,5); g.fillRect(2,14,3,5); }
          } else if(def.id==='cryo'){ // Fragata Glacial - nave com anéis de gelo
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-16); g.lineTo(9,0); g.lineTo(7,12); g.lineTo(-7,12); g.lineTo(-9,0); g.closePath(); g.fillPath(); g.strokePath();
            g.lineStyle(2,0x38bdf8,0.85); g.strokeCircle(0,0,11);
            g.fillStyle(0xbfe3ff,0.95); g.fillCircle(0,0,4);
            g.fillStyle(0x0a1226,1); g.fillRect(-2,12,4,5);
            if(lvl>=10) { g.fillStyle(0x38bdf8,0.25); g.fillCircle(0,0,16); }
          } else if(def.id==='tesla'){ // Cruzador Tempestade - nave com bobinas
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-18); g.lineTo(8,-8); g.lineTo(8,10); g.lineTo(0,14); g.lineTo(-8,10); g.lineTo(-8,-8); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0xffffff,0.95); g.fillCircle(-4,0,2); g.fillCircle(4,0,2);
            g.fillStyle(0xfde047,1); g.fillRect(-2,-14,4,6);
            g.lineStyle(1.5,0xfde047,0.7); g.strokeCircle(0,0,9);
            if(lvl>=15) g.fillStyle(0x34d399,0.3), g.fillCircle(0,0,13);
          } else if(def.id==='sniper'){ // Espectro Sniper - nave furtiva fina
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(0,-22); g.lineTo(4,-8); g.lineTo(4,8); g.lineTo(0,14); g.lineTo(-4,8); g.lineTo(-4,-8); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0x0a1226,1); g.fillRect(-2,-12,4,14);
            g.fillStyle(0x67e8f9,0.95); g.fillCircle(0,-4,2.5);
            g.lineStyle(1,0x67e8f9,0.6); g.strokeRect(-6,-10,12,4);
          } else if(def.id==='venom'){ // Infectador - nave orgânica com esporos
            g.fillStyle(col,1);
            g.fillEllipse(0,0,16,12);
            g.lineStyle(1,0xffffff,0.4); g.strokeEllipse(0,0,16,12);
            g.fillStyle(0x0a1226,1); g.fillCircle(0,0,5);
            g.fillStyle(col,1);
            for(let a=0;a<6;a++){ const ang=a*Math.PI/3; g.fillCircle(Math.cos(ang)*9, Math.sin(ang)*6, 2); }
            g.fillStyle(0xa3e635,0.9); g.fillCircle(0,0,2.5);
          } else if(def.id==='amp'){ // Porta-Naves - nave grande com hangar
            g.fillStyle(col,1);
            g.beginPath(); g.moveTo(-12,-10); g.lineTo(12,-10); g.lineTo(10,10); g.lineTo(-10,10); g.closePath(); g.fillPath(); g.strokePath();
            g.fillStyle(0x0a1226,0.9); g.fillRect(-10,-6,20,8);
            g.fillStyle(col,1); g.fillTriangle(0,-18, -6,-10, 6,-10);
            g.fillStyle(0x38bdf8,0.8); g.fillRect(-8,0,16,2);
            if(lvl>=10) g.strokeCircle(0,0,13);
          } else if(def.id==='rail'){ // Encouraçado Railgun - nave couraçada com trilho
            g.fillStyle(0xd1d5db,1);
            g.fillRect(-10,-14,20,20);
            g.lineStyle(1,0xffffff,0.5); g.strokeRect(-10,-14,20,20);
            g.fillStyle(0x0a1226,1); g.fillRect(-8,-12,16,4);
            g.fillStyle(col,1); g.fillRect(-2,-20,4,22);
            g.fillStyle(0xffffff,1); g.fillRect(-3, -18, 6, 2);
            if(lvl>=15) { g.fillStyle(0x38bdf8,0.4); g.fillRect(-10,6,20,4); }
          } else {
            g.fillStyle(col,1); g.fillCircle(0,0,9); g.strokeCircle(0,0,9);
          }
          // nível: anel dourado a cada 10 níveis
          if(lvl>=10) { g.lineStyle(1.2,0xfbbf24,0.85); g.strokeCircle(0,0,16+Math.floor(lvl/10)*2); }
          if(lvl>=25) { g.lineStyle(1,0xffffff,0.35); g.strokeCircle(0,0,19+Math.floor(lvl/10)*2); }
          if(lvl>=50) { g.fillStyle(0xfbbf24,0.9); g.fillCircle(0,-16,3); }

          g.restore();
        });
      }
    });
    Object.keys(D.ENEMIES_DATA).forEach(type => {
      const def = D.ENEMIES_DATA[type];
      const pad = Math.ceil(def.r * 3) + 8;
      mk('en_' + type, pad, g => { drawEnemyShape(g, def.shape, def.col, def.r); });
    });
  }

