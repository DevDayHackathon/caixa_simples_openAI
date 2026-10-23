# Integração final

## Execution Plan
T1 -> T2 -> T3 -> T4 -> T5

## Gate Check Commands
quick: npm run test:unit
full: npm run lint && npm run typecheck && npm run test:unit && npm run test:integration
build: npm run check

## Test Coverage Matrix
| Task | Requirement | Tests |
| --- | --- | --- |
| T1 | FINAL-01 | integração SQL real |
| T2 | FINAL-02 | integração sessão/runtime |
| T3 | FINAL-03 | integração decisões e conflitos |
| T4 | FINAL-04 | HTTP áudio e UI/E2E |
| T5 | FINAL-05 | gate completo e verificador |

## Task Breakdown

### T1: Corrigir persistência do agente
**What**: Migração aplicável, histórico, serialização e integração transacional do encerramento.
**Where**: supabase/migrations/002_tasks.sql, src/features/tasks/supabase-repository.ts, tests/integration/
**Depends on**: None
**Requirement**: FINAL-01
**Tests**: integration
**Gate**: full
**Done when**: SQL real valida aplicar, histórico, tarefas, quota e encerramento. [x]

### T2: Unificar composição e sessão
**What**: Runtime e executor usam FinancePort persistida e cookie financeiro; parâmetros/modelos e versão reais.
**Where**: src/features/agent/, src/features/tasks/server.ts, src/features/finance/session.ts, src/app/api/
**Depends on**: T1
**Requirement**: FINAL-02
**Tests**: integration
**Gate**: full
**Done when**: Sessão real autoriza; falhas não ativam mocks; versão e null do tool testados. [ ]

### T3: Persistir decisões e ações do feed
**What**: Propostas e decisões confirmadas com CAS/idempotência, ferramentas de simulação/registro e ações do feed.
**Where**: src/features/agent/, supabase/migrations/003_agent_actions.sql, tests/integration/
**Depends on**: T2
**Requirement**: FINAL-03
**Tests**: integration
**Gate**: full
**Done when**: Aceite, dispensa, ajuste, stale, repetição e resolução têm resultados persistidos. [ ]

### T4: Conectar experiência e voz
**What**: Injetar AgentPort no caixa configurado e habilitar voz com autorização e quota compartilhada.
**Where**: src/features/experience/, src/app/api/audio/, tests/e2e/, tests/integration/
**Depends on**: T3
**Requirement**: FINAL-04
**Tests**: integration, e2e
**Gate**: build
**Done when**: Fluxo integrado e falhas de áudio/sessão/quota testados sem chamadas pagas. [ ]

### T5: Verificar e publicar integração
**What**: Revisão independente/sensor, documentação final, push e merge autorizado com head validado.
**Where**: docs/, .specs/features/integracao-final/, .specs/STATE.md
**Depends on**: T4
**Requirement**: FINAL-05
**Tests**: integration, e2e
**Gate**: build
**Done when**: Relatório PASS e main remota contém o head revisado; ensaio credenciado pendente identificado. [ ]

T1 PASS: lint/tipos,135 unitários,82 integração. FINAL-01: agent-sql.test.ts:11 `toBe('t\nf')`, :16 `toHaveLength(20)`, :24 `toBe('cancelled')`; supabase-tasks.test.ts:59 normaliza metadata/null/data. Mapeamento reverso: novos testes cobrem somente FINAL-01. T1 agrupa migração e adaptador porque o contrato de persistência deve ser verificável junto.
