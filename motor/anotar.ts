// Anotação das capturas: desenha retângulo, seta e número do passo sobre cada print e grava `anotadas/`.
// Uso: node motor/anotar.ts <caso> <roteiro>
// Lê saida/<caso>/<roteiro>/capturas/caixas.json (contrato em docs/CONTRATOS.md). A marca e o roteiro vêm do caso
// citado dentro do caixas.json, o que permite anotar capturas de teste guardadas em outra pasta de saída.
// O desenho é HTML + SVG renderizado pelo Chromium do Playwright, na resolução da captura.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { RAIZ, argumentos, lerCaso, lerRoteiro, type Alvo, type Roteiro } from "./comum.ts";

interface Caixa { x: number; y: number; largura: number; altura: number }

interface Captura {
  numero: number;
  passo: string;
  arquivo: string;
  texto: string;
  acao: string;
  enquadrar?: "detalhe" | "tela";
  caixa: Caixa | null;
  /** Opcional: nome da tela (ex.: o título da página), usado no texto alternativo. */
  tela?: string;
}

interface Caixas {
  caso: string;
  roteiro: string;
  titulo: string;
  viewport: { largura: number; altura: number };
  escala: number;
  capturas: Captura[];
}

export interface Anotada {
  numero: number;
  passo: string;
  arquivo: string;
  alt: string;
  /** Tamanho do PNG em pixels. */
  largura: number;
  altura: number;
  escala: number;
  enquadrar: "detalhe" | "tela";
}

interface Ret { x: number; y: number; w: number; h: number }
interface Ponto { x: number; y: number }

// Medidas em pixels CSS da janela (o PNG sai multiplicado pela escala da captura).
const FOLGA = 6; // em volta do alvo
const RAIO = 10;
const TRACO = 4;
const HALO = 3; // contorno branco de cada lado do traço
const SETA = 90;
const CIRCULO = 20; // raio do círculo do número
const DETALHE = { w: 1000, h: 600 };
const MARGEM_DETALHE = 24; // espaço mínimo entre o alvo e a borda do recorte quando o alvo é maior que o recorte

const limitar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Retângulo do destaque: a caixa do alvo com folga, presa à janela. */
function retanguloDoAlvo(c: Caixa, vw: number, vh: number): Ret {
  const borda = TRACO / 2 + HALO;
  const x1 = limitar(c.x - FOLGA, borda, vw - borda);
  const y1 = limitar(c.y - FOLGA, borda, vh - borda);
  const x2 = limitar(c.x + c.largura + FOLGA, borda, vw - borda);
  const y2 = limitar(c.y + c.altura + FOLGA, borda, vh - borda);
  return { x: x1, y: y1, w: Math.max(4, x2 - x1), h: Math.max(4, y2 - y1) };
}

/** Recorte: janela inteira (`tela`) ou ~1000×600 em volta do alvo (`detalhe`), preso à janela. */
function recorte(r: Ret | null, modo: "detalhe" | "tela", vw: number, vh: number): Ret {
  if (!r || modo === "tela") return { x: 0, y: 0, w: vw, h: vh };
  const w = Math.min(vw, Math.max(DETALHE.w, r.w + 2 * MARGEM_DETALHE));
  const h = Math.min(vh, Math.max(DETALHE.h, r.h + 2 * MARGEM_DETALHE));
  const x = limitar(Math.round(r.x + r.w / 2 - w / 2), 0, vw - w);
  const y = limitar(Math.round(r.y + r.h / 2 - h / 2), 0, vh - h);
  return { x, y, w, h };
}

interface Candidato { dir: Ponto; ponta: Ponto; centro: Ponto; comprimento: number; diagonal: boolean; amostras: Ponto[] }

/**
 * Oito direções possíveis para a seta (quatro lados e quatro cantos). Nos lados, a seta aponta para o meio da aresta;
 * nos cantos, para o canto. Só entram as que cabem no recorte com a seta e o círculo inteiros.
 */
