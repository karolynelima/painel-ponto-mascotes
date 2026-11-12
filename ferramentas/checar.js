/*
 * Checagem dos mascotes (roda em toda PR e pode rodar no seu computador):
 *   node ferramentas/checar.js            confere todos os mascotes da pasta mascotes/
 *   node ferramentas/checar.js <pasta>    confere só uma pasta (o seu mascote antes de enviar)
 * Usa o mesmo validador do app (pacotes.js): o que passa aqui, o app aceita.
 * Regras a mais do repositório: a pasta tem nome em minúsculas com hífen e o mascote.json diz a licença.
 */
const fs = require('fs');
const path = require('path');
const pacotes = require('./pacotes');

const raiz = path.join(__dirname, '..', 'mascotes');
const alvos = process.argv[2]
  ? [path.resolve(process.argv[2])]
  : fs.readdirSync(raiz, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join(raiz, d.name));

let falhas = 0;
for (const pasta of alvos) {
  const nome = path.basename(pasta);
  try {
    if (!/^[a-z0-9-]{1,40}$/.test(nome)) throw new Error('o nome da pasta deve ter só letras minúsculas, números e hífen (ex.: gato-laranja).');
    const m = pacotes.validar(pacotes.lerPasta(pasta));
    if (!m.licenca) throw new Error('o mascote.json precisa dizer a "licenca" (ex.: "MIT" ou "CC-BY-4.0").');
    if (!m.autor) throw new Error('o mascote.json precisa dizer o "autor".');
    console.log(`ok      ${nome}: ${m.nome} (${m.poses.join(', ')}) · ${m.autor} · ${m.licenca}`);
  } catch (err) {
    falhas += 1;
    console.log(`FALHOU  ${nome}: ${err.message}`);
  }
}
if (!alvos.length) console.log('Nenhum mascote encontrado.');
process.exit(falhas ? 1 : 0);
