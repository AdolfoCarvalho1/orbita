// Leitura do progresso de cada jogo, direto do save que o próprio jogo gravou.
// Estas funções são SOMENTE LEITURA: nunca escrevem, nunca migram, nunca
// resetam. Um save ausente, corrompido ou de outro formato devolve zero.

const CHAVE_NAVINHA = 'navinha_orbital_v1';
const CHAVE_DEFESA = 'defesa_orbital_v3';
const TOTAL_NAVINHA = 25;
const TOTAL_DEFESA = 15;

function lerChave(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    return dados && typeof dados === 'object' ? dados : null;
  } catch (e) {
    return null;
  }
}

function inteiro(valor) {
  const n = Number(valor);
  return isFinite(n) ? Math.floor(n) : 0;
}

function limitado(valor, min, max) {
  return Math.max(min, Math.min(max, inteiro(valor)));
}

// Navinha grava `unlocked`: o índice linear da próxima fase ainda bloqueada,
// numeração de 0 a 24. 0 significa nada liberado.
export function lerNavinha() {
  const d = lerChave(CHAVE_NAVINHA);
  const feito = d ? limitado(d.unlocked, 0, TOTAL_NAVINHA) : 0;
  return { feito, total: TOTAL_NAVINHA };
}

// Defesa da Terra grava `unlockedMap`: o jogo faz `Math.max(1, ...)` com padrão 1
// e teto em MAPS_DATA.length, então o valor JÁ É a contagem de mapas liberados.
// Não subtraímos nada: unlockedMap 4 significa quatro mapas liberados.
export function lerDefesa() {
  const d = lerChave(CHAVE_DEFESA);
  const feito = d ? limitado(d.unlockedMap, 0, TOTAL_DEFESA) : 0;
  return { feito, total: TOTAL_DEFESA };
}
