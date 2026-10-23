'use client';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFinanceClient } from '@/adapters/http';
import { workspaceSchema, type FinanceWorkspace } from '@/features/finance/workspace';
import { errorEnvelopeSchema } from '@/contracts';
import { FolegoDashboard } from './folego-dashboard';
import { AgentExperience } from './agent-experience';
import { ManualFinance } from './manual-finance';

export function PersistedCash() {
 const [data,setData]=useState<FinanceWorkspace|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 const sequence=useRef(0);
 // Resolution happens on invocation in the browser, never against a build-time origin.
 const finance=useMemo(()=>createFinanceClient(request=>fetch(request),typeof window==='undefined'?'http://localhost':window.location.origin),[]);
 const reload=useCallback(()=>{
  const revision=++sequence.current;
  return fetchWorkspace().then(parsed=>{if(revision===sequence.current){setData(parsed);setError('');}},e=>{if(revision===sequence.current){setData(null);setError(e instanceof Error?e.message:'Não foi possível carregar o caixa.');}}).finally(()=>{if(revision===sequence.current)setBusy(false);});
 },[]);
 function refresh(){setBusy(true);setError('');void reload();}
 useEffect(()=>{const generation=sequence;void reload();return()=>{generation.current++;};},[reload]);
 return <div className="folego-app"><div className="folego-wrap folego-persisted-header"><Link href="/">Voltar à prévia simulada</Link><h1>Caixa persistido da empresa demonstrativa</h1><p>Use somente dados fictícios. Saldo calculado sem conexão bancária.</p><button className="folego-btn" disabled={busy} onClick={refresh}>Atualizar caixa e sessão</button>{busy&&<p role="status">Carregando caixa…</p>}{error&&<p role="alert" aria-label="Falha no caixa">{error} Tente atualizar o caixa e a sessão. Nenhuma ação é repetida automaticamente.</p>}{data&&<p>Data de referência: {data.snapshot.as_of}. Horizonte fixo: {data.business.start_date} a {data.snapshot.daily_balances.at(-1)!.date}.</p>}</div>
 {data&&!busy&&<FolegoDashboard key={data.snapshot.version} snapshot={data.snapshot} transactions={data.transactions} reserveThreshold={data.business.reserve_threshold_cents} financePort={finance} onFinancialAction={refresh} controls={<ManualFinance finance={finance} transactions={data.transactions} date={data.snapshot.as_of} onAction={refresh}/>}/>}
 {data&&!busy&&<AgentExperience snapshotVersion={data.snapshot.version} onFinancialAction={()=>{void reload();}}/>}</div>;
}

async function fetchWorkspace() {
 const session=await fetch('/api/finance/session',{method:'POST',credentials:'same-origin'});
 if(!session.ok)throw Error('Sessão indisponível. Verifique a configuração do servidor.');
 const response=await fetch('/api/finance/workspace',{credentials:'same-origin',cache:'no-store'});
 const body:unknown=await response.json();
 if(!response.ok){const failure=errorEnvelopeSchema.parse(body);throw Error(failure.error.message);}
 return workspaceSchema.parse((body as {data:unknown}).data);
}
