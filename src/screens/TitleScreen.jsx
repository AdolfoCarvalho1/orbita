import React, { useEffect, useState } from 'react';
import { ui } from '../game/bridge.js';
import { playSnd } from '../game/runtime.js';
import { Progress } from '../../game/progress.js';
import { SND } from '../../game/game-audio.js';
import { GameArt } from '../../game/game-art.js';

export default function TitleScreen() {
  const [muted, setMuted] = useState(!!SND.muted);
  const high = Progress.getHigh();
  const shipArt = GameArt.dataURL('tur_rail');

  const start = () => {
    playSnd('uiConfirm');
    ui.set({ screen: 'ship' });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        start();
      } else if (e.code === 'KeyM') {
        SND.setMuted(!SND.muted);
        setMuted(!!SND.muted);
        playSnd('uiMove');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="screen screen-title">
      <div className="title-logo">NAVINHA</div>
      <div className="title-sub">CAMPANHA ORBITAL</div>
      <div className="title-ship-art" aria-hidden="true">
        <span className="title-orbit title-orbit-a" />
        <span className="title-orbit title-orbit-b" />
        {shipArt && <img src={shipArt} alt="" />}
        <span className="title-scanline" />
      </div>
      <div className="title-high">
        RECORDE <b>{String(Math.max(0, high)).padStart(5, '0')}</b>
      </div>
      <div className="title-controls" aria-label="Controles do jogo">
        <span><b>MOVER</b> setas / WASD</span>
        <span><b>TIRO</b> automático</span>
        <span><b>BOMBA</b> X</span>
      </div>
      <button className="title-start" type="button" onClick={start}>
        INICIAR CAMPANHA <span aria-hidden="true">↗</span>
      </button>
      <div className="screen-hint">ENTER inicia · M som {muted ? '(OFF)' : '(ON)'}</div>
    </div>
  );
}
