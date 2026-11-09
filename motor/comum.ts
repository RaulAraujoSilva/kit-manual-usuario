// Peças comuns do motor: leitura do caso e do roteiro, localização dos alvos na tela, entrada no sistema,
// elementos ocultos e volta ao estado inicial. O motor só usa o sistema pela tela, como um usuário.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { BrowserContext, Locator, Page } from "playwright";
import { parse } from "yaml";

export const RAIZ = path.resolve(import.meta.dirname, "..");

export interface Alvo {
  papel?: string;
  nome?: string;
  nome_comeca?: string;
  exato?: boolean;
  rotulo?: string;
  texto?: string;
  css?: string;
  tem_titulo?: string;
  dentro?: Alvo;
}

export interface Passo {
  id: string;
  narracao: string;
  texto: string;
  alvo: Alvo;
  acao: "clicar" | "enviar_arquivos" | "preencher" | "selecionar" | "nenhuma";
  valor?: string;
  arquivos?: string[];
  campo_arquivos?: Alvo;
  espera_texto?: string;
  captura?: boolean;
  enquadrar?: "detalhe" | "tela";
}

export interface Roteiro {
  id: string;
  titulo: string;
  perfil: string;
  estado?: "inicial" | "atual";
  inicio: string;
  capitulo?: string;
  abertura: { titulo: string; subtitulo: string };
  fecho: { linhas: string[] };
  passos: Passo[];
}

export interface Caso {
  sistema: string;
  orgao: string;
  endereco: string;
  perfis: Record<string, {
    nome: string;
    entrada: { pagina: string; campos: { rotulo: string; exato?: boolean; valor: string }[]; botao: string; espera_url: string };
  }>;
  ocultar: ({ css: string } | { bloco_do_texto: string })[];
  estado?: { restaurar: string[] };
  marca: { cor_primaria: string; cor_texto: string; cor_destaque: string; logotipo: string; logotipo_branco?: string };
  voz: { modelo: string; voz: string; instrucoes?: string };
}

export function pastaDoCaso(caso: string): string {
  return path.join(RAIZ, "casos", caso);
}

export function lerCaso(caso: string): Caso {
  return parse(readFileSync(path.join(pastaDoCaso(caso), "caso.yaml"), "utf8")) as Caso;
}

export function lerRoteiro(caso: string, roteiro: string): Roteiro {
  return parse(readFileSync(path.join(pastaDoCaso(caso), "roteiros", `${roteiro}.yaml`), "utf8")) as Roteiro;
}

/** Pasta de saída de um roteiro (fora do git). */
export function pastaDeSaida(caso: string, roteiro: string, ...sub: string[]): string {
  const p = path.join(RAIZ, "saida", caso, roteiro, ...sub);
  mkdirSync(p, { recursive: true });
  return p;
}

function escaparRegex(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Acha o alvo pelo papel e nome acessível (como os testes ponta a ponta), nunca por coordenada. */
export function localizar(pagina: Page, alvo: Alvo): Locator {
  const base: Page | Locator = alvo.dentro ? localizar(pagina, alvo.dentro) : pagina;
  let loc: Locator;
  if (alvo.papel) {
    const nome = alvo.nome_comeca ? new RegExp(`^${escaparRegex(alvo.nome_comeca)}`) : alvo.nome;
    loc = base.getByRole(alvo.papel as Parameters<Page["getByRole"]>[0], nome === undefined ? {} : { name: nome, exact: alvo.exato });
    if (alvo.tem_titulo) loc = loc.filter({ has: pagina.getByRole("heading", { name: alvo.tem_titulo }) });
  } else if (alvo.rotulo) {
    loc = base.getByLabel(alvo.rotulo, { exact: alvo.exato });
  } else if (alvo.texto) {
    loc = base.getByText(alvo.texto, { exact: alvo.exato });
  } else if (alvo.css) {
    loc = base.locator(alvo.css);
  } else {
    throw new Error(`Alvo sem papel, rótulo, texto ou css: ${JSON.stringify(alvo)}`);
  }
  return loc;
}

/** Script que esconde, em toda página, o que só existe fora da produção (faixa de ambiente, atalhos de teste). */
export function scriptOcultar(caso: Caso): string {
  const css = caso.ocultar.filter((o): o is { css: string } => "css" in o).map((o) => o.css);
  const blocos = caso.ocultar.filter((o): o is { bloco_do_texto: string } => "bloco_do_texto" in o).map((o) => o.bloco_do_texto);
  return `(() => {
    const css = ${JSON.stringify(css)}, blocos = ${JSON.stringify(blocos)};
    const aplicar = () => {
      if (!document.head) return;
      if (!document.getElementById("kit-ocultar")) {
        const s = document.createElement("style"); s.id = "kit-ocultar";
        s.textContent = css.map((c) => c + "{display:none!important}").join("\\n");
        document.head.appendChild(s);
      }
      for (const t of blocos) {
        for (const el of document.querySelectorAll("body *")) {
          if (el.children.length === 0 && el.textContent && el.textContent.trim() === t && el.parentElement) {
            el.parentElement.style.setProperty("display", "none", "important");
          }
        }
      }
    };
    document.addEventListener("DOMContentLoaded", aplicar);
    setInterval(aplicar, 150);
  })();`;
}

export async function prepararContexto(contexto: BrowserContext, caso: Caso): Promise<void> {
  await contexto.addInitScript(scriptOcultar(caso));
}

export async function entrar(pagina: Page, caso: Caso, perfil: string): Promise<void> {
  const p = caso.perfis[perfil];
  if (!p) throw new Error(`Perfil ${perfil} não está no caso.yaml`);
  await pagina.goto(caso.endereco + p.entrada.pagina);
  for (const c of p.entrada.campos) await pagina.getByLabel(c.rotulo, { exact: c.exato }).fill(c.valor);
  await pagina.getByRole("button", { name: p.entrada.botao, exact: true }).click();
  await pagina.waitForURL(new RegExp(escaparRegex(p.entrada.espera_url)));
}

export function restaurarEstado(caso: string, dados: Caso): void {
  const cmds = dados.estado?.restaurar ?? [];
  const dump = path.join(RAIZ, ".cache", "estado-inicial.dump");
  if (cmds.length > 0 && !existsSync(dump)) throw new Error("Falta .cache/estado-inicial.dump (ver README do caso).");
  for (const cmd of cmds) execSync(cmd, { cwd: RAIZ, stdio: ["ignore", "ignore", "pipe"] });
  console.log(`[${caso}] estado inicial restaurado`);
}

export async function esperarCalma(pagina: Page, ms = 400): Promise<void> {
  await pagina.waitForLoadState("networkidle").catch(() => undefined);
  await pagina.waitForTimeout(ms);
}

export function argumentos(): { caso: string; roteiro: string } {
  const [caso, roteiro] = process.argv.slice(2);
  if (!caso || !roteiro) {
    console.error("Uso: node motor/<etapa>.ts <caso> <roteiro>");
    process.exit(2);
  }
  return { caso, roteiro };
}
