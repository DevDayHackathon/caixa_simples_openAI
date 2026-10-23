import { describe, expect, it, vi } from "vitest";
import { scheduledTaskSchema } from "@/contracts";
import { f1Snapshot } from "@/fixtures/demo";
import { InMemoryTaskRepository } from "./schedule";
import { runDueTasks } from "./runner";

const now = new Date("2026-10-26T12:00:00.000Z");
function task(due_at: string, id = "task-1") { return scheduledTaskSchema.parse({ id, business_id: "demo", target_id: id, kind: "payment_reminder",
  due_at, status: "pending", version: 1, dedup_key: `demo:${id}:payment_reminder`, stop_condition: "liquidado", timezone: "America/Sao_Paulo",
  lead_time_minutes: 60, scheduling_reason: "Lembrar antes do vencimento", schedule_source: "agent" }); }

describe("due task runner", () => {
  it("does no work when the queue is empty or tasks are future-dated", async () => {
    for (const due of [null, "2026-10-27T12:00:00.000Z"]) {
      const repo = new InMemoryTaskRepository(); if (due) await repo.saveTask(task(due));
      const read = vi.fn();
      expect(await runDueTasks({ repository: repo, readCommitment: read, now: () => now })).toMatchObject({ claimed: 0, notified: 0 });
      expect(read).not.toHaveBeenCalled();
      expect(await repo.listNotifications("demo")).toHaveLength(0);
    }
  });

  it("acquires and notifies one due occurrence only once, without OpenAI", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const readCommitment = vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot });
    const first = await runDueTasks({ repository: repo, readCommitment, now: () => now });
    const second = await runDueTasks({ repository: repo, readCommitment, now: () => now });
    expect(first).toMatchObject({ claimed: 1, completed: 1, notified: 1 });
    expect(second.claimed).toBe(0);
    expect(readCommitment).toHaveBeenCalledTimes(2);
    expect(await repo.listNotifications("demo")).toHaveLength(1);
  });

  it("rechecks the commitment and suppresses notification after settlement", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const readCommitment = vi.fn().mockResolvedValueOnce({ status: "pending", snapshot: f1Snapshot })
      .mockResolvedValueOnce({ status: "settled", snapshot: f1Snapshot });
    expect(await runDueTasks({ repository: repo, readCommitment, now: () => now })).toMatchObject({ completed: 1, notified: 0 });
    expect(await repo.listNotifications("demo")).toHaveLength(0);
  });

  it("recovers after a retry delay and remains idempotent under concurrent ticks", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const failing = await runDueTasks({ repository: repo, readCommitment: vi.fn().mockRejectedValue(new Error("temporarily unavailable")), now: () => now });
    expect(failing).toMatchObject({ claimed: 1, failed: 1, notified: 0 });
    const early = await runDueTasks({ repository: repo, readCommitment: vi.fn(), now: () => now });
    expect(early.claimed).toBe(0);
    const retryTime = new Date(now.getTime() + 60_000);
    const reader = vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot });
    const results = await Promise.all([runDueTasks({ repository: repo, readCommitment: reader, now: () => retryTime }),
      runDueTasks({ repository: repo, readCommitment: reader, now: () => retryTime })]);
    expect(results.reduce((total, result) => total + result.notified, 0)).toBe(1);
    expect(await repo.listNotifications("demo")).toHaveLength(1);
  });

  it("caps every tick at five claimed occurrences", async () => {
    const repo = new InMemoryTaskRepository();
    for (let i = 1; i <= 7; i++) await repo.saveTask(task("2026-10-26T11:00:00.000Z", `task-${i}`));
    const result = await runDueTasks({ repository: repo, readCommitment: vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot }), now: () => now });
    expect(result.claimed).toBe(5);
    expect(result.completed).toBe(5);
    expect(result.remaining_due).toBe(2);
  });

  it("honors the 30-second execution budget and defers unprocessed claims", async () => {
    const repo = new InMemoryTaskRepository();
    for (let i = 1; i <= 2; i++) await repo.saveTask(task("2026-10-26T11:00:00.000Z", `budget-${i}`));
    const result = await runDueTasks({ repository: repo, readCommitment: vi.fn(), now: () => now, budgetMs: 0 });
    expect(result).toMatchObject({ claimed: 2, failed: 2, completed: 0, notified: 0 });
    expect((await repo.listTasks("demo")).every((entry) => entry.status === "pending" && entry.eligible_at === "2026-10-26T12:01:00.000Z")).toBe(true);
  });

  it("finishes an already resolved commitment without writing a notification", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const read = vi.fn().mockResolvedValue({ status: "cancelled", snapshot: f1Snapshot });
    const result = await runDueTasks({ repository: repo, readCommitment: read, now: () => now });
    expect(result).toMatchObject({ completed: 1, notified: 0 });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("stops retrying after four failed attempts", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const failure = vi.fn().mockRejectedValue(new Error("offline"));
    let current = now;
    for (const delay of [60_000, 300_000, 900_000]) {
      await runDueTasks({ repository: repo, readCommitment: failure, now: () => current });
      current = new Date(current.getTime() + delay);
    }
    const last = await runDueTasks({ repository: repo, readCommitment: failure, now: () => current });
    expect(last.failed).toBe(1);
    expect((await repo.listTasks("demo"))[0].status).toBe("failed");
    expect(failure).toHaveBeenCalledTimes(4);
  });

  it("recovers an occurrence after its lease expires", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    expect(await repo.claimDueTasks(now.toISOString(), 5, 120)).toHaveLength(1);
    const later = new Date(now.getTime() + 121_000);
    const result = await runDueTasks({ repository: repo, readCommitment: vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot }), now: () => later });
    expect(result).toMatchObject({ claimed: 1, completed: 1, notified: 1 });
  });

  it("does not create a duplicate notification for the same occurrence", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const [claim] = await repo.claimDueTasks(now.toISOString(), 5, 120);
    const notice = { id: "notice-1", business_id: "demo", occurrence_key: claim.occurrence_key, target_id: "pay-1", kind: "payment_reminder",
      title: "Lembrete", explanation: "interno", proposal_ids: [], created_at: now.toISOString(), read_at: null };
    expect(await repo.createNotification(notice)).toBe(true);
    expect(await repo.createNotification({ ...notice, id: "notice-2" })).toBe(false);
  });

  it("keeps a live lease exclusive between concurrent claimers", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const first = await repo.claimDueTasks(now.toISOString(), 5, 120);
    const concurrent = await repo.claimDueTasks(now.toISOString(), 5, 120);
    expect(first).toHaveLength(1);
    expect(concurrent).toEqual([]);
  });

  it("retries a failed notification write instead of marking the occurrence complete", async () => {
    const repo = new InMemoryTaskRepository(); await repo.saveTask(task("2026-10-26T11:00:00.000Z"));
    const create = repo.createNotification.bind(repo); const write = vi.spyOn(repo, "createNotification").mockRejectedValueOnce(new Error("write failed"));
    const failed = await runDueTasks({ repository: repo, readCommitment: vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot }), now: () => now });
    expect(failed).toMatchObject({ failed: 1, notified: 0 });
    write.mockImplementation(create);
    const retryTime = new Date(now.getTime() + 60_000);
    const retried = await runDueTasks({ repository: repo, readCommitment: vi.fn().mockResolvedValue({ status: "pending", snapshot: f1Snapshot }), now: () => retryTime });
    expect(retried).toMatchObject({ completed: 1, notified: 1 });
  });
});
