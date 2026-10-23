import { cashSnapshotSchema, dateSchema } from "@/contracts";
import { FinanceError, financeStateSchema, type FinanceState } from "./store";
import { addDays } from "./dates";

export function safeCents(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) throw new FinanceError(422, "AMOUNT_OVERFLOW", "Total excede o limite de centavos inteiros seguros.");
  return Number(value);
}

export function calculateCash(raw: FinanceState, asOf: string) {
  const state = financeStateSchema.parse(raw); dateSchema.parse(asOf);
  const start = state.business.start_date, end = addDays(start, 29);
  if (asOf < start || asOf > end) throw new FinanceError(422, "OUTSIDE_HORIZON", "Consulta fora do horizonte fixo de 30 dias.");
  if (state.transactions.some(tx => tx.business_id !== state.business.id) || state.reservations.some(r => r.business_id !== state.business.id)) throw new FinanceError(403, "FORBIDDEN", "Registros de outra empresa.");
  const settled = state.transactions.filter(tx => tx.status === "settled");
  const realized = (direction: "in" | "out", date: string) => settled.filter(tx => tx.direction === direction && tx.settled_date! >= start && tx.settled_date! <= date).reduce((sum, tx) => sum + BigInt(tx.amount_cents), 0n);
  const currentIn = realized("in", asOf), currentOut = realized("out", asOf);
  const current = BigInt(state.business.opening_balance_cents) + currentIn - currentOut;
  const reserved = state.reservations.filter(r => r.status === "active").reduce((sum, r) => sum + BigInt(r.amount_cents), 0n);
  const uncertain = state.transactions.filter(tx => tx.status === "pending" && tx.direction === "in" && (!tx.expected_date || tx.expected_date < asOf));
  const pending = state.transactions.filter(tx => tx.status === "pending" && !uncertain.some(item => item.id === tx.id));
  const daily_balances = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(start, index);
    let balance = BigInt(state.business.opening_balance_cents) + realized("in", date) - realized("out", date);
    if (date >= asOf) for (const tx of pending) {
      const effective = !tx.expected_date || tx.expected_date < asOf ? asOf : tx.expected_date;
      if (effective <= date) balance += (tx.direction === "in" ? 1n : -1n) * BigInt(tx.amount_cents);
    }
    return { date, balance_cents: safeCents(balance) };
  });
  const negative_intervals: { start_date: string; end_date: string }[] = [];
  for (const day of daily_balances) {
    if (day.balance_cents >= 0) continue;
    const last = negative_intervals.at(-1);
    if (last && addDays(last.end_date, 1) === day.date) last.end_date = day.date;
    else negative_intervals.push({ start_date: day.date, end_date: day.date });
  }
  return cashSnapshotSchema.parse({ business_id: state.business.id, as_of: asOf,
    current_balance_cents: safeCents(current), realized_in_cents: safeCents(currentIn), realized_out_cents: safeCents(currentOut),
    reserved_cents: safeCents(reserved), free_cents: safeCents(current - reserved), daily_balances,
    minimum_balance_cents: Math.min(...daily_balances.map(day => day.balance_cents)), first_negative_date: negative_intervals[0]?.start_date ?? null,
    negative_intervals, uncertain_receivables: uncertain, source: "user_data", updated_at: state.updated_at, version: state.version });
}
