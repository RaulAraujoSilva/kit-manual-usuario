// Portão da base de conhecimento da ajuda (docs/PADRAO_AJUDA_E_ASSISTENTE.md, contrato em docs/CONTRATOS.md): forma de
// telas.json e perguntas.json, identificadores únicos, telas e destinos no catálogo e abertos pelos perfis da
// pergunta, um guia por perfil, regras presentes, termos proibidos, dado pessoal e vocabulário. Com --app, confere
// também que cada rota do catálogo existe nas páginas do sistema (Next.js: pastas com page.tsx; grupos "(x)" saem).
// Uso: node motor/checar-ajuda.ts <pasta da base> [--app <pasta src/app do sistema>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { FORA_DO_VOCABULARIO, PROIBIDOS } from "./checar.ts";

interface Tela { rota: string; perfis: string[]; nome: string; paraQueServe: string; acoes: string[] }
interface Pergunta { id: string; perfis: string[]; assunto: string; telas: string[]; pergunta: string; resposta: string; passos?: string[]; destino?: string }

const ROTA = /^\/[a-z0-9-]*(\/([a-z0-9-]+|\[[a-zA-Z_]+\]))*$/;
const DESTINO = /^\/[a-z0-9-]*(\/[a-z0-9-]+)*$/;
const DADO_PESSOAL: readonly { nome: string; re: RegExp }[] = [
  { nome: "CPF", re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { nome: "e-mail", re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
];

export function checarBase(pasta: string, app?: string): string[] {
  const erros: string[] = [];
  const ler = (rel: string) => readFileSync(path.join(pasta, rel), "utf8");
  for (const f of ["telas.json", "perguntas.json", "regras.md"]) {
    if (!existsSync(path.join(pasta, f))) erros.push(`falta ${f}`);
  }
  if (erros.length > 0) return erros;
  const telas = JSON.parse(ler("telas.json")) as Tela[];
  const perguntas = JSON.parse(ler("perguntas.json")) as Pergunta[];

  // forma
  const textoOk = (v: unknown, max: number) => typeof v === "string" && v.trim() !== "" && v.length <= max;
  telas.forEach((t, i) => {
    if (!ROTA.test(t.rota ?? "")) erros.push(`telas[${i}]: rota fora da forma (${t.rota})`);
    if (!Array.isArray(t.perfis) || t.perfis.length === 0) erros.push(`telas[${i}] ${t.rota}: sem perfis`);
    if (!textoOk(t.nome, 80)) erros.push(`telas[${i}] ${t.rota}: nome vazio ou longo`);
    if (!textoOk(t.paraQueServe, 600)) erros.push(`telas[${i}] ${t.rota}: paraQueServe vazio ou longo`);
    if (!Array.isArray(t.acoes)) erros.push(`telas[${i}] ${t.rota}: acoes não é lista`);
  });
  const rotas = new Map(telas.map((t) => [t.rota, t]));
  if (rotas.size !== telas.length) erros.push("telas.json: rota repetida");
  const ids = new Set<string>();
  for (const p of perguntas) {
    const onde = `pergunta ${p.id}`;
    if (!/^[a-z0-9]+-[a-z0-9-]+$/.test(p.id ?? "")) erros.push(`${onde}: id fora da forma (prefixo do perfil + kebab-case)`);
    if (ids.has(p.id)) erros.push(`${onde}: id repetido`);
    ids.add(p.id);
    if (!textoOk(p.pergunta, 200) || !textoOk(p.resposta, 1500) || !textoOk(p.assunto, 60)) erros.push(`${onde}: pergunta, resposta ou assunto vazio ou longo`);
    if (!Array.isArray(p.perfis) || p.perfis.length === 0) erros.push(`${onde}: sem perfis`);
    if (p.destino !== undefined && !DESTINO.test(p.destino)) erros.push(`${onde}: destino com segmento dinâmico ou fora da forma (${p.destino})`);
    for (const rota of [...(p.telas ?? []), ...(p.destino === undefined ? [] : [p.destino])]) {
      const tela = rotas.get(rota);
      if (!tela) erros.push(`${onde}: ${rota} fora do catálogo`);
      else if (!p.perfis.every((perfil) => tela.perfis.includes(perfil))) erros.push(`${onde}: ${rota} não abre para ${p.perfis.join(", ")}`);
    }
  }

  // um guia por perfil do catálogo
  const perfis = new Set(telas.flatMap((t) => t.perfis));
  for (const perfil of perfis) {
    if (!existsSync(path.join(pasta, "guias", `${perfil}.md`))) erros.push(`falta guias/${perfil}.md`);
  }

  // linguagem: termos proibidos, dado pessoal, vocabulário único
  const textos: { onde: string; texto: string }[] = [
    { onde: "regras.md", texto: ler("regras.md") },
    ...(existsSync(path.join(pasta, "guias")) ? readdirSync(path.join(pasta, "guias")).filter((f) => f.endsWith(".md")).map((f) => ({ onde: `guias/${f}`, texto: ler(path.join("guias", f)) })) : []),
    ...telas.map((t) => ({ onde: `tela ${t.rota}`, texto: [t.nome, t.paraQueServe, ...(t.acoes ?? [])].join("\n") })),
    ...perguntas.map((p) => ({ onde: `pergunta ${p.id}`, texto: [p.pergunta, p.resposta, ...(p.passos ?? [])].join("\n") })),
  ];
  for (const { onde, texto } of textos) {
    for (const p of [...PROIBIDOS, ...DADO_PESSOAL]) if (p.re.test(texto)) erros.push(`${onde}: ${p.nome}`);
    for (const p of FORA_DO_VOCABULARIO) if (p.re.test(texto)) erros.push(`${onde}: fora do vocabulário (${p.nome})`);
  }

  // rotas existem no sistema
  if (app !== undefined) {
    const existentes = new Set<string>();
    const visitar = (dir: string, partes: string[]) => {
      for (const nome of readdirSync(dir)) {
        const c = path.join(dir, nome);
        if (statSync(c).isDirectory()) visitar(c, nome.startsWith("(") ? partes : [...partes, nome]);
        else if (/^page\.(tsx|jsx|ts|js)$/.test(nome)) existentes.add(`/${partes.join("/")}`);
      }
    };
    visitar(app, []);
    for (const rota of rotas.keys()) if (!existentes.has(rota)) erros.push(`tela ${rota}: não existe em ${app}`);
  }
  return erros;
}

if (import.meta.main) {
  const pasta = process.argv[2];
  const i = process.argv.indexOf("--app");
  const app = i > 0 ? process.argv[i + 1] : undefined;
  if (!pasta) {
    console.error("Uso: node motor/checar-ajuda.ts <pasta da base> [--app <pasta src/app>]");
    process.exit(2);
  }
  const erros = checarBase(pasta, app);
  for (const e of erros) console.log(`ERRO  ${e}`);
  console.log(`\n${erros.length} erro(s) na base ${pasta}`);
  process.exit(erros.length > 0 ? 1 : 0);
}