function candidatos(r: Ret, q: Ret, k: number): Candidato[] {
  const gap = (TRACO / 2 + HALO + 3) * k;
  const raio = CIRCULO * k;
  const lista: Candidato[] = [];
  for (const comprimento of [SETA, 70, 50]) {
    const len = comprimento * k;
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const dx = Math.round(Math.cos(ang) * 1000) / 1000;
      const dy = Math.round(Math.sin(ang) * 1000) / 1000;
      const diagonal = i % 2 === 1;
      const dir = { x: dx, y: dy };
      const alvoX = dx > 0.1 ? r.x + r.w : dx < -0.1 ? r.x : r.x + r.w / 2;
      const alvoY = dy > 0.1 ? r.y + r.h : dy < -0.1 ? r.y : r.y + r.h / 2;
      // Nos cantos o traço arredondado fica para dentro do canto do retângulo: recua um pouco a ponta.
      const recuo = diagonal ? RAIO * k * 0.29 : 0;
      const ponta = { x: alvoX + dx * (gap - recuo), y: alvoY + dy * (gap - recuo) };
      const centro = { x: ponta.x + dx * (len + raio), y: ponta.y + dy * (len + raio) };
      const folga = raio + 6 * k;
      if (centro.x - folga < q.x || centro.x + folga > q.x + q.w || centro.y - folga < q.y || centro.y + folga > q.y + q.h) continue;
      // Pontos de amostra no que a seta e o círculo de fato cobrem: ponta larga, corpo estreito e o disco do número.
      const amostras: Ponto[] = [];
      const nx = -dy, ny = dx;
      for (let t = 4 * k; t <= len; t += 3) {
        const meia = t < 26 * k ? 15 * k : 8 * k;
        for (let s = -meia; s <= meia; s += 3) amostras.push({ x: ponta.x + dx * t + nx * s, y: ponta.y + dy * t + ny * s });
      }
      for (let oy = -raio; oy <= raio; oy += 3) {
        for (let ox = -raio; ox <= raio; ox += 3) {
          if (ox * ox + oy * oy <= raio * raio) amostras.push({ x: centro.x + ox, y: centro.y + oy });
        }
      }
      lista.push({ dir, ponta, centro, comprimento: len, diagonal, amostras });
    }
    if (lista.length > 0) break;
  }
  return lista;
}

/**
 * Ocupação de cada candidato, medida na própria imagem: ponto perto de texto ou de borda (variação forte de luz na
 * * vizinhança) pesa 1; área lisa colorida ou escura pesa 0,2; fundo claro e neutro pesa 0. Menor é melhor.
 */
async function ocupacao(pagina: Page, cands: Candidato[], escala: number): Promise<number[]> {
  return pagina.evaluate(
    ({ listas, escala }) => {
      const img = document.getElementById("fundo") as HTMLImageElement;
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const dados = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const luz = (x: number, y: number) => {
        const i = (y * cv.width + x) * 4;
        return 0.2126 * dados[i] + 0.7152 * dados[i + 1] + 0.0722 * dados[i + 2];
      };
      const viz = Math.round(5 * escala);
      return listas.map((pts) => {
        let soma = 0;
        for (const p of pts) {
          const x = Math.round(p.x * escala), y = Math.round(p.y * escala);
          if (x < viz || y < viz || x >= cv.width - viz || y >= cv.height - viz) { soma += 1; continue; }
          let min = 255, max = 0;
          for (const dy of [-viz, 0, viz]) for (const dx of [-viz, 0, viz]) {
            const l = luz(x + dx, y + dy);
            if (l < min) min = l;
            if (l > max) max = l;
          }
          const i = (y * cv.width + x) * 4;
          const sat = Math.max(dados[i], dados[i + 1], dados[i + 2]) - Math.min(dados[i], dados[i + 1], dados[i + 2]);
          if (max - min > 40) soma += 1;
          else if (luz(x, y) < 228 || sat > 20) soma += 0.2;
        }
        return pts.length ? soma / pts.length : 1;
      });
    },
    { listas: cands.map((c) => c.amostras), escala },
  );
}

