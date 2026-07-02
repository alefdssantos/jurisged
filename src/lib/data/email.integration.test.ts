import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  arquivarEml,
  getEmail,
  excluirEmail,
  sugerirPastaParaEmail,
} from "@/lib/data/email-service";
import { searchEmails } from "@/lib/search/fts";
import { existeArquivo } from "@/lib/storage";

let criadoId = "";

describe("F9 — arquivamento de e-mail (.eml) — integração", () => {
  afterAll(async () => {
    if (criadoId) await prisma.email.deleteMany({ where: { id: criadoId } });
    await prisma.auditLog.deleteMany({ where: { entidadeId: criadoId || "__none__" } });
    await prisma.$disconnect();
  });

  it("arquiva .eml com fidelidade (corpo+metadados+anexo) e classifica por remetente", async () => {
    const anexoB64 = Buffer.from("conteudo do anexo zz").toString("base64");
    const eml = [
      "From: Fulano <fulano@acme.com.br>",
      "To: bruno.costa@exemplo.adv.br",
      "Cc: ana.silva@exemplo.adv.br",
      "Subject: Teste anexo zzemailint",
      "Date: Mon, 10 Mar 2025 10:00:00 -0300",
      "Message-ID: <int-eml-1@acme.com.br>",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="B"',
      "",
      "--B",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Corpo zzemailint do email de teste.",
      "--B",
      'Content-Type: text/plain; name="anexo.txt"',
      'Content-Disposition: attachment; filename="anexo.txt"',
      "Content-Transfer-Encoding: base64",
      "",
      anexoB64,
      "--B--",
      "",
    ].join("\r\n");

    const email = await arquivarEml({ emlBytes: Buffer.from(eml, "utf8"), usuarioId: "ana.silva" });
    criadoId = email.id;

    const det = await getEmail(email.id);
    expect(det?.assunto).toBe("Teste anexo zzemailint");
    expect(det?.remetente).toBe("fulano@acme.com.br");
    expect(JSON.parse(det!.destinatarios)).toContain("bruno.costa@exemplo.adv.br");
    expect(JSON.parse(det!.cc!)).toContain("ana.silva@exemplo.adv.br");
    expect(det?.corpoTexto).toContain("zzemailint");
    expect(det?.messageId).toBe("<int-eml-1@acme.com.br>");
    expect(det?.anexos.length).toBe(1);
    expect(det?.anexos[0]?.nome).toBe("anexo.txt");
    expect(det?.pastaId).toBe("pasta-acme-trab-emails"); // classificado por domínio acme
    expect(await existeArquivo(det!.emlPath)).toBe(true);
    expect(await existeArquivo(det!.anexos[0]!.storagePath)).toBe(true);
    expect(await searchEmails(prisma, "zzemailint")).toContain(email.id);
  });

  it("sugere pasta pelo domínio do remetente (regra de classificação)", async () => {
    expect(await sugerirPastaParaEmail("qualquer@acme.com.br")).toBe("pasta-acme-trab-emails");
    expect(await sugerirPastaParaEmail("estranho@nao-existe.com")).toBeNull();
  });

  it("excluir e-mail remove registro, arquivos e índice", async () => {
    const det = await getEmail(criadoId);
    const emlPath = det!.emlPath;
    await excluirEmail({ id: criadoId, usuarioId: "ana.silva" });
    expect(await prisma.email.findUnique({ where: { id: criadoId } })).toBeNull();
    expect(await existeArquivo(emlPath)).toBe(false);
    expect(await searchEmails(prisma, "zzemailint")).not.toContain(criadoId);
    criadoId = "";
  });
});
