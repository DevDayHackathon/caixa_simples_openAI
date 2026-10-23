import { z } from "zod";
import type { FinancePort, Proposal, ScheduledTask } from "@/contracts";
import { agentTurnInputSchema, scheduledTaskSchema } from "@/contracts";
import { FIXTURE_NOW } from "@/fixtures/demo";
import { createTaskScheduler, type TaskRepository } from "@/features/tasks/schedule";

const getSnapshotArgs = z.strictObject({ as_of: z.iso.date().nullable().optional() });
const proposalArgs = z.strictObject({
  kind: z.enum(["reserve", "draft_collection", "simulate", "change_expected_date"]),
  target_id: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(1).max(500),
});
const scheduleArgs = z.strictObject({
  target_id: z.string().trim().min(1).max(128),
  kind: z.enum(["payment_reminder", "collection_followup", "cash_review"]),
  due_at: z.iso.datetime().nullable().optional(),
  explicit_time: z.iso.datetime().nullable().optional(),
  commitment_due_at: z.iso.datetime().nullable().optional(),
  lead_time_minutes: z.number().int().min(0).nullable().optional(),
  scheduling_reason: z.string().trim().min(1).max(1000),
  stop_condition: z.string().trim().min(1).max(1000),
});

export type AgentToolContext = {
  businessId: string;
  now: string;
  finance: FinancePort;
  tasks: TaskRepository;
  businessVersion: number;
  userMessage?: string;
};

export type ToolResult = { output: unknown; task?: ScheduledTask; proposal?: Proposal };

// This allowlist has no bank transfer, outbound collection, or arbitrary network tool.
export const agentToolDefinitions = [
  { type: "function" as const, name: "get_cash_snapshot", description: "Read the authoritative cash projection for the demo business.", strict: true, parameters: { type: "object", properties: { as_of: { type: ["string", "null"] } }, required: ["as_of"], additionalProperties: false } },
  { type: "function" as const, name: "prepare_proposal", description: "Prepare a user-reviewable financial proposal. Never applies it.", strict: true, parameters: { type: "object", properties: { kind: { type: "string", enum: ["reserve", "draft_collection", "simulate", "change_expected_date"] }, target_id: { type: "string" }, reason: { type: "string" } }, required: ["kind", "target_id", "reason"], additionalProperties: false } },
  { type: "function" as const, name: "schedule_followup", description: "Persist an internal follow-up. Ask the user when the requested time is ambiguous.", strict: true, parameters: { type: "object", properties: { target_id: { type: "string" }, kind: { type: "string", enum: ["payment_reminder", "collection_followup", "cash_review"] }, due_at: { type: ["string", "null"] }, explicit_time: { type: ["string", "null"] }, commitment_due_at: { type: ["string", "null"] }, lead_time_minutes: { type: ["integer", "null"] }, scheduling_reason: { type: "string" }, stop_condition: { type: "string" } }, required: ["target_id", "kind", "due_at", "explicit_time", "commitment_due_at", "lead_time_minutes", "scheduling_reason", "stop_condition"], additionalProperties: false } },
];

export async function executeAgentTool(name: string, rawArgs: string, context: AgentToolContext): Promise<ToolResult> {
  if (name === "get_cash_snapshot") {
    const args = getSnapshotArgs.parse(JSON.parse(rawArgs));
    return { output: await context.finance.getCashSnapshot({ business_id: context.businessId, as_of: args.as_of ?? context.now.slice(0, 10) }) };
  }
  if (name === "prepare_proposal") {
    const args = proposalArgs.parse(JSON.parse(rawArgs));
    const proposal: Proposal = { id: crypto.randomUUID(), kind: args.kind, target_id: args.target_id,
      based_on_version: context.businessVersion, arguments: { reason: args.reason }, status: "pending" };
    return { proposal, output: { proposal, applied: false } };
  }
  if (name === "schedule_followup") {
    const args = scheduleArgs.parse(JSON.parse(rawArgs));
    const task = await createTaskScheduler(context.tasks).schedule({
      business_id: context.businessId, ...args, due_at: args.due_at ?? undefined,
      explicit_time: args.explicit_time ?? undefined, commitment_due_at: args.commitment_due_at ?? undefined,
      now: context.now, schedule_source: "agent",
    });
    await context.tasks.storeContext?.(task.id, { user_message: context.userMessage ?? "", target_id: task.target_id,
      scheduling_reason: task.scheduling_reason, stop_condition: task.stop_condition, decided_due_at: task.due_at });
    return { task, output: task };
  }
  throw new Error("Ferramenta não permitida.");
}

export function validateUserTurn(input: unknown) { return agentTurnInputSchema.parse(input); }
export const DEFAULT_AGENT_NOW = FIXTURE_NOW;
export const taskToolSchema = scheduledTaskSchema;
