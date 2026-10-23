import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./database";
import { createFinanceHandler } from "@/features/finance/http";
import { createFinanceClient } from "@/adapters/http";
import { financeOperations, errorEnvelopeSchema } from "@/contracts";
import { FINANCE_COOKIE, issueFinanceSession } from "@/features/finance/session";
import { nextState, createSupabaseFinanceStore } from "@/features/finance/store";

const origin = "http://localhost:3000", secret = "local-session-secret-with-at-least-32-chars", now = new Date("2026-10-23T12:00:00Z");
describe("T8 contratos HTTP e Postgres", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>, csv: string, handler: ReturnType<typeof createFinanceHandler>;
  beforeEach(async () => { db = await testDatabase(); csv = await readFile("examples/caixa-demo.csv", "utf8"); handler = createFinanceHandler({ store: () => db.store, sessionSecret: secret, appOrigin: origin, now: () => now }); });
  afterEach(async () => { await db?.close(); });
  function request(path: string, data?: unknown, cookie = issueFinanceSession(secret, now.getTime())) {
    return new Request(origin + path, { method: data === undefined ? "GET" : "POST", headers: { cookie: `${FINANCE_COOKIE}=${cookie}`, origin, "Content-Type": "application/json" }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
  }
  const previewInput = () => ({ csv, opening_balance_cents: 100000, start_date: "2026-10-23" });
  async function importF1() {
    const preview = await (await handler("previewImport", request("/api/finance/import/preview", previewInput()))).json();
    const result = await handler("confirmImport", request("/api/finance/import/confirm", { preview_id: preview.data.preview_id, idempotency_key: "f1" }));
    expect(result.status).toBe(200); return result.json();
  }
  it("emite cookie HttpOnly de empresa fixa e requer sessão válida", async () => {
    const response = await handler("session", request("/api/finance/session", {}));
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
    for (const cookie of ["", "bad", issueFinanceSession(secret, now.getTime() - 9 * 60 * 60 * 1000)]) {
      const result = await handler("getCashSnapshot", request("/api/finance/snapshot?business_id=demo&as_of=2026-10-23", undefined, cookie));
      expect(result.status).toBe(401); errorEnvelopeSchema.parse(await result.json());
    }
    expect((await db.store.read()).version).toBe(1);
  });
  it("origem cruzada ou ausente é bloqueada antes de escrever", async () => {
    for (const value of ["https://evil.example", ""]) {
      const req = request("/api/finance/import/preview", previewInput()); req.headers.set("origin", value);
      expect((await handler("previewImport", req)).status).toBe(403);
    }
    expect(Number(await db.sql("select count(*) from finance_previews;"))).toBe(0);
  });
  it("CSV preview/confirm e snapshot obedecem schemas e sobrevivem nova instância", async () => {
    await importF1(); handler = createFinanceHandler({ store: () => db.store, sessionSecret: secret, appOrigin: origin, now: () => now });
    const response = await handler("getCashSnapshot", request("/api/finance/snapshot?business_id=demo&as_of=2026-10-23"));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(financeOperations.getCashSnapshot.output.parse((await response.json()).data)).toMatchObject({ current_balance_cents: 100000, source: "user_data", version: 2 });
  });
  it("criar, alterar e liquidar retornam contratos válidos e conflito 409", async () => {
    const create = await handler("createTransaction", request("/api/finance/transactions", { transaction: { business_id: "demo", direction: "out", amount_cents: 100, due_date: "2026-10-24", expected_date: "2026-10-24", counterparty: "Fornecedor", description: "Compra" }, idempotency_key: "new" }));
    const tx = financeOperations.createTransaction.output.parse((await create.json()).data).transaction;
    const input = { id: tx.id, expected_version: 1, patch: { expected_date: "2026-10-25" } };
    expect((await handler("updateTransaction", request("/api/finance/transactions/" + tx.id, input), tx.id)).status).toBe(200);
    expect((await handler("updateTransaction", request("/api/finance/transactions/" + tx.id, input), tx.id)).status).toBe(409);
    const paid = await handler("settleTransaction", request("/api/finance/transactions/" + tx.id + "/settle", { id: tx.id, expected_version: 2, settled_date: "2026-10-25", idempotency_key: "paid" }), tx.id);
    expect(financeOperations.settleTransaction.output.parse((await paid.json()).data).transaction.status).toBe("settled");
  });
  it("simula atraso F1 sem persistir alterações", async () => {
    await importF1(); const before = await db.store.read();
    const response = await handler("simulate", request("/api/finance/scenarios", { base_version: 2, overrides: [{ transaction_id: "rec-1", expected_date: "2026-11-01" }] }));
    expect(financeOperations.simulate.output.parse((await response.json()).data).projected.minimum_balance_cents).toBe(-50000);
    expect(await db.store.read()).toEqual(before);
  });
  it("reserva pelo endpoint e bloqueia excesso com disponível", async () => {
    await importF1(); const input = { target_id: "pay-1", expected_version: 1, amount_cents: 50000, idempotency_key: "reserve" };
    expect(financeOperations.reserveForPayment.output.parse((await (await handler("reserveForPayment", request("/api/finance/reservations", input))).json()).data).free_cents).toBe(50000);
    const excessive = await handler("reserveForPayment", request("/api/finance/reservations", { ...input, amount_cents: 200000, idempotency_key: "excess" }));
    expect(excessive.status).toBe(409);
  });
  it("JSON/schema/ID inválidos retornam 422 sem escrita", async () => {
    expect((await handler("createTransaction", request("/api/finance/transactions", {}))).status).toBe(422);
    const invalid = request("/api/finance/transactions", {}); const malformed = new Request(invalid, { body: "{" });
    expect((await handler("createTransaction", malformed)).status).toBe(422);
    expect((await handler("updateTransaction", request("/api/finance/transactions/pay-1", { id: "other", expected_version: 1, patch: { amount_cents: 1 } }), "pay-1")).status).toBe(422);
    expect((await db.store.read()).version).toBe(1);
  });
  it("escopo externo é 403 mesmo com sessão demo válida", async () => {
    expect((await handler("getCashSnapshot", request("/api/finance/snapshot?business_id=other&as_of=2026-10-23"))).status).toBe(403);
  });
  it("falha externa é 503 sem segredo, sucesso falso ou efeito parcial", async () => {
    const broken = createFinanceHandler({ store: () => { throw new Error("secret-do-not-return"); }, sessionSecret: secret, appOrigin: origin });
    const response = await broken("getCashSnapshot", request("/api/finance/snapshot?business_id=demo&as_of=2026-10-23"));
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("secret-do-not-return");
  });
  it("cliente v1 consome o adaptador real com banco local", async () => {
    const client = createFinanceClient(async req => { const headers = new Headers(req.headers); headers.set("origin", origin); headers.set("cookie", FINANCE_COOKIE + "=" + issueFinanceSession(secret, now.getTime()));
      const operation = req.url.includes("/preview") ? "previewImport" : req.url.includes("/confirm") ? "confirmImport" : "getCashSnapshot";
      return handler(operation, new Request(req, { headers })); }, origin);
    const preview = await client.previewImport(previewInput()); await client.confirmImport({ preview_id: preview.preview_id, idempotency_key: "client" });
    expect((await client.getCashSnapshot({ business_id: "demo", as_of: "2026-10-23" })).current_balance_cents).toBe(100000);
  });
  it("unicidade de reservas é protegida também na transação SQL", async () => {
    await importF1(); const before = await db.store.read(), next = nextState(before);
    next.reservations = ["r1", "r2"].map(id => ({ id, business_id: "demo", transaction_id: "pay-1", amount_cents: 1, status: "active", version: 1 }));
    await expect(db.store.commit(before, next, "duplicate", {}, {})).rejects.toMatchObject({ status: 409 });
  });
  it("SDK Supabase transforma falha de rede em erro recuperável", async () => {
    const store = createSupabaseFinanceStore("http://127.0.0.1:1", "test-service-key");
    await expect(store.read()).rejects.toMatchObject({ status: 503, code: "DATABASE_UNAVAILABLE" });
  });
  it("overflow agregado na importação não persiste saldo nem contas", async () => {
    const result = await handler("previewImport", request("/api/finance/import/preview", { ...previewInput(), opening_balance_cents: Number.MAX_SAFE_INTEGER }));
    const preview = (await result.json()).data;
    const confirm = await handler("confirmImport", request("/api/finance/import/confirm", { preview_id: preview.preview_id, idempotency_key: "overflow" }));
    expect(confirm.status).toBe(422); expect((await db.store.read()).version).toBe(1);
  });
});
