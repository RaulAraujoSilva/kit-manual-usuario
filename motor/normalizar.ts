// Normalização do texto de narração (português do Brasil): o que o modelo de voz lê mal vira texto por extenso.
// Datas dd/mm/aaaa, valores em reais, números com separador de milhar e siglas da tabela SIGLAS.
// A legenda usa sempre o texto original; este texto normalizado só vai para a voz (e para a chave do cache).

const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos",
  "novecentos",
];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro",
  "dezembro",
];
// Escalas acima de mil: [singular, plural].
const ESCALAS: [string, string][] = [["milhão", "milhões"], ["bilhão", "bilhões"], ["trilhão", "trilhões"]];

/**
 * Siglas lidas de outro jeito pela voz: { "SIGLA": "como ler" }. Vazia de propósito — os modelos de voz já leem
 * as siglas comuns ("RH" vira "erre agá"). Acrescente aqui só o que a voz errar.
 */
export const SIGLAS: Record<string, string> = {};

/** 0 a 999 por extenso. */
function ate999(n: number): string {
  if (n < 20) return UNIDADES[n]!;
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return u === 0 ? DEZENAS[d]! : `${DEZENAS[d]} e ${UNIDADES[u]}`;
  }
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), resto = n % 100;
  return resto === 0 ? CENTENAS[c]! : `${CENTENAS[c]} e ${ate999(resto)}`;
}

/**
 * Inteiro não negativo por extenso, no masculino: 2026 → "dois mil e vinte e seis",
 * 1234 → "mil duzentos e trinta e quatro", 1_000_000 → "um milhão".
 */
export function porExtenso(n: number | bigint): string {
  let v = BigInt(n);
  if (v < 0n) return `menos ${porExtenso(-v)}`;
  if (v < 1000n) return ate999(Number(v));
  // Grupos de três dígitos, do menos para o mais significativo.
  const grupos: number[] = [];
  while (v > 0n) {
    grupos.push(Number(v % 1000n));
    v /= 1000n;
  }
  if (grupos.length - 2 >= ESCALAS.length) throw new Error(`Número grande demais para ler por extenso: ${n}`);
  const partes: { texto: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]!;
    if (g === 0) continue;
    let texto: string;
    if (i === 0) texto = ate999(g);
    else if (i === 1) texto = g === 1 ? "mil" : `${ate999(g)} mil`;
    else {
      const [sing, plur] = ESCALAS[i - 2]!;
      texto = g === 1 ? `um ${sing}` : `${ate999(g)} ${plur}`;
    }
    partes.push({ texto, valor: g });
  }
  // "e" antes do último grupo quando ele é menor que cem ou centena redonda: "mil e cem", "dois mil e vinte".
  let saida = partes[0]!.texto;
  for (let k = 1; k < partes.length; k++) {
    const p = partes[k]!;
    const ultimo = k === partes.length - 1;
    const comE = ultimo && (p.valor < 100 || p.valor % 100 === 0);
    saida += comE ? ` e ${p.texto}` : ` ${p.texto}`;
  }
  return saida;
}

/** "um milhão" → "um milhão de"; usado antes de "reais" quando o valor termina em milhão/bilhão redondo. */
function precisaDe(inteiro: bigint): boolean {
  return inteiro >= 1_000_000n && inteiro % 1_000_000n === 0n;
}

/** Valor em reais por extenso: (1234, 56) → "mil duzentos e trinta e quatro reais e cinquenta e seis centavos". */
export function reaisPorExtenso(inteiro: bigint, centavos: number): string {
  const partes: string[] = [];
  if (inteiro > 0n) {
    const moeda = inteiro === 1n ? "real" : "reais";
    partes.push(`${porExtenso(inteiro)}${precisaDe(inteiro) ? " de" : ""} ${moeda}`);
  }
  if (centavos > 0) partes.push(`${porExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  if (partes.length === 0) return "zero real";
  return partes.join(" e ");
}

/** Data por extenso: (20, 11, 2026) → "20 de novembro de dois mil e vinte e seis"; dia 1 → "primeiro". */
export function dataPorExtenso(dia: number, mes: number, ano: number): string {
  const d = dia === 1 ? "primeiro" : String(dia);
  return `${d} de ${MESES[mes - 1]} de ${porExtenso(ano)}`;
}

function digitos(s: string): bigint {
  return BigInt(s.replace(/\./g, ""));
}

/** Texto pronto para a voz. */
export function normalizar(texto: string): string {
  let t = texto.replace(/[  ]/g, " ");

  // Valores em reais: "R$ 1.234,56", "R$1.234", "R$ 0,50".
  t = t.replace(/R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?!\d|[.,]\d)/g, (_m, int: string, cent?: string) => {
    const c = cent === undefined ? 0 : Number(cent.padEnd(2, "0"));
    return reaisPorExtenso(digitos(int), c);
  });

  // Datas completas: "05/11/2026", "5/11/2026".
  t = t.replace(/(?<![\d/])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\d/])/g, (m, d: string, mm: string, a: string) => {
    const dia = Number(d), mes = Number(mm), ano = Number(a);
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return m;
    return dataPorExtenso(dia, mes, ano);
  });

  // Mês de competência: "10/2026" → "outubro de dois mil e vinte e seis".
  t = t.replace(/(?<![\d/])(\d{1,2})\/(\d{4})(?![\d/])/g, (m, mm: string, a: string) => {
    const mes = Number(mm);
    if (mes < 1 || mes > 12) return m;
    return `${MESES[mes - 1]} de ${porExtenso(Number(a))}`;
  });

  // Números com separador de milhar, com ou sem decimais: "1.234", "12.500,5".
  // Não mexe em matrícula/CPF ("50.213-4", "123.456.789-00") nem em números colados a barra ou ponto.
  t = t.replace(/(?<![\d.,/-])(\d{1,3}(?:\.\d{3})+)(?:,(\d+))?(?![\d\-/]|[.,]\d)/g, (_m, int: string, dec?: string) => {
    const inteiro = porExtenso(digitos(int));
    if (dec === undefined) return inteiro;
    return `${inteiro} vírgula ${dec.split("").map((x) => UNIDADES[Number(x)]).join(" ")}`;
  });

  for (const [sigla, leitura] of Object.entries(SIGLAS)) {
    const esc = sigla.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "gu"), leitura);
  }

  return t.replace(/\s+/g, " ").trim();
}
