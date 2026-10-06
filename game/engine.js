function cssColor(color) {
  if (typeof color === 'number') return '#' + (color >>> 0).toString(16).padStart(6, '0');
  return color;
}

function makeCanvas(w, h) {
  if (typeof document !== 'undefined' && document && typeof document.createElement === 'function') {
    const c = document.createElement('canvas');
    c.width = Math.max(1, w | 0);
    c.height = Math.max(1, h | 0);
    return c;
  }
  return null;
}

function toNum(v, fallback) {
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

export class GameObject {
  constructor(engine, x, y, width = 0, height = 0) {
    this.engine = engine;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
    this.visible = true;
    this.alpha = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.depth = 0;
    this.blendMode = null;
    this.body = null;
    this.tint = null;
    this._destroyed = false;
  }

  get scale() {
    return this.scaleX;
  }

  set scale(value) {
    this.scaleX = value;
    this.scaleY = value;
  }

  setAlpha(a) {
    this.alpha = a;
    return this;
  }

  setVisible(v) {
    this.visible = v;
    return this;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  setScale(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy === undefined ? sx : sy;
    return this;
  }

  setDepth(d) {
    this.depth = d;
    return this;
  }

  setTint(color) {
    this.tint = color;
    return this;
  }

  setTintFill(color) {
    this.tint = color;
    return this;
  }

  clearTint() {
    this.tint = null;
    return this;
  }

  setBlendMode(mode) {
    this.blendMode = mode === 1 || mode === 'ADD' || mode === 'add' ? 'lighter' : mode;
    return this;
  }

  destroy() {
    if (this._destroyed) return this;
    this._destroyed = true;
    this.active = false;
    this.engine._remove(this);
    return this;
  }

  _draw() {}
}

class Shape extends GameObject {
  constructor(engine, x, y, width, height, color, alpha = 1) {
    super(engine, x, y, width, height);
    this.fillColor = color;
    this.fillAlpha = 1;
    this.strokeColor = null;
    this.strokeWidth = 0;
    this.strokeAlpha = 1;
    this.alpha = alpha;
  }

  setFillStyle(color, alpha) {
    this.fillColor = color;
    if (alpha !== undefined) this.fillAlpha = alpha;
    return this;
  }

  setStrokeStyle(width, color, alpha = 1) {
    this.strokeWidth = width;
    this.strokeColor = color;
    this.strokeAlpha = alpha;
    return this;
  }

  setTint(color) {
    this.fillColor = color;
    return this;
  }

  setTintFill(color) {
    this.fillColor = color;
    return this;
  }

  clearTint() {
    return this;
  }
}

export class Rect extends Shape {
  _draw(ctx) {
    const rotated = !!this.rotation;
    if (rotated) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.translate(-this.x, -this.y);
    }
    const w = this.width * this.scaleX;
    const h = this.height * this.scaleY;
    const px = this.x - w / 2;
    const py = this.y - h / 2;
    if (this.fillColor != null) {
      ctx.globalAlpha = this.alpha * this.fillAlpha;
      ctx.fillStyle = cssColor(this.fillColor);
      ctx.fillRect(px, py, w, h);
    }
    if (this.strokeColor != null && this.strokeWidth > 0) {
      ctx.globalAlpha = this.alpha * this.strokeAlpha;
      ctx.strokeStyle = cssColor(this.strokeColor);
      ctx.lineWidth = this.strokeWidth;
      ctx.strokeRect(px, py, w, h);
    }
    if (rotated) ctx.restore();
    ctx.globalAlpha = this.alpha;
  }
}

export class Circle extends Shape {
  constructor(engine, x, y, radius, color = 0xffffff, alpha = 1) {
    super(engine, x, y, radius * 2, radius * 2, color, alpha);
    this.radius = radius;
  }

  _draw(ctx) {
    const rx = Math.max(0, this.radius * this.scaleX);
    const ry = Math.max(0, this.radius * this.scaleY);
    ctx.beginPath();
    if (typeof ctx.ellipse === 'function') ctx.ellipse(this.x, this.y, rx, ry, 0, 0, Math.PI * 2);
    else ctx.arc(this.x, this.y, rx, 0, Math.PI * 2);
    if (this.fillColor != null) {
      ctx.globalAlpha = this.alpha * this.fillAlpha;
      ctx.fillStyle = cssColor(this.fillColor);
      ctx.fill();
    }
    if (this.strokeColor != null && this.strokeWidth > 0) {
      ctx.globalAlpha = this.alpha * this.strokeAlpha;
      ctx.strokeStyle = cssColor(this.strokeColor);
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }
    ctx.globalAlpha = this.alpha;
  }
}

export class Sprite extends GameObject {
  constructor(engine, x, y, art) {
    super(engine, x, y, 0, 0);
    this.key = typeof art === 'string' ? art : null;
    this.art = typeof art === 'string' ? null : art || null;
    this.canvas = null;
    this._resolve();
  }

  _resolve() {
    const c = this.art || (this.key != null ? this.engine.textures.get(this.key) : null);
    if (c) {
      this.canvas = c;
      this.width = c.width || 0;
      this.height = c.height || 0;
    }
    return this.canvas;
  }

  _draw(ctx) {
    const c = this._resolve();
    if (!c || !c.width || !c.height) return;
    const img = this.tint != null ? this.engine._tinted(this.key || c, c, this.tint) : c;
    const w = this.width * this.scaleX;
    const h = this.height * this.scaleY;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
  }
}

export class Text extends GameObject {
  constructor(engine, x, y, str, opts = {}) {
    super(engine, x, y, 0, 0);
    this.text = String(str);
    this.font = opts.font || '16px Orbitron, monospace';
    this.color = opts.color || '#e8eefc';
    this.align = opts.align || 'left';
    this.originX = toNum(opts.originX, 0);
    this.originY = toNum(opts.originY, 0);
    this.shadow = opts.shadow === undefined ? true : !!opts.shadow;
    this._measure();
  }

  _measure() {
    const ctx = this.engine.ctx;
    const size = parseFloat(this.font);
    const fs = Number.isNaN(size) ? 16 : size;
    let w = this.text.length * fs * 0.6;
    if (ctx && typeof ctx.measureText === 'function') {
      const m = ctx.measureText(this.text);
      if (m && typeof m.width === 'number' && m.width > 0) w = m.width;
    }
    this.width = w;
    this.height = fs * 1.2;
  }

  setText(str) {
    this.text = String(str);
    this._measure();
    return this;
  }

  setColor(color) {
    this.color = color;
    return this;
  }

  _draw(ctx) {
    ctx.save();
    ctx.font = this.font;
    ctx.textAlign = this.align;
    ctx.textBaseline = 'top';
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, this.scaleY);
    const ox = -this.originX * this.width;
    const oy = -this.originY * this.height;
    if (this.shadow) {
      ctx.fillStyle = '#000000';
      ctx.fillText(this.text, ox + 1, oy + 1);
    }
    ctx.fillStyle = cssColor(this.color);
    ctx.fillText(this.text, ox, oy);
    ctx.restore();
  }
}

