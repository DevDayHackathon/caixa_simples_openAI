# Contratos v1 — fronteiras do trabalho paralelo

Status: proposta funcional; converter em tipos e schemas durante T1, antes de implementar consumidores. Alterações de contrato depois disso exigem atualização conjunta dos mocks e testes. Valores em centavos; datas civis ISO; instantes UTC.

## Entidades

| Entidade | Campos obrigatórios |
| --- | --- |
| Business | id, currency=BRL, timezone=America/Sao_Paulo, start_date, opening_balance_cents, reserve_threshold_cents=0, reminders_enabled=true |
| Transaction | id, business_id, direction=in/out, amount_cents positivo inteiro, status=pending/settled/cancelled, due_date, expected_date, settled_date opcional, counterparty, description, version, source, updated_at |
| Reservation | id, business_id, transaction_id de saída, amount_cents, status=active/released, version |
| Scenario | id, business_id, base_version, overrides de expected_date/amount_cents; nunca grava liquidação |
| ScheduledTask | id, business_id, target_id, kind=payment_reminder/collection_followup/cash_review, due_at, status=pending/running/completed/cancelled/failed, version, dedup_key, stop_condition, timezone, lead_time_minutes, scheduling_reason, schedule_source=user/agent/default, eligible_at opcional |
| TaskRun | id, task_id, scheduled_due_at, lease_until, attempt, status; unique(task_id,scheduled_due_at) |
| Notification | id, occurrence_key única, target_id, kind, title, explanation, proposal_ids, created_at, read_at opcional |
| Proposal | id, kind=reserve/draft_collection/simulate/change_expected_date, target_id, based_on_version, arguments, status=pending/accepted/dismissed/stale |
| ActionLog | id, request_id, origin=user/task, entity_id, action, status, created_at; sem segredos nem gravação de áudio |

CSV usa colunas da fixture. `expected_date` é obrigatória para pendências novas. IDs duplicados no mesmo CSV são inválidos. Importações pedem `idempotency_key`; novo lote com ID existente e conteúdo diferente retorna conflito. Reimportação idêntica não duplica. CSV não é interpretado como instrução para o modelo.

## Operações de domínio

| Operação | Entrada | Saída |
| --- | --- | --- |
| previewImport | CSV, saldo inicial, start_date | preview_id, linhas válidas, erros por linha/campo |
| confirmImport | preview_id, idempotency_key | inserted_count, business_version |
| getCashSnapshot | business_id, as_of | current_balance_cents, realized_in_cents, realized_out_cents, reserved_cents, free_cents, daily_balances[30], minimum_balance_cents, first_negative_date, negative_intervals, uncertain_receivables, source, updated_at, version |
| createTransaction | dados validados, idempotency_key | Transaction, business_version |
| updateTransaction | id, expected_version, patch permitido | Transaction, business_version |
| settleTransaction | id, settled_date, expected_version, idempotency_key | Transaction, business_version |
| simulate | overrides, base_version | scenario_id, baseline, projected, affected_dates, deficit_intervals |
| reserveForPayment | target_id, amount_cents, expected_version, idempotency_key | Reservation, reserved_cents, free_cents |
| evaluateProactivity | origin, business_version, now | proposals, scheduled_tasks, notifications; no máximo três iniciativas apresentadas |
| scheduleTask | target_id, kind, due_at, stop_condition, timezone, lead_time_minutes, scheduling_reason, schedule_source | tarefa nova ou equivalente existente |
| runDueTasks | now, executor_secret | claimed, completed, notified, failed; nenhuma dependência de browser |

`FinancePort` é a interface dessas operações financeiras para Bruno. `AgentTurn` recebe `message`, `origin=user`, `request_id` e contexto de sessão; retorna `reply_text`, `snapshot_version`, `proposals` e `created_task_ids`. Áudio transcrito entra como a mesma mensagem textual. Notificações agendadas não fingem que houve uma nova fala do usuário.

## Transporte e dono

| Endpoint proposto | Dono | Uso |
| --- | --- | --- |
| POST /api/finance/import/preview e /confirm | Daniel | Prévia e importação |
| GET /api/finance/snapshot | Daniel | Resumo e projeção |
| POST /api/finance/transactions; PATCH /api/finance/transactions/:id | Daniel | Criar e alterar |
| POST /api/finance/transactions/:id/settle | Daniel | Confirmar realização |
| POST /api/finance/scenarios | Daniel | Simular |
| POST /api/finance/reservations | Daniel | Reservar |
| POST /api/agent/turn | Bruno | Conversa e decisão sobre propostas |
| GET /api/agent/notifications | Bruno | Histórico de iniciativas |
| POST /api/tasks/run; PATCH /api/tasks/:id | Bruno | Executor protegido e adiar/cancelar |
| POST /api/audio/transcribe e /speak | Jecky | Voz sem chave no navegador |

