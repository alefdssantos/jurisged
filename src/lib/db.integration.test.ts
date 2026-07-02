import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { searchDocumentos, searchEmails } from "@/lib/search/fts";

describe("F1 — modelo de dados + seed + FTS5 (integração)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seed populou as entidades principais", async () => {
    expect(await prisma.usuario.count()).toBe(4);
    expect(await prisma.cliente.count()).toBe(2);
    expect(await prisma.processo.count()).toBe(3);
    expect(await prisma.pasta.count()).toBe(7);
    expect(await prisma.documento.count()).toBe(4);
    expect(await prisma.email.count()).toBe(2);
    expect(await prisma.anexo.count()).toBe(2);
  });

  it("hierarquia Cliente→Processo→Pasta é navegável", async () => {
    const acme = await prisma.cliente.findUnique({
      where: { id: "cli-acme" },
      include: { processos: { include: { pastas: true } } },
    });
    expect(acme?.processos.length).toBe(2);
    const trab = acme!.processos.find((p) => p.id === "proc-acme-trab");
    expect(trab?.pastas.map((p) => p.nome)).toContain("Petições");
  });

  it("documento tem versões com exatamente uma versão atual", async () => {
    const doc = await prisma.documento.findUnique({
      where: { id: "doc-1" },
      include: { versoes: true, tags: true, metadados: true },
    });
    expect(doc?.versoes.length).toBe(2);
    const atuais = doc!.versoes.filter((v) => v.atual);
    expect(atuais.length).toBe(1);
    expect(atuais[0]!.numero).toBe(2);
    expect(doc?.tags.length).toBe(2);
    expect(doc!.metadados.length).toBeGreaterThan(0);
  });

  it("RBAC: grupo Advogados tem permissões e usuário vinculados", async () => {
    const g = await prisma.grupo.findUnique({
      where: { id: "grp-advogados" },
      include: { permissoes: true, usuarios: true },
    });
    expect(g?.permissoes.map((p) => p.chave)).toContain("documento.escrever");
    expect(g?.usuarios.map((u) => u.id)).toContain("bruno.costa");
  });

  it("e-mail arquivado preserva metadados, anexos e .eml", async () => {
    const e = await prisma.email.findUnique({
      where: { id: "email-1" },
      include: { anexos: true },
    });
    expect(e?.assunto).toContain("trabalhista");
    expect(JSON.parse(e!.destinatarios)).toContain("bruno.costa@exemplo.adv.br");
    expect(e?.emlPath).toBeTruthy();
    expect(e?.anexos.length).toBe(1);
  });

  it("FTS5: busca de documento por conteúdo OCR e insensível a acento", async () => {
    expect(await searchDocumentos(prisma, "horas extras")).toContain("doc-1");
    // "peticao" (sem acento) deve encontrar "Petição"
    expect(await searchDocumentos(prisma, "peticao")).toContain("doc-1");
    expect(await searchDocumentos(prisma, "cobrança")).toContain("doc-4");
    // termo inexistente não retorna nada
    expect(await searchDocumentos(prisma, "xyzinexistente")).toHaveLength(0);
  });

  it("FTS5: busca de e-mail por assunto e remetente", async () => {
    expect(await searchEmails(prisma, "acordo")).toContain("email-2");
    expect(await searchEmails(prisma, "acme")).toContain("email-1");
  });
});
