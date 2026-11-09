# Kit de manual do usuário e vídeos

Produz, a partir do **sistema rodando**, o manual do usuário em PDF (prints com retângulo no alvo, seta e número do
passo) e vídeos curtos narrados, um por funcionalidade. Cada tarefa do usuário vira um **roteiro** em YAML que o
motor executa no navegador (Playwright), como um usuário faria: o mesmo roteiro gera as capturas anotadas do PDF e
o vídeo com narração e legenda. Quando a tela mudar, roda de novo e tudo se atualiza.

Princípio: **manual como código**. Nada de print tirado à mão, nem seta desenhada no editor, nem vídeo editado na
mão.

## O que sai

| Entrega | Forma |
|---|---|
| Manual por perfil | PDF A4 marcado (acessível), com sumário, marcadores, idioma pt-BR e texto alternativo em toda figura |
| Vídeo por funcionalidade | MP4 1080p de 1 a 2 min, com abertura, fecho, cursor visível, destaque antes do clique, narração e legenda embutida, mais `.srt` e `.vtt` ao lado |
| Matriz de cobertura | `casos/<sistema>/matriz.md`: perfil × tarefa × roteiro × capítulo × vídeo |

## Pré-requisitos

- **Node 24 ou mais novo** (o motor roda TypeScript direto, sem compilação) e `npm install` na raiz do kit, seguido
  de `npx playwright install chromium`.
- **ffmpeg** e **ffprobe** no `PATH` (montagem do vídeo, duração dos áudios, normalização do volume).
- **Docker**, se o ambiente do sistema sobe por Docker Compose (é o caso de referência).
- **Chave do OpenRouter** na variável de ambiente `OPENROUTER_API_KEY`, para a narração. Só a etapa `narrar` usa;
  o áudio fica em cache por texto, então só é gerado de novo o passo cuja fala mudou. Nunca escreva a chave em
  arquivo do kit.
- Um **ambiente do sistema com dados fictícios**, relógio fixo e contas de teste por perfil (ver `docs/METODO.md`,
  etapa 2). Nunca produção, nunca dados reais.

## Como usar no seu sistema

1. **Crie o caso**: `casos/<sistema>/caso.yaml` com endereço do ambiente, perfis e como entrar com cada um (rótulos
   dos campos e botão da tela de entrada), o que esconder (`ocultar:`), os comandos que voltam o banco ao estado
   inicial (`estado.restaurar`), a marca (cores e logotipo) e a voz. Os tipos estão em `motor/comum.ts` (`Caso`); o
   modelo completo é `casos/comprovantes/caso.yaml`.
2. **Tire a cópia do estado inicial** do banco em `.cache/estado-inicial.dump`, logo depois de recriar o ambiente
   do zero (exemplo no `casos/comprovantes/README.md`).
3. **Faça o inventário** em `casos/<sistema>/matriz.md`: perfil × tarefa do usuário, a partir da especificação.
4. **Escreva os roteiros** em `casos/<sistema>/roteiros/<id>.yaml`, um por tarefa (tipos `Roteiro`, `Passo` e
   `Alvo` em `motor/comum.ts`; exemplo em `casos/comprovantes/roteiros/srv-enviar.yaml`). Alvos sempre por papel e
   nome acessível, nunca por coordenada.
5. **Escreva os capítulos** em `casos/<sistema>/capitulos/<id>.md`, no molde fixo (ver `docs/GUIA_DE_ESTILO.md`),
   com o marcador `{{passos}}` onde entra o passo a passo com as imagens.
6. **Monte a lista de cada manual** em `casos/<sistema>/manuais/<manual>.yaml` (título, perfil, capítulos).
7. **Rode as etapas** (abaixo). Comece por um piloto de uma funcionalidade e só siga depois que o dono do sistema
   aprovar o visual, a voz e o tom.

Com o Claude Code, abra o kit e peça *"faça o manual do usuário e os vídeos do sistema em <endereço>"*: a skill
`.claude/skills/manual-usuario/` conduz as perguntas, o inventário, o piloto e a produção.

## Etapas do motor

Todas rodam da raiz do kit: `node motor/<etapa>.ts <caso> <roteiro>` (o `montar-pdf` recebe o manual no lugar do
roteiro). O que cada etapa lê e grava está em `docs/CONTRATOS.md`.

