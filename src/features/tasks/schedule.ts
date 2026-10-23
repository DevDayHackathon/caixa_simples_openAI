import { z } from "zod";
import { scheduledTaskSchema, type ScheduledTask } from "@/contracts";

export type ScheduleTaskInput = {
  business_id: string;
  target_id: string;
  kind: ScheduledTask["kind"];
  due_at?: string;
  explicit_time?: string;
  commitment_due_at?: string;
  lead_time_minutes?: number | null;
  scheduling_reason: string;
  stop_condition: string;
  schedule_source: ScheduledTask["schedule_source"];
  reminders_enabled?: boolean;
  now: string;
};

export interface TaskRepository {
  saveTask(task: ScheduledTask): Promise<ScheduledTask>;
  getTask(id: string): Promise<ScheduledTask | null>;
  listTasks(businessId: string): Promise<ScheduledTask[]>;
  cancelTask(id: string, expectedVersion: number): Promise<ScheduledTask>;
  claimDueTasks(now: string, limit: number, leaseSeconds: number): Promise<ClaimedOccurrence[]>;
  finishOccurrence(key: string, result: { status: "completed" | "failed" | "pending"; error?: string; eligible_at?: string; expected_attempt?: number }): Promise<void>;
  createNotification(notification: NotificationRecord): Promise<boolean>;
  listNotifications(businessId: string): Promise<NotificationRecord[]>;
  storeContext?(taskId: string, context: Record<string, unknown>): Promise<void>;
  getContext?(taskId: string): Promise<Record<string, unknown> | null>;
}

export type ClaimedOccurrence = { task: ScheduledTask; occurrence_key: string; attempt: number; lease_until: string };
export type NotificationRecord = {
  id: string; business_id: string; occurrence_key: string; target_id: string; kind: string;
  title: string; explanation: string; proposal_ids: string[]; created_at: string; read_at: string | null; expected_attempt?: number;
};

export class TaskConflictError extends Error { readonly code = "TaskConflict"; }
export class TaskUnavailableError extends Error { readonly code = "TaskUnavailable"; }

const interval = z.number().int().min(0).max(365 * 24 * 60);
const instant = (value: string) => Date.parse(value);

export function chooseSchedule(input: ScheduleTaskInput): { due_at: string; lead_time_minutes: number | null } {
  const now = instant(input.now);
  const explicit = input.explicit_time ? instant(input.explicit_time) : null;
  const requested = input.due_at ? instant(input.due_at) : null;
  const commitment = input.commitment_due_at ? instant(input.commitment_due_at) : null;
  if (!Number.isFinite(now) || [explicit, requested, commitment].some((n) => n !== null && !Number.isFinite(n))) throw new Error("Horário inválido.");
  const due = explicit ?? requested ?? (commitment === null ? null : commitment - (input.lead_time_minutes ?? 0) * 60_000);
  if (due === null) throw new Error("Informe ou esclareça o horário do acompanhamento.");
  if (due <= now) throw new Error("O horário precisa estar no futuro.");
  const lead = commitment === null ? input.lead_time_minutes ?? null : Math.max(0, Math.round((commitment - due) / 60_000));
  if (lead !== null) interval.parse(lead);
  return { due_at: new Date(due).toISOString(), lead_time_minutes: lead };
}

export function createTaskScheduler(repository: TaskRepository) {
  return {
    async schedule(input: ScheduleTaskInput): Promise<ScheduledTask> {
      const chosen = chooseSchedule(input);
      if (input.reminders_enabled === false) throw new TaskUnavailableError("Lembretes desativados para esta empresa.");
      const normalizedReason = input.scheduling_reason.trim();
      const normalizedStop = input.stop_condition.trim();
      if (!normalizedReason || !normalizedStop) throw new Error("Motivo e condição de encerramento são obrigatórios.");
      const dedup_key = `${input.business_id}:${input.target_id}:${input.kind}`;
      const task = scheduledTaskSchema.parse({
        id: crypto.randomUUID(), business_id: input.business_id, target_id: input.target_id, kind: input.kind,
        due_at: chosen.due_at, status: "pending", version: 1, dedup_key, stop_condition: normalizedStop,
        timezone: "America/Sao_Paulo", lead_time_minutes: chosen.lead_time_minutes,
        scheduling_reason: normalizedReason, schedule_source: input.explicit_time ? "user" : input.schedule_source,
      });
      return repository.saveTask(task);
    },
    async cancel(id: string, expectedVersion: number) { return repository.cancelTask(id, expectedVersion); },
    async snooze(id: string, expectedVersion: number, explicitTime: string, now: string) {
      const existing = await repository.getTask(id);
      if (!existing || existing.version !== expectedVersion || existing.status !== "pending") throw new TaskConflictError("Tarefa alterada ou encerrada; recarregue o contexto.");
      return this.schedule({ business_id: existing.business_id, target_id: existing.target_id, kind: existing.kind,
        explicit_time: explicitTime, scheduling_reason: "Horário explícito escolhido pelo usuário ao adiar o lembrete.",
        stop_condition: existing.stop_condition, schedule_source: "user", now });
    },
  };
}

