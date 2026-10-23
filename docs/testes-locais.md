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

## Evidência e limite do gate integrado

O gate final registrado em 23/10/2026 passou com 135 unitários, 99 integrações SQL e 11 E2E, além de lint, tipos e build. A correção de isolamento usa banco/servidor por cenário financeiro; a execução completa com um worker também passou. A [validação independente](../.specs/features/integracao-final/validation.md) preserva a proveniência, as falhas anteriores resolvidas e o sensor de 8/8 mutações detectadas.

Esses são resultados registrados da sessão anterior, não uma nova execução desta revisão documental. O provedor OpenAI é simulado localmente. A aplicação de migrações no teste não aplica nada ao Supabase remoto. A publicação da landing em [folego-hackathon-2026.vercel.app](https://folego-hackathon-2026.vercel.app) também não substitui a [UAT U01–U13 com serviços ativos](revisao-bruno-e-uat.md), ainda pendente.

## Continuidade da validação — 23/10/2026

Gate local final PASS: 144 unitários, 100 integrações SQL e 11 E2E, lint/tipos/build; revisão independente e sensores T7/T8/T10 registrados. Correção temporal: [PR #7](https://github.com/DevDayHackathon/caixa_simples_openAI/pull/7), [CI40012099595 PASS](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40012099595), merge `c500187`. Isolamento E2E T9 (`295da43`) e recibo T10 (`6c0d43c`) integrados pelo [PR #8](https://github.com/DevDayHackathon/caixa_simples_openAI/pull/8), merge `fc9da5079639ba6109afa0c9da5452b6eaf8c63e`, [CI40013929936 PASS](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40013929936). Gate final registrado em `/tmp/folego-receipt-gate.log`.

As suítes continuam usando Postgres local e OpenAI simulado. Separadamente, três chamadas diretas reais OpenAI passaram (Responses, síntese e transcrição); não são cenários UAT do aplicativo. Migrações remotas/extensões foram aplicadas por provisionamento autorizado, não pelas suítes locais. A credencial privilegiada foi corrigida, Vault/Cron e redeploy estão ativos, e U09 passou com aba fechada. A execução parcial dos demais casos está no [registro em andamento](uat-real-2026-10-23.md).

Estado do aceite real: U01/U02/U04/U05/U08/U09/U11 PASS; U03/U06/U07/U10/U12/U13 permanecem parciais, com limites e achados no [registro UAT](uat-real-2026-10-23.md). Não há aprovação global de toda a UAT. [CI pós-merge40014394994](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40014394994) em execução na última consulta, separado do CI aprovado do PR #8.
