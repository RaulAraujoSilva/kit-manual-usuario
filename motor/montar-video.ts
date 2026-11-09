// Montagem do vídeo: bruto.webm + linha-do-tempo.json → <roteiro>.mp4 com cartões de abertura e fecho, narração
// normalizada em duas passagens (loudnorm medido e depois aplicado) e legenda embutida (mov_text) + .srt e .vtt.
//
// Uso: node motor/montar-video.ts <caso> <roteiro> [--marca <caso>]
//   --marca: pega marca, órgão e sistema de outro caso (para montar testes em saida/teste/...).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { lerCaso, lerRoteiro, pastaDoCaso, RAIZ, type Caso, type Roteiro } from "./comum.ts";
import { duracaoDe, textoAbertura, textoFecho } from "./narrar.ts";

const FPS = 30;
const FADE_S = 0.4;
const ABERTURA_MIN_S = 3.5;
const ABERTURA_FOLGA_S = 0.8;
const ABERTURA_FALA_S = 0.3; // a narração da abertura começa 0,3 s depois do início do vídeo
const FECHO_MIN_S = 4;
const FECHO_FOLGA_S = 1;
const FECHO_FALA_S = FADE_S + 0.1; // e a do fecho, quando a transição para o cartão termina
const LOUDNORM = { I: -16, TP: -1.5, LRA: 11 };
const LEGENDA_LINHA = 42;

interface Segmento {
  narracao?: string;
  audio?: string;
  duracao_s?: number;
}
interface LinhaDoTempo {
  largura?: number;
  altura?: number;
  corte_inicio_s: number;
  corte_fim_s: number;
  abertura: Segmento & { titulo: string; subtitulo: string };
  passos: (Segmento & { id: string; inicio_s: number })[];
  fecho: Segmento & { linhas: string[] };
}
interface Fala {
  audio: string;
  inicio_s: number;
  duracao_s: number;
  texto: string;
}
interface Deixa {
  inicio_s: number;
  fim_s: number;
  linhas: string[];
}

// ---------------------------------------------------------------- utilidades

function ffmpeg(args: string[], rotulo: string): string {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) {
    const fim = (r.stderr ?? "").split(/\r?\n/).filter(Boolean).slice(-15).join("\n");
    throw new Error(`ffmpeg falhou (${rotulo}):\n${fim}`);
  }
  return r.stderr ?? "";
}

function ultimoJson(texto: string): Record<string, string> {
  const ini = texto.lastIndexOf("{"), fim = texto.lastIndexOf("}");
  if (ini < 0 || fim < ini) throw new Error("loudnorm não devolveu as medidas.");
  return JSON.parse(texto.slice(ini, fim + 1)) as Record<string, string>;
}

function escaparHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function arred(n: number): string {
  return n.toFixed(3);
}

/** Roboto se estiver instalada (sistema ou usuário); senão Segoe UI. */
function fonteDosCartoes(): string {
  const pastas = [
    path.join(process.env.WINDIR ?? "C:\\Windows", "Fonts"),
    path.join(process.env.LOCALAPPDATA ?? "", "Microsoft", "Windows", "Fonts"),
  ];
  for (const p of pastas) {
    try {
      if (readdirSync(p).some((f) => /^roboto/i.test(f))) return "Roboto";
    } catch {
      // pasta ausente
    }
  }
  return "Segoe UI";
}

// ---------------------------------------------------------------- legendas

function quebrarLinhas(texto: string, max: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    if (atual && atual.length + 1 + palavra.length > max) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Palavras que não devem fechar a primeira linha de uma legenda (artigos, preposições, conjunções).
const PALAVRAS_DE_LIGACAO = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "por", "pelo", "pela", "pelos", "pelas", "com", "para", "ao", "aos", "à", "às", "e", "ou", "que", "se", "seu", "sua",
]);

/**
 * Duas linhas equilibradas: entre as quebras que cabem, a que deixa a linha maior mais curta, preferindo quebrar
 * depois de pontuação e evitando fechar a primeira linha com artigo ou preposição.
 */
