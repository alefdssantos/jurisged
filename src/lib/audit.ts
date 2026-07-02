import { prisma } from "@/lib/db";

export type AcaoAudit =
  | "CRIAR"
  | "EDITAR"
  | "EXCLUIR"
  | "MOVER"
  | "VISUALIZAR"
  | "VERSIONAR"
  | "ARQUIVAR_EMAIL"
  | "LOGIN";

export const ACAO_LABEL: Record<string, string> = {
  CRIAR: "Criou",
  EDITAR: "Editou",
  EXCLUIR: "Excluiu",
  MOVER: "Moveu",
  VISUALIZAR: "Visualizou",
  VERSIONAR: "Versionou",
  ARQUIVAR_EMAIL: "Arquivou e-mail",
  LOGIN: "Entrou",
};

/** Registra uma entrada de auditoria (rastreabilidade — base do F10). */
export async function logAudit(params: {
  usuarioId?: string | null;
  acao: AcaoAudit;
  entidade: string;
  entidadeId?: string | null;
  detalhe?: unknown;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      usuarioId: params.usuarioId ?? null,
      acao: params.acao,
      entidade: params.entidade,
      entidadeId: params.entidadeId ?? null,
      detalhe: params.detalhe === undefined ? null : JSON.stringify(params.detalhe),
    },
  });
}
