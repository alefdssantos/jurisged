import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { criarDocumentoComArquivo } from "@/lib/data/document-service";
import { novaVersao } from "@/lib/data/version-service";
import { getAuditoriaEntidade, getAuditoriaGlobal } from "@/lib/data/audit-service";

let docId = "";

describe("F10 — rastreabilidade / auditoria (integração)", () => {
  afterAll(async () => {
    if (docId) {
      await prisma.documento.deleteMany({ where: { id: docId } });
      await prisma.auditLog.deleteMany({ where: { entidadeId: docId } });
    }
    await prisma.$disconnect();
  });

  it("ações geram trilha por entidade com usuário vinculado", async () => {
    const doc = await criarDocumentoComArquivo({
      pastaId: "pasta-acme-trab-peticoes",
      nome: "Doc Auditoria F10",
      arquivo: { nomeArquivo: "a.txt", mimeType: "text/plain", bytes: Buffer.from("x") },
      usuarioId: "bruno.costa",
    });
    docId = doc.id;
    await novaVersao({
      documentoId: doc.id,
      arquivo: { nomeArquivo: "b.txt", mimeType: "text/plain", bytes: Buffer.from("y") },
      usuarioId: "bruno.costa",
    });

    const tl = await getAuditoriaEntidade("Documento", doc.id);
    const acoes = tl.map((e) => e.acao);
    expect(acoes).toContain("CRIAR");
    expect(acoes).toContain("VERSIONAR");
    expect(tl[0]?.usuario?.id).toBe("bruno.costa");
  });

  it("seed já contém auditoria (CRIAR e ARQUIVAR_EMAIL)", async () => {
    const acoes = new Set((await getAuditoriaGlobal()).map((e) => e.acao));
    expect(acoes.has("CRIAR")).toBe(true);
    expect(acoes.has("ARQUIVAR_EMAIL")).toBe(true);
  });

  it("filtro por ação retorna apenas a ação pedida", async () => {
    const r = await getAuditoriaGlobal({ acao: "VERSIONAR" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.acao === "VERSIONAR")).toBe(true);
  });
});
