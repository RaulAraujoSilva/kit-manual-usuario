# Matriz de cobertura — sistema de comprovantes de saúde e educação

Inventário das tarefas do usuário por perfil, com o caso de uso e a tela da especificação, o roteiro que gera o passo a
passo (prints e vídeo), o capítulo do manual (PDF por perfil, D1) e o vídeo (V01–V18 do plano, seção 4.2).

Fontes: código e testes ponta a ponta do sistema no commit `31b0feb` (cópia `worktrees/manual`), especificação
(`02_PERFIS_E_JORNADAS.md`, `04_CASOS_DE_USO.md`, `11_TELAS.md`, seções "Situação na R1") e a carga de teste
(`prisma/seed`, massa fictícia). Rascunho de 09/11/2026: os alvos marcados `# conferir` nos roteiros ainda precisam ser
confirmados na tela.

Legenda da situação na R1: **Implementado** entra no manual; **Parcial** entra no manual só na parte que existe (dito na
coluna Observação); **Pendência** não entra no manual (lista no fim).

## Servidor (PER-SRV) — Guia do servidor

| # | Funcionalidade (tarefa do usuário) | UC | Tela (rota) | Roteiro | Capítulo do manual | Vídeo | Situação R1 | Observação |
|---|---|---|---|---|---|---|---|---|
| S1 | Entrar com CPF ou matrícula e senha; trocar a senha; sair | UC-01 | TL-01 `/entrar`; `/senha`; menu do usuário | `srv-entrar` | Entrar, trocar a senha e sair | V01 | Implementado | Sair aparece no fim do `srv-painel`. Troca a senha da conta de teste: rodar por último |
| S2 | Primeiro acesso: receber a senha provisória por e-mail e criar a própria senha | UC-01, UC-17 | e-mail (caixa de teste) → `/entrar` → `/senha` | `srv-primeiro-acesso` | Entrar, trocar a senha e sair (seção "Primeiro acesso") | — (pode entrar no V01) | Implementado | Não roda no motor atual (senha provisória sorteada; caixa de teste fora do sistema) |
| S3 | Entender o painel: cartão "Agora", faixa de meses, andamento, tabela do mês, glosa, reembolsado no ano, beneficiários | UC-04 | TL-02 `/servidor` | `srv-painel` | Entender o painel e as situações | V02 | Implementado | — |
| S4 | Enviar os comprovantes do mês pelo computador (arquivos primeiro, pares montados, confirmar tipo e quem consta, Enviar ao RH, protocolo) | UC-02, UC-03 | TL-03 `/servidor/enviar` | `srv-enviar` (já existe) | Enviar os comprovantes do mês | V03 | Implementado | Leitura automática só de PDF com texto no ambiente local |
| S5 | Enviar pelo celular (barra de baixo, Tirar foto, Escolher arquivos) | UC-02, UC-03 | TL-03 `/servidor/enviar` (360–390 px) | `srv-enviar-celular` | Enviar os comprovantes do mês (seção "Pelo celular") | V04 | Parcial | Leitura de foto e de PDF sem texto ligada só por configuração (DEC-09): o roteiro mostra "Tirar foto" e envia PDFs. Precisa de janela de celular no motor |
| S6 | Arrumar as despesas antes de enviar: Corrigir dados, Separar documentos, Mover para…, Retirar do envio, Desfazer, Nova despesa à mão | UC-02, UC-03 | TL-03 `/servidor/enviar` | `srv-arrumar-despesas` | Enviar os comprovantes do mês (seção "Se algo não estiver certo") | — (complemento do V03) | Implementado | Separar um PDF consolidado nas peças é pendência |
| S7 | Corrigir um comprovante devolvido e reenviar (só o documento devolvido; protocolo -R1; valor e folha prevista) | UC-05 | TL-04 `/servidor/corrigir/[id]` | `srv-corrigir` | Corrigir um comprovante devolvido | V05 | Implementado | Depende da devolução feita no `rh-devolver-conforme`; precisa de um PDF fictício novo (ver o roteiro) |
| S8 | Ler os avisos (sino, Não lidos, Ver motivo, Marcar como lido, atalho para corrigir ou enviar) | UC-04 | TL-05 `/servidor/avisos` | `srv-avisos` | Ler os avisos e os e-mails | V06 (1/3) | Implementado | Lembrete da competência já enviada fica sem "Enviar comprovantes" (PT-8, no código) |
| S9 | Receber os avisos por e-mail (devolução, reprovação, lembretes de 15, 7 e 1 dia) | UC-04, UC-08, UC-09 | e-mail (caixa de teste, Mailpit) | `srv-email` | Ler os avisos e os e-mails | — (pode entrar no V06) | Implementado | O e-mail não traz valores nem emitente. Precisa de início com endereço absoluto no motor |
| S10 | Consultar os dependentes e o que cada um pode receber; total do ano; como pedir inclusão ao RH | UC-04 (consulta) | TL-12 (visão do servidor) `/servidor/dependentes` | `srv-dependentes` | Dependentes e pedido de inclusão | V06 (2/3) | Implementado (consulta) | Pedido de inclusão pelo sistema é R2: o manual orienta a levar os documentos ao RH |
| S11 | Meus dados, Ajuda (contato do RH, prazos, perguntas frequentes), Privacidade e Acessibilidade | UC-04 | `/servidor/dados`, `/servidor/ajuda`, `/privacidade`, `/acessibilidade` | `srv-dados-e-ajuda` | Meus dados, ajuda, privacidade e acessibilidade | V06 (3/3) | Implementado | Acessibilidade entra no texto (o roteiro abre só Privacidade); as perguntas frequentes da Ajuda alimentam o capítulo "Perguntas frequentes" |
| — | Aviso de sessão: "Sua sessão termina em 2 minutos" e "Continuar conectado" | UC-01 | todas as telas | sem roteiro | Entrar, trocar a senha e sair (nota) | — | Implementado | Exige esperar 28 minutos ou relógio falso: vira nota com print avulso |

