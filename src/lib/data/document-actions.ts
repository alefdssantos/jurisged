"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import * as svc from "@/lib/data/document-service";

export interface ActionState {
  ok: boolean;
  message?: string;
}

async function uid() {
  return (await getSession())?.id ?? null;
}

export async function acaoUploadDocumento(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const file = fd.get("arquivo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Selecione um arquivo." };
    }
    await exigirPermissao(await uid(), "documento.escrever");
    const bytes = Buffer.from(await file.arrayBuffer());
    await svc.criarDocumentoComArquivo({
      pastaId: String(fd.get("pastaId") ?? ""),
      nome: String(fd.get("nome") ?? "").trim() || file.name,
      descricao: String(fd.get("descricao") ?? ""),
      categoriaId: String(fd.get("categoriaId") ?? "") || null,
      arquivo: {
        nomeArquivo: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
      },
      usuarioId: await uid(),
    });
    revalidatePath("/documentos");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro no upload." };
  }
}

export async function acaoExcluirDocumento(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao(await uid(), "documento.excluir");
    await svc.excluirDocumento({ id: String(fd.get("id") ?? ""), usuarioId: await uid() });
    revalidatePath("/documentos");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro ao excluir." };
  }
}
