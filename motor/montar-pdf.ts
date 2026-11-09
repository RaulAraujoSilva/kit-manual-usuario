// Manual em PDF: capa, sumário e capítulos (Markdown) com o passo a passo e as imagens anotadas de cada roteiro.
// Uso: node motor/montar-pdf.ts <caso> <manual> [--de <pasta de saída>]
// Lê casos/<caso>/manuais/<manual>.yaml e casos/<caso>/capitulos/<roteiro>.md; o marcador {{passos}} vira o passo a
// passo numerado do roteiro, com as imagens de saida/<caso>/<roteiro>/anotadas/. Grava saida/<caso>/manuais/<manual>.pdf
// (A4, marcado, com marcadores, idioma pt-BR, texto alternativo em toda figura) e o .html usado na impressão.
// `--de teste` lê as imagens de saida/teste/... e grava em saida/teste/manuais/ (para desenvolver com capturas de teste).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Marked, type Tokens } from "marked";
import { chromium } from "playwright";
import { parse } from "yaml";

import { RAIZ, lerCaso, lerRoteiro, pastaDoCaso, type Caso, type Roteiro } from "./comum.ts";
import type { Anotada } from "./anotar.ts";

interface Manual {
  titulo: string;
  perfil: string;
  subtitulo?: string;
  versao?: string;
  apresentacao?: string;
  capitulos: string[];
}

interface Titulo { nivel: number; texto: string; id: string }

