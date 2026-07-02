import { test, expect, type Page } from "@playwright/test";

const assunto = "Assunto de teste E2E arquivamento";

async function login(page: Page, userId: string) {
  await page.goto("/login");
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F9 — Arquivamento de e-mail na UI real", () => {
  test("arquiva .eml, visualiza corpo/metadados e exclui", async ({ page }) => {
    await login(page, "ana.silva");
    await page.goto("/emails");
    const main = page.getByRole("main");

    // e-mails do seed visíveis
    await expect(main.getByText("Proposta de acordo — Ação de Cobrança")).toBeVisible();

    // arquivar um .eml real
    await page.getByTestId("arquivar-email").click();
    await page.setInputFiles('input[name="eml"]', "e2e/fixtures/exemplo.eml");
    await page.getByTestId("salvar").click();
    await expect(main.getByText(assunto)).toBeVisible();

    // abrir e conferir corpo + remetente
    await page.getByRole("link", { name: assunto, exact: true }).click();
    await expect(page.getByRole("heading", { name: assunto })).toBeVisible();
    await expect(page.getByText(/Corpo do e-mail de teste/)).toBeVisible();
    await expect(page.getByText("cliente@exemplo.com")).toBeVisible();

    // excluir (limpeza)
    await page.goto("/emails");
    await page.getByRole("button", { name: `Ações do e-mail ${assunto}`, exact: true }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await page.getByTestId("salvar").click();
    await expect(main.getByText(assunto)).toHaveCount(0);
  });
});
