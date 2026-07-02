import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * Camada de serviço (lógica pura, validada e auditada) para a hierarquia
 * Cliente → Processo → Pasta. As server actions são finas wrappers disto;
 * estes testes de integração exercitam estas funções diretamente.
 */

function exigir(valor: string | null | undefined, label: string): string {
  const v = (valor ?? "").trim();
  if (!v) throw new Error(`Informe ${label}.`);
  if (v.length > 200) throw new Error(`${label} é muito longo (máx. 200).`);
  return v;
}

function limpar(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  return v.length > 0 ? v : null;
}

// ---------- Cliente ----------

export async function criarCliente(input: {
  nome: string;
  documento?: string | null;
  email?: string | null;
  usuarioId?: string | null;
}) {
  const nome = exigir(input.nome, "o nome do cliente");
  const cliente = await prisma.cliente.create({
    data: { nome, documento: limpar(input.documento), email: limpar(input.email) },
  });
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Cliente", entidadeId: cliente.id, detalhe: { nome } });
  return cliente;
}

export async function renomearCliente(input: { id: string; nome: string; usuarioId?: string | null }) {
  const nome = exigir(input.nome, "o nome do cliente");
  const cliente = await prisma.cliente.update({ where: { id: input.id }, data: { nome } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EDITAR", entidade: "Cliente", entidadeId: cliente.id, detalhe: { nome } });
  return cliente;
}

export async function excluirCliente(input: { id: string; usuarioId?: string | null }) {
  const cliente = await prisma.cliente.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Cliente", entidadeId: input.id, detalhe: { nome: cliente.nome } });
  return cliente;
}

// ---------- Processo ----------

export async function criarProcesso(input: {
  clienteId: string;
  titulo: string;
  numero?: string | null;
  area?: string | null;
  usuarioId?: string | null;
}) {
  const titulo = exigir(input.titulo, "o título do processo");
  const cliente = await prisma.cliente.findUnique({ where: { id: input.clienteId } });
  if (!cliente) throw new Error("Cliente não encontrado.");
  const processo = await prisma.processo.create({
    data: { clienteId: input.clienteId, titulo, numero: limpar(input.numero), area: limpar(input.area) },
  });
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Processo", entidadeId: processo.id, detalhe: { titulo } });
  return processo;
}

export async function renomearProcesso(input: {
  id: string;
  titulo: string;
  numero?: string | null;
  area?: string | null;
  usuarioId?: string | null;
}) {
  const titulo = exigir(input.titulo, "o título do processo");
  const processo = await prisma.processo.update({
    where: { id: input.id },
    data: { titulo, numero: limpar(input.numero), area: limpar(input.area) },
  });
  await logAudit({ usuarioId: input.usuarioId, acao: "EDITAR", entidade: "Processo", entidadeId: processo.id, detalhe: { titulo } });
  return processo;
}

export async function excluirProcesso(input: { id: string; usuarioId?: string | null }) {
  const processo = await prisma.processo.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Processo", entidadeId: input.id, detalhe: { titulo: processo.titulo } });
  return processo;
}

// ---------- Pasta ----------

export async function criarPasta(input: {
  processoId: string;
  nome: string;
  parentId?: string | null;
  usuarioId?: string | null;
}) {
  const nome = exigir(input.nome, "o nome da pasta");
  const processo = await prisma.processo.findUnique({ where: { id: input.processoId } });
  if (!processo) throw new Error("Processo não encontrado.");
  if (input.parentId) {
    const parent = await prisma.pasta.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.processoId !== input.processoId) {
      throw new Error("Pasta-pai inválida.");
    }
  }
  const pasta = await prisma.pasta.create({
    data: { processoId: input.processoId, nome, parentId: input.parentId ?? null },
  });
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Pasta", entidadeId: pasta.id, detalhe: { nome } });
  return pasta;
}

export async function renomearPasta(input: { id: string; nome: string; usuarioId?: string | null }) {
  const nome = exigir(input.nome, "o nome da pasta");
  const pasta = await prisma.pasta.update({ where: { id: input.id }, data: { nome } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EDITAR", entidade: "Pasta", entidadeId: pasta.id, detalhe: { nome } });
  return pasta;
}

/** Move uma pasta para outro pai (mesmo processo), evitando ciclos. */
export async function moverPasta(input: {
  id: string;
  novoParentId: string | null;
  usuarioId?: string | null;
}) {
  const pasta = await prisma.pasta.findUnique({ where: { id: input.id } });
  if (!pasta) throw new Error("Pasta não encontrada.");
  if (input.novoParentId) {
    if (input.novoParentId === input.id) {
      throw new Error("Uma pasta não pode ser movida para dentro de si mesma.");
    }
    const novo = await prisma.pasta.findUnique({ where: { id: input.novoParentId } });
    if (!novo || novo.processoId !== pasta.processoId) {
      throw new Error("Destino inválido (deve ser do mesmo processo).");
    }
    if (await ehDescendente(input.novoParentId, input.id)) {
      throw new Error("Movimento criaria um ciclo na árvore.");
    }
  }
  const atualizada = await prisma.pasta.update({
    where: { id: input.id },
    data: { parentId: input.novoParentId },
  });
  await logAudit({ usuarioId: input.usuarioId, acao: "MOVER", entidade: "Pasta", entidadeId: input.id, detalhe: { novoParentId: input.novoParentId } });
  return atualizada;
}

export async function excluirPasta(input: { id: string; usuarioId?: string | null }) {
  const pasta = await prisma.pasta.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Pasta", entidadeId: input.id, detalhe: { nome: pasta.nome } });
  return pasta;
}

/** true se `candidatoId` está na subárvore de `ancestralId`. */
async function ehDescendente(candidatoId: string, ancestralId: string): Promise<boolean> {
  let atual = await prisma.pasta.findUnique({
    where: { id: candidatoId },
    select: { parentId: true },
  });
  while (atual?.parentId) {
    if (atual.parentId === ancestralId) return true;
    atual = await prisma.pasta.findUnique({
      where: { id: atual.parentId },
      select: { parentId: true },
    });
  }
  return false;
}
