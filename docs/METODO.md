# Método: do sistema rodando ao manual e aos vídeos

Onze etapas, da especificação à manutenção, e uma opcional (12) que leva o manual para dentro do sistema. As etapas 1 a 4 se fazem uma vez por sistema; 5 a 8 a cada rodada de
produção; 9 e 10 na primeira entrega; 11 a cada versão do sistema. Tudo o que o leitor vê sai de arquivo versionado
(roteiro, capítulo, caso): o que se gera em `saida/` é descartável.

| # | Etapa | Sai | Quem decide |
|---|---|---|---|
| 1 | Inventário | `matriz.md` | Dono do sistema revisa |
| 2 | Ambiente determinístico | ambiente com dados fictícios, relógio fixo, `estado-inicial.dump`, `caso.yaml` | Técnico |
| 3 | Roteiros | `roteiros/*.yaml` | Técnico |
| 4 | Piloto | uma funcionalidade completa: prints, páginas do PDF e vídeo | **Dono aprova visual, voz e tom** |
| 5 | Captura e anotação | `capturas/` e `anotadas/` | Automático |
| 6 | Redação | `capitulos/*.md` e narração nos roteiros | Dono revisa os textos |
| 7 | Montagem | PDFs e MP4 | Automático |
| 8 | Portões | relatório dos portões, tudo passando | Técnico |
| 9 | Validação com usuários | registro das sessões e ajustes | Dono |
| 10 | Publicação | Release com PDFs e MP4, local de acesso | Dono |
| 11 | Manutenção | nova rodada a cada versão | Técnico; dono revisa o que mudou |
| 12 | Ajuda no sistema e assistente (opcional) | base de conhecimento no sistema, perguntas frequentes e assistente | **Dono aprova a especificação**; encarregado de dados e TI, o assistente |

## 1. Inventário

Parta da especificação do sistema (casos de uso, telas, perfis, regras), não da navegação livre pelas telas.

- **Organize por perfil × tarefa, não por tela.** O usuário não pensa "tela TL-03"; pensa "enviar os comprovantes do
  mês". Uma tarefa pode passar por várias telas, e uma tela pode servir a várias tarefas.
- Para cada perfil, liste o que ele **faz** (verbos: enviar, corrigir, aprovar, gerar, autorizar) e o que ele
  **consulta** (painel, situações, avisos). Cada item vira uma linha da matriz.
- Marque a frequência: tarefa do dia a dia, do mês, rara. As frequentes ganham vídeo; as raras podem ficar só no
  manual (com justificativa na matriz).
- Agrupe as linhas nos manuais: em regra, **um PDF por perfil**. O perfil mais numeroso merece o manual mais curto.

Formato da `matriz.md`:

| Perfil | Tarefa | Caso de uso / tela | Roteiro | Capítulo | Vídeo | Observação |
|---|---|---|---|---|---|---|
| Servidor | Enviar os comprovantes do mês | UC-03 / TL-03 | `srv-enviar` | `srv-enviar.md` | V03 | piloto |
| Servidor | Enviar pelo celular | UC-03 / TL-03 | `srv-enviar-celular` | — (seção do anterior) | V04 | |
| Administração | Exportar a trilha | TL-14 | `adm-trilha` | `adm-trilha.md` | — | rara: só manual |

Toda linha precisa de roteiro, capítulo e vídeo, ou de justificativa na coluna de observação (portão 2).

## 2. Ambiente determinístico

O objetivo é que duas rodadas no mesmo código produzam prints e vídeos iguais. Sem isso, a etapa 11 (rever só o que
mudou) não funciona.

- **Dados fictícios.** Use a carga de teste do próprio sistema. Os arquivos que o usuário envia nos roteiros ficam em
  `casos/<sistema>/documentos/`, gerados com os mesmos dados fictícios (nomes "exemplo", CNPJ e CPF de teste).
- **Relógio fixo.** Datas na tela ("hoje", prazos, "há 3 dias") mudam todo dia e estragam a comparação. Se o sistema
  aceita um "hoje" configurável (variável de ambiente, por exemplo), fixe-o; senão, peça a quem desenvolve.