function svgSeta(c: Candidato, cor: string, k: number): string {
  const corpo = 6 * k, cabeca = 15 * k, cabecaComp = 26 * k;
  const u = { x: -c.dir.x, y: -c.dir.y }; // da cauda para a ponta
  const n = { x: -u.y, y: u.x };
  const cauda = c.centro;
  const p = c.ponta;
  const base = { x: p.x - u.x * cabecaComp, y: p.y - u.y * cabecaComp };
  const pts = [
    { x: cauda.x + n.x * corpo, y: cauda.y + n.y * corpo },
    { x: base.x + n.x * corpo, y: base.y + n.y * corpo },
    { x: base.x + n.x * cabeca, y: base.y + n.y * cabeca },
    p,
    { x: base.x - n.x * cabeca, y: base.y - n.y * cabeca },
    { x: base.x - n.x * corpo, y: base.y - n.y * corpo },
    { x: cauda.x - n.x * corpo, y: cauda.y - n.y * corpo },
  ];
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ") + " Z";
  return `<path d="${d}" fill="${cor}" stroke="#fff" stroke-width="${(HALO * k).toFixed(1)}" stroke-linejoin="round" paint-order="stroke"/>`;
}

function svgNumero(centro: Ponto, numero: number, cor: string, k: number): string {
  const r = CIRCULO * k;
  const fonte = (numero >= 10 ? 18 : 21) * k;
  return `<circle cx="${centro.x.toFixed(1)}" cy="${centro.y.toFixed(1)}" r="${r}" fill="${cor}" stroke="#fff" stroke-width="${(3 * k).toFixed(1)}"/>` +
    `<text x="${centro.x.toFixed(1)}" y="${centro.y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="#fff" ` +
    `font-family="'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="${fonte}">${numero}</text>`;
}

function svgRetangulo(r: Ret, cor: string, k: number): string {
  const a = `x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${RAIO * k}" ry="${RAIO * k}" fill="none"`;
  return `<rect ${a} stroke="#fff" stroke-width="${(TRACO + 2 * HALO) * k}"/><rect ${a} stroke="${cor}" stroke-width="${TRACO * k}"/>`;
}

// ---------- texto alternativo ----------

const PAPEIS: Record<string, [string, string]> = {
  // papel: [artigo + substantivo, forma com "de"]
  button: ["no botão", "do botão"],
  link: ["no link", "do link"],
  textbox: ["no campo", "do campo"],
  searchbox: ["no campo de busca", "do campo de busca"],
  combobox: ["na lista", "da lista"],
  checkbox: ["na caixa de seleção", "da caixa de seleção"],
  radio: ["na opção", "da opção"],
  tab: ["na aba", "da aba"],
  status: ["na mensagem", "da mensagem"],
  alert: ["no alerta", "do alerta"],
  article: ["no cartão", "do cartão"],
  dialog: ["na janela", "da janela"],
  alertdialog: ["na janela", "da janela"],
  region: ["na área", "da área"],
  navigation: ["no menu", "do menu"],
  heading: ["no título", "do título"],
  row: ["na linha", "da linha"],
  table: ["na tabela", "da tabela"],
  list: ["na lista", "da lista"],
  listitem: ["no item", "do item"],
  img: ["na imagem", "da imagem"],
};

function nomeDoAlvo(a: Alvo): string | undefined {
  return a.nome ?? a.nome_comeca?.replace(/[\s·:,-]+$/u, "") ?? a.tem_titulo ?? a.rotulo ?? a.texto;
}

