# Conferir a amostra

## Para que serve

A **amostra** é o controle da conferência automatizada por regras. Todo mês o sistema sorteia 5% dos comprovantes
conformes para uma conferência completa pelo RH. O sorteio usa uma **semente** registrada: com ela, qualquer pessoa
refaz o sorteio e chega ao mesmo resultado. O resultado da amostra mede a qualidade das regras e vai para o relatório
mensal.

## Quando usar

- Sempre que a fila **Amostra** do painel tiver comprovantes.
- Antes do fechamento: o comprovante sorteado só entra no lote depois de conferido, e o lote só é gerado com a amostra
  conferida.

## Antes de começar

- O comprovante da amostra passou nas seis regras. Confira como se fosse uma divergência: documentos, dados lidos, valor
  reembolsável e glosa.
- O percentual da amostra é um parâmetro, mantido em **Calendário e parâmetros**, aba **Parâmetros**.

## Passo a passo

{{passos}}

## O que acontece depois

- **Confirmar e aprovar** deixa o comprovante **Aprovado** pelo valor do botão, e ele entra no lote da competência.
- Se você encontrou um problema e usou **Devolver ao servidor** ou **Reprovar**, o servidor recebe o aviso com o motivo,
  como numa divergência.
- O relatório mensal mostra a amostra de controle, com a semente do sorteio e a **taxa de erro na amostra**, que também
  aparece nos indicadores do painel.
- **Desfazer a decisão** desfaz a aprovação até o lote ser gerado.

## Se der errado

- **Não há "Confirmar e aprovar", só "Devolver ao servidor" e "Reprovar".** O comprovante não tem valor reembolsável
  calculado. Para aprovar, clique em **Abrir análise completa** e use **Aprovar informando o valor** (capítulo "Analisar
  divergências e decidir", seção "Quando não há valor calculado").
- **O documento não aparece na miniatura.** Use **Abrir documento** para vê-lo inteiro, ou **Abrir análise completa**
  para ver os documentos lado a lado.
- **Nenhum comprovante foi sorteado no mês.** No fechamento, se houver conformes e nenhum tiver sido sorteado, o sistema
  sorteia um, também pela semente.
