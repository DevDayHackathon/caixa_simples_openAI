import { describe, expect, it } from "vitest";
import { f1, FIXTURE_NOW } from "@/fixtures/demo";
import { simulate } from "./scenarios";
const state = () => structuredClone({ ...f1, reservations: [], version: 1, updated_at: FIXTURE_NOW });
const delay = { base_version: 1, overrides: [{ transaction_id: "rec-1", expected_date: "2026-11-01" }] };
describe("T6 cenários isolados", () => {
  it("F1 fica -50000 de 27 a 31/10 e recupera para 150000 em 01/11", () => {
    const result = simulate(state(), delay);
    expect(result.projected.minimum_balance_cents).toBe(-50000);
    expect(result.deficit_intervals).toEqual([{ start_date: "2026-10-27", end_date: "2026-10-31" }]);
    expect(result.projected.daily_balances.slice(4, 9).map(day => day.balance_cents)).toEqual(Array(5).fill(-50000));
    expect(result.projected.daily_balances[9]).toEqual({ date: "2026-11-01", balance_cents: 150000 });
    expect(result.affected_dates).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  });
  it("preserva a base mesmo após o consumidor editar o retorno", () => {
    const base = state(), before = structuredClone(base), result = simulate(base, delay);
    result.baseline.daily_balances[0].balance_cents = -10; result.projected.uncertain_receivables.push(f1.transactions[0]);
    expect(base).toEqual(before); expect(simulate(base, delay).baseline.minimum_balance_cents).toBe(100000);
  });
  it("atraso além da janela mantém 30 dias e exclui a entrada da janela", () => {
    const result = simulate(state(), { ...delay, overrides: [{ transaction_id: "rec-1", expected_date: "2027-01-01" }] });
    expect(result.projected.daily_balances.at(-1)).toEqual({ date: "2026-11-21", balance_cents: -50000 });
    expect(result.deficit_intervals[0].end_date).toBe("2026-11-21");
  });
  it("valor hipotético não altera o compromisso", () => {
    const base = state(); expect(simulate(base, { ...delay, overrides: [{ transaction_id: "pay-1", amount_cents: 400000 }] }).projected.minimum_balance_cents).toBe(-100000);
    expect(base.transactions[1].amount_cents).toBe(150000);
  });
  it("versão antiga, ID ausente e override duplicado são rejeitados", () => {
    expect(() => simulate(state(), { ...delay, base_version: 2 })).toThrow(/antiga/);
    expect(() => simulate(state(), { ...delay, overrides: [{ transaction_id: "unknown", amount_cents: 1 }] })).toThrow(/encontrado/);
    expect(() => simulate(state(), { ...delay, overrides: [...delay.overrides, ...delay.overrides] })).toThrow(/por compromisso/);
  });
  it("não liquida nem modifica contas finais e rejeita overflow", () => {
    const base = state(); base.transactions[0].status = "settled"; base.transactions[0].settled_date = "2026-10-25";
    expect(() => simulate(base, delay)).toThrow(/pendências/);
    expect(() => simulate(state(), { ...delay, overrides: [{ transaction_id: "rec-1", amount_cents: Number.MAX_SAFE_INTEGER }] })).toThrow(/limite/);
    expect(() => simulate(state(), { ...delay, overrides: [{ transaction_id: "rec-1", settled_date: "2026-10-25" }] } as never)).toThrow();
  });
});
