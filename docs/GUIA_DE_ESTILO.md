# Guia de estilo

Vale para todo caso do kit. Onde houver exemplo, ele vem do caso de referência (comprovantes); troque pelos termos
do seu sistema.

## Redação do manual

**Linguagem simples.** Quem lê quer terminar uma tarefa, não aprender o sistema.

- Frases curtas, uma ação por frase. Ordem direta: onde, o quê. "No menu do alto, clique em **Enviar
  comprovantes**."
- Segunda pessoa ("você") e verbo no imperativo: clique, escolha, confira, envie.
- **Os termos da própria interface em negrito**, escritos exatamente como na tela (maiúsculas, acentos, pontuação):
  **Enviar ao RH**, não "enviar para o RH" nem "submeter". Se a tela muda o nome, o texto muda junto (o roteiro falha
  e avisa).
- **Vocabulário único.** Um conceito, uma palavra, sempre a da interface. No caso de referência: Conforme,
  Aprovar/Aprovado, Devolver/Devolvido, Reprovar/Reprovado, Enviar ao RH/Enviado ao RH, Gerar lote/Lote gerado. Nada
  de sinônimos para variar o texto. Liste os termos no glossário do manual.
- **Sem jargão** técnico nem interno: nada de "upload", "dashboard", "status 500", "requisição", nomes de módulos ou
  códigos de tela (TL-03, UC-07) no texto para o usuário. Diga "enviar o arquivo", "painel", "situação".
- Números e datas como aparecem na tela (o leitor compara com o que vê).
- Mensagens de erro entre aspas, copiadas da tela, seguidas do que fazer.

### Molde do capítulo

```markdown
# Enviar os comprovantes do mês

## Para que serve
Uma ou duas frases: o que a tarefa resolve para o usuário.

## Quando usar
A situação: todo mês, até o dia X; quando chega um aviso de devolução…

## Antes de começar
O que ter à mão: arquivos, em que formato, prazo.

## Passo a passo
{{passos}}

## O que acontece depois
A situação nova, o aviso que aparece, o e-mail que chega, o próximo passo de outra pessoa.

## Se der errado
- "Mensagem exata da tela." O que significa e o que fazer.
```

O marcador `{{passos}}` vira a lista numerada com o `texto` de cada passo do roteiro e o print anotado. Não repita os
passos no capítulo.

## Narração

- Frases curtas (até umas 20 palavras), segunda pessoa, imperativo. Cada passo do vídeo dura o tempo da fala: fala
  longa deixa a tela parada.
- A `narracao` é mais curta que o `texto`: o vídeo mostra, a fala orienta. Não leia a tela inteira em voz alta.
- Fale o nome do botão como está na tela, sem "negrito" nem aspas.
- Datas e valores podem ser escritos como na tela: o normalizador os passa para extenso antes da síntese. Siglas e
  códigos que a voz lê mal: escreva na `narracao` como se fala, conforme o que se ouviu no piloto (o `texto` do
  manual continua igual à tela).
- Abertura: título da tarefa e o perfil. Fecho: onde há mais ajuda ("no manual: capítulo X", contato do suporte).
- Uma voz por caso, escolhida pelo dono por audição de finalistas; não troque de voz no meio de uma coleção.

## Anotação dos prints

- **Uma cor de destaque**, de alto contraste e **diferente de todas as cores da interface** (se a marca é azul, o
  destaque não pode ser azul). No caso de referência, magenta sobre uma interface azul. A cor fica em
  `marca.cor_destaque` no `caso.yaml`.
- **Retângulo + seta + número**: retângulo arredondado em volta do alvo, com contorno branco para destacar em fundo
  escuro ou claro; seta vinda do lado com mais espaço livre; número do passo num círculo. O número é o mesmo da lista
  do capítulo.
- **Um destaque por imagem.** Se o passo precisa de dois, são dois passos.
- Print da janela, nunca da tela do computador inteira. Recorte de `detalhe` para alvos pequenos; janela inteira no
  primeiro print de uma página nova, para dar contexto.
- Nada desenhado à mão nem editado em programa de imagem: se o destaque está errado, corrija o roteiro.

## Vídeo

- **De 1 a 2 minutos**, uma tarefa por vídeo. Passou de 2 min, divida a tarefa.
- **Abertura e fecho** curtos (cerca de 3 s cada), com a marca: título e perfil na abertura; onde achar mais ajuda no
  fecho.
- **Cursor visível**, movendo-se até o alvo em velocidade natural.
- **Destaque antes do clique**: o alvo é realçado com a cor de destaque e só então clicado, com um efeito discreto
  de clique.
- **Legenda sempre**: embutida no MP4 e em `.srt`/`.vtt` ao lado, com o texto da narração e os tempos reais.
- Volume normalizado (−16 LUFS), sem música de fundo competindo com a fala.
- 1080p, janela do navegador sem barras de ferramentas, sem notificações do computador.

## Acessibilidade

- **PDF marcado** (tagged), com títulos reais, ordem de leitura correta, **marcadores** navegáveis, sumário e idioma
  pt-BR declarado.
- **Texto alternativo em toda figura**, gerado do `texto` do passo e revisado por gente: diz o que a imagem mostra e
  onde está o destaque ("Painel do servidor com o botão Enviar comprovantes destacado no menu do alto").
- **Contraste**: texto com pelo menos 4,5:1 sobre o fundo; destaque com pelo menos 3:1 sobre o que está em volta.
- **Não dependa só da cor**: o número e a seta dizem onde está o alvo para quem não distingue a cor do destaque.
- **Legenda nos vídeos** sempre, e a narração descreve a ação ("clique em…"), útil para quem não vê bem a tela.
- Letra do PDF legível impressa (corpo de pelo menos 11 pt) e prints grandes o bastante para ler os rótulos.

## O que nunca aparece

Nos entregáveis institucionais (PDF e vídeos):

- **IA**, "inteligência artificial", nomes de modelos ou de serviços de voz. A interface do caso de referência fala em
  "leitura automática"; use o termo que a interface usa. Nada de "voz sintética" nos créditos.
- **Caminhos locais** (pastas do computador), nomes de máquinas, endereços de ambiente local.
- **Ferramentas internas** de produção (Playwright, ffmpeg, o próprio kit) e códigos internos de tela ou caso de uso.
- **Dados reais** de pessoas: só a massa fictícia. Na dúvida, o print não entra.
- **Elementos de ambiente de teste**: faixa de ambiente, botões "entrar como", painéis de depuração, avisos de
  versão de desenvolvimento.
- **Senhas**, mesmo as fictícias: o passo de entrada mostra o campo preenchido com pontos, nunca o texto da senha.
