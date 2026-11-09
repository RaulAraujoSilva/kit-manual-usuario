// Etapa 1: executa o roteiro no sistema e grava um print por passo (antes da ação) com a caixa do alvo.
// Uso: node motor/capturar.ts <caso> <roteiro>
import { writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { argumentos, entrar, esperarCalma, lerCaso, lerRoteiro, localizar, pastaDeSaida, pastaDoCaso, prepararContexto, restaurarEstado } from "./comum.ts";
import type { Caso, Passo } from "./comum.ts";
import type { Page } from "playwright";

const VIEWPORT = { width: 1440, height: 900 };
const ESCALA = 2;
const ESPERA_LEITURA_MS = 90_000;

export async function executarAcao(pagina: Page, caso: string, passo: Passo): Promise<void> {
  const alvo = localizar(pagina, passo.alvo);
  switch (passo.acao) {
    case "clicar":
      await alvo.click();
      break;
    case "preencher":
      await alvo.fill(passo.valor ?? "");
      break;
    case "enviar_arquivos": {
      const campo = localizar(pagina, passo.campo_arquivos ?? passo.alvo);
      await campo.setInputFiles((passo.arquivos ?? []).map((a) => path.join(pastaDoCaso(caso), a)));
      break;
    }
    case "selecionar":
      await alvo.selectOption({ label: passo.valor ?? "" });
      break;
    case "nenhuma":
      break;
    default:
      throw new Error(`Passo ${passo.id}: ação desconhecida "${String(passo.acao)}"`);
  }
  if (passo.espera_texto) await pagina.getByText(passo.espera_texto).waitFor({ timeout: ESPERA_LEITURA_MS });
  await esperarCalma(pagina, 600);
}

async function capturar(caso: string, nomeRoteiro: string, dados: Caso): Promise<void> {
  const roteiro = lerRoteiro(caso, nomeRoteiro);
  if (roteiro.estado !== "atual") restaurarEstado(caso, dados);
  const saida = pastaDeSaida(caso, nomeRoteiro, "capturas");

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: VIEWPORT, deviceScaleFactor: ESCALA, locale: "pt-BR" });
  await prepararContexto(contexto, dados);
  const pagina = await contexto.newPage();
  await entrar(pagina, dados, roteiro.perfil);
  await pagina.goto(dados.endereco + roteiro.inicio);
  await esperarCalma(pagina);

  const capturas = [];
  for (const [i, passo] of roteiro.passos.entries()) {
    const numero = i + 1;
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
      capturas.push({
        numero, passo: passo.id, arquivo, texto: passo.texto, acao: passo.acao, enquadrar: passo.enquadrar ?? "detalhe",
        caixa: caixa && { x: Math.round(caixa.x), y: Math.round(caixa.y), largura: Math.round(caixa.width), altura: Math.round(caixa.height) },
      });
      console.log(`  ${arquivo}`);
    }
    await executarAcao(pagina, caso, passo);
  }
  writeFileSync(path.join(saida, "caixas.json"), JSON.stringify({
    caso, roteiro: nomeRoteiro, titulo: roteiro.titulo,
    viewport: { largura: VIEWPORT.width, altura: VIEWPORT.height }, escala: ESCALA, capturas,
  }, null, 2));
  await navegador.close();
  console.log(`[${caso}/${nomeRoteiro}] ${capturas.length} capturas em ${path.relative(process.cwd(), saida)}`);
}

if (import.meta.main) {
  const { caso, roteiro } = argumentos();
  await capturar(caso, roteiro, lerCaso(caso));
}
