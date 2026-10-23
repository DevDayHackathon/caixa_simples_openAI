# Agente de caixa proativo

Projeto do tema 13: Painel de caixa para pequenos negócios.

**Estado atual:** as frentes financeira, experiência/voz e agente/tarefas estão compostas em `/caixa`. A prévia `/` funciona sem credenciais com dados identificados como simulados. PR #3 integrado à main e protótipo publicado em **[folego-hackathon-2026.vercel.app](https://folego-hackathon-2026.vercel.app)**. Serviços reais configurados e UAT em andamento; somente os cenários com evidência registrada podem ser apresentados como verificados.

Gate local final PASS: 144 unitários, 100 integrações SQL e 11 E2E, lint/tipos/build; revisão independente e sensores T7/T8/T10 registrados. Correção temporal: [PR #7](https://github.com/DevDayHackathon/caixa_simples_openAI/pull/7), [CI40012099595 PASS](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40012099595), merge `c500187`. Isolamento E2E T9 (`295da43`) e recibo T10 (`6c0d43c`) integrados pelo [PR #8](https://github.com/DevDayHackathon/caixa_simples_openAI/pull/8), merge `fc9da5079639ba6109afa0c9da5452b6eaf8c63e`, [CI40013929936 PASS](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40013929936). Gate final registrado em `/tmp/folego-receipt-gate.log`.

## Rodar o protótipo

Node 24 e npm:

```bash
npm ci
npm run dev
```

Abrir http://localhost:3000 para a prévia. Para `/caixa`, preencher `.env.local` a partir de `.env.example`, consultar o controle de migrações do ambiente e reiniciar Next. As migrações 001–003 já foram aplicadas na demo autorizada; não reaplicá-las. O [guia de integração](docs/integracao-financeira.md) explica cada chave, sessão, voz e Cron.

```bash
npm run test:e2e:install
npm run check
```

O gate roda lint, tipos, unitários, integração com SQL real e E2E de produção local. Os testes usam somente Postgres loopback e um provedor OpenAI simulado local; veja [testes locais](docs/testes-locais.md). O [roteiro de aceite](docs/revisao-bruno-e-uat.md) separa a evidência automatizada dos testes ainda necessários com APIs reais.

## Leitura inicial

1. [Requisitos e critérios de aceitação](.specs/features/caixa-proativo/spec.md)
2. [Contexto e decisões do usuário](.specs/features/caixa-proativo/context.md)
3. [Stack e arquitetura propostas](.specs/features/caixa-proativo/design.md)
4. [Contratos entre as três frentes](.specs/features/caixa-proativo/contracts.md)
5. [Tarefas, dependências e gates](.specs/features/caixa-proativo/tasks.md)
6. [Divisão entre Jecky, Daniel e Bruno](docs/trabalho-paralelo.md)
7. [Memória e próximos passos](.specs/STATE.md)

Fixture de aceitação: [examples/caixa-demo.csv](examples/caixa-demo.csv), com saldo inicial de R$ 1.000 informado separadamente.

## Proposta de produto

O usuário alimenta dados por CSV, texto ou voz. O agente responde, identifica consequências, prepara propostas e cria tarefas internas. Quando uma tarefa dispara, o agente retoma o compromisso e verifica se precisa agir. Reservas são virtuais, cobranças são rascunhos e simulações não alteram a base.

## Validação da documentação

Os scripts pertencem à skill tlc-spec-driven instalada no ambiente, não são scripts da aplicação:

```bash
python3 /home/mestre/.agents/skills/tlc-spec-driven/scripts/validate_spec.py caixa-proativo --strict
python3 /home/mestre/.agents/skills/tlc-spec-driven/scripts/validate_tasks.py caixa-proativo --strict
```

A [validação da integração final](.specs/features/integracao-final/validation.md) registra o gate e a revisão independente. A [verificação de T1](.specs/features/caixa-proativo/t1-checks.md) é histórica e cobre somente a base inicial.

## Hospedagem alvo confirmada

Vercel Hobby + Supabase Free. O [guia de implantação gratuita](docs/deploy-gratuito.md) define agendamento Supabase, limites serverless, áudio, ambientes e colaboração. O consumo da API OpenAI é separado. A publicação atual usa o projeto `folego-hackathon-2026`, na conta `jecky3806-2935s-projects`, via CLI e sem vínculo GitHub; alterações na main não disparam deploy automaticamente. APP_ORIGIN e os segredos internos já estão configurados em Production. As migrações 001–003 e extensões estão aplicadas na demo autorizada `optwdryxvpnqdumzexcs`; a credencial privilegiada corrigida retornou REST HTTP200 e foi atualizada na Vercel. Os dois segredos Vault foram provisionados, as RPCs temporárias removidas e o Cron `caixa-agent-due` (job1, `*/5 * * * *`) está ativo. O redeploy com T10 está READY, preservando a URL pública. U09 comprovou execução com a aba fechada, uma notificação e repetição sem duplicação. A UAT continua parcial; consulte o [registro de resultados](docs/uat-real-2026-10-23.md), inclusive limites de voz, concorrência e autorização. Consulte [CONTINUAR-SESSAO.md](docs/CONTINUAR-SESSAO.md) antes de retomar operações de ambiente.

## Equipe e integração

Daniel: caixa e dados; Jecky: experiência e voz; Bruno: agente e tarefas. A função SQL condicional chama o executor somente com trabalho elegível; a ativação remota do Cron/Vault depende do ambiente. Não é necessário manter a aba aberta após configurar esse job.

Estado do aceite real: U01/U02/U04/U05/U08/U09/U11 PASS; U03/U06/U07/U10/U12/U13 permanecem parciais, com limites e achados no [registro UAT](docs/uat-real-2026-10-23.md). Não há aprovação global de toda a UAT. [CI pós-merge40014394994](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40014394994) em execução na última consulta, separado do CI aprovado do PR #8.
