// Etapa de vídeo: grava o roteiro no sistema com cursor visível e destaque antes de cada ação. O áudio de cada passo
// é gerado antes; cada passo dura o tempo da sua narração. Saída: video/bruto.mp4 + video/linha-do-tempo.json.
// A imagem vem quadro a quadro do próprio Chromium (screencast), na resolução do aparelho (1280×720 × 1,5 = 1920×1080):
// a gravação de vídeo do Playwright não amplia a página e sai em qualidade baixa.
// Uso: node motor/gravar.ts <caso> <roteiro>
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import type { Page } from "playwright";

import { executarAcao } from "./capturar.ts";
import { argumentos, entrar, esperarCalma, lerCaso, lerRoteiro, localizar, pastaDeSaida, prepararContexto, restaurarEstado } from "./comum.ts";
import type { Caso, Passo } from "./comum.ts";
import { narrar, textoAbertura, textoFecho } from "./narrar.ts";

const VIEWPORT = { width: 1280, height: 720 };
const ESCALA = 1.5;
const VIDEO = { width: 1920, height: 1080 };
const PAUSA_ENTRE_PASSOS_S = 0.6;

/** Cursor desenhado na página (o Playwright não mostra o do sistema), efeito de clique, destaque e "arquivos escolhidos". */
function scriptCena(cor: string): string {
  return `(() => {
    const COR = ${JSON.stringify(cor)};
    const montar = () => {
      if (!document.body || document.getElementById("kit-cursor")) return;
      const s = document.createElement("style");
      s.textContent = \`
        #kit-cursor{position:fixed;left:0;top:0;width:30px;height:30px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
        .kit-clique{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid \${COR};z-index:2147483646;pointer-events:none;animation:kit-onda .55s ease-out forwards}
        @keyframes kit-onda{to{transform:scale(3.4);opacity:0}}
        #kit-destaque{position:fixed;z-index:2147483645;pointer-events:none;border:4px solid \${COR};border-radius:12px;box-shadow:0 0 0 4px #fff,0 0 0 9999px rgba(15,23,42,.18);opacity:0;transition:opacity .35s, box-shadow .35s}
        #kit-destaque.on{opacity:1;animation:kit-pulso 1.1s ease-in-out infinite alternate}
        @keyframes kit-pulso{from{outline:0 solid transparent}to{outline:6px solid \${COR}33}}
        #kit-arquivos{position:fixed;z-index:2147483646;pointer-events:none;background:#fff;border-radius:12px;box-shadow:0 12px 32px rgba(15,23,42,.25);padding:14px 18px;font:15px/1.4 "Segoe UI",Roboto,Arial,sans-serif;color:#14243a;min-width:340px;opacity:0;transform:translateY(6px);transition:opacity .3s, transform .3s}
        #kit-arquivos.on{opacity:1;transform:none}
        #kit-arquivos b{display:block;margin-bottom:8px;font-size:14px;color:#4a5b70;font-weight:600}
        #kit-arquivos div{display:flex;gap:10px;align-items:center;padding:5px 0}
        #kit-arquivos i{font-style:normal;font-size:11px;font-weight:700;color:#fff;background:#c62828;border-radius:4px;padding:2px 5px}\`;
      document.head.appendChild(s);
      const c = document.createElement("div");
      c.id = "kit-cursor";
      c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      const pos = JSON.parse(sessionStorage.getItem("kit-pos") || "[640,360]");
      c.style.left = pos[0] + "px"; c.style.top = pos[1] + "px";
      document.body.appendChild(c);
    };
    document.addEventListener("DOMContentLoaded", montar); setInterval(montar, 100);
    addEventListener("mousemove", (e) => {
      const c = document.getElementById("kit-cursor");
      if (c) { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }
      sessionStorage.setItem("kit-pos", JSON.stringify([e.clientX, e.clientY]));
    }, true);
    addEventListener("mousedown", (e) => {
      const o = document.createElement("div"); o.className = "kit-clique";
      o.style.left = e.clientX + "px"; o.style.top = e.clientY + "px";
      document.body.appendChild(o); setTimeout(() => o.remove(), 700);
    }, true);
    window.__kitDestaque = (r) => {
      let d = document.getElementById("kit-destaque");
      if (!d) { d = document.createElement("div"); d.id = "kit-destaque"; document.body.appendChild(d); }
      const f = 8;
      Object.assign(d.style, { left: (r.x - f) + "px", top: (r.y - f) + "px", width: (r.w + 2 * f) + "px", height: (r.h + 2 * f) + "px" });
      requestAnimationFrame(() => d.classList.add("on"));
    };
    window.__kitLimpar = () => { const d = document.getElementById("kit-destaque"); if (d) d.classList.remove("on"); };
    window.__kitArquivos = (nomes, r) => {
      const a = document.createElement("div"); a.id = "kit-arquivos";
      a.innerHTML = "<b>Arquivos escolhidos</b>" + nomes.map((n) => "<div><i>PDF</i>" + n + "</div>").join("");
      a.style.left = Math.max(16, r.x) + "px";
      document.body.appendChild(a);
      const alto = a.offsetHeight, abaixo = r.y + r.h + 14;
      a.style.top = (abaixo + alto <= innerHeight - 12 ? abaixo : Math.max(12, r.y - alto - 14)) + "px";
      requestAnimationFrame(() => a.classList.add("on"));
      setTimeout(() => { a.classList.remove("on"); setTimeout(() => a.remove(), 400); }, 1900);
    };
  })();`;
}

