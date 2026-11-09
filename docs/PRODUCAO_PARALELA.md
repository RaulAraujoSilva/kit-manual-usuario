# Produção em paralelo (instruções comuns aos agentes de produção)

O piloto (`srv-enviar`) foi aprovado pelo dono do projeto: o visual do PDF (prints com retângulo, seta e número) e do
vídeo (cursor, destaque, voz Luana, legenda, abertura e fecho) é o padrão. Agora cada agente produz uma parte.

## Ambiente
- Cada agente usa SÓ o seu ambiente, sempre com `KIT_AMBIENTE=<nome>` na frente de todo comando do motor:
  `manual` (http://127.0.0.1:3005, e-mails em :8028), `manual2` (:3006, :8029), `manual3` (:3007, :8030).
  Os três têm a mesma versão do sistema e a mesma massa fictícia; o "hoje" é 05/11/2026. NUNCA use outro ambiente,
  nunca rode `docker compose down`, nunca apague volumes.
- Raiz do kit: `C:\Users\raula\Documents\ABAR-IA\kit-manual-usuario` (rodar os comandos dali). Não faça commit.
- Leia antes: `docs/CONTRATOS.md`, `motor/comum.ts` (tipos: `Roteiro`, `Passo`, `Alvo`), o roteiro aprovado
  `casos/comprovantes/roteiros/srv-enviar.yaml`, o capítulo aprovado `casos/comprovantes/capitulos/srv-enviar.md`,
  `casos/comprovantes/matriz.md`, `casos/comprovantes/ORDEM_DE_GRAVACAO.md` e `docs/GUIA_DE_ESTILO.md`.

## Comandos
- `node motor/capturar.ts comprovantes <roteiro>` → prints + `caixas.json` (restaura o estado antes, conforme `estado:`).
- `node motor/anotar.ts comprovantes <roteiro>` → prints anotados.
- `node motor/gravar.ts comprovantes <roteiro>` e depois `node motor/montar-video.ts comprovantes <roteiro>` → vídeo.
- `node motor/estado.ts salvar comprovantes <nome>` / `restaurar comprovantes [nome]` → cópias do banco do SEU
  ambiente em `.cache/estado-<nome>.dump`. Use nomes com o seu prefixo (`srv-`, `rh-`, `crh-`).
- Esvaziar a caixa de e-mail do seu ambiente: `curl -s -X DELETE <caixa>/api/v1/messages`.
- As rotinas agendadas ficam paradas (a restauração para o contêiner `rotinas`); se um roteiro precisar delas, rode a
  rotina pelo próprio sistema ou registre a limitação.

## Recursos do roteiro (além do piloto)
- `estado: inicial` (padrão) | `atual` (não restaura) | `<nome>` (restaura `.cache/estado-<nome>.dump`).
- `sem_entrada: true` começa fora do sistema (roteiro da tela de entrada); `tela: celular` usa janela de celular.
- Ações: `clicar`, `preencher` (`valor`, ou `valor_do_email: { assunto, padrao }` com o grupo 1 da expressão — ex.:
  senha provisória), `selecionar` (`valor` = rótulo da opção), `enviar_arquivos`, `abrir` (`url` no sistema),
  `abrir_email` (`assunto`: abre o e-mail mais recente na visualização da caixa de teste), `nenhuma`.
  `abrir` e `abrir_email` não têm alvo e não capturam: ponha depois um passo `acao: nenhuma` com alvo e `captura: true`.
- `narracao: ""` = passo sem fala (dura ~1,4 s no vídeo). Use pouco.
- Pré-requisitos de estado de outro perfil (ex.: o RH devolve antes de a servidora corrigir): escreva um roteiro de
  preparo em `casos/comprovantes/roteiros/preparo/<prefixo>-<nome>.yaml` (sem capítulo nem vídeo), rode com
  `capturar` (as capturas dele não vão para nenhum manual), salve o estado com `estado.ts salvar`, e use
  `estado: <nome>` no roteiro que depende dele. Assim cada roteiro roda sozinho, quantas vezes for preciso.
- Capítulo com várias tarefas: o Markdown usa `{{passos:<roteiro>}}` em linha própria; no `manuais/<manual>.yaml`
  a entrada é `{ capitulo: capitulos/<arquivo>.md }`. Capítulo de uma tarefa: o id do roteiro e `{{passos}}`.

## Para cada roteiro do seu lote
1. Mova o rascunho para `roteiros/<id>.yaml` (`git mv`), resolva os alvos marcados `# conferir` olhando a tela de
   verdade (scripts seus de exploração em `.cache/<prefixo>-explorar/`, com `ariaSnapshot()` e prints) e rode
   `capturar` até passar. Tire o `# conferir` resolvido.
2. OLHE cada print anotado (Read na imagem): alvo certo, seta sem cobrir o alvo, nada de faixa de ambiente de teste,
   só dados fictícios. Ajuste `enquadrar: tela` quando o contexto da tela inteira ajudar.
3. Escreva o capítulo no molde aprovado (Para que serve → Quando usar → Antes de começar → Passo a passo →
   O que acontece depois → Se der errado), com fatos tirados da especificação (`...\Sistema de comprovante\especificacao-sistema\especificacao\`
   `04_CASOS_DE_USO.md`, `08_REGRAS_NEGOCIO.md`, `10_UX_UI.md`, `11_TELAS.md`) e do que a tela mostra — sem inventar.
4. Vídeo para os roteiros que a matriz marca com vídeo (um vídeo por roteiro; quando a matriz junta tarefas num
   vídeo só, faça um vídeo por roteiro mesmo — decisão: vídeos curtos por funcionalidade). Depois de montar, extraia
   3–4 quadros com ffmpeg e OLHE: destaque no lugar, cursor visível, telas certas, legenda coerente. Alvo de 1 a 2 min.
5. Texto: português com acentuação correta, 2ª pessoa, frases curtas; vocabulário da interface em negrito; vocabulário
   único (Conforme, Aprovar/Aprovado, Devolver/Devolvido, Reprovar/Reprovado, Enviar ao RH/Enviado ao RH, Gerar
   lote/Lote gerado); "leitura automática"; NUNCA "IA"/"inteligência artificial", caminhos locais ou nomes de
   ferramentas internas (Mailpit, Playwright, OpenRouter) no texto do manual, na narração ou nas legendas — para o
   usuário, a caixa de teste é só "o seu e-mail".
6. Funcionalidade que não roda (limitação do sistema ou do motor): registre no relatório final com o motivo; não
   esconda nem invente.

## Motor
Os arquivos de `motor/` são compartilhados pelos três agentes. Só altere se for indispensável, com mudança pequena e
compatível com os roteiros existentes, e descreva no relatório. Não altere `caso.yaml` nem o piloto `srv-enviar`.

## Relatório final (resposta ao agente principal)
Roteiros prontos (prints, capítulo, vídeo com duração), roteiros com problema e o motivo, estados salvos, alterações
no motor, decisões de texto que o dono do projeto deva ver, e a lista dos arquivos de capítulo e manual criados.
