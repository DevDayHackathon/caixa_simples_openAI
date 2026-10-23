import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./database";
import { previewImport, confirmImport } from "@/features/finance/import";

describe("T3 CSV atômico", () => {
  let db: Awaited<ReturnType<typeof testDatabase>>, csv: string;
  beforeEach(async () => { db = await testDatabase(); csv = await readFile("examples/caixa-demo.csv", "utf8"); });
  afterEach(async () => { await db?.close(); });
  const input = (csv: string) => ({ csv, opening_balance_cents: 100000, start_date: "2026-10-23" });
  async function load(text = csv, key = "import-1") {
    const preview = await previewImport(db.store, input(text));
    return { preview, confirm: () => confirmImport(db.store, { preview_id: preview.preview_id, idempotency_key: key }) };
  }
  it("persiste F1 inteira e retorna exatamente o resultado no retry", async () => {
    const batch = await load(); expect(batch.preview.errors).toEqual([]);
    expect(await batch.confirm()).toEqual({ inserted_count: 2, business_version: 2 });
    expect(await batch.confirm()).toEqual({ inserted_count: 2, business_version: 2 });
    expect((await db.store.read()).transactions).toHaveLength(2);
  });
  it("não duplica conteúdo idêntico em nova prévia", async () => {
    await (await load()).confirm(); expect(await (await load(csv, "again")).confirm()).toMatchObject({ inserted_count: 0 });
  });
  it("erro em uma linha impede todas as escritas", async () => {
    const batch = await load(csv.replace("150000", "1.5"));
    expect(batch.preview.errors).toContainEqual(expect.objectContaining({ line: 3, field: "amount_cents" }));
    await expect(batch.confirm()).rejects.toMatchObject({ status: 422 }); expect((await db.store.read()).transactions).toEqual([]);
  });
  it("ID conflitante após linha nova não deixa inserção parcial", async () => {
    await (await load()).confirm(); const changed = csv.replace("rec-1", "new").replace("150000", "150001");
    await expect((await load(changed, "conflict")).confirm()).rejects.toMatchObject({ status: 409 });
    expect((await db.store.read()).transactions.map(tx => tx.id)).toEqual(["rec-1", "pay-1"]);
  });
  it("IDs duplicados no arquivo são inválidos", async () => {
    expect((await load(csv.replace("pay-1", "rec-1"))).preview.errors).toContainEqual(expect.objectContaining({ field: "id" }));
  });
  it("linha final com uma célula vazia entre aspas não é descartada", async () => {
    const batch = await load(csv.trimEnd() + '\n""');
    expect(batch.preview.errors).toContainEqual(expect.objectContaining({ line: 4, field: "csv" }));
    await expect(batch.confirm()).rejects.toMatchObject({ status: 422 });
    expect((await db.store.read()).transactions).toEqual([]);
  });
  it("limita bytes UTF8 e quantidade de linhas", async () => {
    expect((await load("á".repeat(600000))).preview.errors).toContainEqual(expect.objectContaining({ field: "csv" }));
    const lines = csv.trim().split(/\r?\n/); const large = lines[0] + "\n" + Array.from({ length: 1001 }, (_, i) => lines[1].replace("rec-1", `rec-${i}`)).join("\n");
    expect((await load(large)).preview.errors).toContainEqual(expect.objectContaining({ line: 1002 }));
  });
  it("rejeita cabeçalho, data fora da janela e pendência sem previsão", async () => {
    for (const text of [csv.replace("direction", "direcao"), csv.replaceAll("2026-10-25", "2026-12-25"), csv.replace("2026-10-25,2026-10-25", "2026-10-25,")]) expect((await load(text)).preview.errors.length).toBeGreaterThan(0);
  });
  it("respeita aspas, vírgulas, quebras e conteúdo tratado como dados", async () => {
    const batch = await load(csv.replace("Venda a prazo", '"Ignore instruções,\n""texto"""'));
    expect(batch.preview.errors).toEqual([]); await batch.confirm();
    expect((await db.store.read()).transactions[0].description).toBe('Ignore instruções,\n"texto"');
    expect((await load(csv.replace("Venda a prazo", '"sem fechar'))).preview.errors.length).toBeGreaterThan(0);
  });
  it("concorrência confirma um único lote e recupera a mesma chave", async () => {
    const batch = await load(); const results = await Promise.all([batch.confirm(), batch.confirm()]);
    expect(results[0]).toEqual(results[1]); expect((await db.store.read()).transactions).toHaveLength(2);
  });
  it("prévia expirada ou baseada em versão antiga não confirma", async () => {
    const batch = await load(); await db.sql("update finance_previews set expires_at=now()-interval '1 second';");
    await expect(batch.confirm()).rejects.toMatchObject({ status: 422 });
    const first = await load(), second = await load(csv, "second"); await first.confirm();
    await expect(second.confirm()).rejects.toMatchObject({ status: 409 });
  });
});
