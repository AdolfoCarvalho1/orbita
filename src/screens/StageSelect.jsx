import React, { useEffect, useState } from 'react';
import { ui } from '../game/bridge.js';
import { playSnd } from '../game/runtime.js';
import { Progress } from '../../game/progress.js';
import { HDATA } from '../../game/game-data.js';
import { SND } from '../../game/game-audio.js';
import { session } from '../game/session.js';

function objLabel(phase) {
  if (!phase) return '';
  return 'COMEÇO  →  MEIO  →  FINAL';
}

function startSel() {
  const st = Progress.load();
  const idx = Math.max(0, Math.min(24, st.unlocked | 0));
  return { c: Math.floor(idx / 5), p: idx % 5 };
}

function createMapSeed() {
  try {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0] || 1;
  } catch (e) {
    return (Math.random() * 0xffffffff) >>> 0 || 1;
  }
}

export default function StageSelect({ onBack }) {
  const [sel, setSel] = useState(startSel);
  const camp = HDATA.CAMPAIGNS[sel.c];
  const phase = camp.phases[sel.p];

  const move = (dc, dp) => {
    let c = sel.c;
    let p = sel.p;
    for (let i = 0; i < 25; i++) {
      c = (c + dc + 5) % 5;
      p = (p + dp + 5) % 5;
      if (Progress.isUnlocked(c, p)) break;
    }
    setSel({ c, p });
    playSnd('uiMove');
  };

  const start = () => {
    const cur = session.current || {};
    const shipId = cur.shipId || Progress.getLastShip() || HDATA.SHIPS[0].id;
    const spec = cur.spec === 'B' ? 'B' : Progress.getSpec(shipId);
    session.current = { c: sel.c, p: sel.p, shipId, spec, mapSeed: createMapSeed() };
    Progress.setLastShip(shipId);
    playSnd('uiConfirm');
    ui.set({
      screen: 'stage',
      hud: {
        score: 0,
        lives: HDATA.LIVES,
        bombs: HDATA.BOMBS_START,
        obj: objLabel(phase),
        pct: 0,
        super: 0,
        banner: null
      }
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      const c = e.code;
      if (c === 'ArrowLeft' || c === 'KeyA') {
        e.preventDefault();
        move(-1, 0);
      } else if (c === 'ArrowRight' || c === 'KeyD') {
        e.preventDefault();
        move(1, 0);
      } else if (c === 'ArrowUp' || c === 'KeyW') {
        e.preventDefault();
        move(0, -1);
      } else if (c === 'ArrowDown' || c === 'KeyS') {
        e.preventDefault();
        move(0, 1);
      } else if (c === 'Enter' || c === 'Space' || c === 'KeyZ') {
        e.preventDefault();
        start();
      } else if (c === 'Escape') {
        playSnd('uiMove');
        onBack();
      } else if (c === 'KeyM') {
        SND.setMuted(!SND.muted);
        playSnd('uiMove');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel.c, sel.p]);

  return (
    <div className="screen">
      <div className="screen-title-head">SELECIONE A FASE</div>
      <div className="stagerows">
        {HDATA.CAMPAIGNS.map((cc, r) => (
          <div className="stagerow" key={cc.id}>
            <div className="stagerow-name" style={{ color: cc.accent }}>
              {cc.name}
            </div>
            {cc.phases.map((ph, i) => {
              const on = sel.c === r && sel.p === i;
              const unlocked = Progress.isUnlocked(r, i);
              let cls = 'stagebtn';
              if (on) cls += ' is-on';
              if (!unlocked) cls += ' is-locked';
              return (
                <button
                  key={ph.n}
                  type="button"
                  className={cls}
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked && !on) {
                      setSel({ c: r, p: i });
                      playSnd('uiMove');
                    }
                  }}
                >
                  {r * 5 + i + 1}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="stage-info">
        <div className="stage-camp" style={{ color: camp.accent }}>
          {camp.name}
        </div>
        <div className="stage-phase">{phase.name}</div>
        <p className="stage-desc">{phase.desc}</p>
        <div className="stage-obj">{objLabel(phase)}</div>
      </div>
      <div className="screen-hint">ENTER inicia · ESC volta · M mute</div>
    </div>
  );
}
