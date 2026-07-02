"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/metadata-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

async function uid() {
  return (await getSession())?.id ?? null;
}

function fail(e: unknown): ActionState {
  return { ok: false, message: e instanceof Error ? e.message : "Erro inesperado." };
}

export async function acaoSalvarClassificacao(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    const documentoId = String(fd.get("documentoId") ?? "");
    const categoriaId = String(fd.get("categoriaId") ?? "") || null;
    const tagIds = fd.getAll("tagIds").map(String);
    const campoIds = String(fd.get("campoIds") ?? "").split(",").filter(Boolean);
    const valores = campoIds.map((cid) => ({ campoId: cid, valor: String(fd.get(`meta_${cid}`) ?? "") }));
    await svc.salvarClassificacao({ documentoId, categoriaId, tagIds, valores, usuarioId: await uid() });
    revalidatePath(`/documentos/${documentoId}`);
    revalidatePath("/documentos");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoCriarCategoria(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    await svc.criarCategoria({ nome: String(fd.get("nome") ?? ""), usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirCategoria(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    await svc.excluirCategoria({ id: String(fd.get("id") ?? ""), usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoCriarTag(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    await svc.criarTag({ nome: String(fd.get("nome") ?? ""), cor: String(fd.get("cor") ?? ""), usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirTag(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    await svc.excluirTag({ id: String(fd.get("id") ?? ""), usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoCriarCampo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    const tipo = String(fd.get("tipo") ?? "TEXTO");
    const opcoesRaw = String(fd.get("opcoes") ?? "").trim();
    const opcoes = opcoesRaw ? opcoesRaw.split(",").map((o) => o.trim()).filter(Boolean) : null;
    await svc.criarCampo({ nome: String(fd.get("nome") ?? ""), tipo, opcoes, usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirCampo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.escrever");
    await svc.excluirCampo({ id: String(fd.get("id") ?? ""), usuarioId: await uid() });
    revalidatePath("/catalogo");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
