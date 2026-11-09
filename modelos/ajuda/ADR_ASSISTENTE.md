# ADR-{{NNNN}}: O assistente de ajuda responde por modelo de linguagem, com a base de conhecimento inteira no pedido

<!-- Modelo do kit (docs/PADRAO_AJUDA_E_ASSISTENTE.md). Base: ADR-0011 do sistema de comprovantes (aceito em
09/11/2026). Preços e nomes de modelo mudam: consulte o catálogo do serviço no dia, nunca de memória. -->

- **Situação:** Proposta ({{data}})
- **Quem decide:** {{dono do sistema}}; em produção, também a TI e o encarregado de dados (aceite do contrato)

## Contexto
O capítulo {{NN}} pede um assistente que responda perguntas livres sobre o uso do sistema, sabendo a tela e a trilha
da sessão. Forças: nenhum dado pessoal sai do sistema; serviço sem retenção e sem treino; {{regra de linguagem}}; custo
baixo para volume pequeno; equipe pequena, sem banco de vetores; base pequena ({{N}} mil tokens por perfil).

## Opções consideradas

| Opção | A favor | Contra |
|---|---|---|
| A. {{modelo de conversa barato e bom em português}} pelo {{serviço}}, base do perfil inteira no pedido, com cache | Segue bem instruções de escopo e recusa; contexto grande; cache barato | Serviço externo; aceite de contrato em produção |
| B. {{modelo mais barato ou já contratado}} | Mais barato / já configurado | {{fraquezas medidas ou esperadas}} |
| C. Só busca nas perguntas frequentes, sem modelo | Sem custo, sem serviço externo | Não entende pergunta livre, não usa tela nem trilha (é a F1) |
| D. Busca vetorial com banco de vetores | Escala para bases grandes | Desnecessário para base deste tamanho; banco e manutenção a mais |

## Decisão
Opção A, com a C sempre disponível; assistente desligado por padrão.
- Modelo `{{fornecedor/modelo}}` pelo `{{endereço fixo HTTPS}}`; troca por variável; versão fixa.
- Provedor: sem treino, retenção zero, `require_parameters` quando aplicável; sem provedor que atenda, indisponível.
- Pedido: parte fixa por perfil com cache; contexto mascarado; 10 mensagens anteriores; raciocínio **desligado**.
- Limites: temperatura 0,2; até 1.000 tokens de saída; tempo máximo 20 s; uma nova tentativa só em 429/5xx antes do
  primeiro pedaço; 30 perguntas/hora/usuário; teto de custo diário.
- Liga e desliga: `ASSISTENTE_MODO=desligado|simulado|externo`; produção só com `ASSISTENTE_CONTRATO=aceito`.
- Sem biblioteca nova.

## Consequências
Porta e adaptadores (externo e simulado), caso de uso, rota em fluxo, filtro no domínio; teste da base na suíte;
avaliação com o serviço real obrigatória antes de ligar e a cada troca de modelo; log só de metadados; integrações e
segurança da especificação atualizadas; capítulo "Pedir ajuda" no manual.
