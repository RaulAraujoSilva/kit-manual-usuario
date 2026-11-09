# Contratos entre as etapas do motor

Cada etapa lê só o que a anterior grava. Caminhos relativos à raiz do kit; `saida/` e `.cache/` ficam fora do git.

## Roteiro e caso
`casos/<caso>/caso.yaml` e `casos/<caso>/roteiros/<roteiro>.yaml` — tipos em `motor/comum.ts` (`Caso`, `Roteiro`,
`Passo`, `Alvo`). Exemplo completo: `casos/comprovantes/roteiros/srv-enviar.yaml`.

## Captura → anotação e PDF (`motor/capturar.ts`)
- `saida/<caso>/<roteiro>/capturas/<NN>-<passo.id>.png` — print da janela (não a página inteira), viewport
  1440×900 em escala 2 (o PNG tem 2880×1800 px). `NN` = número do passo no roteiro, com dois dígitos, a partir de 01.
- `saida/<caso>/<roteiro>/capturas/caixas.json`:

```json
{
  "caso": "comprovantes", "roteiro": "srv-enviar", "titulo": "Enviar os comprovantes do mês",
  "viewport": { "largura": 1440, "altura": 900 }, "escala": 2,
  "capturas": [
    { "numero": 1, "passo": "abrir", "arquivo": "01-abrir.png", "texto": "No menu do alto, clique em **Enviar comprovantes**.",
      "acao": "clicar", "enquadrar": "detalhe",
      "caixa": { "x": 540, "y": 40, "largura": 142, "altura": 44 } }
  ]
}
```

`caixa` em pixels CSS da janela (multiplicar por `escala` para o PNG); `null` se o alvo não tem caixa. Só entram os
passos com `captura: true`, mas `numero` é sempre a posição do passo no roteiro.

## Anotação (`motor/anotar.ts`)
- Lê `caixas.json` e grava `saida/<caso>/<roteiro>/anotadas/<NN>-<passo.id>.png` (+ `anotadas/anotadas.json` com
  `arquivo`, `alt`, `largura`, `altura` de cada imagem). Estilo: retângulo arredondado na cor `marca.cor_destaque`
  com contorno branco, seta do lado com mais espaço livre apontando para o retângulo, número do passo em círculo.
  `enquadrar: detalhe` (padrão) recorta uma região ao redor do alvo; `tela` mantém a janela inteira.

## Narração (`motor/narrar.ts`, `motor/normalizar.ts`)
- `export async function narrar(caso: Caso, texto: string): Promise<{ arquivo: string; duracao_s: number }>` —
  normaliza o texto (datas e valores por extenso), pede ao OpenRouter (`caso.voz`), guarda em
  `.cache/voz/<sha1(modelo|voz|texto normalizado)>.mp3` e devolve o caminho absoluto e a duração (ffprobe).
- CLI: `node motor/narrar.ts <caso> <roteiro>` gera o áudio de todos os passos, da abertura e do fecho.

## Gravação → montagem do vídeo (`motor/gravar.ts`)
- `saida/<caso>/<roteiro>/video/bruto.mp4` — quadros do Chromium (screencast) na resolução do aparelho, 1920×1080
  (viewport 1280×720, escala 1,5), 30 fps, com cursor e destaques desenhados na página. (A gravação de vídeo do
  Playwright não serve: não amplia a página — sai 1280×720 com borda cinza — e tem qualidade baixa.) `bruto.webm` ainda é
  aceito pela montagem.
- `saida/<caso>/<roteiro>/video/linha-do-tempo.json`:

```json
{
  "largura": 1920, "altura": 1080, "corte_inicio_s": 1.8, "corte_fim_s": 74.2,
  "abertura": { "titulo": "…", "subtitulo": "…", "narracao": "…", "audio": "C:/…/.cache/voz/ab12.mp3", "duracao_s": 3.1 },
  "passos": [ { "id": "abrir", "narracao": "…", "audio": "C:/…/.cache/voz/cd34.mp3", "inicio_s": 2.0, "duracao_s": 6.4 } ],
  "fecho": { "linhas": ["…"], "narracao": "…", "audio": "C:/…", "duracao_s": 4.0 }
}
```

`inicio_s` em segundos desde o começo do vídeo bruto; a montagem corta de `corte_inicio_s` a `corte_fim_s`.

## Montagem do vídeo (`motor/montar-video.ts`)
- `saida/<caso>/<roteiro>/<roteiro>.mp4` (H.264, 1920×1080, 30 fps, AAC) com abertura e fecho, narração com volume
  normalizado em duas passagens (−16 LUFS), legenda embutida como faixa (mov_text) e também
  `<roteiro>.srt` e `<roteiro>.vtt` ao lado.

## PDF (`motor/montar-pdf.ts`)
- `node motor/montar-pdf.ts <caso> <manual>` com `casos/<caso>/manuais/<manual>.yaml` (título, perfil, lista de
  capítulos). Cada capítulo é `casos/<caso>/capitulos/<roteiro>.md`; o marcador `{{passos}}` vira o passo a passo
  numerado com as imagens anotadas. Saída: `saida/<caso>/manuais/<manual>.pdf` (A4, marcado, com marcadores,
  idioma pt-BR, texto alternativo em toda figura).

## Ambientes paralelos e estados (`motor/estado.ts`)
- `caso.yaml` → `ambientes:` (endereço, caixa de e-mail, `vars` usadas como `{nome}` nos comandos de estado). Escolha
  com `KIT_AMBIENTE=<nome>`; cada ambiente tem banco próprio, então captura e gravação podem rodar em paralelo, uma
  por ambiente.
- `estado:` no roteiro: `inicial` (padrão), `atual` (não restaura) ou o nome de uma cópia salva com
  `node motor/estado.ts salvar <caso> <nome>` (`.cache/estado-<nome>.dump`). Roteiros de preparo (pré-requisitos de
  outro perfil) ficam em `casos/<caso>/roteiros/preparo/` e não entram em manual nem vídeo.

## Portões (`motor/checar.ts`)
- `node motor/checar.ts <caso>` → `saida/<caso>/checagem.md`: cobertura da `matriz.md` (roteiro, prints, capítulo,
  vídeo), termos proibidos no texto, na narração e nas legendas, duração e legenda dos vídeos, PDF marcado, com
  idioma e marcadores. Sai com erro se algum portão falhar.
