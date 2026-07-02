import { test, expect, type Page } from "@playwright/test";

const ts = String(Date.now());
const cliente = `Cliente Fluxo ${ts}`;
const processo = `Processo Fluxo ${ts}`;
const pasta = `Pasta Fluxo ${ts}`;
const doc = `Doc Fluxo zzfluxo ${ts}`;
const assuntoEmail = "Assunto de teste E2E arquivamento";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByTestId("login-ana.silva").click();
  await page.waitForURL(/\/dashboard$/);
}

async function abrirMenu(page: Page, rotulo: string) {
  await page.getByRole("button", { name: rotulo, exact: true }).click();
}

// Jornada de ponta a ponta cobrindo todo o escopo: estrutura → documento →
// classificação → versão → OCR → busca → e-mail → auditoria → dashboard.
test("F14 — fluxo completo simulado (todo o escopo)", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  // 1) Dashboard com KPIs
  await page.goto("/dashboard");
  await expect(page.getByTestId("kpi-documentos")).toBeVisible();

  // 2) Estrutura Cliente → Processo → Pasta (F2)
  await page.goto("/clientes");
  const mainCli = page.getByRole("main");
  await page.getByTestId("novo-cliente").click();
  await page.getByLabel("Nome", { exact: true }).fill(cliente);
  await page.getByTestId("salvar").click();
  await expect(mainCli.getByText(cliente)).toBeVisible();

  await abrirMenu(page, `Ações do cliente ${cliente}`);
  await page.getByRole("menuitem", { name: "Novo processo" }).click();
  await page.getByLabel("Título", { exact: true }).fill(processo);
  await page.getByTestId("salvar").click();
  await expect(mainCli.getByText(processo)).toBeVisible();

  await abrirMenu(page, `Ações do processo ${processo}`);
  await page.getByRole("menuitem", { name: "Nova pasta" }).click();
  await page.getByLabel("Nome", { exact: true }).fill(pasta);
  await page.getByTestId("salvar").click();
  await expect(mainCli.getByText(pasta)).toBeVisible();

  // 3) Documento: upload (F3) + OCR (F6)
  await page.goto("/documentos");
  const mainDoc = page.getByRole("main");
  await page.getByTestId("enviar-documento").click();
  await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
  await page.locator('input[name="nome"]').fill(doc);
  await page.getByTestId("salvar").click();
  await expect(mainDoc.getByText(doc)).toBeVisible();

  await page.getByRole("link", { name: doc, exact: true }).click();
  await expect(page.getByText("Texto reconhecido (OCR)")).toBeVisible();
  await expect(page.getByText(/Documento de exemplo para teste E2E/)).toBeVisible();

  // 4) Classificação (F4): adiciona tag
  await page.getByTestId("editar-classificacao").click();
  await page.getByRole("checkbox", { name: "Urgente" }).check();
  await page.getByTestId("salvar").click();
  await expect(page.getByText("Urgente").first()).toBeVisible();

  // 5) Versionamento (F5): nova versão + restaurar
  await page.getByTestId("nova-versao").click();
  await page.setInputFiles('input[name="arquivo"]', "e2e/fixtures/exemplo.txt");
  await page.getByTestId("salvar").click();
  await expect(page.getByText("Versões (2)")).toBeVisible();
  await page.getByRole("button", { name: /Tornar v1 a versão atual/ }).click();
  await expect(page.getByRole("button", { name: /Tornar v2 a versão atual/ })).toBeVisible();

  // 6) Busca (F7): encontra o documento pelo nome único
  await page.goto("/busca");
  await page.getByLabel("Texto").fill("zzfluxo");
  await page.getByTestId("aplicar-filtros").click();
  await expect(page.getByTestId("resultados").getByText(doc)).toBeVisible();

  // 7) Arquivamento de e-mail (F9)
  await page.goto("/emails");
  const mainEmail = page.getByRole("main");
  await page.getByTestId("arquivar-email").click();
  await page.setInputFiles('input[name="eml"]', "e2e/fixtures/exemplo.eml");
  await page.getByTestId("salvar").click();
  await expect(mainEmail.getByText(assuntoEmail)).toBeVisible();
  await page.getByRole("link", { name: assuntoEmail, exact: true }).click();
  await expect(page.getByText(/Corpo do e-mail de teste/)).toBeVisible();

  // 8) Auditoria (F10)
  await page.goto("/auditoria");
  await expect(
    page.getByTestId("auditoria").getByText(/Arquivou e-mail|Criou/).first(),
  ).toBeVisible();

  // 9) Limpeza (exclui o que foi criado)
  await page.goto("/documentos");
  await abrirMenu(page, `Ações de ${doc}`);
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByTestId("salvar").click();
  await expect(page.getByRole("main").getByText(doc)).toHaveCount(0);

  await page.goto("/emails");
  await abrirMenu(page, `Ações do e-mail ${assuntoEmail}`);
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByTestId("salvar").click();

  await page.goto("/clientes");
  await abrirMenu(page, `Ações do cliente ${cliente}`);
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByTestId("salvar").click();
  await expect(page.getByRole("main").getByText(cliente)).toHaveCount(0);
});
