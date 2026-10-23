import { describe, expect, it } from "vitest";
import { f1, FIXTURE_NOW } from "@/fixtures/demo";
import { calculateCash } from "./cash";
import type { FinanceState } from "./store";

export const fixtureState = (): FinanceState => structuredClone({ ...f1, reservations: [], version: 1, updated_at: FIXTURE_NOW });
describe("T4 cálculo em centavos", () => {
  it("F1 hoje tem 100000, sem realizados", () => {
    expect(calculateCash(fixtureState(), "2026-10-23")).toMatchObject({ current_balance_cents: 100000, realized_in_cents: 0, realized_out_cents: 0, minimum_balance_cents: 100000 });
  });
  it("fecha 25/10 em 300000 e 27/10 em 150000, em janela fixa", () => {
    const result = calculateCash(fixtureState(), "2026-10-23");
    expect(result.daily_balances).toHaveLength(30);
    expect(result.daily_balances[2]).toEqual({ date: "2026-10-25", balance_cents: 300000 });
    expect(result.daily_balances[4].balance_cents).toBe(150000); expect(result.daily_balances[29].date).toBe("2026-11-21");
  });
  it("empresa vazia conserva saldo inicial e zero não é negativo", () => {
    const state = fixtureState(); state.transactions = []; state.business.opening_balance_cents = 0;
    const result = calculateCash(state, "2026-10-23"); expect(result.daily_balances.every(day => day.balance_cents === 0)).toBe(true);
    expect(result.negative_intervals).toEqual([]); expect(result.first_negative_date).toBeNull();
  });
  it("saldo de abertura não inclui a movimentação do primeiro dia", () => {
    const state = fixtureState(); state.transactions = [{ ...state.transactions[0], status: "settled", settled_date: "2026-10-23" }];
    const result = calculateCash(state, "2026-10-23"); expect(result.current_balance_cents).toBe(300000); expect(result.daily_balances[0].balance_cents).toBe(300000);
  });
  it("liquidação substitui previsão, sem dupla contagem", () => {
    const state = fixtureState(); state.transactions[0] = { ...state.transactions[0], status: "settled", settled_date: "2026-10-25" };
    const result = calculateCash(state, "2026-10-25"); expect(result.current_balance_cents).toBe(300000); expect(result.daily_balances[4].balance_cents).toBe(150000);
  });
  it("recebível vencido é incerto até nova data", () => {
    const state = fixtureState(); const result = calculateCash(state, "2026-10-26");
    expect(result.uncertain_receivables.map(tx => tx.id)).toEqual(["rec-1"]); expect(result.daily_balances[4].balance_cents).toBe(-50000);
    state.transactions[0].expected_date = "2026-11-01";
    expect(calculateCash(state, "2026-10-26").uncertain_receivables).toEqual([]);
  });
  it("previsão nula exclui entrada, dívida vencida continua no caixa futuro", () => {
    const state = fixtureState(); state.transactions[0].expected_date = null;
    const result = calculateCash(state, "2026-10-28"); expect(result.uncertain_receivables).toHaveLength(1); expect(result.daily_balances[5].balance_cents).toBe(-50000);
  });
  it("cancelados não entram e reservas não reduzem projeção", () => {
    const state = fixtureState(); state.transactions[0].status = "cancelled";
    state.reservations = [{ id: "r", business_id: "demo", transaction_id: "pay-1", amount_cents: 10000, status: "active", version: 1 }];
    const result = calculateCash(state, "2026-10-23"); expect(result.free_cents).toBe(90000); expect(result.daily_balances[4].balance_cents).toBe(-50000);
  });
  it("centavos exatos, negativos e overflow são tratados sem arredondar", () => {
    const state = fixtureState(); state.business.opening_balance_cents = -1; state.transactions = [];
    expect(calculateCash(state, "2026-10-23").minimum_balance_cents).toBe(-1);
    state.business.opening_balance_cents = Number.MAX_SAFE_INTEGER; state.transactions = [f1.transactions[0]];
    expect(() => calculateCash(state, "2026-10-23")).toThrow(/limite/);
  });
  it("não desloca o horizonte nem mistura empresas", () => {
    expect(() => calculateCash(fixtureState(), "2026-11-22")).toThrow(/horizonte/);
    const state = fixtureState(); state.transactions[0].business_id = "other";
    expect(() => calculateCash(state, "2026-10-23")).toThrow(/empresa/);
  });
});
