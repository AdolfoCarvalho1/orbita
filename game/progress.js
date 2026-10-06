'use strict';

export const Progress = (function () {
  const KEY = 'navinha_orbital_v1';
  let state = null;
  let loaded = false;

  function defaults() {
    return { unlocked: 0, high: 0, lastShip: 'cannon', specs: {} };
  }

  function ensure() {
    if (loaded) return state;
    loaded = true;
    state = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (typeof data.unlocked === 'number' && isFinite(data.unlocked)) {
            state.unlocked = Math.max(0, Math.min(24, Math.floor(data.unlocked)));
          }
          if (typeof data.high === 'number' && isFinite(data.high)) {
            state.high = Math.max(0, Math.floor(data.high));
          }
          if (typeof data.lastShip === 'string' && data.lastShip) {
            state.lastShip = data.lastShip;
          }
          if (data.specs && typeof data.specs === 'object') {
            const specs = {};
            for (const k in data.specs) {
              if (data.specs[k] === 'A' || data.specs[k] === 'B') specs[k] = data.specs[k];
            }
            state.specs = specs;
          }
        }
      }
    } catch (e) {}
    return state;
  }

  function save() {
    ensure();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  return {
    load: function () {
      return ensure();
    },
    save: save,
    isUnlocked: function (c, p) {
      ensure();
      return (c * 5 + p) <= state.unlocked;
    },
    complete: function (c, p) {
      ensure();
      const next = c * 5 + p + 1;
      if (next > state.unlocked && next <= 24) {
        state.unlocked = next;
        save();
      }
    },
    getHigh: function () {
      ensure();
      return state.high;
    },
    setHigh: function (n) {
      ensure();
      if (typeof n === 'number' && isFinite(n) && n > state.high) {
        state.high = Math.floor(n);
        save();
      }
    },
    getLastShip: function () {
      ensure();
      return state.lastShip;
    },
    setLastShip: function (id) {
      ensure();
      state.lastShip = id;
      save();
    },
    getSpec: function (id) {
      ensure();
      const v = state.specs[id];
      return (v === 'A' || v === 'B') ? v : 'A';
    },
    setSpec: function (id, spec) {
      ensure();
      if (!id || (spec !== 'A' && spec !== 'B')) return;
      if (!state.specs || typeof state.specs !== 'object') state.specs = {};
      state.specs[id] = spec;
      save();
    },
    reset: function () {
      state = defaults();
      loaded = true;
      save();
    },
    get state() {
      return ensure();
    }
  };
})();