- **Cópia do banco para restaurar.** Recrie o ambiente do zero uma vez (volumes apagados, migração e carga), espere
  as rotinas de partida terminarem e tire a cópia em `.cache/estado-inicial.dump`. Os comandos de
  `estado.restaurar` no `caso.yaml` voltam o banco a essa cópia em segundos; o roteiro com `estado: inicial` os
  executa antes de começar. Assim cada roteiro roda sozinho e em qualquer ordem. Ao mudar a carga de teste ou o
  esquema do banco, tire a cópia de novo.
- **Contas por perfil.** Uma conta fictícia por perfil, com senha fixa só do ambiente local, entrando pela tela de
  entrada real (`perfis.<perfil>.entrada` no `caso.yaml`).
- **Lista do que esconder.** Percorra as telas procurando o que não existe na produção: faixa de ambiente, botões
  "entrar como", painéis de depuração, avisos de versão. Cada um vira uma linha em `ocultar:` (seletor CSS ou o texto
  exato do bloco).
- **Endereço só nesta máquina**, com projeto Docker separado do ambiente de desenvolvimento, para que o banco do kit
  não se misture com o de quem programa.

## 3. Roteiros

**Um roteiro = uma tarefa do usuário**, do ponto em que ele decide fazê-la até a confirmação de que deu certo.

- **Alvos por papel e nome acessível**, como nos testes ponta a ponta: `{ papel: button, nome: Enviar ao RH }`. Se o
  botão mudar de lugar, o destaque acompanha; se mudar de nome, o roteiro falha e avisa (é exatamente o que se
  quer: o texto do manual também precisa mudar). Use `dentro:` para desambiguar ("o Confirmar **desta** despesa"),
  `exato: true` quando um nome é prefixo de outro, `nome_comeca` para nomes com parte variável. `css` é o último
  recurso.
- **Comece onde o usuário começa.** `inicio` é a página em que a gravação começa (em geral o painel, já com a
  entrada feita); a entrada no sistema tem roteiro próprio.
- **Quando capturar** (`captura: true`): no passo que muda a tela de forma que o leitor precisa ver (abrir uma
  página, escolher arquivos, conferir um resultado, confirmar numa janela) e no resultado final. Não capture passos
  repetidos ("faça o mesmo nas outras despesas"): eles entram no texto e no vídeo, sem print. Um capítulo bom tem de
  4 a 8 prints.
- **Passos de leitura** (`acao: nenhuma`) servem para mostrar e explicar uma área da tela (o resumo, a situação, a
  mensagem de sucesso). O alvo é a área; o destaque vai nela.
- **Espere o que o usuário espera.** `espera_texto` segura o roteiro até a mensagem que o usuário vê aparecer
  ("Leitura concluída…"), em vez de esperar um tempo fixo.
- **`enquadrar`**: `detalhe` (padrão) recorta ao redor do alvo, bom para botões; `tela` mantém a janela inteira, bom
  para o primeiro print de uma página nova, que dá contexto.
- Cada passo tem dois textos: `texto` (o do manual, com os termos da tela em **negrito**) e `narracao` (o falado no
  vídeo, mais curto). Regras de cada um em `GUIA_DE_ESTILO.md`.
- Inclua um caminho de erro comum quando ele for frequente (arquivo errado, campo obrigatório): vira a seção "se der
  errado" do capítulo.

## 4. Piloto

Antes de escrever os outros roteiros, produza **uma funcionalidade de ponta a ponta**: prints anotados, as duas ou
três páginas do PDF e o vídeo. Escolha a tarefa mais usada pelo perfil mais numeroso.

O piloto existe para o dono do sistema aprovar o que é design e não se muda depois sem retrabalho:

- cor e estilo do destaque, capa e páginas do PDF com a marca;
- **voz da narração**: gere a mesma fala com 3 a 5 vozes finalistas e deixe o dono escolher **de ouvido** (no caso de
  referência, 24 vozes comparadas, 5 finalistas, escolhida uma voz pt-BR nativa);
- tom e tamanho dos textos, abertura e fecho do vídeo, ritmo.

