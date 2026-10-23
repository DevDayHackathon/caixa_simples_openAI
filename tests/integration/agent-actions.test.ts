import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { testDatabase } from './finance/database';
import { createFinanceStore, type FinanceStore } from '@/features/finance/store';
import { createFinancePort } from '@/features/finance/port';
import { createAgentActions } from '@/features/agent/actions';
import { InMemoryTaskRepository, createTaskScheduler } from '@/features/tasks/schedule';
const clock=()=>new Date('2026-10-23T12:00:00Z');
describe('FINAL-03 persisted decisions',()=>{
 let db:Awaited<ReturnType<typeof testDatabase>>,store:FinanceStore,tasks:InMemoryTaskRepository,actions:ReturnType<typeof createAgentActions>;
 beforeEach(async()=>{
  db=await testDatabase();for(const name of ['002_tasks','003_agent_actions'])await db.sql(await readFile(`supabase/migrations/${name}.sql`,'utf8'));
  store=createFinanceStore(async(name,args)=>{
   if(!/^[a-z_]+$/.test(name))throw Error('Invalid RPC');
   const params=Object.entries(args).map(([k,v])=>`${k}=>${v===null?'null':"'"+(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")+"'"}`).join(',');
   return JSON.parse(await db.sql(`set role service_role; select coalesce(to_jsonb(public.${name}(${params})),'null'::jsonb);`)||'null');
  });
  const finance=createFinancePort(store,clock),preview=await finance.previewImport({csv:await readFile('examples/caixa-demo.csv','utf8'),opening_balance_cents:100000,start_date:'2026-10-23'});
  await finance.confirmImport({preview_id:preview.preview_id,idempotency_key:'setup'});
  tasks=new InMemoryTaskRepository();actions=createAgentActions(store,tasks,'session',clock);
 });
 afterEach(async()=>{await db?.close();});
 async function prepare(kind='reserve',date:string|null=null){return (await actions.executeTool('prepare_proposal',JSON.stringify({kind,target_id:'pay-1',reason:'Revisão solicitada',amount_cents:50000,expected_date:date})))!.proposal!;}
 const command=(p:Awaited<ReturnType<typeof prepare>>,verb='Aceitar')=>`${verb} proposta ${p.id}, referência ${p.target_id}, versão ${p.based_on_version}.`;
 it('reserves only after explicit acceptance, commits the receipt atomically and replays without duplication',async()=>{
  const p=await prepare();expect((await store.read()).reservations).toHaveLength(0);
  const accepted=await actions.decision(command(p));expect(accepted?.proposals[0].status).toBe('accepted');
  const state=await store.read();expect(state.reservations).toHaveLength(1);expect(state.reservations[0].amount_cents).toBe(50000);expect(state.version).toBe(3);
  expect((await actions.decision(command(p)))?.reply_text).toContain('Nenhum efeito foi repetido');expect((await store.read()).version).toBe(3);
 });
 it('dismisses and requests adjustments without applying financial effects',async()=>{
  const p=await prepare();expect(await actions.decision(command(p,'Ajustar')+' Outra quantia')).toBeNull();
  expect((await actions.decision(command(p,'Dispensar')))?.proposals[0].status).toBe('dismissed');
  expect((await store.read()).reservations).toHaveLength(0);expect((await store.read()).version).toBe(2);
 });
 it('rejects stale revisions, swapped targets and proposals from another session',async()=>{
  const p=await prepare();await expect(actions.decision(command({...p,target_id:'rec-1'}))).rejects.toThrow('Referência');
  await expect(createAgentActions(store,tasks,'other',clock).decision(command(p))).rejects.toThrow('não encontrada');
  await createFinancePort(store,clock).updateTransaction({id:'rec-1',expected_version:1,patch:{description:'nova revisão'}});
  await expect(actions.decision(command(p))).rejects.toThrow('desatualizada');expect((await store.read()).reservations).toHaveLength(0);
 });
 it('changes a forecast and its accepted receipt in one transaction',async()=>{
  const p=await prepare('change_expected_date','2026-10-30');await actions.decision(command(p));
  expect((await store.read()).transactions.find(t=>t.id==='pay-1')).toMatchObject({expected_date:'2026-10-30',version:2});
  const saved=await store.rpc('read_agent_proposal',{p_session:'session',p_id:p.id}) as {proposal:{status:string}};expect(saved.proposal.status).toBe('accepted');
 });
 it('runs simulations without changing finance and keeps collection approval a draft',async()=>{
  const simulation=await actions.executeTool('prepare_proposal',JSON.stringify({kind:'simulate',target_id:'rec-1',reason:'atraso',amount_cents:null,expected_date:'2026-11-01'}));
  expect(simulation!.output).toMatchObject({applied:false,simulation:{projected:{minimum_balance_cents:-50000}}});
  const p=await prepare('draft_collection');expect((await actions.decision(command(p)))?.reply_text).toContain('Nada foi enviado');expect((await store.read()).version).toBe(2);
 });
 it('validates feed identity, persists read state and never presumes a payment from resolving an alert',async()=>{
  const task=await createTaskScheduler(tasks).schedule({business_id:'demo',target_id:'pay-1',kind:'payment_reminder',due_at:'2026-10-24T12:00:00Z',now:clock().toISOString(),stop_condition:'pago',scheduling_reason:'revisar',schedule_source:'user'});
  const key=`${task.id}:${task.due_at}`;
  await db.sql(`insert into public.agent_notifications(id,business_id,occurrence_key,target_id,kind,title,explanation) values('notice','demo','${key}','pay-1','payment_reminder','Lembrete','pendente');`);
  const text=(verb:string)=>`${verb} a iniciativa notice, ocorrência ${key}, compromisso pay-1.`;
  expect((await actions.noticeAction(text('Marcar resolvido')))?.reply_text).toContain('ainda está pendente');
  expect((await store.read()).transactions.find(t=>t.id==='pay-1')!.status).toBe('pending');
  await actions.noticeAction(text('Marcar como lida'));expect(await db.sql("select read_at is not null from public.agent_notifications where id='notice';")).toBe('t');
  await actions.noticeAction(text('Cancelar acompanhamento'));expect((await tasks.getTask(task.id))!.status).toBe('cancelled');
 });
});
