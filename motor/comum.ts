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
  /** Opcional só nas ações sem alvo na tela (abrir, abrir_email); passo sem alvo não tem captura. */
  alvo?: Alvo;
  acao: "clicar" | "enviar_arquivos" | "preencher" | "selecionar" | "abrir" | "abrir_email" | "nenhuma";
  valor?: string;
  /** abrir: caminho no sistema (ex.: /servidor). */
  url?: string;
  /** abrir_email: trecho do assunto do e-mail mais recente a abrir na caixa de teste. */
  assunto?: string;
  /** preencher: o valor vem do e-mail mais recente com esse assunto (grupo 1 do padrão), ex.: senha provisória. */
  valor_do_email?: { assunto: string; padrao: string };
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
  /** inicial (padrão), atual (não restaura) ou o nome de uma cópia salva com `node motor/estado.ts salvar <nome>`. */
  estado?: string;
  /** Começa sem entrar no sistema (roteiros da própria tela de entrada). */
  sem_entrada?: boolean;
  /** Janela de computador (padrão) ou de celular. */
  tela?: "computador" | "celular";
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
  /** Caixa de e-mails de teste (Mailpit), onde chegam avisos e senhas provisórias. */
  caixa_email?: string;
  /** Cópias do ambiente em portas próprias, para gravar em paralelo. Escolha com KIT_AMBIENTE=<nome>. */
  ambientes?: Record<string, { endereco: string; caixa_email?: string; vars?: Record<string, string> }>;
  /** Variáveis usadas como {nome} nos comandos de estado; vêm do ambiente escolhido. */
  vars?: Record<string, string>;
  perfis: Record<string, {
    nome: string;
    entrada: { pagina: string; campos: { rotulo: string; exato?: boolean; valor: string }[]; botao: string; espera_url: string };
  }>;
  ocultar: ({ css: string } | { bloco_do_texto: string })[];
  estado?: { restaurar: string[]; salvar?: string[] };
  marca: { cor_primaria: string; cor_texto: string; cor_destaque: string; logotipo: string; logotipo_branco?: string };
  voz: { modelo: string; voz: string; instrucoes?: string };
}

export function pastaDoCaso(caso: string): string {
  return path.join(RAIZ, "casos", caso);
}

export function lerCaso(caso: string): Caso {
  const dados = parse(readFileSync(path.join(pastaDoCaso(caso), "caso.yaml"), "utf8")) as Caso;
  const nomes = Object.keys(dados.ambientes ?? {});
  const escolhido = process.env.KIT_AMBIENTE ?? nomes[0];
  if (escolhido && dados.ambientes) {
    const amb = dados.ambientes[escolhido];
    if (!amb) throw new Error(`Ambiente ${escolhido} não está no caso.yaml (há: ${nomes.join(", ")})`);
    dados.endereco = amb.endereco;
    if (amb.caixa_email) dados.caixa_email = amb.caixa_email;
    dados.vars = { ...(dados.vars ?? {}), ...(amb.vars ?? {}) };
  }
  return dados;
}

/** Mensagem mais recente da caixa de teste cujo assunto contém o trecho dado. */
export async function emailMaisRecente(dados: Caso, assunto: string): Promise<{ id: string; texto: string }> {
  if (!dados.caixa_email) throw new Error("caso.yaml sem caixa_email");
  const busca = await fetch(`${dados.caixa_email}/api/v1/search?limit=1&query=${encodeURIComponent(`subject:"${assunto}"`)}`);
  const lista = (await busca.json()) as { messages?: { ID: string }[] };
  const id = lista.messages?.[0]?.ID;
  if (!id) throw new Error(`Nenhum e-mail com assunto "${assunto}" na caixa de teste`);
  const msg = (await (await fetch(`${dados.caixa_email}/api/v1/message/${id}`)).json()) as { Text?: string };
  return { id, texto: msg.Text ?? "" };
}

/** Janela e escala de captura: computador 1440×900 ×2; celular 390×844 ×3. */
export function janela(roteiro: Roteiro): { viewport: { width: number; height: number }; escala: number; celular: boolean } {
  return roteiro.tela === "celular"
    ? { viewport: { width: 390, height: 844 }, escala: 3, celular: true }
    : { viewport: { width: 1440, height: 900 }, escala: 2, celular: false };
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

export function arquivoDeEstado(nome: string): string {
  if (!/^[\w-]+$/.test(nome)) throw new Error(`Nome de estado inválido: ${nome}`);
  return path.join(".cache", `estado-${nome}.dump`);
}

function rodarComandos(cmds: string[], dados: Caso, extra: Record<string, string>): void {
  const vars = { ...(dados.vars ?? {}), ...extra };
  for (const modelo of cmds) {
    const cmd = modelo.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
    execSync(cmd, { cwd: RAIZ, stdio: ["ignore", "ignore", "pipe"] });
  }
}

/** Volta o banco do ambiente escolhido a uma cópia salva (padrão: o estado inicial, logo depois da carga de teste). */
export function restaurarEstado(caso: string, dados: Caso, nome = "inicial"): void {
  const dump = arquivoDeEstado(nome);
  if (!existsSync(path.join(RAIZ, dump))) throw new Error(`Falta ${dump} (ver README do caso).`);
  rodarComandos(dados.estado?.restaurar ?? [], dados, { dump: dump.split(path.sep).join("/") });
  console.log(`[${caso}] estado ${nome} restaurado`);
}

/** Salva o banco do ambiente escolhido como uma cópia nomeada, para roteiros que partem de um estado intermediário. */
export function salvarEstado(caso: string, dados: Caso, nome: string): void {
  const dump = arquivoDeEstado(nome);
  rodarComandos(dados.estado?.salvar ?? [], dados, { dump: dump.split(path.sep).join("/") });
  console.log(`[${caso}] estado ${nome} salvo em ${dump}`);
}

/** Restaura conforme o roteiro: nada em "atual", a cópia nomeada, ou o inicial. */
export function prepararEstado(caso: string, dados: Caso, estado: string | undefined): void {
  if (estado === "atual") return;
  restaurarEstado(caso, dados, estado ?? "inicial");
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
