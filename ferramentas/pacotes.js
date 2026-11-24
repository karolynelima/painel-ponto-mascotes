/*
 * Pacotes de mascote: qualquer pessoa pode criar um mascote só com imagens PNG e um mascote.json.
 *
 * Formato 1 (o mesmo do repositório aberto de mascotes):
 *   mascote.json   { "formato": 1, "nome": "Meu gato", "autor": "opcional", "licenca": "opcional", "descricao": "opcional" }
 *                  "descricao" é a linha embaixo do nome na lista de mascotes (sem ela, aparece "De <autor>").
 *   parado.png     obrigatório: a pose de sempre
 *   falando.png    boca aberta (alterna com parado.png enquanto o balão aparece)
 *   piscando.png   olhos fechados (pisca de vez em quando)
 *   feliz.png, preocupado.png, dormindo.png, bravo.png   humores (sem a imagem, usa parado.png)
 * Quadros que deixam a animação mais fluida (todos opcionais; sem eles, fica como antes):
 *   falando-meio.png  boca meio aberta: a fala vira fechada → meio → aberta → meio
 *   surpreso.png      olhos arregalados (avisos de ponto)
 *   frente.png        de frente: aparece no meio da virada quando o humor troca de lado
 *   agachada.png      encolhida, antes do pulinho e na aterrissagem depois de arrastar
 *   pendurada.png     no ar, pernas soltas: enquanto a pessoa arrasta
 *   espiando.png      atrás do painel aberto, só a cabeça para fora: tudo à direita da coluna 310 (de 453, 68% da
 *                     largura) fica vazio, é onde está o painel. O app não inclina essa pose.
 * Lados (opcional, no mascote.json): "esquerda": ["feliz", ...] lista as poses viradas para o outro lado;
 * com frente.png, a troca entre os lados passa por ela em vez de virar de uma vez.
 *   README.md, LICENSE, *.txt   aceitos e ignorados
 * Falas (opcional, no mascote.json): "falas": { "feliz": ["Oi, {n}!"], "pouso": [...], ... } com as chaves de
 * FALAS_CHAVES. Só texto ({n} vira o primeiro nome); a categoria que vier troca as falas padrão dela.
 * Qualquer outro arquivo (script, executável, outra imagem) recusa o pacote: pacote não tem código.
 *
 * Chega como pasta (a pessoa escolhe o mascote.json dentro dela) ou .zip. Os aceitos ficam copiados
 * em <pasta de dados>/mascotes/<id>/; os que vêm com o app ficam em src/mascotes/<id>/.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const FORMATO = 1;
const POSES = ['parado', 'falando', 'piscando', 'feliz', 'preocupado', 'dormindo', 'bravo', 'falando-meio', 'surpreso', 'frente', 'agachada', 'pendurada', 'espiando'];
const FALAS_CHAVES = ['feliz', 'preocupado', 'almoco', 'dormindo', 'espiando', 'pouso', 'tonto', 'bravo'];
const LIMITE_FALAS = { porCategoria: 20, tamanho: 140 };
const LIMITE = { imagem: 1024 * 1024, total: 5 * 1024 * 1024, json: 16 * 1024, lado: 1024, ladoMin: 16, nome: 30, autor: 60 };
const IGNORADOS = /^(readme(\.md|\.txt)?|licen[cs]e(\.md|\.txt)?|[^/]+\.txt|\.ds_store|thumbs\.db)$/i;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

class ErroPacote extends Error {}
const falha = msg => { throw new ErroPacote(msg); };

/** Largura e altura de um PNG (cabeçalho IHDR), ou null se não for PNG. */
function medidasPng(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG) || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { largura: buf.readUInt32BE(16), altura: buf.readUInt32BE(20) };
}

/** Lê um .zip (só o que o pacote precisa: arquivos guardados ou comprimidos com deflate). { nome: Buffer } */
function lerZip(buf) {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) falha('O arquivo não é um .zip válido.');
  const qtd = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  if (qtd > 64) falha('O .zip tem arquivos demais para um mascote.');
  const saida = {};
  let total = 0;
  for (let n = 0; n < qtd; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) falha('O .zip está corrompido.');
    const metodo = buf.readUInt16LE(p + 10);
    const tamComp = buf.readUInt32LE(p + 20);
    const tam = buf.readUInt32LE(p + 24);
    const lNome = buf.readUInt16LE(p + 28);
    const lExtra = buf.readUInt16LE(p + 30);
    const lComent = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + lNome);
    p += 46 + lNome + lExtra + lComent;
    if (nome.endsWith('/')) continue;   // pasta
    if (tam > LIMITE.total || (total += tam) > LIMITE.total) falha('O pacote passa de 5 MB.');
    if (local + 30 > buf.length || buf.readUInt32LE(local) !== 0x04034b50) falha('O .zip está corrompido.');
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const comp = buf.subarray(ini, ini + tamComp);
    let dados;
    if (metodo === 0) dados = Buffer.from(comp);
    else if (metodo === 8) {
      try { dados = zlib.inflateRawSync(comp, { maxOutputLength: LIMITE.total }); } catch { falha('O .zip está corrompido.'); }
    } else falha('O .zip usa uma compressão que o app não lê. Use o "Enviar para › Pasta compactada" do Windows.');
    if (dados.length !== tam) falha('O .zip está corrompido.');
    saida[nome] = dados;
  }
  return saida;
}

