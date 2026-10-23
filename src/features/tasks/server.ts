import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMockFinancePort } from "@/adapters/mock";
import { SupabaseAgentContextStore } from "@/features/agent/context-store";
import { createOpenAiClient, InMemoryAgentContextStore } from "@/features/agent/turn";
import { InMemoryTaskRepository } from "./schedule";
import { SupabaseTaskRepository } from "./supabase-repository";

const globalServer = globalThis as typeof globalThis & {
  __caixaTaskRepository?: InMemoryTaskRepository | SupabaseTaskRepository;
  __caixaContextStore?: InMemoryAgentContextStore | SupabaseAgentContextStore;
  __caixaSupabaseClient?: SupabaseClient;
  __caixaRateBuckets?: Map<string, number[]>;
};

function supabaseClient() {
  if (globalServer.__caixaSupabaseClient) return globalServer.__caixaSupabaseClient;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  globalServer.__caixaSupabaseClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return globalServer.__caixaSupabaseClient;
}

export function getTaskRepository() {
  if (globalServer.__caixaTaskRepository) return globalServer.__caixaTaskRepository;
  const client = supabaseClient();
  globalServer.__caixaTaskRepository = client ? new SupabaseTaskRepository(client) : new InMemoryTaskRepository();
  return globalServer.__caixaTaskRepository;
}

export function getAgentContextStore() {
  if (globalServer.__caixaContextStore) return globalServer.__caixaContextStore;
  const client = supabaseClient();
  globalServer.__caixaContextStore = client ? new SupabaseAgentContextStore(client) : new InMemoryAgentContextStore();
  return globalServer.__caixaContextStore;
}

export function getAgentRuntime(sessionId: string) {
  return { finance: createMockFinancePort(), tasks: getTaskRepository(), contextStore: getAgentContextStore(),
    sessionId, client: createOpenAiClient(), model: process.env.OPENAI_MODEL };
}

export async function checkAgentRateLimit(sessionId: string) {
  const client = supabaseClient();
  if (client) {
    const { data, error } = await client.rpc("consume_agent_rate_limit", { p_scope: sessionId, p_limit: 10 });
    if (error) throw error;
    return data === true;
  }
  const now = Date.now(); const buckets = globalServer.__caixaRateBuckets ??= new Map();
  const recent = (buckets.get(sessionId) ?? []).filter((time: number) => now - time < 60_000);
  if (recent.length >= 10) { buckets.set(sessionId, recent); return false; }
  recent.push(now); buckets.set(sessionId, recent); return true;
}

export async function readCommitmentStatus(businessId: string, targetId: string): Promise<"pending" | "settled" | "cancelled"> {
  const client = supabaseClient();
  if (!client) throw new Error("Persistência Supabase não configurada; executor indisponível no modo mock.");
  const { data, error } = await client.rpc("read_task_commitment_status", { p_business_id: businessId, p_target_id: targetId });
  if (error) throw error;
  if (data !== "pending" && data !== "settled" && data !== "cancelled") throw new Error("Compromisso não encontrado na FinancePort integrada.");
  return data;
}
