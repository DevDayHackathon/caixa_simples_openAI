import { z } from "zod";

export const idSchema = z.string().trim().min(1).max(128);
export const dateSchema = z.iso.date();
export const instantSchema = z.iso.datetime();
export const centsSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const balanceSchema = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
export const positiveCentsSchema = centsSchema.min(1);
export const versionSchema = z.number().int().min(1);
const text = z.string().trim().min(1);

export const businessSchema = z.strictObject({
  id: idSchema, currency: z.literal("BRL"), timezone: z.literal("America/Sao_Paulo"),
  start_date: dateSchema, opening_balance_cents: balanceSchema,
  reserve_threshold_cents: centsSchema, reminders_enabled: z.boolean(),
});

export const transactionFields = z.strictObject({
  id: idSchema, business_id: idSchema, direction: z.enum(["in", "out"]),
  amount_cents: positiveCentsSchema, status: z.enum(["pending", "settled", "cancelled"]),
  due_date: dateSchema, expected_date: dateSchema.nullable(), settled_date: dateSchema.nullable(),
  counterparty: text.max(200), description: text.max(1000), version: versionSchema,
  source: z.enum(["csv", "user", "mock"]), updated_at: instantSchema,
});

export const transactionSchema = transactionFields.superRefine((value, ctx) => {
  if (value.status === "settled" && value.settled_date === null) {
    ctx.addIssue({ code: "custom", path: ["settled_date"], message: "Uma conta realizada exige data de liquidação." });
  }
  if (value.status === "pending" && value.settled_date !== null) {
    ctx.addIssue({ code: "custom", path: ["settled_date"], message: "Uma pendência não pode estar liquidada." });
  }
});

export const reservationSchema = z.strictObject({
  id: idSchema, business_id: idSchema, transaction_id: idSchema,
  amount_cents: positiveCentsSchema, status: z.enum(["active", "released"]), version: versionSchema,
});

export const scenarioOverrideSchema = z.strictObject({
  transaction_id: idSchema, expected_date: dateSchema.optional(), amount_cents: positiveCentsSchema.optional(),
}).refine((value) => value.expected_date !== undefined || value.amount_cents !== undefined, "Informe uma alteração.");

export const scenarioSchema = z.strictObject({
  id: idSchema, business_id: idSchema, base_version: versionSchema,
  overrides: z.array(scenarioOverrideSchema).min(1),
});

export const scheduledTaskSchema = z.strictObject({
  id: idSchema, business_id: idSchema, target_id: idSchema,
  kind: z.enum(["payment_reminder", "collection_followup", "cash_review"]), due_at: instantSchema,
  status: z.enum(["pending", "running", "completed", "cancelled", "failed"]), version: versionSchema,
  dedup_key: idSchema, stop_condition: text.max(1000), timezone: z.literal("America/Sao_Paulo"),
  lead_time_minutes: z.number().int().min(0).nullable(), scheduling_reason: text.max(1000),
  schedule_source: z.enum(["user", "agent", "default"]), eligible_at: instantSchema.optional(),
});

export const taskRunSchema = z.strictObject({
  id: idSchema, task_id: idSchema, scheduled_due_at: instantSchema, lease_until: instantSchema,
  attempt: z.number().int().min(1), status: z.enum(["running", "completed", "failed"]),
});

export const proposalSchema = z.strictObject({
  id: idSchema, kind: z.enum(["reserve", "draft_collection", "simulate", "change_expected_date"]),
  target_id: idSchema, based_on_version: versionSchema, arguments: z.record(z.string(), z.json()),
  status: z.enum(["pending", "accepted", "dismissed", "stale"]),
});

export const notificationSchema = z.strictObject({
  id: idSchema, occurrence_key: idSchema, target_id: idSchema, kind: text.max(100), title: text.max(200),
  explanation: text.max(4000), proposal_ids: z.array(idSchema), created_at: instantSchema,
  read_at: instantSchema.nullable().optional(),
});

export const actionLogSchema = z.strictObject({
  id: idSchema, request_id: idSchema, origin: z.enum(["user", "task"]), entity_id: idSchema,
  action: text.max(100), status: z.enum(["succeeded", "failed"]), created_at: instantSchema,
});

export const dateIntervalSchema = z.strictObject({ start_date: dateSchema, end_date: dateSchema });
export const cashSnapshotSchema = z.strictObject({
  business_id: idSchema, as_of: dateSchema,
  current_balance_cents: balanceSchema, realized_in_cents: centsSchema, realized_out_cents: centsSchema,
  reserved_cents: centsSchema, free_cents: balanceSchema,
  daily_balances: z.array(z.strictObject({ date: dateSchema, balance_cents: balanceSchema })).length(30),
  minimum_balance_cents: balanceSchema, first_negative_date: dateSchema.nullable(),
  negative_intervals: z.array(dateIntervalSchema), uncertain_receivables: z.array(transactionSchema),
  source: z.enum(["mock", "user_data"]), updated_at: instantSchema, version: versionSchema,
});

export const agentTurnInputSchema = z.strictObject({
  message: text.max(4000), origin: z.literal("user"), request_id: idSchema,
});
export const agentTurnResultSchema = z.strictObject({
  reply_text: text, snapshot_version: versionSchema, proposals: z.array(proposalSchema).max(3),
  created_task_ids: z.array(idSchema),
});

export const errorEnvelopeSchema = z.strictObject({
  error: z.strictObject({
    code: text, message: text, fields: z.record(z.string(), z.string()).optional(),
    retry_after_seconds: z.number().int().min(0).optional(),
  }),
  request_id: idSchema,
});
export const successEnvelopeSchema = <T extends z.ZodType>(schema: T) =>
  z.strictObject({ data: schema, request_id: idSchema });

export type Business = z.infer<typeof businessSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
export type Reservation = z.infer<typeof reservationSchema>;
export type ScheduledTask = z.infer<typeof scheduledTaskSchema>;
export type CashSnapshot = z.infer<typeof cashSnapshotSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type AgentTurnInput = z.infer<typeof agentTurnInputSchema>;
export type AgentTurnResult = z.infer<typeof agentTurnResultSchema>;
