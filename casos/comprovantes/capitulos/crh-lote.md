# Autorizar ou devolver o lote

## Para que serve

O lote do mês leva à folha de pagamento os reembolsos aprovados da competência. O RH elabora o lote; a coordenação
confere os totais e autoriza. Só depois da autorização o sistema gera os dois arquivos: o arquivo para a folha (CSV) e
o relatório mensal em PDF para o processo SEI. Se algum total não confere, a coordenação devolve o lote para ajuste,
com o motivo.

## Quando usar

- Quando o lote da competência está **Aguardando autorização**. O RH só envia o lote para autorização depois da data de
  fechamento, com as pendências e os totais conferidos.
- Uma vez por competência. Depois de gerado, o lote não se desfaz.

## Antes de começar

- **Quem elaborou o lote não pode autorizá-lo nem devolvê-lo.** A etapa **4. Autorizar e gerar** mostra quem elaborou e
  quando, em **Elaborado por**.
- Confira na mesma tela, de cima para baixo:
  - **1. Conferir pendências**: divergências decididas, amostra conferida e nenhum conforme esperando aprovação. Os
    comprovantes devolvidos que o servidor ainda não corrigiu ficam para a competência seguinte;
  - **2. Conferir totais**: os aprovados no lote, os servidores, os totais por auxílio e rubrica (comprovado, glosa e
    reembolsado), as compensações e o **Líquido na folha**;
  - **3. Escolher arquivos**: a prévia do arquivo para a folha (sem CPF) e **Ver a prévia do relatório**.

## Autorizar e gerar o lote

{{passos:crh-autorizar-lote}}

## Devolver o lote para ajuste

{{passos:crh-devolver-lote}}

## O que acontece depois

- **Lote gerado.** O lote fica bloqueado: nenhum comprovante da competência muda de situação, e os comprovantes
  aprovados passam a **No lote**. Os dois arquivos ficam em **Baixar**, cada um com a impressão digital **SHA-256**, que
  comprova que o arquivo não foi alterado depois.
- **Entrega, juntada e pagamento.** Depois de gerado, o RH registra a entrega do arquivo à folha, a juntada do relatório
  ao processo SEI e o pagamento na folha, na parte **Entrega, juntada e pagamento** da mesma tela.
- **Correção depois do lote.** Lote gerado não é editado. Se um valor precisar mudar depois, a diferença entra como
  compensação no lote do mês seguinte.
- **Lote devolvido.** O lote volta para **Em elaboração**, com quem devolveu, a data, a hora e o motivo à vista. A
  confirmação dos totais (etapa 2) se desfaz. Quem elaborou recebe o motivo por e-mail, confere os totais de novo e
  envia outra vez para autorização. A devolução fica registrada na trilha de auditoria.

## Se der errado

- **"Marque a autorização para liberar a geração do lote."** O botão de gerar o lote fica bloqueado até você marcar
  **Conferi os totais e autorizo o envio do lote**.
- **"Escreva o motivo da devolução para continuar."** O motivo é obrigatório e precisa ter de 10 a 500 caracteres.
- **"Lote devolvido para ajuste. O e-mail a quem elaborou não saiu: avise por outro meio."** A devolução foi gravada,
  mas o aviso por e-mail não saiu. Avise quem elaborou por outro meio; o motivo também aparece na tela do lote.
- **"Aguardando a elaboração do lote pelo RH."** O lote ainda não foi enviado para autorização. Aguarde o RH.
- **"Não foi possível concluir agora. Nada foi alterado; tente de novo."** Tente de novo em alguns instantes.
- **O lote já foi gerado e há um erro.** O lote gerado não volta. Combine com o RH a compensação no lote do mês
  seguinte.
