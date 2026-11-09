// Etapa 1: executa o roteiro no sistema e grava um print por passo (antes da ação) com a caixa do alvo.
// Uso: node motor/capturar.ts <caso> <roteiro>   (KIT_AMBIENTE=<nome> escolhe a cópia do ambiente)
import { writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";

import { argumentos, emailMaisRecente, entrar, esperarCalma, janela, lerCaso, lerRoteiro, localizar, pastaDeSaida, pastaDoCaso, prepararContexto, prepararEstado } from "./comum.ts";
import type { Caso, Passo, Roteiro } from "./comum.ts";

const ESPERA_LEITURA_MS = 90_000;

export async function executarAcao(pagina: Page, caso: string, passo: Passo, dados: Caso = lerCaso(caso)): Promise<void> {
  const alvo = () => {
    if (!passo.alvo) throw new Error(`Passo ${passo.id}: a ação "${passo.acao}" precisa de alvo`);
    return localizar(pagina, passo.alvo);
  };
  switch (passo.acao) {
    case "clicar":
      await alvo().click();
      break;
    case "preencher": {
      let valor = passo.valor ?? "";
      if (passo.valor_do_email) {
        const { texto } = await emailMaisRecente(dados, passo.valor_do_email.assunto);
        const m = new RegExp(passo.valor_do_email.padrao).exec(texto);
        if (!m?.[1]) throw new Error(`Passo ${passo.id}: padrão não achado no e-mail "${passo.valor_do_email.assunto}"`);
        valor = m[1];
      }
      await alvo().fill(valor);
      break;
    }
    case "enviar_arquivos": {
      const campo = localizar(pagina, passo.campo_arquivos ?? passo.alvo ?? {});
      await campo.setInputFiles((passo.arquivos ?? []).map((a) => path.join(pastaDoCaso(caso), a)));
      break;
    }
    case "selecionar":
      await alvo().selectOption({ label: passo.valor ?? "" });
      break;
    case "abrir":
      await pagina.goto(dados.endereco + (passo.url ?? "/"));
      break;
    case "abrir_email": {
      const msg = await emailMaisRecente(dados, passo.assunto ?? "");
      await pagina.goto(`${dados.caixa_email}/view/${msg.id}.html`);
      // Cabeçalho (assunto, remetente, destinatário) acima do corpo, como num leitor de e-mail; o parágrafo com o
      // endereço do ambiente local some, como a faixa de ambiente de teste (nunca aparece em print nem vídeo).
      await pagina.evaluate(({ assunto, de, para, endereco }) => {
        for (const a of document.querySelectorAll(`a[href^="${endereco}"]`)) (a.closest("p") ?? a).remove();
        // senha (mesmo a provisória fictícia) nunca aparece em texto: vira pontos, como no campo de senha
        const passeio = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = passeio.nextNode(); n; n = passeio.nextNode()) {
          n.textContent = (n.textContent ?? "").replace(/(senha\s+provis[oó]ria\s*:\s*)\S+/gi, "$1••••••••••••");
        }
        const c = document.createElement("div");
        c.setAttribute("style", "font:15px/1.5 'Segoe UI',Roboto,Arial,sans-serif;color:#14243a;padding:18px 8px 14px;border-bottom:1px solid #d5dbe3;margin-bottom:14px");
        const linha = (rotulo: string, valor: string, forte = false) => {
          const p = document.createElement("div");
          const r = document.createElement("span"); r.textContent = `${rotulo}: `; r.style.color = "#4a5b70";
          const v = document.createElement(forte ? "strong" : "span"); v.textContent = valor;
          p.append(r, v); return p;
        };
        const t = document.createElement("h1"); t.textContent = assunto;
        t.setAttribute("style", "font-size:22px;margin:0 0 10px");
        c.append(t, linha("De", de), linha("Para", para));
        document.body.prepend(c);
        document.body.setAttribute("style", "max-width:720px;margin:32px 0 0 48px;font:17px/1.5 Arial,Helvetica,sans-serif;color:#14243a");
      }, { assunto: msg.assunto, de: msg.de, para: msg.para, endereco: dados.endereco });
      break;
    }
    case "nenhuma":
      break;
    default:
      throw new Error(`Passo ${passo.id}: ação desconhecida "${String(passo.acao)}"`);
  }
  if (passo.espera_texto) await pagina.getByText(passo.espera_texto).first().waitFor({ timeout: ESPERA_LEITURA_MS });
  await esperarCalma(pagina, 600);
}

