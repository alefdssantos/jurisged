import { test, expect, type Page } from "@playwright/test";

const nome = `DocOCR E2E ${Date.now()}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F6 — OCR na UI real", () => {
  test("texto extraído é exibido e o OCR pode ser re-executado", async ({ page }) => {
    await login(page);
    await page.goto("/documentos");
    const main = page.getByRole("main");

    await page.getByTestId("enviar-documento").click();
    await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
    await page.locator('input[name="nome"]').fill(nome);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toBeVisible();

    await page.getByRole("link", { name: nome, exact: true }).click();
    await expect(page.getByText("Texto reconhecido (OCR)")).toBeVisible();
    await expect(page.getByText(/Documento de exemplo para teste E2E/)).toBeVisible();

    await page.getByTestId("executar-ocr").click();
    await expect(page.getByText(/Documento de exemplo para teste E2E/)).toBeVisible();

    // limpeza
    await page.goto("/documentos");
    await page.getByRole("button", { name: `Ações de ${nome}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toHaveCount(0);
  });
});