declare global {
  interface Window {
    __kitDestaque: (r: { x: number; y: number; w: number; h: number }) => void;
    __kitLimpar: () => void;
    __kitArquivos: (nomes: string[], r: { x: number; y: number; w: number; h: number }) => void;
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

class Relogio {
  readonly t0 = Date.now();
  agora(): number { return (Date.now() - this.t0) / 1000; }
  async ate(s: number): Promise<void> { await espera((s - this.agora()) * 1000); }
}

let cursor = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

/** Movimento do mouse com aceleração suave (o cursor desenhado acompanha os eventos). */
async function moverPara(pagina: Page, x: number, y: number, ms = 650): Promise<void> {
  const passos = Math.max(8, Math.round(ms / 16));
  const { x: x0, y: y0 } = cursor;
  for (let i = 1; i <= passos; i++) {
    const t = i / passos;
    const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    await pagina.mouse.move(x0 + (x - x0) * k, y0 + (y - y0) * k);
    await espera(16);
  }
  cursor = { x, y };
}

async function trazerParaVista(pagina: Page, passo: Passo): Promise<{ x: number; y: number; w: number; h: number }> {
  const alvo = localizar(pagina, passo.alvo);
  await alvo.waitFor({ state: "visible", timeout: 90_000 });
  let c = await alvo.boundingBox();
  if (!c) throw new Error(`Passo ${passo.id}: alvo sem caixa`);
  const cabe = c.y >= 70 && c.y + c.height <= VIEWPORT.height - 10;
  if (!cabe) {
    const alto = c.height > VIEWPORT.height * 0.7;
    await alvo.evaluate((el, alto) => {
      el.scrollIntoView({ behavior: "smooth", block: alto ? "start" : "center" });
      if (alto) setTimeout(() => scrollBy({ top: -90, behavior: "smooth" }), 450);
    }, alto);
    await espera(alto ? 1100 : 750);
    c = (await alvo.boundingBox()) ?? c;
  }
  return { x: c.x, y: c.y, w: c.width, h: c.height };
}

async function gravar(caso: string, nomeRoteiro: string, dados: Caso): Promise<void> {
  const roteiro = lerRoteiro(caso, nomeRoteiro);
  const saida = pastaDeSaida(caso, nomeRoteiro, "video");

  // 1. narração antes da gravação: cada passo dura o tempo da sua fala
  const abertura = await narrar(dados, textoAbertura(roteiro));
  const fecho = await narrar(dados, textoFecho(roteiro));
  const falas = [];
  for (const p of roteiro.passos) falas.push(await narrar(dados, p.narracao));
  console.log(`narração pronta: ${falas.reduce((s, f) => s + f.duracao_s, 0).toFixed(1)} s nos passos`);

  if (roteiro.estado !== "atual") restaurarEstado(caso, dados);
  const navegador = await chromium.launch();

  // 2. entrada fora da gravação
  const ctxEntrada = await navegador.newContext({ viewport: VIEWPORT, locale: "pt-BR" });
  const pEntrada = await ctxEntrada.newPage();
  await entrar(pEntrada, dados, roteiro.perfil);
  const sessao = await ctxEntrada.storageState();
  await ctxEntrada.close();

  // 3. gravação
  const pastaQuadros = path.join(saida, "quadros");
  rmSync(pastaQuadros, { recursive: true, force: true });
  mkdirSync(pastaQuadros, { recursive: true });
  const contexto = await navegador.newContext({ viewport: VIEWPORT, deviceScaleFactor: ESCALA, locale: "pt-BR", storageState: sessao });
  await prepararContexto(contexto, dados);
  await contexto.addInitScript(scriptCena(dados.marca.cor_destaque));
  const pagina = await contexto.newPage();
  const relogio = new Relogio();
  const quadros: { arquivo: string; t: number }[] = [];
  const cdp = await contexto.newCDPSession(pagina);
  cdp.on("Page.screencastFrame", (f) => {
    const t = (f.metadata.timestamp ?? Date.now() / 1000) - relogio.t0 / 1000;
    const arquivo = path.join(pastaQuadros, `${String(quadros.length).padStart(6, "0")}.jpg`);
    writeFileSync(arquivo, Buffer.from(f.data, "base64"));
    quadros.push({ arquivo, t });
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: VIDEO.width, maxHeight: VIDEO.height, everyNthFrame: 1 });
  await pagina.goto(dados.endereco + roteiro.inicio);
  await esperarCalma(pagina, 800);
  await pagina.mouse.move(cursor.x, cursor.y);
  await espera(300);
  const corteInicio = relogio.agora();

  const linha = [];
  for (const [i, passo] of roteiro.passos.entries()) {
    const fala = falas[i];
    if (!fala) throw new Error("fala ausente");
    const inicio = relogio.agora();
    linha.push({ id: passo.id, narracao: passo.narracao, audio: fala.arquivo, inicio_s: Number(inicio.toFixed(3)), duracao_s: fala.duracao_s });
    const r = await trazerParaVista(pagina, passo);
    const centro = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    await pagina.evaluate((r) => window.__kitDestaque(r), r);
    if (passo.acao !== "nenhuma") {
      await moverPara(pagina, centro.x, centro.y);
      // a ação acontece perto do fim da frase ("…clique em X")
      await relogio.ate(inicio + Math.max(1.4, fala.duracao_s - 0.9));
      await pagina.evaluate(() => window.__kitLimpar());
      if (passo.acao === "clicar") {
        await pagina.mouse.click(centro.x, centro.y);
        await esperarCalma(pagina, 500);
        if (passo.espera_texto) await pagina.getByText(passo.espera_texto).waitFor({ timeout: 90_000 });
      } else {
        await pagina.mouse.down(); await pagina.mouse.up();
        if (passo.acao === "enviar_arquivos") {
          await pagina.evaluate(([n, r]) => window.__kitArquivos(n, r), [(passo.arquivos ?? []).map((a) => path.basename(a)), r] as const);
          await espera(1500);
        }
        await executarAcao(pagina, caso, passo);
      }
    } else {
      // passo de leitura: o cursor vai para o lado, o destaque fica enquanto a fala explica
      await moverPara(pagina, Math.min(VIEWPORT.width - 40, r.x + r.w + 30), Math.min(VIEWPORT.height - 40, r.y + 30), 800);
      await relogio.ate(inicio + fala.duracao_s - 0.2);
      await pagina.evaluate(() => window.__kitLimpar());
    }
    await relogio.ate(inicio + fala.duracao_s + PAUSA_ENTRE_PASSOS_S);
    console.log(`  ${passo.id}: ${inicio.toFixed(1)} s (+${fala.duracao_s.toFixed(1)} s)`);
  }
  await espera(1200);
  const corteFim = relogio.agora();
  await cdp.send("Page.stopScreencast").catch(() => undefined);
  await contexto.close();
  await navegador.close();
  montarBruto(quadros, corteFim + 0.5, saida);
  rmSync(pastaQuadros, { recursive: true, force: true });

  writeFileSync(path.join(saida, "linha-do-tempo.json"), JSON.stringify({
    largura: VIDEO.width, altura: VIDEO.height,
    corte_inicio_s: Number(corteInicio.toFixed(3)), corte_fim_s: Number(corteFim.toFixed(3)),
    abertura: { ...roteiro.abertura, narracao: textoAbertura(roteiro), audio: abertura.arquivo, duracao_s: abertura.duracao_s },
    passos: linha,
    fecho: { linhas: roteiro.fecho.linhas, narracao: textoFecho(roteiro), audio: fecho.arquivo, duracao_s: fecho.duracao_s },
  }, null, 2));
  console.log(`[${caso}/${nomeRoteiro}] vídeo bruto de ${(corteFim - corteInicio).toFixed(1)} s em ${path.relative(process.cwd(), saida)}`);
}

/** Junta os quadros (que chegam só quando a tela muda) num vídeo de 30 quadros por segundo com os tempos reais. */
function montarBruto(quadros: { arquivo: string; t: number }[], fim: number, saida: string): void {
  if (quadros.length === 0) throw new Error("nenhum quadro gravado");
  const linhas: string[] = [];
  quadros.forEach((q, i) => {
    const inicio = i === 0 ? 0 : q.t;
    const prox = quadros[i + 1]?.t ?? fim;
    linhas.push(`file '${q.arquivo.split(path.sep).join("/")}'`, `duration ${Math.max(0.001, prox - inicio).toFixed(4)}`);
  });
  const ultimo = quadros[quadros.length - 1];
  if (ultimo) linhas.push(`file '${ultimo.arquivo.split(path.sep).join("/")}'`);
  const lista = path.join(saida, "quadros.txt");
  writeFileSync(lista, linhas.join("\n"));
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista,
    "-vf", `fps=30,scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", path.join(saida, "bruto.mp4")]);
  rmSync(lista, { force: true });
  console.log(`  ${quadros.length} quadros → bruto.mp4`);
}

if (import.meta.main) {
  const { caso, roteiro } = argumentos();
  await gravar(caso, roteiro, lerCaso(caso));
}

