import { afterEach, beforeEach, expect, it } from 'vitest';
import { testDatabase } from './database';
import { createFinanceHandler } from '@/features/finance/http';
import { FINANCE_COOKIE, issueFinanceSession } from '@/features/finance/session';
import { f1 } from '@/fixtures/demo';
import { nextState } from '@/features/finance/store';
const secret='workspace-test-secret-at-least-32-characters';
let db:Awaited<ReturnType<typeof testDatabase>>;
beforeEach(async()=>{db=await testDatabase();});
afterEach(async()=>{await db?.close();});
function request(query='',cookie=true){return new Request('http://localhost/api/finance/workspace'+query,{headers:cookie?{cookie:`${FINANCE_COOKIE}=${issueFinanceSession(secret)}`}:{}});}
function handler(){return createFinanceHandler({store:()=>db.store,sessionSecret:secret,appOrigin:'http://localhost',now:()=>new Date('2026-10-23T12:00:00Z')});}
it('INT-01 returns cash and commitments from one persisted revision',async()=>{
 const state=await db.store.read(),next=nextState(state);next.business=f1.business;next.transactions=f1.transactions;
 await db.store.commit(state,next,'seed',{},{});
 const response=await handler()('workspace',request());const {data}=await response.json();
 expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(data.business).toEqual(f1.business);expect(data.transactions).toEqual(f1.transactions);
 expect(data.snapshot).toMatchObject({version:2,current_balance_cents:100000,source:'user_data',as_of:'2026-10-23'});
});
it('INT-04 refuses missing session, malformed query and out-of-horizon date',async()=>{
 expect((await handler()('workspace',request('',false))).status).toBe(401);
 for(const query of ['?as_of=bad','?as_of=2026-10-23&as_of=2026-10-24','?extra=1','?as_of=2027-01-01'])expect((await handler()('workspace',request(query))).status).toBe(422);
});
it('INT-01 retains fixed horizon after expiration with explicit reference',async()=>{
 const h=createFinanceHandler({store:()=>db.store,sessionSecret:secret,appOrigin:'http://localhost',now:()=>new Date('2027-01-01T12:00:00Z')});
 const req=request();req.headers.set('cookie',`${FINANCE_COOKIE}=${issueFinanceSession(secret,new Date('2027-01-01T12:00:00Z').getTime())}`);
 expect((await (await h('workspace',req)).json()).data.snapshot.as_of).toBe('2026-11-21');
});
it('INT-04 does not leak errors or fall back to demo on database failure',async()=>{
 const h=createFinanceHandler({store:()=>{throw Error('private detail');},sessionSecret:secret,appOrigin:'http://localhost'});
 const response=await h('workspace',request());expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain('private detail');
});
