import type { CashSnapshot } from "@/contracts";
import { evaluateProactivity } from "@/features/agent/proactivity";
import type { ClaimedOccurrence, NotificationRecord, TaskRepository } from "./schedule";

export type CommitmentState = { status: "pending" | "settled" | "cancelled"; snapshot: CashSnapshot };
export type CommitmentReader = (businessId: string, targetId: string) => Promise<CommitmentState>;
export type RunnerOptions = { repository: TaskRepository; readCommitment: CommitmentReader; now?: () => Date; budgetMs?: number };
export type RunnerResult = { claimed: number; completed: number; notified: number; failed: number; remaining_due: number };

const RETRY_SECONDS = [60, 300, 900] as const;
const MAX_ATTEMPTS = 4;
const MAX_BATCH = 5;
const LEASE_SECONDS = 120;

export async function runDueTasks(options: RunnerOptions): Promise<RunnerResult> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().getTime();
  const limitMs = Math.min(options.budgetMs ?? 30_000, 30_000);
  const initialNow = new Date(startedAt).toISOString();
  const claims = await options.repository.claimDueTasks(initialNow, MAX_BATCH, LEASE_SECONDS);
  let completed = 0, notified = 0, failed = 0;
  for (const claim of claims) {
    if (clock().getTime() - startedAt >= limitMs) {
      await retry(options.repository, claim, "Lote interrompido pelo limite de 30 segundos", clock); failed++;
      continue;
    }
    try {
      const firstCheck = await options.readCommitment(claim.task.business_id, claim.task.target_id);
      if (firstCheck.status !== "pending") {
        await options.repository.finishOccurrence(claim.occurrence_key, { status: "completed" }); completed++; continue;
      }
      const initiatives = evaluateProactivity({ snapshot: firstCheck.snapshot, now: clock().toISOString(), origin: "task" });
      // Check again immediately before writing; settlement during evaluation cancels the reminder.
      const latest = await options.readCommitment(claim.task.business_id, claim.task.target_id);
      if (latest.status !== "pending") {
        await options.repository.finishOccurrence(claim.occurrence_key, { status: "completed" }); completed++; continue;
      }
      const generated = initiatives.proposals.filter((proposal) => proposal.target_id === claim.task.target_id);
      const notice: NotificationRecord = {
        id: crypto.randomUUID(), business_id: claim.task.business_id, occurrence_key: claim.occurrence_key,
        target_id: claim.task.target_id, kind: claim.task.kind,
        title: claim.task.kind === "payment_reminder" ? "Lembrete de compromisso" : "Acompanhamento do caixa",
        explanation: renderRuleDraft(claim, latest, generated[0]), proposal_ids: generated.map((proposal) => proposal.id),
        created_at: clock().toISOString(), read_at: null,
      };
      const inserted = await options.repository.createNotification(notice);
      await options.repository.finishOccurrence(claim.occurrence_key, { status: "completed" });
      completed++; if (inserted) notified++;
    } catch (error) {
      await retry(options.repository, claim, error instanceof Error ? error.message : "Falha ao executar tarefa", clock); failed++;
    }
  }
  const now = clock().toISOString();
  const tasks = await options.repository.listTasks(claims[0]?.task.business_id ?? "demo");
  const remaining_due = tasks.filter((task) => ["pending", "running"].includes(task.status) && Date.parse(task.due_at) <= Date.parse(now)
    && (!task.eligible_at || Date.parse(task.eligible_at) <= Date.parse(now))).length;
  return { claimed: claims.length, completed, notified, failed, remaining_due };
}

async function retry(repository: TaskRepository, claim: ClaimedOccurrence, _error: string, clock: () => Date) {
  if (claim.attempt >= MAX_ATTEMPTS) {
    await repository.finishOccurrence(claim.occurrence_key, { status: "failed" }); return;
  }
  const delay = RETRY_SECONDS[Math.min(claim.attempt - 1, RETRY_SECONDS.length - 1)];
  await repository.finishOccurrence(claim.occurrence_key, { status: "pending", eligible_at: new Date(clock().getTime() + delay * 1000).toISOString() });
}

function renderRuleDraft(claim: ClaimedOccurrence, state: CommitmentState, proposal?: { arguments: Record<string, unknown> }) {
  const context = { cash_balance_cents: state.snapshot.current_balance_cents, due_at: claim.task.due_at,
    scheduling_reason: claim.task.scheduling_reason, stop_condition: claim.task.stop_condition,
    proposal: proposal?.arguments ?? null };
  return `Acompanhamento interno para ${claim.task.target_id}. ${claim.task.scheduling_reason} Contexto verificado: ${JSON.stringify(context)}. Nenhuma cobrança externa ou transferência foi realizada.`;
}
