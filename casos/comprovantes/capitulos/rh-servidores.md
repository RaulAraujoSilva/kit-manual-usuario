# Servidores e dependentes

## Para que serve

As regras da conferência e a cobrança dependem do cadastro: quem tem direito a cada auxílio, com quais dependentes e em
que situação. Na tela **Servidores e dependentes** você consulta o cadastro, inclui e altera dependentes, suspende ou
restabelece um auxílio e importa o arquivo do cadastro funcional.

## Quando usar

- Quando um servidor pede a inclusão de um dependente e entrega os documentos ao RH.
- Quando um auxílio precisa ser suspenso (licença sem vencimentos, decisão de uma falta de comprovação) ou restabelecido.
- Quando chega um arquivo novo do cadastro funcional, com servidores novos ou dados alterados.
- Para tirar uma dúvida do servidor: o cadastro dele mostra os auxílios, os dependentes e o histórico, com atalhos para
  os comprovantes e a cobrança dele.

## Antes de começar

- Para incluir um dependente, tenha à mão nome, CPF, data de nascimento e parentesco, conferidos nos documentos que o
  servidor entregou.
- Para suspender ou restabelecer um auxílio, tenha o motivo e, se houver, o número do processo SEI.
- Para importar o cadastro, o arquivo precisa ser **servidores.csv**, em UTF-8, separado por ponto e vírgula, com as
  colunas na ordem indicada na tela: matricula; nome; cpf; vinculo; data_nascimento; email; situacao.

## Passo a passo

### Consultar o servidor e incluir um dependente

{{passos:rh-servidores}}

### Suspender ou restabelecer um auxílio

{{passos:rh-situacao-auxilio}}

### Importar o cadastro funcional

A importação tem duas etapas: a prévia mostra as diferenças sem mudar nada; só **Aplicar importação** grava.

{{passos:rh-importar-cadastro}}

## O que acontece depois

- **Dependente incluído:** passa a poder constar nos comprovantes do servidor, nos auxílios em que foi inscrito, desde o
  início da competência em andamento. O servidor o vê em **Dependentes**, no próprio painel.
- **Auxílio suspenso:** o servidor deixa de receber lembretes desse auxílio e não entra nos lotes seguintes até o
  restabelecimento. A mudança fica no **Histórico dos auxílios**, com o motivo e quem registrou.
- **Cadastro importado:** os servidores novos aparecem na lista e os alterados ficam com os dados do arquivo. Quem está
  no cadastro e não veio no arquivo não é apagado. A data e o resultado da última importação ficam no alto da tela.

## Se der errado

- **"CPF inválido"** ao incluir um dependente ou numa linha da importação: confira os 11 números do CPF.
- **Linhas rejeitadas na prévia.** A prévia diz o número da linha e o motivo (por exemplo, "cpf: CPF inválido", CPF já
  cadastrado para outra matrícula, matrícula repetida no arquivo). As outras linhas seguem; corrija o arquivo e importe
  de novo, se quiser. Importar o mesmo arquivo outra vez não duplica ninguém.
- **O arquivo inteiro foi recusado.** O cabeçalho não segue o layout: confira os nomes e a ordem das colunas.
- **A importação mexeria no seu próprio cadastro.** Ela é recusada inteira: peça a outra pessoa do RH.
- **Dependente com dado errado.** No cartão do dependente, use **Alterar dados de**. Para tirá-lo de um auxílio, use
  **Encerrar inscrição**.