function equilibrar(texto: string, max: number): string[] {
  if (texto.length <= max) return [texto];
  const palavras = texto.split(" ");
  let melhor: string[] = quebrarLinhas(texto, max);
  let pior = Infinity;
  for (let i = 1; i < palavras.length; i++) {
    const a = palavras.slice(0, i).join(" "), b = palavras.slice(i).join(" ");
    if (a.length > max || b.length > max) continue;
    const ultima = palavras[i - 1]!;
    let custo = Math.max(a.length, b.length);
    if (/[.!?…:;]$/.test(ultima)) custo -= 12;
    else if (/,$/.test(ultima)) custo -= 6;
    if (PALAVRAS_DE_LIGACAO.has(ultima.toLowerCase())) custo += 10;
    if (custo < pior) {
      pior = custo;
      melhor = [a, b];
    }
  }
  return melhor;
}

/** Blocos de até duas linhas de ~42 caracteres, respeitando o fim das frases quando dá. */
export function blocosDeLegenda(texto: string, max = LEGENDA_LINHA): string[][] {
  const frases = texto.replace(/\s+/g, " ").trim().split(/(?<=[.!?…])\s+/).filter(Boolean);
  const pedacos: string[] = [];
  for (const f of frases) {
    const ultimo = pedacos.at(-1);
    // Junta à frase anterior se couber em duas linhas, ou se a anterior for curta demais para ficar sozinha.
    const junta = ultimo !== undefined && (quebrarLinhas(`${ultimo} ${f}`, max).length <= 2 || ultimo.length < 20);
    if (junta) pedacos[pedacos.length - 1] = `${ultimo} ${f}`;
    else pedacos.push(f);
  }
  const blocos: string[][] = [];
  for (const p of pedacos) {
    const linhas = quebrarLinhas(p, max);
    if (linhas.length <= 2) {
      blocos.push(equilibrar(p, max));
      continue;
    }
    for (const b of dividirFrase(p, max, Math.ceil(linhas.length / 2))) blocos.push(equilibrar(b, max));
  }
  return blocos;
}

/**
 * Frase longa em blocos que cabem em duas linhas: partição ótima (programação dinâmica) com blocos de tamanho
 * parecido, preferindo quebrar depois de vírgula e nunca depois de artigo, preposição ou conjunção.
 */
function dividirFrase(frase: string, max: number, minimo: number): string[] {
  const w = frase.split(" ");
  const n = w.length;
  const cabe = (i: number, j: number) => quebrarLinhas(w.slice(i, j).join(" "), max).length <= 2;
  const custoQuebra = (j: number) => {
    if (j >= n) return 0;
    const ultima = w[j - 1]!;
    if (/[.!?…:;]$/.test(ultima)) return -30;
    if (/,$/.test(ultima)) return -20;
    return PALAVRAS_DE_LIGACAO.has(ultima.toLowerCase()) ? 60 : 0;
  };
  for (let k = minimo; k <= n; k++) {
    const alvo = frase.length / k;
    // melhor[c][j]: menor custo para pôr as j primeiras palavras em c blocos.
    const melhor = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(Infinity));
    const de = Array.from({ length: k + 1 }, () => new Array<number>(n + 1).fill(-1));
    melhor[0]![0] = 0;
    for (let c = 1; c <= k; c++) {
      for (let j = 1; j <= n; j++) {
        for (let i = c - 1; i < j; i++) {
          if (melhor[c - 1]![i] === Infinity || !cabe(i, j)) continue;
          const tam = w.slice(i, j).join(" ").length;
          const custo = melhor[c - 1]![i]! + ((tam - alvo) ** 2) / alvo + custoQuebra(j);
          if (custo < melhor[c]![j]!) {
            melhor[c]![j] = custo;
            de[c]![j] = i;
          }
        }
      }
    }
    if (melhor[k]![n] === Infinity) continue;
    const partes: string[] = [];
    for (let c = k, j = n; c > 0; c--) {
      const i = de[c]![j]!;
      partes.unshift(w.slice(i, j).join(" "));
      j = i;
    }
    return partes;
  }
  return quebrarLinhas(frase, max);
}

