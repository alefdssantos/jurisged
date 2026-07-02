import { test, expect, type Page } from "@playwright/test";

const sufixo = String(Date.now());
const nomeCliente = `Cliente E2E ${sufixo}`;
const nomeRenomeado = `Cliente E2E ${sufixo} (renomeado)`;
const nomeProcesso = `Processo E2E ${sufixo}`;
const nomePasta = `Pasta E2E ${sufixo}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

async function abrirMenu(page: Page, rotulo: string) {
  await page.getByRole("button", { name: rotulo, exact: true }).click();
}

test.describe("F2 — Clientes / Processos / Pastas (CRUD na UI real)", () => {
  test("fluxo completo: criar, navegar, renomear e excluir", async ({ page }) => {
    await login(page);
    await page.goto("/clientes");
    const main = page.getByRole("main");
    await expect(page.getByRole("heading", { name: "Clientes & Processos" })).toBeVisible();

    // criar cliente
    await page.getByTestId("novo-cliente").click();
    await page.getByLabel("Nome", { exact: true }).fill(nomeCliente);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nomeCliente)).toBeVisible();

    // persiste após reload (banco real) — e reflete na sidebar
    await page.reload();
    await expect(main.getByText(nomeCliente)).toBeVisible();
    await expect(page.getByRole("link", { name: nomeCliente })).toBeVisible(); // sidebar

    // criar processo dentro do cliente
    await abrirMenu(page, `Ações do cliente ${nomeCliente}`);
    await page.getByRole("menuitem", { name: "Novo processo" }).click();
    await page.getByLabel("Título", { exact: true }).fill(nomeProcesso);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nomeProcesso)).toBeVisible();

    // criar pasta dentro do processo
    await abrirMenu(page, `Ações do processo ${nomeProcesso}`);
    await page.getByRole("menuitem", { name: "Nova pasta" }).click();
    await page.getByLabel("Nome", { exact: true }).fill(nomePasta);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nomePasta)).toBeVisible();

    // validação: nome vazio é rejeitado (mostra alerta, dialog continua aberto)
    await abrirMenu(page, `Ações do cliente ${nomeCliente}`);
    await page.getByRole("menuitem", { name: "Renomear" }).click();
    await page.getByLabel("Nome", { exact: true }).fill("   ");
    await page.getByTestId("salvar").click();
    await expect(page.getByRole("alert")).toBeVisible();

    // renomear cliente (válido)
    await page.getByLabel("Nome", { exact: true }).fill(nomeRenomeado);
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nomeRenomeado)).toBeVisible();

    // excluir cliente (cascade) — limpa o que o teste criou
    await abrirMenu(page, `Ações do cliente ${nomeRenomeado}`);
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await page.getByTestId("salvar").click();
    await expect(main.getByText(nomeRenomeado)).toHaveCount(0);
    await expect(main.getByText(nomeProcesso)).toHaveCount(0);
  });
});
