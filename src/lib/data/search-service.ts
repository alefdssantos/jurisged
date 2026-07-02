import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { searchDocumentos, searchEmails } from "@/lib/search/fts";

export interface FiltrosBusca {
  q?: string;
  clienteId?: string;
  processoId?: string;
  categoriaId?: string;
  tagId?: string;
  de?: string; // YYYY-MM-DD
  ate?: string;
  tipo?: string; // todos | documentos | emails
}

function intervaloDatas(de?: string, ate?: string) {
  return {
    de: de ? new Date(`${de}T00:00:00`) : undefined,
    ate: ate ? new Date(`${ate}T23:59:59`) : undefined,
  };
}

async function buscarDocumentos(f: FiltrosBusca) {
  const { de, ate } = intervaloDatas(f.de, f.ate);
  const conds: Prisma.DocumentoWhereInput[] = [];
  const q = (f.q ?? "").trim();
  if (q) {
    const ids = await searchDocumentos(prisma, q, 500);
    conds.push({ id: { in: ids.length ? ids : ["__sem_resultado__"] } });
  }
  if (f.categoriaId) conds.push({ categoriaId: f.categoriaId });
  if (f.tagId) conds.push({ tags: { some: { id: f.tagId } } });
  if (f.processoId) conds.push({ pasta: { processoId: f.processoId } });
  if (f.clienteId) conds.push({ pasta: { processo: { clienteId: f.clienteId } } });
  if (de || ate) conds.push({ criadoEm: { gte: de, lte: ate } });

  return prisma.documento.findMany({
    where: { AND: conds },
    orderBy: { criadoEm: "desc" },
    take: 100,
    include: {
      categoria: true,
      tags: true,
      pasta: { include: { processo: { include: { cliente: true } } } },
      versoes: { where: { atual: true }, take: 1 },
    },
  });
}

async function buscarEmails(f: FiltrosBusca) {
  const { de, ate } = intervaloDatas(f.de, f.ate);
  const conds: Prisma.EmailWhereInput[] = [];
  const q = (f.q ?? "").trim();
  if (q) {
    const ids = await searchEmails(prisma, q, 500);
    conds.push({ id: { in: ids.length ? ids : ["__sem_resultado__"] } });
  }
  if (f.tagId) conds.push({ tags: { some: { id: f.tagId } } });
  if (f.processoId) conds.push({ pasta: { processoId: f.processoId } });
  if (f.clienteId) conds.push({ pasta: { processo: { clienteId: f.clienteId } } });
  if (de || ate) conds.push({ dataEnvio: { gte: de, lte: ate } });

  return prisma.email.findMany({
    where: { AND: conds },
    orderBy: { dataEnvio: "desc" },
    take: 100,
    include: {
      tags: true,
      anexos: true,
      pasta: { include: { processo: { include: { cliente: true } } } },
    },
  });
}

export async function buscar(f: FiltrosBusca) {
  const incluiDocs = !f.tipo || f.tipo === "todos" || f.tipo === "documentos";
  // categoria não se aplica a e-mails: se filtrar por categoria, e-mails ficam fora.
  const incluiEmails =
    (!f.tipo || f.tipo === "todos" || f.tipo === "emails") && !f.categoriaId;

  const [documentos, emails] = await Promise.all([
    incluiDocs ? buscarDocumentos(f) : Promise.resolve([]),
    incluiEmails ? buscarEmails(f) : Promise.resolve([]),
  ]);

  return { documentos, emails };
}