## Analista do RH (PER-RH) — Manual do RH

| # | Funcionalidade (tarefa do usuário) | UC | Tela (rota) | Roteiro | Capítulo do manual | Vídeo | Situação R1 | Observação |
|---|---|---|---|---|---|---|---|---|
| R1 | Acompanhar o painel do mês: competência, fila "O que precisa de você", cobranças automáticas, pago no mês anterior, gráfico e tabela, indicadores; "Ver meus comprovantes" | UC-16 | TL-06 `/rh` | `rh-painel` | Painel do RH e indicadores | V07 | Implementado | — |
| R2 | Aprovar os conformes em lote (todos ou selecionados), com Desfazer | UC-07 | TL-07 `/rh/comprovantes?situacao=conforme` | `rh-aprovar-conformes` | Aprovar os conformes em lote | V08 | Implementado | O número de conformes muda com os roteiros anteriores |
| R3 | Analisar uma divergência na análise completa e decidir (Aprovar, Aprovar com outro valor, Devolver, Reprovar) e desfazer | UC-08 | TL-07 `/rh/divergencias` → TL-08 `/rh/comprovantes/[id]` | `rh-divergencia` | Analisar divergências e decidir | V09 | Parcial | Realce do campo divergente só na faixa de comparação (sobre a página do documento é pendência) |
| R4 | Aprovar informando o valor (divergência sem valor calculado), com justificativa | UC-08 | TL-08 `/rh/comprovantes/[id]` | `rh-aprovar-com-valor` | Analisar divergências e decidir (seção "Sem valor calculado") | — (o V09 cita) | Implementado | Escolher na lista uma divergência com "Sem valor reembolsável calculado" |
| R5 | Decidir pelo painel lateral da lista, inclusive devolver ou reprovar um conforme | UC-08 | TL-07 `/rh/comprovantes` (painel lateral) | `rh-devolver-conforme` | Analisar divergências e decidir (seção "Pelo painel lateral") | — (prepara o V05) | Implementado | Gera o aviso (S8), o e-mail (S9) e o devolvido (S7) |
| R6 | Conferir a amostra sorteada (motivo do sorteio, semente, Confirmar e aprovar) | UC-06, UC-08 | TL-07 `/rh/amostra` | `rh-amostra` | Conferir a amostra | V10 | Implementado | — |
| R7 | Acompanhar quem não enviou: filtros, Exportar CSV, pausar e reativar a cobrança de um servidor, aba Lembretes | UC-09, UC-10 | TL-11 `/rh/sem-envio` | `rh-sem-envio` | Sem envio, lembretes e faltas de comprovação | V11 | Implementado | O lembrete D-15 sai pela rotina diária (contêiner de rotinas), não pela tela |
| R8 | Decidir uma falta de comprovação (ampla defesa, suspensão, arquivar) | UC-10 | TL-11 `/rh/sem-envio?aba=faltas` | `rh-faltas` | Sem envio, lembretes e faltas de comprovação | — (o V11 cita) | Parcial | Falta sanada e desconto integral são pendência |
| R9 | Consultar servidores e incluir ou alterar um dependente | UC-13 | TL-12 `/rh/servidores`, `/rh/servidores/[id]` | `rh-servidores` | Servidores e dependentes | V12 | Implementado | — |
| R10 | Suspender ou restabelecer um auxílio | UC-13 | TL-12 `/rh/servidores/[id]` | `rh-situacao-auxilio` | Servidores e dependentes | — (o V12 cita) | Implementado | — |
| R11 | Importar o cadastro funcional (prévia e aplicação) | UC-13 | TL-12 `/rh/servidores` | `rh-importar-cadastro` | Servidores e dependentes | — | Implementado | Precisa de CSV fictício (ver o roteiro) |
| R12 | Calendário, tetos (nova vigência), parâmetros e catálogos (motivos, rubricas) | UC-15 | TL-13 `/rh/parametros` | `rh-parametros` | Calendário, tetos e parâmetros | V13 | Implementado | — |
| R13 | Gerar o lote: conferir pendências e totais, ver os arquivos, enviar para autorização | UC-11 | TL-09 `/rh/lote` | `rh-lote` | Gerar o lote e entregar à folha | V14 | Implementado | Usa setembro/2026 (pronto para o lote na carga) |
| R14 | Ajustar o lote devolvido pela coordenação e reenviar | UC-11 | TL-09 `/rh/lote` | `rh-ajustar-lote` | Gerar o lote e entregar à folha | — (o V14 cita) | Implementado | Quem elaborou recebe e-mail com o motivo |
| R15 | Registrar entrega à folha, juntada ao SEI e pagamento | UC-12 | TL-09 `/rh/lote` | `rh-registrar-entrega` | Gerar o lote e entregar à folha | — (pode ser a parte 2 do V14) | Implementado | Registro à mão; envio automático à folha e juntada pelo SEI são R3 |
| R16 | Relatório mensal para o SEI (prévia por seção, Baixar PDF, integridade) | UC-12 | TL-10 `/rh/relatorio` | `rh-relatorio` | Relatório mensal para o SEI | V15 | Implementado | — |
| — | O ciclo do mês em uma página | UC-02 a UC-12 | — | sem roteiro | O ciclo do mês em uma página | — | — | Texto e diagrama a partir da jornada do 02 |

