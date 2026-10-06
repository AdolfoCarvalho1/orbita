const THEMES = {
  asteroids: { base: '#030817', deep: '#071629', accent: '#38bdf8', terrain: '#192b3d', light: '#6b8095', kind: 'rocks' },
  horizontal: { base: '#080c16', deep: '#101524', accent: '#fbbf24', terrain: '#222a35', light: '#8c7650', kind: 'factory' },
  vertical: { base: '#061019', deep: '#0b2028', accent: '#f43f5e', terrain: '#132d35', light: '#52737b', kind: 'clouds' },
  arena: { base: '#050d16', deep: '#091b20', accent: '#34d399', terrain: '#122c2b', light: '#568d79', kind: 'grid' },
  tunnel: { base: '#050914', deep: '#101b15', accent: '#a3e635', terrain: '#1b2a21', light: '#6d8a51', kind: 'tunnel' }
};

function randomFrom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function polygon(ctx, points, fill, alpha) {
  if (!points.length) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function createRoute(random, width, height) {
  const step = 96;
  const points = [];
  let x = width * 0.5;
  for (let y = 0; y <= height + step; y += step) {
    x = clamp(x + (random() - 0.5) * 112, width * 0.31, width * 0.69);
    points.push({ x: x, y: y });
  }
  return {
    points: points,
    at: function (y) {
      const index = clamp(y / step, 0, points.length - 1);
      const low = Math.floor(index);
      const high = Math.min(points.length - 1, low + 1);
      const t = index - low;
      return points[low].x + (points[high].x - points[low].x) * t;
    }
  };
}

function drawStars(ctx, random, width, height) {
  for (let i = 0; i < Math.round(width * height / 2800); i++) {
    const x = Math.floor(random() * width);
    const y = Math.floor(random() * height);
    const size = random() > 0.91 ? 2 : 1;
    ctx.globalAlpha = 0.13 + random() * 0.3;
    ctx.fillStyle = random() > 0.82 ? '#8dcaff' : '#e5f3ff';
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawRocks(ctx, random, route, width, from, to, theme) {
  for (let y = from + 24; y < to; y += 74 + random() * 95) {
    for (let side = 0; side < 2; side++) {
      if (random() > 0.78) continue;
      const x = side === 0 ? 22 + random() * 76 : width - 22 - random() * 76;
      const r = 7 + random() * 25;
      const points = [];
      const n = 6 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n;
        const radius = r * (0.68 + random() * 0.45);
        points.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]);
      }
      polygon(ctx, points, theme.terrain, 0.44);
      polygon(ctx, points.slice(0, 3), theme.light, 0.12);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(x - 1, y + r * 0.45, 3, 2);
    }
  }
}

function drawFactory(ctx, random, width, from, to, theme) {
  for (let y = from + 30; y < to; y += 92 + random() * 96) {
    const side = random() > 0.5 ? 0 : 1;
    const x = side ? width - (24 + random() * 54) : 0;
    const w = 20 + random() * 42;
    const h = 22 + random() * 56;
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = theme.terrain;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = theme.light;
    ctx.strokeRect(x + 4, y + 5, Math.max(4, w - 8), Math.max(5, h - 10));
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(side ? x - 3 : x + w, y + 5 + random() * (h - 8), 3, 7);
  }
}

function drawClouds(ctx, random, width, from, to, theme) {
  for (let y = from + 28; y < to; y += 112 + random() * 108) {
    const side = random() > 0.5 ? 1 : -1;
    const x = side > 0 ? width : 0;
    const reach = 36 + random() * 82;
    const points = [[x, y - 28], [x - side * reach * 0.35, y - 18], [x - side * reach, y], [x - side * reach * 0.56, y + 12], [x - side * reach * 0.84, y + 28], [x, y + 38]];
    polygon(ctx, points, theme.terrain, 0.28);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = theme.light;
    ctx.fillRect(side > 0 ? x - reach : 0, y + 10, reach, 2);
  }
}

function drawGrid(ctx, random, width, from, to, theme) {
  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, from);
    ctx.lineTo(x + (random() - 0.5) * 46, to);
    ctx.stroke();
  }
  for (let y = from + 30; y < to; y += 50 + random() * 22) {
    ctx.globalAlpha = 0.06 + random() * 0.04;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = 24 + random() * (width - 48);
    const y = from + random() * (to - from);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 3, 3);
  }
  ctx.restore();
}

