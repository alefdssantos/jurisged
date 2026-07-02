import { prisma } from "@/lib/db";

export async function getResumo() {
  const [clientes, processos, pastas, documentos, emails, versoes] = await Promise.all([
    prisma.cliente.count(),
    prisma.processo.count(),
    prisma.pasta.count(),
    prisma.documento.count(),
    prisma.email.count(),
    prisma.versao.count(),
  ]);

  const [recentesDocs, recentesEmails, recentesAudit] = await Promise.all([
    prisma.documento.findMany({
      orderBy: { criadoEm: "desc" },
      take: 5,
      include: { pasta: { include: { processo: { include: { cliente: true } } } } },
    }),
    prisma.email.findMany({
      orderBy: { dataEnvio: "desc" },
      take: 4,
      include: { pasta: { include: { processo: { include: { cliente: true } } } } },
    }),
    prisma.auditLog.findMany({ orderBy: { criadoEm: "desc" }, take: 8, include: { usuario: true } }),
  ]);

  return {
    contagens: { clientes, processos, pastas, documentos, emails, versoes },
    recentesDocs,
    recentesEmails,
    recentesAudit,
  };
}

export async function getDocsPorCliente() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  const linhas = [];
  for (const c of clientes) {
    const [documentos, emails] = await Promise.all([
      prisma.documento.count({ where: { pasta: { processo: { clienteId: c.id } } } }),
      prisma.email.count({ where: { pasta: { processo: { clienteId: c.id } } } }),
    ]);
    linhas.push({ cliente: c.nome, documentos, emails });
  }
  return linhas;
}
