import { test, expect, type Page } from "@playwright/test";

const nome = `Grupo E2E ${Date.now()}`;

async function login(page: Page, userId: string) {
  await page.goto("/login");
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F11 — Administração de usuários/grupos/permissões", () => {
  test("admin cria grupo, define permissão, alterna usuário e exclui grupo", async ({ page }) => {
    await login(page, "ana.silva");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Administração" })).toBeVisible();
    await expect(page.getByText(/Usuários \(/)).toBeVisible();

    // criar grupo
    await page.getByTestId("novo-grupo").click();
    await page.getByLabel("Nome", { exact: true }).fill(nome);
    await page.getByTestId("salvar").click();
    await expect(page.getByText(nome)).toBeVisible();

    // definir uma permissão no grupo
    const row = page.locator("div.rounded-lg.border", { hasText: nome });
    await row.getByRole("button", { name: "Permissões" }).click();
    await page.getByRole("checkbox", { name: /documento\.ler/ }).check();
    await page.getByTestId("salvar").click();
    await expect(page.getByText(nome).locator("xpath=ancestor::div[contains(@class,'rounded-lg')]")).toContainText("1 permissão");

    // alternar status do usuário Carla e voltar
    await page.getByTestId("toggle-ativo-carla.dias").click();
    await expect(page.getByTestId("toggle-ativo-carla.dias")).toHaveText("Inativo");
    await page.getByTestId("toggle-ativo-carla.dias").click();
    await expect(page.getByTestId("toggle-ativo-carla.dias")).toHaveText("Ativo");

    // excluir grupo (limpeza)
    await page.getByRole("button", { name: `Excluir ${nome}` }).click();
    await page.getByTestId("salvar").click();
    await expect(page.getByText(nome)).toHaveCount(0);
  });

  test("não-admin não acessa administração", async ({ page }) => {
    await login(page, "bruno.costa");
    await page.goto("/admin");
    await expect(page.getByText("Sem permissão")).toBeVisible();
  });
});
