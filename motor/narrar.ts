// Narração: texto → MP3 pela API de fala do OpenRouter, com cache por conteúdo em .cache/voz/.
// A chave vem de OPENROUTER_API_KEY ou do cofre local; nunca é impressa nem gravada.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { argumentos, lerCaso, lerRoteiro, pastaDeSaida, RAIZ, type Caso, type Roteiro } from "./comum.ts";
import { normalizar } from "./normalizar.ts";

const ENDPOINT = "https://openrouter.ai/api/v1/audio/speech";
const COFRE = "C:\\.claude\\claude-secrets.env";
const PASTA_CACHE = path.join(RAIZ, ".cache", "voz");
const TENTATIVAS_EXTRAS = 3;

function chaveDaApi(): string {
  const doAmbiente = process.env.OPENROUTER_API_KEY?.trim();
  if (doAmbiente) return doAmbiente;
  if (existsSync(COFRE)) {
    for (const linha of readFileSync(COFRE, "utf8").split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?OPENROUTER_API_KEY\s*=\s*(.*?)\s*$/.exec(linha);
      if (!m) continue;
      let v = m[1]!;
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v) return v;
    }
  }
  throw new Error("OPENROUTER_API_KEY ausente (nem no ambiente nem no cofre local).");
}

/** Duração de um arquivo de mídia em segundos, pelo ffprobe. */
export function duracaoDe(arquivo: string): number {
  const saida = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", arquivo],
    { encoding: "utf8" },
  );
  const d = Number(saida.trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error(`ffprobe não leu a duração de ${arquivo}`);
  return d;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sintetizar(caso: Caso, texto: string): Promise<Buffer> {
  const corpo: Record<string, string> = {
    model: caso.voz.modelo,
    input: texto,
    voice: caso.voz.voz,
    response_format: "mp3",
  };
  if (caso.voz.instrucoes) corpo.instructions = caso.voz.instrucoes;
  const chave = chaveDaApi();
  let ultimoErro = "";
  for (let tentativa = 0; tentativa <= TENTATIVAS_EXTRAS; tentativa++) {
    if (tentativa > 0) await esperar(2000 * 2 ** (tentativa - 1));
    let resp: Response;
    try {
      resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      ultimoErro = `falha de rede: ${(e as Error).message}`;
      continue;
    }
    if (resp.ok) {
      const tipo = resp.headers.get("content-type") ?? "";
      if (tipo.includes("json")) {
        const j = (await resp.json()) as Record<string, unknown>;
        const b64 = (j.audio ?? j.data) as string | undefined;
        if (typeof b64 !== "string") throw new Error("Resposta JSON da API de fala sem áudio.");
        return Buffer.from(b64, "base64");
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      if (buf.length < 100) throw new Error(`Áudio vazio ou curto demais (${buf.length} bytes).`);
      return buf;
    }
    const detalhe = (await resp.text().catch(() => "")).slice(0, 300);
    ultimoErro = `HTTP ${resp.status}: ${detalhe}`;
    if (resp.status !== 429 && resp.status < 500) break;
    const depois = Number(resp.headers.get("retry-after"));
    if (Number.isFinite(depois) && depois > 0) await esperar(Math.min(depois, 30) * 1000);
  }
  throw new Error(`A API de fala falhou: ${ultimoErro}`);
}

/** Texto narrado: normaliza, sintetiza (ou usa o cache) e devolve o MP3 com a duração. */
export async function narrar(caso: Caso, texto: string): Promise<{ arquivo: string; duracao_s: number }> {
  const normalizado = normalizar(texto);
  if (!normalizado) throw new Error("Texto de narração vazio.");
  const hash = createHash("sha1").update(`${caso.voz.modelo}|${caso.voz.voz}|${normalizado}`).digest("hex");
  mkdirSync(PASTA_CACHE, { recursive: true });
  const arquivo = path.join(PASTA_CACHE, `${hash}.mp3`);
  if (!existsSync(arquivo)) {
    const audio = await sintetizar(caso, normalizado);
    const temporario = `${arquivo}.${process.pid}.tmp`;
    writeFileSync(temporario, audio);
    renameSync(temporario, arquivo);
  }
  return { arquivo, duracao_s: duracaoDe(arquivo) };
}

function comPonto(t: string): string {
  const s = t.trim();
  return /[.!?…:]$/.test(s) ? s : `${s}.`;
}

/** Texto falado no cartão de abertura: "<subtítulo>. <título>." */
export function textoAbertura(roteiro: Roteiro): string {
  return `${comPonto(roteiro.abertura.subtitulo)} ${comPonto(roteiro.abertura.titulo)}`;
}

/** Texto falado no cartão de fecho: as linhas unidas. */
export function textoFecho(roteiro: Roteiro): string {
  return roteiro.fecho.linhas.map(comPonto).join(" ");
}

async function principal(): Promise<void> {
  const { caso, roteiro } = argumentos();
  const dados = lerCaso(caso);
  const r = lerRoteiro(caso, roteiro);
  const itens: { id: string; texto: string }[] = [
    { id: "abertura", texto: textoAbertura(r) },
    ...r.passos.map((p) => ({ id: p.id, texto: p.narracao })),
    { id: "fecho", texto: textoFecho(r) },
  ];
  const resultado: { id: string; narracao: string; audio: string; duracao_s: number }[] = [];
  let total = 0;
  for (const it of itens) {
    const { arquivo, duracao_s } = await narrar(dados, it.texto);
    total += duracao_s;
    resultado.push({ id: it.id, narracao: it.texto, audio: arquivo.replace(/\\/g, "/"), duracao_s });
    console.log(`${it.id.padEnd(18)} ${duracao_s.toFixed(2).padStart(6)} s  ${path.basename(arquivo)}`);
  }
  console.log(`${"total".padEnd(18)} ${total.toFixed(2).padStart(6)} s`);
  // Resumo para conferência (não faz parte do contrato; a gravação chama narrar() diretamente).
  writeFileSync(path.join(pastaDeSaida(caso, roteiro), "narracao.json"), JSON.stringify(resultado, null, 2));
}

if (import.meta.main) {
  principal().catch((e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
