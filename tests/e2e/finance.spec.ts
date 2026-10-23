import { test, expect, request as apiRequest, type APIRequestContext } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { testDatabase } from "../integration/finance/database";
import { localRpcGateway } from "../integration/finance/gateway";
import { saoPauloDate } from "@/features/finance/port";
import { addDays } from "@/features/finance/dates";

test.describe("T8 rotas reais em produção local", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>, gateway: Awaited<ReturnType<typeof localRpcGateway>>;
  let child: ChildProcess | undefined, api: APIRequestContext, origin: string, port: number;
  const key = "isolated-e2e-service-key", secret = "isolated-e2e-session-secret-at-least-32-chars";
  async function start() {
    let log = "";
    child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { windowsHide: true,
      env: { ...process.env, NODE_ENV: "production", VERCEL_ENV: "preview", SESSION_SECRET: secret, APP_ORIGIN: origin, SUPABASE_URL: gateway.url, SUPABASE_SERVICE_ROLE_KEY: key }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", part => { log = (log + part).slice(-4000); }); child.stderr?.on("data", part => { log = (log + part).slice(-4000); });
    for (let attempt = 0; attempt < 120; attempt++) {
      if (child.exitCode !== null) throw new Error("Next encerrou: " + log);
      try { if ((await fetch(origin + "/api/demo/snapshot", { signal: AbortSignal.timeout(500) })).ok) return; } catch { /* startup only */ }
      await new Promise(yes => setTimeout(yes, 250));
    }
    throw new Error("Next não iniciou: " + log);
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const running = child;
    await new Promise<void>(yes => { running.once("exit", () => yes()); running.kill(); }); child = undefined;
  }
  test.beforeAll(async () => {
    test.setTimeout(60000);
    db = await testDatabase(); gateway = await localRpcGateway(db, key);
    const probe = createServer(); await new Promise<void>(yes => probe.listen(0, "127.0.0.1", yes));
    const address = probe.address(); if (!address || typeof address === "string") throw new Error("Porta ausente");
    port = address.port; await new Promise<void>(yes => probe.close(() => yes())); origin = `http://127.0.0.1:${port}`;
    await start(); api = await apiRequest.newContext({ baseURL: origin, extraHTTPHeaders: { Origin: origin } });
  });
  test.afterAll(async () => { await api?.dispose(); await stop(); await gateway?.close(); await db?.close(); });
  test("CSV, snapshot, cenário, atualização, reserva, liquidação e reinício", async () => {
    test.setTimeout(60000);
    const today = saoPauloDate(new Date()), tomorrow = addDays(today, 1), delayed = addDays(today, 9);
    const snapshot = `/api/finance/snapshot?business_id=demo&as_of=${today}`;
    expect((await api.get(snapshot)).status()).toBe(401);
    expect((await api.post("/api/finance/session", { data: {} })).status()).toBe(200);
    const csv = (await readFile("examples/caixa-demo.csv", "utf8")).replaceAll("2026-10-25", addDays(today, 2)).replaceAll("2026-10-27", addDays(today, 4));
    const preview = await api.post("/api/finance/import/preview", { data: { csv, opening_balance_cents: 100000, start_date: today } });
    expect(preview.status()).toBe(200);
    const confirm = { preview_id: (await preview.json()).data.preview_id, idempotency_key: "e2e-import" };
    expect((await api.post("/api/finance/import/confirm", { data: confirm })).status()).toBe(200);
    expect((await (await api.post("/api/finance/import/confirm", { data: confirm })).json()).data.inserted_count).toBe(2);
    expect((await (await api.get(snapshot)).json()).data.current_balance_cents).toBe(100000);
    const scenario = await api.post("/api/finance/scenarios", { data: { base_version: 2, overrides: [{ transaction_id: "rec-1", expected_date: delayed }] } });
    expect(scenario.status()).toBe(200); expect((await scenario.json()).data.projected.minimum_balance_cents).toBe(-50000);
    const patch = { id: "rec-1", expected_version: 1, patch: { expected_date: delayed } };
    expect((await api.patch("/api/finance/transactions/rec-1", { data: patch })).status()).toBe(200);
    expect((await api.patch("/api/finance/transactions/rec-1", { data: patch })).status()).toBe(409);
    const created = await api.post("/api/finance/transactions", { data: { transaction: { business_id: "demo", direction: "out", amount_cents: 50000, due_date: tomorrow, expected_date: tomorrow, counterparty: "Fornecedor F2", description: "Pagamento E2E" }, idempotency_key: "e2e-create" } });
    expect(created.status()).toBe(200); const id = (await created.json()).data.transaction.id;
    const reserved = await api.post("/api/finance/reservations", { data: { target_id: id, amount_cents: 50000, expected_version: 1, idempotency_key: "e2e-reserve" } });
    expect(reserved.status()).toBe(200); expect((await reserved.json()).data.free_cents).toBe(50000);
    expect((await api.post(`/api/finance/transactions/${id}/settle`, { data: { id, expected_version: 1, settled_date: today, idempotency_key: "e2e-settle" } })).status()).toBe(200);
    await stop(); await start();
    const final = await api.get(snapshot); expect(final.status()).toBe(200);
    expect((await final.json()).data).toMatchObject({ current_balance_cents: 50000, reserved_cents: 0, free_cents: 50000, source: "user_data" });
    expect((await db.store.read()).transactions).toHaveLength(3);
  });
});