/** Tira a pasta de cima (o .zip de uma pasta) e recusa caminhos fora dela. */
function achatar(arquivos) {
  const nomes = Object.keys(arquivos).map(n => n.replace(/\\/g, '/'));
  const comPasta = nomes.length && nomes.every(n => n.includes('/')) && new Set(nomes.map(n => n.split('/')[0])).size === 1;
  const saida = {};
  Object.entries(arquivos).forEach(([n, d]) => {
    let nome = n.replace(/\\/g, '/');
    if (comPasta) nome = nome.slice(nome.indexOf('/') + 1);
    if (nome.includes('/') || nome.includes('..') || !nome) falha(`O pacote tem uma subpasta (${n}). Deixe tudo na mesma pasta do mascote.json.`);
    saida[nome.toLowerCase()] = d;
  });
  return saida;
}

/** Falas do mascote.json: só listas de texto nas chaves conhecidas (o resto é recusado, para o autor saber). */
function lerFalas(v) {
  if (v == null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) falha('"falas" precisa ser um objeto, ex.: { "feliz": ["Oi, {n}!"] }.');
  const saida = {};
  for (const [chave, lista] of Object.entries(v)) {
    if (!FALAS_CHAVES.includes(chave)) falha(`Fala de um momento que o app não conhece: "${chave}". Use ${FALAS_CHAVES.join(', ')}.`);
    if (!Array.isArray(lista) || lista.some(f => typeof f !== 'string')) falha(`"falas.${chave}" precisa ser uma lista de textos.`);
    if (lista.length > LIMITE_FALAS.porCategoria) falha(`"falas.${chave}" tem mais de ${LIMITE_FALAS.porCategoria} falas.`);
    const limpas = lista.map(f => texto(f, Infinity));
    const longa = limpas.find(f => f.length > LIMITE_FALAS.tamanho);
    if (longa) falha(`Fala longa demais (máximo ${LIMITE_FALAS.tamanho} letras): "${longa.slice(0, 40)}…"`);
    const boas = limpas.filter(Boolean);
    if (boas.length) saida[chave] = boas;
  }
  return Object.keys(saida).length ? saida : null;
}

/** "esquerda" do mascote.json: poses conhecidas, sem repetir (a ordem não importa). */
function lerEsquerda(v) {
  if (v == null) return null;
  if (!Array.isArray(v) || v.some(p => typeof p !== 'string')) falha('"esquerda" precisa ser uma lista de poses, ex.: ["feliz", "bravo"].');
  const desconhecida = v.find(p => !POSES.includes(p) || p === 'frente');
  if (desconhecida) falha(`"esquerda" tem uma pose que não existe: "${desconhecida}".`);
  return v.length ? [...new Set(v)] : null;
}

const texto = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');

/**
 * Confere um pacote ({ nomeDoArquivo: Buffer }) e devolve o mascote pronto:
 * { nome, autor, licenca, poses: [..], quadros: { pose: Buffer PNG } }. Erro: ErroPacote com o motivo.
 */
function validar(arquivosBrutos) {
  const arquivos = achatar(arquivosBrutos);
  const json = arquivos['mascote.json'];
  if (!json) falha('Falta o mascote.json.');
  if (json.length > LIMITE.json) falha('O mascote.json é grande demais.');
  let info;
  try { info = JSON.parse(json.toString('utf8').replace(/^﻿/, '')); } catch { falha('O mascote.json não é um JSON válido.'); }
  if (!info || typeof info !== 'object') falha('O mascote.json não é um JSON válido.');
  if (info.formato !== FORMATO) falha(`O mascote.json precisa de "formato": ${FORMATO}.`);
  const nome = texto(info.nome, LIMITE.nome);
  if (!nome) falha('O mascote.json precisa de um "nome".');

  const quadros = {};
  let total = 0;
  for (const [arq, dados] of Object.entries(arquivos)) {
    if (arq === 'mascote.json' || IGNORADOS.test(arq)) continue;
    const pose = arq.endsWith('.png') ? arq.slice(0, -4) : null;
    if (!pose || !POSES.includes(pose)) falha(`Arquivo não aceito: ${arq}. Só entram ${POSES.map(p => `${p}.png`).join(', ')}.`);
    if (dados.length > LIMITE.imagem) falha(`${arq} passa de 1 MB.`);
    const m = medidasPng(dados);
    if (!m) falha(`${arq} não é uma imagem PNG.`);
    if (m.largura > LIMITE.lado || m.altura > LIMITE.lado || m.largura < LIMITE.ladoMin || m.altura < LIMITE.ladoMin) {
      falha(`${arq} tem ${m.largura}×${m.altura}: use de ${LIMITE.ladoMin} a ${LIMITE.lado} px de cada lado.`);
    }
    total += dados.length;
    quadros[pose] = dados;
  }
  if (total > LIMITE.total) falha('O pacote passa de 5 MB.');
  if (!quadros.parado) falha('Falta a imagem parado.png (a única obrigatória).');
  return {
    nome,
    autor: texto(info.autor, LIMITE.autor) || null,
    licenca: texto(info.licenca, LIMITE.autor) || null,
    descricao: texto(info.descricao, LIMITE.autor) || null,
    poses: POSES.filter(p => quadros[p]),
    quadros,
    falas: lerFalas(info.falas),
    esquerda: lerEsquerda(info.esquerda),
  };
}

