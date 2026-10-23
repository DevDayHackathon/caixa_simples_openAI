import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createFinanceStore, FinanceError } from "@/features/finance/store";

export function localDatabaseUrl(raw = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/postgres") {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) throw new Error("TEST_DATABASE_URL deve usar Postgres em loopback.");
  return url;
}
const psql = process.env.PSQL_PATH || (process.platform === "win32" ? resolve("output/finance-local/pgsql/bin/psql.exe") : "psql");
export function sql(url: URL, query: string): Promise<string> {
  return new Promise((yes, no) => {
    const child = spawn(psql, [url.toString(), "-X", "-A", "-t", "-q", "-v", "ON_ERROR_STOP=1"], { windowsHide: true });
    let out = "", err = "";
    child.stdout.on("data", data => { out += data; }); child.stderr.on("data", data => { err += data; });
    child.on("error", no); child.on("close", code => code === 0 ? yes(out.trim()) : no(new Error(err)));
    child.stdin.end(query);
  });
}
export async function testDatabase() {
  const admin = localDatabaseUrl();
  const name = "caixa_finance_test_" + randomUUID().replaceAll("-", "");
  // Roles are cluster-wide: serialize their setup in the shared maintenance database.
  await sql(admin, `begin;
    select pg_advisory_xact_lock(20261023, 1);
    do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;
    commit;`);
  await sql(admin, `create database ${name};`);
  const url = new URL(admin); url.pathname = "/" + name;
  await sql(url, await readFile("supabase/migrations/001_finance.sql", "utf8"));
  const store = createFinanceStore(async (fn, args) => {
    if (!/^finance_[a-z_]+$/.test(fn)) throw new Error("RPC inválida");
    const params = Object.entries(args).map(([key, value]) => {
      if (!/^p_[a-z_]+$/.test(key)) throw new Error("Parâmetro inválido");
      return `${key} => ${value === null ? "null" : "'" + (typeof value === "object" ? JSON.stringify(value) : String(value)).replaceAll("'", "''") + "'"}`;
    }).join(",");
    try { return JSON.parse(await sql(url, `set role service_role; select public.${fn}(${params});`) || "null"); }
    catch (error) {
      if (String(error).includes("CONFLICT")) throw new FinanceError(409, "CONFLICT", "Conflito.");
      if (String(error).includes("FORBIDDEN")) throw new FinanceError(403, "FORBIDDEN", "Escopo.");
      throw error;
    }
  });
  return { store, url, sql: (query: string) => sql(url, query),
    async close() { await sql(admin, `drop database ${name} with (force);`); } };
}
