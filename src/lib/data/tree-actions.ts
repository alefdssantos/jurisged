"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/tree-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

const OK: ActionState = { ok: true };

function fail(e: unknown): ActionState {
  return { ok: false, message: e instanceof Error ? e.message : "Erro inesperado." };
}

function revalidar() {
  revalidatePath("/clientes");
  revalidatePath("/", "layout"); // atualiza a árvore na sidebar
}

async function uid() {
  return (await getSession())?.id ?? null;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ---------- Cliente ----------

export async function acaoCriarCliente(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.criarCliente({ nome: str(fd, "nome"), documento: str(fd, "documento"), email: str(fd, "email"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoRenomearCliente(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.renomearCliente({ id: str(fd, "id"), nome: str(fd, "nome"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirCliente(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.excluirCliente({ id: str(fd, "id"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

// ---------- Processo ----------

export async function acaoCriarProcesso(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.criarProcesso({ clienteId: str(fd, "clienteId"), titulo: str(fd, "titulo"), numero: str(fd, "numero"), area: str(fd, "area"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoRenomearProcesso(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.renomearProcesso({ id: str(fd, "id"), titulo: str(fd, "titulo"), numero: str(fd, "numero"), area: str(fd, "area"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirProcesso(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.excluirProcesso({ id: str(fd, "id"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

// ---------- Pasta ----------

export async function acaoCriarPasta(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.criarPasta({ processoId: str(fd, "processoId"), nome: str(fd, "nome"), parentId: str(fd, "parentId") || null, usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoRenomearPasta(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.renomearPasta({ id: str(fd, "id"), nome: str(fd, "nome"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoMoverPasta(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.moverPasta({ id: str(fd, "id"), novoParentId: str(fd, "novoParentId") || null, usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}

export async function acaoExcluirPasta(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "pasta.gerenciar");
    await svc.excluirPasta({ id: str(fd, "id"), usuarioId: await uid() });
    revalidar();
    return OK;
  } catch (e) {
    return fail(e);
  }
}
