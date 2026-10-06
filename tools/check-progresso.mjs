import { lerNavinha, lerDefesa } from '../src/store/progresso.js';

// Node has no localStorage; give the readers a Map-backed one.
const memoria = new Map();
globalThis.localStorage = {
  getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
  setItem: (k, v) => memoria.set(k, String(v)),
  removeItem: (k) => memoria.delete(k)
};

let falhas = 0;
function ok(nome, cond) {
  if (cond) { console.log('ok   ' + nome); }
  else { console.log('FALHA ' + nome); falhas++; }
}

// Sem save nenhum, os dois devolvem zero e não explodem.
ok('navinha sem save', JSON.stringify(lerNavinha()) === '{"feito":0,"total":25}');
ok('defesa sem save', JSON.stringify(lerDefesa()) === '{"feito":0,"total":15}');

// Um save do Navinha: unlocked = 11 significa 11 fases liberadas de 25.
localStorage.setItem('navinha_orbital_v1', JSON.stringify({ unlocked: 11, high: 900 }));
ok('navinha com unlocked 11', JSON.stringify(lerNavinha()) === '{"feito":11,"total":25}');

// Um save da Defesa: unlockedMap = 4 significa 4 mapas liberados de 15.
localStorage.setItem('defesa_orbital_v3', JSON.stringify({ unlockedMap: 4, crystals: 12 }));
ok('defesa com unlockedMap 4', JSON.stringify(lerDefesa()) === '{"feito":4,"total":15}');

// Lixo não pode virar progresso.
localStorage.setItem('navinha_orbital_v1', '{{{nao e json');
ok('navinha com lixo', JSON.stringify(lerNavinha()) === '{"feito":0,"total":25}');
localStorage.setItem('defesa_orbital_v3', '{"unlockedMap":"dez"}');
ok('defesa com tipo errado', JSON.stringify(lerDefesa()) === '{"feito":0,"total":15}');

// O save não pode ser reescrito pela leitura. Cada um dos dois é conferido
// contra o valor exato que foi gravado acima, porque o teste suja os dois com
// lixo na bloco anterior.
localStorage.setItem('navinha_orbital_v1', '{"unlocked":11,"high":900}');
localStorage.setItem('defesa_orbital_v3', '{"unlockedMap":4,"crystals":12}');
const antesNav = localStorage.getItem('navinha_orbital_v1');
const antesDef = localStorage.getItem('defesa_orbital_v3');
lerNavinha(); lerNavinha(); lerDefesa(); lerDefesa();
ok('save do navinha intacto apos leitura', localStorage.getItem('navinha_orbital_v1') === antesNav);
ok('save da defesa intacto apos leitura', localStorage.getItem('defesa_orbital_v3') === antesDef);

// E a leitura não pode inventar campos nem normalizar o que já existe.
ok('navinha preserva o save inteiro', localStorage.getItem('navinha_orbital_v1') === '{"unlocked":11,"high":900}');
ok('defesa preserva o save inteiro', localStorage.getItem('defesa_orbital_v3') === '{"unlockedMap":4,"crystals":12}');

console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' FALHA(S)');
process.exit(falhas === 0 ? 0 : 1);
