import React from 'react';
import { Link } from 'react-router-dom';
import { soonEntry } from './catalogo.js';
import './store.css';

export default function SoonPage() {
  return (
    <div className="store">
      <header className="store-head">
        <Link className="store-mark" to="/">
          ÓRBITA
        </Link>
        <span className="store-tag">canal sem sinal</span>
        <span className="grow" />
        <Link className="store-nav" to="/">
          PAINEL
        </Link>
      </header>
      <div className="soon">
        <h1 className="soon-t">{soonEntry.titulo}</h1>
        <p className="soon-p">
          {soonEntry.descricao} Dois jogos já estão no ar e rodam inteiros no navegador, sem
          download e sem conta.
        </p>
        <Link className="store-nav soon-back" to="/">
          VOLTAR AO PAINEL
        </Link>
      </div>
    </div>
  );
}
