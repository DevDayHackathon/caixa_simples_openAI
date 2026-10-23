import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations, type Transaction } from "@/contracts";
import { FinanceError, nextState, type FinanceState, type FinanceStore } from "./store";
import { addDays } from "./dates";
import { calculateCash } from "./cash";

export function pendingTransaction(state: FinanceState, id: string, version: number): Transaction {
  const tx = state.transactions.find(item => item.id === id);
  if (!tx) throw new FinanceError(422, "TRANSACTION_NOT_FOUND", "Compromisso não encontrado.");
  if (tx.version !== version || tx.status !== "pending") throw new FinanceError(409, "CONFLICT", "Versão antiga ou compromisso já encerrado.", { version: String(tx.version) });
  return tx;
}
function inHorizon(state: FinanceState, date: string) {
  if (date < state.business.start_date || date > addDays(state.business.start_date, 29)) throw new FinanceError(422, "OUTSIDE_HORIZON", "Data fora do horizonte da empresa.");
}
export async function createTransaction(store: FinanceStore, raw: z.input<typeof financeOperations.createTransaction.input>) {
  const input = financeOperations.createTransaction.input.parse(raw);
  if (input.transaction.business_id !== "demo") throw new FinanceError(403, "FORBIDDEN", "Empresa fora do escopo.");
  const replay = await store.replay("create", input.idempotency_key, input);
  if (replay) return financeOperations.createTransaction.output.parse(replay);
  const before = await store.read(), next = nextState(before);
  inHorizon(before, input.transaction.due_date); inHorizon(before, input.transaction.expected_date);
  const transaction: Transaction = { ...input.transaction, id: randomUUID(), version: 1, source: "user", status: "pending", settled_date: null, updated_at: next.updated_at };
  next.transactions.push(transaction);
  calculateCash(next, next.business.start_date);
  return financeOperations.createTransaction.output.parse(await store.commit(before, next, "create", input, { transaction, business_version: next.version }, input.idempotency_key));
}

export async function updateTransaction(store: FinanceStore, raw: z.input<typeof financeOperations.updateTransaction.input>) {
  const input = financeOperations.updateTransaction.input.parse(raw);
  const before = await store.read(), next = nextState(before);
  const current = pendingTransaction(before, input.id, input.expected_version);
  if (input.patch.expected_date && input.patch.expected_date < before.business.start_date) throw new FinanceError(422, "OUTSIDE_HORIZON", "Previsão anterior ao início da empresa.");
  // A postponed date may exceed the fixed horizon; it does not move that horizon.
  const active = before.reservations.find(r => r.transaction_id === current.id && r.status === "active");
  if (active && input.patch.amount_cents !== undefined && input.patch.amount_cents < active.amount_cents) throw new FinanceError(409, "CONFLICT", "O valor devido não pode ser menor que a reserva ativa.");
  const transaction = { ...current, ...input.patch, version: current.version + 1, updated_at: next.updated_at };
  next.transactions = next.transactions.map(tx => tx.id === current.id ? transaction : tx);
  calculateCash(next, next.business.start_date);
  return financeOperations.updateTransaction.output.parse(await store.commit(before, next, "update", input, { transaction, business_version: next.version }));
}

async function finish(store: FinanceStore, input: z.infer<typeof financeOperations.settleTransaction.input>, status: "settled" | "cancelled") {
  const operation = status === "settled" ? "settle" : "cancel";
  const replay = await store.replay(operation, input.idempotency_key, input);
  if (replay) return financeOperations.settleTransaction.output.parse(replay);
  const before = await store.read(), next = nextState(before);
  const current = before.transactions.find(tx => tx.id === input.id);
  if (current?.version !== input.expected_version || current?.status !== "pending") {
    const raced = await store.replay(operation, input.idempotency_key, input);
    if (raced) return financeOperations.settleTransaction.output.parse(raced);
  }
  const pending = pendingTransaction(before, input.id, input.expected_version);
  inHorizon(before, input.settled_date);
  const transaction: Transaction = { ...pending, status, settled_date: status === "settled" ? input.settled_date : null, version: pending.version + 1, updated_at: next.updated_at };
  next.transactions = next.transactions.map(tx => tx.id === pending.id ? transaction : tx);
  next.reservations = next.reservations.map(reservation => reservation.transaction_id === pending.id && reservation.status === "active" ? { ...reservation, status: "released", version: reservation.version + 1 } : reservation);
  calculateCash(next, next.business.start_date);
  return financeOperations.settleTransaction.output.parse(await store.commit(before, next, operation, input, { transaction, business_version: next.version }, input.idempotency_key));
}
export async function settleTransaction(store: FinanceStore, raw: z.input<typeof financeOperations.settleTransaction.input>) {
  return finish(store, financeOperations.settleTransaction.input.parse(raw), "settled");
}
// Internal domain operation, deliberately absent from the public v1 patch/HTTP contract.
export async function cancelTransaction(store: FinanceStore, raw: z.input<typeof financeOperations.settleTransaction.input>) {
  return finish(store, financeOperations.settleTransaction.input.parse(raw), "cancelled");
}
