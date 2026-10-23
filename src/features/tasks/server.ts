import { createAgentActions } from "@/features/agent/actions";
import { createClient } from "@supabase/supabase-js";
import { createFinancePort } from "@/features/finance/port";
import { configuredFinanceStore } from "@/features/finance/store";
import { SupabaseAgentContextStore } from "@/features/agent/context-store";
import { createOpenAiClient, InMemoryAgentContextStore } from "@/features/agent/turn";
import { InMemoryTaskRepository } from "./schedule";
import { SupabaseTaskRepository } from "./supabase-repository";

const testTasks = new InMemoryTaskRepository();
const testContexts = new InMemoryAgentContextStore();
const testBuckets = new Map<string, number[]>();
export function agentSupabaseClient() {
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key){if(process.env.NODE_ENV==='test')return null;throw Error('Banco não configurado.');}
 if(process.env.VERCEL_ENV==='preview'&&!['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname))throw Error('Preview requer banco local isolado.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function getTaskRepository(){const client=agentSupabaseClient();return client?new SupabaseTaskRepository(client):testTasks;}
export function getAgentContextStore(){const client=agentSupabaseClient();return client?new SupabaseAgentContextStore(client):testContexts;}
export function getServerFinance(){return createFinancePort(configuredFinanceStore());}
export function getAgentRuntime(sessionId:string){
 if(!process.env.OPENAI_MODEL)throw Error('Modelo não configurado.');
 const store=configuredFinanceStore(),tasks=getTaskRepository();
 return {finance:createFinancePort(store),tasks,contextStore:getAgentContextStore(),sessionId,
 actions:createAgentActions(store,tasks,sessionId),client:createOpenAiClient(),model:process.env.OPENAI_MODEL};
}
export async function checkAgentRateLimit(sessionId:string,kind:'conversation'|'audio'='conversation'){
 const client=agentSupabaseClient();
 // Shared demo ceiling supplements per-session quota, so renewing cookies cannot bypass it.
 if(client){for(const scope of [`${kind}:demo`,`${kind}:${sessionId}`]){
  const {data,error}=await client.rpc('consume_agent_rate_limit',{p_scope:scope,p_limit:scope.endsWith(':demo')?30:10});
  if(error)throw error;if(data!==true)return false;
 }return true;}
 const now=Date.now(),scope=`${kind}:${sessionId}`,recent=(testBuckets.get(scope)??[]).filter(t=>now-t<60000);
 if(recent.length>=10)return false;recent.push(now);testBuckets.set(scope,recent);return true;
}
export async function readCommitmentStatus(businessId:string,targetId:string):Promise<'pending'|'settled'|'cancelled'>{
 const client=agentSupabaseClient();if(!client)throw Error('Banco não configurado.');
 const {data,error}=await client.rpc('read_task_commitment_status',{p_business_id:businessId,p_target_id:targetId});
 if(error)throw error;if(!['pending','settled','cancelled'].includes(data))throw Error('Compromisso não encontrado.');return data;
}
