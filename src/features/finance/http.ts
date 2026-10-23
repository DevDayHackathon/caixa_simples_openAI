import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations, idSchema } from "@/contracts";
import { createFinancePort } from "./port";
import { createSupabaseFinanceStore, FinanceError, type FinanceStore } from "./store";
import { FINANCE_COOKIE, issueFinanceSession, requireFinanceSession } from "./session";

type Operation = keyof typeof financeOperations;
type Options = { store: () => FinanceStore; sessionSecret: string; appOrigin: string; now?: () => Date };
async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new FinanceError(422, "INVALID_JSON", "Use Content-Type application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new FinanceError(422, "INVALID_JSON", "Corpo JSON obrigatório.");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 2_200_000) { await reader.cancel(); throw new FinanceError(422, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede o limite."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof FinanceError) throw error;
    throw new FinanceError(422, "INVALID_JSON", "JSON inválido.");
  } finally { reader.releaseLock(); }
}

export function createFinanceHandler(options: Options) {
  return async (operation: Operation | "session", request: Request, pathId?: string) => {
    const supplied = idSchema.safeParse(request.headers.get("x-request-id"));
    const request_id = supplied.success ? supplied.data : randomUUID();
    const headers = { "Cache-Control": "no-store", "X-Data-Source": "user_data" };
    try {
      const now = options.now?.() ?? new Date();
      // Next/Vercel may reconstruct request.url with an internal hostname.
      // The configured public origin is the authority for the browser Origin check.
      if (request.method !== "GET" && (!options.appOrigin || request.headers.get("origin") !== options.appOrigin)) throw new FinanceError(403, "FORBIDDEN_ORIGIN", "Origem não permitida.");
      if (operation === "session") {
        const cookie = `${FINANCE_COOKIE}=${issueFinanceSession(options.sessionSecret, now.getTime())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${options.appOrigin.startsWith("https:") ? "; Secure" : ""}`;
        return Response.json({ data: { business_id: "demo" }, request_id }, { headers: { ...headers, "Set-Cookie": cookie } });
      }
      requireFinanceSession(request, options.sessionSecret, now.getTime());
      let raw: unknown;
      if (operation === "getCashSnapshot") {
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].length !== new Set(params.keys()).size) throw new FinanceError(422, "INVALID_QUERY", "Parâmetro repetido.");
        raw = Object.fromEntries(params);
      } else raw = await readJson(request);
      const input = financeOperations[operation].input.parse(raw);
      if (pathId !== undefined && (!("id" in input) || input.id !== pathId)) throw new FinanceError(422, "ID_MISMATCH", "ID do caminho difere do corpo.");
      const port = createFinancePort(options.store(), () => now);
      const execute = port[operation] as (input: unknown) => Promise<unknown>;
      const result = await execute(input);
      const output = financeOperations[operation].output.safeParse(result);
      if (!output.success) throw new FinanceError(503, "INVALID_FINANCE_RESPONSE", "Resposta financeira inválida.");
      return Response.json({ data: output.data, request_id }, { headers });
    } catch (error) {
      let failure: FinanceError;
      if (error instanceof z.ZodError) failure = new FinanceError(422, "VALIDATION_ERROR", "Corrija os campos informados.", Object.fromEntries(error.issues.map(issue => [issue.path.join("."), issue.message])));
      else if (error instanceof FinanceError) failure = error;
      else failure = new FinanceError(503, "FINANCE_UNAVAILABLE", "Serviço financeiro indisponível. Tente novamente.");
      return Response.json({ error: { code: failure.code, message: failure.message, ...(failure.fields ? { fields: failure.fields } : {}) }, request_id }, { status: failure.status, headers });
    }
  };
}

export function financeRoute(operation: Operation | "session", request: Request, pathId?: string) {
  return createFinanceHandler({
    sessionSecret: process.env.SESSION_SECRET ?? "", appOrigin: process.env.APP_ORIGIN ?? "",
    store: () => {
      const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new FinanceError(503, "DATABASE_UNAVAILABLE", "Configure o banco no servidor.");
      if (process.env.VERCEL_ENV === "preview" && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new FinanceError(503, "PREVIEW_DATABASE_DISABLED", "Preview requer banco local isolado.");
      return createSupabaseFinanceStore(url, key);
    },
  })(operation, request, pathId);
}
