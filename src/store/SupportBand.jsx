import React from 'react';
import './store.css';

// A chave PIX ainda é um placeholder no código. Enquanto for isso, a loja não
// pode oferecer nenhuma ação de pagamento: nada de "copiar chave", nada de QR.
// A comparação é feita contra o placeholder exato e nao por tamanho, porque o
// placeholder tem 26 caracteres e passaria num teste de comprimento.
const PIX_KEY = 'COLE_SUA_CHAVE_PIX_AQUI';
const CHAVE_REAL = !PIX_KEY.startsWith('COLE_SUA_') && PIX_KEY.trim().length > 20;

export default function SupportBand() {
  return (
    <footer className="support">
      <span className="support-k">APOIO VOLUNTÁRIO VIA PIX</span>
      <span className="support-k">QUALQUER VALOR</span>
      {CHAVE_REAL ? (
        <button
          className="support-b"
          type="button"
          onClick={() => navigator.clipboard.writeText(PIX_KEY)}
        >
          COPIAR CHAVE
        </button>
      ) : (
        <span className="support-b support-b--off">CHAVE EM BREVE</span>
      )}
    </footer>
  );
}
