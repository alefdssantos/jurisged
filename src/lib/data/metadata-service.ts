import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { reindexDocumento } from "@/lib/search/fts";

export const TIPOS_CAMPO = ["TEXTO", "NUMERO", "DATA", "BOOLEANO", "LISTA"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

function unico<T>(fn: () => Promise<T>, msg: string): Promise<T> {
  return fn().catch((e: unknown) => {
    if ((e as { code?: string })?.code === "P2002") throw new Error(msg);
    throw e;
  });
}

// ---------- Classificação de um documento ----------

export async function salvarClassificacao(input: {
  documentoId: string;
  categoriaId: string | null;
  tagIds: string[];
  valores: { campoId: string; valor: string }[];
  usuarioId?: string | null;
}) {
  const doc = await prisma.documento.findUnique({ where: { id: input.documentoId } });
  if (!doc) throw new Error("Documento não encontrado.");

  await prisma.documento.update({
    where: { id: input.documentoId },
    data: {
      categoriaId: input.categoriaId || null,
      tags: { set: input.tagIds.map((id) => ({ id })) },
    },
  });

  for (const v of input.valores) {
    const valor = v.valor.trim();
    if (!valor) {
      await prisma.metadadoValor.deleteMany({
        where: { documentoId: input.documentoId, campoId: v.campoId },
      });
    } else {
      await prisma.metadadoValor.upsert({
        where: { documentoId_campoId: { documentoId: input.documentoId, campoId: v.campoId } },
        update: { valor },
        create: { documentoId: input.documentoId, campoId: v.campoId, valor },
      });
    }
  }

  await reindexDocumento(prisma, input.documentoId);
  await logAudit({ usuarioId: input.usuarioId, acao: "EDITAR", entidade: "Documento", entidadeId: input.documentoId, detalhe: { classificacao: true } });
}

// ---------- Catálogo: Categorias ----------

export async function criarCategoria(input: { nome: string; usuarioId?: string | null }) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome da categoria.");
  const c = await unico(
    () => prisma.categoria.create({ data: { nome } }),
    "Já existe uma categoria com esse nome.",
  );
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Categoria", entidadeId: c.id, detalhe: { nome } });
  return c;
}

export async function excluirCategoria(input: { id: string; usuarioId?: string | null }) {
  const c = await prisma.categoria.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Categoria", entidadeId: input.id, detalhe: { nome: c.nome } });
}

// ---------- Catálogo: Tags ----------

export async function criarTag(input: { nome: string; cor?: string; usuarioId?: string | null }) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome da tag.");
  const t = await unico(
    () => prisma.tag.create({ data: { nome, cor: input.cor?.trim() || "neutral" } }),
    "Já existe uma tag com esse nome.",
  );
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "Tag", entidadeId: t.id, detalhe: { nome } });
  return t;
}

export async function excluirTag(input: { id: string; usuarioId?: string | null }) {
  const t = await prisma.tag.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Tag", entidadeId: input.id, detalhe: { nome: t.nome } });
}

// ---------- Catálogo: Campos personalizados ----------

export async function criarCampo(input: {
  nome: string;
  tipo: string;
  opcoes?: string[] | null;
  usuarioId?: string | null;
}) {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome do campo.");
  if (!TIPOS_CAMPO.includes(input.tipo as TipoCampo)) throw new Error("Tipo de campo inválido.");
  if (input.tipo === "LISTA" && (!input.opcoes || input.opcoes.length === 0)) {
    throw new Error("Campos do tipo LISTA precisam de ao menos uma opção.");
  }
  const c = await unico(
    () =>
      prisma.campoPersonalizado.create({
        data: {
          nome,
          tipo: input.tipo,
          opcoes: input.tipo === "LISTA" ? JSON.stringify(input.opcoes) : null,
        },
      }),
    "Já existe um campo com esse nome.",
  );
  await logAudit({ usuarioId: input.usuarioId, acao: "CRIAR", entidade: "CampoPersonalizado", entidadeId: c.id, detalhe: { nome, tipo: input.tipo } });
  return c;
}

export async function excluirCampo(input: { id: string; usuarioId?: string | null }) {
  const c = await prisma.campoPersonalizado.delete({ where: { id: input.id } });
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "CampoPersonalizado", entidadeId: input.id, detalhe: { nome: c.nome } });
}
