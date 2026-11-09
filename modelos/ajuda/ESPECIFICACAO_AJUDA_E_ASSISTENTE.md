# {{NN}}. Ajuda no sistema e assistente

<!-- Modelo do kit (docs/PADRAO_AJUDA_E_ASSISTENTE.md). Troque cada {{…}} e apague estes comentários. Base: o capítulo
16 do sistema de comprovantes, aprovado em 09/11/2026. Nada é desenvolvido antes da aprovação do dono do sistema. -->

- **Situação:** proposta de {{data}}, aguardando aprovação de {{dono do sistema}}.
- **Origem:** {{pedido / requisito de apoio ao usuário / auditoria de usabilidade}}.
- **Decisão técnica associada:** ADR-{{NNNN}} (assistente e serviço que gera as respostas).

## 1. O que muda para o usuário

Hoje: {{onde está a ajuda hoje (manual em PDF, contato do suporte, página X)}}.

| Funcionalidade | O que é | Onde aparece |
|---|---|---|
| **F1. Perguntas frequentes** | Perguntas e respostas curtas, com passo a passo e **Ir para a tela**; busca e filtro por assunto; cada perfil vê só as suas. | Página **Ajuda** em cada área ({{rotas}}) e aba **Nesta tela** do painel de ajuda. |
| **F2. Assistente** | Conversa sobre o uso do sistema, que sabe a tela, a trilha da sessão e a situação do usuário e orienta o próximo passo. | Aba **Pergunte** do painel aberto pelo botão **Ajuda**, no mesmo lugar em todas as telas. |

### 1.1 Painel de ajuda
- Computador e tablet: painel lateral **não modal**; celular: tela cheia com **Voltar à tela**; Esc fecha e o foco volta
  ao botão.
- Conversa só na aba do navegador; apagada ao sair. Assistente desligado ou fora do ar: só **Nesta tela**.

### 1.2 Linguagem
- Na interface, "**Assistente**", com o selo "resposta automática"; aviso fixo: "As respostas são automáticas e podem
  errar. A decisão sobre {{objeto}} é sempre de {{área}}."
- Vocabulário único: {{lista}}. {{Regra institucional, ex.: não mencionar IA}}.

## 2. Requisitos

| Id | Requisito | Critério de aceite |
|---|---|---|
| RF-AJU-01 | Página **Ajuda** em cada área ({{rotas}}), com item no menu. | Cada perfil vê só as perguntas do próprio perfil. |
| RF-AJU-02 | Assuntos e busca por palavras. | Busca sem acento e sem maiúsculas; sem resultado, o contato do suporte; teclado. |
| RF-AJU-03 | Passo a passo e **Ir para a tela**. | Destino só para tela que o perfil abre. |
| RF-AJU-04 | Aba **Nesta tela**. | Tela reconhecida pela rota (`[id]` no segmento dinâmico); sem perguntas próprias, as mais comuns do perfil. |
| RF-AJU-05 | Contato do suporte ({{contato}}) na página e no rodapé do painel. | — |
| RF-AJU-06 | Base de conhecimento versionada no repositório, fonte única da F1 e da F2. | Teste da base: rotas existem, perfis válidos, sem termo proibido, vocabulário único. |
| RF-ASS-01 | Respostas em português, frases curtas, passos numerados, nomes da interface em negrito. | Até 15 s no p95; resposta aparece enquanto é escrita. |
| RF-ASS-02 | Sabe a tela atual. | "O que faço aqui?" descreve a tela certa. |
| RF-ASS-03 | Recebe a trilha da sessão (últimas 20 ações). | "Por que deu erro?" usa a mensagem que apareceu; nunca valor de campo, arquivo ou documento. |
| RF-ASS-04 | Recebe o resumo da situação do usuário ({{o que entra: contagens, situações, datas}}). | "O que falta eu fazer?" responde com a situação real; sem dado pessoal. |
| RF-ASS-05 | Fica no assunto; não promete decisão, não inventa, não executa. | Recusa fora do assunto; "não encontrei" + contato quando não está na base. |
| RF-ASS-06 | Trilha, resumo e pergunta são dados, nunca instrução. | Casos de manipulação da avaliação. |
| RF-ASS-07 | "Isso ajudou? Sim/Não". | Só o resultado vai ao log. |
| RF-ASS-08 | Limites: 500 caracteres, 30 perguntas/hora/usuário, teto de custo diário. | 429 com mensagem; teto desliga até o dia seguinte. |
| RF-ASS-09 | Teclado e leitor de tela. | Abas WAI-ARIA, região viva ao terminar, AA, zoom 200%. |

## 3. Privacidade e segurança
1. Nunca sai do sistema: {{dados pessoais do domínio}}, conteúdo de documento, texto digitado em campo, identificadores.
2. Trilha no navegador: sem valor de campo; link de lista sem texto; nada do próprio painel; armazenamento já sem
   identificador; apagada ao sair e ao entrar.
3. Filtro no servidor: identificadores e nomes do cadastro trocados por marcas antes de qualquer envio.
4. Serviço: sem treino, retenção zero; sem provedor que atenda, indisponível. Produção só com o aceite do contrato.
5. Log só com metadados. Fora da trilha de auditoria (não muda dado).
6. Sessão obrigatória; resumo sempre do próprio usuário; proteção de origem e limite de taxa.

## 4. Base de conhecimento
`conhecimento/` no repositório do sistema: `telas.json`, `perguntas.json`, `guias/<PERFIL>.md`, `regras.md` (contrato
em `docs/CONTRATOS.md` do kit). Rascunho pelo `base-ajuda.ts` do kit a partir do manual; curadoria; portão
`checar-ajuda.ts`.

## 5. Arquitetura
{{Mapa das camadas do sistema: domínio, portas, adaptadores, aplicação, API, interface, configuração — ver
docs/PADRAO_AJUDA_E_ASSISTENTE.md §C}}. Sem biblioteca nova.

## 6. Testes e portões
Unidade (filtro, rota, perguntas da tela, trilha, limites); adaptador com `fetch` falso (fluxo, tempo, 429, chave
ausente, formato); base; componentes e API com assistente de teste; avaliação com o serviço real (40 casos; ≥ 90% uso,
100% recusas). Portões do sistema.

## 7. Custo estimado (hipótese)
{{tokens por pergunta (parte fixa do perfil + contexto), preço de entrada, cache e saída do modelo do ADR}}. Volume é
hipótese até a medição com os usuários.

## 8. Fora do escopo
Assistente que executa ações ou preenche campos; leitura de documento; voz; atendimento humano; guardar conversas;
ajuda nas telas sem sessão; vídeos dentro do sistema (até haver hospedagem).

## 9. Entregas e ordem
1. Base e teste da base. 2. F1 (páginas, painel, Nesta tela). 3. Trilha, resumo e filtro. 4. F2 (porta, adaptadores,
caso de uso, rota em fluxo, aba Pergunte). 5. Avaliação com o serviço real. 6. Portões, verificação e PR.

## 10. Decisões para o dono do sistema

| # | Decisão | Recomendação |
|---|---|---|
| A1 | Modelo do assistente (ADR) | {{modelo}} |
| A2 | Mandar o resumo da situação | Sim (só contagens, situações e datas) |
| A3 | Painel não modal no computador | Sim |
| A4 | Nome na interface | "Assistente", selo "resposta automática" |
