---
name: manual-usuario
description: Produz o manual do usuário em PDF (passo a passo com prints anotados com retângulo, seta e número) e vídeos tutoriais curtos narrados e legendados, um por funcionalidade, a partir de roteiros YAML executados no sistema rodando com dados fictícios. Use quando o pedido for "manual do usuário", "guia do usuário", "vídeo tutorial", "vídeos de treinamento", "passo a passo com prints", "documentar as telas para o usuário", "atualizar o manual depois da nova versão" ou "/manual-usuario".
---

# Manual do usuário e vídeos a partir do sistema rodando

Você conduz o processo do kit `kit-manual-usuario`: inventário, ambiente, roteiros, piloto, produção, portões e
validação. Leia antes `README.md`, `docs/METODO.md`, `docs/GUIA_DE_ESTILO.md` e `docs/CONTRATOS.md` do kit; o caso
`casos/comprovantes/` é o modelo de tudo.

O sistema é **caixa-preta**: o kit só o usa pela tela, como um usuário. Os roteiros e textos ficam no kit, em
`casos/<sistema>/`; o repositório do sistema não recebe mudança nem biblioteca nova. Do repositório do sistema você
só **lê** a especificação (casos de uso, telas, perfis, regras) e o jeito de subir o ambiente.

## 1. Perguntas iniciais

Descubra primeiro no repositório do sistema (README, CLAUDE.md, especificação, docker-compose, carga de teste) e
pergunte ao usuário **só o que não achar, numa mensagem só**:

1. **Endereço** de um ambiente com **dados fictícios** (local ou homologação; nunca produção). Se não existir, como
   subir um.
2. **Perfis** do sistema e uma **conta de teste por perfil** (onde estão as senhas; não as repita em relatório nem
   em chat).
3. **Como voltar ao estado inicial**: dá para recriar do zero e tirar uma cópia do banco? O sistema aceita "hoje"
   fixo?
4. **O que só existe fora da produção** e precisa sumir dos prints (faixa de ambiente, "entrar como", depuração).
5. **Marca**: cores, logotipo, nome do órgão e do sistema como devem aparecer.
6. **Voz**: já escolhida, ou fazer a audição de finalistas no piloto? (Precisa de `OPENROUTER_API_KEY` no ambiente.)
7. **Manuais**: um PDF por perfil (recomendado) ou um único? Quem revisa os textos e aprova o piloto?

Confira os pré-requisitos (Node 24+, ffmpeg e ffprobe, Docker se o caso usar, Chromium do Playwright) e crie
`casos/<sistema>/caso.yaml` a partir do modelo do caso de referência.

## 2. Inventário

Monte `casos/<sistema>/matriz.md` **por perfil × tarefa, não por tela** (método, etapa 1). Proponha a lista de
manuais, capítulos e vídeos e peça ao dono que confirme o escopo antes de escrever roteiros. Esta etapa é só leitura
da especificação: pode ir para um agente em paralelo enquanto você prepara o ambiente.

## 3. Ambiente determinístico

Relógio fixo, massa fictícia, contas por perfil, lista `ocultar:` e a cópia `.cache/estado-inicial.dump` tirada logo
depois de recriar o ambiente do zero (método, etapa 2; exemplo em `casos/comprovantes/README.md`). Teste a
restauração uma vez antes de seguir.

## 4. Piloto com aprovação do dono

Escolha a tarefa mais usada do perfil mais numeroso. Escreva o roteiro e o capítulo, rode `capturar`, `anotar`,
`narrar`, `gravar`, `montar-video` e um `montar-pdf` só com esse capítulo. Se a voz não estiver escolhida, gere a
mesma fala com 3 a 5 vozes finalistas.

Entregue ao dono os prints anotados, as páginas do PDF, o vídeo e as amostras de voz, e **pare**: visual, voz e tom
são decisão dele. Registre a aprovação (data e o que foi decidido). Não produza em escala sem ela.

## 5. Produção

Escreva os demais roteiros e capítulos no molde fixo e rode as etapas. Divida o trabalho assim:

| Trabalho | Como rodar |
|---|---|
| `capturar` e `gravar` (usam o sistema e restauram o banco) | **Sequencial, um roteiro por vez**: há um banco só. Nunca dois agentes nessas etapas ao mesmo tempo |
| `narrar` (só precisa do texto da narração) | Paralelo; antes do `gravar` de cada roteiro |
| `anotar`, `montar-video`, `montar-pdf` | Paralelos entre si, depois da etapa que os alimenta |
| Redação de capítulos, glossário, perguntas frequentes | Agentes em paralelo, um por manual ou perfil |
| Inventário, matriz e documentação do caso | Agente em paralelo |

No caso de referência, um agente cuidou do motor de vídeo, outro do PDF, outro do inventário e outro da
documentação, ao mesmo tempo, enquanto as capturas rodavam em fila no único ambiente. Ao lançar agentes, dê a cada
um os arquivos que pode alterar (sem sobreposição) e os contratos de `docs/CONTRATOS.md`.

Correções sempre no roteiro, no capítulo ou no `caso.yaml`, nunca nos arquivos de `saida/`.

## 6. Portões

Rode os portões (`docs/METODO.md`, etapa 8) e só siga com todos passando: roteiros sem erro, cobertura da matriz,
linguagem (nada de IA, caminhos locais, ferramentas internas; só o vocabulário da interface), privacidade (nenhum
elemento de teste, nenhum dado real), PDF marcado com texto alternativo, vídeos até 2 min com legenda, comparação
com a rodada anterior. Olhe você mesmo uma amostra de prints e um vídeo inteiro por perfil.

## 7. Validação e publicação

Proponha ao dono o teste com usuários reais (método, etapa 9: poucas pessoas, tarefas reais, sucesso, tempo,
dúvidas). Aplique os ajustes nos roteiros e capítulos e rode de novo. A publicação (Release com PDFs e MP4) e o local
de acesso são decisão do dono.

## Regras que não mudam

- Só dados fictícios e só o ambiente de teste. Um print com dado real invalida a entrega.
- Entrar sempre digitando usuário e senha, como na produção; nunca pelos atalhos de ambiente de teste.
- Entregáveis (PDF e vídeos) nunca mencionam IA, caminhos locais nem ferramentas internas; use o vocabulário da
  própria interface.
- Nunca imprimir nem gravar em arquivo a `OPENROUTER_API_KEY` ou senhas reais. `saida/` e `.cache/` fora do git.
- Piloto e textos passam pelo dono; o resto (motor, portões, montagem) é técnico.
- Não fazer commit sem o usuário pedir.
