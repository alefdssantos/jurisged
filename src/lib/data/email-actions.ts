"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/email-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

async function uid() {
  return (await getSession())?.id ?? null;
}

export async function acaoArquivarEmail(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const file = fd.get("eml");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Selecione um arquivo .eml." };
    }
    await exigirPermissao(await uid(), "email.arquivar");
    const bytes = Buffer.from(await file.arrayBuffer());
    const tagIds = fd.getAll("tagIds").map(String);
    await svc.arquivarEml({
      emlBytes: bytes,
      pastaId: String(fd.get("pastaId") ?? "") || null,
      tagIds,
      usuarioId: await uid(),
    });
    revalidatePath("/emails");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao arquivar." };
  }
}

export async function acaoExcluirEmail(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "email.arquivar");
    await svc.excluirEmail({ id: String(fd.get("id") ?? ""), usuarioId: await uid() });
    revalidatePath("/emails");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao excluir." };
  }
}
