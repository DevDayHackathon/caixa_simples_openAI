import type { FinancePort, AgentPort } from "@/contracts";
import { agentTurnInputSchema, agentTurnResultSchema, cashSnapshotSchema, financeOperations, notificationSchema } from "@/contracts";
import { agentReplyFixture, f1Snapshot, notificationFixture } from "@/fixtures/demo";

export class MockOperationUnavailable extends Error {
  constructor(operation: string) {
    super(`Mock sem implementação de ${operation}. Injete uma resposta de teste; isso não executa a operação real.`);
    this.name = "MockOperationUnavailable";
  }
}

// Mocks somente de leitura. Consumidores podem injetar respostas de teste para
// mutações; o default nunca finge importar, pagar ou persistir dados.
export function createMockFinancePort(overrides: Partial<FinancePort> = {}): FinancePort {
  const unsupported = async () => { throw new MockOperationUnavailable("mutação financeira"); };
  return {
    previewImport: unsupported, confirmImport: unsupported, createTransaction: unsupported,
    updateTransaction: unsupported, settleTransaction: unsupported, simulate: unsupported,
    reserveForPayment: unsupported,
    async getCashSnapshot(input) {
      const query = financeOperations.getCashSnapshot.input.parse(input);
      if (query.business_id !== "demo" || query.as_of !== "2026-10-23") {
        throw new MockOperationUnavailable("snapshot fora da fixture F1");
      }
      return cashSnapshotSchema.parse(structuredClone(f1Snapshot));
    },
    ...overrides,
  };
}

export function createMockAgentPort(overrides: Partial<AgentPort> = {}): AgentPort {
  return {
    async turn(input) {
      agentTurnInputSchema.parse(input);
      return agentTurnResultSchema.parse(structuredClone(agentReplyFixture));
    },
    async listNotifications() {
      return [notificationSchema.parse(structuredClone(notificationFixture))];
    },
    ...overrides,
  };
}
