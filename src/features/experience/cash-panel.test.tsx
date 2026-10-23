import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { f1Snapshot, f1DelayedSnapshot } from '@/fixtures/demo';
import { CashPanel } from './cash-panel';
const html = (props: React.ComponentProps<typeof CashPanel>) => renderToStaticMarkup(<CashPanel {...props}/>);
describe('T15 CASH-01/02 DATA-04', () => {
  it('exibe o saldo recebido e realizados zero de F1', () => {
    const result = html({snapshot:f1Snapshot});
    expect(result).toContain('1.000,00'); expect(result.match(/0,00/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it('exibe os fechamentos recebidos de 25 e 27/10', () => {
    const result = html({snapshot:f1Snapshot});
    expect(result).toContain('2026-10-25'); expect(result).toContain('3.000,00'); expect(result).toContain('1.500,00');
  });
  it('consome livre e reservado sem recalcular', () => {
    const result = html({snapshot:{...f1Snapshot,reserved_cents:12345,free_cents:87654}});
    expect(result).toContain('123,45'); expect(result).toContain('876,54');
  });
  it('identifica fonte, atualização, incerteza e dias negativos', () => {
    const result = html({snapshot:{...f1DelayedSnapshot, uncertain_receivables:[{id:'incerto'} as never]}});
    expect(result).toContain('Dados simulados'); expect(result).toContain(f1Snapshot.updated_at);
    expect(result).toContain('1 recebível(is) incerto(s) excluído(s) da previsão'); expect(result).toContain('2026-10-27 a 2026-10-31'); expect(result).toContain('-R$');
  });
  it('vazio não mostra saldo zero', () => { const result=html({snapshot:null}); expect(result).toContain('Sem dados financeiros'); expect(result).not.toContain('R$'); });
  it('erro não mostra valores antigos como atuais', () => { const result=html({snapshot:f1Snapshot,error:'Falha ao carregar'}); expect(result).toContain('Falha ao carregar'); expect(result).not.toContain('R$'); });
});
it('T15 realizados são verificados em seus próprios indicadores',()=>{
 const result=html({snapshot:f1Snapshot});
 expect(result.match(/Entradas realizadas<\/dt><dd[^>]*>([^<]+)/)?.[1]).toBe('R$\u00a00,00');
 expect(result.match(/Saídas realizadas<\/dt><dd[^>]*>([^<]+)/)?.[1]).toBe('R$\u00a00,00');
});
