import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {testDatabase} from './finance/database';
import {localAgentGateway} from './agent-gateway';
import {SupabaseTaskRepository} from '@/features/tasks/supabase-repository';
import {createFinancePort} from '@/features/finance/port';
import {runDueTasks} from '@/features/tasks/runner';
import {reminderFixture} from '@/fixtures/demo';

describe('FINAL-01 real SQL task runtime and recovery',()=>{
 let db:Awaited<ReturnType<typeof testDatabase>>,gateway:Awaited<ReturnType<typeof localAgentGateway>>,repo:SupabaseTaskRepository;
 beforeAll(async()=>{
  db=await testDatabase();for(const name of ['002_tasks','003_agent_actions'])await db.sql(await readFile(`supabase/migrations/${name}.sql`,'utf8'));
  const finance=createFinancePort(db.store),p=await finance.previewImport({csv:await readFile('examples/caixa-demo.csv','utf8'),opening_balance_cents:100000,start_date:'2026-10-23'});await finance.confirmImport({preview_id:p.preview_id,idempotency_key:'setup'});
  gateway=await localAgentGateway(db,'sql-task-key');repo=new SupabaseTaskRepository(createClient(gateway.url,'sql-task-key'));
 });
 beforeEach(async()=>{await db.sql('truncate public.agent_notifications,public.agent_task_runs,public.agent_tasks cascade;');});
 afterAll(async()=>{await gateway?.close();await db?.close();});
 async function save(id:string){return repo.saveTask({...reminderFixture,id,target_id:'pay-1',due_at:new Date(Date.now()-1000).toISOString(),dedup_key:`demo:${id}`,eligible_at:undefined});}
 it('round-trips real rows, claims and delivers one notification per occurrence',async()=>{
  const saved=await save('sql-normal');expect((await repo.getTask(saved.id))?.id).toBe(saved.id);expect((await repo.listTasks('demo')).some(t=>t.id===saved.id)).toBe(true);
  const readCommitment=async()=>{const state=await db.store.read();return {status:state.transactions.find(t=>t.id==='pay-1')!.status,snapshot:await createFinancePort(db.store).getCashSnapshot({business_id:'demo',as_of:'2026-10-23'})};};
  expect(await runDueTasks({repository:repo,readCommitment})).toMatchObject({claimed:1,completed:1,notified:1});
  expect(await runDueTasks({repository:repo,readCommitment})).toMatchObject({claimed:0,notified:0});
  expect(await repo.listNotifications('demo')).toHaveLength(1);expect((await repo.getTask(saved.id))?.status).toBe('completed');
 });
 it('cancels a running task and suppresses its in-flight notification',async()=>{
  const saved=await save('sql-cancel'),[claim]=await repo.claimDueTasks(new Date().toISOString(),5,120);
  const current=await repo.getTask(saved.id);await repo.cancelTask(saved.id,current!.version);
  expect(await repo.createNotification({id:'cancelled-notice',business_id:'demo',occurrence_key:claim.occurrence_key,target_id:'pay-1',kind:'payment_reminder',title:'Aviso',explanation:'Teste',proposal_ids:[],created_at:new Date().toISOString(),read_at:null})).toBe(false);
  expect((await repo.getTask(saved.id))?.status).toBe('cancelled');
 });
 it('prevents an expired owner from finishing a newly acquired attempt',async()=>{
  await save('sql-lease');const [old]=await repo.claimDueTasks(new Date().toISOString(),5,120);
  await db.sql("update public.agent_task_runs set lease_until=now()-interval '1 second' where task_id='sql-lease';");
  const [fresh]=await repo.claimDueTasks(new Date().toISOString(),5,120);expect(fresh.attempt).toBe(2);
  await expect(repo.finishOccurrence(old.occurrence_key,{status:'completed',expected_attempt:old.attempt})).rejects.toThrow();
  expect((await repo.getTask('sql-lease'))?.status).toBe('running');
  await repo.finishOccurrence(fresh.occurrence_key,{status:'completed',expected_attempt:fresh.attempt});
  expect((await repo.getTask('sql-lease'))?.status).toBe('completed');
 });
});