export class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, ScheduledTask>();
  private notifications = new Map<string, NotificationRecord>();
  private occurrences = new Map<string, { status: string; eligibleAt: number; leaseUntil: number; attempt: number }>();
  private contexts = new Map<string, Record<string, unknown>>();
  private lock: Promise<void> = Promise.resolve();
  private async exclusive<T>(work: () => T | Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.lock; this.lock = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await work(); } finally { release(); }
  }
  async saveTask(task: ScheduledTask) {
    return this.exclusive(() => {
      const found = [...this.tasks.values()].find((item) => item.dedup_key === task.dedup_key && ["pending", "running"].includes(item.status));
      if (found) {
        if (found.due_at === task.due_at) return structuredClone(found);
        this.tasks.set(found.id, { ...found, status: "cancelled", version: found.version + 1 });
      }
      this.tasks.set(task.id, structuredClone(task)); return structuredClone(task);
    });
  }
  async getTask(id: string) { const task = this.tasks.get(id); return task ? structuredClone(task) : null; }
  async listTasks(businessId: string) { return [...this.tasks.values()].filter((task) => task.business_id === businessId).map((task) => structuredClone(task)); }
  async cancelTask(id: string, expectedVersion: number) {
    return this.exclusive(() => {
      const task = this.tasks.get(id);
      if (!task || task.version !== expectedVersion || !["pending", "running", "failed"].includes(task.status)) throw new TaskConflictError("Tarefa alterada; recarregue o contexto.");
      const next = { ...task, status: "cancelled" as const, version: task.version + 1 }; this.tasks.set(id, next); return structuredClone(next);
    });
  }
  async claimDueTasks(now: string, limit: number, leaseSeconds: number) {
    return this.exclusive(() => {
      const nowMs = instant(now); const claims: ClaimedOccurrence[] = [];
      const candidates = [...this.tasks.values()].filter((task) => ["pending", "running"].includes(task.status) && instant(task.due_at) <= nowMs)
        .sort((a, b) => a.due_at.localeCompare(b.due_at) || a.id.localeCompare(b.id));
      for (const task of candidates) {
        if (claims.length >= Math.min(limit, 5)) break;
        const key = `${task.id}:${task.due_at}`; const run = this.occurrences.get(key);
        if (this.notifications.has(key) || (run && (run.status === "completed" || run.leaseUntil > nowMs || run.eligibleAt > nowMs))) continue;
        const attempt = (run?.attempt ?? 0) + 1; const lease_until = new Date(nowMs + leaseSeconds * 1000).toISOString();
        this.occurrences.set(key, { status: "running", eligibleAt: 0, leaseUntil: instant(lease_until), attempt });
        this.tasks.set(task.id, { ...task, status: "running", version: task.version + 1 });
        claims.push({ task: structuredClone(task), occurrence_key: key, attempt, lease_until });
      }
      return claims;
    });
  }
  async finishOccurrence(key: string, result: { status: "completed" | "failed" | "pending"; error?: string; eligible_at?: string; expected_attempt?: number }) {
    await this.exclusive(() => {
      const occurrence = this.occurrences.get(key); if (!occurrence) throw new TaskConflictError("Ocorrência não adquirida.");
      if(result.expected_attempt!==undefined&&occurrence.attempt!==result.expected_attempt)throw new TaskConflictError("Ocorrência retomada por outra execução.");
      occurrence.status = result.status; occurrence.leaseUntil = 0; occurrence.eligibleAt = result.eligible_at ? instant(result.eligible_at) : 0;
      const taskId = key.slice(0, key.indexOf(":")); const task = this.tasks.get(taskId);
      if (task && task.status !== "cancelled") this.tasks.set(taskId, { ...task, status: result.status === "pending" ? "pending" : result.status, eligible_at: result.eligible_at, version: task.version + 1 });
    });
  }
  async createNotification(notification: NotificationRecord) {
    return this.exclusive(() => {
      if(notification.expected_attempt!==undefined){const run=this.occurrences.get(notification.occurrence_key),task=this.tasks.get(notification.occurrence_key.split(":")[0]);
        if(!run||run.attempt!==notification.expected_attempt||task?.status!=="running")return false;
      }
      if (this.notifications.has(notification.occurrence_key)) return false; this.notifications.set(notification.occurrence_key, structuredClone(notification)); return true; });
  }
  async listNotifications(businessId: string) { return [...this.notifications.values()].filter((item) => item.business_id === businessId).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map((item) => structuredClone(item)); }
  async storeContext(taskId: string, context: Record<string, unknown>) { this.contexts.set(taskId, structuredClone(context)); }
  async getContext(taskId: string) { const context = this.contexts.get(taskId); return context ? structuredClone(context) : null; }
}
