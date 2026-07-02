"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/version-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

async function uid() {
  return (await getSession())?.id ?? null;
}

export async function acaoNovaVersao(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.versionar");
    const file = fd.get("arquivo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Selecione um arquivo." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const documentoId = String(fd.get("documentoId") ?? "");
    await svc.novaVersao({
      documentoId,
      arquivo: { nomeArquivo: file.name, mimeType: file.type || "application/octet-stream", bytes },
      comentario: String(fd.get("comentario") ?? ""),
      usuarioId: await uid(),
    });
    revalidatePath(`/documentos/${documentoId}`);
    revalidatePath("/documentos");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro na nova versão." };
  }
}

export async function acaoRestaurarVersao(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.versionar");
    const documentoId = String(fd.get("documentoId") ?? "");
    await svc.restaurarVersao({ versaoId: String(fd.get("versaoId") ?? ""), usuarioId: await uid() });
    revalidatePath(`/documentos/${documentoId}`);
    revalidatePath("/documentos");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao restaurar." };
  }
}
