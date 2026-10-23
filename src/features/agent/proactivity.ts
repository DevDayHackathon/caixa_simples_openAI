import { proposalSchema, type CashSnapshot, type Notification, type Proposal } from "@/contracts";

export type ProactivityInput = { snapshot: CashSnapshot; now: string; origin: "user" | "task"; existing?: readonly Proposal[] };

export function evaluateProactivity(input: ProactivityInput): { proposals: Proposal[]; notifications: Notification[] } {
  const proposals: Proposal[] = [];
  const negative = input.snapshot.negative_intervals.map((period) => {
    const balances = input.snapshot.daily_balances.filter((day) => day.date >= period.start_date && day.date <= period.end_date);
    const minimum = Math.min(...balances.map((day) => day.balance_cents));
    return { period, minimum };
  }).sort((a, b) => a.period.start_date.localeCompare(b.period.start_date) || a.minimum - b.minimum);
  for (const item of negative) {
    proposals.push(proposalSchema.parse({ id: `cash:${item.period.start_date}:${item.period.end_date}`,
      kind: "simulate", target_id: input.snapshot.business_id, based_on_version: input.snapshot.version,
      arguments: { start_date: item.period.start_date, end_date: item.period.end_date,
        minimum_balance_cents: item.minimum, related_commitments: input.snapshot.uncertain_receivables.map((tx) => tx.id),
        suggested_alternative: "Simular ajuste de previsão ou priorização de caixa" }, status: "pending" }));
  }
  const overdue = input.snapshot.uncertain_receivables.filter((tx) => tx.direction === "in" && tx.status === "pending")
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id));
  for (const tx of overdue) {
    proposals.push(proposalSchema.parse({ id: `collection:${tx.id}:${tx.version}`, kind: "draft_collection", target_id: tx.id,
      based_on_version: input.snapshot.version, arguments: { counterparty: tx.counterparty, amount_cents: tx.amount_cents,
        due_date: tx.due_date, message: `Olá, ${tx.counterparty}. Poderia confirmar a previsão de pagamento de R$ ${(tx.amount_cents / 100).toFixed(2)} referente ao vencimento de ${tx.due_date}?` }, status: "pending" }));
  }
  const existingIds = new Set((input.existing ?? []).map((proposal) => proposal.id));
  const selected = proposals.filter((proposal) => !existingIds.has(proposal.id)).slice(0, 3);
  const notifications: Notification[] = [];
  if (input.origin === "task") {
    for (const proposal of selected) notifications.push({ id: `notification:${proposal.id}`, occurrence_key: "", target_id: proposal.target_id,
      kind: proposal.kind, title: proposal.kind === "draft_collection" ? "Recebível pendente" : "Atenção à previsão de caixa",
      explanation: proposal.kind === "draft_collection" ? "Preparei um rascunho de cobrança para revisar. Nada foi enviado." : "A previsão indica saldo negativo; veja o período e a alternativa simulável.",
      proposal_ids: [proposal.id], created_at: input.now, read_at: null });
  }
  return { proposals: selected, notifications };
}
