import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Busca textual real via SQLite FTS5.
 * As tabelas virtuais ficam fora do schema Prisma; criadas/atualizadas via SQL bruto.
 * `unicode61 remove_diacritics 2` torna a busca insensível a acentos (PT-BR).
 *
 * As funções recebem o client por injeção (`db`) para servir tanto o app
 * (singleton) quanto o seed (instância própria via tsx).
 */
type Db = PrismaClient;

/** Cria as tabelas virtuais FTS5 (idempotente). Um statement por chamada. */
export async function ensureFtsSchema(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    `CREATE VIRTUAL TABLE IF NOT EXISTS documento_fts USING fts5(
      documento_id UNINDEXED, nome, descricao, conteudo,
      tokenize='unicode61 remove_diacritics 2'
    )`,
  );
  await db.$executeRawUnsafe(
    `CREATE VIRTUAL TABLE IF NOT EXISTS email_fts USING fts5(
      email_id UNINDEXED, assunto, remetente, destinatarios, corpo,
      tokenize='unicode61 remove_diacritics 2'
    )`,
  );
}

/** Reconstrói todo o índice a partir das tabelas relacionais. */
export async function reindexAllFts(db: Db): Promise<void> {
  await ensureFtsSchema(db);
  await db.$executeRawUnsafe(`DELETE FROM documento_fts`);
  await db.$executeRawUnsafe(`DELETE FROM email_fts`);

  const docs = await db.documento.findMany({
    include: { versoes: { where: { atual: true }, take: 1 } },
  });
  for (const d of docs) {
    await db.$executeRawUnsafe(
      `INSERT INTO documento_fts (documento_id, nome, descricao, conteudo) VALUES (?, ?, ?, ?)`,
      d.id,
      d.nome,
      d.descricao ?? "",
      d.versoes[0]?.ocrText ?? "",
    );
  }

  const emails = await db.email.findMany();
  for (const e of emails) {
    await db.$executeRawUnsafe(
      `INSERT INTO email_fts (email_id, assunto, remetente, destinatarios, corpo) VALUES (?, ?, ?, ?, ?)`,
      e.id,
      e.assunto,
      e.remetente,
      e.destinatarios,
      e.corpoTexto,
    );
  }
}

/** Reindexa um único documento (chamado após mutações — F3/F6). */
export async function reindexDocumento(db: Db, documentoId: string): Promise<void> {
  await ensureFtsSchema(db);
  await db.$executeRawUnsafe(
    `DELETE FROM documento_fts WHERE documento_id = ?`,
    documentoId,
  );
  const d = await db.documento.findUnique({
    where: { id: documentoId },
    include: { versoes: { where: { atual: true }, take: 1 } },
  });
  if (!d) return;
  await db.$executeRawUnsafe(
    `INSERT INTO documento_fts (documento_id, nome, descricao, conteudo) VALUES (?, ?, ?, ?)`,
    d.id,
    d.nome,
    d.descricao ?? "",
    d.versoes[0]?.ocrText ?? "",
  );
}

/** Reindexa um único e-mail (chamado após arquivamento — F9). */
export async function reindexEmail(db: Db, emailId: string): Promise<void> {
  await ensureFtsSchema(db);
  await db.$executeRawUnsafe(`DELETE FROM email_fts WHERE email_id = ?`, emailId);
  const e = await db.email.findUnique({ where: { id: emailId } });
  if (!e) return;
  await db.$executeRawUnsafe(
    `INSERT INTO email_fts (email_id, assunto, remetente, destinatarios, corpo) VALUES (?, ?, ?, ?, ?)`,
    e.id,
    e.assunto,
    e.remetente,
    e.destinatarios,
    e.corpoTexto,
  );
}

/**
 * Converte texto livre em query FTS5 segura (prefixo por termo, AND implícito).
 * Remove caracteres especiais do FTS5 para evitar erro de sintaxe.
 */
export function toFtsQuery(input: string): string {
  const termos = input
    .toLowerCase()
    .replace(/["()*:^]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (termos.length === 0) return "";
  return termos.map((t) => `"${t}"*`).join(" ");
}

export async function searchDocumentos(
  db: Db,
  query: string,
  limit = 50,
): Promise<string[]> {
  const match = toFtsQuery(query);
  if (!match) return [];
  const rows = await db.$queryRawUnsafe<{ documento_id: string }[]>(
    `SELECT documento_id FROM documento_fts WHERE documento_fts MATCH ? ORDER BY rank LIMIT ?`,
    match,
    limit,
  );
  return rows.map((r) => r.documento_id);
}

export async function searchEmails(
  db: Db,
  query: string,
  limit = 50,
): Promise<string[]> {
  const match = toFtsQuery(query);
  if (!match) return [];
  const rows = await db.$queryRawUnsafe<{ email_id: string }[]>(
    `SELECT email_id FROM email_fts WHERE email_fts MATCH ? ORDER BY rank LIMIT ?`,
    match,
    limit,
  );
  return rows.map((r) => r.email_id);
}
