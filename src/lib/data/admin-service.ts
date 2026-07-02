import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

function unico<T>(fn: () => Promise<T>, msg: string): Promise<T> {
  return fn().catch((e: unknown) => {
    if ((e as { code?: string })?.code === "P2002") throw new Error(msg);
    throw e;
  });
}

export async function getUsuarios() {
  return prisma.usuario.findMany({ orderBy: { nome: "asc" }, include: { grupos: true } });
}

export async function getGrupos() {
  return prisma.grupo.findMany({
    orderBy: { nome: "asc" },
    include: { permissoes: true, _count: { select: { usuarios: true } } },
  });
}

export async function getPermissoes() {
  return prisma.permissao.findMany({ orderBy: { chave: "asc" } });
}

export async function criarGrupo(input: { nome: string; descricao?: string | null; autorId?: string | null }) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome do grupo.");
  const g = await unico(
    () => prisma.grupo.create({ data: { nome, descricao: input.descricao?.trim() || null } }),
    "Já existe um grupo com esse nome.",
  );
  await logAudit({ usuarioId: input.autorId, acao: "CRIAR", entidade: "Grupo", entidadeId: g.id, detalhe: { nome } });
  return g;
}

export async function renomearGrupo(input: { id: string; nome: string; descricao?: string | null; autorId?: string | null }) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome do grupo.");
  const g = await prisma.grupo.update({ where: { id: input.id }, data: { nome, descricao: input.descricao?.trim() || null } });
  await logAudit({ usuarioId: input.autorId, acao: "EDITAR", entidade: "Grupo", entidadeId: g.id, detalhe: { nome } });
  return g;
}

export async function excluirGrupo(input: { id: string; autorId?: string | null }) {
  const g = await prisma.grupo.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.autorId, acao: "EXCLUIR", entidade: "Grupo", entidadeId: input.id, detalhe: { nome: g.nome } });
}

export async function definirPermissoesGrupo(input: { grupoId: string; permissaoIds: string[]; autorId?: string | null }) {
  await prisma.grupo.update({
    where: { id: input.grupoId },
    data: { permissoes: { set: input.permissaoIds.map((id) => ({ id })) } },
  });
  await logAudit({ usuarioId: input.autorId, acao: "EDITAR", entidade: "Grupo", entidadeId: input.grupoId, detalhe: { permissoes: input.permissaoIds.length } });
}

export async function definirGruposUsuario(input: { usuarioId: string; grupoIds: string[]; autorId?: string | null }) {
  await prisma.usuario.update({
    where: { id: input.usuarioId },
    data: { grupos: { set: input.grupoIds.map((id) => ({ id })) } },
  });
  await logAudit({ usuarioId: input.autorId, acao: "EDITAR", entidade: "Usuario", entidadeId: input.usuarioId, detalhe: { grupos: input.grupoIds.length } });
}

export async function definirAtivoUsuario(input: { usuarioId: string; ativo: boolean; autorId?: string | null }) {
  await prisma.usuario.update({ where: { id: input.usuarioId }, data: { ativo: input.ativo } });
  await logAudit({ usuarioId: input.autorId, acao: "EDITAR", entidade: "Usuario", entidadeId: input.usuarioId, detalhe: { ativo: input.ativo } });
}