Respostas: `{data, request_id}` ou `{error:{code,message,fields?,retry_after_seconds?}, request_id}`. Session scope fixa empresa fictícia. HTTP 422 validação; 409 versão/conflito; 401 sem sessão/segredo; 403 escopo; 429 limite; 503 dependência externa. Não há endpoint de transferência nem envio externo.

## Transições e integridade

- Transaction: pending → settled/cancelled; settled/cancelled são finais no MVP. Previsão altera somente pending. Liquidação encerra a reserva vinculada e as tarefas pertinentes na mesma unidade de consistência.
- Reservation: proposta → active quando aceita; active → released ao pagar/cancelar. Unique da reserva ativa por compromisso; valor não supera o saldo livre nem o valor ainda devido desse compromisso.
- Task: pending → running por aquisição atômica; running → completed/failed/pending. Cancelar/adiar usa versão; retry preserva a chave da ocorrência. A versão atual é checada novamente antes de persistir a notificação para não cobrar compromisso recém-liquidado.
- Notification: uma entrega por tarefa/horário/versão relevante; leitura não agenda novo aviso. Próxima tentativa não equivale a novo lembrete.
- Propostas baseadas em versão antiga ficam stale; usuário solicita nova avaliação. A IA não aplica uma proposta stale.

## Test doubles e integração

T1 materializa F1/F2 e mocks com todos os campos. Jecky e Bruno trabalham sobre esses formatos enquanto Daniel implementa o domínio. Mocks são explicitamente identificados em desenvolvimento e não substituem os testes com persistência. Cada frente publica seu módulo por adaptador. A composição real só troca adaptadores, sem reescrever os contratos.

## Fallbacks e ciclo de vida

Áudio acima do limite ou indisponível retorna erro recuperável e mantém texto. Gravação não é persistida; transcrição só fica no histórico da sessão demo. Reset demonstrativo cancela tarefas e apaga somente a empresa demo; não é iniciado por cron nem por instrução importada. Exportar logs sem segredos. Após reinício, tarefas pendentes continuam adquiríveis.

## Contrato de hospedagem gratuita

Supabase Free é a fonte de verdade. POST /api/tasks/run recebe somente segredo de servidor e usa now real no ambiente de produção; relógio controlado só no teste/demo explicitamente marcada. Resposta inclui claimed<=5 e remaining_due, sem varrer ou adquirir todos os pendentes. O executor termina o lote antes de responder. Nenhum timer residente. Cron Supabase verifica a cada cinco minutos, mas tarefas guardam due_at individual. Retry guarda eligible_at e não exige um novo cron.

Áudio binário multipart até 3 MiB/60 s; limite total de transporte precisa permanecer abaixo dos 4.5 MB da Vercel. Síntese recebe até 1.200 caracteres e devolve até 3 MiB, com erro recuperável se exceder. Estado não usa filesystem da função. Rate limit é compartilhado no banco. Preview usa mocks/banco isolado e nunca adquire tarefas de produção. Fontes e configuração em docs/deploy-gratuito.md.

## Decisão de horário e gate SQL

`due_at` é o horário da próxima execução, não o vencimento financeiro. `lead_time_minutes` registra a antecedência em relação ao compromisso e vale zero quando a execução é imediata; prazos combinados sem vencimento relacionado podem usar null. `scheduling_reason` é obrigatório. `schedule_source=user` prevalece sobre decisão automática; solicitações ambíguas são esclarecidas. Validar horários contra now e timezone antes da escrita.

`dispatchDueTasks(now)` é função SQL do agendamento, não ferramenta pública do agente. Retorna `dispatched=false` sem HTTP se não existir ocorrência vencida/elegível e sem lease válida. Quando há trabalho, verifica/adquire lease curta de despacho e chama `/api/tasks/run` com o segredo do Vault, sem expor esse segredo. Se a chamada não completar, o lease expira e a tarefa persiste para tentativa posterior. A resposta do executor e TaskRun, não o simples envio HTTP, determinam conclusão. Índice por status/due_at/eligible_at dá suporte à verificação. Essa otimização não elimina rechecagem nem deduplicação no executor.
