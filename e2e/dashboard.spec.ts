import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, userId: string) {
  await page.goto("/login");
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F12 — Dashboard / overview", () => {
  test("mostra KPIs reais e seções de visão geral", async ({ page }) => {
    await login(page, "ana.silva");
    await page.goto("/dashboard");

    await expect(page.getByTestId("kpi-clientes")).toHaveText("2");
    await expect(page.getByTestId("kpi-processos")).toHaveText("3");
    await expect(page.getByTestId("kpi-documentos")).toHaveText("4");
    await expect(page.getByTestId("kpi-e-mails")).toHaveText("2");

    await expect(page.getByText("Documentos recentes", { exact: true })).toBeVisible();
    await expect(page.getByText("Atividade recente", { exact: true })).toBeVisible();
    await expect(page.getByText("Acervo por cliente", { exact: true })).toBeVisible();
  });
});
