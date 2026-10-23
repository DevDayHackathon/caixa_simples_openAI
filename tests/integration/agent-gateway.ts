import { createServer } from 'node:http';
import type { testDatabase } from './finance/database';
const quote=(value:unknown)=>value===null?'null':"'"+(typeof value==='object'?JSON.stringify(value):String(value)).replaceAll("'","''")+"'";
// Test-only PostgREST transport over real local SQL, never application persistence.
export async function localAgentGateway(db:Awaited<ReturnType<typeof testDatabase>>,key:string){
 const server=createServer(async(req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.headers.authorization!==`Bearer ${key}`){res.writeHead(403);res.end('{}');return;}
  try{
   const url=new URL(req.url!,'http://local'),parts:Buffer[]=[];for await(const part of req)parts.push(Buffer.from(part));
   const body=parts.length?JSON.parse(Buffer.concat(parts).toString()):null;
   let output:string;
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    const name=url.pathname.slice('/rest/v1/rpc/'.length);if(!/^[a-z_]+$/.test(name))throw Error('Invalid RPC');
    const args=Object.entries(body??{}).map(([k,v])=>{if(!/^p_[a-z_]+$/.test(k))throw Error('Invalid argument');return `${k}=>${quote(v)}`;}).join(',');
    output=await db.sql(`set role service_role; select coalesce(to_jsonb(public.${name}(${args})),'null'::jsonb);`);
   }else{
    const table=url.pathname.slice('/rest/v1/'.length);if(!['agent_contexts','agent_tasks','agent_notifications'].includes(table))throw Error('Invalid table');
    const conditions=[...url.searchParams].filter(([k])=>!['select','order','limit'].includes(k)).map(([k,v])=>{if(!['id','business_id','session_id'].includes(k)||!v.startsWith('eq.'))throw Error('Invalid filter');return `${k}=${quote(v.slice(3))}`;}).join(' and ')||'true';
    let query:string;
    if(req.method==='GET')query=`select * from public.${table} where ${conditions} ${table==='agent_notifications'?'order by created_at desc limit 20':''}`;
    else if(req.method==='PATCH'&&table==='agent_tasks'&&body.context)query=`update public.agent_tasks set context=${quote(body.context)} where ${conditions} returning *`;
    else if(req.method==='POST'&&table==='agent_notifications')query=`insert into public.agent_notifications select * from jsonb_populate_record(null::public.agent_notifications,${quote(body)}) returning *`;
    else throw Error('Invalid operation');
    output=await db.sql(`set role service_role; with rows as (${query}) select coalesce(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) from rows;`);
    if(req.headers.accept?.includes('vnd.pgrst.object'))output=JSON.stringify(JSON.parse(output)[0]??null);
   }
   res.end(output||'null');
  }catch(error){res.writeHead(400);res.end(JSON.stringify({code:'P0001',message:String(error),details:null,hint:null}));}
 });
 await new Promise<void>(yes=>server.listen(0,'127.0.0.1',yes));const address=server.address();if(!address||typeof address==='string')throw Error('No port');
 return {url:`http://127.0.0.1:${address.port}`,async close(){server.closeAllConnections();await new Promise<void>((yes,no)=>server.close(err=>err?no(err):yes()));}};
}