## Coordenação do RH (PER-CRH) — Manual do RH, capítulo Coordenação

| # | Funcionalidade (tarefa do usuário) | UC | Tela (rota) | Roteiro | Capítulo do manual | Vídeo | Situação R1 | Observação |
|---|---|---|---|---|---|---|---|---|
| C1 | Acompanhar o painel e os indicadores (sem ações do RH) | UC-16 | TL-06 `/rh` | `crh-indicadores` | Coordenação (seção "O painel da coordenação") | — (o V07 mostra o painel) | Implementado | Menu só com Painel, Gerar lote, Relatório SEI e Perfis a aprovar (issue #6, no código) |
| C2 | Autorizar e gerar o lote; ver os arquivos com SHA-256 | UC-11 | TL-09 `/rh/lote` | `crh-autorizar-lote` | Coordenação: autorizar ou devolver o lote | V16 (1/2) | Implementado | Lote gerado não se desfaz |
| C3 | Devolver o lote para ajuste, com motivo | UC-11 | TL-09 `/rh/lote` | `crh-devolver-lote` | Coordenação: autorizar ou devolver o lote | V16 (2/2) | Implementado | — |
| C4 | Aprovar ou recusar o perfil do RH pedido pela administração | UC-17 | `/rh/acessos` | `crh-aprovar-acessos` | Coordenação: aprovar acessos | V17 | Implementado | Depende do `adm-contas` |
| — | Relatório SEI | UC-12 | TL-10 `/rh/relatorio` | `rh-relatorio` (mesma tela) | Relatório mensal para o SEI | V15 | Implementado | A coordenação abre a mesma tela do RH |

## Administração (PER-ADM) — Manual da administração

| # | Funcionalidade (tarefa do usuário) | UC | Tela (rota) | Roteiro | Capítulo do manual | Vídeo | Situação R1 | Observação |
|---|---|---|---|---|---|---|---|---|
| A1 | Incluir conta (servidor ou técnica) e atribuir perfis; alterar perfis | UC-17 | TL-14 `/admin` | `adm-contas` | Contas e perfis | V18 (1/3) | Implementado | Senha provisória vai ao e-mail; perfil do RH espera a coordenação |
| A2 | Bloquear e desbloquear conta com motivo; enviar nova senha provisória | UC-17 | TL-14 `/admin` | `adm-bloquear-conta` | Contas e perfis | V18 (2/3) | Implementado | — |
| A3 | Consultar a trilha (filtros, detalhe), verificar o encadeamento, exportar CSV | UC-17 | TL-14 `/admin?aba=trilha` | `adm-trilha` | Trilha de auditoria, filtros e exportação | V18 (3/3) | Parcial | Alerta ativo de quebra da trilha é pendência; a verificação na tela e a rotina diária existem |

## Páginas de apoio e e-mails (onde estão cobertos)

| Item | Rota ou canal | Roteiro | Capítulo |
|---|---|---|---|
| Ajuda | `/servidor/ajuda` | `srv-dados-e-ajuda` | Guia do servidor › Meus dados, ajuda… e Perguntas frequentes |
| Meus dados | `/servidor/dados` | `srv-dados-e-ajuda` | Guia do servidor › Meus dados, ajuda… |
| Privacidade | `/privacidade` (pública) | `srv-dados-e-ajuda` | Guia do servidor › Meus dados, ajuda… |
| Acessibilidade | `/acessibilidade` (pública) | `srv-dados-e-ajuda` (texto) | Guia do servidor › Meus dados, ajuda… (os três manuais citam) |
| Avisos | `/servidor/avisos` | `srv-avisos` | Guia do servidor › Ler os avisos e os e-mails |
| Troca de senha | `/senha` (todos os perfis, pelo menu do usuário) | `srv-entrar`, `srv-primeiro-acesso` | Guia do servidor › Entrar…; os manuais do RH e da administração remetem a ele |
| E-mail de devolução e de reprovação | caixa de teste (Mailpit, `http://localhost:8028`) | `srv-email` | Guia do servidor › Ler os avisos e os e-mails |
| E-mails de lembrete (15, 7 e 1 dia) | caixa de teste | `srv-email` (texto) | Guia do servidor › Ler os avisos e os e-mails |
| E-mail da senha provisória | caixa de teste | `srv-primeiro-acesso` | Guia do servidor › Entrar… (Primeiro acesso) |
| E-mail "lote devolvido para ajuste" a quem elaborou | caixa de teste | `rh-ajustar-lote` (texto) | Manual do RH › Gerar o lote e entregar à folha |

## Vídeos × roteiros

| Vídeo | Roteiro(s) | Nota |
|---|---|---|
| V01 Entrar e trocar a senha | `srv-entrar` | `srv-primeiro-acesso` pode virar um trecho, quando o motor ler a senha do e-mail |
| V02 Conhecer o painel | `srv-painel` | — |
| V03 Enviar os comprovantes do mês | `srv-enviar` | `srv-arrumar-despesas` fica só no manual (ou vira vídeo curto, se a validação pedir) |
| V04 Enviar pelo celular | `srv-enviar-celular` | precisa da janela de celular no motor |
| V05 Corrigir um comprovante devolvido | `srv-corrigir` | — |
| V06 Avisos, dependentes e meus dados | `srv-avisos` + `srv-dependentes` + `srv-dados-e-ajuda` | **Decidir**: um roteiro de vídeo que encadeia os três, ou três vídeos curtos (o motor grava um roteiro por vídeo) |
| V07 Painel do RH | `rh-painel` | — |
| V08 Aprovar os conformes em lote | `rh-aprovar-conformes` | — |
| V09 Analisar uma divergência e decidir | `rh-divergencia` | — |
| V10 Conferir a amostra | `rh-amostra` | — |
| V11 Sem envio e cobranças | `rh-sem-envio` | — |
| V12 Servidores e dependentes | `rh-servidores` | — |
| V13 Calendário, tetos e parâmetros | `rh-parametros` | — |
| V14 Gerar o lote | `rh-lote` | `rh-registrar-entrega` pode ser a parte 2 |
| V15 Relatório mensal para o SEI | `rh-relatorio` | — |
| V16 Autorizar ou devolver o lote | `crh-autorizar-lote` + `crh-devolver-lote` | **Decidir**: mesmo caso do V06 |
| V17 Aprovar acessos | `crh-aprovar-acessos` | — |
| V18 Contas e trilha de auditoria | `adm-contas` + `adm-bloquear-conta` + `adm-trilha` | **Decidir**: mesmo caso do V06; os três somam mais de 2 minutos |

Roteiros sem vídeo próprio (só manual): `srv-arrumar-despesas`, `srv-email`, `srv-primeiro-acesso`,
`rh-devolver-conforme`, `rh-aprovar-com-valor`, `rh-faltas`, `rh-situacao-auxilio`, `rh-importar-cadastro`,
`rh-ajustar-lote`, `rh-registrar-entrega`, `crh-indicadores`. Justificativa: tarefa rara, variação de uma tarefa que já
tem vídeo, ou preparo de estado para outro roteiro.

Capítulos com mais de um roteiro (Enviar; Avisos e e-mails; Decidir; Sem envio; Servidores; Lote; Coordenação; Contas):
o contrato do `montar-pdf` hoje é um capítulo por roteiro com `{{passos}}`; precisa de `{{passos:<roteiro>}}` ou de um
capítulo por roteiro agrupado no `manuais/<manual>.yaml`.

## Pendências da R1 (fora do manual)

| Pendência | Referência | Efeito no manual |
|---|---|---|
| Entrar com a conta da rede | UC-01, INT-01, DEC-10 | O manual só ensina a entrada com CPF ou matrícula e senha do sistema |
| Pedido de inclusão de dependente pelo sistema, adesão e declarações | UC-14, HIS-CAD-08, HIS-CAD-09 (R2) | O manual orienta a levar os documentos ao RH; a tela já diz "chega em breve" |
| Aviso no celular (notificação) | RF-COB-06, HIS-COB-06 (R2) | Não citar; a página Avisos já diz "a partir da próxima versão" |
| Canal de apoio: envio registrado pelo RH em nome do servidor | UC-02, M-CSE-11 | Não citar; a Ajuda manda falar com o RH |
| Separar um PDF consolidado nas peças | RF-ENV-05, RN-CNF-06 | O manual pede um arquivo por documento |
| Leitura de foto e de PDF sem texto pelo serviço externo | UC-03, INT-03, DEC-09 (parcial: ligada só por configuração) | O manual mostra "Tirar foto" sem prometer leitura automática da foto; se a foto não for lida, o servidor digita os dados |
| Realce do campo divergente sobre a página do documento | RF-ANL-05, CMP-32 (parcial) | O manual mostra o realce na faixa de comparação |
| Aviso de pagamento ao servidor | TL-05, ALR-08 | O manual diz que o pagamento aparece no painel ("Pago na folha"), sem aviso |
| Falta sanada e desconto integral; Devolvido → Reprovado pela falta decidida | UC-10, DEC-07, RN-COB-01 | O manual descreve só abrir a falta e decidir (ampla defesa, suspensão, arquivar) |
| Alerta ativo de quebra da trilha | UC-17, SEG-LOG-04 | O manual ensina a verificação na tela |
| Envio direto à folha e juntada automática ao SEI | UC-12, RF-LOT-10, RF-LOT-11 (R3) | O manual ensina o registro à mão |
| Consulta sem ação da coordenação nas telas de cobrança, cadastro e parâmetros | 11 (decisões abertas), LAY-03 | Na R1 a coordenação não tem essas telas no menu; o manual não as cita para ela |
| Elementos do protótipo fora da especificação (avisos de recebimento e de aprovação, falta da saúde em etapas, versões numeradas de parâmetros, atalhos de filtro em contadores, baixar o arquivo original, cartões de resumo na TL-11) | decisão do dono do processo | Não citar |

### Diferença entre a especificação e o código

A seção "Situação na R1" do `11_TELAS.md` e do `02_PERFIS_E_JORNADAS.md` ainda marca como **Pendência** o acabamento
do servidor (PT-8: contato do RH configurável, lembrete sem botão depois do envio, reenvio com valor e folha, total do
ano em Dependentes) e o menu da coordenação (issue #6). No commit `31b0feb` os dois estão no código e nos testes ponta a
ponta (`pt8-acabamento-servidor.spec.ts`, `menu-por-perfil.spec.ts`). A matriz trata os dois como **implementados**;
convém atualizar a especificação.
