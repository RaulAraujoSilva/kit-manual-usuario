// Portões de qualidade do caso: cobertura da matriz, termos proibidos, vídeos (duração, legenda) e PDFs (marcado,
// idioma, marcadores). Grava saida/<caso>/checagem.md e termina com erro se algum portão falhar.
// Uso: node motor/checar.ts <caso>
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { RAIZ, pastaDoCaso } from "./comum.ts";

const DURACAO_MAXIMA_S = 150;

/** Nunca aparecem em entregável institucional (texto do manual, narração, legenda). */
const PROIBIDOS: { nome: string; re: RegExp }[] = [
  { nome: "IA", re: /\bI\.?A\.?(?=[\s,.;:)!?]|$)/ },
  { nome: "inteligência artificial", re: /intelig[êe]ncia artificial/i },
  { nome: "ferramenta interna", re: /\b(mailpit|playwright|openrouter|chromium|docker|prisma)\b/i },
  { nome: "endereço local", re: /localhost|127\.0\.0\.1|\b[A-Z]:\\|\/Users\//i },
  { nome: "ambiente de teste", re: /ambiente de (teste|desenvolvimento)/i },
];
/** Fora do vocabulário único da interface (alerta, não erro: pode ser citação de outra coisa). */
const FORA_DO_VOCABULARIO: { nome: string; re: RegExp }[] = [
  { nome: "rejeitar (use Reprovar)", re: /\brejeit/i },
  { nome: "deferir/indeferir (use Aprovar/Reprovar)", re: /\b(in)?defer/i },
  { nome: "glosar como verbo solto", re: /\bglosad[oa]s?\b/i },
];

interface Achado { tipo: "erro" | "aviso"; onde: string; o_que: string }

function duracao(arq: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString().trim());
}
function temLegenda(arq: string): boolean {
  return execFileSync("ffprobe", ["-v", "error", "-select_streams", "s", "-show_entries", "stream=codec_name", "-of", "csv=p=0", arq])
    .toString().includes("mov_text");
}

/** Linhas das tabelas da matriz: roteiro, vídeo e situação. */
function lerMatriz(caso: string): { roteiro: string; video: boolean; situacao: string; linha: string }[] {
  const md = readFileSync(path.join(pastaDoCaso(caso), "matriz.md"), "utf8");
  const linhas: { roteiro: string; video: boolean; situacao: string; linha: string }[] = [];
  let cab: string[] = [];
  for (const l of md.split(/\r?\n/)) {
    if (!l.startsWith("|")) { cab = []; continue; }
    const cel = l.split("|").slice(1, -1).map((c) => c.trim());
    if (cel.every((c) => /^-+$/.test(c))) continue;
    if (cab.length === 0) { cab = cel.map((c) => c.toLowerCase()); continue; }
    const col = (n: string) => cel[cab.findIndex((c) => c.startsWith(n))] ?? "";
    const m = /`([a-z]+-[\w-]+)`/.exec(col("roteiro"));
    if (!m?.[1]) continue;
    linhas.push({ roteiro: m[1], video: /\bV\d{2}\b/.test(col("vídeo")) && !/^—/.test(col("vídeo")), situacao: col("situação"), linha: cel[0] ?? "" });
  }
  // a mesma funcionalidade pode aparecer em mais de uma tabela (ex.: a lista de vídeos): junta por roteiro
  const porRoteiro = new Map<string, (typeof linhas)[number]>();
  for (const l of linhas) {
    const j = porRoteiro.get(l.roteiro);
    porRoteiro.set(l.roteiro, j ? { ...j, video: j.video || l.video, situacao: j.situacao || l.situacao } : l);
  }
  return [...porRoteiro.values()];
}

function textosDoRoteiro(arq: string): string[] {
  const r = parse(readFileSync(arq, "utf8")) as { titulo?: string; abertura?: Record<string, string>; fecho?: { linhas?: string[] }; passos?: { texto?: string; narracao?: string }[] };
  return [r.titulo ?? "", ...Object.values(r.abertura ?? {}), ...(r.fecho?.linhas ?? []),
    ...(r.passos ?? []).flatMap((p) => [p.texto ?? "", p.narracao ?? ""])];
}

function procurar(achados: Achado[], onde: string, texto: string): void {
  for (const p of PROIBIDOS) {
    const m = p.re.exec(texto);
    if (m) achados.push({ tipo: "erro", onde, o_que: `termo proibido (${p.nome}): "${texto.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, " ")}"` });
  }
  for (const p of FORA_DO_VOCABULARIO) {
    if (p.re.test(texto)) achados.push({ tipo: "aviso", onde, o_que: `fora do vocabulário: ${p.nome}` });
  }
}

