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

- **Feature**: `.specs/features/integracao-final/`; integração publicada e provedores reais ativos. UAT parcial, sem aceite global.
- **Completed**: PR3–PR8 integrados; base funcional atual `fc9da5079639ba6109afa0c9da5452b6eaf8c63e`. T7 serializa roles do fixture SQL; T8 corrige ISO com offset e contexto temporal; T9 isola OpenAI nos E2E; T10 preserva recibos finais accepted/dismissed. Consultar Git para o commit documental posterior.
- **Validation**: gate final PASS144 unitários,100 integrações SQL locais,11 E2E, lint/tipos/build, sem skips; `/tmp/folego-receipt-gate.log`. Revisão independente e sensores T7/T8/T10 PASS. CI do PR8 `40013929936` PASS; CI pós-merge `40014394994` em andamento na última consulta, não apresentar como aprovado.
- **Deployment**: preservar https://folego-hackathon-2026.vercel.app ; projeto CLI sem vínculo GitHub. Deployment `dpl_8bfXTQwSKkj9rQ3EHr1gdyuESPrL` READY, fonte `6c0d43c`, árvore da aplicação equivalente ao merge PR8. Documentação posterior não exige redeploy.
- **Environment**: Supabase demo autorizado `optwdryxvpnqdumzexcs`; migrações001–003, pg_cron/pg_net e Vault prontos. Job1 `caixa-agent-due` ativo a cada cinco minutos, despacha somente trabalho elegível. RPC temporária removida. Credencial privilegiada corrigida, REST200, nove variáveis de servidor configuradas Production. Modelos gpt-6-luna/gpt-transcribe/gpt-4o-mini-tts; chamadas reais autorizadas PASS.
- **Real UAT**: consultar `docs/uat-real-2026-10-23.md`. Importação/persistência entre abas, respostas/contexto, propostas/aceite/replay/revisão antiga, simulação, agendamento e entrega Cron com aba fechada observados. Voz pelas rotas reais200; captura física pendente. U10 cancelada e zero notificações após Cron19:55Z. U11 combina remoto ocioso com lote/lease isolados. Não declarar13/13PASS.
- **Known limits**: upload anônimo3,2MB alternou401/500 de borda, causa inconclusiva; U12 parcial. Falhas reais de fornecedor/banco e ensaio completo no aparelho da apresentação permanecem pendentes. Não há bloqueio de credencial.
- **Demo data**: estado financeirov7 após restaurar somente alteração UAT da previsão rec-1 para25/10; saldo90000, reserva50000, três compromissos fictícios, incluindo UAT liquidado10000. Não resetar o banco compartilhado automaticamente.
- **Next step**: conferir CI final pós-merge; ensaiar microfone/reprodução no aparelho da apresentação e completar os passos parciais da matriz. Investigar upload grande antes de alegar robustez total. Testes automatizados destrutivos somente Postgres local, OpenAI simulado.
- **Branch**: `codex/integracao-financeira`; consultar Git para HEAD e PR documental final. Operações Git/deploy centralizadas no principal.
- **User files preserved**: exclusão preexistente fluxo_agente_proativo.png e AGENTS.md não rastreado fora dos commits. .env* ignorados; nunca imprimir/versionar segredos ou compartilhá-los com subagentes.

## Handoff Daniel — 2026-10-23 (atualiza somente a frente financeira)

- **Branch e base confirmadas**: `feat/daniel-caixa-dados`, derivada de `eaa8068`, mesmo commit das três branches remotas no início do trabalho. O handoff T1 acima é o registro histórico anterior à criação delas.
- **Tarefas**: T2–T8 implementadas, com um commit por tarefa e os gates exigidos. T1 não foi refeita. Skills: Karpathy aplicada; tlc-spec-driven indisponível e comunicada antes da implementação.
- **Gate final**: na revisão pré-push, `npm run check` passou com lint, tipos, 35 unitários, 52 integração e 4 E2E. Inclui regressão para linha CSV final incompleta entre aspas. Evidência por tarefa e da revisão em `.specs/features/caixa-proativo/daniel-checks.md`.
- **Verifier independente**: PASS, sem achados materiais; reexecução 35 unitários e 51 integração, sensor 2/2 em cópia temporária fora do clone. Somente CASH-06, RES-02, RES-04 e SAFE-02 foram Verified, pois todas as suas tarefas relacionadas estão concluídas.
- **Persistência de teste**: Postgres 17.11 portátil, somente loopback `127.0.0.1:55432`; bancos temporários por suíte. Docker não estava instalado. E2E cobre Next compilado, SDK Supabase por ponte HTTP local para SQL real e reinício da instância. Nenhum teste de escrita usou banco remoto.
- **Integração disponível**: `src/features/finance/port.ts` implementa FinancePort v1; `src/app/api/finance/` disponibiliza as rotas. `src/features/finance/README.md` documenta sessão demo, configuração e o evento SQL `finance_resolutions` para Bruno integrar encerramento de tarefas na mesma transação por trigger em sua migração 002.
- **Limites de conclusão**: UI, agente, tarefas reais, cron, integração T21/T22 e configuração remota de Supabase continuam nas tarefas dos responsáveis. Requisitos com essas dependências permanecem In Progress/Pending, sem Verified global.
- **Publicação**: usuário autorizou o push de `feat/daniel-caixa-dados` após revisão pré-envio em 23/10/2026; deploy, provisionamento e migração remota permanecem fora da autorização. Contratos, dependências e áreas dos colegas preservados.
