# Integração final

CI pós-merge: [run40007942510](https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40007942510) em andamento na conferência desta continuidade; não declarar aprovação até o resultado final.

## Execution Plan
```mermaid
flowchart TD
T1 --> T2
T2 --> T3
T3 --> T4
T4 --> T5
T5 --> T6
```

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
| T5 | FINAL-01, FINAL-03 | integração SQL real |
| T6 | FINAL-05 | gate completo e verificador |

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
**Done when**: Sessão real autoriza; falhas não ativam mocks; versão e null do tool testados. [x]

### T3: Persistir decisões e ações do feed
**What**: Propostas e decisões confirmadas com CAS/idempotência, ferramentas de simulação/registro e ações do feed.
**Where**: src/features/agent/, supabase/migrations/003_agent_actions.sql, tests/integration/
**Depends on**: T2
**Requirement**: FINAL-03
**Tests**: integration
**Gate**: full
**Done when**: Aceite, dispensa, ajuste, stale, repetição e resolução têm resultados persistidos. [x]

### T4: Conectar experiência e voz
**What**: Injetar AgentPort no caixa configurado e habilitar voz com autorização e quota compartilhada.
**Where**: src/features/experience/, src/app/api/audio/, tests/e2e/, tests/integration/
**Depends on**: T3
**Requirement**: FINAL-04
**Tests**: integration, e2e
**Gate**: build
**Done when**: Fluxo integrado e falhas de áudio/sessão/quota testados sem chamadas pagas. [x]

### T5: Fechar concorrência e iniciativas
**What**: Cancelar tarefas running, cercar tentativas retomadas e suprimir aceite de iniciativas sem simulação concreta.
**Where**: src/features/tasks/, src/features/agent/actions.ts, supabase/migrations/, tests/integration/
**Depends on**: T4
**Requirement**: FINAL-01, FINAL-03
**Tests**: integration
**Gate**: build
**Done when**: Runner SQL real entrega uma vez, cancelamento suprime aviso, dono expirado é rejeitado e alerta sem parâmetros não oferece aceite. [x]

### T6: Verificar e publicar integração
**What**: Revisão independente/sensor, isolamento E2E por cenário no CI, documentação final, push e merge autorizado com head validado.
**Where**: docs/, .specs/features/integracao-final/, .specs/STATE.md, tests/e2e/finance.spec.ts
**Depends on**: T5
**Requirement**: FINAL-05
**Tests**: integration, e2e
**Gate**: build
**Done when**: Relatório PASS e main remota contém o head revisado; ensaio credenciado pendente identificado. [x]

T1 PASS: lint/tipos,135 unitários,82 integração. FINAL-01: agent-sql.test.ts:11 `toBe('t\nf')`, :16 `toHaveLength(20)`, :24 `toBe('cancelled')`; supabase-tasks.test.ts:59 normaliza metadata/null/data. Mapeamento reverso: novos testes cobrem somente FINAL-01. T1 agrupa migração e adaptador porque o contrato de persistência deve ser verificável junto.

T2 PASS: lint/tipos,135 unitários,85 integração. FINAL-02 agent-composition.test.ts:23 sessão emitida/identidade conservada; :33 source=user_data e version=7; :37 based_on_version=7; :43 produção sem banco lança erro. Reverso: três testes novos cobrem exclusivamente FINAL-02. Legado assinado mantido para compatibilidade; novas sessões usam somente cookie financeiro.

T3 PASS: lint/tipos,135 unitários,91 integração. agent-actions.test.ts:32 `reservations.length=1`/version3/replay, :39 dismissed/zero reservas, :46 stale e sessão estrangeira rejeitadas, :51 data e recibo accepted, :57 simulação -50000 sem escrita, :69 resolução não presume liquidação e leitura/cancelamento persistem. Cada teste novo corresponde FINAL-03; simulação e rascunho não têm envio externo.

T4 PASS: npm run check,135 unitários,95 integração,11 E2E; lint/tipos/build. FINAL-04 audio-live.test.ts:16 HTTP200/texto, :21 bytes MP3 e falha sanitizada, :27 401/429 e zero provedor; agent-integrated.spec.ts:47 proposta sem escrita, :50 reserva persistida50000, :51 recarga/version3 e 360px. Reverso: quatro casos de áudio/status e E2E correspondem somente FINAL-04. Provedor OpenAI local de teste; Postgres real e rotas Next de produção.

T5 PASS: npm run check,135 unitários,99 integração,11 E2E; zero falhas/skips. tasks-sql-runtime.test.ts:25 runner claimed1/completed1/notified1, :26 repetição claimed0, :32 cancelamento devolve createNotification=false, :40 tentativa antiga rejeitada e statusrunning, :43 tentativa atual completed. agent-actions.test.ts:67 alerta negativo não oferece proposta incompleta; :71 simulação concreta accepted sem escrita/version3. Reverso: casos novos correspondem FINAL-01/03 e corrigem achados da revisão independente; nenhuma asserção preexistente alterada.

T6 correção CI: run40005794067 no head21335e6 expôs dependência entre cenários (saldo500 no lugar1000). Reproduzida localmente com finance.spec --workers=1, sem alterar expectativas. beforeEach/afterEach agora isolam banco/servidor por cenário. Gate completo com todos11E2E em1worker PASS (135unit,99integração,11E2E). Nenhuma asserção foi removida/enfraquecida.

T6 publicação concluída: revisão independente PASS e 8/8 mutações detectadas; CI do candidato `4186bdf` aprovado em https://github.com/DevDayHackathon/caixa_simples_openAI/actions/runs/40006622435/job/120599339880. PR3 aprovado e integrado no merge `d3baa174ff488c71f6bb1e9730ad6d89944f3116` em 2026-10-23T19:00:21Z. Protótipo publicado via CLI em https://folego-hackathon-2026.vercel.app (projeto `folego-hackathon-2026`, sem vínculo GitHub), com landing demonstrativa verificada. Evidência de publicação e seus limites em docs/CONTINUAR-SESSAO.md; configuração remota OpenAI/Supabase, migrações/Vault/Cron e UAT U01–U13 permanecem pendentes e não são declarados executados por este fechamento de T6.
