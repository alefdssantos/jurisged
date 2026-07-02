import { prisma } from "@/lib/db";

export async function getCategorias() {
  return prisma.categoria.findMany({ orderBy: { nome: "asc" } });
}

export async function getTags() {
  return prisma.tag.findMany({ orderBy: { nome: "asc" } });
}

export async function getCamposPersonalizados() {
  return prisma.campoPersonalizado.findMany({ orderBy: { nome: "asc" } });
}
