import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, userId: string) {
  await page.goto("/login");
  await page.getByTestId(`login-${userId}`).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe("F10 — Rastreabilidade / auditoria", () => {
  test("admin vê a trilha de auditoria", async ({ page }) => {
    await login(page, "ana.silva");
    await expect(page.getByRole("link", { name: "Auditoria" })).toBeVisible();

    await page.goto("/auditoria");
    await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
    await expect(
      page.getByTestId("auditoria").getByText(/Arquivou e-mail|Criou|Versionou/).first(),
    ).toBeVisible();
  });

  test("não-admin não acessa auditoria", async ({ page }) => {
    await login(page, "carla.dias");
    await expect(page.getByRole("link", { name: "Auditoria" })).toHaveCount(0);

    await page.goto("/auditoria");
    await expect(page.getByText("Sem permissão")).toBeVisible();
  });
});
