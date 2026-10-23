import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations, transactionSchema, balanceSchema, dateSchema } from "@/contracts";
import { FinanceError, nextState, type FinanceStore } from "./store";
import { addDays } from "./dates";
import { calculateCash } from "./cash";

const columns = ["id", "direction", "amount_cents", "status", "due_date", "expected_date", "settled_date", "counterparty", "description"];
type CsvError = { line: number; field: string; message: string };
// RFC 4180: quoted commas, escaped quotes and quoted newlines; line numbers refer to the original file.
function records(csv: string) {
  const rows: { cells: string[]; line: number }[] = [];
  let cells: string[] = [], cell = "", quoted = false, closed = false, line = 1, rowLine = 1;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"') { if (csv[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else { cell += c; if (c === "\n") line++; }
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      cells.push(cell); cell = ""; closed = false;
      if (c !== ",") {
        rows.push({ cells, line: rowLine }); cells = [];
        if (c === "\r" && csv[i + 1] === "\n") i++;
        line++; rowLine = line;
      }
    } else { if (closed || c === '"') throw new Error(`Aspas inválidas na linha ${line}.`); cell += c; }
  }
  if (quoted) throw new Error(`Aspas não fechadas na linha ${rowLine}.`);
  if (cell !== "" || cells.length > 0) rows.push({ cells: [...cells, cell], line: rowLine });
  return rows;
}
const previewSchema = financeOperations.previewImport.output.extend({
  opening_balance_cents: balanceSchema, start_date: dateSchema, base_version: z.number().int().positive(),
});

export async function previewImport(store: FinanceStore, raw: z.input<typeof financeOperations.previewImport.input>) {
  const input = financeOperations.previewImport.input.parse(raw);
  const errors: CsvError[] = [];
  const rows: z.infer<typeof transactionSchema>[] = [];
  if (Buffer.byteLength(input.csv, "utf8") > 1_048_576) errors.push({ line: 1, field: "csv", message: "Limite de 1 MiB excedido." });
  else {
    try {
      const parsed = records(input.csv.replace(/^\uFEFF/, ""));
      if (!parsed[0] || parsed[0].cells.join(",") !== columns.join(",")) errors.push({ line: 1, field: "header", message: "Cabeçalho inválido." });
      else if (parsed.length - 1 > 1000) errors.push({ line: 1002, field: "csv", message: "Limite de 1.000 linhas excedido." });
      else if (parsed.length === 1) errors.push({ line: 2, field: "csv", message: "Informe pelo menos uma movimentação." });
      else {
        const ids = new Set<string>();
        for (const record of parsed.slice(1)) {
          if (record.cells.length !== columns.length) { errors.push({ line: record.line, field: "csv", message: "Quantidade de colunas inválida." }); continue; }
          const values = Object.fromEntries(columns.map((key, index) => [key, record.cells[index]]));
          const result = transactionSchema.safeParse({ ...values, business_id: "demo", amount_cents: /^\d+$/.test(values.amount_cents) ? Number(values.amount_cents) : NaN,
            expected_date: values.expected_date || null, settled_date: values.settled_date || null,
            version: 1, source: "csv", updated_at: new Date().toISOString() });
          if (!result.success) { for (const issue of result.error.issues) errors.push({ line: record.line, field: issue.path.join("."), message: issue.message }); continue; }
          const row = result.data;
          if (ids.has(row.id)) errors.push({ line: record.line, field: "id", message: "ID duplicado no arquivo." });
          ids.add(row.id);
          if (row.status === "pending" && !row.expected_date) errors.push({ line: record.line, field: "expected_date", message: "Pendência nova exige previsão." });
          for (const field of ["due_date", "expected_date", "settled_date"] as const) {
            if (row[field] && (row[field] < input.start_date || row[field] > addDays(input.start_date, 29))) errors.push({ line: record.line, field, message: "Data fora do horizonte de 30 dias." });
          }
          rows.push(row);
        }
      }
    } catch (error) { errors.push({ line: 1, field: "csv", message: String(error) }); }
  }
  const state = await store.read();
  const preview = { preview_id: randomUUID(), rows, errors, opening_balance_cents: input.opening_balance_cents, start_date: input.start_date, base_version: state.version };
  await store.rpc("finance_preview_save", { p_id: preview.preview_id, p_data: preview });
  return financeOperations.previewImport.output.parse({ preview_id: preview.preview_id, rows, errors });
}

function content(row: z.infer<typeof transactionSchema>) {
  return JSON.stringify(columns.map(key => row[key as keyof typeof row]));
}
export async function confirmImport(store: FinanceStore, raw: z.input<typeof financeOperations.confirmImport.input>) {
  const input = financeOperations.confirmImport.input.parse(raw);
  const previous = await store.replay("import", input.idempotency_key, input);
  if (previous) return financeOperations.confirmImport.output.parse(previous);
  const saved = await store.rpc("finance_preview_read", { p_id: input.preview_id });
  if (!saved) throw new FinanceError(422, "INVALID_PREVIEW", "Prévia ausente ou expirada; importe novamente.");
  const preview = previewSchema.parse(saved);
  if (preview.errors.length) throw new FinanceError(422, "INVALID_CSV", "Corrija todas as linhas antes de confirmar.", Object.fromEntries(preview.errors.map(error => [`${error.line}.${error.field}`, error.message])));
  const state = await store.read();
  if (state.version !== preview.base_version) {
    const raced = await store.replay("import", input.idempotency_key, input);
    if (raced) return financeOperations.confirmImport.output.parse(raced);
    throw new FinanceError(409, "CONFLICT", "Dados alterados desde a prévia. Gere uma nova prévia.");
  }
  const next = nextState(state);
  if (state.transactions.length === 0 && state.reservations.length === 0) {
    next.business.start_date = preview.start_date; next.business.opening_balance_cents = preview.opening_balance_cents;
  } else if (state.business.start_date !== preview.start_date || state.business.opening_balance_cents !== preview.opening_balance_cents) {
    throw new FinanceError(409, "CONFLICT", "Saldo inicial ou horizonte já definido nesta empresa.");
  }
  let inserted_count = 0;
  for (const row of preview.rows) {
    const existing = state.transactions.find(tx => tx.id === row.id);
    if (existing && content(existing) !== content(row)) throw new FinanceError(409, "CONFLICT", "ID existente com conteúdo diferente.", { id: row.id });
    if (!existing) { next.transactions.push(row); inserted_count++; }
  }
  const result = { inserted_count, business_version: next.version };
  calculateCash(next, next.business.start_date);
  return financeOperations.confirmImport.output.parse(await store.commit(state, next, "import", input, result, input.idempotency_key));
}
