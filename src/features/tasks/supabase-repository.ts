import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { scheduledTaskSchema, type ScheduledTask } from "@/contracts";
import type { ClaimedOccurrence, NotificationRecord, TaskRepository } from "./schedule";
import { TaskConflictError } from "./schedule";

type TaskRow = ScheduledTask & { context?: Record<string, unknown> };
type ClaimRow = { task: TaskRow; occurrence_key: string; attempt: number; lease_until: string };

export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly client: SupabaseClient) {}
  async saveTask(task: ScheduledTask) {
    const { data, error } = await this.client.rpc("schedule_agent_task", { p_task: task });
    if (error) throw error;
    return taskFromRow(data as TaskRow);
  }
  async getTask(id: string) {
    const { data, error } = await this.client.from("agent_tasks").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? taskFromRow(data as TaskRow) : null;
  }
  async listTasks(businessId: string) {
    const { data, error } = await this.client.from("agent_tasks").select("*").eq("business_id", businessId);
    if (error) throw error;
    return (data ?? []).map((row) => taskFromRow(row as TaskRow));
  }
  async cancelTask(id: string, expectedVersion: number) {
    const { data, error } = await this.client.rpc("transition_agent_task", { p_task_id: id, p_expected_version: expectedVersion, p_next_status: "cancelled" });
    if (error) { if (error.code === "P0001") throw new TaskConflictError(error.message); throw error; }
    return taskFromRow(data as TaskRow);
  }
  async claimDueTasks(now: string, limit: number, leaseSeconds: number): Promise<ClaimedOccurrence[]> {
    const { data, error } = await this.client.rpc("claim_due_agent_tasks", { p_now: now, p_limit: Math.min(limit, 5), p_lease_seconds: leaseSeconds });
    if (error) throw error;
    return ((data ?? []) as ClaimRow[]).map((row) => ({ ...row, task: taskFromRow(row.task) }));
  }
  async finishOccurrence(key: string, result: { status: "completed" | "failed" | "pending"; error?: string; eligible_at?: string; expected_attempt?: number }) {
    const separator = key.indexOf(":");
    const task_id = key.slice(0, separator); const scheduled_due_at = key.slice(separator + 1);
    const { error } = await this.client.rpc("finish_agent_occurrence", { p_task_id: task_id, p_scheduled_due_at: scheduled_due_at,
      p_status: result.status, p_error: result.error ?? null, p_eligible_at: result.eligible_at ?? null, ...(result.expected_attempt!==undefined?{p_expected_attempt:result.expected_attempt}:{}) });
    if (error) throw error;
  }
  async createNotification(notification: NotificationRecord) {
    if(notification.expected_attempt!==undefined){
      const {expected_attempt,...notice}=notification;
      const {data,error}=await this.client.rpc("create_agent_notification",{p_notice:notice,p_attempt:expected_attempt});if(error)throw error;return data===true;
    }
    const { error, data } = await this.client.from("agent_notifications").insert(notification).select("id").maybeSingle();
    if (error?.code === "23505") return false;
    if (error) throw error;
    return Boolean(data);
  }
  async listNotifications(businessId: string) {
    const { data, error } = await this.client.from("agent_notifications").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return (data ?? []).map(({ business_id: _business, ...notice }) => ({ ...notice, business_id: _business, created_at: new Date(notice.created_at).toISOString(), read_at: notice.read_at ? new Date(notice.read_at).toISOString() : null })) as NotificationRecord[];
  }
  async storeContext(taskId: string, context: Record<string, unknown>) {
    const { error } = await this.client.from("agent_tasks").update({ context }).eq("id", taskId);
    if (error) throw error;
  }
  async getContext(taskId: string) {
    const { data, error } = await this.client.from("agent_tasks").select("context").eq("id", taskId).maybeSingle();
    if (error) throw error;
    return data?.context as Record<string, unknown> | null ?? null;
  }
}

export function createServerTaskRepository() {
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return new SupabaseTaskRepository(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

export function taskFromRow(row: TaskRow) {
  const task = Object.fromEntries(Object.entries(row).filter(([key]) => key in scheduledTaskSchema.shape));
  for (const key of ["due_at", "eligible_at"]) {
    if (task[key] == null) delete task[key];
    else task[key] = new Date(String(task[key])).toISOString();
  }
  return scheduledTaskSchema.parse(task);
}
