import React, { useEffect, useRef, useState } from 'react';
import { ensureGame } from '../game/runtime.js';
import { ui, useUI } from '../game/bridge.js';
import { SND } from '../../game/game-audio.js';
import TitleScreen from '../screens/TitleScreen.jsx';
import ShipSelect from '../screens/ShipSelect.jsx';
import StageSelect from '../screens/StageSelect.jsx';
import StageView from '../screens/StageView.jsx';
import ResultScreen from '../screens/ResultScreen.jsx';
import '../ui.css';
import { Link } from 'react-router-dom';

export default function GamePage() {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [menuView, setMenuView] = useState('ships');
  const view = useUI();

  useEffect(() => {
    let alive = true;
    ensureGame(canvasRef.current)
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (view.screen !== 'ship') setMenuView('ships');
  }, [view.screen]);

  useEffect(() => {
    if (view.screen === 'title' || view.screen === 'ship') SND.startMusic('menu');
  }, [view.screen]);

  useEffect(() => {
    const unlock = () => SND.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      SND.stopMusic();
      ui.set({ screen: 'title', hud: null, result: null });
    };
  }, []);

  return (
    <div className="game-page">
      <Link className="play-back" to="/navinha">
        VOLTAR
      </Link>
      <div className="game-frame" id="frame">
          <canvas id="game" ref={canvasRef} width="450" height="800" aria-label="Campo de batalha da Navinha" />
        <div id="crt" />
        {ready && (
          <div className="overlay">
            {view.screen === 'title' && <TitleScreen />}
            {view.screen === 'ship' && menuView === 'ships' && (
              <ShipSelect onDone={() => setMenuView('stages')} />
            )}
            {view.screen === 'ship' && menuView === 'stages' && (
              <StageSelect onBack={() => setMenuView('ships')} />
            )}
            {view.screen === 'stage' && <StageView />}
            {view.screen === 'result' && <ResultScreen />}
          </div>
        )}
        {!ready && (
          <div className="overlay">
            <div className="loading">CARREGANDO...</div>
          </div>
        )}
      </div>
    </div>
  );
}
