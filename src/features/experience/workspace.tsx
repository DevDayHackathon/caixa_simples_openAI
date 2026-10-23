'use client';
import React from 'react';
import { f1,f1Snapshot,f1DelayedSnapshot } from '@/fixtures/demo';
import { ScenarioPanel } from './scenario-panel';
import { Conversation } from './conversation';
import { createMockFinancePort,createMockAgentPort,MockOperationUnavailable } from '@/adapters/mock';
import { ImportPanel } from './import-panel';
const finance=createMockFinancePort({async simulate(input){
 if(input.base_version!==1||input.overrides.length!==1||input.overrides[0].transaction_id!=='rec-1'||input.overrides[0].expected_date!=='2026-11-01'||input.overrides[0].amount_cents!==undefined)throw new MockOperationUnavailable('cenário fora da referência F1');
 return structuredClone({scenario_id:'mock-f1-delay',baseline:f1Snapshot,projected:f1DelayedSnapshot,affected_dates:['2026-10-25','2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31'],deficit_intervals:f1DelayedSnapshot.negative_intervals});
}});
const agent=createMockAgentPort();
export function ExperienceWorkspace(){return <><p className="mt-6 text-sm">Ambiente com mocks v1. Operações financeiras aguardam integração; erros não confirmam alterações.</p><ImportPanel finance={finance}/><ScenarioPanel finance={finance} snapshot={f1Snapshot} transactions={f1.transactions}/><Conversation agent={agent} snapshotVersion={1}/></>;}
