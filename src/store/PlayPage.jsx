import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJogo } from './catalogo.js';
import GamePage from '../pages/GamePage.jsx';
import './store.css';

const TIMEOUT_MS = 8000;
const SRC_DEFESA = '/defesa/index.html';

export default function PlayPage() {
  const { id } = useParams();
  const jogo = getJogo(id);
  const [carregando, setCarregando] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    // O Navinha não usa iframe: o aviso de carregamento é só do Defense.
    if (!jogo || jogo.id !== 'defesa') return undefined;
    setCarregando(true);
    timer.current = setTimeout(() => setCarregando(false), TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [jogo]);

  if (!jogo) {
    return (
      <div className="store">
        <div className="soon">
          <h1 className="soon-t">SINAL PERDIDO</h1>
          <p className="soon-p">Esse jogo não está no catálogo.</p>
          <Link className="store-nav soon-back" to="/">
            VOLTAR AO PAINEL
          </Link>
        </div>
      </div>
    );
  }

  // O Navinha já é um app React com o próprio canvas: montamos o GamePage.
  if (jogo.id === 'navinha') {
    return (
      <div className="play">
        <Link className="play-back" to="/navinha">
          VOLTAR
        </Link>
        <GamePage />
      </div>
    );
  }

  // A Defesa da Terra é Phaser com globais próprios; o iframe mantém esse
  // código isolado do React.
  return (
    <div className="play">
      <Link className="play-back" to="/defesa">
        VOLTAR
      </Link>
      {carregando && (
        <div className="play-wait">
          <p>CARREGANDO {jogo.titulo}…</p>
        </div>
      )}
      <iframe
        className="ib"
        src={SRC_DEFESA}
        title={jogo.nome}
        onLoad={() => {
          if (timer.current) clearTimeout(timer.current);
          setCarregando(false);
        }}
      />
    </div>
  );
}
