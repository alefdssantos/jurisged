import { prisma } from "@/lib/db";

export type NivelAcl = "LER" | "ESCREVER" | "ADMIN";
const ORDEM: Record<NivelAcl, number> = { LER: 0, ESCREVER: 1, ADMIN: 2 };

/**
 * Permissões efetivas do usuário, derivadas dos grupos (estilo AD).
 * Papel ADMIN recebe todas as permissões.
 */
export async function getPermissoesUsuario(userId?: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const u = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { grupos: { include: { permissoes: true } } },
  });
  if (!u) return new Set();
  if (u.role === "ADMIN") {
    const todas = await prisma.permissao.findMany();
    return new Set(todas.map((p) => p.chave));
  }
  const set = new Set<string>();
  for (const g of u.grupos) for (const p of g.permissoes) set.add(p.chave);
  return set;
}

export async function temPermissao(userId: string | null | undefined, chave: string): Promise<boolean> {
  return (await getPermissoesUsuario(userId)).has(chave);
}

export async function exigirPermissao(userId: string | null | undefined, chave: string): Promise<void> {
  if (!(await temPermissao(userId, chave))) {
    throw new Error("Sem permissão para esta ação.");
  }
}

/**
 * ACL por pasta: pasta sem ACL é aberta a autenticados; com ACL, só grupos
 * listados com nível suficiente (ADMIN sempre acessa).
 */
export async function podeAcessarPasta(
  userId: string | null | undefined,
  pastaId: string,
  nivelMin: NivelAcl = "LER",
): Promise<boolean> {
  if (!userId) return false;
  const u = await prisma.usuario.findUnique({ where: { id: userId }, include: { grupos: true } });
  if (!u) return false;
  if (u.role === "ADMIN") return true;

  const acls = await prisma.pastaAcl.findMany({ where: { pastaId } });
  if (acls.length === 0) return true;

  const grupoIds = new Set(u.grupos.map((g) => g.id));
  return acls.some(
    (a) => grupoIds.has(a.grupoId) && ORDEM[a.nivel as NivelAcl] >= ORDEM[nivelMin],
  );
}
