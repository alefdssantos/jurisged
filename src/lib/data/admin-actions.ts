"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/admin-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

function fail(e: unknown): ActionState {
  return { ok: false, message: e instanceof Error ? e.message : "Erro inesperado." };
}

async function guard(): Promise<string | null> {
  const a = (await getSession())?.id ?? null;
  await exigirPermissao(a, "admin.gerenciar");
  return a;
}

export async function acaoCriarGrupo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.criarGrupo({ nome: String(fd.get("nome") ?? ""), descricao: String(fd.get("descricao") ?? ""), autorId: a });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoRenomearGrupo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.renomearGrupo({ id: String(fd.get("id") ?? ""), nome: String(fd.get("nome") ?? ""), descricao: String(fd.get("descricao") ?? ""), autorId: a });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirGrupo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.excluirGrupo({ id: String(fd.get("id") ?? ""), autorId: a });
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoDefinirPermissoesGrupo(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.definirPermissoesGrupo({ grupoId: String(fd.get("grupoId") ?? ""), permissaoIds: fd.getAll("permissaoIds").map(String), autorId: a });
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoDefinirGruposUsuario(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.definirGruposUsuario({ usuarioId: String(fd.get("usuarioId") ?? ""), grupoIds: fd.getAll("grupoIds").map(String), autorId: a });
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acaoDefinirAtivoUsuario(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const a = await guard();
    await svc.definirAtivoUsuario({ usuarioId: String(fd.get("usuarioId") ?? ""), ativo: String(fd.get("ativo") ?? "") === "true", autorId: a });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
