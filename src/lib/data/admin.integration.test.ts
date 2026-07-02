import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import * as svc from "@/lib/data/admin-service";
import { temPermissao } from "@/lib/auth/permissions";

let grupoId = "";

describe("F11 — admin de usuários/grupos/permissões (integração)", () => {
  afterAll(async () => {
    // restaura carla ao estado do seed
    await prisma.usuario.update({
      where: { id: "carla.dias" },
      data: { ativo: true, grupos: { set: [{ id: "grp-secretaria" }] } },
    });
    if (grupoId) {
      await prisma.grupo.deleteMany({ where: { id: grupoId } });
      await prisma.auditLog.deleteMany({ where: { entidadeId: grupoId } });
    }
    await prisma.auditLog.deleteMany({ where: { entidadeId: "carla.dias" } });
    await prisma.$disconnect();
  });

  it("cria grupo, define permissões e bloqueia duplicado", async () => {
    const g = await svc.criarGrupo({ nome: "Grupo Teste F11", autorId: "ana.silva" });
    grupoId = g.id;
    await svc.definirPermissoesGrupo({ grupoId: g.id, permissaoIds: ["perm-doc-ler", "perm-doc-escrever"], autorId: "ana.silva" });
    const grp = (await svc.getGrupos()).find((x) => x.id === g.id);
    expect(grp?.permissoes.map((p) => p.chave).sort()).toEqual(["documento.escrever", "documento.ler"]);
    await expect(svc.criarGrupo({ nome: "Grupo Teste F11" })).rejects.toThrow(/já existe/i);
  });

  it("define grupos do usuário (origem das permissões)", async () => {
    await svc.definirGruposUsuario({ usuarioId: "carla.dias", grupoIds: ["grp-secretaria", grupoId], autorId: "ana.silva" });
    const carla = (await svc.getUsuarios()).find((u) => u.id === "carla.dias");
    expect(carla?.grupos.map((g) => g.id)).toContain(grupoId);
    expect(await temPermissao("carla.dias", "documento.escrever")).toBe(true);
  });

  it("ativa/desativa usuário", async () => {
    await svc.definirAtivoUsuario({ usuarioId: "carla.dias", ativo: false, autorId: "ana.silva" });
    expect((await svc.getUsuarios()).find((u) => u.id === "carla.dias")?.ativo).toBe(false);
    await svc.definirAtivoUsuario({ usuarioId: "carla.dias", ativo: true, autorId: "ana.silva" });
    expect((await svc.getUsuarios()).find((u) => u.id === "carla.dias")?.ativo).toBe(true);
  });

  it("exclui grupo", async () => {
    // libera carla do grupo antes de excluir
    await svc.definirGruposUsuario({ usuarioId: "carla.dias", grupoIds: ["grp-secretaria"], autorId: "ana.silva" });
    await svc.excluirGrupo({ id: grupoId, autorId: "ana.silva" });
    expect((await svc.getGrupos()).find((g) => g.id === grupoId)).toBeUndefined();
    grupoId = "";
  });
});
