import { simpleParser, type AddressObject } from "mailparser";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { salvarArquivo, removerPrefixo } from "@/lib/storage";
import { reindexEmail } from "@/lib/search/fts";

function enderecos(a: AddressObject | AddressObject[] | undefined): string[] {
  if (!a) return [];
  const arr = Array.isArray(a) ? a : [a];
  return arr.flatMap((x) => x.value.map((v) => v.address ?? "").filter(Boolean));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 20000);
}

/**
 * Classificação por regra: casa o domínio do remetente com o domínio do
 * cliente e sugere a pasta "E-mails" daquele cliente (ou a primeira pasta).
 */
export async function sugerirPastaParaEmail(remetente: string): Promise<string | null> {
  const dominio = remetente.split("@")[1]?.toLowerCase();
  if (!dominio) return null;
  const clientes = await prisma.cliente.findMany({
    where: { email: { not: null } },
    include: { processos: { include: { pastas: true } } },
  });
  for (const c of clientes) {
    const dCli = c.email?.split("@")[1]?.toLowerCase();
    if (dCli && dCli === dominio) {
      for (const p of c.processos) {
        const pasta = p.pastas.find((pa) => pa.nome.toLowerCase().includes("mail"));
        if (pasta) return pasta.id;
      }
      return c.processos[0]?.pastas[0]?.id ?? null;
    }
  }
  return null;
}

export async function getEmails() {
  return prisma.email.findMany({
    orderBy: { dataEnvio: "desc" },
    include: {
      anexos: true,
      tags: true,
      pasta: { include: { processo: { include: { cliente: true } } } },
    },
  });
}

export async function getEmail(id: string) {
  return prisma.email.findUnique({
    where: { id },
    include: {
      anexos: true,
      tags: true,
      pasta: { include: { processo: { include: { cliente: true } } } },
    },
  });
}

/**
 * Arquiva um .eml com fidelidade total: preserva o bruto, extrai
 * corpo/headers/anexos para metadados e indexa para busca.
 */
export async function arquivarEml(input: {
  emlBytes: Buffer;
  pastaId?: string | null;
  tagIds?: string[];
  usuarioId?: string | null;
}) {
  if (!input.emlBytes?.length) throw new Error("Selecione um arquivo .eml.");
  const parsed = await simpleParser(input.emlBytes);

  const remetente = parsed.from?.value?.[0]?.address ?? parsed.from?.text ?? "(desconhecido)";
  const destinatarios = enderecos(parsed.to);
  const cc = enderecos(parsed.cc);
  const pastaId = input.pastaId || (await sugerirPastaParaEmail(remetente));

  const email = await prisma.email.create({
    data: {
      pastaId: pastaId ?? null,
      assunto: parsed.subject?.trim() || "(sem assunto)",
      remetente,
      destinatarios: JSON.stringify(destinatarios),
      cc: cc.length ? JSON.stringify(cc) : null,
      dataEnvio: parsed.date ?? new Date(),
      corpoTexto: parsed.text ?? (parsed.html ? stripHtml(parsed.html) : ""),
      corpoHtml: typeof parsed.html === "string" ? parsed.html : null,
      messageId: parsed.messageId ?? null,
      emlPath: "",
      criadoPorId: input.usuarioId ?? null,
      tags: input.tagIds?.length ? { connect: input.tagIds.map((id) => ({ id })) } : undefined,
    },
  });

  const emlPath = `storage/emails/${email.id}/original.eml`;
  await salvarArquivo(emlPath, input.emlBytes);
  await prisma.email.update({ where: { id: email.id }, data: { emlPath } });

  for (const att of parsed.attachments ?? []) {
    const conteudo = att.content as Buffer | undefined;
    if (!conteudo) continue;
    const nome = att.filename || `anexo-${att.cid ?? "sem-nome"}`;
    const path = `storage/emails/${email.id}/${nome.replace(/[^\w.\-]+/g, "_")}`;
    await salvarArquivo(path, conteudo);
    await prisma.anexo.create({
      data: {
        emailId: email.id,
        nome,
        mimeType: att.contentType || "application/octet-stream",
        tamanho: att.size ?? conteudo.length,
        storagePath: path,
      },
    });
  }

  await reindexEmail(prisma, email.id);
  await logAudit({ usuarioId: input.usuarioId, acao: "ARQUIVAR_EMAIL", entidade: "Email", entidadeId: email.id, detalhe: { assunto: email.assunto, remetente } });
  return email;
}

export async function excluirEmail(input: { id: string; usuarioId?: string | null }) {
  const e = await prisma.email.findUnique({ where: { id: input.id } });
  if (!e) throw new Error("E-mail não encontrado.");
  await prisma.email.delete({ where: { id: input.id } });
  await removerPrefixo(`storage/emails/${input.id}`);
  await reindexEmail(prisma, input.id);
  await logAudit({ usuarioId: input.usuarioId, acao: "EXCLUIR", entidade: "Email", entidadeId: input.id, detalhe: { assunto: e.assunto } });
}
