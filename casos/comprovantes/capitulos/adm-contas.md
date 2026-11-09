# Contas e perfis

## Para que serve

Cada pessoa entra no sistema com a própria conta, e o que ela vê depende dos perfis da conta: **Servidor**, **Recursos
Humanos**, **Coordenação do RH** ou **Administração**. Na aba **Contas e perfis** você inclui contas, atribui e altera
perfis, bloqueia e desbloqueia contas e envia nova senha provisória.

A administração cuida dos acessos, mas não abre comprovantes nem dados de saúde.

## Quando usar

- Quando uma pessoa precisa de acesso: um servidor novo, alguém que entra no RH ou na coordenação, ou uma conta técnica.
- Quando uma pessoa muda de função: use **Alterar perfis**.
- Quando o acesso precisa ser suspenso, por exemplo num afastamento: use **Bloquear**.
- Quando a pessoa esqueceu a senha ou a senha provisória venceu: use **Enviar nova senha provisória**.

## Antes de começar

- Para conta de servidor, tenha a **matrícula**: o servidor precisa estar no cadastro do RH. A matrícula vira o login, e
  a senha provisória vai para o e-mail que está no cadastro.
- Para conta técnica, tenha o login e o **e-mail institucional da conta técnica**.
- Atribuir ou retirar perfil do RH, da coordenação ou de administração exige **motivo**. Bloquear e desbloquear também.
- O perfil **Recursos Humanos** ou **Coordenação do RH** só vale depois da aprovação de uma pessoa da coordenação do RH,
  em **Perfis a aprovar**.
- Você não altera a sua própria conta: ela aparece na lista como "sua conta", sem botões.

## Incluir uma conta

{{passos:adm-contas}}

## Bloquear, desbloquear e enviar nova senha provisória

{{passos:adm-bloquear-conta}}

## O que acontece depois

- **Conta criada.** A tela confirma "Conta [login] criada." e diz para qual e-mail foi a senha provisória. A senha vale
  24 horas e uma única entrada; no primeiro acesso, a pessoa cria a própria senha. Até lá, a lista mostra **senha
  provisória ainda não trocada**.
- **Perfil do RH à espera.** A lista mostra **aguardando a coordenação** com o perfil pedido, até a coordenação aprovar
  ou recusar. Enquanto isso, a pessoa entra só com os outros perfis.
- **Perfis alterados.** A pessoa entra de novo para usar os perfis novos. A mudança fica na trilha com o motivo.
- **Conta bloqueada.** A situação passa a **Bloqueada**: a pessoa não entra mais e as sessões abertas caem. O histórico
  continua na trilha. Ao desbloquear, a pessoa volta a entrar com a senha que já tinha.
- **Nova senha provisória.** A senha atual deixa de valer, as sessões abertas caem e a nova senha vai ao e-mail
  institucional da conta, por 24 horas e uma entrada.
- **Tudo na trilha.** Cada inclusão, alteração, bloqueio, desbloqueio e envio de senha fica registrado na trilha de
  auditoria, com o autor e o motivo (veja o capítulo Trilha de auditoria).

## Se der errado

- **"Não há servidor com esta matrícula no cadastro."** Confira a matrícula. Se estiver certa, peça ao RH que inclua o
  servidor no cadastro antes de criar a conta.
- **"Escreva o motivo (ao menos 3 letras) para confirmar."** O motivo é obrigatório para bloquear e desbloquear.
- **"Não foi possível enviar a senha provisória agora: use Enviar nova senha provisória."** A conta foi criada, mas o
  e-mail não saiu. Clique em **Enviar nova senha provisória** na linha da conta.
- **A pessoa não recebeu a senha.** Confira o e-mail do cadastro com o RH e use **Enviar nova senha provisória**. A
  senha anterior deixa de valer.
- **A conta da pessoa tem RH e coordenação ao mesmo tempo.** A lista avisa: "RH e coordenação na mesma conta: a
  segregação do lote continua valendo pela conta que elaborou." Quem elabora um lote não pode autorizá-lo.
- **O perfil do RH não passou a valer.** Ele espera a aprovação da coordenação do RH. Avise a coordenação.
