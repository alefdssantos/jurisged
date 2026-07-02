import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getResumo, getDocsPorCliente } from "@/lib/data/dashboard-service";

describe("F12 — dashboard / overview (integração)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("resumo de contagens reflete o seed", async () => {
    const r = await getResumo();
    expect(r.contagens.clientes).toBe(2);
    expect(r.contagens.processos).toBe(3);
    expect(r.contagens.documentos).toBe(4);
    expect(r.contagens.emails).toBe(2);
    expect(r.recentesDocs.length).toBeGreaterThan(0);
    expect(r.recentesAudit.length).toBeGreaterThan(0);
  });

  it("acervo por cliente", async () => {
    const linhas = await getDocsPorCliente();
    const acme = linhas.find((l) => l.cliente.includes("ACME"));
    const beta = linhas.find((l) => l.cliente.includes("Beta"));
    expect(acme?.documentos).toBe(3);
    expect(acme?.emails).toBe(1);
    expect(beta?.documentos).toBe(1);
    expect(beta?.emails).toBe(1);
  });
});
