# Base comum T1

## Rodar em um clone novo

Usar Node 24 e npm. `.nvmrc` e `package.json` fixam o runtime; `package-lock.json` fixa as dependências.

```bash
npm ci
npm run dev
```

Abrir http://localhost:3000. Não precisa de `.env.local`, Supabase ou OpenAI para a base. A referência é fixa em 23/10/2026, não acompanha o relógio atual. A tela e o endpoint público `/api/demo/snapshot` usam somente fixtures identificadas como mock. Não há dados bancários reais nem importação, escrita financeira, voz ou agendamento implementados.

## Gates reproduzíveis

```bash
npm run test:e2e:install
npm run check
```

`check` executa lint, geração de tipos de rotas + TypeScript, unitários, integração e E2E. O E2E faz um build de produção atualizado e inicia seu próprio servidor em 127.0.0.1:3100, que encerra depois dos testes. A porta precisa estar livre. Linux pode precisar instalar dependências do navegador conforme instruções do Playwright; containers sem permissão de abrir portas/processos precisam de um executor de testes com essas permissões. Não substituir testes por mocks adicionais para contornar restrições do ambiente.

Também disponíveis separadamente:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
```

O teste de integração T1 conecta clientes tipados, envelopes e mocks, incluindo o handler de snapshot. Ele **não testa persistência**. Daniel e Bruno acrescentam testes de banco isolado nas tarefas seguintes; não é necessário Docker para o gate atual.

## Onde cada integrante começa

| Área | Fonte compartilhada |
| --- | --- |
| Tipos, validação e entidades | `src/contracts/models.ts` |
| Entradas, saídas e portas | `src/contracts/operations.ts` |
| F1, F2, cenário atrasado e exemplos | `src/fixtures/demo.ts` |
| Mocks sem credenciais | `src/adapters/mock.ts` |
| Clientes HTTP com validação de resposta | `src/adapters/http.ts` |
| Tela mínima para substituir depois | `src/app/page.tsx` |

Jecky e Bruno podem usar `createMockFinancePort()` e `createMockAgentPort()`. O snapshot padrão aceita somente empresa `demo` e data `2026-10-23`. O cenário atrasado tem fixture separada, sem motor de cálculo. Cada retorno é copiado, para um consumidor não alterar o estado do outro.

Mutações mock rejeitam com `MockOperationUnavailable`. Para testar uma ação na UI, injete a resposta de teste explicitamente na factory por `Partial<FinancePort>`. Isso não simula persistência nem autoriza marcar uma funcionalidade real concluída.

Para serviços reais, `createFinanceClient(transport, baseUrl)` e `createAgentClient(transport, baseUrl)` validam inputs e outputs. No navegador, informar `window.location.origin` como baseUrl e usar transporte `(request) => fetch(request)`. Não colocar URL de produção como default para desenvolvimento. Os endpoints reais de finance/agent ainda serão implementados por Daniel/Bruno; a base só registra GET `/api/demo/snapshot`.

Erros HTTP seguem `{error:{code,message,fields?,retry_after_seconds?},request_id}` e viram `ContractHttpError`. Sucessos seguem `{data,request_id}`. Payload incompatível com o schema é erro, nunca saldo confiável. Schemas usam strictObject e centavos inteiros seguros. `settled_date` é null quando não liquidado; `expected_date` admite null em registros incertos, mas criação exige uma data. Tarefa contém horário UTC, timezone, antecedência nullable, motivo, origem e critério de encerramento. Os schemas descrevem o formato; regras de horário, cálculo, persistência e transição pertencem às tarefas de domínio.

## Banco local para as próximas tarefas

Quando Daniel iniciar T2, usar Docker e a [CLI Supabase](https://supabase.com/docs/guides/local-development). Inicializar a configuração local uma vez e versioná-la, sem vincular ao projeto remoto:

```bash
npx supabase init
npx supabase start
npx supabase status
```

Preencher somente o ambiente de teste local com os valores exibidos. `TEST_DATABASE_URL` deve apontar para loopback, nunca para o Supabase da apresentação. Migrações financeiras e de tarefas ainda não existem nesta base. Não executar link, db push ou ativação de cron remoto. Credenciais reais nunca entram no Git; `.env.example` lista apenas os nomes.

## Hospedagem e agendamento

Vercel Hobby é o alvo da aplicação, com Node 24, sem cron Vercel (`vercel.json` não contém crons). A rota de demo usa runtime Node.js e maxDuration 60. Supabase Free será configurado em tarefas posteriores, com gate SQL antes de qualquer chamada à Vercel. Nada foi publicado ou provisionado em T1. SDKs OpenAI e Supabase estão instalados para as três frentes, mas não são instanciados nesta base.

## Fontes de configuração verificadas

- [Next.js + Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Next.js + Playwright](https://nextjs.org/docs/app/guides/testing/playwright)
- [Tailwind no Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Zod](https://zod.dev/api)

Build usa Webpack explicitamente para ter um caminho de verificação único. Não utiliza fontes remotas, credenciais, banco ou chamadas OpenAI durante build.
