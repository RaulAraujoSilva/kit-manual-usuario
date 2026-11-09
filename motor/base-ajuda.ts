// Rascunho da base de conhecimento da ajuda no sistema (docs/PADRAO_AJUDA_E_ASSISTENTE.md), tirado do próprio manual:
// - guias/<PERFIL>.md: os capítulos em texto, com o passo a passo dos roteiros no lugar de {{passos}} e sem imagens;
// - telas-rascunho.json: as telas que os roteiros visitam (caminho e título de cada captura), com os perfis e as tarefas;
// - perguntas-candidatas.json: um candidato por item de "Se der errado" (e de "O que acontece depois"), para curadoria.
// O rascunho NÃO é a base final: telas e perguntas passam por curadoria (nomes da interface, ordem, destino) e o
// `regras.md` sai da especificação. A base final fica no repositório do sistema e passa por `checar-ajuda.ts`.
// Uso: node motor/base-ajuda.ts <caso>   → saida/<caso>/ajuda/
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { RAIZ, lerCaso, lerRoteiro, pastaDoCaso } from "./comum.ts";
import type { Roteiro } from "./comum.ts";

interface TelaRascunho {
  rota: string;
  perfis: string[];
  nome: string;
  paraQueServe: string;
  acoes: string[];
}

interface PerguntaCandidata {
  id: string;
  perfis: string[];
  assunto: string;
  telas: string[];
  pergunta: string;
  resposta: string;
  origem: string;
}

