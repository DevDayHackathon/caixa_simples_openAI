'use client';
import React,{useEffect,useState,useRef,useCallback} from 'react';
import type {AgentPort,Notification} from '@/contracts';
import {panelClass} from './cash-panel';
export function Inbox({agent,refreshKey=0,onAction}:{agent:AgentPort;refreshKey?:number;onAction?:()=>void}){
 const [items,setItems]=useState<Notification[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[reply,setReply]=useState(''),[busy,setBusy]=useState(false),[dates,setDates]=useState<Record<string,string>>({}),[history,setHistory]=useState(false),[page,setPage]=useState(0);
 const mounted=useRef(false),sequence=useRef(0),pending=useRef<{text:string;id:string}|null>(null);
 const reload=useCallback(()=>{
  const seq=++sequence.current;
  return agent.listNotifications().then(data=>{
   if(!mounted.current||seq!==sequence.current)return;
   setError('');
   const seen=new Set<string>();
   setItems(data.filter(n=>{if(seen.has(n.occurrence_key))return false;seen.add(n.occurrence_key);return true;}));
   setPage(0);
  },e=>{if(mounted.current&&seq===sequence.current)setError(e instanceof Error?e.message:'Não foi possível carregar as iniciativas.');})
  .finally(()=>{if(mounted.current&&seq===sequence.current)setLoading(false);});
 },[agent]);
 useEffect(()=>{mounted.current=true;void reload();const focus=()=>{setLoading(true);void reload();};window.addEventListener('focus',focus);return()=>{mounted.current=false;window.removeEventListener('focus',focus);};},[reload,refreshKey]);
 async function act(item:Notification,action:string){if(busy)return;let suffix='';if(action==='Adiar'){const date=dates[item.id];if(!date)return;const value=new Date(`${date}:00-03:00`);if(Number.isNaN(value.getTime())){setError('Escolha uma data e horário válidos.');return;}suffix=` Novo horário: ${value.toISOString()} (America/Sao_Paulo).`;}
 const text=`${action} a iniciativa ${item.id}, ocorrência ${item.occurrence_key}, compromisso ${item.target_id}.${suffix}`;const request=pending.current?.text===text?pending.current:{text,id:crypto.randomUUID()};pending.current=request;setBusy(true);setError('');setReply('');try{const response=await agent.turn({message:text,origin:'user',request_id:request.id});if(mounted.current){setReply(response.reply_text);pending.current=null;await reload();onAction?.();}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Ação não confirmada.');}finally{if(mounted.current)setBusy(false);}}
 const visible=history?items.slice(page*20,page*20+20):items.slice(0,3);
 return <section className={panelClass} aria-label="Iniciativas programadas"><h2 className="text-2xl font-semibold">O caixa continua acompanhado</h2><p>Avisos de tarefas programadas, separados das suas mensagens. Verificação a cada cinco minutos; a entrega pode atrasar.</p><p className="text-sm">Até três prioridades, na ordem recebida do agente. Atualização ao abrir, focar ou concluir ações.</p><div className="my-3 flex gap-3"><button className="border p-2" onClick={()=>{setLoading(true);void reload();}} disabled={loading}>Atualizar iniciativas</button><button className="border p-2" onClick={()=>{setHistory(!history);setPage(0);}}>{history?'Ver prioridades':'Ver histórico'}</button></div>
 {loading&&<p role="status">Carregando iniciativas…</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!items.length&&<p>Nenhuma iniciativa por enquanto.</p>}{reply&&<p role="status">{reply}</p>}
 {visible.map(item=><article className="my-4 rounded-lg border border-amber-200 bg-amber-50 p-4" key={item.occurrence_key}><p className="text-xs font-semibold uppercase tracking-wide">Tarefa programada</p><h3 className="mt-2 font-semibold">{item.title}</h3><p className="my-2 break-words">{item.explanation}</p><p className="text-sm">{item.created_at} · <span>{item.read_at?'Lida':'Não lida'}</span></p><fieldset disabled={busy||loading} className="mt-3 flex flex-wrap gap-2"><button className="border p-2" disabled={!!item.read_at} onClick={()=>void act(item,'Marcar como lida')}>Marcar como lida</button><button className="border p-2" onClick={()=>void act(item,'Cancelar acompanhamento')}>Cancelar acompanhamento</button><button className="border p-2" onClick={()=>void act(item,'Marcar resolvido')}>Marcar resolvido</button><label>Adiar {item.id} para (São Paulo)<input className="block max-w-full border p-2" type="datetime-local" value={dates[item.id]??''} onChange={e=>setDates({...dates,[item.id]:e.target.value})}/></label><button className="border p-2" disabled={!dates[item.id]} onClick={()=>void act(item,'Adiar')}>Adiar</button></fieldset></article>)}
 {history&&<nav className="flex flex-wrap items-center gap-3" aria-label="Paginação de iniciativas"><button className="border p-2" disabled={page===0} onClick={()=>setPage(page-1)}>Página anterior</button><span>Página {page+1}</span><button className="border p-2" disabled={(page+1)*20>=items.length} onClick={()=>setPage(page+1)}>Próxima página</button></nav>}
 </section>;
}
