"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { exigirPermissao } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { lerArquivo, existeArquivo } from "@/lib/storage";
import { executarOcr } from "@/lib/ocr/ocr-service";
import { reindexDocumento } from "@/lib/search/fts";
import { logAudit } from "@/lib/audit";

export interface ActionState {
  ok: boolean;
  message?: string;
}

export async function acaoExecutarOcr(_p: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await exigirPermissao((await getSession())?.id ?? null, "documento.escrever");
    const versaoId = String(fd.get("versaoId") ?? "");
    const documentoId = String(fd.get("documentoId") ?? "");
    const versao = await prisma.versao.findUnique({ where: { id: versaoId } });
    if (!versao) return { ok: false, message: "Versão não encontrada." };
    if (!versao.storagePath || !(await existeArquivo(versao.storagePath))) {
      return { ok: false, message: "Arquivo não encontrado." };
    }
    const bytes = await lerArquivo(versao.storagePath);
    const texto = await executarOcr({ bytes, mimeType: versao.mimeType, nomeArquivo: versao.nomeArquivo });
    await prisma.versao.update({ where: { id: versaoId }, data: { ocrText: texto } });
    await reindexDocumento(prisma, versao.documentoId);
    await logAudit({
      usuarioId: (await getSession())?.id ?? null,
      acao: "EDITAR",
      entidade: "Documento",
      entidadeId: versao.documentoId,
      detalhe: { ocr: true, versao: versao.numero },
    });
    revalidatePath(`/documentos/${documentoId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erro no OCR." };
  }
}
