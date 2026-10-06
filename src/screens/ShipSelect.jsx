import React, { useEffect, useState } from 'react';
import { ui } from '../game/bridge.js';
import { playSnd } from '../game/runtime.js';
import { Progress } from '../../game/progress.js';
import { HDATA } from '../../game/game-data.js';
import { GameArt } from '../../game/game-art.js';
import { SND } from '../../game/game-audio.js';
import { session } from '../game/session.js';

const SHIPS = HDATA.SHIPS;

function artURL(key) {
  try {
    return GameArt.dataURL(key);
  } catch (e) {
    return '';
  }
}

export default function ShipSelect({ onDone }) {
  const [sel, setSel] = useState(() => {
    const last = Progress.getLastShip();
    const i = SHIPS.findIndex((s) => s.id === last);
    return i >= 0 ? i : 0;
  });
  const [spec, setSpec] = useState(() => {
    const last = Progress.getLastShip();
    return Progress.getSpec(last) === 'B' ? 'B' : 'A';
  });
  const ship = SHIPS[sel];

  useEffect(() => {
    setSpec(Progress.getSpec(SHIPS[sel].id) === 'B' ? 'B' : 'A');
  }, [sel]);

  const move = (dx, dy) => {
    const col = sel % 5;
    const row = Math.floor(sel / 5);
    const nc = (col + dx + 5) % 5;
    const nr = (row + dy + 2) % 2;
    setSel(nr * 5 + nc);
    playSnd('uiMove');
  };

  const toggleSpec = () => {
    setSpec((v) => (v === 'A' ? 'B' : 'A'));
    playSnd('uiMove');
  };

  const confirm = () => {
    Progress.setSpec(ship.id, spec);
    Progress.setLastShip(ship.id);
    session.current = { ...(session.current || {}), shipId: ship.id, spec };
    playSnd('uiConfirm');
    onDone();
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
      } else if (c === 'KeyQ' || c === 'KeyE') {
        toggleSpec();
      } else if (c === 'Enter' || c === 'Space' || c === 'KeyZ') {
        e.preventDefault();
        confirm();
      } else if (c === 'Escape') {
        playSnd('uiMove');
        ui.set({ screen: 'title' });
      } else if (c === 'KeyM') {
        SND.setMuted(!SND.muted);
        playSnd('uiMove');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, spec]);

  return (
    <div className="screen">
      <div className="screen-title-head">ESCOLHA SUA NAVE (1 das 10)</div>
      <div className="ship-grid">
        {SHIPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={i === sel ? 'ship-cell is-on' : 'ship-cell'}
            style={{ '--accent': s.color }}
            onClick={() => {
              if (i !== sel) {
                setSel(i);
                playSnd('uiMove');
              }
            }}
          >
            <img src={artURL('tur_' + s.id)} alt="" />
            <span>{s.name}</span>
          </button>
        ))}
      </div>
      <div className="ship-panel">
        <img className="ship-big" src={artURL('tur_' + ship.id)} alt={ship.name} />
        <div className="ship-info">
          <div className="ship-name" style={{ color: ship.color }}>
            {ship.name}
          </div>
          <p className="ship-desc">{ship.desc}</p>
          <div className={spec === 'A' ? 'spec is-on' : 'spec'}>
            <b>A · {ship.specA.name}</b>
            <span>{ship.specA.desc}</span>
          </div>
          <div className={spec === 'B' ? 'spec is-on' : 'spec'}>
            <b>B · {ship.specB.name}</b>
            <span>{ship.specB.desc}</span>
          </div>
        </div>
      </div>
      <div className="screen-hint">Q/E: TROCAR ESPECIALIDADE · ENTER seleciona · ESC volta</div>
    </div>
  );
}
