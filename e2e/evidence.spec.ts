import { test } from "@playwright/test";

/** Captura screenshots da UI real como evidência por feature. */
test.describe("evidência F0", () => {
  test("captura login + painel (claro/escuro)", async ({ page }) => {
    await page.goto("/login");
    await page.screenshot({ path: "evidence/F0/01-login.png", fullPage: true });

    await page.getByTestId("login-ana.silva").click();
    await page.waitForURL(/\/dashboard$/);
    await page.screenshot({
      path: "evidence/F0/02-dashboard-claro.png",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Alternar tema" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "evidence/F0/03-dashboard-escuro.png",
      fullPage: true,
    });
  });

  test("captura página de clientes (F2)", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await page.waitForURL(/\/dashboard$/);
    await page.goto("/clientes");
    await page.getByRole("heading", { name: "Clientes & Processos" }).waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: "evidence/F2/01-clientes.png",
      fullPage: true,
    });
  });

  test("captura documentos + visualizador (F3)", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/documentos");
    await page.getByRole("heading", { name: "Documentos" }).waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({ path: "evidence/F3/01-lista.png", fullPage: true });

    await page
      .getByRole("link", { name: "Petição Inicial — Reclamação Trabalhista", exact: true })
      .first()
      .click();
    await page.locator("iframe").waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "evidence/F3/02-visualizador.png", fullPage: true });
  });

  test("captura e-mails + visualizador (F9)", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-ana.silva").click();
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/emails");
    await page.getByRole("heading", { name: "E-mails" }).waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({ path: "evidence/F9/01-lista.png", fullPage: true });

    await page
      .getByRole("link", { name: "Documentos do processo trabalhista — João Pereira", exact: true })
      .click();
    await page.getByText("Metadados").waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "evidence/F9/02-visualizador.png", fullPage: true });
  });
});
