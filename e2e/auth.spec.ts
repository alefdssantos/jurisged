import { test, expect } from "@playwright/test";

test.describe("F0 — fundação, auth mock e app shell", () => {
  test("rota protegida redireciona para /login quando sem sessão", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "JurisGED" })
    ).toBeVisible();
    await expect(page.getByText("Entrar como")).toBeVisible();
  });

  test("login mock entra e mostra o painel", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-bruno.costa").click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: /Bem-vindo, Bruno/ })
    ).toBeVisible();
    // brand visível no sidebar
    await expect(page.getByText("GED Jurídico")).toBeVisible();
  });

  test("navegação do sidebar funciona", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Documentos" }).first().click();
    await expect(page).toHaveURL(/\/documentos$/);
    await expect(
      page.getByRole("heading", { name: "Documentos" })
    ).toBeVisible();
  });

  test("busca global na topbar roteia para /busca?q=", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await page.getByLabel("Busca global").fill("contrato");
    await page.getByLabel("Busca global").press("Enter");
    await expect(page).toHaveURL(/\/busca\?q=contrato/);
    await expect(page.getByLabel("Texto")).toHaveValue("contrato");
  });

  test("alternar tema muda a classe do html", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    const html = page.locator("html");
    const before = (await html.getAttribute("class")) ?? "";
    await page.getByRole("button", { name: "Alternar tema" }).click();
    await expect(async () => {
      const after = (await html.getAttribute("class")) ?? "";
      expect(after).not.toBe(before);
    }).toPass();
  });

  test("logout volta para /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: /Sair/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
