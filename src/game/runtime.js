import { Engine } from '../../game/engine.js';
import { GameArt } from '../../game/game-art.js';
import { SND } from '../../game/game-audio.js';
import { HDATA } from '../../game/game-data.js';

const state = { engine: null, artReady: false, pending: null };

function artKeys() {
  const keys = [];
  HDATA.SHIPS.forEach((s) => keys.push('tur_' + s.id));
  Object.keys(HDATA.ENEMIES).forEach((id) => keys.push('en_' + id));
  Object.keys(HDATA.POWERUPS).forEach((id) => keys.push('pu_' + id));
  keys.push('px_dot', 'px_ring');
  return keys;
}

export async function ensureGame(canvas) {
  if (state.engine) return state.engine;
  if (state.pending) return state.pending;
  state.pending = Promise.resolve()
    .then(() => {
      const engine = new Engine(canvas, { W: 450, H: 800, bg: 0x050914 });
      try {
        GameArt.build();
      } catch (e) {}
      artKeys().forEach((key) => {
        let tex = null;
        try {
          tex = GameArt.get(key);
        } catch (e) {
          tex = null;
        }
        if (tex && engine.textures && typeof engine.textures.set === 'function') {
          engine.textures.set(key, tex);
        }
      });
      state.artReady = true;
      state.engine = engine;
      if (typeof window !== 'undefined') window.__engine = engine;
      return engine;
    })
    .catch((e) => {
      state.pending = null;
      throw e;
    });
  return state.pending;
}

export function playSnd(cue) {
  try {
    SND.unlock();
  } catch (e) {}
  try {
    if (cue) SND.play(cue);
  } catch (e) {}
}
