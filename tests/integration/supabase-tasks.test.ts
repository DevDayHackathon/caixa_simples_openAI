import { describe, expect, it, vi } from "vitest";
import { reminderFixture } from "@/fixtures/demo";
import { SupabaseTaskRepository } from "@/features/tasks/supabase-repository";

function repository(rpc: ReturnType<typeof vi.fn> = vi.fn()) {
  const client = { rpc, from: vi.fn() } as never;
  return { repo: new SupabaseTaskRepository(client), rpc, client };
}

describe("Supabase task persistence adapter", () => {
  it("persists schedule fields through the atomic scheduling RPC", async () => {
    const { repo, rpc } = repository(vi.fn().mockResolvedValue({ data: reminderFixture, error: null }));
    expect(await repo.saveTask(reminderFixture)).toMatchObject({ id: reminderFixture.id, due_at: reminderFixture.due_at });
    expect(rpc).toHaveBeenCalledWith("schedule_agent_task", { p_task: reminderFixture });
  });

  it("propagates persistence failures instead of returning a fabricated task", async () => {
    const { repo } = repository(vi.fn().mockResolvedValue({ data: null, error: new Error("database unavailable") }));
    await expect(repo.saveTask(reminderFixture)).rejects.toThrow("database unavailable");
  });

  it("passes due-time claims through the atomic claim RPC with a five-task cap", async () => {
    const { repo, rpc } = repository(vi.fn().mockResolvedValue({ data: [], error: null }));
    expect(await repo.claimDueTasks("2026-10-29T18:00:00.000Z", 20, 120)).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("claim_due_agent_tasks", { p_now: "2026-10-29T18:00:00.000Z", p_limit: 5, p_lease_seconds: 120 });
  });

  it("finishes only the claimed occurrence identified by task and due instant", async () => {
    const { repo, rpc } = repository(vi.fn().mockResolvedValue({ data: null, error: null }));
    await repo.finishOccurrence(`${reminderFixture.id}:${reminderFixture.due_at}`, { status: "completed" });
    expect(rpc).toHaveBeenCalledWith("finish_agent_occurrence", expect.objectContaining({ p_task_id: reminderFixture.id,
      p_scheduled_due_at: reminderFixture.due_at, p_status: "completed" }));
  });

  it("resolves duplicate task notification writes through the unique-key conflict", async () => {
    const client = { rpc: vi.fn(), from: vi.fn(() => ({ insert: () => ({ select: () => ({ maybeSingle: async () => ({ data: null,
      error: { code: "23505" } }) }) }) })) } as never;
    const repo = new SupabaseTaskRepository(client);
    expect(await repo.createNotification({ id: "notice", business_id: "demo", occurrence_key: "task:time", target_id: "pay-1",
      kind: "payment_reminder", title: "Lembrete", explanation: "interno", proposal_ids: [], created_at: "2026-10-29T18:00:00.000Z", read_at: null })).toBe(false);
  });

  it("persists context needed to resume an agent-created task", async () => {
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    const select = vi.fn(() => ({ eq: () => ({ maybeSingle: async () => ({ data: { context: { user_message: "me lembre", stop_condition: "pago" } }, error: null }) }) }));
    const client = { rpc: vi.fn(), from: vi.fn(() => ({ update, select })) } as never;
    const repo = new SupabaseTaskRepository(client);
    await repo.storeContext(reminderFixture.id, { user_message: "me lembre", stop_condition: "pago" });
    expect(update).toHaveBeenCalledWith({ context: { user_message: "me lembre", stop_condition: "pago" } });
    expect(await repo.getContext(reminderFixture.id)).toEqual({ user_message: "me lembre", stop_condition: "pago" });
  });
});
