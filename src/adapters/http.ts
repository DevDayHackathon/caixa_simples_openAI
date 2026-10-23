import { z } from "zod";
import { agentOperations, errorEnvelopeSchema, financeOperations, idSchema } from "@/contracts";
import type { AgentPort, FinancePort } from "@/contracts";

export type Transport = (request: Request) => Promise<Response>;

export class ContractHttpError extends Error {
  readonly name = "ContractHttpError";
  constructor(
    readonly status: number, readonly code: string, message: string,
    readonly request_id: string, readonly fields?: Record<string, string>, readonly retry_after_seconds?: number,
  ) { super(message); }
}

function requester(transport: Transport, baseUrl: string) {
  return async <T extends z.ZodType>(path: string, schema: T, input?: unknown, method = "POST"): Promise<z.infer<T>> => {
    const response = await transport(new Request(new URL(path, baseUrl), {
      method, credentials: "same-origin", cache: "no-store",
      ...(method !== "GET" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
    }));
    const body: unknown = await response.json();
    if (!response.ok) {
      const failure = errorEnvelopeSchema.parse(body);
      throw new ContractHttpError(response.status, failure.error.code, failure.error.message,
        failure.request_id, failure.error.fields, failure.error.retry_after_seconds);
    }
    const envelope = z.strictObject({ data: z.unknown(), request_id: idSchema }).parse(body);
    return schema.parse(envelope.data);
  };
}

export function createFinanceClient(transport: Transport, baseUrl = "http://localhost:3000"): FinancePort {
  const request = requester(transport, baseUrl);
  return {
    previewImport: (input) => request("/api/finance/import/preview", financeOperations.previewImport.output, financeOperations.previewImport.input.parse(input)),
    confirmImport: (input) => request("/api/finance/import/confirm", financeOperations.confirmImport.output, financeOperations.confirmImport.input.parse(input)),
    getCashSnapshot: (input) => {
      const query = financeOperations.getCashSnapshot.input.parse(input);
      return request(`/api/finance/snapshot?${new URLSearchParams(query)}`, financeOperations.getCashSnapshot.output, undefined, "GET");
    },
    createTransaction: (input) => request("/api/finance/transactions", financeOperations.createTransaction.output, financeOperations.createTransaction.input.parse(input)),
    updateTransaction: (input) => {
      const parsed = financeOperations.updateTransaction.input.parse(input);
      return request(`/api/finance/transactions/${encodeURIComponent(parsed.id)}`, financeOperations.updateTransaction.output, parsed, "PATCH");
    },
    settleTransaction: (input) => {
      const parsed = financeOperations.settleTransaction.input.parse(input);
      return request(`/api/finance/transactions/${encodeURIComponent(parsed.id)}/settle`, financeOperations.settleTransaction.output, parsed);
    },
    simulate: (input) => request("/api/finance/scenarios", financeOperations.simulate.output, financeOperations.simulate.input.parse(input)),
    reserveForPayment: (input) => request("/api/finance/reservations", financeOperations.reserveForPayment.output, financeOperations.reserveForPayment.input.parse(input)),
  };
}

export function createAgentClient(transport: Transport, baseUrl = "http://localhost:3000"): AgentPort {
  const request = requester(transport, baseUrl);
  return {
    turn: (input) => request("/api/agent/turn", agentOperations.turn.output, agentOperations.turn.input.parse(input)),
    listNotifications: () => request("/api/agent/notifications", agentOperations.listNotifications.output, undefined, "GET"),
  };
}
