# Caso: comprovantes de saúde e educação

Primeiro caso completo do kit: o sistema de comprovação mensal de despesas de saúde e educação. Três manuais
(servidor, RH e administração) e cerca de 18 vídeos; o roteiro `srv-enviar` ("Enviar os comprovantes do mês") é o
piloto. Configuração em `caso.yaml`; roteiros em `roteiros/`; documentos fictícios dos envios em `documentos/`;
logotipos em `marca/`.

## Ambiente

O sistema roda por Docker Compose num **projeto separado** (`manual`), com banco, correio e portas próprios, para
não se misturar com o ambiente de desenvolvimento. Use uma cópia do repositório do sistema na versão a documentar
(um clone ou worktree da `main`); nada é commitado nessa cópia.

| Serviço | Endereço (só nesta máquina) |
|---|---|
| Aplicação | `http://127.0.0.1:3005` (o `endereco` do `caso.yaml`) |
| Correio local (Mailpit): avisos, lembretes e senha provisória | `http://localhost:8028` |
| Banco | `127.0.0.1:5445`; contêiner `manual-db-1` |

### 1. Arquivo de portas do projeto `manual`

Na cópia do sistema, crie `docker-compose.manual.yml` ao lado do `docker-compose.yml` (fica fora do git do sistema):

```yaml
# Ambiente do manual e dos vídeos: projeto "manual", banco próprio.
services:
  db:
    ports: !override
      - "127.0.0.1:5445:5432"
  mailpit:
    ports: !override
      - "127.0.0.1:8028:8025"
      - "127.0.0.1:1028:1025"
  migracao:
    environment:
      NEXTAUTH_URL: http://127.0.0.1:3005
  web:
    environment:
      NEXTAUTH_URL: http://127.0.0.1:3005
    ports: !override
      - "127.0.0.1:3005:3000"
  rotinas:
    environment:
      NEXTAUTH_URL: http://127.0.0.1:3005
```

O `!override` exige Docker Compose 2.24 ou mais novo.

### 2. Segredos locais e relógio fixo

Crie, na mesma pasta, um arquivo de ambiente (por exemplo `segredos-locais.env`, fora do git) com os segredos que o
`README.md` do sistema pede para rodar localmente (`NEXTAUTH_SECRET`, `CHAVE_ARQUIVOS`), gerados na hora, e com o
**"hoje" fixo**:

```
RELOGIO_FIXO=2026-11-05T17:30:00Z
```

Com o relógio fixo em 05/11/2026, prazos, situações e datas saem iguais em toda rodada. Deixe a leitura de fotos
desligada (padrão): os roteiros enviam PDFs com texto.

### 3. Recriar do zero

```
docker compose -p manual -f docker-compose.yml -f docker-compose.manual.yml --env-file segredos-locais.env down -v
docker compose -p manual -f docker-compose.yml -f docker-compose.manual.yml --env-file segredos-locais.env up -d --build
```

O `down -v` apaga o volume do banco. O `up` cria o banco, roda a migração e a **carga de teste** (186 servidores
fictícios), sobe a aplicação, o correio local e as rotinas agendadas. Está pronto quando:

- o serviço `migracao` terminou com sucesso (`docker compose -p manual ps -a`);
- `GET /api/saude` na aplicação responde;
- a primeira execução das rotinas terminou (`docker compose -p manual logs rotinas`): elas rodam na partida e podem
  gerar avisos e lembretes, que precisam estar dentro da cópia do estado inicial.

## Cópia do banco no estado inicial

Tire a cópia **logo depois de recriar o ambiente do zero** e antes de qualquer roteiro, da raiz do kit:

```
docker exec manual-db-1 pg_dump -Fc -U comprovantes -d comprovantes -f /tmp/estado-inicial.dump
docker cp manual-db-1:/tmp/estado-inicial.dump .cache/estado-inicial.dump
```

- `-Fc` é o formato próprio do `pg_restore`, que permite o `--clean` na volta.
- Não use `--no-acl`: a cópia precisa levar as permissões do papel restrito com que a aplicação entra no banco.
- `.cache/` está fora do git. A cópia só tem dados fictícios, mas não a publique.
- Tire a cópia de novo sempre que a carga de teste, o esquema do banco ou a versão do sistema mudarem.

## Como os roteiros restauram

Todo roteiro com `estado: inicial` executa, antes do primeiro passo, os comandos de `estado.restaurar` do
`caso.yaml` (de dentro da raiz do kit):

1. copia `.cache/estado-inicial.dump` para dentro do contêiner `manual-db-1`;
2. encerra as conexões abertas no banco `comprovantes` (a aplicação reabre as suas sozinha);
3. roda `pg_restore --clean --if-exists --no-owner`, que apaga e recria cada objeto como estava na cópia.

Leva poucos segundos e não reinicia nenhum contêiner. Se a cópia não existir, o motor para e aponta para este
arquivo. Roteiros com `estado: atual` continuam do estado em que o anterior deixou o banco (use só quando um roteiro
depende de outro de propósito).

Duas consequências práticas:

- Como há **um banco só**, `capturar` e `gravar` rodam um roteiro por vez. As outras etapas não usam o sistema e podem
  rodar em paralelo.
- A restauração não limpa o correio local. Antes de um roteiro que mostra e-mails, esvazie a caixa do Mailpit pela
  própria interface dele, para que só apareçam os e-mails daquele roteiro.

## Contas e cuidados

- A entrada é sempre pela tela real, digitando matrícula e senha da conta fictícia do perfil (`perfis:` no
  `caso.yaml`; as senhas só valem neste ambiente e nunca aparecem nos entregáveis). Nunca pelos botões
  "Ambiente de teste: entrar como", que o `ocultar:` esconde junto com a faixa de ambiente.
- Só os documentos de `documentos/` nos envios: são fictícios, gerados com os dados da carga de teste.
- Vocabulário da interface em todos os textos e falas: Conforme, Aprovar/Aprovado, Devolver/Devolvido,
  Reprovar/Reprovado, Enviar ao RH/Enviado ao RH, Gerar lote/Lote gerado; "leitura automática".
- Voz escolhida pelo dono por audição de finalistas (`voz:` no `caso.yaml`); cores e logotipos em `marca:`, com o
  visual em aprovação no piloto.
