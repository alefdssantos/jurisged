import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, userId: string) {
  await page.goto("/login");
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F8 — RBAC: gating da UI por perfil", () => {
  test("Secretária não gerencia clientes nem exclui documentos", async ({ page }) => {
    await login(page, "carla.dias");

    await page.goto("/clientes");
    await expect(page.getByTestId("novo-cliente")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Ações do cliente/ })).toHaveCount(0);

    await page.goto("/documentos");
    await page.getByRole("button", { name: /^Ações de / }).first().click();
    await expect(page.getByRole("menuitem", { name: "Abrir" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Excluir" })).toHaveCount(0);
  });

  test("Sócia (admin) gerencia clientes e exclui documentos", async ({ page }) => {
    await login(page, "ana.silva");

    await page.goto("/clientes");
    await expect(page.getByTestId("novo-cliente")).toBeVisible();

    await page.goto("/documentos");
    await page.getByRole("button", { name: /^Ações de / }).first().click();
    await expect(page.getByRole("menuitem", { name: "Excluir" })).toBeVisible();
  });
});
