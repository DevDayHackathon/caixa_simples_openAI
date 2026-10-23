import { describe, expect, it } from "vitest";
import { createTaskScheduler, InMemoryTaskRepository, chooseSchedule } from "./schedule";

const now = "2026-10-23T12:00:00.000Z";
const base = { business_id: "demo", target_id: "pay-1", kind: "payment_reminder" as const,
  scheduling_reason: "Avisar antes do vencimento", stop_condition: "Compromisso liquidado", schedule_source: "agent" as const, now };

describe("task scheduling", () => {
  it("uses explicit user time over agent time and commitment lead time", () => {
    expect(chooseSchedule({ ...base, due_at: "2026-10-24T12:00:00.000Z", explicit_time: "2026-10-25T10:00:00.000Z",
      commitment_due_at: "2026-10-26T12:00:00.000Z", lead_time_minutes: 60 })).toEqual({
      due_at: "2026-10-25T10:00:00.000Z", lead_time_minutes: 1560,
    });
  });

  it("rejects a missing or past time rather than guessing", () => {
    expect(() => chooseSchedule(base)).toThrow("Informe ou esclareça o horário do acompanhamento.");
    expect(() => chooseSchedule({ ...base, explicit_time: "2026-10-23T11:59:00.000Z" })).toThrow("O horário precisa estar no futuro.");
  });

  it("calculates due time from the commitment and requested lead", () => {
    expect(chooseSchedule({ ...base, commitment_due_at: "2026-10-26T12:00:00.000Z", lead_time_minutes: 1440 })).toEqual({
      due_at: "2026-10-25T12:00:00.000Z", lead_time_minutes: 1440,
    });
  });

  it("stores reason and stop condition, deduplicates, and persists resumable context", async () => {
    const repo = new InMemoryTaskRepository(); const scheduler = createTaskScheduler(repo);
    const task = await scheduler.schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z" });
    await repo.storeContext!(task.id, { user_message: "Me lembre amanhã", decided_due_at: task.due_at });
    const same = await scheduler.schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z" });
    expect(same.id).toBe(task.id);
    expect(await repo.getContext(task.id)).toEqual({ user_message: "Me lembre amanhã", decided_due_at: task.due_at });
  });

  it("marks explicit user time as the scheduling source", async () => {
    const task = await createTaskScheduler(new InMemoryTaskRepository()).schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z" });
    expect(task.schedule_source).toBe("user");
  });

  it("replaces a changed active due time without leaving two eligible reminders", async () => {
    const repo = new InMemoryTaskRepository(); const scheduler = createTaskScheduler(repo);
    const first = await scheduler.schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z" });
    const next = await scheduler.schedule({ ...base, explicit_time: "2026-10-25T12:00:00.000Z" });
    expect((await repo.listTasks("demo")).filter((task) => task.status === "pending")).toHaveLength(1);
    expect((await repo.getTask(first.id))?.status).toBe("cancelled");
    expect(next.due_at).toBe("2026-10-25T12:00:00.000Z");
  });

  it("rejects creation when reminders are disabled", async () => {
    await expect(createTaskScheduler(new InMemoryTaskRepository()).schedule({ ...base,
      explicit_time: "2026-10-24T12:00:00.000Z", reminders_enabled: false })).rejects.toThrow("Lembretes desativados");
  });

  it("requires a reason and a stop condition", async () => {
    await expect(createTaskScheduler(new InMemoryTaskRepository()).schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z", scheduling_reason: " " })).rejects.toThrow("Motivo e condição");
  });

  it("cancels with the expected version and rejects stale cancellation", async () => {
    const repo = new InMemoryTaskRepository(); const scheduler = createTaskScheduler(repo);
    const task = await scheduler.schedule({ ...base, explicit_time: "2026-10-24T12:00:00.000Z" });
    expect((await scheduler.cancel(task.id, task.version)).status).toBe("cancelled");
    await expect(scheduler.cancel(task.id, task.version)).rejects.toThrow("Tarefa alterada");
  });
});
