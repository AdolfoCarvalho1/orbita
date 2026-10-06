import { useSyncExternalStore } from 'react';

let state = { screen: 'title', hud: null, result: null };
const listeners = new Set();

export const ui = {
  get() {
    return state;
  },
  set(partial) {
    state = { ...state, ...partial };
    listeners.forEach((fn) => fn());
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};

export function useUI() {
  return useSyncExternalStore(ui.subscribe, ui.get, ui.get);
}