| Etapa | O que faz | Usa o sistema? | Grava em `saida/<caso>/<roteiro>/` |
|---|---|---|---|
| `capturar` | Restaura o estado (se `estado: inicial`), entra com o perfil, executa os passos e tira o print de cada passo com `captura: true`, guardando a caixa do alvo | **Sim** | `capturas/*.png` e `capturas/caixas.json` |
| `anotar` | Desenha retângulo, seta e número sobre cada print, a partir das caixas (sem recapturar) | Não | `anotadas/*.png` e `anotadas/anotadas.json` |
| `montar-pdf` | Junta capítulos e imagens anotadas no PDF do manual, com a marca | Não | `saida/<caso>/manuais/<manual>.pdf` |
| `narrar` | Normaliza o texto (datas e valores por extenso) e gera o áudio de cada passo, da abertura e do fecho | Não (só o OpenRouter) | `.cache/voz/*.mp3` |
| `gravar` | Executa o roteiro em modo vídeo, com cursor e destaque, esperando em cada passo a duração da fala | **Sim** | `video/bruto.webm` e `video/linha-do-tempo.json` |
| `montar-video` | Corta, junta áudio, abertura e fecho, normaliza o volume e embute a legenda | Não | `<roteiro>.mp4`, `.srt` e `.vtt` |

Ordem por roteiro: `capturar` → `anotar`; `narrar` → `gravar` → `montar-video`. O `montar-pdf` roda depois que
todos os capítulos do manual estão anotados. Os portões de qualidade (`motor/checar.ts`) fecham a produção.

**As etapas que usam o sistema (`capturar` e `gravar`) rodam uma de cada vez**: há um banco só, e cada roteiro o
restaura antes de começar. As demais podem rodar em paralelo.

## Estrutura de pastas

```
kit-manual-usuario/
  README.md                      este arquivo
  docs/
    METODO.md                    a metodologia em 11 etapas e o checklist de entrega
    GUIA_DE_ESTILO.md            redação, anotação, vídeo, acessibilidade e o que nunca aparece
    CONTRATOS.md                 o que cada etapa do motor lê e grava
  .claude/skills/manual-usuario/ skill do Claude Code que conduz o processo
  motor/                         TypeScript + Playwright (comum, capturar, anotar, narrar, normalizar, gravar,
                                 montar-video, montar-pdf, checar)
  casos/<sistema>/
    caso.yaml                    endereço, perfis, ocultar, restaurar, marca, voz
    README.md                    como ligar o ambiente do caso e tirar a cópia do banco
    matriz.md                    cobertura: perfil × tarefa × roteiro × capítulo × vídeo
    roteiros/*.yaml              um por tarefa do usuário
    capitulos/*.md               texto do manual, um por roteiro
    manuais/*.yaml               título, perfil e capítulos de cada PDF
    documentos/                  arquivos fictícios usados nos envios
    marca/                       logotipos
  saida/                         (fora do git) capturas, PDFs e vídeos
  .cache/                        (fora do git) cópia do banco e áudios em cache
```

Os PDFs e MP4 finais são publicados como Release do GitHub; `saida/` e `.cache/` nunca entram no git.

## Caso de referência: comprovantes

`casos/comprovantes/` é o primeiro caso completo: o sistema de comprovação mensal de despesas de saúde e educação.
Três manuais (servidor, RH e administração) e cerca de 18 vídeos. O roteiro `srv-enviar` ("Enviar os comprovantes
do mês") é o piloto. Como ligar o ambiente e restaurar o banco: `casos/comprovantes/README.md`.

## Cuidados

- **Só dados fictícios.** Massa de teste do próprio sistema e documentos de exemplo em `casos/<sistema>/documentos/`.
  Um print com dado real invalida a entrega.
- **Esconda o que só existe fora da produção**: faixas de "ambiente de teste", atalhos de entrada rápida, botões de
  depuração. Liste-os em `ocultar:` no `caso.yaml`; o motor os esconde em toda página. E entre sempre digitando
  usuário e senha, como na produção, nunca pelos atalhos de teste.
- **Senhas do `caso.yaml` são só as das contas fictícias** do ambiente local. Nunca uma credencial real, nunca
  chave de serviço.
- **Nenhuma menção a IA nos entregáveis** (PDF e vídeos), nem a caminhos locais ou ferramentas internas. Esta
  documentação técnica cita o OpenRouter e modelos de voz; o manual e os vídeos, nunca.
- **Horas e tempos** que aparecerem nos textos são hipótese até a medição com os usuários; diga isso onde aparecerem.
- **Corrija no roteiro ou no capítulo, nunca no arquivo gerado**: o que é editado em `saida/` some na próxima rodada.
