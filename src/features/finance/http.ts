import { workspaceInputSchema, workspaceSchema } from "./workspace";
import { calculateCash } from "./cash";
import { saoPauloDate } from "./port";
import { addDays } from "./dates";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { financeOperations, idSchema } from "@/contracts";
import { createFinancePort } from "./port";
import { configuredFinanceStore, FinanceError, type FinanceStore } from "./store";
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
  return async (operation: Operation | "session" | "workspace", request: Request, pathId?: string) => {
    const supplied = idSchema.safeParse(request.headers.get("x-request-id"));
    const request_id = supplied.success ? supplied.data : randomUUID();
    const headers = { "Cache-Control": "no-store", "X-Data-Source": "user_data" };
    try {
      const now = options.now?.() ?? new Date();
      // Next/Vercel may reconstruct request.url with an internal hostname.
      // The configured public origin is the authority for the browser Origin check.
      if (request.method !== "GET" && (!options.appOrigin || request.headers.get("origin") !== options.appOrigin)) throw new FinanceError(403, "FORBIDDEN_ORIGIN", "Origem não permitida.");
      if (operation === "session") {
        let token: string;
        try {
          requireFinanceSession(request, options.sessionSecret, now.getTime());
          token = request.headers.get("cookie")!.split(";").map(part => part.trim()).find(part => part.startsWith(FINANCE_COOKIE + "="))!.slice(FINANCE_COOKIE.length + 1);
        } catch (error) {
          if (!(error instanceof FinanceError) || error.status !== 401) throw error;
          token = issueFinanceSession(options.sessionSecret, now.getTime());
        }
        const cookie = `${FINANCE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${options.appOrigin.startsWith("https:") ? "; Secure" : ""}`;
        return Response.json({ data: { business_id: "demo" }, request_id }, { headers: { ...headers, "Set-Cookie": cookie } });
      }
      requireFinanceSession(request, options.sessionSecret, now.getTime());
      if (operation === "workspace") {
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].length !== new Set(params.keys()).size) throw new FinanceError(422, "INVALID_QUERY", "Parâmetro repetido.");
        const query = workspaceInputSchema.parse(Object.fromEntries(params));
        const state = await options.store().read();
        const today = saoPauloDate(now), start = state.business.start_date, end = addDays(start, 29);
        // The reference remains explicit when the fixed demo horizon has elapsed.
        const asOf = query.as_of ?? (today < start ? start : today > end ? end : today);
        const data = workspaceSchema.parse({ business: state.business, transactions: state.transactions, snapshot: calculateCash(state, asOf) });
        return Response.json({ data, request_id }, { headers });
      }
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

export function financeRoute(operation: Operation | "session" | "workspace", request: Request, pathId?: string) {
  return createFinanceHandler({
    sessionSecret: process.env.SESSION_SECRET ?? "", appOrigin: process.env.APP_ORIGIN ?? "",
    store: configuredFinanceStore,
  })(operation, request, pathId);
}
