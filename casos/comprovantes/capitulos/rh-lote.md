# Gerar o lote e entregar à folha

## Para que serve

O **lote** fecha a competência. Dele saem dois arquivos, gerados do mesmo registro, sem redigitar nada: o **arquivo
para a folha**, com os lançamentos por servidor e rubrica, e o **relatório mensal** em PDF, para o processo SEI. O RH
elabora o lote, a coordenação do RH autoriza e gera, e o RH registra a entrega à folha, a juntada ao SEI e o pagamento.

## Quando usar

- Depois da data de **fechamento do lote** da competência (no padrão, dia 21 do mês seguinte, ou o próximo dia útil).
  Antes dela, o lote não pode ser elaborado.
- Quando a coordenação devolve o lote para ajuste.
- Quando o arquivo é entregue à folha, quando o relatório é juntado ao processo SEI e quando a folha é paga.

## Antes de começar

- Zere as filas da competência: divergências decididas, amostra conferida e nenhum conforme esperando aprovação.
- Os comprovantes devolvidos que o servidor ainda não corrigiu não impedem o lote: eles ficam para a competência
  seguinte.
- O lote tem quatro etapas, e cada uma libera a seguinte: **1. Conferir pendências**, **2. Conferir totais**, **3.
  Escolher arquivos** e **4. Autorizar e gerar**, esta pela coordenação do RH. As confirmações ficam gravadas no lote:
  recarregar a tela não volta etapas.

## Passo a passo

### Elaborar o lote e enviar para autorização

{{passos:rh-lote}}

### Quando a coordenação devolve o lote

Se algum total não confere, a coordenação devolve o lote para ajuste, e ele volta a **Em elaboração**.

{{passos:rh-ajustar-lote}}

### Registrar a entrega, a juntada e o pagamento

Nesta versão, a entrega à folha e a juntada ao SEI são feitas fora do sistema e registradas aqui.

{{passos:rh-registrar-entrega}}

## O que acontece depois

- **Lote gerado:** fica bloqueado. Os comprovantes aprovados passam a **No lote** e nenhum comprovante da competência
  muda mais de situação. Cada arquivo recebe a sua impressão digital (SHA-256), que prova que ele não foi alterado.
- **Entregue, juntado e pago:** os registros ficam no lote, com data e autor. Com o pagamento registrado, os
  comprovantes passam a **Pago** e cada servidor vê **Pago na folha** no próprio painel, com o total reembolsado no ano.
- O relatório mensal da competência fica disponível em **Relatório SEI** (capítulo "Relatório mensal para o SEI").

## Se der errado

- **O lote não avança da etapa 1.** Há pendência: a tela lista cada uma com o atalho para a fila. Decida o que falta e
  volte ao lote.
- **A confirmação de uma etapa se desfez.** A confirmação só vale enquanto continua verdadeira: uma pendência nova
  desfaz a etapa 1, e um total diferente do conferido desfaz a etapa 2. Confira de novo.
- **"Aguardando autorização da coordenação do RH".** O lote já foi enviado. Quem elaborou o lote não pode autorizá-lo:
  aguarde a coordenação.
- **Lote devolvido para ajuste.** Leia o motivo no alto da tela do lote, faça o ajuste, confira os totais de novo e
  envie outra vez.
- **Pagamento registrado antes da entrega.** Não é possível: o pagamento é registrado depois da entrega à folha.