function deixasDaFala(f: Fala): Deixa[] {
  const blocos = blocosDeLegenda(f.texto);
  const total = blocos.reduce((s, b) => s + b.join(" ").length, 0);
  const deixas: Deixa[] = [];
  let t = f.inicio_s;
  for (const b of blocos) {
    const d = (f.duracao_s * b.join(" ").length) / total;
    deixas.push({ inicio_s: t, fim_s: t + d, linhas: b });
    t += d;
  }
  return deixas;
}

function tempoLegenda(s: number, separador: "," | "."): string {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  const seg = Math.floor((ms % 60_000) / 1000), resto = ms % 1000;
  const p = (n: number, k = 2) => String(n).padStart(k, "0");
  return `${p(h)}:${p(m)}:${p(seg)}${separador}${p(resto, 3)}`;
}

function gravarLegendas(deixas: Deixa[], srt: string, vtt: string): void {
  const s = deixas.map((d, i) => `${i + 1}\n${tempoLegenda(d.inicio_s, ",")} --> ${tempoLegenda(d.fim_s, ",")}\n${d.linhas.join("\n")}\n`);
  writeFileSync(srt, s.join("\n"), "utf8");
  const v = deixas.map((d) => `${tempoLegenda(d.inicio_s, ".")} --> ${tempoLegenda(d.fim_s, ".")}\n${d.linhas.join("\n")}\n`);
  writeFileSync(vtt, `WEBVTT\n\n${v.join("\n")}`, "utf8");
}

// ---------------------------------------------------------------- cartões

async function fotografarCartoes(
  caso: Caso,
  pastaMarca: string,
  abertura: { titulo: string; subtitulo: string },
  linhasFecho: string[],
  destino: { abertura: string; fecho: string },
): Promise<void> {
  const modelo = readFileSync(path.join(RAIZ, "modelos", "video", "cartao.html"), "utf8");
  const arqLogo = path.join(pastaMarca, caso.marca.logotipo_branco ?? caso.marca.logotipo);
  const logo = `data:image/png;base64,${readFileSync(arqLogo).toString("base64")}`;
  const fonte = fonteDosCartoes();
  const montar = (corpo: string) =>
    modelo
      .replaceAll("{{COR_PRIMARIA}}", escaparHtml(caso.marca.cor_primaria))
      .replaceAll("{{COR_DESTAQUE}}", escaparHtml(caso.marca.cor_destaque))
      .replaceAll("{{FONTE}}", `"${escaparHtml(fonte)}"`)
      .replaceAll("{{LOGO}}", logo)
      .replaceAll("{{SISTEMA}}", escaparHtml(caso.sistema))
      .replaceAll("{{ORGAO}}", escaparHtml(caso.orgao))
      .replace("{{CORPO}}", corpo);
  const htmlAbertura = montar(
    `<div class="chamada">${escaparHtml(abertura.subtitulo)}</div><div class="traco"></div>` +
      `<h1 class="titulo" data-ajustar="360">${escaparHtml(abertura.titulo)}</h1>`,
  );
  const htmlFecho = montar(
    `<div class="traco" style="margin-top:0"></div><div class="linhas" data-ajustar="460">` +
      linhasFecho.map((l) => `<p>${escaparHtml(l)}</p>`).join("") +
      `</div>`,
  );
  const navegador = await chromium.launch();
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    for (const [html, arquivo] of [[htmlAbertura, destino.abertura], [htmlFecho, destino.fecho]] as const) {
      await pagina.setContent(html, { waitUntil: "load" });
      await pagina.evaluate(() => document.fonts.ready.then(() => undefined));
      await pagina.screenshot({ path: arquivo, type: "png" });
    }
  } finally {
    await navegador.close();
  }
  console.log(`cartões fotografados (fonte ${fonte})`);
}

// ---------------------------------------------------------------- principal

