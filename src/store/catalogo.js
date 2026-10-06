// Single source of truth for the store. Every count here was read from the game's
// own data file: game/game-data.js for Navinha, assets/data.js for Defesa da
// Terra. Nothing in this file is estimated, and nothing may be invented.
import { lerNavinha, lerDefesa } from './progresso.js';

export const CATALOGO = [
  {
    id: 'navinha',
    seq: 1,
    canal: 'CH1',
    titulo: 'NAVINHA',
    nome: 'Navinha — Campanha Orbital',
    genero: "SHOOT'EM UP VERTICAL",
    generoLongo: "Shoot'em up vertical, estilo PlayStation 1.",
    descricao:
      'Dez naves com duas especialidades cada, dezesseis inimigos, quatro chefes e vinte e cinco fases distribuídas em cinco campanhas. Durante a partida você coleta power-ups e escolhe entre quatro melhorias que sobem até o nível dez.',
    medidas: [
      { rotulo: 'FASES', valor: 25, total: 25 },
      { rotulo: 'NAVES', valor: 10, total: 10 },
      { rotulo: 'CHEFES', valor: 4, total: 10, alerta: true }
    ],
    ficha: [
      { rotulo: 'CLASSE', valor: "Shoot'em up vertical" },
      { rotulo: 'VOLUME', valor: '25 fases · 5 campanhas' },
      { rotulo: 'NAVES', valor: '10, com 2 especialidades cada' },
      { rotulo: 'INIMIGOS', valor: '16 tipos, 4 deles chefes' },
      { rotulo: 'PROGRESSÃO', valor: '4 melhorias, até o nível 10 por partida' },
      { rotulo: 'REQUISITOS', valor: 'Nenhum. Roda no navegador.' }
    ],
    controles: [
      { tecla: 'SETAS', descricao: 'mover a nave' },
      { tecla: 'WASD', descricao: 'mover a nave' },
      { tecla: 'TIRO', descricao: 'automático' },
      { tecla: 'X', descricao: 'bomba' },
      { tecla: 'M', descricao: 'silenciar' },
      { tecla: 'ESC', descricao: 'menu' },
      { tecla: 'TOQUE', descricao: 'controle na tela' }
    ],
    // A vitrine usa a grade de naves como retrato: é a tela que mostra as dez de
    // uma vez, que é o que a ficha declara. 'fase' é o jogo rodando.
    screenshots: ['2', '3', 'fase'],
    progresso: { chave: 'navinha_orbital_v1', total: 25, ler: lerNavinha }
  },
  {
    id: 'defesa',
    seq: 2,
    canal: 'CH2',
    titulo: 'DEFESA DA TERRA',
    nome: 'Defesa da Terra — ULTRA',
    genero: 'TOWER DEFENSE',
    generoLongo: 'Tower defense espacial num tabuleiro de 21 por 13 casas.',
    descricao:
      'Quinze mapas do sistema solar, três dificuldades, dez torres que fundem entre si ao subir de nível e um sistema de frota com combustível, bateria e munição. A horda anda por um caminho fixo; você decide onde gastar.',
    medidas: [
      { rotulo: 'MAPAS', valor: 15, total: 15 },
      { rotulo: 'TORRES', valor: 10, total: 10 },
      { rotulo: 'TIPOS DE INIMIGO', valor: 16, total: 20, alerta: true }
    ],
    ficha: [
      { rotulo: 'CLASSE', valor: 'Tower defense' },
      { rotulo: 'VOLUME', valor: '15 mapas do sistema solar' },
      { rotulo: 'TORRES', valor: '10, que fundem entre si ao evoluir' },
      { rotulo: 'INIMIGOS', valor: '16 tipos, com nível próprio cada' },
      { rotulo: 'DIFICULDADES', valor: '3' },
      { rotulo: 'FROTA', valor: 'Combustível, bateria e munição' },
      { rotulo: 'REQUISITOS', valor: 'Nenhum. Roda no navegador.' }
    ],
    controles: [
      { tecla: 'MOUSE', descricao: 'posicionar e melhorar torres' },
      { tecla: 'ARRASTAR', descricao: 'mover a vista do tabuleiro' },
      { tecla: 'M', descricao: 'silenciar' },
      { tecla: 'ESC', descricao: 'pausar' },
      { tecla: 'CELULAR', descricao: 'vira a tela na horizontal' }
    ],
    // O menu é o retrato: mostra os 15 mapas e as 3 dificuldades. '2' e '3' são
    // a partida em andamento.
    screenshots: ['1', '2', '3'],
    progresso: { chave: 'defesa_orbital_v3', total: 15, ler: lerDefesa }
  }
];

// The third row on the home. It has no game, no route and no images — it exists
// only to say the store is not finished. Keep it visibly unavailable.
export const soonEntry = {
  id: 'em-breve',
  titulo: 'EM BREVE',
  descricao: 'A vitrine ainda vai crescer.'
};

export const JOGOS = CATALOGO.reduce((acc, j) => {
  acc[j.id] = j;
  return acc;
}, {});

export function getJogo(id) {
  return Object.prototype.hasOwnProperty.call(JOGOS, id) ? JOGOS[id] : null;
}
