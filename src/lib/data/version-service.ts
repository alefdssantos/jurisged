import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { salvarArquivo, caminhoVersao } from "@/lib/storage";
import { reindexDocumento } from "@/lib/search/fts";
import { executarOcr } from "@/lib/ocr/ocr-service";

export async function novaVersao(input: {
  documentoId: string;
  arquivo: { nomeArquivo: string; mimeType: string; bytes: Buffer };
  comentario?: string | null;
  ocrText?: string | null;
  usuarioId?: string | null;
}) {
  const doc = await prisma.documento.findUnique({
    where: { id: input.documentoId },
    include: { versoes: { select: { numero: true } } },
  });
  if (!doc) throw new Error("Documento não encontrado.");
  if (!input.arquivo?.bytes?.length) throw new Error("Selecione um arquivo.");

  const proxNumero = Math.max(0, ...doc.versoes.map((v) => v.numero)) + 1;
  const ocrText =
    input.ocrText ??
    (await executarOcr({
      bytes: input.arquivo.bytes,
      mimeType: input.arquivo.mimeType,
      nomeArquivo: input.arquivo.nomeArquivo,
    }));
  await prisma.versao.updateMany({ where: { documentoId: input.documentoId }, data: { atual: false } });

  const versao = await prisma.versao.create({
    data: {
      documentoId: input.documentoId,
      numero: proxNumero,
      nomeArquivo: input.arquivo.nomeArquivo,
      mimeType: input.arquivo.mimeType,
      tamanho: input.arquivo.bytes.length,
      storagePath: "",
      ocrText,
      comentario: input.comentario?.trim() || null,
      atual: true,
      criadoPorId: input.usuarioId ?? null,
    },
  });

  const storagePath = caminhoVersao(input.documentoId, versao.id, input.arquivo.nomeArquivo);
  await salvarArquivo(storagePath, input.arquivo.bytes);
  await prisma.versao.update({ where: { id: versao.id }, data: { storagePath } });

  await reindexDocumento(prisma, input.documentoId);
  await logAudit({ usuarioId: input.usuarioId, acao: "VERSIONAR", entidade: "Documento", entidadeId: input.documentoId, detalhe: { novaVersao: proxNumero } });
  return versao;
}

/** Torna uma versão anterior a versão atual do documento. */
export async function restaurarVersao(input: { versaoId: string; usuarioId?: string | null }) {
  const versao = await prisma.versao.findUnique({ where: { id: input.versaoId } });
  if (!versao) throw new Error("Versão não encontrada.");
  await prisma.versao.updateMany({ where: { documentoId: versao.documentoId }, data: { atual: false } });
  await prisma.versao.update({ where: { id: input.versaoId }, data: { atual: true } });
  await reindexDocumento(prisma, versao.documentoId);
  await logAudit({ usuarioId: input.usuarioId, acao: "VERSIONAR", entidade: "Documento", entidadeId: versao.documentoId, detalhe: { restaurou: versao.numero } });
  return versao;
}
