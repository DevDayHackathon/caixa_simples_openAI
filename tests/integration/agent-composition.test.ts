import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { testDatabase } from './finance/database';
import { localRpcGateway } from './finance/gateway';
import { createFinanceHandler } from '@/features/finance/http';
import { readDemoSession } from '@/features/agent/session';
import { getAgentRuntime, getTaskRepository } from '@/features/tasks/server';
import { createAgentTurnService, InMemoryAgentContextStore } from '@/features/agent/turn';
import { InMemoryTaskRepository } from '@/features/tasks/schedule';
import { executeAgentTool } from '@/features/agent/tools';

const secret='shared-real-session-secret-long-enough';
describe('FINAL-02 real module composition',()=>{
 let db:Awaited<ReturnType<typeof testDatabase>>,gateway:Awaited<ReturnType<typeof localRpcGateway>>;
 beforeAll(async()=>{db=await testDatabase();gateway=await localRpcGateway(db,'test-server-key');});
 afterAll(async()=>{await gateway?.close();await db?.close();});afterEach(()=>vi.unstubAllEnvs());
 it('authorizes the actual financial cookie for agent and preserves it on refresh',async()=>{
  const handler=createFinanceHandler({store:()=>db.store,sessionSecret:secret,appOrigin:'https://demo.test'});
  const res=await handler('session',new Request('https://demo.test/api/finance/session',{method:'POST',headers:{origin:'https://demo.test'}}));
  const cookie=res.headers.get('set-cookie')!.split(';')[0];
  const req=new Request('https://demo.test',{headers:{cookie}});const session=readDemoSession(req,secret);
  expect(session?.businessId).toBe('demo');expect(session?.sessionId).toBeTruthy();
  const again=await handler('session',new Request('https://demo.test/api/finance/session',{method:'POST',headers:{origin:'https://demo.test',cookie}}));
  expect(again.headers.get('set-cookie')!.split(';')[0]).toBe(cookie);expect(readDemoSession(req,secret)).toEqual(session);
 });
 it('injects persisted finance into runtime and uses its actual revision for proposals',async()=>{
  vi.stubEnv('SUPABASE_URL',gateway.url);vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-server-key');vi.stubEnv('OPENAI_MODEL','explicit-test-model');vi.stubEnv('OPENAI_API_KEY','test-placeholder');
  await db.sql("update public.finance_state set data=jsonb_set(data,'{version}','7'),version=7;");
  const runtime=getAgentRuntime('real-session');const snapshot=await runtime.finance.getCashSnapshot({business_id:'demo',as_of:'2026-10-23'});
  expect(snapshot.source).toBe('user_data');expect(snapshot.version).toBe(7);
  const create=vi.fn().mockResolvedValueOnce({output_text:'',output:[{type:'function_call',name:'prepare_proposal',call_id:'p',arguments:JSON.stringify({kind:'draft_collection',target_id:'rec-1',reason:'Revisar'})}]}).mockResolvedValueOnce({output_text:'Proposta para revisar.',output:[]});
  const result=await createAgentTurnService({...runtime,actions:undefined,tasks:new InMemoryTaskRepository(),contextStore:new InMemoryAgentContextStore(),now:()=>new Date('2026-10-23T12:00:00Z'),client:{responses:{create}} as never}).turn({message:'Prepare um rascunho',origin:'user',request_id:'request-real'});
  expect(result.snapshot_version).toBe(7);expect(result.proposals[0].based_on_version).toBe(7);
  const tool=await executeAgentTool('get_cash_snapshot','{"as_of":null}',{businessId:'demo',now:'2026-10-23T12:00:00Z',finance:runtime.finance,tasks:new InMemoryTaskRepository(),businessVersion:7});
  expect(tool.output).toMatchObject({version:7,source:'user_data'});
 });
 it('fails closed in production without database configuration',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('SUPABASE_URL','');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');
  expect(()=>getTaskRepository()).toThrow('Banco não configurado');
 });
});
