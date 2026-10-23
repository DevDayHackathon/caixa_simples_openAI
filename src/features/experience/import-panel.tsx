'use client';
import React,{useState,useRef} from 'react';
import type { FinancePort } from '@/contracts';
import { money,panelClass } from './cash-panel';
type Preview=Awaited<ReturnType<FinancePort['previewImport']>>;
export function ImportPanel({finance,onAction}:{finance:FinancePort;onAction?:()=>void}) {
 const [csv,setCsv]=useState(''),[balance,setBalance]=useState('0'),[date,setDate]=useState('2026-10-23');
 const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[result,setResult]=useState(''),[busy,setBusy]=useState(false);
 const key=useRef('');
 function invalidate(){setPreview(null);setResult('');setError('');key.current='';}
 async function fileChanged(file?:File){invalidate();setCsv('');if(!file)return;if(file.size>1048576){setError('CSV deve ter até 1 MiB.');return;}try{setCsv(await file.text());}catch{setError('Não foi possível ler o arquivo. Cole o CSV abaixo.');}}
 async function inspect(){setBusy(true);setError('');setResult('');setPreview(null);try{
  if(new TextEncoder().encode(csv).length>1048576)throw Error('CSV deve ter até 1 MiB.');
  if(!/^-?\d+(?:[.,]\d{1,2})?$/.test(balance))throw Error('Informe um saldo com até duas casas decimais.');
  const cents=Math.round(Number(balance.replace(',','.'))*100);if(!Number.isSafeInteger(cents))throw Error('Saldo inválido.');
  const value=await finance.previewImport({csv,opening_balance_cents:cents,start_date:date});setPreview(value);key.current=crypto.randomUUID();
 }catch(e){setError(e instanceof Error?e.message:'Falha na prévia.');}finally{setBusy(false);}}
 async function confirm(){if(!preview||preview.errors.length||busy)return;setBusy(true);setError('');try{const value=await finance.confirmImport({preview_id:preview.preview_id,idempotency_key:key.current});setResult(`${value.inserted_count} movimentações importadas.`);setPreview(null);onAction?.();}catch(e){setError(e instanceof Error?e.message:'Falha na importação.');}finally{setBusy(false);}}
 return <section className={panelClass} aria-label="Importação"><h2 className="text-2xl font-semibold">Traga seus compromissos</h2><p>CSV até 1 MiB e 1.000 linhas. Confira antes de confirmar.</p>
 <fieldset disabled={busy} className="mt-4 grid gap-3"><label>Arquivo CSV<input className="block max-w-full" aria-label="Arquivo CSV" type="file" accept=".csv,text/csv" onChange={e=>void fileChanged(e.target.files?.[0])}/></label>
 <label>Saldo inicial (R$)<input className="block border p-2" value={balance} onChange={e=>{invalidate();setBalance(e.target.value);}}/></label><label>Início do período<input className="block border p-2" type="date" value={date} onChange={e=>{invalidate();setDate(e.target.value);}}/></label>
 <label>Conteúdo CSV<textarea className="block min-h-24 w-full border p-2" value={csv} onChange={e=>{invalidate();setCsv(e.target.value);}}/></label><button className="rounded bg-emerald-800 p-3 text-white disabled:opacity-50" disabled={!csv.trim()} onClick={()=>void inspect()}>Conferir prévia</button></fieldset>
 {error&&<p role="alert">{error}</p>}{result&&<p role="status">{result}</p>}
 {preview&&<div className="mt-4"><h3>Prévia, ainda não importada</h3>{preview.errors.map((e,i)=><p role="alert" key={i}>Linha {e.line} · {e.field}: {e.message}</p>)}<ul>{preview.rows.map(row=><li key={row.id}><span>{row.counterparty}</span> · {row.direction==='in'?'Entrada':'Saída'} · {money(row.amount_cents)} · {row.expected_date}</li>)}</ul><button className="mt-3 border p-3 disabled:opacity-50" disabled={busy||preview.errors.length>0||preview.rows.length===0} onClick={()=>void confirm()}>Confirmar importação</button></div>}
 </section>;
}
