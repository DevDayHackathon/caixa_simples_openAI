# Agente de caixa proativo

Projeto do tema 13: Painel de caixa para pequenos negócios.

**Estado atual:** T1 implementada e verificada na main. A base roda sem credenciais com dados simulados. Funcionalidades reais do produto serão implementadas em T2–T22. As três branches ainda não foram criadas.

## Rodar a base

Node 24 e npm:

```bash
npm ci
npm run dev
```

Abrir http://localhost:3000. Não é preciso configurar Supabase nem OpenAI para a T1.

```bash
npm run test:e2e:install
npm run check
```

O gate roda lint, tipos, 15 testes unitários, 6 de integração e 3 E2E. Os E2E compilam e testam a aplicação em produção local. Ver [guia da base comum](docs/base-comum.md) para interfaces, mocks, testes e banco local futuro.

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

Os comandos npm de tasks.md já existem. A validação T1 cobre a base técnica e os contratos com fixtures; não comprova persistência, agente real ou agendamento. A [verificação de T1](.specs/features/caixa-proativo/t1-checks.md) registra evidências e limites.

## Hospedagem alvo confirmada

Vercel Hobby + Supabase Free. O [guia de implantação gratuita](docs/deploy-gratuito.md) define agendamento Supabase, limites serverless, áudio, ambientes e colaboração. O consumo da API OpenAI é separado. Nenhuma publicação foi realizada.

## Início do trabalho da equipe

[Mensagens prontas por integrante](docs/mensagens-equipe.md). Bootstrap pronto; branches e compartilhamento remoto pendentes. O projeto preserva o plano de agente que escolhe horários e gate SQL que só chama Vercel com trabalho vencido, sem Cron Vercel. Esse agendamento ainda não está implementado.
