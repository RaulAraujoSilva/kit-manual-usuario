// Cópias do banco do ambiente escolhido (KIT_AMBIENTE): salvar um estado intermediário e restaurar qualquer um.
// Uso: node motor/estado.ts salvar <caso> <nome> | node motor/estado.ts restaurar <caso> [nome]
import { lerCaso, restaurarEstado, salvarEstado } from "./comum.ts";

const [acao, caso, nome] = process.argv.slice(2);
if (!caso || (acao !== "salvar" && acao !== "restaurar") || (acao === "salvar" && !nome)) {
  console.error("Uso: node motor/estado.ts salvar <caso> <nome> | node motor/estado.ts restaurar <caso> [nome]");
  process.exit(2);
}
const dados = lerCaso(caso);
if (acao === "salvar") salvarEstado(caso, dados, nome as string);
else restaurarEstado(caso, dados, nome ?? "inicial");
