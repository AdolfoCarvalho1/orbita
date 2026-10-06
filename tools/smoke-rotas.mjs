// Verifica que as rotas da loja respondem, que o texto real de cada jogo aparece
// e que nada estoura erro de console. Sem framework de teste no projeto: é um
// script com código de saída.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5173';

const CASOS = [
  {
    rota: '/#/',
    precisa: ['ÓRBITA', 'NAVINHA', 'DEFESA DA TERRA', 'EM BREVE', '40', 'FASES + MAPAS', 'CHAVE EM BREVE'],
    // Enquanto a chave PIX for placeholder, a loja nao pode oferecer nenhuma
    // acao de pagamento.
    proibido: ['COPIAR CHAVE', 'PIX QR', 'PAGAR', 'ADQUIRIR', 'CARRINHO']
  },
  { rota: '/#/navinha', precisa: ['NAVINHA', 'JOGAR AGORA', '25 FASES', 'SETAS', 'GALERIA'] },
  { rota: '/#/defesa', precisa: ['DEFESA DA TERRA', '15 mapas', 'TOWER DEFENSE'] },
  { rota: '/#/em-breve', precisa: ['EM BREVE'] },
  // O canvas do Navinha e' a prova de que o jogo subiu de verdade, e nao so
  // que a rota abriu.
  // Na tela de titulo o canvas fica vazio de proposito: o engine so desenha
  // quando uma fase comeca, e o titulo e' um overlay React por cima dele.
  { rota: '/#/jogar/navinha', precisa: ['NAVINHA', 'CAMPANHA ORBITAL', 'INICIAR CAMPANHA'], espera: 2500 },
  // Entrando numa fase, o canvas tem de ter pixels de verdade.
  { rota: '/#/jogar/navinha', precisa: ['SUPER'], espera: 1200, jogar: true, canvas: '#game' },
  { rota: '/#/jogar/defesa', precisa: [], espera: 6000, iframe: true },
  { rota: '/#/rota-que-nao-existe', precisa: ['ÓRBITA'] },
  // O Defesa da Terra e servido de public/defesa/ e abre standalone. Se o
  // iframe esta no lugar certo, o script do jogo inicializa.
  { rota: '/defesa/index.html', precisa: ['DEFESA'], fora: true, espera: 3000 }
];

let falhas = 0;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text());
});

for (const caso of CASOS) {
  erros.length = 0;
  await page.goto(BASE + caso.rota, { waitUntil: 'load' });
  await page.waitForTimeout(caso.espera || 900);

  const problemas = [];

  // Entra no jogo de verdade: titulo -> naves -> fases -> fase 1. So e nesse
  // ponto que o canvas passa a ter pixels.
  if (caso.jogar) {
    await page.locator('button.title-start').click();
    await page.waitForSelector('.ship-cell', { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForSelector('button.stagebtn', { timeout: 15000 });
    await page.locator('button.stagebtn:not(.is-locked)').first().click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
  }

  // A rota standalone da Defesa nao passa pelo React: o texto esta nos nos
  // proprios do HTML dela.
  const corpo = caso.fora
    ? await page.evaluate(() => (document.body.innerText || document.title).toUpperCase())
    : await page.evaluate(() => document.body.innerText);

  const faltando = caso.precisa.filter((t) => !corpo.toUpperCase().includes(t.toUpperCase()));
  if (faltando.length) problemas.push('faltou: ' + faltando.join(', '));

  const vazou = (caso.proibido || []).filter((t) => corpo.toUpperCase().includes(t.toUpperCase()));
  if (vazou.length) problemas.push('apareceu o que nao devia: ' + vazou.join(', '));

  // O iframe da Defesa precisa ter realmente booted: um iframe em branco
  // com status 200 nao prova que o jogo subiu.
  // O canvas precisa existir E ter pixels, senão a tela abriu mas nada renderizou.
  if (caso.canvas) {
    const estado = await page.evaluate((sel) => {
      const c = document.querySelector(sel);
      if (!c) return 'sem ' + sel;
      const w = c.width, h = c.height;
      if (!w || !h) return 'canvas sem dimensao';
      const ctx = c.getContext('2d');
      if (!ctx) return 'sem contexto 2d';
      const dados = ctx.getImageData(0, 0, w, h).data;
      let pintados = 0;
      for (let i = 0; i < dados.length; i += 4 * 97) {
        if (dados[i] || dados[i + 1] || dados[i + 2]) pintados++;
      }
      return pintados > 20 ? 'ok' : 'canvas em branco (' + pintados + ' amostras)';
    }, caso.canvas);
    if (estado !== 'ok') problemas.push('canvas: ' + estado);
  }

  if (caso.iframe) {
    const pronto = await page.evaluate(() => {
      const f = document.querySelector('iframe.ib');
      if (!f) return 'sem iframe.ib';
      try {
        const d = f.contentDocument;
        if (!d) return 'sem contentDocument';
        const c = d.querySelector('#game-canvas canvas');
        return c && c.width > 100 ? 'ok' : 'canvas do jogo nao subiu';
      } catch (e) {
        return 'acesso bloqueado: ' + e.message;
      }
    });
    if (pronto !== 'ok') problemas.push('iframe: ' + pronto);
  }

  // A loja nao pode deixar a pagina sem rolagem: style.css trava o body.
  if (!caso.fora && !caso.iframe) {
    const rola = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { overflow: s.overflowY, display: s.display, altura: document.documentElement.scrollHeight };
    });
    if (rola.display === 'flex') problemas.push('body ainda flex (estilo do jogo)');
    if (rola.altura <= 400) problemas.push('pagina sem conteudo: ' + rola.altura + 'px');
  }

  if (erros.length) problemas.push('erro de console: ' + erros.join(' | '));

  if (problemas.length) {
    falhas++;
    console.log('FALHA ' + caso.rota + ' — ' + problemas.join('; '));
  } else {
    console.log('ok    ' + caso.rota);
  }
}

await browser.close();
console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' FALHA(S)');
process.exit(falhas === 0 ? 0 : 1);