export class Graphics extends GameObject {
  constructor(engine) {
    super(engine, 0, 0, 0, 0);
    this.lineWidth = 1;
    this.lineColor = 0xffffff;
    this.lineAlpha = 1;
    this.paths = [];
    this._current = null;
  }

  lineStyle(width, color, alpha = 1) {
    this.lineWidth = width;
    this.lineColor = color;
    this.lineAlpha = alpha;
    return this;
  }

  beginPath() {
    this._current = [];
    this.paths.push(this._current);
    return this;
  }

  moveTo(x, y) {
    if (!this._current) this.beginPath();
    this._current.push([0, x, y]);
    return this;
  }

  lineTo(x, y) {
    if (!this._current) this.beginPath();
    this._current.push([1, x, y]);
    return this;
  }

  strokePath() {
    return this;
  }

  clear() {
    this.paths = [];
    this._current = null;
    return this;
  }

  _draw(ctx) {
    if (!this.paths.length) return;
    ctx.globalAlpha = this.alpha * this.lineAlpha;
    ctx.strokeStyle = cssColor(this.lineColor);
    ctx.lineWidth = this.lineWidth;
    for (let i = 0; i < this.paths.length; i++) {
      const p = this.paths[i];
      ctx.beginPath();
      for (let j = 0; j < p.length; j++) {
        const s = p[j];
        if (s[0] === 0) ctx.moveTo(s[1] + this.x, s[2] + this.y);
        else ctx.lineTo(s[1] + this.x, s[2] + this.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = this.alpha;
  }
}

export class Group {
  constructor(engine) {
    this.engine = engine;
    this.children = [];
    this.active = true;
    this.visible = true;
    this.destroyed = false;
  }

  create(x, y, key) {
    const sprite = this.engine.physics.add.sprite(x, y, key);
    this.add(sprite);
    return sprite;
  }

  add(obj) {
    if (obj && this.children.indexOf(obj) === -1) this.children.push(obj);
    return obj;
  }

  remove(obj, removeFromScene) {
    const i = this.children.indexOf(obj);
    if (i !== -1) this.children.splice(i, 1);
    if (removeFromScene && obj && typeof obj.destroy === 'function') obj.destroy();
    return obj;
  }

  getChildren() {
    return this.children.slice();
  }

  getLength() {
    return this.children.length;
  }

  countActive(onlyVisible) {
    let n = 0;
    for (let i = 0; i < this.children.length; i++) {
      const c = this.children[i];
      if (c.active === false) continue;
      if (onlyVisible && c.visible === false) continue;
      n++;
    }
    return n;
  }

  clear(removeAndDestroy) {
    if (removeAndDestroy) {
      for (let i = 0; i < this.children.length; i++) {
        const c = this.children[i];
        if (c && typeof c.destroy === 'function') c.destroy();
      }
    }
    this.children.length = 0;
  }

  destroy() {
    this.clear(false);
    this.destroyed = true;
    this.engine._groups.delete(this);
  }
}

export class Body {
  constructor(engine, gameObject) {
    this.engine = engine;
    this.gameObject = gameObject;
    this.velocity = { x: 0, y: 0 };
    this.moves = true;
    this.enable = true;
    this.isCircle = false;
    this.radius = 0;
    this.offX = 0;
    this.offY = 0;
    this.width = 0;
    this.height = 0;
    this.collideWorldBounds = false;
    this.allowGravity = false;
  }

  setVelocity(x, y) {
    this.velocity.x = x;
    this.velocity.y = y;
    return this;
  }

  setAllowGravity(b) {
    this.allowGravity = !!b;
    return this;
  }

  setCircle(radius, ox = 0, oy = 0) {
    this.isCircle = true;
    this.radius = radius;
    this.offX = ox;
    this.offY = oy;
    return this;
  }

  setSize(w, h) {
    this.isCircle = false;
    this.width = w;
    this.height = h === undefined ? w : h;
    return this;
  }

  setCollideWorldBounds(b) {
    this.collideWorldBounds = !!b;
    return this;
  }
}

export class Camera {
  constructor(engine) {
    this.engine = engine;
    this._shakeT = 0;
    this._shakeDur = 0;
    this._shakeIntensity = 0;
    this._flashT = 0;
    this._flashDur = 0;
    this._flashColor = 0xffffff;
  }

  shake(duration, intensity) {
    this._shakeDur = duration;
    this._shakeT = duration;
    this._shakeIntensity = intensity || 0;
    return this;
  }

  flash(duration, color = 0xffffff) {
    this._flashDur = duration;
    this._flashT = duration;
    this._flashColor = color;
    return this;
  }

  _update(dt) {
    if (this._shakeT > 0) this._shakeT = Math.max(0, this._shakeT - dt);
    if (this._flashT > 0) this._flashT = Math.max(0, this._flashT - dt);
  }
}

const easeLinear = (t) => t;
const easeSineIn = (t) => 1 - Math.cos((t * Math.PI) / 2);
const easeSineOut = (t) => Math.sin((t * Math.PI) / 2);
const easeSineInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeQuadIn = (t) => t * t;
const easeQuadOut = (t) => 1 - (1 - t) * (1 - t);
const easeQuadInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeCubicIn = (t) => t * t * t;
const easeCubicOut = (t) => 1 - Math.pow(1 - t, 3);
const easeCubicInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const EASES = {
  linear: easeLinear,
  Linear: easeLinear,
  sine: easeSineInOut,
  sineIn: easeSineIn,
  sineOut: easeSineOut,
  'Sine.easeIn': easeSineIn,
  'Sine.easeOut': easeSineOut,
  'Sine.easeInOut': easeSineInOut,
  quad: easeQuadInOut,
  quadIn: easeQuadIn,
  quadOut: easeQuadOut,
  'Quad.easeIn': easeQuadIn,
  'Quad.easeOut': easeQuadOut,
  'Quad.easeInOut': easeQuadInOut,
  cubic: easeCubicInOut,
  cubicIn: easeCubicIn,
  cubicOut: easeCubicOut,
  'Cubic.easeIn': easeCubicIn,
  'Cubic.easeOut': easeCubicOut,
  'Cubic.easeInOut': easeCubicInOut,
};

const TWEEN_META = ['targets', 'duration', 'delay', 'repeat', 'yoyo', 'onComplete', 'ease', 'paused'];

export class Tweens {
  constructor(engine) {
    this.engine = engine;
    this._list = [];
  }

  add(config = {}) {
    const targets = Array.isArray(config.targets)
      ? config.targets.slice()
      : config.targets
        ? [config.targets]
        : [];
    const keys = Object.keys(config).filter((k) => TWEEN_META.indexOf(k) === -1);
    const tween = {
      targets,
      keys,
      to: {},
      duration: toNum(config.duration, 1000),
      delay: toNum(config.delay, 0),
      repeat: config.repeat === undefined ? 0 : config.repeat,
      yoyo: !!config.yoyo,
      ease: config.ease || 'linear',
      onComplete: typeof config.onComplete === 'function' ? config.onComplete : null,
      elapsed: 0,
      started: false,
      stopped: false,
      starts: null,
      paused: !!config.paused,
    };
    for (let i = 0; i < keys.length; i++) tween.to[keys[i]] = toNum(config[keys[i]], 0);
    this._list.push(tween);
    const self = this;
    return {
      get tween() {
        return tween;
      },
      stop() {
        tween.stopped = true;
        const i = self._list.indexOf(tween);
        if (i !== -1) self._list.splice(i, 1);
      },
    };
  }

  killAll() {
    this._list.length = 0;
  }

  killTweensOf(obj) {
    if (obj == null) return;
    for (let i = this._list.length - 1; i >= 0; i--) {
      if (this._list[i].targets.indexOf(obj) !== -1) this._list.splice(i, 1);
    }
  }

  _capture(tween) {
    tween.starts = tween.targets.map((t) => {
      const o = {};
      for (let i = 0; i < tween.keys.length; i++) o[tween.keys[i]] = toNum(t[tween.keys[i]], 0);
      return o;
    });
  }

  _update(dt) {
    for (let i = this._list.length - 1; i >= 0; i--) {
      const tw = this._list[i];
      if (tw.stopped || tw.paused) continue;
      if (tw.delay > 0) {
        tw.delay -= dt;
        if (tw.delay > 0) continue;
      }
      if (!tw.started) {
        tw.started = true;
        this._capture(tw);
      }
      tw.elapsed += dt;
      const cycle = tw.duration * (tw.yoyo ? 2 : 1);
      let p = cycle > 0 ? tw.elapsed / cycle : 1;
      const done = p >= 1;
      if (done) p = 1;
      const tt = tw.yoyo ? (p < 0.5 ? p * 2 : (1 - p) * 2) : p;
      const ease = EASES[tw.ease] || easeLinear;
      const e = ease(tt);
      for (let ti = 0; ti < tw.targets.length; ti++) {
        const target = tw.targets[ti];
        const start = tw.starts[ti];
        for (let ki = 0; ki < tw.keys.length; ki++) {
          const key = tw.keys[ki];
          const from = start[key];
          const to = tw.to[key];
          target[key] = from + (to - from) * e;
        }
      }
      if (done) {
        tw.elapsed = 0;
        if (tw.repeat === -1 || tw.repeat > 0) {
          if (tw.repeat > 0) tw.repeat -= 1;
        } else {
          this._list.splice(i, 1);
          if (tw.onComplete) tw.onComplete(tw, tw.targets);
        }
      }
    }
  }
}

export class Time {
  constructor(engine) {
    this.engine = engine;
    this.now = 0;
    this._timers = [];
  }

  delayedCall(ms, fn) {
    const self = this;
    const timer = {
      delay: ms,
      remaining: ms,
      callback: fn,
      remove() {
        const i = self._timers.indexOf(timer);
        if (i !== -1) self._timers.splice(i, 1);
      },
    };
    this._timers.push(timer);
    return timer;
  }

  removeAll() {
    this._timers.length = 0;
  }

  _update(dt) {
    for (let i = this._timers.length - 1; i >= 0; i--) {
      const timer = this._timers[i];
      timer.remaining -= dt;
      if (timer.remaining <= 0) {
        this._timers.splice(i, 1);
        if (timer.callback) timer.callback();
      }
    }
  }
}

export class Engine {
  constructor(canvas, opts = {}) {
    this.W = opts.W || 450;
    this.H = opts.H || 800;
    this.bg = opts.bg === undefined ? 0x050914 : opts.bg;
    this.canvas = canvas;
    canvas.width = this.W;
    canvas.height = this.H;
    this.ctx = canvas.getContext('2d');
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    this.now = 0;
    this._items = [];
    this._overlaps = [];
    this._groups = new Set();
    this._keys = new Set();
    this._just = new Set();
    this.virtualInput = { x: 0, y: 0, bomb: false };
    this._tintCache = new Map();
    this._artIds = new WeakMap();
    this._artId = 0;
    this._running = false;
    this._simulationPaused = false;
    this._last = null;
    this._handle = null;
    this._raf = null;
    this._updateFn = null;
    this.textures = new Map();
    this.time = new Time(this);
    this.tweens = new Tweens(this);
    this.cameras = { main: new Camera(this) };

    this.add = {
      rectangle: (x, y, w, h, color = 0xffffff, alpha = 1) => this._track(new Rect(this, x, y, w, h, color, alpha)),
      circle: (x, y, r, color = 0xffffff, alpha = 1) => this._track(new Circle(this, x, y, r, color, alpha)),
      sprite: (x, y, art) => this._track(new Sprite(this, x, y, art)),
      text: (x, y, str, o = {}) => this._track(new Text(this, x, y, str, o)),
      graphics: () => this._track(new Graphics(this)),
      group: () => {
        const g = new Group(this);
        this._groups.add(g);
        return g;
      },
    };

    this.physics = {
      add: {
        existing: (obj) => this._attachBody(obj),
        sprite: (x, y, key) => this._attachBody(this._track(new Sprite(this, x, y, key))),
        overlap: (a, b, cb) => this._addOverlap(a, b, cb),
        group: () => this.add.group(),
      },
    };

    this._onKeyDown = (e) => {
      const code = e && e.code;
      if (!code || e.repeat) return;
      if (!this._keys.has(code)) this._just.add(code);
      this._keys.add(code);
    };
    this._onKeyUp = (e) => {
      const code = e && e.code;
      if (code) this._keys.delete(code);
    };
    this._inputTarget =
      typeof window !== 'undefined' && window && typeof window.addEventListener === 'function'
        ? window
        : typeof globalThis !== 'undefined' && typeof globalThis.addEventListener === 'function'
          ? globalThis
          : null;
    if (this._inputTarget) {
      this._inputTarget.addEventListener('keydown', this._onKeyDown);
      this._inputTarget.addEventListener('keyup', this._onKeyUp);
    }
  }

  _track(obj) {
    this._items.push(obj);
    return obj;
  }

  _remove(obj) {
    const i = this._items.indexOf(obj);
    if (i !== -1) this._items.splice(i, 1);
    for (const g of this._groups) g.remove(obj, false);
  }

  _attachBody(obj) {
    if (obj && !obj.body) obj.body = new Body(this, obj);
    return obj;
  }

  _addOverlap(a, b, cb) {
    const self = this;
    const pair = { a, b, cb };
    this._overlaps.push(pair);
    return {
      destroy() {
        const i = self._overlaps.indexOf(pair);
        if (i !== -1) self._overlaps.splice(i, 1);
      },
    };
  }

  rgb(color) {
    if (typeof color === 'number') return color;
    if (typeof color === 'string') {
      const s = color.trim();
      if (s[0] === '#') {
        const h = s.slice(1);
        if (h.length === 3) return parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16);
        if (h.length >= 6) return parseInt(h.slice(0, 6), 16);
      }
    }
    return 0;
  }

  setBg(color) {
    this.bg = color;
    return this;
  }

  clearFrame() {
    if (this.ctx) this.ctx.clearRect(0, 0, this.W, this.H);
    return this;
  }

  start(updateFn) {
    if (typeof updateFn === 'function') this._updateFn = updateFn;
    if (this._running) return this;
    this._running = true;
    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb) => setTimeout(() => cb(Date.now()), 16);
    this._raf = raf;
    const loop = (ts) => {
      if (!this._running) return;
      this._frame(ts);
      if (!this._running) return;
      this._handle = raf(loop);
    };
    this._handle = raf(loop);
    return this;
  }

  pauseSimulation() {
    this._simulationPaused = true;
    this._keys.clear();
    this._just.clear();
    return this;
  }

  resumeSimulation() {
    this._simulationPaused = false;
    this._keys.clear();
    this._just.clear();
    this._last = null;
    return this;
  }

  stop() {
    this._running = false;
    if (this._handle != null) {
      const cancel =
        typeof cancelAnimationFrame === 'function'
          ? cancelAnimationFrame
          : typeof clearTimeout === 'function'
            ? clearTimeout
            : null;
      if (cancel) cancel(this._handle);
    }
    this._handle = null;
    return this;
  }

  destroy() {
    this.stop();
    if (this._inputTarget) {
      this._inputTarget.removeEventListener('keydown', this._onKeyDown);
      this._inputTarget.removeEventListener('keyup', this._onKeyUp);
    }
    this._items.length = 0;
    this._overlaps.length = 0;
    this._groups.clear();
    this._keys.clear();
    this._just.clear();
    this.tweens.killAll();
    this.time.removeAll();
    return this;
  }

  keyDown(code) {
    return this._keys.has(code);
  }

  keyJustDown(code) {
    return this._just.has(code);
  }

  _tinted(source, art, tint) {
    let id = source;
    if (typeof source !== 'string') {
      id = this._artIds.get(source);
      if (id === undefined) {
        id = ++this._artId;
        this._artIds.set(source, id);
      }
    }
    const cacheKey = id + '#' + tint;
    const hit = this._tintCache.get(cacheKey);
    if (hit) return hit;
    const c = makeCanvas(art.width, art.height);
    if (!c) return art;
    const cx = typeof c.getContext === 'function' ? c.getContext('2d') : null;
    if (!cx) return art;
    cx.imageSmoothingEnabled = false;
    cx.drawImage(art, 0, 0);
    cx.globalCompositeOperation = 'multiply';
    cx.fillStyle = cssColor(tint);
    cx.fillRect(0, 0, art.width, art.height);
    cx.globalCompositeOperation = 'destination-in';
    cx.drawImage(art, 0, 0);
    this._tintCache.set(cacheKey, c);
    return c;
  }

  _frame(ts) {
    const stamp = typeof ts === 'number' && !Number.isNaN(ts) ? ts : 0;
    let dt = this._last === null ? 16.6667 : stamp - this._last;
    if (!(dt >= 0)) dt = 0;
    if (dt > 50) dt = 50;
    this._last = stamp;
    this.now = stamp;
    this.time.now = stamp;
    if (this._simulationPaused) {
      this._just.clear();
      this._render();
      return;
    }
    this._stepBodies(dt);
    this._checkOverlaps();
    this.tweens._update(dt);
    this.time._update(dt);
    this.cameras.main._update(dt);
    if (this._updateFn) this._updateFn(dt, this);
    this._just.clear();
    this._render();
  }

  _stepBodies(dt) {
    const s = dt / 1000;
    for (let i = 0; i < this._items.length; i++) {
      const o = this._items[i];
      const b = o.body;
      if (!b || !b.moves || !b.enable || o.active === false) continue;
      o.x += b.velocity.x * s;
      o.y += b.velocity.y * s;
      if (b.collideWorldBounds) this._clampWorld(o, b);
    }
  }

  _clampWorld(o, b) {
    if (b.isCircle) {
      const r = b.radius;
      const cx = o.x + b.offX;
      const cy = o.y + b.offY;
      o.x = Math.min(this.W - r, Math.max(r, cx)) - b.offX;
      o.y = Math.min(this.H - r, Math.max(r, cy)) - b.offY;
      return;
    }
    const hw = (b.width || o.width * o.scaleX) / 2;
    const hh = (b.height || o.height * o.scaleY) / 2;
    o.x = Math.min(this.W - hw, Math.max(hw, o.x));
    o.y = Math.min(this.H - hh, Math.max(hh, o.y));
  }

  _pairList(x) {
    if (x instanceof Group) return x.getChildren();
    if (Array.isArray(x)) return x.slice();
    return x ? [x] : [];
  }

  _bounds(obj) {
    const b = obj.body;
    if (b && b.isCircle) {
      const r = b.radius;
      const cx = obj.x + b.offX;
      const cy = obj.y + b.offY;
      return { left: cx - r, right: cx + r, top: cy - r, bottom: cy + r };
    }
    const w = (b && b.width) || obj.width * obj.scaleX;
    const h = (b && b.height) || obj.height * obj.scaleY;
    return { left: obj.x - w / 2, right: obj.x + w / 2, top: obj.y - h / 2, bottom: obj.y + h / 2 };
  }

  _aabb(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  _checkOverlaps() {
    for (let i = 0; i < this._overlaps.length; i++) {
      const pair = this._overlaps[i];
      const listA = this._pairList(pair.a);
      const listB = this._pairList(pair.b);
      for (let x = 0; x < listA.length; x++) {
        const oa = listA[x];
        if (!oa || oa.active === false || !oa.body) continue;
        const ba = this._bounds(oa);
        for (let y = 0; y < listB.length; y++) {
          const ob = listB[y];
          if (!ob || ob === oa || ob.active === false || !ob.body) continue;
          if (this._aabb(ba, this._bounds(ob))) pair.cb(oa, ob);
        }
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.W, this.H);
    const items = this._items;
    if (items.length > 1) items.sort((a, b) => a.depth - b.depth);
    const cam = this.cameras.main;
    ctx.save();
    if (cam._shakeT > 0 && cam._shakeDur > 0) {
      const k = cam._shakeT / cam._shakeDur;
      const power = cam._shakeIntensity * k;
      ctx.translate((Math.random() * 2 - 1) * power, (Math.random() * 2 - 1) * power);
    }
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (o.visible === false || o.alpha <= 0 || o._destroyed) continue;
      if (o.blendMode) ctx.globalCompositeOperation = o.blendMode;
      ctx.globalAlpha = o.alpha;
      o._draw(ctx);
      ctx.globalAlpha = 1;
      if (o.blendMode) ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (cam._flashT > 0 && cam._flashDur > 0) {
      ctx.globalAlpha = Math.max(0, Math.min(1, cam._flashT / cam._flashDur));
      ctx.fillStyle = cssColor(cam._flashColor);
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
