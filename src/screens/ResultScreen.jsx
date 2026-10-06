import React, { useEffect, useMemo, useState } from 'react';
import { ui, useUI } from '../game/bridge.js';
import { playSnd } from '../game/runtime.js';
import { Progress } from '../../game/progress.js';
import { HDATA } from '../../game/game-data.js';
import { SND } from '../../game/game-audio.js';
import { session } from '../game/session.js';

const LABELS = { next: 'PRÓXIMA', retry: 'RETRY', menu: 'MENU' };

export default function ResultScreen() {
  const view = useUI();
  const r = view.result || {};
  const c = r.c != null ? r.c : 0;
  const p = r.p != null ? r.p : 0;
  const victory = !!r.victory;
  const idx = c * 5 + p;
  const letter = 'ABCDE'.charAt(c);
  const camp = HDATA.CAMPAIGNS[c];
  const hasNext = victory && idx + 1 <= 24;

  const actions = useMemo(() => {
    const list = [];
    if (hasNext) list.push('next');
    list.push('retry');
    list.push('menu');
    return list;
  }, [hasNext]);

  const [sel, setSel] = useState(0);
  const newRec =
    r.newRec != null ? !!r.newRec : Math.max(0, r.score | 0) > 0 && Progress.getHigh() === (r.score | 0);

  useEffect(() => {
    SND.startMusic('menu');
  }, []);

  const run = (a) => {
    playSnd('uiConfirm');
    if (a === 'next') {
      const n = idx + 1;
      session.current = {
        ...(session.current || {}),
        c: Math.floor(n / 5),
        p: n % 5,
        runBuild: r.runBuild || (session.current && session.current.runBuild)
      };
      ui.set({ screen: 'stage', hud: null, result: null });
    } else if (a === 'retry') {
      session.current = { ...(session.current || {}), c, p };
      ui.set({ screen: 'stage', hud: null, result: null });
    } else {
      ui.set({ screen: 'ship', hud: null, result: null });
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const code = e.code;
      if (code === 'ArrowUp' || code === 'KeyW') {
        e.preventDefault();
        setSel((v) => (v - 1 + actions.length) % actions.length);
        playSnd('uiMove');
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        e.preventDefault();
        setSel((v) => (v + 1) % actions.length);
        playSnd('uiMove');
      } else if (code === 'Enter' || code === 'Space' || code === 'KeyZ') {
        e.preventDefault();
        run(actions[Math.min(sel, actions.length - 1)]);
      } else if (code === 'Escape') {
        run('menu');
      } else if (code === 'KeyM') {
        SND.setMuted(!SND.muted);
        playSnd('uiMove');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, sel, idx, c, p]);

  return (
    <div className="screen screen-result">
      <div className="result-panel">
        <div className={victory ? 'result-title is-win' : 'result-title is-lose'}>
          {victory ? 'FASE COMPLETA' : 'GAME OVER'}
        </div>
        <div className="result-sub">
          FASE {idx + 1}
          {letter ? ' · ' + letter : ''}
        </div>
        <div className="result-camp">{camp ? camp.name : ''}</div>
        <div className="result-rows">
          <div>
            <span>PONTOS</span>
            <b>{String(Math.max(0, r.score | 0)).padStart(6, '0')}</b>
          </div>
          <div>
            <span>RECORDE</span>
            <b>{String(Math.max(0, Progress.getHigh())).padStart(6, '0')}</b>
          </div>
        </div>
        {newRec && <div className="result-new">NOVO RECORDE!</div>}
        <div className="result-btns">
          {actions.map((a, i) => (
            <button
              key={a}
              type="button"
              className={i === sel ? 'result-btn is-on' : 'result-btn'}
              onClick={() => {
                setSel(i);
                run(a);
              }}
            >
              {LABELS[a]}
            </button>
          ))}
        </div>
        <div className="screen-hint">↑↓ escolhe · ENTER confirma · ESC menu</div>
      </div>
    </div>
  );
}
