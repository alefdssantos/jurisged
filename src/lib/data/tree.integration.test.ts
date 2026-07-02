import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getTree, type TreeNode } from "@/lib/data/tree";
import * as svc from "@/lib/data/tree-service";

let clienteId = "";
let processoId = "";
let pastaRaizId = "";
let subPastaId = "";

function acharNo(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const achado = acharNo(n.filhos, id);
    if (achado) return achado;
  }
  return undefined;
}

describe("F2 — hierarquia Cliente→Processo→Pasta (integração)", () => {
  afterAll(async () => {
    // limpeza: remove cliente de teste (cascade) e auditoria associada
    if (clienteId) await prisma.cliente.deleteMany({ where: { id: clienteId } });
    await prisma.auditLog.deleteMany({
      where: { entidadeId: { in: [clienteId, processoId, pastaRaizId, subPastaId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  it("cria cliente → processo → pasta e reflete na árvore", async () => {
    const baseline = (await getTree()).length;
    const c = await svc.criarCliente({ nome: "Cliente Teste F2", documento: "00.000.000/0001-00", usuarioId: "ana.silva" });
    clienteId = c.id;
    const p = await svc.criarProcesso({ clienteId: c.id, titulo: "Processo Teste", numero: "9999999-99.2026", usuarioId: "ana.silva" });
    processoId = p.id;
    const pasta = await svc.criarPasta({ processoId: p.id, nome: "Documentos", usuarioId: "ana.silva" });
    pastaRaizId = pasta.id;

    const tree = await getTree();
    expect(tree.length).toBe(baseline + 1);
    const cliNode = tree.find((n) => n.id === c.id);
    expect(cliNode?.nome).toBe("Cliente Teste F2");
    const procNode = cliNode!.filhos.find((n) => n.id === p.id);
    expect(procNode?.nome).toContain("Processo Teste");
    expect(procNode!.filhos.some((n) => n.id === pasta.id)).toBe(true);
  });

  it("cria subpasta (aninhada) e renomeia", async () => {
    const sub = await svc.criarPasta({ processoId, nome: "Subpasta", parentId: pastaRaizId, usuarioId: "ana.silva" });
    subPastaId = sub.id;
    expect(acharNo(await getTree(), pastaRaizId)?.filhos.some((n) => n.id === sub.id)).toBe(true);

    await svc.renomearPasta({ id: sub.id, nome: "Subpasta Renomeada", usuarioId: "ana.silva" });
    expect(acharNo(await getTree(), sub.id)?.nome).toBe("Subpasta Renomeada");
  });

  it("move subpasta para a raiz do processo", async () => {
    await svc.moverPasta({ id: subPastaId, novoParentId: null, usuarioId: "ana.silva" });
    const proc = acharNo(await getTree(), processoId);
    expect(proc?.filhos.some((n) => n.id === subPastaId)).toBe(true);
  });

  it("rejeita ciclos no movimento de pasta", async () => {
    await svc.moverPasta({ id: subPastaId, novoParentId: pastaRaizId, usuarioId: "ana.silva" });
    await expect(svc.moverPasta({ id: subPastaId, novoParentId: subPastaId })).rejects.toThrow();
    await expect(svc.moverPasta({ id: pastaRaizId, novoParentId: subPastaId })).rejects.toThrow(/ciclo/i);
  });

  it("valida entradas (nome vazio é rejeitado)", async () => {
    await expect(svc.criarCliente({ nome: "  " })).rejects.toThrow();
    await expect(svc.criarPasta({ processoId, nome: "" })).rejects.toThrow();
    await expect(svc.criarProcesso({ clienteId: "inexistente", titulo: "X" })).rejects.toThrow(/não encontrado/i);
  });

  it("registra auditoria das operações", async () => {
    const logs = await prisma.auditLog.findMany({ where: { entidadeId: clienteId } });
    expect(logs.some((l) => l.acao === "CRIAR" && l.entidade === "Cliente")).toBe(true);
  });

  it("excluir cliente remove processos e pastas em cascata", async () => {
    const baseline = (await getTree()).length;
    await svc.excluirCliente({ id: clienteId, usuarioId: "ana.silva" });
    const tree = await getTree();
    expect(tree.length).toBe(baseline - 1);
    expect(await prisma.processo.findUnique({ where: { id: processoId } })).toBeNull();
    expect(await prisma.pasta.findUnique({ where: { id: pastaRaizId } })).toBeNull();
  });
});