const MODELOS = path.join(RAIZ, "modelos", "pdf");

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slug(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function preencher(modelo: string, valores: Record<string, string>): string {
  return modelo.replace(/\{\{(\w+)\}\}/g, (m, chave: string) => (chave in valores ? valores[chave] : m));
}

/** Markdown do capítulo → HTML, com os títulos um nível abaixo (o manual é o h1) e ids únicos para o sumário. */
function renderizarCapitulo(md: string, prefixo: string): { html: string; titulos: Titulo[] } {
  const titulos: Titulo[] = [];
  const usados = new Set<string>();
  const marked = new Marked({
    gfm: true,
    walkTokens(t) {
      if (t.type === "heading") (t as Tokens.Heading).depth = Math.min(6, (t as Tokens.Heading).depth + 1);
    },
    renderer: {
      heading(t: Tokens.Heading) {
        const interno = this.parser.parseInline(t.tokens);
        let id = `${prefixo}-${slug(t.text)}`;
        for (let i = 2; usados.has(id); i++) id = `${prefixo}-${slug(t.text)}-${i}`;
        usados.add(id);
        titulos.push({ nivel: t.depth, texto: interno.replace(/<[^>]+>/g, ""), id });
        return `<h${t.depth} id="${id}">${interno}</h${t.depth}>\n`;
      },
    },
  });
  return { html: marked.parse(md, { async: false }) as string, titulos };
}

function htmlPassos(saidaDe: string, roteiro: Roteiro): string {
  const pasta = path.join(RAIZ, "saida", saidaDe, roteiro.id, "anotadas");
  const arq = path.join(pasta, "anotadas.json");
  if (!existsSync(arq)) {
    throw new Error(`Falta ${path.relative(RAIZ, arq)}: rode "node motor/anotar.ts ${saidaDe} ${roteiro.id}" antes.`);
  }
  const anotadas = JSON.parse(readFileSync(arq, "utf8")) as Anotada[];
  const porNumero = new Map(anotadas.map((a) => [a.numero, a]));
  const inline = new Marked({ gfm: true });
  const itens = roteiro.passos.map((p, i) => {
    const n = i + 1;
    const a = porNumero.get(n);
    if (p.captura && !a) console.warn(`[montar-pdf] passo ${n} (${p.id}) pede captura, mas não há imagem anotada`);
    const texto = inline.parseInline(p.texto, { async: false }) as string;
    const figura = a
      ? `<div class="passo-figura ${a.enquadrar ?? "detalhe"}"><img src="${pathToFileURL(path.join(pasta, a.arquivo)).href}" ` +
        `alt="${escapar(a.alt)}" width="${Math.round(a.largura / (a.escala || 2))}" height="${Math.round(a.altura / (a.escala || 2))}"></div>`
      : "";
    return `<li class="passo" id="${roteiro.id}-passo-${n}"><div class="passo-cabeca"><span class="passo-numero">${n}</span>` +
      `<p class="passo-texto">${texto}</p></div>${figura}</li>`;
  });
  return `<ol class="passos">\n${itens.join("\n")}\n</ol>`;
}

export async function montarPdf(caso: string, manualId: string, saidaDe = caso): Promise<string> {
  const dados: Caso = lerCaso(caso);
  const arqManual = path.join(pastaDoCaso(caso), "manuais", `${manualId}.yaml`);
  if (!existsSync(arqManual)) throw new Error(`Manual não encontrado: ${path.relative(RAIZ, arqManual)}`);
  const manual = parse(readFileSync(arqManual, "utf8")) as Manual;
  const subtitulo = manual.subtitulo ?? dados.sistema;

  const sumario: string[] = [];
  const capitulos: string[] = [];
  manual.capitulos.forEach((id, i) => {
    const roteiro = lerRoteiro(caso, id);
    const arqMd = path.join(pastaDoCaso(caso), roteiro.capitulo ?? path.join("capitulos", `${id}.md`));
    if (!existsSync(arqMd)) throw new Error(`Capítulo não encontrado: ${path.relative(RAIZ, arqMd)}`);
    const { html, titulos } = renderizarCapitulo(readFileSync(arqMd, "utf8"), id);
    if (!html.includes("<p>{{passos}}</p>")) throw new Error(`O capítulo ${id} não tem o marcador {{passos}} em linha própria.`);
    const corpo = html.replace("<p>{{passos}}</p>", htmlPassos(saidaDe, roteiro));
    const principal = titulos.find((t) => t.nivel === 2);
    const tituloCap = principal?.texto ?? roteiro.titulo;
    const idCap = principal?.id ?? `${id}-capitulo`;
    capitulos.push(
      `<section class="capitulo" aria-labelledby="${idCap}">\n<p class="capitulo-rotulo">Capítulo ${i + 1}</p>\n` +
        (principal ? "" : `<h2 id="${idCap}">${escapar(tituloCap)}</h2>\n`) + corpo + "</section>",
    );
    const secoes = titulos.filter((t) => t.nivel === 3).map((t) => `<li><a href="#${t.id}">${escapar(t.texto)}</a></li>`);
    sumario.push(
      `<li><a href="#${idCap}"><span class="num">${i + 1}.</span><span>${escapar(tituloCap)}</span></a>` +
        (secoes.length ? `<ol>${secoes.join("")}</ol>` : "") + "</li>",
    );
  });

  const m = dados.marca;
  const estilo = `:root { --primaria: ${m.cor_primaria}; --texto: ${m.cor_texto}; --destaque: ${m.cor_destaque}; }\n` +
    readFileSync(path.join(MODELOS, "estilo.css"), "utf8");
  const apresentacao = manual.apresentacao
    ? `<div class="apresentacao">${new Marked().parse(manual.apresentacao, { async: false }) as string}</div>`
    : "";
  const html = preencher(readFileSync(path.join(MODELOS, "manual.html"), "utf8"), {
    titulo: escapar(manual.titulo),
    subtitulo: escapar(subtitulo),
    versao: escapar(manual.versao ?? ""),
    orgao: escapar(dados.orgao),
    logotipo: pathToFileURL(path.join(pastaDoCaso(caso), m.logotipo)).href,
    estilo,
    apresentacao,
    sumario: sumario.join("\n"),
    capitulos: capitulos.join("\n\n"),
  });
  const rodape = preencher(readFileSync(path.join(MODELOS, "rodape.html"), "utf8"), {
    titulo: escapar(manual.titulo),
    subtitulo: escapar(subtitulo),
  });

  const pastaSaida = path.join(RAIZ, "saida", saidaDe, "manuais");
  mkdirSync(pastaSaida, { recursive: true });
  const arqHtml = path.join(pastaSaida, `${manualId}.html`);
  const arqPdf = path.join(pastaSaida, `${manualId}.pdf`);
  writeFileSync(arqHtml, html, "utf8");

  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage();
    await pagina.goto(pathToFileURL(arqHtml).href, { waitUntil: "load" });
    await pagina.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => (img.complete ? null : img.decode().catch(() => null))));
    });
    const quebradas = await pagina.evaluate(() => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src));
    if (quebradas.length) throw new Error(`Imagens que não carregaram: ${quebradas.join(", ")}`);
    await pagina.pdf({
      path: arqPdf,
      format: "A4",
      printBackground: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: rodape,
      margin: { top: "16mm", bottom: "20mm", left: "18mm", right: "18mm" },
    });
  } finally {
    await navegador.close();
  }
  console.log(`[montar-pdf] ${path.relative(RAIZ, arqPdf)}`);
  return arqPdf;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const iDe = args.indexOf("--de");
  const saidaDe = iDe >= 0 ? args[iDe + 1] : undefined;
  const [caso, manual] = args.filter((_, i) => iDe < 0 || (i !== iDe && i !== iDe + 1));
  if (!caso || !manual) {
    console.error("Uso: node motor/montar-pdf.ts <caso> <manual> [--de <pasta de saída>]");
    process.exit(2);
  }
  montarPdf(caso, manual, saidaDe ?? caso).catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
