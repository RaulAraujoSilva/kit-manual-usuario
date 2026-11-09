# O ciclo do mês em uma página

## Para que serve

Esta página mostra o que acontece com os comprovantes de saúde e de educação de um mês, do envio pelo servidor até o
pagamento na folha. Cada etapa tem um capítulo próprio neste manual. O sistema lê os documentos, confere cada comprovante por seis regras, calcula o valor reembolsável e a glosa, sorteia a
amostra e envia os lembretes. **Aprovar**, **Devolver**, **Reprovar** e autorizar o lote são sempre decisões de uma
pessoa do RH.

## As datas do mês

Cada mês de despesa é uma **competência**, com datas em **Calendário e parâmetros**. O padrão (exemplo de outubro):

- **Abertura:** dia 1º do mês seguinte (01/11). O servidor já pode enviar.
- **Lembretes:** 15 dias, 7 dias e 1 dia antes do prazo, só para quem ainda não enviou.
- **Prazo do servidor:** dia 20 do mês seguinte (20/11).
- **Fechamento do lote:** dia 21 do mês seguinte. Se cair em dia sem expediente, passa para o próximo dia útil (em
  outubro de 2026, 23/11).

## Quem faz o quê, na ordem

1. **O servidor envia.** Anexa os documentos, confere as despesas e clica em **Enviar ao RH**. Cada comprovante passa
   pelas seis regras na hora.
2. **O sistema separa.** O comprovante que passou nas seis regras fica **Conforme**. Uma pequena parte dos conformes
   (5%) é sorteada para a **amostra**. O que falhou em alguma regra vira **divergência**.
3. **O sistema cobra** por e-mail quem tem direito e ainda não enviou. O RH acompanha em **Sem envio**.
4. **O RH aprova os conformes** de uma vez, em **Aprovar conformes**.
5. **O RH analisa as divergências e a amostra**, uma a uma, e decide: **Aprovar**, **Devolver** ao servidor (ele
   corrige e reenvia) ou **Reprovar**. A decisão pode ser desfeita até o lote ser gerado.
6. **Depois do prazo**, quem tinha o auxílio ativo e não enviou ganha uma **falta de comprovação**, que o RH decide.
7. **No fechamento, o RH elabora o lote:** confere as pendências e os totais e envia para autorização.
8. **A coordenação do RH autoriza e gera o lote**, ou o devolve para ajuste com o motivo. Quem elaborou o lote não pode
   autorizá-lo. Gerado, o lote fica bloqueado.
9. **O RH entrega e registra:** envia o arquivo à folha, junta o relatório mensal ao processo SEI e registra o
   pagamento. O servidor passa a ver **Pago na folha** no painel.

Ao longo do ano, mantenha em dia o cadastro em **Servidores** e as datas, tetos e motivos em **Calendário e
parâmetros**.
