import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations } from "@/contracts";
import { FinanceError, type FinanceState } from "./store";
import { calculateCash } from "./cash";

export function simulate(state: FinanceState, raw: z.input<typeof financeOperations.simulate.input>, asOf = state.business.start_date) {
  const input = financeOperations.simulate.input.parse(raw);
  if (state.version !== input.base_version) throw new FinanceError(409, "CONFLICT", "Cenário baseado em versão antiga.");
  const copy = structuredClone(state), ids = new Set<string>();
  for (const override of input.overrides) {
    if (ids.has(override.transaction_id)) throw new FinanceError(422, "DUPLICATE_OVERRIDE", "Informe uma alteração por compromisso.");
    ids.add(override.transaction_id);
    const tx = copy.transactions.find(item => item.id === override.transaction_id);
    if (!tx) throw new FinanceError(422, "TRANSACTION_NOT_FOUND", "Compromisso não encontrado.");
    if (tx.status !== "pending") throw new FinanceError(409, "CONFLICT", "Só pendências podem ser simuladas.");
    if (override.expected_date && override.expected_date < state.business.start_date) throw new FinanceError(422, "OUTSIDE_HORIZON", "Data anterior ao início da empresa.");
    if (override.expected_date) tx.expected_date = override.expected_date;
    if (override.amount_cents !== undefined) tx.amount_cents = override.amount_cents;
  }
  const baseline = calculateCash(state, asOf), projected = calculateCash(copy, asOf);
  return financeOperations.simulate.output.parse({ scenario_id: randomUUID(), baseline, projected,
    affected_dates: projected.daily_balances.filter((day, index) => day.balance_cents !== baseline.daily_balances[index].balance_cents).map(day => day.date),
    deficit_intervals: projected.negative_intervals });
}
