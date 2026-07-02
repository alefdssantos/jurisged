import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getPermissoesUsuario, temPermissao, podeAcessarPasta } from "@/lib/auth/permissions";

describe("F8 — RBAC + ACL de pasta (integração)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("ADMIN (Sócia) tem todas as permissões", async () => {
    const p = await getPermissoesUsuario("ana.silva");
    expect(p.has("documento.excluir")).toBe(true);
    expect(p.has("admin.gerenciar")).toBe(true);
    expect(p.has("pasta.gerenciar")).toBe(true);
  });

  it("ADVOGADO escreve/versiona, mas não exclui nem gerencia pastas", async () => {
    expect(await temPermissao("bruno.costa", "documento.escrever")).toBe(true);
    expect(await temPermissao("bruno.costa", "documento.versionar")).toBe(true);
    expect(await temPermissao("bruno.costa", "documento.excluir")).toBe(false);
    expect(await temPermissao("bruno.costa", "pasta.gerenciar")).toBe(false);
  });

  it("SECRETARIA não versiona, não exclui, não gerencia", async () => {
    expect(await temPermissao("carla.dias", "documento.escrever")).toBe(true);
    expect(await temPermissao("carla.dias", "documento.versionar")).toBe(false);
    expect(await temPermissao("carla.dias", "documento.excluir")).toBe(false);
    expect(await temPermissao("carla.dias", "pasta.gerenciar")).toBe(false);
  });

  it("sem sessão não há permissões", async () => {
    expect((await getPermissoesUsuario(null)).size).toBe(0);
    expect(await temPermissao(undefined, "documento.ler")).toBe(false);
  });

  it("ACL: pasta com ACL respeita grupos e níveis", async () => {
    const pasta = "pasta-acme-trab-peticoes"; // advogados ESCREVER, secretaria LER
    expect(await podeAcessarPasta("bruno.costa", pasta, "ESCREVER")).toBe(true);
    expect(await podeAcessarPasta("carla.dias", pasta, "LER")).toBe(true);
    expect(await podeAcessarPasta("carla.dias", pasta, "ESCREVER")).toBe(false);
    expect(await podeAcessarPasta("diego.alves", pasta, "LER")).toBe(false); // TI fora da ACL
    expect(await podeAcessarPasta("ana.silva", pasta, "ADMIN")).toBe(true); // ADMIN sempre
  });

  it("ACL: pasta sem ACL é aberta a autenticados", async () => {
    expect(await podeAcessarPasta("carla.dias", "pasta-acme-trab-provas", "LER")).toBe(true);
  });
});