/** Segmento dinâmico do caminho (identificador, número) vira [id], como na rota da aplicação. */
export function rotaDoCaminho(caminho: string): string {
  const limpo = caminho.split(/[?#]/)[0] ?? "/";
  const partes = limpo.split("/").map((p) => (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(p) || /^\d+$/.test(p) ? "[id]" : p));
  const rota = partes.join("/").replace(/\/+$/, "");
  return rota === "" ? "/" : rota;
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

/** O passo a passo de um roteiro em lista numerada (o texto de cada passo, como no PDF). */
export function passosEmTexto(roteiro: Roteiro): string {
  return roteiro.passos
    .filter((p) => p.texto.trim() !== "")
    .map((p, i) => `${i + 1}. ${p.texto.trim()}`)
    .join("\n");
}

/** O capítulo em texto para o guia: {{passos}} preenchido, sem imagens, títulos um nível abaixo. */
export function capituloEmTexto(md: string, roteiroDoCapitulo: Roteiro | null, ler: (id: string) => Roteiro): string {
  return md
    .replace(/^\{\{passos:([\w-]+)\}\}\s*$/gm, (_m, id: string) => passosEmTexto(ler(id)))
    .replace(/^\{\{passos\}\}\s*$/gm, () => (roteiroDoCapitulo === null ? "" : passosEmTexto(roteiroDoCapitulo)))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/^(#{1,5}) /gm, "#$1 ")
    .trim();
}

/** Itens de uma seção "## <titulo>" do capítulo: cada marcador vira { título em negrito ou aspas, resto }. */
export function itensDaSecao(md: string, titulo: RegExp): { chave: string; texto: string }[] {
  const linhas = md.split(/\r?\n/);
  const inicio = linhas.findIndex((l) => /^##\s/.test(l) && titulo.test(l));
  if (inicio < 0) return [];
  const fim = linhas.findIndex((l, i) => i > inicio && /^##\s/.test(l));
  const corpo = linhas.slice(inicio + 1, fim < 0 ? undefined : fim).join("\n");
  const itens = corpo.split(/\n(?=- )/).map((b) => b.replace(/^- /, "").replace(/\s*\n\s*/g, " ").trim()).filter((b) => b !== "");
  return itens.map((item) => {
    const m = /^(\*\*([^*]+)\*\*|"([^"]+)"|“([^”]+)”)\s*(.*)$/.exec(item);
    const chave = (m?.[2] ?? m?.[3] ?? m?.[4] ?? item.split(/[.:]/)[0] ?? item).trim().replace(/[.:]$/, "");
    const resto = (m?.[5] ?? item).trim();
    // "**Cinco tentativas erradas** bloqueiam…": o negrito é o começo da frase, a resposta é a frase inteira
    return { chave, texto: /^\p{Ll}/u.test(resto) ? `${chave} ${resto}` : resto };
  });
}

function lerCapturas(caso: string, roteiro: string): { caminho?: string; tela?: string | null }[] {
  const arq = path.join(RAIZ, "saida", caso, roteiro, "capturas", "caixas.json");
  if (!existsSync(arq)) return [];
  return (JSON.parse(readFileSync(arq, "utf8")) as { capturas: { caminho?: string; tela?: string | null }[] }).capturas;
}

function gerar(caso: string): void {
  const dados = lerCaso(caso);
  const codigo = (perfil: string) => dados.ajuda?.perfis?.[perfil] ?? perfil;
  const pc = pastaDoCaso(caso);
  const roteiros = new Map<string, Roteiro>();
  for (const f of readdirSync(path.join(pc, "roteiros")).filter((x) => x.endsWith(".yaml"))) {
    const r = lerRoteiro(caso, path.basename(f, ".yaml"));
    roteiros.set(r.id, r);
  }
  const ler = (id: string) => {
    const r = roteiros.get(id);
    if (!r) throw new Error(`roteiro ${id} citado num capítulo não existe`);
    return r;
  };

  // ordem dos capítulos: a dos manuais; capítulo fora dos manuais vai no fim
  const ordem: string[] = [];
  const perfilDoManual = new Map<string, string>();
  const pastaManuais = path.join(pc, "manuais");
  for (const f of existsSync(pastaManuais) ? readdirSync(pastaManuais).filter((x) => x.endsWith(".yaml")) : []) {
    const m = parse(readFileSync(path.join(pastaManuais, f), "utf8")) as { perfil: string; capitulos: (string | { capitulo: string })[] };
    for (const c of m.capitulos) {
      const id = typeof c === "string" ? c : path.basename(c.capitulo, ".md");
      ordem.push(id);
      perfilDoManual.set(id, m.perfil);
    }
  }
  const capitulos = readdirSync(path.join(pc, "capitulos")).filter((x) => x.endsWith(".md")).map((f) => path.basename(f, ".md"));
  capitulos.sort((a, b) => (ordem.indexOf(a) < 0 ? 1e6 : ordem.indexOf(a)) - (ordem.indexOf(b) < 0 ? 1e6 : ordem.indexOf(b)));

  const guias = new Map<string, string[]>();
  const telas = new Map<string, TelaRascunho>();
  const perguntas: PerguntaCandidata[] = [];

  for (const id of capitulos) {
    const md = readFileSync(path.join(pc, "capitulos", `${id}.md`), "utf8");
    const doCapitulo = roteiros.get(id) ?? null;
    const citados = [...md.matchAll(/\{\{passos:([\w-]+)\}\}/g)].map((m) => ler(m[1] ?? ""));
    const envolvidos = [...(doCapitulo ? [doCapitulo] : []), ...citados];
    // o perfil do roteiro do capítulo; capítulo sem roteiro (visão geral) fica com o perfil do manual em que está
    const perfil = codigo(envolvidos[0]?.perfil ?? perfilDoManual.get(id) ?? "geral");

    // telas: caminho e título de cada captura (com o caminho gravado pela captura) ou o início e os "abrir" do roteiro
    const rotasDoCapitulo = new Set<string>();
    for (const r of envolvidos) {
      const capturas = lerCapturas(caso, r.id);
      const vistas = capturas.filter((c) => c.caminho).map((c) => ({ rota: rotaDoCaminho(c.caminho ?? "/"), nome: c.tela ?? "" }));
      const declaradas = [r.inicio, ...r.passos.filter((p) => p.acao === "abrir" && p.url).map((p) => p.url ?? "/")].map((u) => ({ rota: rotaDoCaminho(u), nome: "" }));
      for (const { rota, nome } of [...vistas, ...declaradas]) {
        if (r.sem_entrada) continue;
        rotasDoCapitulo.add(rota);
        const tela = telas.get(rota) ?? { rota, perfis: [], nome: "", paraQueServe: "", acoes: [] };
        if (!tela.perfis.includes(codigo(r.perfil))) tela.perfis.push(codigo(r.perfil));
        if (tela.nome === "" && nome !== "") tela.nome = nome;
        if (!tela.acoes.includes(r.titulo)) tela.acoes.push(r.titulo);
        telas.set(rota, tela);
      }
    }

    const texto = capituloEmTexto(md, doCapitulo, ler);
    const linhasDeTela = [...rotasDoCapitulo].map((r) => `Tela: ${r}`).join("\n");
    const comTelas = linhasDeTela === "" ? texto : texto.replace(/^(##\s.+)$/m, (titulo) => `${titulo}\n\n${linhasDeTela}`);
    guias.set(perfil, [...(guias.get(perfil) ?? []), comTelas]);

    for (const [secao, assunto] of [[/se der errado/i, "Se der errado"], [/o que acontece depois/i, "O que acontece depois"]] as const) {
      for (const item of itensDaSecao(md, secao)) {
        perguntas.push({
          id: `${perfil.toLowerCase()}-${slug(item.chave)}`,
          perfis: [perfil],
          assunto,
          telas: [...rotasDoCapitulo],
          pergunta: item.chave,
          resposta: item.texto,
          origem: `capitulos/${id}.md`,
        });
      }
    }
  }

  const saida = path.join(RAIZ, "saida", caso, "ajuda");
  rmSync(saida, { recursive: true, force: true });
  mkdirSync(path.join(saida, "guias"), { recursive: true });
  for (const [perfil, partes] of guias) {
    writeFileSync(path.join(saida, "guias", `${perfil}.md`), `# Guia: ${perfil}\n\n${partes.join("\n\n")}\n`);
  }
  writeFileSync(path.join(saida, "telas-rascunho.json"), `${JSON.stringify([...telas.values()].sort((a, b) => a.rota.localeCompare(b.rota)), null, 2)}\n`);
  writeFileSync(path.join(saida, "perguntas-candidatas.json"), `${JSON.stringify(perguntas, null, 2)}\n`);
  console.log(
    `[${caso}] ${guias.size} guias, ${telas.size} telas, ${perguntas.length} perguntas candidatas → ${path.relative(process.cwd(), saida)}` +
      "\nPróximo passo: curadoria (docs/PADRAO_AJUDA_E_ASSISTENTE.md, etapa B) e `node motor/checar-ajuda.ts <pasta da base>`.",
  );
}

if (import.meta.main) {
  const caso = process.argv[2];
  if (!caso) {
    console.error("Uso: node motor/base-ajuda.ts <caso>");
    process.exit(2);
  }
  gerar(caso);
}
