// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { createMockFinancePort } from '@/adapters/mock';
import { f1 } from '@/fixtures/demo';
import { ImportPanel } from './import-panel';
afterEach(cleanup);
const preview={preview_id:'pv-1',rows:f1.transactions,errors:[]};
async function prepare() {fireEvent.change(screen.getByLabelText('Saldo inicial (R$)'),{target:{value:'1000,00'}}); fireEvent.change(screen.getByLabelText('Conteúdo CSV'),{target:{value:'id,direction\nrec-1,in'}}); fireEvent.click(screen.getByText('Conferir prévia')); await screen.findByText('Cliente Ana');}
describe('T16 DATA-01/02/03',()=>{
 it('mostra linhas recebidas e confirma com a mesma chave no retry',async()=>{let key='';const confirm=vi.fn(async(input)=>{if(!key){key=input.idempotency_key;throw Error('Tente novamente');} expect(input).toEqual({preview_id:'pv-1',idempotency_key:key});return {inserted_count:2,business_version:2};}); render(<ImportPanel finance={createMockFinancePort({previewImport:async()=>preview,confirmImport:confirm})}/>);await prepare();fireEvent.click(screen.getByText('Confirmar importação'));await screen.findByText('Tente novamente');fireEvent.click(screen.getByText('Confirmar importação'));expect(await screen.findByText('2 movimentações importadas.')).toBeTruthy();});
 it('envia saldo em centavos e data sem interpretar CSV na UI',async()=>{const fn=vi.fn(async()=>preview);render(<ImportPanel finance={createMockFinancePort({previewImport:fn})}/>);await prepare();expect(fn.mock.calls[0]).toEqual([{csv:'id,direction\nrec-1,in',opening_balance_cents:100000,start_date:'2026-10-23'}]);});
 it('bloqueia confirmação com erro de linha e permite corrigir',async()=>{render(<ImportPanel finance={createMockFinancePort({previewImport:async()=>({...preview,errors:[{line:2,field:'amount',message:'Valor inválido'}]})})}/>);await prepare();expect(screen.getByText('Linha 2 · amount: Valor inválido')).toBeTruthy();expect((screen.getByText('Confirmar importação') as HTMLButtonElement).disabled).toBe(true);fireEvent.change(screen.getByLabelText('Conteúdo CSV'),{target:{value:'corrigido'}});expect(screen.queryByText('Confirmar importação')).toBeNull();expect((screen.getByLabelText('Conteúdo CSV') as HTMLTextAreaElement).value).toBe('corrigido');});
 it('recusa arquivo maior que 1 MiB antes do transporte',async()=>{const fn=vi.fn();render(<ImportPanel finance={createMockFinancePort({previewImport:fn})}/>);const file=new File([new Uint8Array(1048577)],'grande.csv',{type:'text/csv'});fireEvent.change(screen.getByLabelText('Arquivo CSV'),{target:{files:[file]}});expect(await screen.findByText('CSV deve ter até 1 MiB.')).toBeTruthy();expect(fn).not.toHaveBeenCalled();});
 it('alterar saldo invalida a prévia anterior',async()=>{render(<ImportPanel finance={createMockFinancePort({previewImport:async()=>preview})}/>);await prepare();fireEvent.change(screen.getByLabelText('Saldo inicial (R$)'),{target:{value:'500'}});expect(screen.queryByText('Confirmar importação')).toBeNull();});
 it('falha do mock não apresenta importação concluída',async()=>{render(<ImportPanel finance={createMockFinancePort()}/>);fireEvent.change(screen.getByLabelText('Conteúdo CSV'),{target:{value:'abc'}});fireEvent.click(screen.getByText('Conferir prévia'));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Mock sem implementação'));expect(screen.queryByText(/movimentações importadas/)).toBeNull();});
});
