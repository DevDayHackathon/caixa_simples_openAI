import {
  businessSchema, transactionSchema, cashSnapshotSchema, scheduledTaskSchema,
  notificationSchema, agentTurnResultSchema,
} from "@/contracts";

export const FIXTURE_NOW = "2026-10-23T12:00:00.000Z";
const business = businessSchema.parse({
  id: "demo", currency: "BRL", timezone: "America/Sao_Paulo", start_date: "2026-10-23",
  opening_balance_cents: 100000, reserve_threshold_cents: 0, reminders_enabled: true,
});

const transactionDefaults = {
  business_id: "demo", status: "pending", settled_date: null, version: 1, source: "mock", updated_at: FIXTURE_NOW,
} as const;

export const f1 = {
  business,
  transactions: [
    transactionSchema.parse({ ...transactionDefaults, id: "rec-1", direction: "in", amount_cents: 200000,
      due_date: "2026-10-25", expected_date: "2026-10-25", counterparty: "Cliente Ana", description: "Venda a prazo" }),
    transactionSchema.parse({ ...transactionDefaults, id: "pay-1", direction: "out", amount_cents: 150000,
      due_date: "2026-10-27", expected_date: "2026-10-27", counterparty: "Fornecedor Central", description: "Compra de mercadoria" }),
  ],
};

export const f2 = {
  business: { ...business, id: "demo-reservas" },
  transactions: [transactionSchema.parse({ ...f1.transactions[1], id: "pay-f2", business_id: "demo-reservas", amount_cents: 50000 })],
  reservations: [],
};

// Valores de referência da especificação, não um motor financeiro.
const referenceDates = [
  "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31",
  "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09",
  "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18",
  "2026-11-19", "2026-11-20", "2026-11-21",
];
const baseBalances = [100000, 100000, 300000, 300000, ...Array<number>(26).fill(150000)];
const delayedBalances = [100000, 100000, 100000, 100000, ...Array<number>(5).fill(-50000), ...Array<number>(21).fill(150000)];

export const f1Snapshot = cashSnapshotSchema.parse({
  business_id: "demo", as_of: "2026-10-23", current_balance_cents: 100000,
  realized_in_cents: 0, realized_out_cents: 0, reserved_cents: 0, free_cents: 100000,
  daily_balances: referenceDates.map((date, index) => ({ date, balance_cents: baseBalances[index] })),
  minimum_balance_cents: 100000, first_negative_date: null, negative_intervals: [],
  uncertain_receivables: [], source: "mock", updated_at: FIXTURE_NOW, version: 1,
});

export const f1DelayedSnapshot = cashSnapshotSchema.parse({
  ...f1Snapshot,
  daily_balances: referenceDates.map((date, index) => ({ date, balance_cents: delayedBalances[index] })),
  minimum_balance_cents: -50000, first_negative_date: "2026-10-27",
  negative_intervals: [{ start_date: "2026-10-27", end_date: "2026-10-31" }],
});

// Exemplo separado de F1: fornecedor vence em 30/10 às 15h de São Paulo.
export const reminderFixture = scheduledTaskSchema.parse({
  id: "task-demo-1", business_id: "demo", target_id: "supplier-example-30oct", kind: "payment_reminder",
  due_at: "2026-10-29T18:00:00.000Z", status: "pending", version: 1,
  dedup_key: "supplier-example-30oct:reminder", stop_condition: "Encerrar quando o fornecedor for pago ou cancelado.",
  timezone: "America/Sao_Paulo", lead_time_minutes: 1440,
  scheduling_reason: "Lembrar 24 horas antes do vencimento do fornecedor.", schedule_source: "agent",
});

export const notificationFixture = notificationSchema.parse({
  id: "notice-demo-1", occurrence_key: "task-demo-1:2026-10-29T18:00:00.000Z", target_id: "supplier-example-30oct",
  kind: "payment_reminder", title: "Exemplo de lembrete de fornecedor",
  explanation: "Aviso simulado para desenvolver a interface. Nenhuma tarefa foi executada.",
  proposal_ids: [], created_at: "2026-10-29T18:00:00.000Z", read_at: null,
});

export const agentReplyFixture = agentTurnResultSchema.parse({
  reply_text: "Resposta simulada: seu saldo calculado é R$ 1.000,00. Nenhuma IA foi chamada.",
  snapshot_version: 1, proposals: [], created_task_ids: [],
});
