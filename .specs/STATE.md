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

- **Feature**: `.specs/features/caixa-proativo/`
- **Phase / Task**: T1 concluída na main; restante não iniciado.
- **Completed**: Configuração Next.js/TS/Tailwind/Node24, lockfile, schemas e portas v1, F1/F2, mocks, clientes HTTP, página/endpoint demo, env de exemplo e guia. npm run check passou: 15 unitários, 6 integração e 3 E2E, lint/tipos/build. Sensor em cópia temporária detectou 2/2 falhas. Evidência em t1-checks.md.
- **Next step**: compartilhar o commit-base e criar as três branches já propostas, quando solicitado. T2–T22 ainda pendentes; nenhum requisito completo de produto marcado Verified.
- **Blockers**: nenhum para iniciar as frentes após criação/compartilhamento das branches. Sem push, deploy ou provisionamento remoto nesta entrega.
- **Uncommitted files**: remoção preexistente de fluxo_agente_proativo.png preservada e excluída do commit de T1.
- **Branch**: main; nenhuma branch de integrante criada.

## Handoff Daniel — 2026-10-23 (atualiza somente a frente financeira)

- **Branch e base confirmadas**: `feat/daniel-caixa-dados`, derivada de `eaa8068`, mesmo commit das três branches remotas no início do trabalho. O handoff T1 acima é o registro histórico anterior à criação delas.
- **Tarefas**: T2–T8 implementadas, com um commit por tarefa e os gates exigidos. T1 não foi refeita. Skills: Karpathy aplicada; tlc-spec-driven indisponível e comunicada antes da implementação.
- **Gate final**: na revisão pré-push, `npm run check` passou com lint, tipos, 35 unitários, 52 integração e 4 E2E. Inclui regressão para linha CSV final incompleta entre aspas. Evidência por tarefa e da revisão em `.specs/features/caixa-proativo/daniel-checks.md`.
- **Verifier independente**: PASS, sem achados materiais; reexecução 35 unitários e 51 integração, sensor 2/2 em cópia temporária fora do clone. Somente CASH-06, RES-02, RES-04 e SAFE-02 foram Verified, pois todas as suas tarefas relacionadas estão concluídas.
- **Persistência de teste**: Postgres 17.11 portátil, somente loopback `127.0.0.1:55432`; bancos temporários por suíte. Docker não estava instalado. E2E cobre Next compilado, SDK Supabase por ponte HTTP local para SQL real e reinício da instância. Nenhum teste de escrita usou banco remoto.
- **Integração disponível**: `src/features/finance/port.ts` implementa FinancePort v1; `src/app/api/finance/` disponibiliza as rotas. `src/features/finance/README.md` documenta sessão demo, configuração e o evento SQL `finance_resolutions` para Bruno integrar encerramento de tarefas na mesma transação por trigger em sua migração 002.
- **Limites de conclusão**: UI, agente, tarefas reais, cron, integração T21/T22 e configuração remota de Supabase continuam nas tarefas dos responsáveis. Requisitos com essas dependências permanecem In Progress/Pending, sem Verified global.
- **Publicação**: usuário autorizou o push de `feat/daniel-caixa-dados` após revisão pré-envio em 23/10/2026; deploy, provisionamento e migração remota permanecem fora da autorização. Contratos, dependências e áreas dos colegas preservados.
