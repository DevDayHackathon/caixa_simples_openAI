import { z } from "zod";
import {
  agentTurnInputSchema, agentTurnResultSchema, balanceSchema, cashSnapshotSchema, centsSchema,
  dateIntervalSchema, dateSchema, idSchema, instantSchema, notificationSchema, positiveCentsSchema,
  proposalSchema, reservationSchema, scenarioOverrideSchema, scheduledTaskSchema,
  transactionFields, transactionSchema, versionSchema,
} from "./models";

const changedTransaction = z.strictObject({ transaction: transactionSchema, business_version: versionSchema });
const transactionDraft = transactionFields.pick({
  business_id: true, direction: true, amount_cents: true, due_date: true,
  counterparty: true, description: true,
}).extend({ expected_date: dateSchema });

export const financeOperations = {
  previewImport: {
    input: z.strictObject({ csv: z.string().min(1).max(1_048_576), opening_balance_cents: balanceSchema, start_date: dateSchema }),
    output: z.strictObject({ preview_id: idSchema, rows: z.array(transactionSchema).max(1000), errors: z.array(z.strictObject({ line: z.number().int().min(1), field: z.string(), message: z.string() })) }),
  },
  confirmImport: {
    input: z.strictObject({ preview_id: idSchema, idempotency_key: idSchema }),
    output: z.strictObject({ inserted_count: z.number().int().min(0), business_version: versionSchema }),
  },
  getCashSnapshot: {
    input: z.strictObject({ business_id: idSchema, as_of: dateSchema }), output: cashSnapshotSchema,
  },
  createTransaction: {
    input: z.strictObject({ transaction: transactionDraft, idempotency_key: idSchema }), output: changedTransaction,
  },
  updateTransaction: {
    input: z.strictObject({ id: idSchema, expected_version: versionSchema, patch: z.strictObject({
      expected_date: dateSchema.optional(), amount_cents: positiveCentsSchema.optional(),
      description: z.string().trim().min(1).max(1000).optional(),
    }).refine((patch) => Object.keys(patch).length > 0, "Informe uma alteração.") }), output: changedTransaction,
  },
  settleTransaction: {
    input: z.strictObject({ id: idSchema, settled_date: dateSchema, expected_version: versionSchema, idempotency_key: idSchema }), output: changedTransaction,
  },
  simulate: {
    input: z.strictObject({ overrides: z.array(scenarioOverrideSchema).min(1), base_version: versionSchema }),
    output: z.strictObject({ scenario_id: idSchema, baseline: cashSnapshotSchema, projected: cashSnapshotSchema,
      affected_dates: z.array(dateSchema), deficit_intervals: z.array(dateIntervalSchema) }),
  },
  reserveForPayment: {
    input: z.strictObject({ target_id: idSchema, amount_cents: positiveCentsSchema, expected_version: versionSchema, idempotency_key: idSchema }),
    output: z.strictObject({ reservation: reservationSchema, reserved_cents: centsSchema, free_cents: balanceSchema }),
  },
} as const;

export const agentOperations = {
  turn: { input: agentTurnInputSchema, output: agentTurnResultSchema },
  listNotifications: { input: z.undefined(), output: z.array(notificationSchema) },
} as const;

export const taskOperations = {
  scheduleTask: {
    input: scheduledTaskSchema.pick({ target_id: true, kind: true, due_at: true, stop_condition: true,
      timezone: true, lead_time_minutes: true, scheduling_reason: true, schedule_source: true }),
    output: scheduledTaskSchema,
  },
  runDueTasks: {
    input: z.strictObject({ now: instantSchema, executor_secret: z.string().min(1) }),
    output: z.strictObject({ claimed: z.number().int().min(0).max(5), completed: z.number().int().min(0),
      notified: z.number().int().min(0), failed: z.number().int().min(0), remaining_due: z.number().int().min(0) }),
  },
  evaluateProactivity: {
    input: z.strictObject({ origin: z.enum(["user", "task"]), business_version: versionSchema, now: instantSchema }),
    output: z.strictObject({ proposals: z.array(proposalSchema).max(3), scheduled_tasks: z.array(scheduledTaskSchema), notifications: z.array(notificationSchema) }),
  },
} as const;

type Operations = Record<string, { input: z.ZodType; output: z.ZodType }>;
export type Port<T extends Operations> = {
  [K in keyof T]: (input: z.infer<T[K]["input"]>) => Promise<z.infer<T[K]["output"]>>;
};
export type FinancePort = Port<typeof financeOperations>;
export type AgentPort = {
  turn: Port<typeof agentOperations>["turn"];
  listNotifications: () => Promise<z.infer<typeof agentOperations.listNotifications.output>>;
};
export type TaskPort = Port<typeof taskOperations>;
export type AgentTurn = Port<typeof agentOperations>["turn"];
