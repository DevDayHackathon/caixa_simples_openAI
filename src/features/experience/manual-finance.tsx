'use client';
import React, { useRef, useState } from 'react';
import type { FinancePort, Transaction } from '@/contracts';
import { money, panelClass } from './cash-panel';
export function ManualFinance({ finance, transactions, date, onAction }: { finance: FinancePort; transactions: Transaction[]; date: string; onAction: () => void }) {
 const [direction,setDirection]=useState<'in'|'out'>('out'),[amount,setAmount]=useState(''),[counterparty,setCounterparty]=useState(''),[description,setDescription]=useState(''),[due,setDue]=useState(date);
 const [target,setTarget]=useState(''),[settled,setSettled]=useState(date),[reserve,setReserve]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const keys=useRef(new Map<string,string>());
 function cents(value:string){if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))throw Error('Informe um valor positivo com até duas casas decimais.');const number=Math.round(Number(value.replace(',','.'))*100);if(!Number.isSafeInteger(number)||number<=0)throw Error('Valor inválido.');return number;}
 function key(operation:string,input:unknown){const payload=operation+JSON.stringify(input);if(!keys.current.has(payload))keys.current.set(payload,crypto.randomUUID());return keys.current.get(payload)!;}
 async function execute(operation:'create'|'settle'|'reserve') {
  if(busy||!confirm)return;setBusy(true);setError('');setNotice('');
  try {
   if(operation==='create'){
    const transaction={business_id:'demo',direction,amount_cents:cents(amount),due_date:due,expected_date:due,counterparty,description};
    await finance.createTransaction({transaction,idempotency_key:key('create',transaction)});
    setAmount('');setDescription('');setCounterparty('');
   }else{
    const tx=transactions.find(t=>t.id===target&&t.status==='pending');if(!tx)throw Error('Selecione um compromisso pendente.');
    if(operation==='settle'){const input={id:tx.id,expected_version:tx.version,settled_date:settled};await finance.settleTransaction({...input,idempotency_key:key('settle',input)});}
    else {const input={target_id:tx.id,expected_version:tx.version,amount_cents:cents(reserve)};await finance.reserveForPayment({...input,idempotency_key:key('reserve',input)});}
   }
   keys.current.clear();setNotice('Ação salva.');setConfirm(false);onAction();
  }catch(e){setError(e instanceof Error?e.message:'Ação não confirmada. Atualize o caixa antes de tentar novamente.');}finally{setBusy(false);}
 }
 const tx=transactions.find(t=>t.id===target&&t.status==='pending');
 return <section className={panelClass+" folego-tool-content"} aria-label="Ações financeiras manuais"><h2>Gerenciar compromissos</h2><p>Dados fictícios. Reservas são virtuais; estas ações não movimentam uma conta bancária.</p>
 <fieldset disabled={busy} className="grid gap-3"><legend>Novo compromisso</legend>
 <label>Direção<select value={direction} onChange={e=>{setDirection(e.target.value as 'in'|'out');setConfirm(false);}}><option value="out">Saída</option><option value="in">Entrada</option></select></label>
 <label>Valor (R$)<input value={amount} inputMode="decimal" onChange={e=>{setAmount(e.target.value);setConfirm(false);}}/></label>
 <label>Cliente ou fornecedor<input maxLength={200} value={counterparty} onChange={e=>{setCounterparty(e.target.value);setConfirm(false);}}/></label>
 <label>Descrição<input maxLength={1000} value={description} onChange={e=>{setDescription(e.target.value);setConfirm(false);}}/></label>
 <label>Vencimento e previsão<input type="date" value={due} onChange={e=>{setDue(e.target.value);setConfirm(false);}}/></label>
 <label className="folego-manual-confirm"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Confirmo a ação financeira selecionada</label>
 <button className="folego-btn" disabled={!confirm||!amount||!counterparty.trim()||!description.trim()||!due} onClick={()=>void execute('create')}>Criar compromisso</button>
 <hr/><label>Compromisso pendente<select value={target} onChange={e=>{setTarget(e.target.value);setConfirm(false);}}><option value="">Selecione</option>{transactions.filter(t=>t.status==='pending').map(t=><option key={t.id} value={t.id}>{t.description} · {t.counterparty} · {money(t.amount_cents)}</option>)}</select></label>
 <label>Data de liquidação<input type="date" value={settled} onChange={e=>{setSettled(e.target.value);setConfirm(false);}}/></label>
 <button className="folego-btn" disabled={!confirm||!tx||!settled} onClick={()=>void execute('settle')}>Confirmar liquidação</button>
 <label>Valor da reserva virtual (R$)<input inputMode="decimal" value={reserve} onChange={e=>{setReserve(e.target.value);setConfirm(false);}}/></label>
 <button className="folego-btn" disabled={!confirm||!tx||tx.direction!=='out'||!reserve} onClick={()=>void execute('reserve')}>Confirmar reserva virtual</button>
 </fieldset>{busy&&<p role="status">Salvando ação…</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}</section>;
}