function descreverAlvo(a: Alvo, forma: 0 | 1): string {
  const nome = nomeDoAlvo(a);
  if (a.papel === "navigation") return forma === 0 ? "no menu do alto" : "do menu do alto";
  if (a.papel === "dialog" || a.papel === "alertdialog") {
    return (forma === 0 ? "na janela" : "da janela") + (nome ? ` ${nome}` : " de confirmação");
  }
  if (a.papel === "status" && !nome) return forma === 0 ? "na mensagem de andamento" : "da mensagem de andamento";
  let base: string;
  if (a.papel && PAPEIS[a.papel]) base = PAPEIS[a.papel][forma] + (nome ? ` ${nome}` : "");
  else if (a.rotulo) base = (forma === 0 ? "no campo " : "do campo ") + a.rotulo;
  else base = (forma === 0 ? "em " : "de ") + (nome ?? "um elemento da tela");
  return base;
}

function descreverComContexto(a: Alvo): string {
  let t = descreverAlvo(a, 0);
  if (a.dentro) t += " " + descreverAlvo(a.dentro, 1);
  return t;
}

export function semMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function textoAlternativo(c: Captura, roteiro: Roteiro | null): string {
  const passo = roteiro?.passos.find((p) => p.id === c.passo);
  const extra = passo as (typeof passo & { tela?: string; alt?: string }) | undefined;
  if (extra?.alt) return extra.alt;
  const tela = c.tela ?? extra?.tela;
  const inicio = tela ? `Tela ${tela}` : "Tela do sistema";
  if (!c.caixa) return `${inicio}.`;
  let destaque: string | undefined;
  if (passo?.alvo) destaque = descreverComContexto(passo.alvo);
  if (!destaque) {
    const negrito = /\*\*(.+?)\*\*/.exec(c.texto)?.[1];
    destaque = negrito ? `em ${negrito}` : `no ponto descrito: ${semMarkdown(c.texto)}`;
  }
  return `${inicio}, com destaque ${destaque}.`;
}

// ---------- principal ----------

