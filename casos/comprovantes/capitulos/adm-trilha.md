# Trilha de auditoria

## Para que serve

Toda ação no sistema fica registrada na trilha de auditoria: entradas e saídas, envios, aberturas de comprovante,
decisões do RH, lotes, mudanças no cadastro, nas contas e nos perfis, e as rotinas automáticas. A trilha só se lê:
nenhum evento pode ser editado ou apagado. Cada evento é encadeado ao anterior, e a conferência do encadeamento mostra
se algum evento foi alterado ou retirado.

Use a trilha para responder quem fez o quê e quando, por exemplo num pedido de auditoria ou de órgão de controle.

## Quando usar

- Num pedido de auditoria ou de órgão de controle sobre um comprovante, um servidor, uma competência ou uma pessoa.
- Para conferir uma mudança de conta ou de perfil.
- Para verificar que a trilha está íntegra. A rotina diária também confere o encadeamento, sem ninguém.

## Antes de começar

- Saiba o que procurar: o **Protocolo do comprovante** (ex.: CSE-2026-10-050213), a **Matrícula do servidor**
  (ex.: 50.213-4), a **Competência** (mês e ano, ex.: 10/2026), o **Autor** (parte do nome ou do login; "sistema" para as
  rotinas), a **Ação** ou o **Período**.
- A administração não vê o conteúdo de comprovantes nem dados de saúde. Em evento sobre esses dados, a trilha mostra só
  a ação, com o aviso "Detalhe restrito: o objeto pode ter dado de saúde."
- Cada consulta e cada exportação também ficam registradas na trilha.

## Passo a passo

{{passos}}

## O que acontece depois

- **Resumo da consulta.** Acima da lista, a tela mostra o número de **Eventos**, de **Autores** e de **Aberturas** de
  comprovante da consulta.
- **Selo de cada evento.** A coluna **Encadeamento** mostra o selo da última conferência: **Íntegro**, **Quebra aqui**,
  **Depois da quebra** ou **Ainda não conferido**. A data da última conferência aparece acima da lista.
- **Exportação.** O arquivo CSV traz os mesmos eventos da consulta, com o CPF mascarado. A exportação também fica
  registrada na trilha.

## Se der errado

- **"Filtro não aplicado por estar fora do formato: …"** Um filtro foi digitado fora do formato. Confira o exemplo
  abaixo do campo e consulte de novo.
- **"Nenhum evento para estes filtros."** Não há evento com essa combinação. Use **Limpar filtros** e tente com menos
  filtros.
- **"Para exportar, reduza a consulta a até … eventos (período menor ou outro filtro)."** A consulta tem eventos demais
  para um arquivo. Diminua o período ou acrescente um filtro.
- **A conferência acusou quebra.** A tela mostra o evento da quebra; esse evento e os seguintes não valem como íntegros
  até a apuração. Use **Ver o evento da quebra**, registre a data e o número do evento e acione a equipe responsável
  pela segurança do sistema.
- **"O encadeamento ainda não foi conferido. Use Verificar encadeamento."** Clique em **Verificar encadeamento**.
