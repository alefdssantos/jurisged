import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import * as docsvc from "@/lib/data/document-service";
import { searchDocumentos } from "@/lib/search/fts";
import { existeArquivo } from "@/lib/storage";

let criadoId = "";

describe("F3 — documentos: upload + listagem + visualização (integração)", () => {
  afterAll(async () => {
    if (criadoId) await prisma.documento.deleteMany({ where: { id: criadoId } });
    await prisma.auditLog.deleteMany({ where: { entidadeId: criadoId || "__none__" } });
    await prisma.$disconnect();
  });

  it("lista os documentos do seed", async () => {
    const docs = await docsvc.getDocumentos();
    expect(docs.length).toBe(4);
    const d1 = docs.find((d) => d.id === "doc-1");
    expect(d1?.versoes[0]?.atual).toBe(true);
  });

  it("detalha documento com versões, tags e metadados", async () => {
    const d = await docsvc.getDocumento("doc-1");
    expect(d?.versoes.length).toBe(2);
    expect(d?.tags.length).toBeGreaterThan(0);
    expect(d?.metadados.length).toBeGreaterThan(0);
  });

  it("upload cria documento + versão + arquivo em disco e indexa", async () => {
    const bytes = Buffer.from("Conteudo de teste contrato locacao xyzteste", "utf8");
    const doc = await docsvc.criarDocumentoComArquivo({
      pastaId: "pasta-acme-trab-peticoes",
      nome: "Documento Teste F3 xyzteste",
      arquivo: { nomeArquivo: "teste.txt", mimeType: "text/plain", bytes },
      usuarioId: "ana.silva",
    });
    criadoId = doc.id;

    const det = await docsvc.getDocumento(doc.id);
    expect(det?.versoes.length).toBe(1);
    const v = det!.versoes[0]!;
    expect(v.storagePath).toContain("storage/documentos/");
    expect(v.tamanho).toBe(bytes.length);
    expect(await existeArquivo(v.storagePath)).toBe(true);
    expect(await searchDocumentos(prisma, "xyzteste")).toContain(doc.id);
  });

  it("excluir documento remove arquivo, registro e índice", async () => {
    const det = await docsvc.getDocumento(criadoId);
    const path = det!.versoes[0]!.storagePath;
    await docsvc.excluirDocumento({ id: criadoId, usuarioId: "ana.silva" });
    expect(await prisma.documento.findUnique({ where: { id: criadoId } })).toBeNull();
    expect(await existeArquivo(path)).toBe(false);
    expect(await searchDocumentos(prisma, "xyzteste")).not.toContain(criadoId);
    expect(await docsvc.getDocumentos()).toHaveLength(4);
    criadoId = "";
  });
});
