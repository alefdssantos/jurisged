import { test, expect, type Page } from "@playwright/test";

const nome = `DocVer E2E ${Date.now()}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F5 — Versionamento na UI real", () => {
  test("envia nova versão e restaura a anterior", async ({ page }) => {
    await login(page);
    await page.goto("/documentos");
    const main = page.getByRole("main");

    // cria documento base
    await page.getByTestId("enviar-documento").click();
    await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
    await page.locator('input[name="nome"]').fill(nome);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toBeVisible();

    // abre o documento
    await page.getByRole("link", { name: nome, exact: true }).click();
    await expect(page.getByText("Versões (1)")).toBeVisible();

    // nova versão
    await page.getByTestId("nova-versao").click();
    await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
    await page.getByTestId("salvar").click();
    await expect(page.getByText("Versões (2)")).toBeVisible();
    await expect(page.getByRole("button", { name: /Tornar v1 a versão atual/ })).toBeVisible();

    // restaura v1
    await page.getByRole("button", { name: /Tornar v1 a versão atual/ }).click();
    await expect(page.getByRole("button", { name: /Tornar v2 a versão atual/ })).toBeVisible();

    // limpeza
    await page.goto("/documentos");
    await page.getByRole("button", { name: `Ações de ${nome}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nome)).toHaveCount(0);
  });
});
