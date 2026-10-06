import React from 'react';
import { Link } from 'react-router-dom';
import { CATALOGO, soonEntry } from './catalogo.js';
import SupportBand from './SupportBand.jsx';
import './store.css';

const TOTAL_VOLUME = 40; // 25 fases + 15 mapas, somado dos dois jogos

// Uma medida é a barra + o valor medido. A figura do valor e a figura do
// progresso são dois elementos separados, cada um em sua própria área do grid,
// senão no celular os dois textos ocupam a mesma célula e se atropelam.
function Medidor({ m }) {
  const pct = m.total > 0 ? Math.round((m.valor / m.total) * 100) : 0;
  return (
    <>
      <span className="chan-meter">
        <i
          className={m.alerta ? 'chan-fill chan-fill--red' : 'chan-fill'}
          style={{ width: pct + '%' }}
        />
      </span>
      <span className="chan-fig">{m.valor} {m.rotulo}</span>
    </>
  );
}

// Cada medida vira uma linha do painel. A primeira traz o botão JOGAR; as
// seguintes mostram o resto do volume medido mais o progresso real daquela
// pessoa, lido do save que o próprio jogo gravou.
function Medidas({ jogo }) {
  const prog = jogo.progresso.ler();
  return (
    <>
      {jogo.medidas.map((m, i) => (
        <div className="chan" key={jogo.id + m.rotulo} data-seq={jogo.seq}>
          <span className="chan-lb">{i === 0 ? jogo.canal : ''}</span>
          <span className={i === 0 ? 'chan-name' : 'chan-sub'}>{i === 0 ? jogo.titulo : m.rotulo}</span>
          <Medidor m={m} />
          {i === 0 ? (
            <Link className="chan-go" to={'/' + jogo.id}>
              JOGAR
            </Link>
          ) : (
            <span className="chan-own">{prog.feito}/{prog.total} SUAS</span>
          )}
        </div>
      ))}
    </>
  );
}

export default function StoreHome() {
  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">dois jogos no navegador</span>
        <span className="grow" />
        <Link className="store-nav" to="/navinha">
          CH1
        </Link>
        <Link className="store-nav" to="/defesa">
          CH2
        </Link>
        <a className="store-nav" href="#apoio">
          APOIO
        </a>
      </header>

      <section className="readout">
        <div className="readout-lead">
          <p className="readout-k">DOIS JOGOS · SAÍDA IMEDIATA</p>
          <h1 className="readout-h1">
            Dois jogos. <em>Zero</em> download.
          </h1>
        </div>
        <div className="readout-nums">
          <div className="readout-ch">
            <span className="readout-k">CH1 · CATÁLOGO</span>
            <span className="readout-n">{CATALOGO.length}</span>
            <span className="readout-unit">JOGOS</span>
          </div>
          <div className="readout-ch">
            <span className="readout-k">CH2 · VOLUME</span>
            <span className="readout-n readout-n--red">{TOTAL_VOLUME}</span>
            <span className="readout-unit">FASES + MAPAS</span>
          </div>
          <div className="readout-ch">
            <span className="readout-k">CH3 · INSTALAÇÃO</span>
            <span className="readout-n readout-n--red">0</span>
            <span className="readout-unit">NENHUMA</span>
          </div>
        </div>
      </section>

      <section className="grat">
        <div className="grat-in">
          <div className="grat-head" aria-hidden="true">
            <span>CANAL</span>
            <span>MEDIÇÃO</span>
            <span>LEITURA</span>
            <span>SEU</span>
            <span />
          </div>
          {CATALOGO.map((j) => (
            <Medidas key={j.id} jogo={j} />
          ))}
          <div className="chan chan--soon">
            <span className="chan-lb">—</span>
            <span className="chan-name">{soonEntry.titulo}</span>
            <span className="chan-soon">SEM SINAL</span>
          </div>
        </div>
      </section>

      <p className="hint">
        DIVISÕES = 10 · SEM DOWNLOAD · SEM CONTA · SEM LOJA · ABRA E JOGUE
      </p>

      <div id="apoio">
        <SupportBand />
      </div>
    </div>
  );
}
