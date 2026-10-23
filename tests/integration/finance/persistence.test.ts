import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { testDatabase, localDatabaseUrl } from "./database";
import { nextState, createFinanceStore } from "@/features/finance/store";
import { f1 } from "@/fixtures/demo";

describe("T2 Postgres financeiro", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>;
  beforeAll(async () => { db = await testDatabase(); });
  afterAll(async () => { await db?.close(); });
  it("recupera a empresa demo e seu estado após recriar o adaptador", async () => {
    const state = await db.store.read(); const next = nextState(state); next.transactions = f1.transactions;
    await db.store.commit(state, next, "seed", {}, { ok: true });
    expect((await createFinanceStore(db.store.rpc).read()).transactions).toEqual(f1.transactions);
  });
  it("rejeita compare-and-swap antigo sem perder dados", async () => {
    const state = await db.store.read(); const next = nextState(state);
    await db.store.commit(state, next, "advance", {}, {});
    await expect(db.store.commit(state, next, "stale", {}, {})).rejects.toMatchObject({ status: 409 });
    expect((await db.store.read()).version).toBe(next.version);
  });
  it("rejeita empresa externa mesmo via RPC", async () => {
    await expect(db.store.rpc("finance_read", { p_business_id: "other" })).rejects.toMatchObject({ status: 403 });
  });
  it("mantém histórico versionado de cada commit", async () => {
    expect(Number(await db.sql("select count(*) from finance_history;"))).toBe(2);
  });
  it("bloqueia leitura e escrita por papéis públicos", async () => {
    await expect(db.sql("set role anon; select * from finance_state;")).rejects.toThrow(/permission denied/);
    await expect(db.sql("set role authenticated; select finance_read('demo');")).rejects.toThrow(/permission denied/);
  });
  it("recusa banco de testes remoto", () => {
    expect(() => localDatabaseUrl("postgresql://user:secret@remote.example/demo")).toThrow(/loopback/);
  });
});