Registre a aprovação (data e o que foi decidido) no plano do caso. Sem ela, não comece a etapa 5 em escala.

## 5. Captura e anotação

Automáticas: `capturar` e depois `anotar` para cada roteiro. A anotação fica separada da captura (as caixas dos
alvos vão para `caixas.json`), então mudar o estilo do destaque não exige recapturar.

Confira à mão, nesta ordem, nos primeiros roteiros de cada perfil: o destaque está no alvo certo; nenhum elemento de
ambiente de teste apareceu; o recorte de `detalhe` mostra contexto suficiente.

## 6. Redação

Cada capítulo segue o **molde fixo** (detalhado no `GUIA_DE_ESTILO.md`):

1. **Para que serve** — uma ou duas frases.
2. **Quando usar** — a situação do usuário (todo mês, quando um comprovante volta devolvido…).
3. **Antes de começar** — o que ter à mão (arquivos, prazo, perfil).
4. **Passo a passo** — o marcador `{{passos}}`, que o motor troca pelos passos numerados com os prints anotados.
5. **O que acontece depois** — a situação nova, o aviso, o e-mail que chega.
6. **Se der errado** — as mensagens de erro da tela, entre aspas, e o que fazer em cada uma.

Narração: frases curtas, segunda pessoa ("você"), verbo no imperativo ("clique em", "confira"). **Datas e valores
podem ser escritos como na tela**: o normalizador (`motor/normalizar.ts`) os passa para extenso antes da síntese
("20/11/2026" vira "20 de novembro de 2026"; "R$ 1.234,56" vira "mil duzentos e trinta e quatro reais e cinquenta e
seis centavos"), porque muitas vozes leem a forma numérica errado. Ainda assim, ouça o piloto: siglas, códigos e
nomes próprios às vezes precisam ser escritos como se falam na `narracao`.

Além dos capítulos, cada manual tem: glossário (termos da tela), situações possíveis e o que significam, perguntas
frequentes e como relatar um problema.

## 7. Montagem

`narrar` → `gravar` → `montar-video` para cada roteiro; `montar-pdf` para cada manual. A narração é gerada **antes**
da gravação: o motor espera em cada passo a duração da fala, e vídeo e áudio ficam sincronizados sem edição. A
legenda sai do próprio texto da narração, com os tempos reais.

## 8. Portões de qualidade

Nada é entregue com portão falhando. `motor/checar.ts` cobre os automáticos; os outros têm dono.

| # | Portão | Critério | Como |
|---|---|---|---|
| 1 | Roteiros | Todos rodam do começo ao fim sem erro; alvo não encontrado falha mostrando a tela e o passo | `capturar` e `gravar` |
| 2 | Cobertura | Toda linha da `matriz.md` tem roteiro, capítulo e vídeo, ou justificativa | Automático |
| 3 | Linguagem | Nenhum termo proibido (IA, inteligência artificial, caminhos locais, nomes de ferramentas internas); só o vocabulário único da interface; ortografia com acentuação | Automático + revisão |
| 4 | Privacidade | Nenhum elemento de ambiente de teste nos prints e vídeos; só massa fictícia | Automático + olhar humano por amostra |
| 5 | PDF | Marcado, com marcadores, idioma pt-BR, texto alternativo em toda figura (gerado do texto do passo e revisado) | Automático |
| 6 | Vídeo | Até 2 min, legenda presente e sincronizada, volume normalizado | Automático |
| 7 | Mudança de tela | Comparação com a rodada anterior; capítulo cuja tela mudou vai para revisão de texto | Automático + revisão |
| 8 | Validação com gente | Etapa 9 feita e ajustes aplicados nos roteiros e capítulos | Dono |

## 9. Validação com usuários reais

Um teste curto, com poucas pessoas, mostra o que nenhum portão mostra. No caso de referência: **3 usuários do perfil
mais numeroso e 1 de cada perfil operacional**.

Protocolo:

1. Escolha 3 a 5 **tarefas reais** da matriz, as mais frequentes.
2. Dê à pessoa só o manual ou o vídeo daquela tarefa, no ambiente de dados fictícios. Ninguém ajuda durante a tarefa.
3. Anote, por tarefa: **sucesso** (sim, com dificuldade, não), **tempo** até concluir, **dúvidas** (onde parou, o que
   perguntou, o que leu errado).
4. No fim, duas perguntas: "o que faltou no manual?" e "o que sobrou?".

| Pessoa (perfil) | Tarefa | Sucesso | Tempo | Dúvidas e onde parou |
|---|---|---|---|---|
| P1 (servidor) | Enviar os comprovantes do mês | com dificuldade | 6 min | não achou "Escolher arquivos" no celular |

Os ajustes entram **nos roteiros e capítulos**, nunca nos arquivos gerados; depois, nova rodada. Tempos medidos com
poucas pessoas são indicação, não meta: diga isso se forem citados.

## 10. Publicação

- PDFs e MP4 (com `.srt` e `.vtt`) publicados como **Release** do repositório, com o número da versão do sistema que
  retratam.
- Onde o usuário acessa (pasta institucional, canal de vídeos não listado, página de ajuda do próprio sistema) é
  decisão do dono. Ligar o manual à ajuda do sistema é mudança de funcionalidade: entra na especificação do sistema,
  não no kit.

## 11. Manutenção

A cada versão do sistema, **rode tudo**: é barato. O portão 7 compara com a rodada anterior e aponta o que mudou;
só esses capítulos são revisados e só as falas que mudaram são narradas de novo (o áudio fica em cache por texto).
Roteiro que falha por alvo não encontrado indica tela mudada: corrija o roteiro e o texto juntos.

## 12. Ajuda no sistema e assistente (opcional)

Com o manual pronto, o mesmo conhecimento entra no sistema: perguntas frequentes por perfil (página Ajuda e aba
**Nesta tela** num painel aberto pelo botão **Ajuda** em toda tela) e, se o órgão aceitar o serviço externo, um
assistente que sabe a tela, a trilha da sessão e a situação do usuário. O rascunho da base sai do manual
(`motor/base-ajuda.ts`), passa por curadoria e pelo portão `motor/checar-ajuda.ts`; especificação, ADR, instruções e
casos de avaliação têm modelo em `modelos/ajuda/`. Tudo em `docs/PADRAO_AJUDA_E_ASSISTENTE.md`. Nada é desenvolvido
antes de o dono aprovar a especificação; o assistente só liga depois da avaliação com o serviço real dentro das metas.

## Teste de replicação

Para provar que o método se sustenta sozinho, aplique-o a um segundo sistema seguindo só o `README.md` e este
documento. O que faltar ou confundir vira correção no kit, não conhecimento na cabeça de quem fez.

## Checklist de entrega

- [ ] `matriz.md` completa; toda linha com roteiro, capítulo e vídeo, ou justificativa
- [ ] Ambiente com dados fictícios, relógio fixo e `estado-inicial.dump` atual
- [ ] `ocultar:` cobre todo elemento de ambiente de teste; entrada sempre pela tela real
- [ ] Piloto aprovado pelo dono (visual, voz, tom), com data registrada
- [ ] Todos os roteiros rodam do começo ao fim (portão 1)
- [ ] Capítulos no molde fixo; glossário, situações, perguntas frequentes e "como relatar um problema"
- [ ] Textos revisados pelo dono
- [ ] Nenhuma menção a IA, caminho local ou ferramenta interna nos PDFs e vídeos (portão 3)
- [ ] Vocabulário único da interface em todos os textos e falas
- [ ] Nenhum dado real, nenhum elemento de ambiente de teste nas imagens (portão 4)
- [ ] PDFs marcados, com marcadores, pt-BR e texto alternativo revisado (portão 5)
- [ ] Vídeos de até 2 min, com legenda sincronizada e volume normalizado (portão 6)
- [ ] Validação com usuários feita; ajustes aplicados nos roteiros e capítulos
- [ ] Release publicada com a versão do sistema; local de acesso decidido pelo dono
- [ ] `saida/`, `.cache/` e qualquer segredo fora do git
- [ ] (etapa 12, se feita) base da ajuda com 0 erro em `checar-ajuda.ts`; avaliação do assistente dentro das metas e lida
