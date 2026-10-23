# STATE

## Decisions

### AD-001
- **Decision**: O MVP usa dados informados, CSV e reservas virtuais; não executa operações bancárias.
- **Reason**: Cumprir o desafio e concentrar o diferencial na proatividade.
- **Trade-off**: Saldo não é sincronizado com banco e exige atualização do usuário.
- **Scope**: Todos os fluxos financeiros e de agente.
- **Date**: 2026-10-23
- **Status**: active

### AD-002
- **Decision**: Input do usuário e tarefa programada são fluxos separados que compartilham ferramentas financeiras.
- **Reason**: Solicitação explícita do usuário; uma tarefa pode agir sem conversa iniciada.
- **Trade-off**: É necessário manter estado de tarefas e execução persistida.
- **Scope**: Agente, executor e contratos.
- **Date**: 2026-10-23
- **Status**: active

### AD-003
- **Decision**: A implantação alvo usa Vercel Hobby e Supabase Free; o Supabase Cron dispara o executor HTTP na Vercel a cada cinco minutos.
- **Reason**: Restrição explícita do usuário; Cron Vercel Hobby tem frequência máxima diária.
- **Trade-off**: Entrega por verificação periódica, quotas gratuitas e possível pausa do banco; não há worker permanente nem garantia de horário exato.
- **Scope**: Hospedagem, tarefas, payload de voz, persistência e publicação da equipe.
- **Date**: 2026-10-23
- **Status**: superseded by AD-004

### AD-004
- **Decision**: O agente define due_at e justificativa antes de criar tarefa. Supabase Cron verifica o banco a cada cinco minutos e só despacha HTTP à Vercel se houver tarefa vencida elegível; sem trabalho, nenhuma chamada Vercel/OpenAI.
- **Reason**: Aceite explícito do usuário para evitar chamadas inúteis, preservando acompanhamento independente de input.
- **Trade-off**: Permanece a checagem SQL periódica e a precisão de cinco minutos; aquisição e rechecagem no executor continuam necessárias.
- **Scope**: Agendamento e executor; mantém Vercel Hobby e Supabase Free da AD-003.
- **Date**: 2026-10-23
- **Status**: active

## Handoff

- **Feature**: `.specs/features/integracao-final/`, composição das três frentes e correções do PR3.
- **Phase / Task**: T1–T5 locais concluídas; T6 publicação/merge aguardando verificação independente final.
- **Completed**: FinancePort persistida compartilhada, sessão financeira para agente/voz, migrações002/003 corrigidas, propostas/aceites transacionais e idempotentes, feed real, áudio com quota SQL, runner com cancelamento e validação de tentativa/lease.
- **Validation**: npm run check PASS135 unitários,99 integração SQL,11 E2E, zero falhas/skips; lint/tipos/build. SQL real e provedor OpenAI simulado localmente, sem chamadas pagas.
- **Publication authority**: usuário autorizou explicitamente correções, push na branch do Bruno e merge automático após validação nesta conversa.
- **Next step**: revisão independente PASS (8/8 mutações detectadas); publicar candidato corrigido e fazer merge com head validado. Configurar credenciais/migrações no ambiente demo depois.
- **Environment pending**: OpenAI/Supabase reais, deploy, extensões/Vault/Cron remoto e UAT U01–U13 ainda não executados. Guia atual em docs/integracao-financeira.md.
- **Uncommitted user files**: exclusão preexistente fluxo_agente_proativo.png e AGENTS.md não rastreado preservados e excluídos dos commits.
- **Branch**: codex/integracao-financeira, base main1e3b9c7; código final909085f.

## Handoff Daniel — 2026-10-23 (atualiza somente a frente financeira)

- **Branch e base confirmadas**: `feat/daniel-caixa-dados`, derivada de `eaa8068`, mesmo commit das três branches remotas no início do trabalho. O handoff T1 acima é o registro histórico anterior à criação delas.
- **Tarefas**: T2–T8 implementadas, com um commit por tarefa e os gates exigidos. T1 não foi refeita. Skills: Karpathy aplicada; tlc-spec-driven indisponível e comunicada antes da implementação.
- **Gate final**: na revisão pré-push, `npm run check` passou com lint, tipos, 35 unitários, 52 integração e 4 E2E. Inclui regressão para linha CSV final incompleta entre aspas. Evidência por tarefa e da revisão em `.specs/features/caixa-proativo/daniel-checks.md`.
- **Verifier independente**: PASS, sem achados materiais; reexecução 35 unitários e 51 integração, sensor 2/2 em cópia temporária fora do clone. Somente CASH-06, RES-02, RES-04 e SAFE-02 foram Verified, pois todas as suas tarefas relacionadas estão concluídas.
- **Persistência de teste**: Postgres 17.11 portátil, somente loopback `127.0.0.1:55432`; bancos temporários por suíte. Docker não estava instalado. E2E cobre Next compilado, SDK Supabase por ponte HTTP local para SQL real e reinício da instância. Nenhum teste de escrita usou banco remoto.
- **Integração disponível**: `src/features/finance/port.ts` implementa FinancePort v1; `src/app/api/finance/` disponibiliza as rotas. `src/features/finance/README.md` documenta sessão demo, configuração e o evento SQL `finance_resolutions` para Bruno integrar encerramento de tarefas na mesma transação por trigger em sua migração 002.
- **Limites de conclusão**: UI, agente, tarefas reais, cron, integração T21/T22 e configuração remota de Supabase continuam nas tarefas dos responsáveis. Requisitos com essas dependências permanecem In Progress/Pending, sem Verified global.
- **Publicação**: usuário autorizou o push de `feat/daniel-caixa-dados` após revisão pré-envio em 23/10/2026; deploy, provisionamento e migração remota permanecem fora da autorização. Contratos, dependências e áreas dos colegas preservados.
