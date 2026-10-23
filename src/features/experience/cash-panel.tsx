import React from 'react';
import type { CashSnapshot } from '@/contracts';
export const money = (cents:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const panelClass = 'mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7';
export function CashPanel({snapshot,error}:{snapshot:CashSnapshot|null;error?:string}) {
  if(error) return <section className={panelClass} role="alert">{error}</section>;
  if(!snapshot) return <section className={panelClass}>Sem dados financeiros. Importe seus compromissos para começar.</section>;
  return <section aria-label="Painel de caixa" className={panelClass}>
    <h2 className="text-2xl font-semibold">Seu caixa, dia a dia</h2>
    <p className="mt-2 text-sm text-slate-600">{snapshot.source==='mock'?'Dados simulados':'Dados informados'} · Atualização: {snapshot.updated_at}</p>
    <p className="text-sm text-slate-600">Saldo calculado sem conexão bancária. Referência: {snapshot.as_of}.</p>
    <dl className="my-6 grid gap-5 sm:grid-cols-3">{([
      ['Saldo atual',snapshot.current_balance_cents],['Entradas realizadas',snapshot.realized_in_cents],['Saídas realizadas',snapshot.realized_out_cents],['Reserva virtual',snapshot.reserved_cents],['Livre',snapshot.free_cents],['Menor saldo previsto',snapshot.minimum_balance_cents],
    ] as const).map(([label,value])=><div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="text-2xl font-semibold">{money(value)}</dd></div>)}</dl>
    <p className="text-sm">Reservas são virtuais. Caixa positivo não equivale a lucro.</p>
    {snapshot.uncertain_receivables.length>0 && <p role="status">{snapshot.uncertain_receivables.length} recebível(is) incerto(s) excluído(s) da previsão.</p>}
    {snapshot.negative_intervals.map(i=><p className="text-red-800" key={i.start_date}>Caixa negativo: {i.start_date} a {i.end_date}</p>)}
    <details className="mt-5"><summary>Previsão de 30 dias</summary><table className="mt-3 w-full text-left"><caption className="sr-only">Saldo de fechamento recebido por data</caption><thead><tr><th>Data</th><th>Saldo previsto</th></tr></thead><tbody>{snapshot.daily_balances.map(day=><tr key={day.date} className={day.balance_cents<0?'text-red-800':''}><td>{day.date}</td><td>{money(day.balance_cents)}</td></tr>)}</tbody></table></details>
  </section>;
}