function tamanhoPng(arquivo: string): { w: number; h: number } {
  const b = readFileSync(arquivo);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`Não é PNG: ${arquivo}`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

export async function anotar(caso: string, roteiroId: string): Promise<Anotada[]> {
  const pasta = path.join(RAIZ, "saida", caso, roteiroId);
  const arqCaixas = path.join(pasta, "capturas", "caixas.json");
  if (!existsSync(arqCaixas)) throw new Error(`Falta ${path.relative(RAIZ, arqCaixas)}: rode a captura antes.`);
  const caixas = JSON.parse(readFileSync(arqCaixas, "utf8")) as Caixas;
  const dados = lerCaso(caixas.caso ?? caso);
  const cor = dados.marca.cor_destaque;
  let roteiro: Roteiro | null = null;
  try { roteiro = lerRoteiro(caixas.caso ?? caso, caixas.roteiro ?? roteiroId); } catch { roteiro = null; }

  const saida = path.join(pasta, "anotadas");
  mkdirSync(saida, { recursive: true });
  const vw = caixas.viewport.largura, vh = caixas.viewport.altura;

  const navegador = await chromium.launch();
  const resultado: Anotada[] = [];
  try {
    for (const c of caixas.capturas) {
      const origem = path.join(pasta, "capturas", c.arquivo);
      if (!existsSync(origem)) throw new Error(`Falta a captura ${path.relative(RAIZ, origem)}`);
      const png = tamanhoPng(origem);
      // A escala real sai do PNG; o caixas.json só confirma.
      const escala = png.w / vw;
      if (Math.abs(escala - caixas.escala) > 0.01) console.warn(`[anotar] ${c.arquivo}: PNG em escala ${escala}, caixas.json diz ${caixas.escala}`);
      const alturaJanela = png.h / escala;

      const modo = c.enquadrar ?? "detalhe";
      const ret = c.caixa ? retanguloDoAlvo(c.caixa, vw, alturaJanela) : null;
      const q = recorte(ret, modo, vw, alturaJanela);
      // Na janela inteira as marcas crescem na proporção, para continuarem visíveis quando a imagem encolhe no PDF.
      const k = Math.max(1, q.w / DETALHE.w);

      const contexto = await navegador.newContext({ viewport: { width: q.w, height: q.h }, deviceScaleFactor: escala });
      const pagina = await contexto.newPage();
      const dataUri = `data:image/png;base64,${readFileSync(origem).toString("base64")}`;
      await pagina.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}` +
          `#quadro{position:relative;width:${q.w}px;height:${q.h}px;overflow:hidden}` +
          `#fundo{position:absolute;left:${-q.x}px;top:${-q.y}px;width:${vw}px;height:${alturaJanela}px}` +
          `svg{position:absolute;left:0;top:0;overflow:visible}</style></head><body>` +
          `<div id="quadro"><img id="fundo" src="${dataUri}"><svg id="marcas" width="${q.w}" height="${q.h}"></svg></div></body></html>`,
      );
      await pagina.waitForFunction(() => (document.getElementById("fundo") as HTMLImageElement).complete);

      let svg = "";
      if (ret) {
        const local: Ret = { x: ret.x - q.x, y: ret.y - q.y, w: ret.w, h: ret.h };
        const quadro: Ret = { x: 0, y: 0, w: q.w, h: q.h };
        const cands = candidatos(local, quadro, k);
        let partes = svgRetangulo(local, cor, k);
        if (cands.length > 0) {
          // As amostras estão no sistema do recorte; a imagem inteira está deslocada por (q.x, q.y).
          const comDesloc = cands.map((cd) => ({ ...cd, amostras: cd.amostras.map((p) => ({ x: p.x + q.x, y: p.y + q.y })) }));
          const ocup = await ocupacao(pagina, comDesloc, escala);
          if (process.env.ANOTAR_DEPURAR) console.log(c.arquivo, cands.map((cd, i) => `${Math.round(Math.atan2(cd.dir.y, cd.dir.x) * 180 / Math.PI)}°:${ocup[i].toFixed(2)}`).join(" "));
          // Menor ocupação vence; diagonal ganha um pequeno bônus (não fica alinhada a botões vizinhos).
          let melhor = 0, nota = Infinity;
          cands.forEach((cd, i) => {
            const n = ocup[i] - (cd.diagonal ? 0.04 : 0);
            if (n < nota - 1e-9) { nota = n; melhor = i; }
          });
          const escolhido = cands[melhor];
          partes += svgSeta(escolhido, cor, k) + svgNumero(escolhido.centro, c.numero, cor, k);
        } else {
          // Sem espaço para a seta: só o número, no canto de cima à esquerda do retângulo, para dentro do recorte.
          const r = CIRCULO * k;
          const centro = {
            x: limitar(local.x - r * 0.4, r + 4, q.w - r - 4),
            y: limitar(local.y - r * 0.4, r + 4, q.h - r - 4),
          };
          partes += svgNumero(centro, c.numero, cor, k);
        }
        svg = `<g style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))">${partes}</g>`;
      }
      await pagina.evaluate((s) => { document.getElementById("marcas")!.innerHTML = s; }, svg);
      const destino = path.join(saida, c.arquivo);
      await pagina.locator("#quadro").screenshot({ path: destino, animations: "disabled" });
      await contexto.close();

      const tam = tamanhoPng(destino);
      resultado.push({
        numero: c.numero,
        passo: c.passo,
        arquivo: c.arquivo,
        alt: textoAlternativo(c, roteiro),
        largura: tam.w,
        altura: tam.h,
        escala,
        enquadrar: modo,
      });
      console.log(`[anotar] ${c.arquivo} → ${tam.w}×${tam.h}${ret ? "" : " (sem destaque)"}`);
    }
  } finally {
    await navegador.close();
  }
  writeFileSync(path.join(saida, "anotadas.json"), JSON.stringify(resultado, null, 2) + "\n", "utf8");
  console.log(`[anotar] ${resultado.length} imagens em ${path.relative(RAIZ, saida)}`);
  return resultado;
}

if (import.meta.main) {
  const { caso, roteiro } = argumentos();
  anotar(caso, roteiro).catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
