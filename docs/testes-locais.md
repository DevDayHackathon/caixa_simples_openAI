# Testes com persistência

Requer Node 24, dependências (`npm ci`), Chromium (`npm run test:e2e:install`) e Postgres local com usuário capaz de criar bancos. Os testes recusam host remoto e criam/removem bancos exclusivos por suíte.

Exemplo com Docker:

```sh
docker run --rm --name caixa-tests -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55432:5432 postgres:17
```

Instale o cliente psql no host e execute em outro terminal:

```sh
export TEST_DATABASE_URL=postgresql://postgres:local-test-only@127.0.0.1:55432/postgres
export PSQL_PATH=psql
npm run check
```

No Linux/macOS o padrão é psql no PATH. No Windows pode definir PSQL_PATH ao executável instalado. Não use banco de apresentação. O workflow check fornece Postgres 17 isolado e executa o mesmo gate, sem credenciais remotas. Os artefatos de falha ajudam a diagnosticar jornadas de navegador.