function lerArgumentos(): { caso: string; roteiro: string; marca: string } {
  const pos: string[] = [];
  let marca: string | undefined;
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--marca") marca = a[++i];
    else pos.push(a[i]!);
  }
  const [caso, roteiro] = pos;
  if (!caso || !roteiro) {
    console.error("Uso: node motor/montar-video.ts <caso> <roteiro> [--marca <caso>]");
    process.exit(2);
  }
  return { caso, roteiro, marca: marca ?? caso };
}

function duracaoDoSegmento(s: Segmento): number | undefined {
  if (!s.audio) return undefined;
  if (!existsSync(s.audio)) throw new Error(`Áudio não encontrado: ${s.audio}`);
  return s.duracao_s && s.duracao_s > 0 ? s.duracao_s : duracaoDe(s.audio);
}

async function principal(): Promise<void> {
  const { caso, roteiro, marca } = lerArgumentos();
  const dadosCaso = lerCaso(marca);
  const pastaMarca = pastaDoCaso(marca);
  let r: Roteiro | undefined;
  try {
    r = lerRoteiro(caso, roteiro);
  } catch {
    r = undefined; // teste sem roteiro: os textos vêm só da linha do tempo
  }

  const pasta = path.join(RAIZ, "saida", caso, roteiro);
  const bruto = [path.join(pasta, "video", "bruto.mp4"), path.join(pasta, "video", "bruto.webm")].find((f) => existsSync(f)) ?? path.join(pasta, "video", "bruto.mp4");
  const arqLinha = path.join(pasta, "video", "linha-do-tempo.json");
  for (const f of [bruto, arqLinha]) if (!existsSync(f)) throw new Error(`Falta ${path.relative(RAIZ, f)}`);
  const lt = JSON.parse(readFileSync(arqLinha, "utf8")) as LinhaDoTempo;
  const largura = lt.largura ?? 1920, altura = lt.altura ?? 1080;
  const trabalho = path.join(pasta, "video", "montagem");
  mkdirSync(trabalho, { recursive: true });

  // Tempos.
  const corpo = lt.corte_fim_s - lt.corte_inicio_s;
  if (!(corpo > 2 * FADE_S)) throw new Error("corte_fim_s precisa ser maior que corte_inicio_s.");
  const durAb = duracaoDoSegmento(lt.abertura);
  const durFe = duracaoDoSegmento(lt.fecho);
  const A = Math.max(ABERTURA_MIN_S, durAb === undefined ? 0 : durAb + ABERTURA_FOLGA_S);
  const F = Math.max(FECHO_MIN_S, durFe === undefined ? 0 : durFe + FECHO_FOLGA_S);
  const inicioCorpo = A - FADE_S; // o corpo entra durante a transição
  const inicioFecho = inicioCorpo + corpo - FADE_S;
  const total = inicioFecho + F;

  // Falas posicionadas no tempo do vídeo final. O texto da legenda é o original do roteiro (legível).
  const textoPasso = (id: string, padrao?: string) => r?.passos.find((p) => p.id === id)?.narracao ?? padrao ?? "";
  const falas: Fala[] = [];
  if (lt.abertura.audio && durAb !== undefined) {
    falas.push({
      audio: lt.abertura.audio, inicio_s: ABERTURA_FALA_S, duracao_s: durAb,
      texto: r ? textoAbertura(r) : lt.abertura.narracao ?? `${lt.abertura.subtitulo}. ${lt.abertura.titulo}.`,
    });
  }
  for (const p of lt.passos) {
    if (!p.audio) continue;
    const dur = duracaoDoSegmento(p)!;
    const inicio = inicioCorpo + (p.inicio_s - lt.corte_inicio_s);
    if (p.inicio_s < lt.corte_inicio_s) console.warn(`aviso: passo ${p.id} começa antes do corte inicial`);
    if (inicio + dur > inicioFecho + FADE_S) {
      console.warn(`aviso: a narração do passo ${p.id} passa do fim do corpo em ${arred(inicio + dur - inicioFecho - FADE_S)} s`);
    }
    falas.push({ audio: p.audio, inicio_s: inicio, duracao_s: dur, texto: textoPasso(p.id, p.narracao) });
  }
  if (lt.fecho.audio && durFe !== undefined) {
    falas.push({
      audio: lt.fecho.audio, inicio_s: inicioFecho + FECHO_FALA_S, duracao_s: durFe,
      texto: r ? textoFecho(r) : lt.fecho.narracao ?? lt.fecho.linhas.join(" "),
    });
  }
  falas.sort((a, b) => a.inicio_s - b.inicio_s);
  for (let i = 1; i < falas.length; i++) {
    const anterior = falas[i - 1]!, f = falas[i]!;
    if (anterior.inicio_s + anterior.duracao_s > f.inicio_s + 0.05) {
      console.warn(`aviso: falas sobrepostas em ${arred(f.inicio_s)} s (${arred(anterior.inicio_s + anterior.duracao_s - f.inicio_s)} s)`);
    }
  }

  // 1. Cartões.
  const pngAbertura = path.join(trabalho, "abertura.png"), pngFecho = path.join(trabalho, "fecho.png");
  await fotografarCartoes(
    dadosCaso, pastaMarca,
    { titulo: lt.abertura.titulo, subtitulo: lt.abertura.subtitulo },
    lt.fecho.linhas, { abertura: pngAbertura, fecho: pngFecho },
  );

  // 2. Mixagem (sem normalização do amix) sobre um silêncio com a duração exata do vídeo.
  const mix = path.join(trabalho, "mixagem.wav");
  const entradas = ["-f", "lavfi", "-t", arred(total), "-i", "anullsrc=r=48000:cl=stereo"];
  const grafoAudio: string[] = [];
  falas.forEach((f, i) => {
    entradas.push("-i", f.audio);
    const ms = Math.round(f.inicio_s * 1000);
    grafoAudio.push(`[${i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=delays=${ms}:all=1[f${i}]`);
  });
  grafoAudio.push(
    `[0:a]${falas.map((_, i) => `[f${i}]`).join("")}amix=inputs=${falas.length + 1}:duration=first:normalize=0,` +
      `atrim=0:${arred(total)}[mix]`,
  );
  ffmpeg([...entradas, "-filter_complex", grafoAudio.join(";"), "-map", "[mix]", "-c:a", "pcm_f32le", mix], "mixagem");

  // 3. Loudnorm em duas passagens: mede e depois aplica, linear, com os valores medidos. Voz sintetizada tem picos
  //    altos; se o ganho linear até -16 LUFS estourar o teto de pico, um limitador de picos entra antes da medição
  //    (sem ele o loudnorm abandonaria o modo linear e passaria a comprimir a voz dinamicamente).
  const alvo = `I=${LOUDNORM.I}:TP=${LOUDNORM.TP}:LRA=${LOUDNORM.LRA}`;
  const medir = (wav: string, rotulo: string) =>
    ultimoJson(ffmpeg(["-i", wav, "-af", `loudnorm=${alvo}:print_format=json`, "-f", "null", "-"], rotulo));
  let fonteNorm = mix;
  let m = medir(mix, "loudnorm 1");
  if (!Number.isFinite(Number(m.input_i))) throw new Error("Narração sem som mensurável (loudnorm mediu -inf).");
  const picoAposGanho = (x: Record<string, string>) => Number(x.input_tp) + (LOUDNORM.I - Number(x.input_i));
  let limiteDb = LOUDNORM.TP - (LOUDNORM.I - Number(m.input_i)) - 0.6;
  for (let tentativa = 0; picoAposGanho(m) > LOUDNORM.TP - 0.1 && tentativa < 3; tentativa++) {
    const limitado = path.join(trabalho, "mixagem-limitada.wav");
    const limite = Math.max(0.0625, 10 ** (limiteDb / 20));
    ffmpeg(
      ["-i", mix, "-af", `alimiter=limit=${limite.toFixed(5)}:attack=2:release=80:level=false:latency=true`,
        "-c:a", "pcm_f32le", limitado],
      "limitador",
    );
    console.log(`limitador de picos em ${limiteDb.toFixed(2)} dBFS (pico medido ${m.input_tp} dBTP)`);
    fonteNorm = limitado;
    m = medir(limitado, "loudnorm 1");
    limiteDb -= 0.75;
  }
  const narracao = path.join(trabalho, "narracao.wav");
  const filtro2 =
    `loudnorm=${alvo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json,aresample=48000`;
  const m2 = ultimoJson(ffmpeg(["-i", fonteNorm, "-af", filtro2, "-c:a", "pcm_f32le", narracao], "loudnorm 2"));
  console.log(
    `loudnorm: medido ${m.input_i} LUFS / ${m.input_tp} dBTP → ${m2.output_i} LUFS / ${m2.output_tp} dBTP ` +
      `(${m2.normalization_type})`,
  );

  // 4. Legendas.
  const deixas = falas.flatMap(deixasDaFala).sort((a, b) => a.inicio_s - b.inicio_s);
  for (let i = 0; i < deixas.length - 1; i++) deixas[i]!.fim_s = Math.min(deixas[i]!.fim_s, deixas[i + 1]!.inicio_s);
  const srt = path.join(pasta, `${roteiro}.srt`), vtt = path.join(pasta, `${roteiro}.vtt`);
  gravarLegendas(deixas, srt, vtt);

  // 5. Vídeo: cartão → (fade) → corpo cortado → (fade) → cartão, 30 fps constantes, BT.709.
  const ajustar =
    `scale=${largura}:${altura}:force_original_aspect_ratio=decrease:out_color_matrix=bt709:out_range=tv,` +
    `pad=${largura}:${altura}:(ow-iw)/2:(oh-ih)/2:color=white,setsar=1,format=yuv420p`;
  const grafoVideo = [
    `[0:v]${ajustar},fps=${FPS},trim=duration=${arred(A)},setpts=PTS-STARTPTS,settb=AVTB[ab]`,
    `[1:v]setpts=PTS-STARTPTS,trim=start=${arred(lt.corte_inicio_s)}:end=${arred(lt.corte_fim_s)},setpts=PTS-STARTPTS,` +
      `fps=${FPS},${ajustar},tpad=stop_mode=clone:stop_duration=2,trim=duration=${arred(corpo)},setpts=PTS-STARTPTS,settb=AVTB[co]`,
    `[2:v]${ajustar},fps=${FPS},trim=duration=${arred(F)},setpts=PTS-STARTPTS,settb=AVTB[fe]`,
    `[ab][co]xfade=transition=fade:duration=${FADE_S}:offset=${arred(inicioCorpo)}[x1]`,
    `[x1][fe]xfade=transition=fade:duration=${FADE_S}:offset=${arred(inicioFecho)}[v]`,
  ].join(";");
  const mp4 = path.join(pasta, `${roteiro}.mp4`);
  const titulo = r?.titulo ?? lt.abertura.titulo;
  ffmpeg(
    [
      "-loop", "1", "-framerate", String(FPS), "-t", arred(A), "-i", pngAbertura,
      "-i", bruto,
      "-loop", "1", "-framerate", String(FPS), "-t", arred(F), "-i", pngFecho,
      "-i", narracao,
      "-i", srt,
      "-filter_complex", grafoVideo,
      "-map", "[v]", "-map", "3:a", "-map", "4:s",
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-r", String(FPS), "-fps_mode", "cfr", "-g", String(FPS * 2),
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-c:s", "mov_text",
      "-metadata", `title=${titulo}`,
      "-metadata:s:v:0", "language=por",
      "-metadata:s:a:0", "language=por",
      "-metadata:s:s:0", "language=por", "-metadata:s:s:0", "handler_name=Português",
      "-t", arred(total), "-movflags", "+faststart",
      mp4,
    ],
    "vídeo",
  );

  console.log(
    `abertura ${arred(A)} s · corpo ${arred(corpo)} s · fecho ${arred(F)} s · total ${arred(total)} s · ` +
      `${falas.length} falas · ${deixas.length} legendas`,
  );
  console.log(path.relative(RAIZ, mp4));
}

if (import.meta.main) {
  principal().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
