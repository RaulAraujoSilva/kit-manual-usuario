import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizar, porExtenso, reaisPorExtenso, SIGLAS } from "./normalizar.ts";

test("números por extenso", () => {
  const casos: [number, string][] = [
    [0, "zero"], [1, "um"], [14, "quatorze"], [16, "dezesseis"], [20, "vinte"], [21, "vinte e um"],
    [100, "cem"], [101, "cento e um"], [110, "cento e dez"], [200, "duzentos"], [999, "novecentos e noventa e nove"],
    [1000, "mil"], [1001, "mil e um"], [1100, "mil e cem"], [1234, "mil duzentos e trinta e quatro"],
    [2000, "dois mil"], [2026, "dois mil e vinte e seis"], [6457, "seis mil quatrocentos e cinquenta e sete"],
    [10_000, "dez mil"], [100_000, "cem mil"], [101_000, "cento e um mil"], [1_000_000, "um milhão"],
    [2_500_000, "dois milhões e quinhentos mil"], [1_000_001, "um milhão e um"],
    [1_234_567, "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete"],
    [1_000_000_000, "um bilhão"],
  ];
  for (const [n, esperado] of casos) assert.equal(porExtenso(n), esperado, String(n));
});

test("datas por extenso", () => {
  assert.equal(normalizar("Prazo: 20/11/2026."), "Prazo: 20 de novembro de dois mil e vinte e seis.");
  assert.equal(normalizar("Em 01/03/2027"), "Em primeiro de março de dois mil e vinte e sete");
  assert.equal(normalizar("hoje, 05/11/2026,"), "hoje, 5 de novembro de dois mil e vinte e seis,");
  assert.equal(normalizar("data 31/12/2000"), "data 31 de dezembro de dois mil");
  assert.equal(normalizar("competência 10/2026"), "competência outubro de dois mil e vinte e seis");
  assert.equal(normalizar("inválida 45/13/2026"), "inválida 45/13/2026");
});

test("valores em reais", () => {
  assert.equal(normalizar("R$ 1.234,56"), "mil duzentos e trinta e quatro reais e cinquenta e seis centavos");
  assert.equal(normalizar("R$ 1,00"), "um real");
  assert.equal(normalizar("R$ 1,01"), "um real e um centavo");
  assert.equal(normalizar("R$ 2,00"), "dois reais");
  assert.equal(normalizar("R$ 0,50"), "cinquenta centavos");
  assert.equal(normalizar("R$ 0,01"), "um centavo");
  assert.equal(normalizar("R$ 0,00"), "zero real");
  assert.equal(normalizar("R$1.500"), "mil e quinhentos reais");
  assert.equal(normalizar("R$ 350,00"), "trezentos e cinquenta reais");
  assert.equal(normalizar("R$ 1.000.000,00"), "um milhão de reais");
  assert.equal(normalizar("R$ 2.000.000,10"), "dois milhões de reais e dez centavos");
  assert.equal(normalizar("R$ 1.200.000,00"), "um milhão e duzentos mil reais");
  assert.equal(
    normalizar("Total de R$ 1.234,56, já com glosa."),
    "Total de mil duzentos e trinta e quatro reais e cinquenta e seis centavos, já com glosa.",
  );
  assert.equal(reaisPorExtenso(21n, 0), "vinte e um reais");
});

test("números com milhar", () => {
  assert.equal(normalizar("São 1.234 servidores"), "São mil duzentos e trinta e quatro servidores");
  assert.equal(normalizar("12.500,5 metros"), "doze mil e quinhentos vírgula cinco metros");
  assert.equal(normalizar("até 2.000."), "até dois mil.");
});

test("não mexe em matrícula, CPF nem número comum", () => {
  assert.equal(normalizar("matrícula 50.213-4"), "matrícula 50.213-4");
  assert.equal(normalizar("CPF 123.456.789-00"), "CPF 123.456.789-00");
  assert.equal(normalizar("ramal 6457"), "ramal 6457");
  assert.equal(normalizar("versão 1.2"), "versão 1.2");
});

test("siglas pela tabela (vazia por padrão)", () => {
  assert.equal(normalizar("Fale com o RH."), "Fale com o RH.");
  SIGLAS["SEI"] = "sei";
  try {
    assert.equal(normalizar("Processo no SEI, não no SEIX."), "Processo no sei, não no SEIX.");
  } finally {
    delete SIGLAS["SEI"];
  }
});

test("espaços e quebras viram um espaço", () => {
  assert.equal(normalizar("  Clique\n em   Enviar  "), "Clique em Enviar");
});
