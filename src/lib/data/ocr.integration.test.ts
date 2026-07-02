import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { criarDocumentoComArquivo, getDocumento } from "@/lib/data/document-service";
import { executarOcr } from "@/lib/ocr/ocr-service";
import { searchDocumentos } from "@/lib/search/fts";

let docId = "";

describe("F6 — OCR (integração)", () => {
  afterAll(async () => {
    if (docId) await prisma.documento.deleteMany({ where: { id: docId } });
    await prisma.auditLog.deleteMany({ where: { entidadeId: docId || "__none__" } });
    await prisma.$disconnect();
  });

  it("OCR no upload: texto extraído fica indexado para busca", async () => {
    const doc = await criarDocumentoComArquivo({
      pastaId: "pasta-acme-trab-peticoes",
      nome: "Documento OCR F6",
      arquivo: {
        nomeArquivo: "ocr.txt",
        mimeType: "text/plain",
        bytes: Buffer.from("conteudo reconhecido palavraunicaocr alfa"),
      },
      usuarioId: "ana.silva",
    });
    docId = doc.id;

    const det = await getDocumento(doc.id);
    expect(det?.versoes[0]?.ocrText).toContain("palavraunicaocr");
    expect(await searchDocumentos(prisma, "palavraunicaocr")).toContain(doc.id);
  });

  it("engine mock: conteúdo p/ texto e marcador p/ imagem/PDF", async () => {
    const t = await executarOcr({ bytes: Buffer.from("oi mundo"), mimeType: "text/plain", nomeArquivo: "a.txt" });
    expect(t).toBe("oi mundo");
    const p = await executarOcr({ bytes: Buffer.from("%PDF-1.4"), mimeType: "application/pdf", nomeArquivo: "scan.pdf" });
    expect(p).toMatch(/OCR simulado/i);
  });
});
