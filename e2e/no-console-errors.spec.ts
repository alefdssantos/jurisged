import { test, expect } from "@playwright/test";

test("sem erros de console/hidratação no fluxo principal", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.waitForTimeout(300);

  expect(errors, `Erros detectados:\n${errors.join("\n---\n")}`).toEqual([]);
});
