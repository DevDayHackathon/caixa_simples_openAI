import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { testDatabase } from "./finance/database";

describe('FINAL-01 real agent migrations', () => {
 let db: Awaited<ReturnType<typeof testDatabase>>;
 beforeAll(async()=>{db=await testDatabase(); await db.sql(await readFile('supabase/migrations/002_tasks.sql','utf8'));});
 afterAll(async()=>{await db?.close();});
 it('applies the full migration and uses a persisted shared rate limit',async()=>{
  expect(await db.sql("select public.consume_agent_rate_limit('scope',1); select public.consume_agent_rate_limit('scope',1);")).toBe('t\nf');
 });
 it('keeps the latest twenty conversation entries as an array across many turns',async()=>{
  for(let n=0;n<12;n++)await db.sql(`select public.append_agent_context('session','[{"role":"user","content":"${n}"},{"role":"assistant","content":"reply${n}"}]');`);
  const history=JSON.parse(await db.sql("select history from public.agent_contexts where session_id='session';"));
  expect(history).toHaveLength(20);expect(history[0].content).toBe('2');expect(history.at(-1).content).toBe('reply11');
 });
 it('reads financial commitment status and cancels related tasks in the settlement transaction',async()=>{
  await db.sql(`insert into public.agent_tasks(id,business_id,target_id,kind,due_at,status,version,dedup_key,stop_condition,timezone,scheduling_reason,schedule_source) values('task','demo','pay','payment_reminder',now(),'pending',1,'dedup','pago','America/Sao_Paulo','revisar','user');`);
  await db.sql(`update public.finance_state set data=jsonb_set(data,'{transactions}','[{"id":"pay","status":"pending","version":1}]');`);
  expect(await db.sql("select public.read_task_commitment_status('demo','pay');")).toBe('pending');
  await db.sql(`update public.finance_state set data=jsonb_set(data,'{transactions}','[{"id":"pay","status":"settled","version":2}]');`);
  expect(await db.sql("select status from public.agent_tasks where id='task';")).toBe('cancelled');
  expect(await db.sql("select public.read_task_commitment_status('demo','pay');")).toBe('settled');
 });
 it('does not dispatch when nothing is eligible, without depending on Vault or network',async()=>{
  expect(await db.sql('select public.dispatch_due_agent_tasks();')).toBe('f');
 });
});
