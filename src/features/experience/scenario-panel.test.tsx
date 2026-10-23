// @vitest-environment jsdom
import React from 'react';
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {createMockFinancePort} from '@/adapters/mock';
import {f1,f1Snapshot,f1DelayedSnapshot} from '@/fixtures/demo';
import {ScenarioPanel} from './scenario-panel';
afterEach(cleanup);
const result={scenario_id:'s1',baseline:f1Snapshot,projected:f1DelayedSnapshot,affected_dates:['2026-10-27'],deficit_intervals:f1DelayedSnapshot.negative_intervals};
function setup(overrides:Parameters<typeof createMockFinancePort>[0]={}){render(<ScenarioPanel finance={createMockFinancePort(overrides)} snapshot={f1Snapshot} transactions={f1.transactions}/>);}
it('T17 CASH-03 mostra mínimo e intervalo vindos da simulação',async()=>{setup({simulate:async()=>result});fireEvent.click(screen.getByText('Simular atraso'));await screen.findByText('Hipótese');expect(screen.getByText(/2026-10-27 a 2026-10-31/)).toBeTruthy();expect(screen.getByTestId('scenario-minimum').textContent).toMatch(/-R\$\s*500,00/);expect(screen.getByTestId('scenario-day-2026-11-01').textContent).toMatch(/1.500,00/);});
it('T17 CASH-04 simular só envia override com versão base',async()=>{const simulate=vi.fn(async()=>result),update=vi.fn();setup({simulate,updateTransaction:update});fireEvent.click(screen.getByText('Simular atraso'));await screen.findByText('Hipótese');expect(simulate.mock.calls[0]).toEqual([{overrides:[{transaction_id:'rec-1',expected_date:'2026-11-01'}],base_version:1}]);expect(update).not.toHaveBeenCalled();expect(f1.transactions[0].expected_date).toBe('2026-10-25');});
it('T17 CASH-05 alterar é ação distinta e preserva vencimento no patch',async()=>{const update=vi.fn(async()=>({transaction:{...f1.transactions[0],expected_date:'2026-11-01',version:2},business_version:2}));setup({updateTransaction:update});fireEvent.click(screen.getByText('Alterar previsão'));expect(await screen.findByText('Previsão atualizada. Vencimento original preservado.')).toBeTruthy();expect(update.mock.calls[0]).toEqual([{id:'rec-1',expected_version:1,patch:{expected_date:'2026-11-01'}}]);});
it('T17 falha não mostra hipótese como concluída',async()=>{setup();fireEvent.click(screen.getByText('Simular atraso'));expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('Hipótese')).toBeNull();});
it('T17 mudar data invalida resultado anterior',async()=>{setup({simulate:async()=>result});fireEvent.click(screen.getByText('Simular atraso'));await screen.findByText('Hipótese');fireEvent.change(screen.getByLabelText('Nova data prevista'),{target:{value:'2026-11-02'}});expect(screen.queryByText('Hipótese')).toBeNull();});
it('T17 sem recebíveis não oferece mutação',()=>{render(<ScenarioPanel finance={createMockFinancePort()} snapshot={f1Snapshot} transactions={[]}/>);expect(screen.getByText('Sem recebíveis pendentes para comparar.')).toBeTruthy();expect(screen.queryByText('Alterar previsão')).toBeNull();});
