import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {spawn,type ChildProcess} from 'node:child_process';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {testDatabase} from '../integration/finance/database';
import {localAgentGateway} from '../integration/agent-gateway';
import {saoPauloDate} from '@/features/finance/port';
import {addDays} from '@/features/finance/dates';

test('FINAL-04 browser → real agent routes → SQL proposal acceptance → persisted cash',async({page})=>{
 test.setTimeout(90000);
 const db=await testDatabase();let child:ChildProcess|undefined,gateway:Awaited<ReturnType<typeof localAgentGateway>>|undefined;
 let providerCalls=0;
 const provider=createServer(async(req,res)=>{
  const parts:Buffer[]=[];for await(const part of req)parts.push(Buffer.from(part));const body=JSON.parse(Buffer.concat(parts).toString());providerCalls++;
  const hasToolOutput=body.input.some((item:{type?:string})=>item.type==='function_call_output');
  const output=hasToolOutput?[{type:'message',id:'msg_test',role:'assistant',status:'completed',content:[{type:'output_text',text:'Preparei uma reserva virtual para revisão.',annotations:[]}]}]:[{type:'function_call',id:'fc_test',call_id:'call_reserve',name:'prepare_proposal',status:'completed',arguments:JSON.stringify({kind:'reserve',target_id:'pay-1',reason:'Pedido de reserva',amount_cents:50000,expected_date:null})}];
  res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'resp_test',object:'response',status:'completed',model:'local-test-model',output}));
 });
 try{
  for(const name of ['002_tasks','003_agent_actions'])await db.sql(await readFile(`supabase/migrations/${name}.sql`,'utf8'));
  gateway=await localAgentGateway(db,'e2e-server-key');await new Promise<void>(yes=>provider.listen(0,'127.0.0.1',yes));
  const providerAddress=provider.address();if(!providerAddress||typeof providerAddress==='string')throw Error('No provider port');
  const probe=createServer();await new Promise<void>(yes=>probe.listen(0,'127.0.0.1',yes));const address=probe.address();if(!address||typeof address==='string')throw Error('No port');await new Promise<void>(yes=>probe.close(()=>yes()));
  const origin=`http://127.0.0.1:${address.port}`,today=saoPauloDate(new Date());let log='';
  child=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(address.port)],{env:{...process.env,NODE_ENV:'production',VERCEL_ENV:'preview',APP_ORIGIN:origin,SESSION_SECRET:'e2e-shared-session-secret-at-least-32-chars',SUPABASE_URL:gateway.url,SUPABASE_SERVICE_ROLE_KEY:'e2e-server-key',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'local-test-model',OPENAI_BASE_URL:`http://127.0.0.1:${providerAddress.port}/v1`},stdio:['ignore','pipe','pipe']});
  child.stdout?.on('data',part=>{log=(log+part).slice(-5000);});child.stderr?.on('data',part=>{log=(log+part).slice(-5000);});
  for(let n=0;n<120;n++){if(child.exitCode!==null)throw Error(log);try{if((await fetch(origin+'/api/demo/snapshot')).ok)break;}catch{}await new Promise(yes=>setTimeout(yes,250));}
  await page.goto(origin+'/caixa');await expect(page.getByTestId('current-balance')).toHaveText(/0,00/);
  const headers={origin};
  const csv=(await readFile('examples/caixa-demo.csv','utf8')).replaceAll('2026-10-25',addDays(today,2)).replaceAll('2026-10-27',addDays(today,4));
  const preview=await page.request.post(origin+'/api/finance/import/preview',{headers,data:{csv,opening_balance_cents:100000,start_date:today}});expect(preview.status()).toBe(200);
  const confirmed=await page.request.post(origin+'/api/finance/import/confirm',{headers,data:{preview_id:(await preview.json()).data.preview_id,idempotency_key:'integrated-e2e'}});expect(confirmed.status()).toBe(200);
  await page.reload();await expect(page.getByTestId('current-balance')).toHaveText(/1\.000,00/);
  const conversation=page.getByRole('region',{name:'Conversa',exact:true});
  await conversation.getByLabel('Sua mensagem').fill('Prepare uma reserva virtual de R$ 500 para pay-1.');await conversation.getByRole('button',{name:'Enviar mensagem'}).click();
  await expect(conversation.getByText('Preparei uma reserva virtual para revisão.')).toBeVisible();await expect(conversation.getByRole('button',{name:'Aceitar',exact:true})).toBeVisible();
  expect((await db.store.read()).reservations).toHaveLength(0);
  await conversation.getByRole('button',{name:'Aceitar',exact:true}).click();await expect(conversation.getByText('Reserva virtual registrada no caixa.')).toBeVisible();
  expect((await db.store.read()).reservations).toMatchObject([{transaction_id:'pay-1',amount_cents:50000,status:'active'}]);expect(providerCalls).toBe(2);
  await page.reload();await expect(page.getByTestId('current-balance')).toHaveText(/1\.000,00/);expect((await db.store.read()).version).toBe(3);
  await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{
  if(child&&child.exitCode===null){const running=child;await new Promise<void>(yes=>{running.once('exit',()=>yes());running.kill();});}
  provider.closeAllConnections();if(provider.listening)await new Promise<void>(yes=>provider.close(()=>yes()));await gateway?.close();await db.close();
 }
});
