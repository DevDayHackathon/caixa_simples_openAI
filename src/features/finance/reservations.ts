import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations, type Reservation } from "@/contracts";
import { FinanceError, nextState, type FinanceStore } from "./store";
import { pendingTransaction } from "./transactions";
import { calculateCash } from "./cash";

export async function reserveForPayment(store: FinanceStore, raw: z.input<typeof financeOperations.reserveForPayment.input>, asOf?: string) {
  const input = financeOperations.reserveForPayment.input.parse(raw);
  const replay = await store.replay("reserve", input.idempotency_key, input);
  if (replay) return financeOperations.reserveForPayment.output.parse(replay);
  const before = await store.read(), next = nextState(before);
  const current = before.transactions.find(tx => tx.id === input.target_id);
  if (current?.version !== input.expected_version || current?.status !== "pending") {
    const raced = await store.replay("reserve", input.idempotency_key, input);
    if (raced) return financeOperations.reserveForPayment.output.parse(raced);
  }
  const tx = pendingTransaction(before, input.target_id, input.expected_version);
  if (tx.direction !== "out") throw new FinanceError(422, "NOT_A_PAYMENT", "Reserva exige uma conta a pagar pendente.");
  const cash = calculateCash(before, asOf ?? before.business.start_date);
  const existing = before.reservations.find(reservation => reservation.transaction_id === tx.id && reservation.status === "active");
  if (existing && existing.amount_cents !== input.amount_cents) throw new FinanceError(409, "CONFLICT", "Já existe reserva ativa com outro valor.");
  if (!existing && (input.amount_cents > cash.free_cents || input.amount_cents > tx.amount_cents)) throw new FinanceError(422, "INSUFFICIENT_FREE_BALANCE", "Reserva excede o saldo livre ou o valor devido.", { available_cents: String(Math.max(0, Math.min(cash.free_cents, tx.amount_cents))) });
  const reservation: Reservation = existing ?? { id: randomUUID(), business_id: "demo", transaction_id: tx.id, amount_cents: input.amount_cents, status: "active", version: 1 };
  if (!existing) next.reservations.push(reservation);
  const after = calculateCash(next, asOf ?? before.business.start_date);
  return financeOperations.reserveForPayment.output.parse(await store.commit(before, next, "reserve", input,
    { reservation, reserved_cents: after.reserved_cents, free_cents: after.free_cents }, input.idempotency_key));
}
