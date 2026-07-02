import { prisma } from "@/lib/db";

export type NodeTipo = "cliente" | "processo" | "pasta";

export interface TreeNode {
  id: string;
  nome: string;
  tipo: NodeTipo;
  href: string;
  filhos: TreeNode[];
}

export function noHref(tipo: NodeTipo, id: string): string {
  return `/clientes?tipo=${tipo}&id=${id}`;
}

interface PastaFlat {
  id: string;
  nome: string;
  parentId: string | null;
}

/** Monta a árvore de pastas (aninhadas por parentId) a partir da lista plana. */
function montarPastas(pastas: PastaFlat[]): TreeNode[] {
  const filhosPorPai = new Map<string | null, PastaFlat[]>();
  for (const p of pastas) {
    const arr = filhosPorPai.get(p.parentId) ?? [];
    arr.push(p);
    filhosPorPai.set(p.parentId, arr);
  }
  const build = (parentId: string | null): TreeNode[] =>
    (filhosPorPai.get(parentId) ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      tipo: "pasta" as const,
      href: noHref("pasta", p.id),
      filhos: build(p.id),
    }));
  return build(null);
}

/** Árvore completa Cliente → Processo → Pasta (para a sidebar e a página). */
export async function getTree(): Promise<TreeNode[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: {
      processos: {
        orderBy: { criadoEm: "asc" },
        include: {
          pastas: {
            orderBy: { nome: "asc" },
            select: { id: true, nome: true, parentId: true },
          },
        },
      },
    },
  });

  return clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    tipo: "cliente" as const,
    href: noHref("cliente", c.id),
    filhos: c.processos.map((p) => ({
      id: p.id,
      nome: p.numero ? `${p.numero} — ${p.titulo}` : p.titulo,
      tipo: "processo" as const,
      href: noHref("processo", p.id),
      filhos: montarPastas(p.pastas),
    })),
  }));
}

/** Árvore com campos brutos para a tela de gerenciamento (CRUD). */
export async function getArvoreCompleta() {
  return prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: {
      processos: {
        orderBy: { criadoEm: "asc" },
        include: {
          pastas: {
            orderBy: { nome: "asc" },
            select: { id: true, nome: true, parentId: true },
          },
        },
      },
    },
  });
}

/** Lista de processos com o nome do cliente (para selects de filtro). */
export async function getProcessosComCliente() {
  const processos = await prisma.processo.findMany({
    orderBy: { criadoEm: "asc" },
    include: { cliente: true },
  });
  return processos.map((p) => ({
    id: p.id,
    rotulo: `${p.cliente.nome} › ${p.numero ? p.numero + " — " : ""}${p.titulo}`,
  }));
}

/** Lista plana de pastas com caminho legível (para selects de upload). */
export async function getPastasComCaminho() {
  const pastas = await prisma.pasta.findMany({
    orderBy: { nome: "asc" },
    include: { processo: { include: { cliente: true } } },
  });
  return pastas.map((p) => ({
    id: p.id,
    rotulo: `${p.processo.cliente.nome} › ${p.processo.titulo} › ${p.nome}`,
  }));
}

export async function getClientes() {
  return prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { processos: true } } },
  });
}

export async function getClienteDetalhe(id: string) {
  return prisma.cliente.findUnique({
    where: { id },
    include: {
      processos: {
        orderBy: { criadoEm: "asc" },
        include: { _count: { select: { pastas: true } } },
      },
    },
  });
}

export async function getProcessoDetalhe(id: string) {
  return prisma.processo.findUnique({
    where: { id },
    include: {
      cliente: true,
      pastas: {
        orderBy: { nome: "asc" },
        include: { _count: { select: { documentos: true, emails: true } } },
      },
    },
  });
}

export async function getPastaDetalhe(id: string) {
  return prisma.pasta.findUnique({
    where: { id },
    include: {
      processo: { include: { cliente: true } },
      parent: true,
      filhos: { orderBy: { nome: "asc" } },
      _count: { select: { documentos: true, emails: true } },
    },
  });
}