/** Abre o navegador na janela do roteiro (computador ou celular), já dentro do sistema quando o roteiro pede. */
export async function abrirSessao(
  dados: Caso, roteiro: Roteiro, extra: Parameters<Browser["newContext"]>[0] = {},
): Promise<{ navegador: Browser; contexto: BrowserContext; pagina: Page }> {
  const j = janela(roteiro);
  // Chromium completo em português: campos de data em dd/mm/aaaa e "Escolher arquivo" (o modo headless enxuto só
  // tem os textos em inglês: mm/dd/yyyy, "Choose File")
  const navegador = await chromium.launch({ channel: "chromium", args: ["--lang=pt-BR"] });
  const base = { viewport: j.viewport, locale: "pt-BR", isMobile: j.celular, hasTouch: j.celular };
  let storageState: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
  if (!roteiro.sem_entrada) {
    const ctx = await navegador.newContext(base);
    await prepararContexto(ctx, dados);
    const p = await ctx.newPage();
    await entrar(p, dados, roteiro.perfil);
    storageState = await ctx.storageState();
    await ctx.close();
  }
  const contexto = await navegador.newContext({ ...base, deviceScaleFactor: j.escala, storageState, ...extra });
  await prepararContexto(contexto, dados);
  const pagina = await contexto.newPage();
  return { navegador, contexto, pagina };
}

async function capturar(caso: string, nomeRoteiro: string, dados: Caso): Promise<void> {
  const roteiro = lerRoteiro(caso, nomeRoteiro);
  prepararEstado(caso, dados, roteiro.estado);
  const saida = pastaDeSaida(caso, nomeRoteiro, "capturas");
  const j = janela(roteiro);

  const { navegador, pagina } = await abrirSessao(dados, roteiro);
  await pagina.goto(dados.endereco + roteiro.inicio);
  await esperarCalma(pagina);

  const capturas = [];
  for (const [i, passo] of roteiro.passos.entries()) {
    const numero = i + 1;
    if (passo.alvo) {
      const alvo = localizar(pagina, passo.alvo);
      await alvo.waitFor({ state: "visible", timeout: ESPERA_LEITURA_MS }).catch((e: unknown) => {
        throw new Error(`Passo ${numero} (${passo.id}): alvo não encontrado ${JSON.stringify(passo.alvo)}\n${String(e)}`);
      });
      if (passo.captura) {
        // centraliza o alvo na janela (o print é da janela, não da página inteira)
        await alvo.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
        await pagina.waitForTimeout(350);
        const caixa = await alvo.boundingBox();
        const arquivo = `${String(numero).padStart(2, "0")}-${passo.id}.png`;
        await pagina.screenshot({ path: path.join(saida, arquivo), animations: "disabled", caret: "hide" });
        const tela = (await pagina.locator("h1").first().textContent({ timeout: 500 }).catch(() => null))?.trim() || null;
        capturas.push({
          numero, passo: passo.id, arquivo, texto: passo.texto, acao: passo.acao, enquadrar: passo.enquadrar ?? "detalhe", tela,
          // caminho da tela (sem consulta): o rascunho da base da ajuda tira daqui o catálogo de telas (base-ajuda.ts)
          caminho: new URL(pagina.url()).pathname,
          caixa: caixa && { x: Math.round(caixa.x), y: Math.round(caixa.y), largura: Math.round(caixa.width), altura: Math.round(caixa.height) },
        });
        console.log(`  ${arquivo}`);
      }
    } else if (passo.captura) {
      console.warn(`  passo ${numero} (${passo.id}) sem alvo: sem captura`);
    }
    await executarAcao(pagina, caso, passo, dados);
  }
  writeFileSync(path.join(saida, "caixas.json"), JSON.stringify({
    caso, roteiro: nomeRoteiro, titulo: roteiro.titulo,
    viewport: { largura: j.viewport.width, altura: j.viewport.height }, escala: j.escala, capturas,
  }, null, 2));
  await navegador.close();
  console.log(`[${caso}/${nomeRoteiro}] ${capturas.length} capturas em ${path.relative(process.cwd(), saida)}`);
}

if (import.meta.main) {
  const { caso, roteiro } = argumentos();
  await capturar(caso, roteiro, lerCaso(caso));
}
