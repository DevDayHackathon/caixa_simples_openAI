'use client';
import React from 'react';
import { createMockFinancePort } from '@/adapters/mock';
import { ImportPanel } from './import-panel';
const finance=createMockFinancePort();
export function ExperienceWorkspace(){return <><p className="mt-6 text-sm">Ambiente com mocks v1. Operações financeiras aguardam integração; erros não confirmam alterações.</p><ImportPanel finance={finance}/></>;}
