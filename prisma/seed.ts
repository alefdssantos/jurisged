import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { reindexAllFts } from "../src/lib/search/fts";
import { salvarArquivo } from "../src/lib/storage";
import { gerarPdfSimples } from "../src/lib/pdf-mock";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const d = (iso: string) => new Date(iso);

async function limpar() {
  // Ordem respeitando as foreign keys.
  await prisma.auditLog.deleteMany();
  await prisma.anexo.deleteMany();
  await prisma.email.deleteMany();
  await prisma.metadadoValor.deleteMany();
  await prisma.versao.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.pastaAcl.deleteMany();
  await prisma.pasta.deleteMany();
  await prisma.processo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.campoPersonalizado.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.permissao.deleteMany();
  await prisma.grupo.deleteMany();
  await prisma.usuario.deleteMany();
}

async function main() {
  await limpar();

  // ---------- Permissões ----------
  await prisma.permissao.createMany({
    data: [
      { id: "perm-doc-ler", chave: "documento.ler", descricao: "Ler documentos" },
      { id: "perm-doc-escrever", chave: "documento.escrever", descricao: "Criar/editar documentos" },
      { id: "perm-doc-excluir", chave: "documento.excluir", descricao: "Excluir documentos" },
      { id: "perm-doc-versionar", chave: "documento.versionar", descricao: "Criar novas versões" },
      { id: "perm-email-arquivar", chave: "email.arquivar", descricao: "Arquivar e-mails" },
      { id: "perm-pasta-gerenciar", chave: "pasta.gerenciar", descricao: "Gerenciar estrutura de pastas" },
      { id: "perm-admin", chave: "admin.gerenciar", descricao: "Administrar usuários/grupos/permissões" },
    ],
  });

  // ---------- Grupos (com permissões) ----------
  await prisma.grupo.create({
    data: {
      id: "grp-socios", nome: "Sócios", descricao: "Sócios do escritório",
      permissoes: { connect: ["perm-doc-ler", "perm-doc-escrever", "perm-doc-excluir", "perm-doc-versionar", "perm-email-arquivar", "perm-pasta-gerenciar", "perm-admin"].map((id) => ({ id })) },
    },
  });
  await prisma.grupo.create({
    data: {
      id: "grp-advogados", nome: "Advogados", descricao: "Advogados",
      permissoes: { connect: ["perm-doc-ler", "perm-doc-escrever", "perm-doc-versionar", "perm-email-arquivar"].map((id) => ({ id })) },
    },
  });
  await prisma.grupo.create({
    data: {
      id: "grp-secretaria", nome: "Secretaria", descricao: "Secretaria / apoio",
      permissoes: { connect: ["perm-doc-ler", "perm-doc-escrever", "perm-email-arquivar"].map((id) => ({ id })) },
    },
  });
  await prisma.grupo.create({
    data: {
      id: "grp-ti", nome: "TI", descricao: "Tecnologia da informação",
      permissoes: { connect: ["perm-admin", "perm-pasta-gerenciar", "perm-doc-ler"].map((id) => ({ id })) },
    },
  });

  // ---------- Usuários (mesmos ids do mock/AD) ----------
  await prisma.usuario.create({ data: { id: "ana.silva", nome: "Ana Silva", email: "ana.silva@exemplo.adv.br", cargo: "Sócia", role: "ADMIN", grupos: { connect: [{ id: "grp-socios" }, { id: "grp-advogados" }] } } });
  await prisma.usuario.create({ data: { id: "bruno.costa", nome: "Bruno Costa", email: "bruno.costa@exemplo.adv.br", cargo: "Advogado", role: "ADVOGADO", grupos: { connect: [{ id: "grp-advogados" }] } } });
  await prisma.usuario.create({ data: { id: "carla.dias", nome: "Carla Dias", email: "carla.dias@exemplo.adv.br", cargo: "Secretária", role: "SECRETARIA", grupos: { connect: [{ id: "grp-secretaria" }] } } });
  await prisma.usuario.create({ data: { id: "diego.alves", nome: "Diego Alves", email: "diego.alves@exemplo.adv.br", cargo: "TI / Administrador", role: "TI", grupos: { connect: [{ id: "grp-ti" }] } } });

  // ---------- Categorias ----------
  await prisma.categoria.createMany({
    data: [
      { id: "cat-peticao", nome: "Petição" },
      { id: "cat-contrato", nome: "Contrato" },
      { id: "cat-procuracao", nome: "Procuração" },
      { id: "cat-comprovante", nome: "Comprovante" },
      { id: "cat-parecer", nome: "Parecer" },
      { id: "cat-email", nome: "E-mail" },
    ],
  });

  // ---------- Tags ----------
  await prisma.tag.createMany({
    data: [
      { id: "tag-urgente", nome: "Urgente", cor: "red" },
      { id: "tag-confidencial", nome: "Confidencial", cor: "amber" },
      { id: "tag-assinado", nome: "Assinado", cor: "green" },
      { id: "tag-pendente", nome: "Pendente", cor: "blue" },
      { id: "tag-original", nome: "Original", cor: "neutral" },
    ],
  });

  // ---------- Campos personalizados ----------
  await prisma.campoPersonalizado.createMany({
    data: [
      { id: "campo-numdoc", nome: "Número do Documento", tipo: "TEXTO" },
      { id: "campo-dataassin", nome: "Data de Assinatura", tipo: "DATA" },
      { id: "campo-valor", nome: "Valor (R$)", tipo: "NUMERO" },
      { id: "campo-sigiloso", nome: "Sigiloso", tipo: "BOOLEANO" },
      { id: "campo-instancia", nome: "Instância", tipo: "LISTA", opcoes: JSON.stringify(["1ª Instância", "2ª Instância", "STJ", "STF"]) },
    ],
  });

  // ---------- Clientes ----------
  await prisma.cliente.createMany({
    data: [
      { id: "cli-acme", nome: "ACME Indústria Ltda.", documento: "12.345.678/0001-90", email: "contato@acme.com.br" },
      { id: "cli-beta", nome: "Beta Corp S.A.", documento: "98.765.432/0001-21", email: "juridico@beta.com" },
    ],
  });

  // ---------- Processos ----------
  await prisma.processo.createMany({
    data: [
      { id: "proc-acme-trab", clienteId: "cli-acme", numero: "0001234-55.2024.5.02.0001", titulo: "Reclamação Trabalhista — João Pereira", area: "Trabalhista", status: "ATIVO" },
      { id: "proc-acme-forn", clienteId: "cli-acme", numero: null, titulo: "Contrato de Fornecimento", area: "Cível", status: "ATIVO" },
      { id: "proc-beta-cobr", clienteId: "cli-beta", numero: "0007654-11.2025.8.26.0100", titulo: "Ação de Cobrança", area: "Cível", status: "ATIVO" },
    ],
  });

  // ---------- Pastas ----------
  await prisma.pasta.createMany({
    data: [
      { id: "pasta-acme-trab-peticoes", processoId: "proc-acme-trab", nome: "Petições" },
      { id: "pasta-acme-trab-provas", processoId: "proc-acme-trab", nome: "Provas" },
      { id: "pasta-acme-trab-emails", processoId: "proc-acme-trab", nome: "E-mails" },
      { id: "pasta-acme-forn-minutas", processoId: "proc-acme-forn", nome: "Minutas" },
      { id: "pasta-acme-forn-assinados", processoId: "proc-acme-forn", nome: "Assinados" },
      { id: "pasta-beta-cobr-inicial", processoId: "proc-beta-cobr", nome: "Inicial" },
      { id: "pasta-beta-cobr-emails", processoId: "proc-beta-cobr", nome: "E-mails" },
    ],
  });

  // ---------- ACL de pasta (exemplo) ----------
  await prisma.pastaAcl.createMany({
    data: [
      { pastaId: "pasta-acme-trab-peticoes", grupoId: "grp-advogados", nivel: "ESCREVER" },
      { pastaId: "pasta-acme-trab-peticoes", grupoId: "grp-secretaria", nivel: "LER" },
    ],
  });

  // ---------- Documentos (com versões, tags, metadados) ----------
  await prisma.documento.create({
    data: {
      id: "doc-1", pastaId: "pasta-acme-trab-peticoes", nome: "Petição Inicial — Reclamação Trabalhista",
      descricao: "Petição inicial com pedido de verbas rescisórias e horas extras.",
      categoriaId: "cat-peticao", criadoPorId: "bruno.costa", criadoEm: d("2024-03-10T13:00:00Z"),
      tags: { connect: [{ id: "tag-assinado" }, { id: "tag-urgente" }] },
      metadados: { create: [{ campoId: "campo-numdoc", valor: "PET-2024-001" }, { campoId: "campo-dataassin", valor: "2024-03-10" }, { campoId: "campo-instancia", valor: "1ª Instância" }] },
      versoes: {
        create: [
          { numero: 1, nomeArquivo: "peticao_inicial_v1.pdf", mimeType: "application/pdf", tamanho: 184320, storagePath: "storage/seed/doc-1/v1.pdf", ocrText: "Excelentíssimo Juiz do Trabalho reclamação trabalhista verbas rescisórias horas extras ACME Indústria João Pereira rascunho", comentario: "Rascunho inicial", atual: false, criadoPorId: "bruno.costa", criadoEm: d("2024-03-08T10:00:00Z") },
          { numero: 2, nomeArquivo: "peticao_inicial_v2.pdf", mimeType: "application/pdf", tamanho: 192512, storagePath: "storage/seed/doc-1/v2.pdf", ocrText: "Excelentíssimo Juiz do Trabalho reclamação trabalhista verbas rescisórias horas extras adicional noturno ACME Indústria João Pereira versão protocolada", comentario: "Versão protocolada", atual: true, criadoPorId: "bruno.costa", criadoEm: d("2024-03-10T13:00:00Z") },
        ],
      },
    },
  });

  await prisma.documento.create({
    data: {
      id: "doc-2", pastaId: "pasta-acme-trab-provas", nome: "Comprovante de Pagamento de Salário",
      descricao: "Comprovante de depósito salarial.", categoriaId: "cat-comprovante", criadoPorId: "carla.dias", criadoEm: d("2024-03-12T09:30:00Z"),
      tags: { connect: [{ id: "tag-original" }] },
      versoes: { create: [{ numero: 1, nomeArquivo: "comprovante_pagamento.pdf", mimeType: "application/pdf", tamanho: 88064, storagePath: "storage/seed/doc-2/v1.pdf", ocrText: "comprovante pagamento salário depósito banco valor competência ACME", atual: true, criadoPorId: "carla.dias", criadoEm: d("2024-03-12T09:30:00Z") }] },
    },
  });

  await prisma.documento.create({
    data: {
      id: "doc-3", pastaId: "pasta-acme-forn-minutas", nome: "Minuta — Contrato de Fornecimento",
      descricao: "Minuta de contrato de fornecimento de insumos.", categoriaId: "cat-contrato", criadoPorId: "bruno.costa", criadoEm: d("2024-04-02T15:00:00Z"),
      tags: { connect: [{ id: "tag-pendente" }] },
      metadados: { create: [{ campoId: "campo-valor", valor: "250000.00" }, { campoId: "campo-sigiloso", valor: "true" }] },
      versoes: { create: [{ numero: 1, nomeArquivo: "minuta_contrato.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", tamanho: 45056, storagePath: "storage/seed/doc-3/v1.docx", ocrText: "contrato fornecimento insumos cláusula rescisão multa prazo entrega ACME fornecedor confidencial", atual: true, criadoPorId: "bruno.costa", criadoEm: d("2024-04-02T15:00:00Z") }] },
    },
  });

  await prisma.documento.create({
    data: {
      id: "doc-4", pastaId: "pasta-beta-cobr-inicial", nome: "Petição Inicial — Ação de Cobrança",
      descricao: "Ação de cobrança de dívida não paga.", categoriaId: "cat-peticao", criadoPorId: "ana.silva", criadoEm: d("2025-01-20T11:00:00Z"),
      tags: { connect: [{ id: "tag-urgente" }, { id: "tag-confidencial" }] },
      metadados: { create: [{ campoId: "campo-numdoc", valor: "PET-2025-014" }, { campoId: "campo-valor", valor: "78000.00" }, { campoId: "campo-instancia", valor: "1ª Instância" }] },
      versoes: { create: [{ numero: 1, nomeArquivo: "peticao_cobranca.pdf", mimeType: "application/pdf", tamanho: 156672, storagePath: "storage/seed/doc-4/v1.pdf", ocrText: "ação de cobrança dívida inadimplência nota fiscal Beta Corp duplicata vencida juros mora", atual: true, criadoPorId: "ana.silva", criadoEm: d("2025-01-20T11:00:00Z") }] },
    },
  });

  // ---------- E-mails arquivados (com anexos) ----------
  await prisma.email.create({
    data: {
      id: "email-1", pastaId: "pasta-acme-trab-emails", messageId: "<acme-001@mail.acme.com.br>",
      assunto: "Documentos do processo trabalhista — João Pereira",
      remetente: "contato@acme.com.br",
      destinatarios: JSON.stringify(["bruno.costa@exemplo.adv.br"]),
      cc: JSON.stringify(["ana.silva@exemplo.adv.br"]),
      dataEnvio: d("2024-03-11T14:25:00Z"),
      corpoTexto: "Prezado Dr. Bruno, segue em anexo a documentação solicitada referente ao processo trabalhista do ex-funcionário João Pereira. Atenciosamente, ACME.",
      emlPath: "storage/seed/email-1/original.eml",
      criadoPorId: "bruno.costa",
      tags: { connect: [{ id: "tag-confidencial" }] },
      anexos: { create: [{ nome: "comprovante_pagamento.pdf", mimeType: "application/pdf", tamanho: 88064, storagePath: "storage/seed/email-1/comprovante_pagamento.pdf" }] },
    },
  });

  await prisma.email.create({
    data: {
      id: "email-2", pastaId: "pasta-beta-cobr-emails", messageId: "<beta-045@mail.beta.com>",
      assunto: "Proposta de acordo — Ação de Cobrança",
      remetente: "juridico@beta.com",
      destinatarios: JSON.stringify(["ana.silva@exemplo.adv.br"]),
      cc: null,
      dataEnvio: d("2025-02-03T10:10:00Z"),
      corpoTexto: "Prezada Dra. Ana, encaminhamos proposta de acordo para encerramento da ação de cobrança. Aguardamos retorno. Jurídico Beta Corp.",
      emlPath: "storage/seed/email-2/original.eml",
      criadoPorId: "ana.silva",
      anexos: { create: [{ nome: "proposta_acordo.pdf", mimeType: "application/pdf", tamanho: 102400, storagePath: "storage/seed/email-2/proposta_acordo.pdf" }] },
    },
  });

  // ---------- Auditoria ----------
  await prisma.auditLog.createMany({
    data: [
      { usuarioId: "bruno.costa", acao: "CRIAR", entidade: "Documento", entidadeId: "doc-1", detalhe: JSON.stringify({ nome: "Petição Inicial — Reclamação Trabalhista" }), criadoEm: d("2024-03-08T10:00:00Z") },
      { usuarioId: "bruno.costa", acao: "VERSIONAR", entidade: "Documento", entidadeId: "doc-1", detalhe: JSON.stringify({ numero: 2 }), criadoEm: d("2024-03-10T13:00:00Z") },
      { usuarioId: "bruno.costa", acao: "ARQUIVAR_EMAIL", entidade: "Email", entidadeId: "email-1", detalhe: JSON.stringify({ assunto: "Documentos do processo trabalhista" }), criadoEm: d("2024-03-11T14:30:00Z") },
      { usuarioId: "ana.silva", acao: "CRIAR", entidade: "Documento", entidadeId: "doc-4", criadoEm: d("2025-01-20T11:00:00Z") },
    ],
  });

  // ---------- Arquivos de exemplo (reais, renderáveis) ----------
  const versoes = await prisma.versao.findMany({ include: { documento: true } });
  for (const v of versoes) {
    const linhas = (v.ocrText ?? "").match(/.{1,70}(?:\s|$)/g) ?? [];
    const pdf = gerarPdfSimples(v.documento.nome, [
      `Arquivo: ${v.nomeArquivo} — versão ${v.numero}`,
      "",
      ...linhas,
    ]);
    await salvarArquivo(v.storagePath, pdf);
  }
  const anexos = await prisma.anexo.findMany();
  for (const a of anexos) {
    await salvarArquivo(a.storagePath, gerarPdfSimples(a.nome, ["Anexo de e-mail (exemplo)."]));
  }
  const emails = await prisma.email.findMany();
  for (const e of emails) {
    const dest = (JSON.parse(e.destinatarios) as string[]).join(", ");
    const eml = `From: ${e.remetente}\nTo: ${dest}\nSubject: ${e.assunto}\nDate: ${e.dataEnvio.toUTCString()}\n\n${e.corpoTexto}\n`;
    await salvarArquivo(e.emlPath, Buffer.from(eml, "utf8"));
  }

  // ---------- Índice FTS5 ----------
  await reindexAllFts(prisma);

  const [u, c, p, pa, doc, v, em, an] = await Promise.all([
    prisma.usuario.count(), prisma.cliente.count(), prisma.processo.count(), prisma.pasta.count(),
    prisma.documento.count(), prisma.versao.count(), prisma.email.count(), prisma.anexo.count(),
  ]);
  console.log(`Seed OK → usuários:${u} clientes:${c} processos:${p} pastas:${pa} documentos:${doc} versões:${v} emails:${em} anexos:${an}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
