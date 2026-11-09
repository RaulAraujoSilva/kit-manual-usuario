# Analisar divergências e decidir

## Para que serve

A **divergência** é o comprovante que falhou em uma das seis regras da conferência. Ele só entra no lote depois da sua
decisão. Na análise você vê o achado (a regra que falhou e o porquê), os documentos e a comparação campo a campo, e
decide com motivo. O aviso ao servidor sai da própria decisão.

As decisões possíveis:

- **Aprovar pelo valor calculado**: o comprovante é válido e o valor reembolsável calculado está certo.
- **Aprovar com outro valor**: válido, mas com outro valor; a justificativa é obrigatória. Quando não há valor
  reembolsável calculado, a opção se chama **Aprovar informando o valor**.
- **Devolver ao servidor**: o servidor corrige e reenvia. Só este comprovante volta para ele.
- **Reprovar**: o comprovante não entra na folha. O servidor recebe o aviso com o motivo.

## Quando usar

- Sempre que a fila **Divergências** do painel tiver comprovantes, até o fechamento do lote.
- Também para um **Conforme** em que você percebeu um problema: ele pode ser devolvido ou reprovado pelo painel lateral.

## Antes de começar

- Os motivos de devolução e de reprovação vêm de um catálogo, mantido em **Calendário e parâmetros**, aba
  **Catálogos**.
- O prazo para o servidor corrigir um comprovante devolvido é o prazo da competência. A tela mostra a data antes de você
  confirmar.

## Passo a passo

### Analisar uma divergência

{{passos:rh-divergencia}}

### Quando não há valor calculado

Quando a conferência não calculou o valor reembolsável (por exemplo, quando o emitente não tem atividade compatível),
o painel lateral não oferece **Aprovar**: a aprovação só sai pela análise completa, informando o valor e a
justificativa.

{{passos:rh-aprovar-com-valor}}

### Decidir pelo painel lateral

O painel lateral da lista também decide, sem abrir a análise completa. Assim você devolve ou reprova até um comprovante
**Conforme**.

{{passos:rh-devolver-conforme}}

## O que acontece depois

- **Aprovado:** o comprovante entra no lote da competência. A tela mostra o valor aprovado e a folha prevista.
- **Devolvido:** o servidor recebe o aviso por e-mail e na lista de avisos do sistema, com o motivo, a sua mensagem e o
  prazo para corrigir. Corrigido até o prazo, o comprovante volta à conferência e entra no lote da competência;
  corrigido depois, vai para a competência seguinte.
- **Reprovado:** o servidor recebe o aviso com o motivo; o comprovante não entra no lote.
- Toda decisão fica no histórico do comprovante, com o seu nome, a data e a hora, e as divergências tratadas aparecem no
  relatório mensal.
- **Desfazer a decisão** devolve o comprovante à fila de onde saiu. A aprovação e a reprovação se desfazem até o lote
  ser gerado; a devolução, só enquanto o servidor não agiu (não trocou documento nem reenviou). Ao desfazer uma
  devolução, o aviso sai da lista do servidor; um e-mail que já saiu não volta.

## Se der errado

- **Confirmar decisão** ou **Confirmar devolução** não libera. Falta escolher a decisão, o motivo, ou, na aprovação com
  valor, informar o valor e a justificativa. A tela diz o que falta logo abaixo do botão.
- **"Em reais, com centavos; até R$ …"** O valor aprovado não pode passar do limite que a tela mostra.
- **A justificativa tem pelo menos 20 caracteres.** Explique a decisão: ela vai para o histórico e para o relatório.
- **O motivo "Outro" pede o texto.** Escreva a mensagem ao servidor.
- **Desfazer a decisão não aparece.** O servidor já corrigiu ou reenviou o comprovante devolvido, ou o lote já foi
  gerado.
- **O documento não abre na tela.** Use **Abrir** no documento para vê-lo inteiro.
- **Quer anotar algo só para o RH?** Use **Observação interna**, no fim da análise completa: ela não aparece para o
  servidor nem no relatório.
