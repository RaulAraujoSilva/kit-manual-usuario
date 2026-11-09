# Ordem de gravação dos roteiros (caso comprovantes)

Objetivo: rodar os 34 roteiros (33 rascunhos + `srv-enviar`) com o **menor número de restaurações do banco**, sem que
um roteiro estrague a tela do seguinte. Resultado: **4 restaurações** (uma sequência longa de 30 roteiros e três envios
avulsos), mais cópias intermediárias do banco para repetir um trecho sem refazer tudo.

## Como o motor decide

- `estado: inicial` → o motor restaura `.cache/estado-inicial.dump` antes de rodar (comandos do `caso.yaml`).
- `estado: atual` → roda no banco como está. Todos os rascunhos da sequência longa são `atual`, menos o primeiro.
- Restaurar o banco **não** limpa a caixa de e-mail de teste (Mailpit) nem a contagem de tentativas de entrada do
  processo web. Antes da sequência longa, esvaziar a caixa:
  `curl -X DELETE http://localhost:8028/api/v1/messages`   (API do Mailpit; conferir a rota na versão instalada)
- O contêiner `manual-rotinas-1` roda as rotinas diárias (abrir competência, lembretes, faltas, conferir a trilha) no
  "hoje" fixo de 05/11/2026. Conferir antes da sequência que o lembrete D-15 de outubro já saiu (aba Lembretes da
  TL-11 com "Enviado"); se ele sair no meio de uma gravação, a tela muda entre um print e outro.

## Classificação

| Tipo | Roteiros |
|---|---|
| Só leem (não mudam a tela dos outros) | `srv-painel`, `srv-dependentes`, `srv-dados-e-ajuda`, `rh-painel`, `crh-indicadores`, `rh-relatorio`, `adm-trilha`, `srv-email` |
| Mudam e desfazem no próprio roteiro (efeito líquido só na trilha e na caixa de e-mail) | `rh-divergencia` (devolve e desfaz), `rh-sem-envio` (pausa e reativa), `adm-bloquear-conta` (bloqueia e desbloqueia) |
| Mudam dados de forma independente (outro servidor, outra competência, data futura) | `rh-amostra`, `rh-aprovar-com-valor`, `rh-faltas`, `rh-situacao-auxilio`, `rh-parametros`, `rh-importar-cadastro` |
| Mudam dados que outros roteiros leem | `rh-servidores` (dependente novo aparece no painel da servidora), `rh-aprovar-conformes` (aprova o conforme que o `rh-devolver-conforme` precisa), `srv-entrar` (troca a senha da conta de teste) |
| Dependem de um roteiro anterior | `srv-avisos`, `srv-email`, `srv-corrigir` ← `rh-devolver-conforme`; `crh-devolver-lote`, `crh-autorizar-lote` ← `rh-lote`; `rh-ajustar-lote` ← `crh-devolver-lote`; `rh-registrar-entrega`, `rh-relatorio` ← `crh-autorizar-lote`; `crh-aprovar-acessos`, `srv-primeiro-acesso`, `adm-bloquear-conta` ← `adm-contas` |
| Precisam do banco inicial só para si (usam os três PDFs do kit, que caem na duplicidade depois de enviados) | `srv-arrumar-despesas`, `srv-enviar-celular`, `srv-enviar` |

## Sequência longa — 1 restauração (a do primeiro roteiro)

| Ordem | Roteiro | Perfil | Depende de | Cópia a salvar depois |
|---|---|---|---|---|
| 1 | `srv-painel` (`estado: inicial`) | servidor | carga | — (é o estado inicial) |
| 2 | `srv-dependentes` | servidor | carga (antes do `rh-servidores`) | — |
| 3 | `srv-dados-e-ajuda` | servidor | — | — |
| 4 | `rh-painel` | analista | carga (antes de qualquer decisão) | — |
| 5 | `crh-indicadores` | coordenacao | carga | — |
| 6 | `rh-divergencia` | analista | divergência da Servidora 044219 sem decisão | — |
| 7 | `rh-amostra` | analista | amostra da Servidora 050213 sem decisão | — |
| 8 | `rh-aprovar-com-valor` | analista | divergência sem valor calculado (046112) | — |
| 9 | `rh-devolver-conforme` | analista | conforme Pé de Feijão da Servidora 050213 | **E2-devolvido** |
| 10 | `srv-avisos` | servidor | 9 | — |
| 11 | `srv-email` | (caixa de teste) | 9 | — (pular enquanto o motor não abrir endereço absoluto) |
| 12 | `srv-corrigir` | servidor | 9 + PDF novo `comprovante-pix-pe-de-feijao-outubro.pdf` | — |
| 13 | `rh-sem-envio` | analista | cobrança do 48.191-9 ativa | — |
| 14 | `rh-faltas` | analista | falta de setembro do 48.191-9 aberta | — |
| 15 | `rh-situacao-auxilio` | analista | saúde do 47.120-3 ativa | — |
| 16 | `rh-parametros` | analista | sem versão do teto em 01/01/2027 | — |
| 17 | `rh-servidores` | analista | depois de 1 e 2 (painel e dependentes da servidora) | — |
| 18 | `rh-importar-cadastro` | analista | CSV fictício `servidores-exemplo.csv` | — |
| 19 | `rh-aprovar-conformes` | analista | depois de 9 e 12 | — |
| 20 | `rh-lote` | analista | setembro pronto para o lote (carga) | **E3-lote-aguardando** |
| 21 | `crh-devolver-lote` | coordenacao | 20 | — |
| 22 | `rh-ajustar-lote` | analista | 21 | — |
| 23 | `crh-autorizar-lote` | coordenacao | 22 (ou 20) | **E4-lote-gerado** |
| 24 | `rh-registrar-entrega` | analista | 23 | — |
| 25 | `rh-relatorio` | analista | 24 (mostra a juntada) | — |
| 26 | `adm-contas` | administracao | 40.857-8 sem conta (carga) | **E5-conta-pedida** |
| 27 | `crh-aprovar-acessos` | coordenacao | 26 | — |
| 28 | `srv-primeiro-acesso` | (conta nova) | 26/27 | — (pular enquanto o motor não ler a senha do e-mail) |
| 29 | `adm-bloquear-conta` | administracao | 26 (e depois de 27 e 28) | — |
| 30 | `adm-trilha` | administracao | — (fica mais rica no fim) | — |
| 31 | `srv-entrar` | servidor | **sempre o último**: troca a senha da Servidora 050213 | — |

