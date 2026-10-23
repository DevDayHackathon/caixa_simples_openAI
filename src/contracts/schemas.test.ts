import { describe, expect, it } from "vitest";
import {
  agentTurnInputSchema, businessSchema, cashSnapshotSchema, errorEnvelopeSchema,
  scheduledTaskSchema, transactionSchema, successEnvelopeSchema,
} from "./index";
import { f1, f1Snapshot, f2, reminderFixture } from "@/fixtures/demo";

describe("contratos v1 da base T1", () => {
  it("representa os valores e vencimentos da fixture F1", () => {
    expect(businessSchema.parse(f1.business).opening_balance_cents).toBe(100000);
    const transactions = f1.transactions.map((item) => transactionSchema.parse(item));
    expect(transactions.map(({ id, amount_cents, due_date }) => ({ id, amount_cents, due_date }))).toEqual([
      { id: "rec-1", amount_cents: 200000, due_date: "2026-10-25" },
      { id: "pay-1", amount_cents: 150000, due_date: "2026-10-27" },
    ]);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejeita centavos inválidos: %s", (amount_cents) => {
    expect(transactionSchema.safeParse({ ...f1.transactions[0], amount_cents }).success).toBe(false);
  });

  it.each(["2026-02-30", "23/10/2026", "2026-13-01"])("rejeita data civil inválida: %s", (due_date) => {
    expect(transactionSchema.safeParse({ ...f1.transactions[0], due_date }).success).toBe(false);
  });

  it("exige data de liquidação para uma conta realizada", () => {
    expect(transactionSchema.safeParse({ ...f1.transactions[0], status: "settled" }).success).toBe(false);
  });

  it("não permite campos secretos extras em uma movimentação", () => {
    expect(transactionSchema.safeParse({ ...f1.transactions[0], api_key: "invalid" }).success).toBe(false);
  });

  it("preserva a F2 independente para testes de reservas futuros", () => {
    expect(f2.business.opening_balance_cents).toBe(100000);
    expect(f2.transactions[0].amount_cents).toBe(50000);
    expect(f2.reservations).toEqual([]);
  });

  it("snapshot tem trinta datas, zero realizado e projeção de referência explícita", () => {
    const snapshot = cashSnapshotSchema.parse(f1Snapshot);
    expect(snapshot.daily_balances).toHaveLength(30);
    expect(snapshot.current_balance_cents).toBe(100000);
    expect(snapshot.realized_in_cents).toBe(0);
    expect(snapshot.realized_out_cents).toBe(0);
    expect(snapshot.daily_balances.find((day) => day.date === "2026-10-25")?.balance_cents).toBe(300000);
    expect(snapshot.daily_balances.find((day) => day.date === "2026-10-27")?.balance_cents).toBe(150000);
    expect(snapshot.source).toBe("mock");
    expect(cashSnapshotSchema.safeParse({ ...snapshot, daily_balances: [] }).success).toBe(false);
  });

  it("tarefa carrega horário UTC, antecedência e motivo decidido pelo agente", () => {
    const task = scheduledTaskSchema.parse(reminderFixture);
    expect(task.due_at).toBe("2026-10-29T18:00:00.000Z");
    expect(task.timezone).toBe("America/Sao_Paulo");
    expect(task.lead_time_minutes).toBe(1440);
    expect(task.schedule_source).toBe("agent");
    expect(task.scheduling_reason).toBe("Lembrar 24 horas antes do vencimento do fornecedor.");
    expect(scheduledTaskSchema.safeParse({ ...task, scheduling_reason: "" }).success).toBe(false);
    expect(scheduledTaskSchema.safeParse({ ...task, due_at: "2026-10-29T15:00:00" }).success).toBe(false);
  });

  it("não confunde uma tarefa com uma fala do usuário", () => {
    const input = { message: "Como está meu caixa?", origin: "user", request_id: "req-1" };
    expect(agentTurnInputSchema.parse(input).origin).toBe("user");
    expect(agentTurnInputSchema.safeParse({ ...input, origin: "task" }).success).toBe(false);
    expect(agentTurnInputSchema.safeParse({ ...input, message: "a".repeat(4001) }).success).toBe(false);
  });

  it("padroniza envelopes de sucesso e erro sem misturá-los", () => {
    expect(successEnvelopeSchema(cashSnapshotSchema).parse({ data: f1Snapshot, request_id: "req-1" }).data.version).toBe(1);
    expect(errorEnvelopeSchema.parse({ error: { code: "CONFLICT", message: "Versão antiga." }, request_id: "req-2" }).error.code).toBe("CONFLICT");
    expect(errorEnvelopeSchema.safeParse({ error: { code: "CONFLICT" }, request_id: "req-2" }).success).toBe(false);
  });
});
