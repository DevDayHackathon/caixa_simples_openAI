import { describe, expect, it, vi } from "vitest";
import { createMockFinancePort } from "@/adapters/mock";
import { InMemoryTaskRepository } from "@/features/tasks/schedule";
import { createAgentTurnService, InMemoryAgentContextStore } from "@/features/agent/turn";

const input = { message: "Qual meu saldo?", origin: "user" as const, request_id: "req-1" };
function response(output_text: string, output: unknown[] = []) { return { output_text, output }; }
function dependencies(create: ReturnType<typeof vi.fn>) {
  return { finance: createMockFinancePort(), tasks: new InMemoryTaskRepository(), contextStore: new InMemoryAgentContextStore(),
    sessionId: "session-123", now: () => new Date("2026-10-23T12:00:00.000Z"), client: { responses: { create } } as never };
}

describe("agent conversation turns", () => {
  it("persists successful user and assistant context and returns a finance snapshot version", async () => {
    const create = vi.fn().mockResolvedValue(response("Seu saldo é o valor do caixa atualizado.", []));
    const deps = dependencies(create); const result = await createAgentTurnService(deps).turn(input);
    expect(result.reply_text).toContain("saldo");
    expect(result.snapshot_version).toBe(1);
    expect(await deps.contextStore.load(deps.sessionId)).toHaveLength(2);
  });

  it("does not persist a turn when the external response fails", async () => {
    const create = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const deps = dependencies(create);
    await expect(createAgentTurnService(deps).turn(input)).rejects.toThrow("provider unavailable");
    expect(await deps.contextStore.load(deps.sessionId)).toEqual([]);
  });

  it("validates the input before making an external call", async () => {
    const create = vi.fn(); const deps = dependencies(create);
    await expect(createAgentTurnService(deps).turn({ ...input, extra: true })).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });

  it("executes an allowed tool with the current turn context and stores one scheduled task", async () => {
    const create = vi.fn().mockResolvedValueOnce({ output_text: "", output: [{ type: "function_call", name: "schedule_followup",
      call_id: "call-1", arguments: JSON.stringify({ target_id: "pay-1", kind: "payment_reminder", due_at: "2026-10-24T12:00:00.000Z",
        explicit_time: null, commitment_due_at: null, lead_time_minutes: null, scheduling_reason: "Pedido do usuário",
        stop_condition: "Quando liquidado" }) }] }).mockResolvedValueOnce(response("Agendei para amanhã."));
    const deps = dependencies(create); const result = await createAgentTurnService(deps).turn(input);
    expect(result.created_task_ids).toHaveLength(1);
    expect((await deps.tasks.listTasks("demo"))).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("uses the tool output in the next model request", async () => {
    const create = vi.fn().mockResolvedValueOnce({ output_text: "", output: [{ type: "function_call", name: "get_cash_snapshot",
      call_id: "cash-1", arguments: JSON.stringify({ as_of: "2026-10-23" }) }] }).mockResolvedValueOnce(response("Saldo consultado."));
    const result = await createAgentTurnService(dependencies(create)).turn(input);
    expect(create.mock.calls[1][0].input).toEqual(expect.arrayContaining([expect.objectContaining({ type: "function_call_output", call_id: "cash-1" })]));
    expect(result.reply_text).toBe("Saldo consultado.");
  });

  it("returns no success when the provider fails after a task tool call", async () => {
    const create = vi.fn().mockResolvedValueOnce({ output_text: "", output: [{ type: "function_call", name: "schedule_followup",
      call_id: "call-1", arguments: JSON.stringify({ target_id: "pay-1", kind: "payment_reminder", due_at: "2026-10-24T12:00:00.000Z",
        explicit_time: null, commitment_due_at: null, lead_time_minutes: null, scheduling_reason: "Pedido do usuário",
        stop_condition: "Quando liquidado" }) }] }).mockRejectedValueOnce(new Error("provider unavailable"));
    const deps = dependencies(create);
    await expect(createAgentTurnService(deps).turn(input)).rejects.toThrow("provider unavailable");
    expect(await deps.tasks.listTasks("demo")).toHaveLength(1);
    expect(await deps.contextStore.load(deps.sessionId)).toEqual([]);
  });

  it("retries a repeated task request without creating a second active schedule", async () => {
    const taskCall = { type: "function_call", name: "schedule_followup", call_id: "call-1", arguments: JSON.stringify({ target_id: "pay-1",
      kind: "payment_reminder", due_at: "2026-10-24T12:00:00.000Z", explicit_time: null, commitment_due_at: null,
      lead_time_minutes: null, scheduling_reason: "Pedido do usuário", stop_condition: "Quando liquidado" }) };
    const create = vi.fn().mockResolvedValueOnce({ output_text: "", output: [taskCall] }).mockResolvedValueOnce(response("Agendado."))
      .mockResolvedValueOnce({ output_text: "", output: [taskCall] }).mockResolvedValueOnce(response("Já está agendado."));
    const deps = dependencies(create); const service = createAgentTurnService(deps);
    await service.turn(input); await service.turn({ ...input, request_id: "req-2" });
    expect((await deps.tasks.listTasks("demo")).filter((task) => task.status === "pending")).toHaveLength(1);
  });
});
