// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, it, expect } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import { f1, f1Snapshot } from "@/fixtures/demo";
import { FolegoDashboard } from "./folego-dashboard";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

it("Fôlego apresenta os valores recebidos sem adotar números do protótipo", () => {
  render(
    <FolegoDashboard
      snapshot={{
        ...f1Snapshot,
        current_balance_cents: 12345,
        reserved_cents: 4567,
        free_cents: 6789,
      }}
      transactions={f1.transactions}
    />,
  );
  expect(screen.getByTestId("current-balance").textContent).toMatch(/123,45/);
  const stats = screen.getByRole("region", { name: "Resumo do caixa" });
  expect(stats.textContent).toContain("45,67");
  expect(stats.textContent).toContain("67,89");
  expect(stats.textContent).not.toContain("6.000,00");
  expect(stats.textContent).not.toContain("Comprometido em 7 dias");
  expect(screen.queryByText("Próximas frentes")).toBeNull();
});
it("Fôlego simula e restaura visualização sem alterar movimentações da base", async () => {
  render(
    <FolegoDashboard snapshot={f1Snapshot} transactions={f1.transactions} />,
  );
  const originalPath = screen.getByTestId("cash-chart-path").getAttribute("d");
  fireEvent.click(screen.getByRole("button", { name: /^Simular atraso$/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(
    within(dialog).getByRole("button", { name: /^Simular atraso$/ }),
  );
  await screen.findByText("Hipótese F1 ativa");
  expect(screen.getByTestId("dashboard-minimum").textContent).toMatch(
    /-R\$\s*500,00/,
  );
  expect(screen.getByTestId("cash-chart-path").getAttribute("d")).not.toBe(
    originalPath,
  );
  expect(f1.transactions[0].expected_date).toBe("2026-10-25");
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Fechar painel" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Restaurar cenário" }));
  expect(screen.getByTestId("dashboard-minimum").textContent).toMatch(
    /1.000,00/,
  );
  expect(screen.getByTestId("cash-chart-path").getAttribute("d")).toBe(
    originalPath,
  );
});
it("Fôlego mantém importação e conversa acessíveis nas ações principais", async () => {
  render(
    <FolegoDashboard snapshot={f1Snapshot} transactions={f1.transactions} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Importar CSV" }));
  let dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Arquivo CSV")).toBeTruthy();
  expect(within(dialog).getByLabelText("Saldo inicial (R$)")).toBeTruthy();
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Fechar painel" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Conversar com o Fôlego" }),
  );
  dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Sua mensagem")).toBeTruthy();
  expect(
    within(dialog).getByRole("button", { name: "Gravar mensagem" }),
  ).toBeTruthy();
});
it("Fôlego mantém incertos identificados na lista de compromissos", () => {
  render(
    <FolegoDashboard
      snapshot={f1Snapshot}
      transactions={[{ ...f1.transactions[0], expected_date: null }]}
    />,
  );
  const table = within(
    screen.getByRole("region", { name: "Movimentações próximas" }),
  ).getByRole("table");
  expect(table.textContent).toContain("Incerta");
  expect(table.textContent).toContain("Incerto");
  expect(table.textContent).toContain("Cliente Ana");
});
