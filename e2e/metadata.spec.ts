import { test, expect, type Page } from "@playwright/test";

const campoNome = `CampoE2E ${Date.now()}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F4 — Metadados, tags, categorias e catálogo", () => {
  test("edita classificação de um documento (tag + campo personalizado)", async ({ page }) => {
    await login(page);
    await page.goto("/documentos");
    await page.getByRole("link", { name: "Comprovante de Pagamento de Salário", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Comprovante de Pagamento de Salário" })).toBeVisible();

    await page.getByTestId("editar-classificacao").click();
    await page.getByRole("checkbox", { name: "Urgente" }).check();
    await page.getByLabel("Número do Documento", { exact: true }).fill("COMP-E2E");
    await page.getByTestId("salvar").click();

    // reflete na UI (painel de Informações e Metadados)
    await expect(page.getByText("COMP-E2E")).toBeVisible();
    await expect(page.getByText("Urgente").first()).toBeVisible();
  });

  test("gerencia o catálogo (cria e remove um campo)", async ({ page }) => {
    await login(page);
    await page.goto("/catalogo");
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible();

    await page.getByPlaceholder("Nome do campo").fill(campoNome);
    await page.getByRole("button", { name: "Adicionar campo" }).click();
    await expect(page.getByText(campoNome)).toBeVisible();

    await page.getByRole("button", { name: `Remover ${campoNome}` }).click();
    await expect(page.getByText(campoNome)).toHaveCount(0);
  });
});
