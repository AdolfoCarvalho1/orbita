import React from 'react';
import { Link } from 'react-router-dom';
import { getJogo } from './catalogo.js';
import './store.css';

function TelaDeErro({ titulo, texto }) {
  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
      </header>
      <div className="soon">
        <h1 className="soon-t">{titulo}</h1>
        <p className="soon-p">{texto}</p>
        <Link className="store-nav soon-back" to="/">
          VOLTAR AO PAINEL
        </Link>
      </div>
    </div>
  );
}

// O id vem por prop, não por useParams: a rota é literal (/navinha), então não
// existe parâmetro de rota para ler.
export default function GameDetail({ id }) {
  const jogo = getJogo(id);

  if (!jogo) {
    return <TelaDeErro titulo="SINAL PERDIDO" texto="Esse canal não existe no catálogo." />;
  }

  const prog = jogo.progresso.ler();

  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">{jogo.canal}</span>
        <span className="grow" />
        <Link className="store-nav" to="/">
          PAINEL
        </Link>
        <Link className="store-nav store-nav--on" to={'/jogar/' + jogo.id}>
          JOGAR
        </Link>
      </header>

      <article className="ch">
        <div className="ch-head">
          <span className="ch-lb">{jogo.canal}</span>
          <h1 className="ch-title">
            {jogo.nome.split(' — ')[0]}
            <span className="ch-sub-title">{jogo.nome.includes(' — ') ? jogo.nome.split(' — ')[1] : null}</span>
          </h1>
          <Link className="ch-go" to={'/jogar/' + jogo.id}>
            JOGAR AGORA
          </Link>
        </div>

        <div className="ch-screen">
          <img
            src={'/store/' + jogo.id + '/' + jogo.screenshots[0] + '.png'}
            alt={'Captura de tela real de ' + jogo.nome}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="ch-stripes" />
        </div>

        <div className="ch-seg">
          <span className="ch-seg-k">GALERIA</span>
          <span className="ch-seg-v">
            <span className="ch-keys">
              {jogo.screenshots.map((s, i) => (
                <span className="ch-key" key={s}>
                  {i === 0 ? 'CAPA' : 'TELA ' + i} · {s.toUpperCase()}.PNG
                </span>
              ))}
            </span>
          </span>
        </div>

        <div className="ch-seg">
          <span className="ch-seg-k">DESCRIÇÃO</span>
          <span className="ch-seg-v">{jogo.descricao}</span>
        </div>

        {jogo.ficha.map((f) => (
          <div className="ch-seg" key={f.rotulo}>
            <span className="ch-seg-k">{f.rotulo}</span>
            <span className="ch-seg-v">{f.valor}</span>
          </div>
        ))}

        <div className="ch-seg">
          <span className="ch-seg-k">CONTROLES</span>
          <span className="ch-seg-v">
            <span className="ch-keys">
              {jogo.controles.map((c) => (
                <span className="ch-key" key={c.tecla}>
                  {c.tecla} — {c.descricao}
                </span>
              ))}
            </span>
          </span>
        </div>

        <div className="ch-verdict">
          <span className="support-k">SEU PROGRESSO</span>
          <span className="support-k">SAVE {jogo.progresso.chave}</span>
          <span className="ch-verdict-v">
            {prog.feito} DE {prog.total}
          </span>
        </div>
      </article>
    </div>
  );
}
