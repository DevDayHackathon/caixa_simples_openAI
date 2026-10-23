import { test, expect } from "@playwright/test";

test("Fôlego preserva simulação F1 e restaura base sem mudar o recebível", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "output/playwright/folego-desktop.png" });
  const original = await page.getByTestId("cash-chart-path").getAttribute("d");
  await page
    .getByRole("button", { name: "Simular atraso", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Simular atraso", exact: true })
    .click();
  await expect(page.getByTestId("dashboard-minimum")).toHaveText(
    /-R\$\s*500,00/,
  );
  await expect(page.getByText("Hipótese F1 ativa")).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar painel" }).click();
  await expect(
    page
      .getByRole("region", { name: "Movimentações próximas" })
      .getByText("25 out"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restaurar cenário" }).click();
  await expect(page.getByTestId("cash-chart-path")).toHaveAttribute(
    "d",
    original!,
  );
  await expect(page.getByTestId("dashboard-minimum")).toHaveText(/1.000,00/);
});

test("painéis fecham por Escape, devolvem foco e mantêm conversa textual", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Importar CSV" });
  await trigger.click();
  await expect(
    page.getByRole("dialog").getByLabel("Arquivo CSV"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Conversar com o Fôlego" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Sua mensagem").fill("Como está meu caixa?");
  await dialog.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(
    dialog.getByText(/Resposta simulada: seu saldo calculado/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Ouvir resposta" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Fechar painel" }).click();
  await page.getByRole("button", { name: "Conversar com o Fôlego" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(/Resposta simulada: seu saldo calculado/),
  ).toBeVisible();
  await expect(page.getByText("Próximas frentes")).toHaveCount(0);
});

test("interface e painéis cabem em 360 px e mostram avisos separados", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Seu caixa, com mais fôlego." }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Iniciativas programadas" })
      .getByText("Tarefa programada", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/playwright/folego-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Importar CSV" }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Conteúdo CSV"),
  ).toBeVisible();
  const fits = await page
    .getByRole("dialog")
    .evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(fits).toBe(true);
});