Os passos 20 a 25 (lote de setembro) e 26 a 30 (contas) não dependem de 1 a 19: se um trecho falhar, basta voltar à
cópia anterior a ele.

## Envios avulsos — 3 restaurações

| Ordem | Roteiro | Por quê |
|---|---|---|
| 32 | `srv-arrumar-despesas` (`estado: inicial`) | usa os três PDFs e termina com despesas guardadas |
| 33 | `srv-enviar-celular` (`estado: inicial`) | envia os três PDFs (precisa da janela de celular no motor) |
| 34 | `srv-enviar` (`estado: inicial`, já existe) | envia os três PDFs |

Para cair para 2 restaurações: criar um segundo jogo de três PDFs fictícios (outro número de documento, outra linha
digitável e outra autenticação) para o `srv-enviar-celular`, e rodá-lo logo depois do `srv-arrumar-despesas`.

## Estados intermediários (cópias do banco)

Salvar logo depois do roteiro indicado, para repetir um trecho sem refazer a sequência desde o começo:

| Cópia | Depois de | Serve para repetir |
|---|---|---|
| `E2-devolvido` | 9 `rh-devolver-conforme` | 10 a 12 (`srv-avisos`, `srv-email`, `srv-corrigir`) |
| `E3-lote-aguardando` | 20 `rh-lote` | 21 a 25 (devolver, ajustar, autorizar, registrar, relatório) |
| `E4-lote-gerado` | 23 `crh-autorizar-lote` | 24 e 25 |
| `E5-conta-pedida` | 26 `adm-contas` | 27 a 30 |

Salvar (mesmo formato do `estado-inicial.dump`):

```bash
docker exec manual-db-1 pg_dump -Fc -U comprovantes -d comprovantes -f /tmp/E2-devolvido.dump
docker cp manual-db-1:/tmp/E2-devolvido.dump .cache/E2-devolvido.dump
```

Voltar a uma cópia: os três comandos de `estado.restaurar` do `caso.yaml`, trocando `estado-inicial.dump` pelo nome da
cópia; depois rodar os roteiros seguintes (todos `estado: atual`). Sugestão para o motor: aceitar
`estado: <nome-da-cópia>` no roteiro e restaurar `.cache/<nome>.dump`, para que cada roteiro dependente se baste.

## Documentos fictícios a criar antes de gravar

| Arquivo (em `casos/comprovantes/documentos/`) | Usado por | Conteúdo |
|---|---|---|
| `comprovante-pix-pe-de-feijao-outubro.pdf` | `srv-corrigir` | comprovante PIX completo da Escola Infantil Pé de Feijão, R$ 560,00, 07/10/2026, com autenticação fictícia (linhas no roteiro) |
| `servidores-exemplo.csv` | `rh-importar-cadastro` | layout do cadastro funcional com uma servidora fictícia nova e uma alteração de e-mail (linhas no roteiro) |

Os três PDFs que já existem (`boleto-escola-outubro.pdf`, `comprovante-pagamento-escola-outubro.pdf`,
`recibo-plano-de-saude-outubro.pdf`) servem ao `srv-enviar`, ao `srv-enviar-celular` e ao `srv-arrumar-despesas`.

## O que o motor precisa ter para a sequência inteira rodar

| Necessidade | Roteiros | Sugestão |
|---|---|---|
| Ação `selecionar` (lista de opções, `<select>`) | `rh-devolver-conforme`, `rh-divergencia`, `rh-sem-envio`, `rh-servidores`, `rh-situacao-auxilio`, `adm-trilha` | no `executarAcao`: `case "selecionar": await alvo.selectOption({ label: passo.valor })` e acrescentar ao tipo `Passo` |
| Perfis do RH, da coordenação e da administração | todos os `rh-*`, `crh-*`, `adm-*` | copiar `perfis-rascunho.yaml` para o `caso.yaml` |
| Não entrar antes do primeiro passo | `srv-entrar`, `srv-primeiro-acesso`, `srv-email` | campo `entrar: false` no roteiro |
| Início com endereço absoluto (caixa de teste) | `srv-email`, `srv-primeiro-acesso` | se `inicio` começa com `http`, não concatenar `caso.endereco`; ocultar a moldura do Mailpit |
| Variável lida do e-mail (senha provisória) | `srv-primeiro-acesso` | passo que lê um texto da tela para `{{variavel}}` |
| Janela de celular | `srv-enviar-celular` | campo `janela: celular` (390×844, toque) |
| Narração vazia (`narracao: ""`) em passos rápidos | vários (preencher campos em sequência) | pular o áudio quando o texto for vazio |
| Começar de uma cópia intermediária | 10–12, 21–25, 27–30 | `estado: <nome-da-cópia>` |
