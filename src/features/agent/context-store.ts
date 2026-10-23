import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentContextStore, ConversationEntry } from "./turn";

export class SupabaseAgentContextStore implements AgentContextStore {
  constructor(private readonly client: SupabaseClient) {}
  async load(sessionId: string) {
    const { data, error } = await this.client.from("agent_contexts").select("history").eq("session_id", sessionId).maybeSingle();
    if (error) throw error;
    return Array.isArray(data?.history) ? data.history as ConversationEntry[] : [];
  }
  async append(sessionId: string, entries: ConversationEntry[]) {
    const { data, error } = await this.client.rpc("append_agent_context", { p_session_id: sessionId, p_entries: entries });
    if (error) throw error;
    void data;
  }
}