/** Lê o que a pessoa escolheu: um .zip ou o mascote.json de uma pasta. { nomeDoArquivo: Buffer } */
function lerEscolhido(caminho) {
  const st = fs.statSync(caminho);
  if (st.isFile() && /\.zip$/i.test(caminho)) {
    if (st.size > LIMITE.total * 2) falha('O .zip passa de 10 MB.');
    return lerZip(fs.readFileSync(caminho));
  }
  const pasta = st.isDirectory() ? caminho : path.dirname(caminho);
  if (!st.isDirectory() && path.basename(caminho).toLowerCase() !== 'mascote.json') falha('Escolha um .zip ou o mascote.json de dentro da pasta do mascote.');
  return lerPasta(pasta);
}

function lerPasta(pasta) {
  const saida = {};
  let total = 0;
  for (const ent of fs.readdirSync(pasta, { withFileTypes: true })) {
    if (ent.isDirectory()) falha(`O pacote tem uma subpasta (${ent.name}). Deixe tudo na mesma pasta do mascote.json.`);
    if (!ent.isFile()) continue;
    const arq = path.join(pasta, ent.name);
    if ((total += fs.statSync(arq).size) > LIMITE.total) falha('O pacote passa de 5 MB.');
    saida[ent.name] = fs.readFileSync(arq);
  }
  return saida;
}

const dataUrl = buf => `data:image/png;base64,${buf.toString('base64')}`;

/** Identificador do pacote: o nome sem acento + um pedacinho do conteúdo (dois "Gato" diferentes não se misturam). */
function idDe(m) {
  const base = m.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'mascote';
  const h = crypto.createHash('sha256');
  m.poses.forEach(p => h.update(p).update(m.quadros[p]));
  return `${base}-${h.digest('hex').slice(0, 6)}`;
}

const ID_VALIDO = /^[a-z0-9-]{1,40}$/;

/** Todos os pacotes de uma pasta (cada um numa subpasta). Os que não passam na checagem ficam de fora. */
function listar(raiz, origem) {
  let pastas = [];
  try { pastas = fs.readdirSync(raiz, { withFileTypes: true }).filter(d => d.isDirectory() && ID_VALIDO.test(d.name)); } catch { return []; }
  return pastas.flatMap(d => {
    try {
      const m = validar(lerPasta(path.join(raiz, d.name)));
      return [{ id: d.name, origem, nome: m.nome, autor: m.autor, descricao: m.descricao, poses: m.poses, falas: m.falas, esquerda: m.esquerda, quadros: Object.fromEntries(m.poses.map(p => [p, dataUrl(m.quadros[p])])) }];
    } catch (err) {
      console.error(`[mascotes] ${d.name} ignorado:`, err.message);
      return [];
    }
  });
}

/** Grava um pacote já validado em <raiz>/<id>/ (só o mascote.json e as imagens aceitas). */
function instalar(raiz, m) {
  const id = idDe(m);
  const destino = path.join(raiz, id);
  const temp = `${destino}.novo`;
  fs.rmSync(temp, { recursive: true, force: true });
  fs.mkdirSync(temp, { recursive: true });
  fs.writeFileSync(path.join(temp, 'mascote.json'), JSON.stringify({ formato: FORMATO, nome: m.nome, autor: m.autor || undefined, licenca: m.licenca || undefined, descricao: m.descricao || undefined, falas: m.falas || undefined, esquerda: m.esquerda || undefined }, null, 2));
  m.poses.forEach(p => fs.writeFileSync(path.join(temp, `${p}.png`), m.quadros[p]));
  fs.rmSync(destino, { recursive: true, force: true });
  fs.renameSync(temp, destino);
  return id;
}

function remover(raiz, id) {
  if (!ID_VALIDO.test(id)) return false;
  fs.rmSync(path.join(raiz, id), { recursive: true, force: true });
  return true;
}

module.exports = { FORMATO, POSES, FALAS_CHAVES, LIMITE_FALAS, LIMITE, ErroPacote, validar, lerZip, lerEscolhido, lerPasta, listar, instalar, remover, idDe, medidasPng, dataUrl, ID_VALIDO };
