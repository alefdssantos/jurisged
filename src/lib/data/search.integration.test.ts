import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { buscar } from "@/lib/data/search-service";

const ids = (arr: { id: string }[]) => arr.map((x) => x.id);

describe("F7 — busca + filtros combináveis (integração)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("busca textual por conteúdo (acento-insensível)", async () => {
    expect(ids((await buscar({ q: "horas extras" })).documentos)).toContain("doc-1");
    expect(ids((await buscar({ q: "peticao" })).documentos)).toEqual(
      expect.arrayContaining(["doc-1", "doc-4"]),
    );
  });

  it("filtra por cliente (documentos e e-mails)", async () => {
    const r = await buscar({ clienteId: "cli-beta" });
    expect(ids(r.documentos)).toContain("doc-4");
    expect(ids(r.documentos)).not.toContain("doc-1");
    expect(ids(r.emails)).toContain("email-2");
    expect(ids(r.emails)).not.toContain("email-1");
  });

  it("filtro por categoria exclui e-mails", async () => {
    const r = await buscar({ categoriaId: "cat-peticao" });
    expect(ids(r.documentos)).toEqual(expect.arrayContaining(["doc-1", "doc-4"]));
    expect(r.emails).toHaveLength(0);
  });

  it("tipo = só e-mails + texto", async () => {
    const r = await buscar({ tipo: "emails", q: "acordo" });
    expect(r.documentos).toHaveLength(0);
    expect(ids(r.emails)).toContain("email-2");
  });

  it("combina texto + processo", async () => {
    const r = await buscar({ q: "contrato", processoId: "proc-acme-forn" });
    expect(ids(r.documentos)).toContain("doc-3");
    expect(ids(r.documentos)).not.toContain("doc-1");
  });

  it("filtra por intervalo de datas", async () => {
    const r = await buscar({ de: "2025-01-01" });
    expect(ids(r.documentos)).toContain("doc-4");
    expect(ids(r.documentos)).not.toContain("doc-1");
    expect(ids(r.emails)).toContain("email-2");
    expect(ids(r.emails)).not.toContain("email-1");
  });

  it("filtra por tag", async () => {
    expect(ids((await buscar({ tagId: "tag-urgente" })).documentos)).toEqual(
      expect.arrayContaining(["doc-1", "doc-4"]),
    );
  });
});
