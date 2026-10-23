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
  test('INT-01/02/03 browser persists CSV, forecast, manual creation, reserve and settlement', async ({page})=>{
    test.setTimeout(60000);
    const today=saoPauloDate(new Date()), delayed=addDays(today,9);
    await page.goto(origin+'/caixa');
    await expect(page.getByTestId('current-balance')).toHaveText(/0,00/);
    await expect(page.getByText('Dados fictícios persistidos',{exact:true})).toBeVisible();
    await expect(page.getByText('Ver resposta de exemplo')).toHaveCount(0);
    await page.getByRole('button',{name:'Importar CSV',exact:true}).click();
    let dialog=page.getByRole('dialog');
    const csv=(await readFile('examples/caixa-demo.csv','utf8')).replaceAll('2026-10-25',addDays(today,2)).replaceAll('2026-10-27',addDays(today,4));
    await dialog.getByLabel('Saldo inicial (R$)').fill('1000');
    await dialog.getByLabel('Início do período').fill(today);
    await dialog.getByLabel('Conteúdo CSV').fill(csv);
    await dialog.getByRole('button',{name:'Conferir prévia'}).click();
    await dialog.getByRole('button',{name:'Confirmar importação'}).click();
    await expect(page.getByTestId('current-balance')).toHaveText(/1\.000,00/);
    await page.getByRole('button',{name:'Simular atraso',exact:true}).click();
    dialog=page.getByRole('dialog');await dialog.getByLabel('Nova data prevista').fill(delayed);
    await dialog.getByRole('button',{name:'Simular atraso',exact:true}).click();
    await expect(page.getByTestId('dashboard-minimum')).toHaveText(/-R\$\s*500,00/);
    await dialog.getByRole('button',{name:'Alterar previsão'}).click();
    await expect(page.getByText('Hipótese ativa',{exact:true})).toHaveCount(0);
    await expect(page.getByTestId('dashboard-minimum')).toHaveText(/-R\$\s*500,00/);
    const controls=page.getByRole('region',{name:'Ações financeiras manuais'});
    await controls.getByLabel('Valor (R$)',{exact:true}).fill('500');
    await controls.getByLabel('Cliente ou fornecedor').fill('Fornecedor de teste');
    await controls.getByLabel('Descrição',{exact:true}).fill('Conta manual');
    await controls.getByLabel('Vencimento e previsão').fill(addDays(today,1));
    await expect(controls.getByRole('button',{name:'Criar compromisso'})).toBeDisabled();
    await controls.getByLabel('Confirmo a ação financeira selecionada').check();
    await controls.getByRole('button',{name:'Criar compromisso'}).click();
    await expect(controls.getByLabel('Compromisso pendente')).toContainText('Conta manual');
    const state=await db.store.read();const id=state.transactions.find(t=>t.description==='Conta manual')!.id;
    await controls.getByLabel('Compromisso pendente').selectOption(id);
    await controls.getByLabel('Valor da reserva virtual (R$)').fill('500');
    await controls.getByLabel('Confirmo a ação financeira selecionada').check();
    await controls.getByRole('button',{name:'Confirmar reserva virtual'}).click();
    await expect(page.getByRole('region',{name:'Resumo do caixa'})).toContainText(/500,00/);
    await expect.poll(async()=> (await db.store.read()).reservations.filter(r=>r.status==='active').length).toBe(1);
    expect((await db.store.read()).reservations[0]).toMatchObject({transaction_id:id,amount_cents:50000,status:'active'});
    await controls.getByLabel('Compromisso pendente').selectOption(id);
    await controls.getByLabel('Confirmo a ação financeira selecionada').check();
    await controls.getByRole('button',{name:'Confirmar liquidação'}).click();
    await expect(page.getByTestId('current-balance')).toHaveText(/500,00/);
    await page.reload();
    await expect(page.getByTestId('current-balance')).toHaveText(/500,00/);
    await expect(page.getByRole('region',{name:'Resumo do caixa'})).toContainText(/R\$\s*0,00/);
    await page.setViewportSize({width:360,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await expect(page.getByRole('button',{name:'Gravar mensagem'})).toHaveCount(0);
    await page.screenshot({path:'output/playwright/persisted-cash-mobile.png',fullPage:true});
    const final=await db.store.read();expect(final.transactions).toHaveLength(3);expect(final.transactions.find(t=>t.id===id)).toMatchObject({status:'settled',direction:'out',amount_cents:50000,counterparty:'Fornecedor de teste',description:'Conta manual',due_date:addDays(today,1),settled_date:today});expect(final.reservations[0].status).toBe('released');expect(final.transactions.find(t=>t.id==='rec-1')?.expected_date).toBe(delayed);
  });
  test('INT-04/06 unavailable database displays recoverable error without mocks',async({page})=>{
    await page.route('**/api/finance/workspace',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'DATABASE_UNAVAILABLE',message:'Banco indisponível.'},request_id:'test'})}));
    await page.goto(origin+'/caixa');await expect(page.getByRole('alert',{name:'Falha no caixa'})).toContainText('Banco indisponível.');
    await expect(page.getByTestId('current-balance')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Atualizar caixa e sessão'})).toBeEnabled();
  });

  test('INT-04 conflicting forecast is not reported as saved or applied',async({page})=>{
    const today=saoPauloDate(new Date());
    await api.post('/api/finance/session',{data:{}});
    const csv=(await readFile('examples/caixa-demo.csv','utf8')).replaceAll('2026-10-25',addDays(today,2)).replaceAll('2026-10-27',addDays(today,4));
    const preview=await api.post('/api/finance/import/preview',{data:{csv,opening_balance_cents:100000,start_date:today}});
    expect(preview.status()).toBe(200);
    expect((await api.post('/api/finance/import/confirm',{data:{preview_id:(await preview.json()).data.preview_id,idempotency_key:'conflict-seed'}})).status()).toBe(200);
    await page.goto(origin+'/caixa');
    await page.getByRole('button',{name:'Simular atraso',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Nova data prevista').fill(addDays(today,9));
    await page.route('**/api/finance/transactions/rec-1',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{code:'CONFLICT',message:'Versão antiga. Atualize o caixa.'},request_id:'conflict'})}));
    await dialog.getByRole('button',{name:'Alterar previsão'}).click();
    await expect(dialog.getByRole('alert')).toContainText('Versão antiga. Atualize o caixa.');
    await expect(dialog.getByText('Previsão atualizada. Vencimento original preservado.')).toHaveCount(0);
    expect((await db.store.read()).transactions.find(t=>t.id==='rec-1')?.expected_date).toBe(addDays(today,2));
    await page.reload();await expect(page.getByTestId('dashboard-minimum')).toHaveText(/1\.000,00/);
  });

});
