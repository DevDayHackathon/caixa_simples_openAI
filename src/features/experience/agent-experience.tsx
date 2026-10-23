'use client';
import React,{useEffect,useMemo,useState} from 'react';
import {createAgentClient} from '@/adapters/http';
import {Conversation} from './conversation';
import {Inbox} from './inbox';
export function AgentExperience({snapshotVersion,onFinancialAction}:{snapshotVersion:number;onFinancialAction:()=>void}){
 const [status,setStatus]=useState<{configured:boolean;voice:boolean}|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const agent=useMemo(()=>createAgentClient(req=>fetch(req),typeof window==='undefined'?'http://localhost':window.location.origin),[]);
 useEffect(()=>{
  let active=true;
  fetch('/api/agent/status',{cache:'no-store',credentials:'same-origin'}).then(async response=>{
   if(!response.ok)throw Error();const body=await response.json();
   if(typeof body.data?.configured!=='boolean'||typeof body.data?.voice!=='boolean')throw Error();
   if(active){setStatus(body.data);setError('');}
  }).catch(()=>{if(active){setStatus(null);setError('Não foi possível verificar o agente. Atualize o caixa e a sessão.');}});
  return()=>{active=false;};
 },[]);
 const afterAction=()=>{setRevision(n=>n+1);onFinancialAction();};
 return <section className="folego-wrap" aria-label="Agente conectado ao caixa">
  <h2>Acompanhamento do caixa persistido</h2>
  {error&&<p role="alert">{error}</p>}
  {!status&&!error&&<p role="status">Verificando configuração do agente…</p>}
  {status&&!status.configured&&<p>Configure OpenAI e Supabase no servidor para ativar conversa, iniciativas e voz. As ações financeiras manuais continuam disponíveis.</p>}
  {status?.configured&&<><Conversation agent={agent} snapshotVersion={snapshotVersion} onAction={afterAction} voiceActive={status.voice}/>
   {!status.voice&&<p>Voz indisponível: configure os modelos de transcrição e síntese. A conversa por texto está ativa.</p>}
   <Inbox agent={agent} refreshKey={revision} onAction={afterAction}/></>}
 </section>;
}
