# Agente de caixa proativo

Projeto do tema 13: Painel de caixa para pequenos negócios.

**Estado atual:** as frentes financeira, experiência/voz e agente/tarefas estão compostas em `/caixa`. A prévia `/` funciona sem credenciais com dados identificados como simulados. Configuração dos serviços e aceite humano permanecem necessários antes da apresentação.

## Rodar o protótipo

Node 24 e npm:

```bash
npm ci
npm run dev
```

Abrir http://localhost:3000 para a prévia. Para `/caixa`, preencher `.env.local` a partir de `.env.example`, aplicar as migrações001–003 no ambiente demo e reiniciar Next. O [guia de integração](docs/integracao-financeira.md) explica cada chave, sessão, voz e Cron.

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

Vercel Hobby + Supabase Free. O [guia de implantação gratuita](docs/deploy-gratuito.md) define agendamento Supabase, limites serverless, áudio, ambientes e colaboração. O consumo da API OpenAI é separado. Nenhuma publicação foi realizada.

## Equipe e integração

Daniel: caixa e dados; Jecky: experiência e voz; Bruno: agente e tarefas. A função SQL condicional chama o executor somente com trabalho elegível; a ativação remota do Cron/Vault depende do ambiente. Não é necessário manter a aba aberta após configurar esse job.
