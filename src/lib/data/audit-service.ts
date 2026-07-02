import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface FiltrosAuditoria {
  acao?: string;
  entidade?: string;
  usuarioId?: string;
}

export const ACOES = [
  "CRIAR",
  "EDITAR",
  "EXCLUIR",
  "MOVER",
  "VERSIONAR",
  "ARQUIVAR_EMAIL",
  "LOGIN",
] as const;

export const ENTIDADES = [
  "Documento",
  "Pasta",
  "Email",
  "Cliente",
  "Processo",
  "Categoria",
  "Tag",
  "CampoPersonalizado",
  "Usuario",
] as const;

export async function getAuditoriaGlobal(f: FiltrosAuditoria = {}) {
  const where: Prisma.AuditLogWhereInput = {};
  if (f.acao) where.acao = f.acao;
  if (f.entidade) where.entidade = f.entidade;
  if (f.usuarioId) where.usuarioId = f.usuarioId;
  return prisma.auditLog.findMany({
    where,
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { usuario: true },
  });
}

export async function getAuditoriaEntidade(entidade: string, entidadeId: string) {
  return prisma.auditLog.findMany({
    where: { entidade, entidadeId },
    orderBy: { criadoEm: "desc" },
    include: { usuario: true },
  });
}
