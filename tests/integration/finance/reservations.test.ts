import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testDatabase } from "./database";
import { f2 } from "@/fixtures/demo";
import { nextState } from "@/features/finance/store";
import { reserveForPayment } from "@/features/finance/reservations";
import { settleTransaction, updateTransaction } from "@/features/finance/transactions";
import { calculateCash } from "@/features/finance/cash";

describe("T7 reservas virtuais", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>;
  beforeEach(async () => { db = await testDatabase(); const before = await db.store.read(), next = nextState(before); next.business = { ...f2.business, id: "demo" }; next.transactions = f2.transactions.map(tx => ({ ...tx, business_id: "demo" })); await db.store.commit(before, next, "seed", {}, {}); });
  afterEach(async () => { await db?.close(); });
  const input = { target_id: "pay-f2", expected_version: 1, amount_cents: 50000, idempotency_key: "reserve-f2" };
  it("F2 reserva 50000 mantendo saldo e projeção", async () => {
    const baseline = calculateCash(await db.store.read(), "2026-10-23");
    expect(await reserveForPayment(db.store, input)).toMatchObject({ reserved_cents: 50000, free_cents: 50000 });
    const result = calculateCash(await db.store.read(), "2026-10-23"); expect(result.current_balance_cents).toBe(100000); expect(result.daily_balances).toEqual(baseline.daily_balances);
  });
  it("mesma chave e nova confirmação equivalente não duplicam reserva", async () => {
    const result = await reserveForPayment(db.store, input);
    expect(await reserveForPayment(db.store, input)).toEqual(result);
    expect(await reserveForPayment(db.store, { ...input, idempotency_key: "again" })).toEqual(result);
    expect((await db.store.read()).reservations).toHaveLength(1);
  });
  it("pagar libera reserva e saldo final é 50000", async () => {
    await reserveForPayment(db.store, input);
    await settleTransaction(db.store, { id: "pay-f2", expected_version: 1, settled_date: "2026-10-27", idempotency_key: "settle" });
    const cash = calculateCash(await db.store.read(), "2026-10-27");
    expect(cash).toMatchObject({ current_balance_cents: 50000, reserved_cents: 0, free_cents: 50000 });
    expect(cash.daily_balances[4].balance_cents).toBe(50000);
  });
  it("excesso de saldo livre informa disponível e não escreve", async () => {
    const before = await db.store.read(), next = nextState(before); next.business.opening_balance_cents = 10000; await db.store.commit(before, next, "balance", {}, {});
    await expect(reserveForPayment(db.store, input)).rejects.toMatchObject({ status: 422, fields: { available_cents: "10000" } });
    expect((await db.store.read()).reservations).toEqual([]);
  });
  it("não reserva mais que devido, nem para recebível ou conta final", async () => {
    await expect(reserveForPayment(db.store, { ...input, amount_cents: 50001 })).rejects.toMatchObject({ status: 422 });
    const before = await db.store.read(), next = nextState(before); next.transactions[0].direction = "in"; await db.store.commit(before, next, "receivable", {}, {});
    await expect(reserveForPayment(db.store, input)).rejects.toMatchObject({ status: 422 });
    await settleTransaction(db.store, { id: input.target_id, expected_version: 1, settled_date: "2026-10-27", idempotency_key: "settle" });
    await expect(reserveForPayment(db.store, input)).rejects.toMatchObject({ status: 409 });
  });
  it("confirmações concorrentes de mesma chave têm um único efeito", async () => {
    const results = await Promise.allSettled([reserveForPayment(db.store, input), reserveForPayment(db.store, input)]);
    expect(results.every(result => result.status === "fulfilled")).toBe(true);
    expect((await db.store.read()).reservations).toHaveLength(1);
  });
  it("mudança do valor da reserva e redução da dívida reservada são conflitos", async () => {
    await reserveForPayment(db.store, input);
    await expect(reserveForPayment(db.store, { ...input, amount_cents: 1, idempotency_key: "other" })).rejects.toMatchObject({ status: 409 });
    await expect(updateTransaction(db.store, { id: input.target_id, expected_version: 1, patch: { amount_cents: 49999 } })).rejects.toMatchObject({ status: 409 });
  });
  it("versão antiga não aprova reserva", async () => {
    await updateTransaction(db.store, { id: input.target_id, expected_version: 1, patch: { description: "Atualizada" } });
    await expect(reserveForPayment(db.store, input)).rejects.toMatchObject({ status: 409 });
  });
});
