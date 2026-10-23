import { describe, expect, it, vi } from "vitest";
import { createMockFinancePort } from "@/adapters/mock";
import { f1Snapshot } from "@/fixtures/demo";
import { InMemoryTaskRepository } from "@/features/tasks/schedule";
import { executeAgentTool, agentToolDefinitions } from "./tools";

const base = { businessId: "demo", now: "2026-10-23T12:00:00.000Z", finance: createMockFinancePort(),
  tasks: new InMemoryTaskRepository(), businessVersion: 1 };

describe("agent tool catalog", () => {
  it("exposes only read, reviewable proposal, and internal scheduling tools", () => {
    expect(agentToolDefinitions.map((tool) => tool.name)).toEqual(["get_cash_snapshot", "prepare_proposal", "schedule_followup"]);
  });

  it("rejects malformed and extra arguments before any scheduling mutation", async () => {
    const saveTask = vi.spyOn(base.tasks, "saveTask");
    await expect(executeAgentTool("schedule_followup", JSON.stringify({ target_id: "x", kind: "cash_review",
      due_at: "2026-10-24T12:00:00.000Z", scheduling_reason: "x", stop_condition: "x", transfer: true }), base)).rejects.toThrow();
    expect(saveTask).not.toHaveBeenCalled();
  });

  it("creates a proposal for review without applying it", async () => {
    const result = await executeAgentTool("prepare_proposal", JSON.stringify({ kind: "draft_collection", target_id: "rec-1", reason: "Atraso" }), base);
    expect(result.output).toMatchObject({ applied: false });
    expect(result.proposal?.status).toBe("pending");
  });

  it("rejects an unlisted external action", async () => {
    await expect(executeAgentTool("send_collection", "{}", base)).rejects.toThrow("Ferramenta não permitida.");
  });

  it("rejects malformed JSON before it can reach any port", async () => {
    const snapshot = vi.spyOn(base.finance, "getCashSnapshot");
    await expect(executeAgentTool("get_cash_snapshot", "{", base)).rejects.toThrow();
    expect(snapshot).not.toHaveBeenCalled();
  });

  it("asks for a time instead of guessing when the requested schedule is ambiguous", async () => {
    const saveTask = vi.spyOn(base.tasks, "saveTask");
    await expect(executeAgentTool("schedule_followup", JSON.stringify({ target_id: "pay-1", kind: "payment_reminder",
      due_at: null, explicit_time: null, commitment_due_at: null, lead_time_minutes: null,
      scheduling_reason: "pedido", stop_condition: "liquidado" }), base)).rejects.toThrow("Informe ou esclareça o horário");
    expect(saveTask).not.toHaveBeenCalled();
  });

  it("preserves an explicit São Paulo offset as UTC and records the user's scheduling source", async () => {
    const tasks = new InMemoryTaskRepository();
    const result = await executeAgentTool("schedule_followup", JSON.stringify({ target_id: "pay-1", kind: "payment_reminder",
      due_at: "2026-10-23T16:26:00-03:00", explicit_time: "2026-10-23T16:26:00-03:00",
      commitment_due_at: "2026-10-27T16:26:00-03:00", lead_time_minutes: null,
      scheduling_reason: "Horário escolhido pelo usuário", stop_condition: "Compromisso liquidado" }), { ...base, tasks });
    expect(result.task?.due_at).toBe("2026-10-23T19:26:00.000Z");
    expect(result.task?.schedule_source).toBe("user");
    expect(await tasks.listTasks("demo")).toEqual([result.task]);
  });

  it.each(["due_at", "explicit_time", "commitment_due_at"].flatMap(field => ["2026-10-27", "16:26"].map(value => [field, value])))("rejects incomplete %s value %s before writing a task", async (field, value) => {
    const tasks = new InMemoryTaskRepository();
    await expect(executeAgentTool("schedule_followup", JSON.stringify({ target_id: "pay-1", kind: "payment_reminder",
      due_at: null, explicit_time: "2026-10-23T16:26:00-03:00", commitment_due_at: null,
      lead_time_minutes: null, scheduling_reason: "pedido", stop_condition: "liquidado",
      [field]: value }), { ...base, tasks })).rejects.toThrow();
    expect(await tasks.listTasks("demo")).toEqual([]);
  });

  it("uses the finance port as the sole source of the requested cash snapshot", async () => {
    const snapshot = vi.spyOn(base.finance, "getCashSnapshot");
    snapshot.mockResolvedValue({ ...f1Snapshot, as_of: "2026-10-24" });
    const result = await executeAgentTool("get_cash_snapshot", JSON.stringify({ as_of: "2026-10-24" }), base);
    expect(snapshot).toHaveBeenCalledWith({ business_id: "demo", as_of: "2026-10-24" });
    expect(result.output).toMatchObject({ business_id: "demo", as_of: "2026-10-24" });
  });
});
