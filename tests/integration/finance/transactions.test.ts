import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testDatabase } from "./database";
import { f1 } from "@/fixtures/demo";
import { nextState } from "@/features/finance/store";
import { createTransaction, updateTransaction, settleTransaction, cancelTransaction } from "@/features/finance/transactions";
import { calculateCash } from "@/features/finance/cash";

describe("T5 compromissos versionados", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>;
  beforeEach(async () => { db = await testDatabase(); const before = await db.store.read(), next = nextState(before); next.business = f1.business; next.transactions = f1.transactions; await db.store.commit(before, next, "seed", {}, {}); });
  afterEach(async () => { await db?.close(); });
  const settle = { id: "pay-1", expected_version: 1, settled_date: "2026-10-27", idempotency_key: "pay" };
  it("cria conta e retorna a mesma conta no retry", async () => {
    const input = { transaction: { business_id: "demo", direction: "out" as const, amount_cents: 10, due_date: "2026-10-24", expected_date: "2026-10-24", counterparty: "Fornecedor", description: "Conta" }, idempotency_key: "create" };
    expect(await createTransaction(db.store, input)).toEqual(await createTransaction(db.store, input));
    expect((await db.store.read()).transactions).toHaveLength(3);
    await expect(createTransaction(db.store, { ...input, transaction: { ...input.transaction, business_id: "other" } })).rejects.toMatchObject({ status: 403 });
  });
  it("atualiza previsão preservando vencimento e histórico", async () => {
    const result = await updateTransaction(db.store, { id: "rec-1", expected_version: 1, patch: { expected_date: "2026-11-01" } });
    expect(result.transaction).toMatchObject({ due_date: "2026-10-25", expected_date: "2026-11-01", version: 2, status: "pending" });
    expect(Number(await db.sql("select count(*) from finance_history;"))).toBe(2);
  });
  it("duas atualizações da mesma versão não se sobrescrevem", async () => {
    const results = await Promise.allSettled([10, 20].map(amount_cents => updateTransaction(db.store, { id: "pay-1", expected_version: 1, patch: { amount_cents } })));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
  });
  it("liquida uma única vez e não conta a previsão novamente", async () => {
    const result = await settleTransaction(db.store, settle);
    expect(await settleTransaction(db.store, settle)).toEqual(result);
    const cash = calculateCash(await db.store.read(), "2026-10-27");
    expect(cash.current_balance_cents).toBe(-50000); expect(cash.realized_out_cents).toBe(150000); expect(cash.daily_balances[4].balance_cents).toBe(-50000);
    expect(Number(await db.sql("select count(*) from finance_resolutions;"))).toBe(1);
  });
  it("finais não voltam a pending, não são editados nem liquidados por outra chave", async () => {
    await settleTransaction(db.store, settle);
    await expect(updateTransaction(db.store, { id: "pay-1", expected_version: 2, patch: { amount_cents: 1 } })).rejects.toMatchObject({ status: 409 });
    await expect(settleTransaction(db.store, { ...settle, expected_version: 2, idempotency_key: "again" })).rejects.toMatchObject({ status: 409 });
    await expect(updateTransaction(db.store, { id: "pay-1", expected_version: 2, patch: { status: "pending" } } as never)).rejects.toThrow();
  });
  it("cancelamento libera a reserva na mesma transação", async () => {
    const before = await db.store.read(), next = nextState(before); next.reservations = [{ id: "r", business_id: "demo", transaction_id: "pay-1", amount_cents: 1, status: "active", version: 1 }]; await db.store.commit(before, next, "reserve-fixture", {}, {});
    await cancelTransaction(db.store, settle);
    expect((await db.store.read()).reservations[0]).toMatchObject({ status: "released", version: 2 });
    await expect(settleTransaction(db.store, { ...settle, expected_version: 2 })).rejects.toMatchObject({ status: 409 });
  });
  it("chave reutilizada com outro conteúdo e versão antiga são conflitos", async () => {
    await settleTransaction(db.store, settle);
    await expect(settleTransaction(db.store, { ...settle, settled_date: "2026-10-28" })).rejects.toMatchObject({ status: 409 });
    await expect(updateTransaction(db.store, { id: "rec-1", expected_version: 9, patch: { description: "Nova" } })).rejects.toMatchObject({ status: 409 });
  });
  it("falha no gancho de tarefas reverte liquidação, histórico e dedup", async () => {
    await db.sql("create function fail_resolution() returns trigger language plpgsql as $$ begin raise exception 'task failure'; end $$; create trigger fail_task before insert on finance_resolutions for each row execute function fail_resolution();");
    await expect(settleTransaction(db.store, settle)).rejects.toThrow(/task failure/);
    expect((await db.store.read()).transactions.find(tx => tx.id === "pay-1")?.status).toBe("pending");
    expect(await db.store.replay("settle", settle.idempotency_key, settle)).toBeNull();
  });
});
