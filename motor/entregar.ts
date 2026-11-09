// Pasta de entrega: os PDFs dos manuais e os vídeos de cada um, na ordem dos capítulos, com nomes legíveis
// ("01 - Enviar os comprovantes do mês.mp4") e as legendas ao lado. Uso: node motor/entregar.ts <caso>
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { RAIZ, lerRoteiro, pastaDoCaso } from "./comum.ts";

const caso = process.argv[2];
if (!caso) { console.error("Uso: node motor/entregar.ts <caso>"); process.exit(2); }
const saida = path.join(RAIZ, "saida", caso);
const destino = path.join(saida, "entrega");
rmSync(destino, { recursive: true, force: true });
const limpar = (t: string) => t.replace(/[\/:*?"<>|]/g, "-").trim();

for (const f of readdirSync(path.join(pastaDoCaso(caso), "manuais")).filter((x) => x.endsWith(".yaml"))) {
  const manual = parse(readFileSync(path.join(pastaDoCaso(caso), "manuais", f), "utf8")) as { titulo: string; capitulos: (string | { capitulo: string })[] };
  const id = path.basename(f, ".yaml");
  const pdf = path.join(saida, "manuais", `${id}.pdf`);
  if (!existsSync(pdf)) continue;
  const pasta = path.join(destino, limpar(manual.titulo));
  mkdirSync(path.join(pasta, "Vídeos"), { recursive: true });
  copyFileSync(pdf, path.join(pasta, `${limpar(manual.titulo)}.pdf`));
  // roteiros na ordem em que aparecem no manual (o do capítulo e os {{passos:<id>}} dentro dele)
  const roteiros: string[] = [];
  for (const c of manual.capitulos) {
    const md = typeof c === "string" ? path.join(pastaDoCaso(caso), "capitulos", `${c}.md`) : path.join(pastaDoCaso(caso), c.capitulo);
    if (typeof c === "string") roteiros.push(c);
    if (existsSync(md)) for (const m of readFileSync(md, "utf8").matchAll(/\{\{passos:([\w-]+)\}\}/g)) if (m[1]) roteiros.push(m[1]);
  }
  let n = 0;
  for (const r of [...new Set(roteiros)]) {
    const mp4 = path.join(saida, r, `${r}.mp4`);
    if (!existsSync(mp4)) continue;
    const nome = `${String(++n).padStart(2, "0")} - ${limpar(lerRoteiro(caso, r).titulo)}`;
    copyFileSync(mp4, path.join(pasta, "Vídeos", `${nome}.mp4`));
    for (const ext of ["srt", "vtt"]) {
      const leg = path.join(saida, r, `${r}.${ext}`);
      if (existsSync(leg)) copyFileSync(leg, path.join(pasta, "Vídeos", `${nome}.${ext}`));
    }
  }
  console.log(`${manual.titulo}: PDF + ${n} vídeos`);
}
console.log(`→ ${path.relative(RAIZ, destino)}`);
