import { z } from "zod";
import { businessSchema, transactionSchema, reservationSchema, versionSchema, instantSchema } from "@/contracts";
import { createClient } from "@supabase/supabase-js";

export const financeStateSchema = z.strictObject({
  business: businessSchema, transactions: z.array(transactionSchema), reservations: z.array(reservationSchema),
  version: versionSchema, updated_at: instantSchema,
});
export type FinanceState = z.infer<typeof financeStateSchema>;
export class FinanceError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export function createFinanceStore(rpc: Rpc) {
  return {
    rpc,
    async read() { return financeStateSchema.parse(await rpc("finance_read", { p_business_id: "demo" })); },
    async replay(operation: string, key: string, input: unknown) {
      return rpc("finance_replay", { p_operation: operation, p_key: key, p_input: input });
    },
    async commit(before: FinanceState, next: FinanceState, operation: string, input: unknown, result: unknown, key: string | null = null) {
      financeStateSchema.parse(next);
      return rpc("finance_commit", { p_business_id: "demo", p_expected_version: before.version,
        p_state: next, p_operation: operation, p_input: input, p_result: result, p_key: key });
    },
  };
}
export type FinanceStore = ReturnType<typeof createFinanceStore>;

export function createSupabaseFinanceStore(url: string, key: string) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return createFinanceStore(async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) {
      const code = error.message;
      if (code === "CONFLICT" || code === "IDEMPOTENCY_CONFLICT") throw new FinanceError(409, code, "Recarregue o contexto ou use uma nova chave.");
      if (code === "FORBIDDEN") throw new FinanceError(403, code, "Empresa fora do escopo.");
      throw new FinanceError(503, "DATABASE_UNAVAILABLE", "Banco indisponível. Tente novamente.");
    }
    return data;
  });
}

export function nextState(state: FinanceState): FinanceState {
  return { ...structuredClone(state), version: state.version + 1, updated_at: new Date().toISOString() };
}
