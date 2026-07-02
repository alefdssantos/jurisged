import { test, expect, type Page } from "@playwright/test";

const nome = `Doc E2E ${Date.now()}`;
const docSeed = "Petição Inicial — Reclamação Trabalhista";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F3 — Documentos: upload, listagem e visualização", () => {
  test("visualiza documento do seed (PDF inline)", async ({ page }) => {
    await login(page);
    await page.goto("/documentos");
    const main = page.getByRole("main");
    await expect(main.getByText(docSeed)).toBeVisible();

    await page.getByRole("link", { name: docSeed, exact: true }).first().click();
    await expect(page.getByRole("heading", { name: docSeed })).toBeVisible();
    await expect(page.locator("iframe")).toBeVisible(); // PDF renderizado
    await expect(page.getByText("Informações")).toBeVisible();
  });

  test("upload, abre e exclui um documento", async ({ page }) => {
    await login(page);
    await page.goto("/documentos");
    const main = page.getByRole("main");

    // upload
    await page.getByTestId("enviar-documento").click();
    await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
    await page.locator('input[name="nome"]').fill(nome);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toBeVisible();

    // abre o visualizador (texto em iframe)
    await page.getByRole("link", { name: nome, exact: true }).click();
    await expect(page.getByRole("heading", { name: nome })).toBeVisible();
    await expect(page.locator("iframe")).toBeVisible();
    await page.goBack();

    // exclui (limpa o que o teste criou)
    await page.getByRole("button", { name: `Ações de ${nome}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toHaveCount(0);
  });
});
