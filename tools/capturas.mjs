// Captura as telas reais dos dois jogos para a vitrine. Não há imagem de
// marketing em nenhum dos dois repositórios — todo pixel dos jogos é gerado por
// código em tempo de execução — então a única evidência honesta é fotografar o
// jogo rodando.
import { chromium } from 'playwright';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:5173';
const SAIDA = join(process.cwd(), 'public', 'store');
const TIMEOUT = 45000;
// Cada jogo é capturado na proporção em que ele realmente joga. O Navinha tem
// um canvas portrait de 450x800, então fotografá-lo deitado vira uma tira
// estreita dentro de um quadro largo. A Defesa da Terra tem um tabuleiro
// landscape de 924x572. A vitrine apresenta cada imagem na proporção dela.
const VIEW = { width: 1600, height: 900 };
// O Navinha tem um canvas portrait de 450x800, então a viewport portrait e' a
// proporcao em que ele joga. A vitrine apresenta a imagem na proporcao dela, com
// o espaco vazio que o proprio jogo deixa.
const VIEW_PORTRAIT = { width: 640, height: 1040 };

const erros = [];

function registrar(alvo, texto) {
  erros.push(alvo + ': ' + texto);
}

// A vitrine tem um botão VOLTAR fixo no canto da rota /jogar/:id. Ele não pode
// vazar para a imagem de marketing, então é escondido antes de fotografar.
const OCULTAR = '.play-back';

async function salvar(page, id, nome) {
  const dir = join(SAIDA, id);
  mkdirSync(dir, { recursive: true });
  const arquivo = join(dir, nome + '.png');

  await page.addStyleTag({
    content: OCULTAR + ' { visibility: hidden !important; }'
  });
  await page.screenshot({ path: arquivo });

  const bytes = statSync(arquivo).size;
  console.log('  ' + id + '/' + nome + '.png  ' + bytes + ' bytes');
  if (bytes < 1000) registrar(id + '/' + nome, 'arquivo pequeno demais: ' + bytes);
}

// O canvas do Navinha é portrait e o overlay do menu fica no topo do quadro. A
// vitrine quer a tela útil, não 400px de espaço vazio embaixo: recortamos pela
// área que o jogo realmente ocupa.
async function navinha(page) {
  await page.goto(BASE + '/#/jogar/navinha', { waitUntil: 'load' });
  await page.waitForSelector('#game', { timeout: TIMEOUT });
  await page.waitForTimeout(2500);
  await salvar(page, 'navinha', '1');

  // .title-start abre a seleção de naves, que é a tela que mostra o catálogo
  // real das dez naves.
  const start = page.locator('button.title-start');
  await start.waitFor({ state: 'visible', timeout: TIMEOUT });
  await start.click();
  await page.waitForSelector('.ship-cell', { timeout: TIMEOUT });
  await page.waitForTimeout(900);
  await salvar(page, 'navinha', '2');

  // Enter confirma a nave e leva à grade de fases. O primeiro botão habilitado
  // é a fase 1, sempre liberada.
  await page.keyboard.press('Enter');
  await page.waitForSelector('.stagebtn', { timeout: TIMEOUT });
  await page.waitForTimeout(700);
  await salvar(page, 'navinha', '3');

  // E uma fase em movimento: a melhor prova de que o jogo realmente roda.
  const fase1 = page.locator('button.stagebtn:not(.is-locked)').first();
  await fase1.click();
  await page.waitForTimeout(1200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3200);
  await salvar(page, 'navinha', 'fase');
}

async function defesa(page) {
  await page.goto(BASE + '/defesa/index.html', { waitUntil: 'load' });
  await page.waitForSelector('#btn-start', { timeout: TIMEOUT });
  await page.waitForTimeout(2000);
  await salvar(page, 'defesa', '1');

  // Clicar em INICIAR joga direto na tela do tabuleiro: o seletor de mapa fica
  // no menu, que some. Por isso a segunda captura é o próprio jogo rodando.
  await page.locator('#btn-start').click();
  await page.waitForFunction(
    () => {
      const c = document.querySelector('#game-canvas canvas');
      return !!c && c.width > 100;
    },
    { timeout: TIMEOUT }
  );
  await page.waitForTimeout(5000);
  await salvar(page, 'defesa', '2');

  // Uma partida de verdade: a torre e a primeira onda precisam existir. Isso
  // prova que o jogo simulou, e não que a tela ficou pintada.
  const jogou = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return 'sem __game';
    const s = g.scene.getScene('Game');
    if (!s) return 'sem cena Game';
    return s && s.time && s.time.now > 2000 ? 'ok' : 'sem tempo de cena';
  });
  if (jogou !== 'ok') registrar('defesa/3', 'cena não avançou: ' + jogou);
  await page.waitForTimeout(4000);
  await salvar(page, 'defesa', '3');
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEW });
const page = await context.newPage();
page.on('pageerror', (e) => registrar('pageerror', e.message));
page.on('console', (m) => {
  // A Defesa da Terra e uma copia byte-a-byte de outro repositorio e pede as
  // fontes no Google Fonts. Sem rede, essa requisicao falha e o console acusa
  // ERR_NAME_NOT_RESOLVED. Nao e um defeito da loja e nao podemos corrigir o
  // arquivo, entao falha de DNS externa nao reprova a captura. Qualquer outro
  // erro de console reprova.
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_CONNECTION/.test(t)) {
    console.log('  (aviso) recurso externo indisponivel: ' + t.slice(0, 60));
    return;
  }
  registrar('console', t);
});

console.log('capturando navinha…');
// O Navinha joga em portrait: a viewport acompanha o formato dele.
await page.setViewportSize(VIEW_PORTRAIT);
await navinha(page);

console.log('capturando defesa…');
// A Defesa da Terra tem tabuleiro landscape.
await page.setViewportSize(VIEW);
await defesa(page);

await browser.close();

if (erros.length) {
  console.error('\nPROBLEMAS:');
  for (const e of erros) console.error('  ' + e);
  process.exit(1);
}
console.log('\ncapturas escritas em public/store/');