function drawTunnel(ctx, random, route, width, from, to, theme) {
  const middle = (from + to) * 0.5;
  const vanishingX = route.at(middle);
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const y = from + ((to - from) * i) / 5;
    const widthAtY = 28 + i * 44;
    ctx.globalAlpha = 0.12 + i * 0.008;
    ctx.strokeStyle = i % 2 ? theme.light : theme.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(vanishingX - widthAtY, y, widthAtY * 2, 3 + random() * 3);
  }
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(vanishingX, middle);
    ctx.lineTo(vanishingX + i * (width / 5), i < 0 ? from : to);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoute(ctx, route, width, height, theme) {
  for (const side of [-1, 1]) {
    ctx.beginPath();
    route.points.forEach((point, index) => {
      const x = clamp(point.x + side * 86, 8, width - 8);
      if (!index) ctx.moveTo(x, point.y);
      else ctx.lineTo(x, point.y);
    });
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  route.points.forEach((point, index) => {
    if (!index) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = theme.light;
  ctx.globalAlpha = 0.08;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawDestination(ctx, x, y, theme, isBoss) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha = isBoss ? 0.22 : 0.15;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, isBoss ? 94 : 54, isBoss ? 34 : 22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.09;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, isBoss ? 64 : 34, isBoss ? 22 : 12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(-2, -2, 4, 4);
  ctx.restore();
}

export function createProceduralMap(engine, options) {
  const opts = options || {};
  const width = engine.W || 450;
  const height = engine.H || 800;
  const travel = Math.round(height * 0.82);
  const mapHeight = height + travel;
  const seed = (Number(opts.seed) || 1) ^ ((opts.campaignIndex + 1) * 0x45d9f3b) ^ ((opts.phaseIndex + 1) * 0x119de1f3);
  const random = randomFrom(seed);
  const campaign = opts.campaign || {};
  const phase = opts.phase || {};
  const theme = THEMES[campaign.styleId] || THEMES.asteroids;
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return { update: function () {}, spawnX: function () { return width * 0.5; }, destroy: function () {} };
  canvas.width = width;
  canvas.height = mapHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { update: function () {}, spawnX: function () { return width * 0.5; }, destroy: function () {} };

  const gradient = ctx.createLinearGradient(0, 0, width, mapHeight);
  gradient.addColorStop(0, theme.base);
  gradient.addColorStop(0.5, theme.deep);
  gradient.addColorStop(1, theme.base);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, mapHeight);
  drawStars(ctx, random, width, mapHeight);

  const route = createRoute(random, width, mapHeight);
  const bandHeight = Math.ceil(mapHeight / 3);
  for (let act = 0; act < 3; act++) {
    const from = act * bandHeight;
    const to = Math.min(mapHeight, from + bandHeight);
    const cloudX = 50 + random() * (width - 100);
    const cloudY = (from + to) * 0.5;
    const glow = ctx.createRadialGradient(cloudX, cloudY, 2, cloudX, cloudY, width * 0.62);
    glow.addColorStop(0, theme.accent + '13');
    glow.addColorStop(1, theme.base + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, from, width, to - from);
    if (theme.kind === 'rocks') drawRocks(ctx, random, route, width, from, to, theme);
    else if (theme.kind === 'factory') drawFactory(ctx, random, width, from, to, theme);
    else if (theme.kind === 'clouds') drawClouds(ctx, random, width, from, to, theme);
    else if (theme.kind === 'grid') drawGrid(ctx, random, width, from, to, theme);
    else drawTunnel(ctx, random, route, width, from, to, theme);
    if (act > 0) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(0, from, width, 2);
    }
  }
  drawRoute(ctx, route, width, mapHeight, theme);
  const targetProgress = phase.obj === 'boss' ? 0.7 : 0.92;
  // A rota é desenhada do começo (y=0) para o destino. Com a janela invertida,
  // o destino é alcançado quando a janela chega perto de y=0, então ele é
  // posicionado perto do começo do mapa, e não no meio dele.
  const destinationY = mapHeight - (targetProgress * travel + height * 0.5);
  drawDestination(ctx, route.at(destinationY), destinationY, theme, phase.obj === 'boss');

  const sprite = engine.add.sprite(width * 0.5, mapHeight * 0.5, canvas).setDepth(-100);
  const lanePattern = [-54, 54, 0, -32, 32, 0];
  return {
    seed: seed >>> 0,
    update: function (progress) {
      const amount = clamp(Number(progress) || 0, 0, 1);
      // O mapa é desenhado do começo (y=0) até o destino, e a nave avança do
      // fundo da tela para o topo. Para o fundo andar na direção do avanço — e
      // não ao contrário, que dava a impressão de ré — a janela percorre o mapa
      // de trás para frente: começa mostrando o fim e chega mostrando o começo.
      // Inverter só o sinal deixaria os 656px de cima da tela vazios no fim da
      // fase, então o deslocamento é `- travel` na origem e `- amount * travel`.
      sprite.y = mapHeight * 0.5 - travel + amount * travel;
    },
    spawnX: function (progress, serial, nextRandom) {
      // A janela desliza de trás para frente, então o ponto da rota que está no
      // topo da tela recua pelo mapa conforme a fase avança: no começo da fase é
      // o fim da rota, no fim é o começo. É a mesma inversão do `update`.
      const amount = clamp(Number(progress) || 0, 0, 1);
      const routeY = height * 0.5 + (1 - amount) * travel;
      const jitter = (typeof nextRandom === 'function' ? nextRandom() : random()) * 30 - 15;
      const offset = lanePattern[(serial | 0) % lanePattern.length];
      return clamp(route.at(routeY) + offset + jitter, 28, width - 28);
    },
    destroy: function () {
      if (sprite && sprite.destroy) sprite.destroy();
    }
  };
}
