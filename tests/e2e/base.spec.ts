import { test, expect } from "@playwright/test";

test("base abre sem credenciais e identifica dados fictícios", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seu caixa, com mais fôlego." })).toBeVisible();
  await expect(page.getByText("Modo de desenvolvimento · dados simulados")).toBeVisible();
  await expect(page.getByTestId("current-balance")).toHaveText(/1\.000,00/);
  await expect(page.getByText("Sem integração bancária ou chamadas de IA nesta base.")).toBeVisible();
  await page.getByText("Ver resposta de exemplo").click();
  await expect(page.getByText(/Resposta simulada: seu saldo calculado/)).toBeVisible();
});

test("endpoint público de demo só entrega snapshot fictício identificado", async ({ request }) => {
  const response = await request.get("/api/demo/snapshot");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-data-source"]).toBe("mock");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = await response.json();
  expect(body.data.current_balance_cents).toBe(100000);
  expect(body.data.daily_balances).toHaveLength(30);
  expect(body.data.source).toBe("mock");
  expect(body.request_id).toEqual(expect.any(String));
});

test("base permanece legível em tela estreita", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seu caixa, com mais fôlego." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
