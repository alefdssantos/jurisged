import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F7 — Busca textual + filtros na UI real", () => {
  test("texto, filtro por cliente e por tipo (e-mails)", async ({ page }) => {
    await login(page);
    await page.goto("/busca");
    const res = page.getByTestId("resultados");

    // busca textual por conteúdo OCR
    await page.getByLabel("Texto").fill("horas extras");
    await page.getByTestId("aplicar-filtros").click();
    await expect(res.getByText("Petição Inicial — Reclamação Trabalhista")).toBeVisible();

    // filtra por cliente Beta → some o trabalhista, aparece a cobrança
    await page.getByLabel("Texto").fill("");
    await page.selectOption('select[name="clienteId"]', { label: "Beta Corp S.A." });
    await page.getByTestId("aplicar-filtros").click();
    await expect(res.getByText("Petição Inicial — Ação de Cobrança")).toBeVisible();
    await expect(res.getByText("Petição Inicial — Reclamação Trabalhista")).toHaveCount(0);

    // só e-mails + texto "acordo"
    await page.selectOption('select[name="clienteId"]', "");
    await page.selectOption('select[name="tipo"]', "emails");
    await page.getByLabel("Texto").fill("acordo");
    await page.getByTestId("aplicar-filtros").click();
    await expect(res.getByText("Proposta de acordo — Ação de Cobrança")).toBeVisible();
    await expect(res.getByText(/Petição Inicial/)).toHaveCount(0);
  });
});