function checar(caso: string): Achado[] {
  const achados: Achado[] = [];
  const pc = pastaDoCaso(caso);
  const saida = path.join(RAIZ, "saida", caso);
  const manuais = existsSync(path.join(pc, "manuais")) ? readdirSync(path.join(pc, "manuais")).filter((f) => f.endsWith(".yaml")) : [];
  const textoManuais = manuais.map((f) => readFileSync(path.join(pc, "manuais", f), "utf8")).join("\n");
  const capitulos = existsSync(path.join(pc, "capitulos")) ? readdirSync(path.join(pc, "capitulos")).filter((f) => f.endsWith(".md")) : [];
  const textoCapitulos = capitulos.map((f) => readFileSync(path.join(pc, "capitulos", f), "utf8")).join("\n");

  // 1. cobertura: toda funcionalidade implementada da matriz tem roteiro, prints, capítulo e (se pedido) vídeo
  for (const l of lerMatriz(caso)) {
    if (/pend[êe]ncia/i.test(l.situacao) && !/implementado|parcial/i.test(l.situacao)) continue;
    const onde = `${l.linha} ${l.roteiro}`;
    if (!existsSync(path.join(pc, "roteiros", `${l.roteiro}.yaml`))) { achados.push({ tipo: "erro", onde, o_que: "sem roteiro pronto (ainda em rascunho?)" }); continue; }
    if (!existsSync(path.join(saida, l.roteiro, "anotadas", "anotadas.json"))) achados.push({ tipo: "erro", onde, o_que: "sem prints anotados" });
    const noManual = new RegExp(`(^|[\\s\\[,-])${l.roteiro}(\\s|$|[\\],])`, "m").test(textoManuais) || textoCapitulos.includes(`{{passos:${l.roteiro}}}`);
    if (!noManual) achados.push({ tipo: "erro", onde, o_que: "não está em nenhum manual" });
    if (l.video) {
      const mp4 = path.join(saida, l.roteiro, `${l.roteiro}.mp4`);
      if (!existsSync(mp4)) { achados.push({ tipo: "erro", onde, o_que: "sem vídeo" }); continue; }
      const d = duracao(mp4);
      if (d > DURACAO_MAXIMA_S) achados.push({ tipo: "aviso", onde, o_que: `vídeo de ${d.toFixed(0)} s (alvo: até ${DURACAO_MAXIMA_S} s)` });
      if (!temLegenda(mp4)) achados.push({ tipo: "erro", onde, o_que: "vídeo sem faixa de legenda" });
      for (const ext of ["srt", "vtt"]) if (!existsSync(path.join(saida, l.roteiro, `${l.roteiro}.${ext}`))) achados.push({ tipo: "erro", onde, o_que: `sem .${ext}` });
    }
  }

  // 2. linguagem: capítulos, roteiros (texto, narração, cartões), manuais e legendas
  for (const f of capitulos) procurar(achados, `capitulos/${f}`, readFileSync(path.join(pc, "capitulos", f), "utf8"));
  for (const f of readdirSync(path.join(pc, "roteiros")).filter((x) => x.endsWith(".yaml"))) {
    procurar(achados, `roteiros/${f}`, textosDoRoteiro(path.join(pc, "roteiros", f)).join("\n"));
  }
  for (const f of manuais) procurar(achados, `manuais/${f}`, readFileSync(path.join(pc, "manuais", f), "utf8").replace(/^#.*$/gm, ""));
  if (existsSync(saida)) {
    for (const d of readdirSync(saida)) {
      const srt = path.join(saida, d, `${d}.srt`);
      if (existsSync(srt)) procurar(achados, `legenda ${d}`, readFileSync(srt, "utf8"));
    }
  }

  // 3. PDFs: marcado, idioma, marcadores, título
  const pastaPdf = path.join(saida, "manuais");
  for (const f of existsSync(pastaPdf) ? readdirSync(pastaPdf).filter((x) => x.endsWith(".pdf")) : []) {
    const bin = readFileSync(path.join(pastaPdf, f)).toString("latin1");
    const onde = `PDF ${f}`;
    if (!/\/Marked\s+true/.test(bin)) achados.push({ tipo: "erro", onde, o_que: "PDF não marcado (sem estrutura para leitor de tela)" });
    if (!/\/Lang\s*\(pt-BR\)/.test(bin)) achados.push({ tipo: "erro", onde, o_que: "PDF sem idioma pt-BR" });
    if (!/\/Outlines\s+\d+/.test(bin)) achados.push({ tipo: "erro", onde, o_que: "PDF sem marcadores" });
    if (!/\/DisplayDocTitle\s+true/.test(bin)) achados.push({ tipo: "aviso", onde, o_que: "PDF não mostra o título do documento" });
  }
  return achados;
}

if (import.meta.main) {
  const caso = process.argv[2];
  if (!caso) { console.error("Uso: node motor/checar.ts <caso>"); process.exit(2); }
  const achados = checar(caso);
  const erros = achados.filter((a) => a.tipo === "erro");
  const md = [`# Checagem do caso ${caso}`, "", `${erros.length} erro(s), ${achados.length - erros.length} aviso(s).`, "",
    "| Tipo | Onde | O quê |", "|---|---|---|",
    ...achados.map((a) => `| ${a.tipo} | ${a.onde} | ${a.o_que.replace(/\|/g, "\\|")} |`)].join("\n");
  writeFileSync(path.join(RAIZ, "saida", caso, "checagem.md"), md + "\n");
  for (const a of achados) console.log(`${a.tipo === "erro" ? "ERRO " : "aviso"}  ${a.onde}: ${a.o_que}`);
  console.log(`\n${erros.length} erro(s), ${achados.length - erros.length} aviso(s) → saida/${caso}/checagem.md`);
  process.exit(erros.length > 0 ? 1 : 0);
}
