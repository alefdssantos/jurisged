import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { salvarArquivo, removerPrefixo, caminhoVersao } from "@/lib/storage";
import { reindexDocumento } from "@/lib/search/fts";
import { executarOcr } from "@/lib/ocr/ocr-service";

export async function getDocumentos(opts?: { pastaId?: string }) {
  return prisma.documento.findMany({
    where: opts?.pastaId ? { pastaId: opts.pastaId } : undefined,
    orderBy: { atualizadoEm: "desc" },
    include: {
      categoria: true,
      tags: true,
      pasta: { include: { processo: { include: { cliente: true } } } },
      criadoPor: true,
      versoes: { where: { atual: true }, take: 1 },
      _count: { select: { versoes: true } },
    },
  });
}

export async function getDocumento(id: string) {
  return prisma.documento.findUnique({
    where: { id },
    include: {
      categoria: true,
      tags: true,
      metadados: { include: { campo: true } },
      pasta: { include: { processo: { include: { cliente: true } } } },
      criadoPor: true,
      versoes: { orderBy: { numero: "desc" }, include: { criadoPor: true } },
      origemEmail: true,
    },
  });
}

export async function getVersao(id: string) {
  return prisma.versao.findUnique({ where: { id } });
}

export interface UploadInput {
  pastaId: string;
  nome: string;
  descricao?: string | null;
  categoriaId?: string | null;
  arquivo: { nomeArquivo: string; mimeType: string; bytes: Buffer };
  usuarioId?: string | null;
}

export async function criarDocumentoComArquivo(input: UploadInput) {
  const nome = (input.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome do documento.");
  const pasta = await prisma.pasta.findUnique({ where: { id: input.pastaId } });
  if (!pasta) throw new Error("Pasta não encontrada.");
  if (!input.arquivo?.bytes?.length) throw new Error("Selecione um arquivo.");

  const doc = await prisma.documento.create({
    data: {
      pastaId: input.pastaId,
      nome,
      descricao: input.descricao?.trim() || null,
      categoriaId: input.categoriaId || null,
      criadoPorId: input.usuarioId ?? null,
    },
  });

  const ocrText = await executarOcr({
    bytes: input.arquivo.bytes,
    mimeType: input.arquivo.mimeType,
    nomeArquivo: input.arquivo.nomeArquivo,
  });

  const versao = await prisma.versao.create({
    data: {
      documentoId: doc.id,
      numero: 1,
      nomeArquivo: input.arquivo.nomeArquivo,
      mimeType: input.arquivo.mimeType,
      tamanho: input.arquivo.bytes.length,
      storagePath: "",
      ocrText,
      atual: true,
      criadoPorId: input.usuarioId ?? null,
    },
  });

  const storagePath = caminhoVersao(doc.id, versao.id, input.arquivo.nomeArquivo);
  await salvarArquivo(storagePath, input.arquivo.bytes);
  await prisma.versao.update({ where: { id: versao.id }, data: { storagePath } });

  await reindexDocumento(prisma, doc.id);
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Documento", entidadeId: doc.id, detalhe: { nome } });
  return doc;
}

export async function excluirDocumento(input: { id: string; usuarioId?: string | null }) {
  const doc = await prisma.documento.findUnique({ where: { id: input.id } });
  if (!doc) throw new Error("Documento não encontrado.");
  await prisma.documento.delete({ where: { id: input.id } });
  await removerPrefixo(`storage/documentos/${input.id}`);
  await reindexDocumento(prisma, input.id); // remove do índice (documento já não existe)
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Documento", entidadeId: input.id, detalhe: { nome: doc.nome } });
}
