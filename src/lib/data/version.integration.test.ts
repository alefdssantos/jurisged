import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { criarDocumentoComArquivo, getDocumento } from "@/lib/data/document-service";
import * as versvc from "@/lib/data/version-service";
import { existeArquivo } from "@/lib/storage";

let docId = "";

describe("F5 — versionamento (integração)", () => {
  beforeAll(async () => {
    const doc = await criarDocumentoComArquivo({
      pastaId: "pasta-acme-trab-peticoes",
      nome: "Documento Versionado F5",
      arquivo: { nomeArquivo: "v1.txt", mimeType: "text/plain", bytes: Buffer.from("conteudo v1") },
      usuarioId: "ana.silva",
    });
    docId = doc.id;
  });

  afterAll(async () => {
    if (docId) await prisma.documento.deleteMany({ where: { id: docId } });
    await prisma.auditLog.deleteMany({ where: { entidadeId: docId || "__none__" } });
    await prisma.$disconnect();
  });

  it("nova versão incrementa o número e passa a ser a atual", async () => {
    const v2 = await versvc.novaVersao({
      documentoId: docId,
      arquivo: { nomeArquivo: "v2.txt", mimeType: "text/plain", bytes: Buffer.from("conteudo v2 maior") },
      comentario: "segunda versão",
      usuarioId: "ana.silva",
    });
    expect(v2.numero).toBe(2);
    expect(await existeArquivo(v2.storagePath)).toBe(true);

    const det = await getDocumento(docId);
    expect(det?.versoes.length).toBe(2);
    expect(det?.versoes.filter((v) => v.atual)).toHaveLength(1);
    expect(det?.versoes.find((v) => v.atual)?.numero).toBe(2);
  });

  it("restaurar versão anterior torna-a a única atual", async () => {
    const det = await getDocumento(docId);
    const v1 = det!.versoes.find((v) => v.numero === 1)!;
    await versvc.restaurarVersao({ versaoId: v1.id, usuarioId: "ana.silva" });

    const det2 = await getDocumento(docId);
    expect(det2?.versoes.filter((v) => v.atual)).toHaveLength(1);
    expect(det2?.versoes.find((v) => v.atual)?.numero).toBe(1);
  });

  it("registra auditoria de versionamento", async () => {
    const logs = await prisma.auditLog.findMany({ where: { entidadeId: docId, acao: "VERSIONAR" } });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });
});
